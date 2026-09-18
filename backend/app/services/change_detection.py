"""
Change Detection Service
Implements the deforestation logic from notebook Cells 23, 34.
"""
import logging
from typing import Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)

# Forest class index (from label_map: Forest=1)
FOREST_CLASS = "Forest"

# Deforestation target classes (from notebook Cell 23)
DEFORESTATION_TARGETS = ["AnnualCrop", "Pasture", "Industrial", "Residential", "PermanentCrop"]

# Area calculation constants (from notebook)
PATCH_SIZE = 64
DEFAULT_RESOLUTION_M = 10.0  # metres per pixel (Sentinel-2 default)


def compute_deforestation_mask(
    map_old: np.ndarray,
    map_new: np.ndarray,
    class_names: List[str],
) -> np.ndarray:
    """
    Compute deforestation mask (notebook Cell 23/34).

    Deforestation = was Forest in OLD AND is a target non-forest in NEW.

    Args:
        map_old: int array (grid_rows, grid_cols) of class indices for old image
        map_new: int array (grid_rows, grid_cols) of class indices for new image
        class_names: ordered list of class names matching indices

    Returns:
        boolean numpy array (grid_rows, grid_cols)
    """
    forest_idx = class_names.index(FOREST_CLASS)
    target_indices = [class_names.index(c) for c in DEFORESTATION_TARGETS if c in class_names]

    was_forest = map_old == forest_idx
    now_non_forest = np.isin(map_new, target_indices)
    deforestation_mask = was_forest & now_non_forest

    n_deforested = int(deforestation_mask.sum())
    n_forest_old = int(was_forest.sum())
    logger.info(
        "Deforestation: %d patches deforested of %d original forest patches",
        n_deforested,
        n_forest_old,
    )
    return deforestation_mask


def compute_area_per_patch(pixel_size_m: float = DEFAULT_RESOLUTION_M, patch_size: int = PATCH_SIZE) -> float:
    """
    Compute area in km² for a single patch.
    Formula from notebook: (PATCH_SIZE * resolution_m / 1000) ** 2
    """
    return (patch_size * pixel_size_m / 1000.0) ** 2


def compute_class_distribution(pred_map: np.ndarray, class_names: List[str]) -> Dict[str, int]:
    """Count patches per class."""
    distribution = {}
    for idx, name in enumerate(class_names):
        count = int((pred_map == idx).sum())
        if count > 0:
            distribution[name] = count
    return distribution


def compute_transitions(
    map_old: np.ndarray,
    map_new: np.ndarray,
    deforestation_mask: np.ndarray,
    class_names: List[str],
) -> Dict[str, int]:
    """
    Compute forest->target transition counts.
    Only counts transitions that are in deforestation_mask.
    """
    transitions = {}
    forest_idx = class_names.index(FOREST_CLASS)

    for target in DEFORESTATION_TARGETS:
        if target not in class_names:
            continue
        target_idx = class_names.index(target)
        # Was forest AND is now this target class AND in deforestation mask
        count = int(((map_old == forest_idx) & (map_new == target_idx) & deforestation_mask).sum())
        key = f"Forest->{target}"
        transitions[key] = count

    # Also count "Others->Others" as general changed patches
    changed_total = int((map_old != map_new).sum())
    transitions["TotalChanged"] = changed_total

    return transitions


def compute_statistics(
    map_old: np.ndarray,
    map_new: np.ndarray,
    deforestation_mask: np.ndarray,
    class_names: List[str],
    pixel_size_m: float = DEFAULT_RESOLUTION_M,
    patch_size: int = PATCH_SIZE,
) -> Dict:
    """Compute all analysis statistics."""
    forest_idx = class_names.index(FOREST_CLASS)

    total_patches = int(map_old.size)
    forest_patches_old = int((map_old == forest_idx).sum())
    deforested_patches = int(deforestation_mask.sum())
    changed_patches = int((map_old != map_new).sum())

    deforestation_rate_pct = (
        float(deforested_patches / forest_patches_old * 100) if forest_patches_old > 0 else 0.0
    )

    area_per_patch_km2 = compute_area_per_patch(pixel_size_m, patch_size)
    estimated_area_km2 = float(deforested_patches * area_per_patch_km2)

    class_dist_old = compute_class_distribution(map_old, class_names)
    class_dist_new = compute_class_distribution(map_new, class_names)
    transitions = compute_transitions(map_old, map_new, deforestation_mask, class_names)

    logger.info("Total patches: %d", total_patches)
    logger.info("Old forest patches: %d", forest_patches_old)
    logger.info("Deforested patches: %d", deforested_patches)
    logger.info("Deforestation rate: %.2f%%", deforestation_rate_pct)
    logger.info("Estimated area: %.2f km²", estimated_area_km2)

    return {
        "total_patches": total_patches,
        "forest_patches_old": forest_patches_old,
        "deforested_patches": deforested_patches,
        "changed_patches": changed_patches,
        "deforestation_rate_pct": round(deforestation_rate_pct, 4),
        "estimated_area_km2": round(estimated_area_km2, 4),
        "area_per_patch_km2": round(area_per_patch_km2, 6),
        "pixel_size_m": pixel_size_m,
        "class_distribution_old": class_dist_old,
        "class_distribution_new": class_dist_new,
        "transition_counts": transitions,
    }
