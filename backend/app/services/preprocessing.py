"""
Satellite Image Preprocessing Service
Implements the exact pipeline from the notebook (Cell 29):
  1. Load image (GeoTIFF via rasterio, or PNG/JPG via PIL)
  2. Joint percentile stretch (2-98%)
  3. CLAHE per channel (skimage equalize_adapthist, clip_limit=0.02)
"""
import logging
import os
from pathlib import Path
from typing import Any, Optional, Tuple, List, Dict

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# Preprocessing parameters (from notebook)
LOW_PCT = 2
HIGH_PCT = 98
CLAHE_CLIP = 0.02


def _load_geotiff(file_path: str) -> Tuple[np.ndarray, Any, Any, Dict]:
    """Load a GeoTIFF file using rasterio."""
    import rasterio
    try:
        with rasterio.open(file_path) as src:
            band_count = src.count
            if band_count < 3:
                raise ValueError(
                    f"GeoTIFF has only {band_count} band(s). At least 3 RGB-compatible bands are required."
                )
            r = src.read(1).astype(np.float32)
            g = src.read(2).astype(np.float32)
            b = src.read(3).astype(np.float32)
            transform = src.transform
            crs = src.crs

            # Get pixel size
            pixel_size_x = abs(transform.a)  # metres per pixel (for Sentinel-2, ~10m)
            pixel_size_y = abs(transform.e)

            # Detect if resolution is in degrees (geographic CRS) instead of metres.
            # Degree-based pixel sizes are typically tiny (e.g. 0.0001), whereas
            # metric pixel sizes are >= 1.0 m. If degrees, fall back to 10 m/pixel.
            _is_degrees = pixel_size_x < 1.0
            if _is_degrees:
                pixel_size_m_resolved = 10.0   # Sentinel-2 default (metres)
            else:
                pixel_size_m_resolved = float(pixel_size_x)

            crs_info = str(crs) if crs else "unknown"

            metadata = {
                "format": "GeoTIFF",
                "width": src.width,
                "height": src.height,
                "bands": band_count,
                "crs_info": crs_info,
                "pixel_size_x": float(pixel_size_x),
                "pixel_size_y": float(pixel_size_y),
                "pixel_size_m": pixel_size_m_resolved,  # always in metres
                "pixel_size_degrees": _is_degrees,
                "transform": list(transform)[:6],
            }

        rgb = np.stack([r, g, b], axis=-1)
        return rgb, transform, crs, metadata

    except Exception as e:
        raise RuntimeError(f"Failed to read GeoTIFF: {e}") from e


def _load_image_pil(file_path: str) -> Tuple[np.ndarray, None, None, Dict]:
    """Load a PNG/JPG file using PIL."""
    try:
        img = Image.open(file_path).convert("RGB")
        rgb = np.array(img, dtype=np.float32)
        metadata = {
            "format": "PIL",
            "width": img.width,
            "height": img.height,
            "bands": 3,
            "crs_info": "N/A (non-geographic format)",
            "pixel_size_x": None,
            "pixel_size_y": None,
            "pixel_size_m": 10.0,  # fallback default
            "transform": None,
        }
        return rgb, None, None, metadata
    except Exception as e:
        raise RuntimeError(f"Failed to read image with PIL: {e}") from e


def load_satellite_image(file_path: str) -> Tuple[np.ndarray, Any, Any, Dict]:
    """
    Load a satellite image from disk.

    For GeoTIFF/TIFF: uses rasterio, reads bands 1,2,3 as R,G,B.
    For PNG/JPG: uses PIL, converts to RGB.

    Returns:
        (rgb_float32, transform, crs, metadata)
        rgb_float32: raw pixel values as float32 (NOT yet preprocessed)
    """
    ext = Path(file_path).suffix.lower()
    if ext in (".tif", ".tiff", ".geotiff"):
        return _load_geotiff(file_path)
    else:
        return _load_image_pil(file_path)


def validate_satellite_image(rgb: np.ndarray, metadata: Dict, filename: str) -> List[str]:
    """
    Validate an image array.

    Returns:
        List of error strings (empty list = valid).
    """
    errors = []
    if rgb is None:
        errors.append(f"'{filename}': Image could not be loaded.")
        return errors

    if rgb.ndim != 3 or rgb.shape[2] < 3:
        errors.append(f"'{filename}': Image must have at least 3 channels (RGB).")

    h, w = rgb.shape[:2]
    if h < 64 or w < 64:
        errors.append(f"'{filename}': Image dimensions ({w}x{h}) are too small. Minimum is 64x64.")

    if metadata.get("format") == "GeoTIFF" and metadata.get("bands", 0) < 3:
        errors.append(f"'{filename}': GeoTIFF has fewer than 3 bands.")

    return errors


def apply_percentile_stretch(rgb: np.ndarray, low_pct: float = LOW_PCT, high_pct: float = HIGH_PCT) -> np.ndarray:
    """
    Joint percentile stretch across all channels combined (from notebook Cell 29).
    Input: float32 array (raw pixel values)
    Output: float32 array in [0, 1]
    """
    combined = rgb.flatten()
    lo = np.percentile(combined, low_pct)
    hi = np.percentile(combined, high_pct)
    rgb_stretched = np.clip((rgb - lo) / (hi - lo + 1e-6), 0.0, 1.0)
    return rgb_stretched.astype(np.float32)


def apply_clahe_lab(rgb_float: np.ndarray, clip_limit: float = CLAHE_CLIP) -> np.ndarray:
    """
    Apply CLAHE to the L channel in LAB color space.
    Input: float32 array in [0, 1]
    Output: uint8 array in [0, 255]
    """
    from skimage import color, exposure

    # Convert to LAB space
    lab = color.rgb2lab(rgb_float)
    
    # Scale L channel (which is 0-100) to 0-1 for CLAHE
    l_chan = lab[:, :, 0] / 100.0
    l_clahe = exposure.equalize_adapthist(l_chan, clip_limit=clip_limit)
    lab[:, :, 0] = l_clahe * 100.0
    
    # Convert back to RGB
    rgb_clahe = color.lab2rgb(lab)
    
    # Convert to uint8
    rgb_final = np.clip(rgb_clahe * 255, 0, 255).astype(np.uint8)
    return rgb_final


def preprocess_satellite_image(file_path: str) -> Tuple[np.ndarray, Any, Any, Dict]:
    """
    Full preprocessing pipeline:
      1. Load image
      2. Joint percentile stretch (2-98%)
      3. Convert to LAB and apply CLAHE to L channel
      4. Convert back to RGB

    Returns:
        (processed_rgb_uint8, transform, crs, metadata)
    """
    rgb_raw, transform, crs, metadata = load_satellite_image(file_path)

    # Step 1: percentile stretch
    rgb_stretched = apply_percentile_stretch(rgb_raw, low_pct=LOW_PCT, high_pct=HIGH_PCT)

    # Step 2: LAB CLAHE
    rgb_final = apply_clahe_lab(rgb_stretched, clip_limit=CLAHE_CLIP)

    logger.info(
        "Preprocessed '%s': shape=%s, stretch 2-98%%, LAB CLAHE",
        Path(file_path).name,
        rgb_final.shape,
    )
    return rgb_final, transform, crs, metadata


def crop_to_common_dimensions(
    img_old: np.ndarray, img_new: np.ndarray
) -> Tuple[np.ndarray, np.ndarray, bool]:
    """
    Crop both images to the minimum common dimensions (from notebook).
    Returns (img_old_cropped, img_new_cropped, was_cropped)
    """
    h_old, w_old = img_old.shape[:2]
    h_new, w_new = img_new.shape[:2]

    min_h = min(h_old, h_new)
    min_w = min(w_old, w_new)

    was_cropped = (h_old != h_new) or (w_old != w_new)

    img_old_cropped = img_old[:min_h, :min_w]
    img_new_cropped = img_new[:min_h, :min_w]

    return img_old_cropped, img_new_cropped, was_cropped
