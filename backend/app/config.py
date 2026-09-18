"""
GreenLens Backend Configuration
"""
import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Paths - relative to the backend/ directory
    MODEL_PATH: str = "models/eurosat_resnet50_final.pth"
    OUTPUTS_DIR: str = "outputs"
    TEMP_DIR: str = "temp"
    MODELS_DIR: str = "models"

    # Upload limits
    MAX_FILE_SIZE_MB: int = 500
    ALLOWED_EXTENSIONS: list = [".tif", ".tiff", ".geotiff", ".png", ".jpg", ".jpeg"]

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    @property
    def model_path_abs(self) -> Path:
        """Resolve model path relative to this file's location."""
        base = Path(__file__).parent.parent  # backend/
        return (base / self.MODEL_PATH).resolve()

    @property
    def outputs_dir_abs(self) -> Path:
        base = Path(__file__).parent.parent
        p = (base / self.OUTPUTS_DIR).resolve()
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def temp_dir_abs(self) -> Path:
        base = Path(__file__).parent.parent
        p = (base / self.TEMP_DIR).resolve()
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def models_dir_abs(self) -> Path:
        base = Path(__file__).parent.parent
        p = (base / self.MODELS_DIR).resolve()
        p.mkdir(parents=True, exist_ok=True)
        return p


settings = Settings()
