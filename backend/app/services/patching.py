"""
Patch Extraction Service
Implements the exact notebook patch extraction logic (Cell 30).
"""
import logging
from typing import List, Tuple

import numpy as np
from PIL import Image
from torchvision import transforms as T
import torch

logger = logging.getLogger(__name__)

PATCH_SIZE = 64

# Model input transform (from notebook Cell 32 - exact parameters)
PATCH_TRANSFORM = T.Compose([
    T.ToPILImage(),
    T.Resize((224, 224)),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


def extract_patches(img: np.ndarray, patch_size: int = PATCH_SIZE) -> Tuple[List[np.ndarray], List[Tuple[int, int]]]:
    """
    Extract non-overlapping patches from image (notebook Cell 30).

    Args:
        img: uint8 numpy array (H, W, 3)
        patch_size: size of each patch (default 64)

    Returns:
        (patches, positions) where positions are (row, col) pixel offsets
    """
    h, w, _ = img.shape
    patches = []
    positions = []

    for i in range(0, h - patch_size + 1, patch_size):
        for j in range(0, w - patch_size + 1, patch_size):
            patch = img[i:i + patch_size, j:j + patch_size]
            patches.append(patch)
            positions.append((i, j))

    logger.info("Extracted %d patches (%dx%d) from image %dx%d", len(patches), patch_size, patch_size, h, w)
    return patches, positions


def get_grid_dims(img: np.ndarray, patch_size: int = PATCH_SIZE) -> Tuple[int, int]:
    """Get the patch grid dimensions for an image."""
    h, w = img.shape[:2]
    grid_rows = h // patch_size
    grid_cols = w // patch_size
    return grid_rows, grid_cols


def prepare_patch_for_model(patch: np.ndarray) -> torch.Tensor:
    """
    Apply the exact model input transform (notebook Cell 32):
    ToPILImage -> Resize(224,224) -> ToTensor -> Normalize(ImageNet)
    """
    return PATCH_TRANSFORM(patch)
