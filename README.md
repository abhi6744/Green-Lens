# 🌿 GreenLens — Satellite Insights for a Greener Planet

GreenLens is a full-stack AI-powered web application for satellite image change detection, specialising in **deforestation monitoring**. Upload two GeoTIFF satellite images from different time periods and GreenLens will classify land cover, detect forest loss, and generate visual maps — all powered by a trained **ResNet50** model.

---

## ✨ Features

- 🛰️ **Upload two GeoTIFF images** (old and new year) directly in the browser
- 🤖 **ResNet50 inference** — classifies each 64×64 patch into one of 10 EuroSAT land cover types
- 🗺️ **Land cover maps** — colour-coded patch-level classification visualisations for both images
- 🔴 **Deforestation overlay** — Gaussian-smoothed red overlay highlighting Forest → target class transitions
- 📊 **KPI dashboard** — Deforestation Rate, Changed Patches, and Model Confidence
- 🔍 **Patch comparison view** — click any patch to inspect its old/new class, confidence scores, and thumbnail
- 📥 **Download results** — export all maps as a ZIP or download the JSON report
- ⚡ **Real-time progress** — live processing stage updates while analysis runs in the background

---

## 🏗️ Architecture

The application runs as a **single unified service** — the FastAPI backend serves both the REST API and the built React frontend.

```
project/
├── backend/                        # Python FastAPI application
│   ├── app/
│   │   ├── main.py                 # App entry point; mounts React frontend & API
│   │   ├── config.py               # Settings (model path, dirs, limits)
│   │   ├── schemas.py              # Pydantic request/response models
│   │   ├── routes/
│   │   │   ├── analysis.py         # POST /api/analyze, GET status & results, ZIP download
│   │   │   ├── health.py           # GET /api/health
│   │   │   └── reports.py          # (router placeholder)
│   │   └── services/
│   │       ├── model_service.py    # ResNet50 singleton loader & batch inference
│   │       ├── preprocessing.py    # GeoTIFF loading, percentile stretch, LAB CLAHE
│   │       ├── patching.py         # 64×64 patch extraction & grid dimensions
│   │       ├── change_detection.py # Deforestation mask, statistics, transition counts
│   │       ├── visualization.py    # Land cover maps, deforestation overlay (Matplotlib)
│   │       └── report_service.py   # JSON report generation
│   ├── models/
│   │   ├── eurosat_resnet50_final.pth   # Trained model weights
│   │   └── class_names.json            # Ordered class list
│   ├── outputs/                    # Generated maps & reports (gitignored)
│   ├── temp/                       # Uploaded files during processing (gitignored)
│   └── requirements.txt
│
└── frontend/                       # React + TypeScript + Vite application
    ├── src/
    │   ├── pages/
    │   │   ├── HomePage.tsx            # Upload form & product landing page
    │   │   ├── ProcessingPage.tsx      # Live progress polling page
    │   │   ├── ResultsPage.tsx         # KPIs, image comparison, download buttons
    │   │   └── PatchComparisonPage.tsx # Patch grid & detail panel
    │   ├── components/
    │   │   ├── Navbar.tsx
    │   │   ├── UploadCard.tsx          # Drag-and-drop GeoTIFF uploader
    │   │   ├── LandCoverLegend.tsx
    │   │   └── ProcessingSteps.tsx
    │   ├── services/
    │   │   └── api.ts                  # Axios API client
    │   └── types/
    │       └── index.ts                # TypeScript interfaces & CLASS_COLORS
    ├── package.json
    └── vite.config.ts
```

---

## 🧠 ML Pipeline

The inference pipeline exactly reproduces the training notebook workflow:

```
GeoTIFF (bands 1, 2, 3)
        ↓
  Joint 2–98% percentile stretch
        ↓
  RGB → LAB colour space
        ↓
  CLAHE on L-channel (clip_limit=0.02)
        ↓
  LAB → RGB (uint8)
        ↓
  64×64 patch extraction (stride = patch size, no overlap)
        ↓
  Resize each patch to 224×224
        ↓
  ToTensor + ImageNet normalisation
        ↓
  ResNet50 (10-class fc layer) — batch inference
        ↓
  argmax → class index, softmax max → confidence
        ↓
  old_map & new_map (grid_rows × grid_cols)
        ↓
  Deforestation mask: old==Forest AND new∈{AnnualCrop, Pasture, Industrial, Residential, PermanentCrop}
        ↓
  Gaussian-smoothed red overlay (sigma=15) on new satellite image
        ↓
  Statistics, land cover maps, JSON report
```

### Land Cover Classes (EuroSAT — 10 classes)

| Index | Class                  |
|-------|------------------------|
| 0     | AnnualCrop             |
| 1     | Forest                 |
| 2     | HerbaceousVegetation   |
| 3     | Highway                |
| 4     | Industrial             |
| 5     | Pasture                |
| 6     | PermanentCrop          |
| 7     | Residential            |
| 8     | River                  |
| 9     | SeaLake                |

### Deforestation Rule

Only **Forest → Non-forest** transitions count as deforestation:

```
old_class == Forest
AND
new_class ∈ { AnnualCrop, Pasture, Industrial, Residential, PermanentCrop }
```

`Forest → Forest` and all other class changes are **not** counted as deforestation.

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- The trained model weights placed at:
  ```
  project/backend/models/eurosat_resnet50_final.pth
  ```

---

### 1. Install Backend Dependencies

```bash
cd project/backend
pip install -r requirements.txt
```

> **Note:** Installing PyTorch separately is recommended for your specific CUDA version.
> See https://pytorch.org/get-started/locally/

---

### 2. Build the Frontend

```bash
cd project/frontend
npm install
npm run build
```

This compiles the React app into `frontend/dist/`, which FastAPI will serve automatically.

---

### 3. Run the Application

```bash
cd project/backend
python -m uvicorn app.main:app --port 8000
```

Then open **http://localhost:8000** in your browser.

That's it — one command runs everything.

---

## 🖥️ How to Use

1. **Go to** http://localhost:8000
2. **Upload** your **Old Image** (GeoTIFF from the earlier year)
3. **Upload** your **New Image** (GeoTIFF from the later year)
4. **Enter** the year for each image (old year must be before new year)
5. **Click** `Analyze Change`
6. **Watch** the live processing stages (validating → enhancing → patching → inferring → generating)
7. **View results:**
   - Satellite image comparison (old, new, deforestation overlay)
   - Land cover classification maps (old and new)
   - KPI cards: Deforestation Rate, Changed Patches, Model Confidence
   - Patch-level comparison — click any patch for class labels and confidence
8. **Download:**
   - `Download Images (ZIP)` — all maps + JSON report in one file
   - `Download Report` — JSON report only

---

## 📡 API Reference

All endpoints are served at `http://localhost:8000`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/health` | Health check & model status |
| `POST` | `/api/analyze` | Start analysis job (multipart: old_image, new_image, old_year, new_year) |
| `GET`  | `/api/analyze/{job_id}` | Poll job status & progress |
| `GET`  | `/api/results/{job_id}` | Get full results JSON when complete |
| `GET`  | `/api/results/{job_id}/asset/{filename}` | Serve a generated map image |
| `GET`  | `/api/results/{job_id}/report` | Download JSON report |
| `GET`  | `/api/results/{job_id}/download-all` | Download all maps + report as ZIP |

### Example: Start an Analysis

```bash
curl -X POST http://localhost:8000/api/analyze \
  -F "old_image=@2018.tif" \
  -F "new_image=@2023.tif" \
  -F "old_year=2018" \
  -F "new_year=2023"
```

Response:
```json
{ "job_id": "uuid-here", "status": "queued" }
```

### Example: Poll Status

```bash
curl http://localhost:8000/api/analyze/{job_id}
```

Response:
```json
{
  "job_id": "...",
  "status": "processing",
  "stage": "inferring",
  "stage_label": "Running model inference",
  "progress": 60,
  "error": null
}
```

---

## 📊 Result JSON Structure

```json
{
  "job_id": "...",
  "status": "completed",
  "old_year": 2018,
  "new_year": 2023,
  "grid_rows": 34,
  "grid_cols": 34,
  "total_patches": 1156,
  "forest_patches_old": 412,
  "deforested_patches": 86,
  "changed_patches": 411,
  "deforestation_rate_pct": 20.87,
  "model_confidence_avg": 0.841,
  "class_distribution_old": { "Forest": 412, "AnnualCrop": 300, "..." : "..." },
  "class_distribution_new": { "Forest": 326, "AnnualCrop": 386, "..." : "..." },
  "transition_counts": { "Forest->AnnualCrop": 62, "Forest->Pasture": 24, "..." : "..." },
  "maps": {
    "old_satellite": "job_id_sat_old.png",
    "new_satellite": "job_id_sat_new.png",
    "old_land_cover": "job_id_map_old.png",
    "new_land_cover": "job_id_map_new.png",
    "deforestation":  "job_id_deforestation.png"
  },
  "warnings": [],
  "patches": [
    {
      "id": "P-0-0", "row": 0, "col": 0,
      "old_class": "Forest", "new_class": "AnnualCrop",
      "old_confidence": 0.94, "new_confidence": 0.87,
      "deforestation": true,
      "thumbnail_old": "data:image/png;base64,..."
    }
  ]
}
```

---

## ⚙️ Configuration

All settings are in [`backend/app/config.py`](backend/app/config.py) and can be overridden via environment variables or a `.env` file:

| Setting | Default | Description |
|---------|---------|-------------|
| `MODEL_PATH` | `models/eurosat_resnet50_final.pth` | Path to model weights (relative to `backend/`) |
| `MODELS_DIR` | `models` | Directory for model files |
| `OUTPUTS_DIR` | `outputs` | Where generated maps are saved |
| `TEMP_DIR` | `temp` | Temporary upload directory |
| `MAX_FILE_SIZE_MB` | `500` | Maximum upload size per image |
| `HOST` | `0.0.0.0` | Server host |
| `PORT` | `8000` | Server port |

---

## 🗂️ Accepted File Formats

Only **GeoTIFF** files are accepted:

- `.tif`
- `.tiff`
- `.geotiff`

The file must contain **at least 3 bands** (bands 1, 2, 3 are used as R, G, B). PNG and JPG are **not accepted** — satellite imagery must retain full spectral precision.

### Resolution Handling

- If the GeoTIFF uses a **projected CRS** (pixel size ≥ 1 metre, e.g., EPSG:32633), the actual pixel resolution is used.
- If the GeoTIFF uses a **geographic CRS** (pixel size in degrees, e.g., EPSG:4326), GreenLens automatically falls back to the **Sentinel-2 default of 10 m/pixel**.

---

## 🛠️ Development

### Run Frontend in Dev Mode (with hot reload)

```bash
cd project/frontend
npm run dev
```

The dev server runs at http://localhost:5173 and proxies `/api` to the FastAPI backend at port 8000.

> You still need to start the backend separately when using dev mode.

### Run Backend Only

```bash
cd project/backend
python -m uvicorn app.main:app --port 8000 --reload
```

---

## 📦 Tech Stack

### Backend
| Package | Purpose |
|---------|---------|
| FastAPI 0.115 | REST API framework |
| Uvicorn | ASGI server |
| PyTorch ≥ 2.0 | Model inference |
| torchvision | ResNet50 architecture |
| rasterio | GeoTIFF reading |
| scikit-image | CLAHE (equalize_adapthist) |
| scipy | Gaussian filter for deforestation overlay |
| Pillow | Image I/O |
| Matplotlib | Land cover map rendering |
| Pydantic v2 | Data validation & settings |

### Frontend
| Package | Purpose |
|---------|---------|
| React 19 | UI framework |
| TypeScript | Type safety |
| Vite 8 | Build tool & dev server |
| Tailwind CSS 3 | Utility-first styling |
| React Router 7 | Client-side routing |
| Axios | HTTP client |
| Lucide React | Icon library |

---

## 🧹 .gitignore Notes

The following directories are gitignored and should **not** be committed:

- `backend/outputs/` — generated analysis maps (created at runtime)
- `backend/temp/` — temporary upload files (auto-cleaned after each job)
- `frontend/node_modules/`
- `frontend/dist/`
- `**/__pycache__/`
- `.env`

---

## 📝 Notes & Limitations

- **No persistent database** — analysis results are stored as files in `backend/outputs/` for the duration of the server session. Restarting the server clears in-memory job state (files remain on disk but the `/api/results/{job_id}` endpoint will return 404 until the job is re-run).
- **CPU inference** — inference runs on CPU by default. If a CUDA GPU is available, PyTorch will automatically use it.
- **Image alignment** — GreenLens assumes old and new images cover the same geographic area. If dimensions differ, both images are cropped to the common minimum size. No spatial reprojection is performed.
- **EuroSAT training distribution** — model accuracy is highest for Sentinel-2 imagery matching the EuroSAT dataset resolution (~10 m/pixel, RGB bands).

---

## 🌍 About

GreenLens was built as a complete ML deployment project — taking a trained ResNet50 model from a Jupyter notebook all the way to a production-style web application with a real inference pipeline, REST API, and interactive UI.

> *"Data today. Forests tomorrow."*
