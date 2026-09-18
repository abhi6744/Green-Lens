"""
Analysis routes - job-based processing pipeline
"""
import base64
import logging
import os
import threading
import uuid
from pathlib import Path
from typing import Optional

import numpy as np
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.config import settings
from app.schemas import JobStatusEnum
from app.services.change_detection import (
    compute_deforestation_mask,
    compute_statistics,
    DEFAULT_RESOLUTION_M,
)
from app.services.model_service import model_service
from app.services.patching import extract_patches, get_grid_dims, PATCH_SIZE
from app.services.preprocessing import (
    crop_to_common_dimensions,
    preprocess_satellite_image,
    validate_satellite_image,
    load_satellite_image,
)
from app.services.report_service import generate_report
from app.services.visualization import (
    generate_deforestation_map,
    generate_land_cover_map,
    generate_satellite_thumbnail,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory job store
_jobs: dict = {}
_jobs_lock = threading.Lock()

# Stage definitions
STAGES = {
    "validating": ("Validating input images", 5),
    "reading": ("Reading image data", 15),
    "enhancing": ("Applying image enhancement", 25),
    "patching": ("Creating 64×64 patches", 40),
    "inferring": ("Running model inference", 60),
    "comparing": ("Comparing land-cover maps", 80),
    "generating": ("Generating results", 90),
}


def _update_job(job_id: str, **kwargs):
    with _jobs_lock:
        if job_id in _jobs:
            _jobs[job_id].update(kwargs)


def _get_job(job_id: str) -> Optional[dict]:
    with _jobs_lock:
        return dict(_jobs.get(job_id, {})) if job_id in _jobs else None


def _save_upload(file_bytes: bytes, ext: str, job_id: str, label: str) -> str:
    """Save uploaded file bytes to temp directory."""
    temp_dir = settings.temp_dir_abs
    path = str(temp_dir / f"{job_id}_{label}{ext}")
    with open(path, "wb") as f:
        f.write(file_bytes)
    return path


def _patch_to_b64(patch: np.ndarray) -> str:
    """Encode a small patch as a base64 PNG string."""
    from PIL import Image
    import io
    img = Image.fromarray(patch)
    img = img.resize((64, 64))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return "data:image/png;base64," + base64.b64encode(buf.read()).decode("utf-8")


def _process_job(
    job_id: str,
    old_path: str,
    new_path: str,
    old_year: int,
    new_year: int,
    old_filename: str,
    new_filename: str,
):
    """Background thread: full analysis pipeline."""
    try:
        out_dir = settings.outputs_dir_abs
        warnings = []

        # 1. Validate
        _update_job(job_id, status=JobStatusEnum.processing, stage="validating",
                    stage_label=STAGES["validating"][0], progress=5)

        # Load raw (unprocessed) for validation metadata
        _, _, _, meta_old = load_satellite_image(old_path)
        _, _, _, meta_new = load_satellite_image(new_path)

        errors = []
        if meta_old["bands"] < 3:
            errors.append(f"Old image has fewer than 3 bands ({meta_old['bands']}).")
        if meta_new["bands"] < 3:
            errors.append(f"New image has fewer than 3 bands ({meta_new['bands']}).")
        if errors:
            raise ValueError(". ".join(errors))

        if meta_old.get("crs_info") != meta_new.get("crs_info"):
            warnings.append(
                "The images have different spatial metadata. The notebook-compatible common-size "
                "workflow will be used (crop to minimum dimensions)."
            )

        # 2. Preprocess
        _update_job(job_id, stage="reading", stage_label=STAGES["reading"][0], progress=15)
        img_old, transform_old, crs_old, meta_old = preprocess_satellite_image(old_path)

        _update_job(job_id, stage="enhancing", stage_label=STAGES["enhancing"][0], progress=25)
        img_new, transform_new, crs_new, meta_new = preprocess_satellite_image(new_path)

        # 3. Crop to common dimensions
        img_old, img_new, was_cropped = crop_to_common_dimensions(img_old, img_new)
        if was_cropped:
            warnings.append(
                "Images had different dimensions and were cropped to the common minimum size."
            )

        # 4. Extract patches
        _update_job(job_id, stage="patching", stage_label=STAGES["patching"][0], progress=40)
        patches_old, positions = extract_patches(img_old, PATCH_SIZE)
        patches_new, _ = extract_patches(img_new, PATCH_SIZE)
        grid_rows, grid_cols = get_grid_dims(img_old, PATCH_SIZE)

        if len(patches_old) == 0:
            raise ValueError("Image is too small to extract any 64×64 patches.")

        # 5. Run inference
        _update_job(job_id, stage="inferring", stage_label=STAGES["inferring"][0], progress=50)
        preds_old, confs_old = model_service.predict_patches(patches_old, batch_size=64)

        _update_job(job_id, progress=65)
        preds_new, confs_new = model_service.predict_patches(patches_new, batch_size=64)

        # 6. Build maps and deforestation
        _update_job(job_id, stage="comparing", stage_label=STAGES["comparing"][0], progress=80)
        map_old = preds_old.reshape((grid_rows, grid_cols))
        map_new = preds_new.reshape((grid_rows, grid_cols))

        class_names = model_service.get_class_names()
        deforestation_mask = compute_deforestation_mask(map_old, map_new, class_names)

        # Determine pixel resolution for area
        pixel_size_m = meta_old.get("pixel_size_m") or DEFAULT_RESOLUTION_M
        area_source = (
            "GeoTIFF pixel resolution"
            if meta_old.get("format") == "GeoTIFF" and meta_old.get("pixel_size_m")
            else "Notebook fallback resolution: 10 m/pixel"
        )

        stats = compute_statistics(
            map_old, map_new, deforestation_mask, class_names,
            pixel_size_m=pixel_size_m, patch_size=PATCH_SIZE
        )

        # 7. Generate visualizations
        _update_job(job_id, stage="generating", stage_label=STAGES["generating"][0], progress=88)

        map_old_path = str(out_dir / f"{job_id}_map_old.png")
        map_new_path = str(out_dir / f"{job_id}_map_new.png")
        def_map_path = str(out_dir / f"{job_id}_deforestation.png")
        sat_old_path = str(out_dir / f"{job_id}_sat_old.png")
        sat_new_path = str(out_dir / f"{job_id}_sat_new.png")

        generate_land_cover_map(
            map_old, class_names,
            f"Land Cover Map — {old_year}",
            map_old_path,
        )
        generate_land_cover_map(
            map_new, class_names,
            f"Land Cover Map — {new_year}",
            map_new_path,
        )
        generate_deforestation_map(
            img_new, deforestation_mask, PATCH_SIZE, grid_rows, grid_cols, def_map_path
        )
        generate_satellite_thumbnail(img_old, grid_rows, grid_cols, PATCH_SIZE, sat_old_path)
        generate_satellite_thumbnail(img_new, grid_rows, grid_cols, PATCH_SIZE, sat_new_path)

        # 8. Build patch results (include thumbnail base64 for UI)
        patches_result = []
        for idx in range(len(patches_old)):
            py, px = positions[idx]  # pixel offsets
            r_idx, c_idx = py // PATCH_SIZE, px // PATCH_SIZE
            is_deforested = bool(deforestation_mask[r_idx, c_idx]) if (r_idx < grid_rows and c_idx < grid_cols) else False
            # Include thumbnail (base64) for first 500 patches for performance
            thumbnail = None
            if idx < 500:
                thumbnail = _patch_to_b64(patches_old[idx])
            patches_result.append({
                "id": f"P-{r_idx}-{c_idx}",
                "row": r_idx,
                "col": c_idx,
                "pixel_y": py,
                "pixel_x": px,
                "old_class": class_names[int(preds_old[idx])],
                "new_class": class_names[int(preds_new[idx])],
                "old_confidence": round(float(confs_old[idx]), 4),
                "new_confidence": round(float(confs_new[idx]), 4),
                "deforestation": is_deforested,
                "thumbnail_old": thumbnail,
            })

        # Generate report
        report_path = str(out_dir / f"{job_id}_report.json")
        generate_report(
            job_id=job_id,
            old_year=old_year,
            new_year=new_year,
            old_filename=old_filename,
            new_filename=new_filename,
            stats=stats,
            warnings=warnings,
            output_path=report_path,
        )

        result = {
            "job_id": job_id,
            "status": "completed",
            "old_year": old_year,
            "new_year": new_year,
            "old_filename": old_filename,
            "new_filename": new_filename,
            "region": "unknown",
            "grid_rows": grid_rows,
            "grid_cols": grid_cols,
            "model_confidence_avg": round(float((np.mean(confs_old) + np.mean(confs_new)) / 2), 4),
            "area_source": area_source,
            "maps": {
                "old_satellite": f"{job_id}_sat_old.png",
                "new_satellite": f"{job_id}_sat_new.png",
                "old_land_cover": f"{job_id}_map_old.png",
                "new_land_cover": f"{job_id}_map_new.png",
                "deforestation": f"{job_id}_deforestation.png",
            },
            "patches": patches_result,
            "warnings": warnings,
            "metadata_old": {k: str(v) for k, v in meta_old.items()},
            "metadata_new": {k: str(v) for k, v in meta_new.items()},
        }
        result.update(stats)

        _update_job(job_id, status=JobStatusEnum.completed, progress=100, result=result)
        logger.info("Job %s completed successfully.", job_id)

    except Exception as exc:
        import traceback
        logger.error("Job %s failed: %s\n%s", job_id, exc, traceback.format_exc())
        _update_job(
            job_id,
            status=JobStatusEnum.failed,
            error=str(exc),
            progress=100,
        )
    finally:
        # Clean up temp files
        for p in [old_path, new_path]:
            try:
                if os.path.exists(p):
                    os.remove(p)
            except Exception:
                pass


# ─────────────────────────────── ROUTES ───────────────────────────────

@router.post("/api/analyze")
async def create_analysis(
    old_image: UploadFile = File(...),
    new_image: UploadFile = File(...),
    old_year: int = Form(...),
    new_year: int = Form(...),
):
    """
    Start a new analysis job.
    Uploads two satellite images, starts background processing.
    Returns job_id for polling.
    """
    # Basic input validation
    if old_year == new_year:
        raise HTTPException(status_code=422, detail="Old and new years must be different.")

    if old_year > new_year:
        raise HTTPException(status_code=422, detail="Old year must be before new year.")

    # Validate file extensions
    old_ext = Path(old_image.filename or "").suffix.lower()
    new_ext = Path(new_image.filename or "").suffix.lower()
    allowed = {".tif", ".tiff", ".geotiff", ".png", ".jpg", ".jpeg"}

    if old_ext not in allowed:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported format for old image: '{old_ext}'. Supported: GeoTIFF, TIFF, PNG, JPG."
        )
    if new_ext not in allowed:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported format for new image: '{new_ext}'. Supported: GeoTIFF, TIFF, PNG, JPG."
        )

    job_id = str(uuid.uuid4())

    # Read file bytes
    old_bytes = await old_image.read()
    new_bytes = await new_image.read()

    # Check file size
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if len(old_bytes) > max_bytes:
        raise HTTPException(status_code=413, detail=f"Old image exceeds maximum size of {settings.MAX_FILE_SIZE_MB} MB.")
    if len(new_bytes) > max_bytes:
        raise HTTPException(status_code=413, detail=f"New image exceeds maximum size of {settings.MAX_FILE_SIZE_MB} MB.")

    # Save to temp
    old_path = _save_upload(old_bytes, old_ext, job_id, "old")
    new_path = _save_upload(new_bytes, new_ext, job_id, "new")

    # Create job record
    with _jobs_lock:
        _jobs[job_id] = {
            "job_id": job_id,
            "status": JobStatusEnum.queued,
            "stage": None,
            "stage_label": "Queued",
            "progress": 0,
            "result": None,
            "error": None,
        }

    # Start background thread
    thread = threading.Thread(
        target=_process_job,
        args=(job_id, old_path, new_path, old_year, new_year,
              old_image.filename or "old_image", new_image.filename or "new_image"),
        daemon=True,
    )
    thread.start()

    return {"job_id": job_id, "status": "queued", "message": "Analysis job started."}


@router.get("/api/analyze/{job_id}")
async def get_analysis_status(job_id: str):
    """Poll job status."""
    job = _get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return {
        "job_id": job_id,
        "status": job.get("status"),
        "stage": job.get("stage"),
        "stage_label": job.get("stage_label"),
        "progress": job.get("progress", 0),
        "error": job.get("error"),
    }


@router.get("/api/results/{job_id}")
async def get_analysis_result(job_id: str):
    """Get full results when job is completed."""
    job = _get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    if job.get("status") == JobStatusEnum.failed:
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {job.get('error', 'Unknown error')}"
        )
    if job.get("status") != JobStatusEnum.completed:
        raise HTTPException(status_code=202, detail="Job not completed yet.")
    return job.get("result", {})


@router.get("/api/results/{job_id}/report")
async def download_report(job_id: str):
    """Download analysis report as JSON."""
    out_dir = settings.outputs_dir_abs
    report_path = out_dir / f"{job_id}_report.json"
    if not report_path.exists():
        raise HTTPException(status_code=404, detail="Report not found.")
    return FileResponse(
        str(report_path),
        media_type="application/json",
        filename=f"greenlens_report_{job_id}.json",
    )


@router.get("/api/results/{job_id}/asset/{asset_name}")
async def get_asset(job_id: str, asset_name: str):
    """Serve a result image asset."""
    # Security: ensure asset_name doesn't contain path traversal
    if ".." in asset_name or "/" in asset_name or "\\" in asset_name:
        raise HTTPException(status_code=400, detail="Invalid asset name.")
    out_dir = settings.outputs_dir_abs
    asset_path = out_dir / asset_name
    if not asset_path.exists():
        raise HTTPException(status_code=404, detail=f"Asset '{asset_name}' not found.")
    return FileResponse(str(asset_path), media_type="image/png")


@router.get("/api/results/{job_id}/download-all")
async def download_all_assets(job_id: str):
    """Download all analysis results as a ZIP file."""
    import zipfile
    job = _get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    if job.get("status") != JobStatusEnum.completed:
        raise HTTPException(status_code=400, detail="Job not completed yet.")

    out_dir = settings.outputs_dir_abs
    zip_path = out_dir / f"{job_id}_all_results.zip"

    # Generate the ZIP file if it doesn't already exist
    if not zip_path.exists():
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Add the JSON report
            report_path = out_dir / f"{job_id}_report.json"
            if report_path.exists():
                zipf.write(report_path, arcname="report.json")
            
            # Add all map images from the job
            maps = job.get("result", {}).get("maps", {})
            for name, asset_file in maps.items():
                asset_path = out_dir / asset_file
                if asset_path.exists():
                    zipf.write(asset_path, arcname=f"{name}.png")

    return FileResponse(
        str(zip_path),
        media_type="application/zip",
        filename=f"greenlens_results_{job_id}.zip"
    )
