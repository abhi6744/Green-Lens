"""
GreenLens FastAPI Application Entry Point
"""
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routes import health, analysis, reports
from app.services.model_service import model_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup/shutdown lifecycle."""
    # Startup: load the ML model
    logger.info("GreenLens API starting up...")
    
    model_path = str(settings.model_path_abs)
    class_names_path = str(settings.models_dir_abs / "class_names.json")
    
    logger.info("Loading model from: %s", model_path)
    try:
        model_service.load_model(model_path, class_names_path)
        logger.info("Model loaded successfully on device: %s", model_service.get_device())
    except Exception as e:
        logger.error("FAILED to load model: %s", e)
        logger.error("The /api/analyze endpoint will fail until the model is available.")
    
    yield
    
    # Shutdown cleanup
    logger.info("GreenLens API shutting down.")


app = FastAPI(
    title="GreenLens API",
    description="Satellite land-cover change detection powered by ResNet50",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS - allow frontend dev servers
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(health.router)
app.include_router(analysis.router)
app.include_router(reports.router)

from fastapi.responses import FileResponse
from fastapi import HTTPException

# Serve output images as static files
outputs_dir = settings.outputs_dir_abs
app.mount("/outputs", StaticFiles(directory=str(outputs_dir)), name="outputs")

# Mount frontend static files
frontend_dist = Path(__file__).parent.parent.parent / "frontend" / "dist"

if (frontend_dist / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="frontend_assets")

@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    """Serve the React frontend, handling client-side routing."""
    # Let API requests fall through to a 404 (or their actual endpoints)
    if full_path.startswith("api/") or full_path.startswith("outputs/"):
        raise HTTPException(status_code=404, detail="Not found")

    # Serve static files from root if requested (like vite.svg, favicon, etc)
    potential_file = frontend_dist / full_path
    if full_path and potential_file.is_file():
        return FileResponse(str(potential_file))

    # Serve index.html for all other routes (React Router)
    index_path = frontend_dist / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    
    return {
        "name": "GreenLens API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health",
        "message": "Frontend build not found. Run 'npm run build' in the frontend directory."
    }
