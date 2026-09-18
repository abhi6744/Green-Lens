"""
Model Service - Singleton ResNet50 inference engine.
Loads the model once, provides batch patch prediction.
"""
import json
import logging
import threading
from pathlib import Path
from typing import List, Optional, Tuple

import numpy as np
import torch
import torch.nn as nn
import torchvision.models as tv_models
import torch.nn.functional as F

from app.services.patching import prepare_patch_for_model, PATCH_SIZE

logger = logging.getLogger(__name__)

_lock = threading.Lock()


class ModelService:
    """Singleton model service. Call ModelService.get_instance() to get the shared instance."""

    _instance: Optional["ModelService"] = None

    def __init__(self):
        self._model: Optional[nn.Module] = None
        self._device: Optional[torch.device] = None
        self._class_names: List[str] = []
        self._loaded = False

    @classmethod
    def get_instance(cls) -> "ModelService":
        with _lock:
            if cls._instance is None:
                cls._instance = cls()
        return cls._instance

    def load_model(self, model_path: str, class_names_path: Optional[str] = None) -> None:
        """
        Load the ResNet50 model with the exact architecture from the notebook (Cell 17).
        
        Architecture:
            model = resnet50(weights=None)
            model.fc = Linear(in_features, 10)
            model.load_state_dict(...)
        """
        with _lock:
            if self._loaded:
                logger.info("Model already loaded, skipping reload.")
                return

            device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            logger.info("Loading model on device: %s", device)

            # Build exact architecture (notebook Cell 17)
            model = tv_models.resnet50(weights=None)
            num_classes = 10
            model.fc = nn.Linear(model.fc.in_features, num_classes)

            # Load weights
            model_path = str(model_path)
            if not Path(model_path).exists():
                raise FileNotFoundError(
                    f"Model file not found: {model_path}\n"
                    "Please ensure eurosat_resnet50_final.pth is at the configured path."
                )

            state_dict = torch.load(model_path, map_location=device, weights_only=True)
            model.load_state_dict(state_dict)
            model = model.to(device)
            model.eval()

            self._model = model
            self._device = device

            # Load class names
            if class_names_path and Path(class_names_path).exists():
                with open(class_names_path, "r") as f:
                    self._class_names = json.load(f)
            else:
                # Fallback to hardcoded (from notebook label_map)
                self._class_names = [
                    "AnnualCrop",        # 0
                    "Forest",            # 1
                    "HerbaceousVegetation",  # 2
                    "Highway",           # 3
                    "Industrial",        # 4
                    "Pasture",           # 5
                    "PermanentCrop",     # 6
                    "Residential",       # 7
                    "River",             # 8
                    "SeaLake",           # 9
                ]

            self._loaded = True
            logger.info(
                "Model loaded successfully. Classes: %s. Device: %s",
                self._class_names,
                device,
            )

    def predict_patches(
        self, patches: List[np.ndarray], batch_size: int = 64
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Classify a list of image patches.
        Implements notebook Cell 32 classify_patches() logic.

        Args:
            patches: list of uint8 numpy arrays (H, W, 3)
            batch_size: inference batch size (notebook uses 64)

        Returns:
            (predictions, confidences)
            predictions: int array shape (n_patches,), class indices
            confidences: float array shape (n_patches,), max softmax probability
        """
        if not self._loaded or self._model is None:
            raise RuntimeError("Model is not loaded. Call load_model() first.")

        all_preds = []
        all_confs = []

        with torch.no_grad():
            for i in range(0, len(patches), batch_size):
                batch = patches[i: i + batch_size]
                tensor_batch = torch.stack([prepare_patch_for_model(p) for p in batch]).to(self._device)
                outputs = self._model(tensor_batch)

                # Softmax probabilities
                probs = F.softmax(outputs, dim=1)
                confs, preds = torch.max(probs, dim=1)

                all_preds.extend(preds.cpu().numpy())
                all_confs.extend(confs.cpu().numpy())

        return np.array(all_preds, dtype=np.int64), np.array(all_confs, dtype=np.float32)

    def get_class_names(self) -> List[str]:
        return self._class_names

    def is_loaded(self) -> bool:
        return self._loaded

    def get_device(self) -> Optional[torch.device]:
        return self._device


# Module-level singleton
model_service = ModelService.get_instance()
