"""Schemas fixed - all required enums and models."""
from typing import Optional, Dict, List, Any
from pydantic import BaseModel
from enum import Enum


class JobStatusEnum(str, Enum):
    queued = "queued"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class AnalysisRequest(BaseModel):
    job_id: str
    status: JobStatusEnum
    message: str = "Analysis job created"


class JobStatus(BaseModel):
    job_id: str
    status: JobStatusEnum
    stage: Optional[str] = None
    stage_label: Optional[str] = None
    progress: int = 0
    error: Optional[str] = None


class PatchResult(BaseModel):
    id: str
    row: int
    col: int
    pixel_y: int
    pixel_x: int
    old_class: str
    new_class: str
    old_confidence: float
    new_confidence: float
    deforestation: bool


class ResultMaps(BaseModel):
    old_satellite: Optional[str] = None
    new_satellite: Optional[str] = None
    old_land_cover: Optional[str] = None
    new_land_cover: Optional[str] = None
    deforestation: Optional[str] = None


class AnalysisResult(BaseModel):
    job_id: str
    status: JobStatusEnum
    old_year: int
    new_year: int
    old_filename: Optional[str] = None
    new_filename: Optional[str] = None
    region: str = "unknown"
    grid_rows: int = 0
    grid_cols: int = 0
    total_patches: int = 0
    forest_patches_old: int = 0
    deforested_patches: int = 0
    deforestation_rate_pct: float = 0.0
    estimated_area_km2: float = 0.0
    area_source: str = "estimated"
    class_distribution_old: Dict[str, int] = {}
    class_distribution_new: Dict[str, int] = {}
    transition_counts: Dict[str, int] = {}
    model_confidence_avg: float = 0.0
    maps: ResultMaps = ResultMaps()
    patches: List[PatchResult] = []
    warnings: List[str] = []
    error: Optional[str] = None
    metadata_old: Optional[Dict[str, Any]] = None
    metadata_new: Optional[Dict[str, Any]] = None
