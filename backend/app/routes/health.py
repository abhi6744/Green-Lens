"""Health check route."""
from fastapi import APIRouter
from app.services.model_service import model_service
import torch

router = APIRouter()


@router.get("/api/health")
async def health_check():
    """Basic health check endpoint."""
    return {
        "status": "ok",
        "model_loaded": model_service.is_loaded(),
        "device": str(model_service.get_device()) if model_service.get_device() else "not_loaded",
        "cuda_available": torch.cuda.is_available(),
        "version": "1.0.0",
    }
