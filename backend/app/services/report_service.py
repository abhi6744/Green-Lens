"""Report generation service."""
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


def generate_report(
    job_id: str,
    old_year: int,
    new_year: int,
    old_filename: str,
    new_filename: str,
    stats: Dict,
    warnings: List[str],
    output_path: str,
) -> str:
    """
    Generate a JSON analysis report.

    Returns:
        Path to the saved report file.
    """
    report = {
        "analysis_id": job_id,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "comparison": {
            "old_year": old_year,
            "new_year": new_year,
            "old_filename": old_filename,
            "new_filename": new_filename,
        },
        "model": {
            "name": "ResNet50",
            "weights": "eurosat_resnet50_final.pth",
            "input_size": "224×224",
            "classes": 10,
        },
        "preprocessing": {
            "pipeline": "joint percentile stretch (2-98%) + LAB space CLAHE on L channel (clip_limit=0.02)",
            "patch_size_px": 64,
            "model_input_px": 224,
            "normalization_mean": [0.485, 0.456, 0.406],
            "normalization_std": [0.229, 0.224, 0.225],
        },
        "deforestation_logic": {
            "was_forest_old": "patch classified as 'Forest' in old image",
            "now_non_forest": "patch classified as one of: AnnualCrop, Pasture, Industrial, Residential, PermanentCrop",
            "detection_criterion": "was_forest_old AND now_non_forest",
        },
        "results": stats,
        "warnings": warnings,
        "caveats": [
            "Results are based on AI classification of 64×64 image patches.",
            "Classification accuracy depends on image quality and sensor characteristics.",
            "Area estimates use pixel resolution from image metadata or a 10m/pixel default.",
            "This tool is intended for exploratory analysis, not certified land-use mapping.",
        ],
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, default=str)

    logger.info("Report saved to %s", output_path)
    return output_path
