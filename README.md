# GreenLens 🌍

GreenLens is a full-stack, AI-powered web application that detects land-cover changes and monitors deforestation using satellite imagery. It leverages a custom-trained ResNet50 deep learning model (trained on the EuroSAT dataset) to classify 64×64 pixel patches into 10 distinct land-cover types, comparing historical and current satellite imagery to identify environmental changes.

## ✨ Features

- **End-to-End AI Pipeline:** Automatically processes raw GeoTIFF or PNG satellite images through a custom PyTorch ResNet50 model.
- **Advanced Preprocessing:** Implements robust image enhancements including a 2–98% joint percentile stretch and LAB color-space CLAHE (Contrast Limited Adaptive Histogram Equalization) on the Lightness (L) channel.
- **Interactive UI Dashboard:** A modern, responsive React interface that displays overall deforestation statistics, total area affected, and class transitions.
- **Visual Analytics:** Automatically generates side-by-side land-cover maps and a highlighted alpha-blended "Deforestation Map" overlay.
- **Patch Explorer:** Inspect the AI's confidence levels on a patch-by-patch basis to understand exactly why a region was flagged.
- **Unified Deployment:** The highly-optimized React frontend is bundled and seamlessly served by the FastAPI backend on a single port.

## 🏗️ Architecture

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, React Router, Axios, Lucide React.
- **Backend:** Python 3, FastAPI, PyTorch, Torchvision, Rasterio, Scikit-Image, Matplotlib, SciPy.
- **Model:** ResNet50 (pre-trained + fine-tuned on EuroSAT for 10 classes).

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.9+** (with pip)
- **Node.js 18+** (for frontend development/building)
- The trained model file `eurosat_resnet50_final.pth` must be located at `../anigravity/eurosat_resnet50_final.pth` relative to the backend.

### Running the Integrated Application
Because the frontend has already been built and integrated into the backend, you only need to run the Python server!

1. **Navigate to the Backend Directory:**
   ```bash
   cd backend
   ```

2. **Install Python Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the FastAPI Server:**
   ```bash
   python -m uvicorn app.main:app --port 8000
   ```

4. **Open the Application:**
   Open your browser and navigate to: **[http://localhost:8000](http://localhost:8000)**

---

## 🛠️ Development Mode

If you wish to make changes to the React frontend UI and see them update in real-time (Hot Module Replacement), you can run the application in split development mode.

**Terminal 1 (Backend API):**
```bash
cd backend
python -m uvicorn app.main:app --port 8000 --reload
```

**Terminal 2 (Frontend UI):**
```bash
cd frontend
npm install
npm run dev
```
*(Navigate to `http://localhost:5173` to view the development frontend).*

When you are finished making changes to the frontend, you must rebuild it so the backend can serve the latest version:
```bash
cd frontend
npm run build
```

## 📂 Project Structure

```text
project/
├── backend/                  # FastAPI Python Server
│   ├── app/
│   │   ├── routes/           # API endpoints (analysis, health, results)
│   │   ├── services/         # Core logic (model_service, change_detection, patching)
│   │   ├── config.py         # App configuration & paths
│   │   └── main.py           # Server entry point & static file routing
│   ├── outputs/              # Generated maps, thumbnails, and JSON reports
│   ├── temp/                 # Temporary storage for uploaded images
│   └── requirements.txt      # Python dependencies
│
└── frontend/                 # React UI Client
    ├── dist/                 # Compiled production build (served by FastAPI)
    ├── src/
    │   ├── components/       # Reusable UI components (Navbar, UploadCard)
    │   ├── pages/            # View routing (Home, Processing, Results)
    │   ├── services/         # API client layer (Axios)
    │   └── App.tsx           # React Router setup
    ├── package.json          # Node dependencies
    ├── tailwind.config.js    # Custom styling, colors, and animations
    └── vite.config.ts        # Build configuration & dev proxy
```

## 🧪 How it Works

1. **Upload:** User uploads "Old" and "New" satellite images.
2. **Pre-process:** Images are normalized, stretched, and equalized for lighting consistency.
3. **Patch Extraction:** Images are sliced into grids of 64×64 pixel patches.
4. **Inference:** Each patch is resized to 224x224 and passed through the ResNet50 model to classify its land-cover type.
5. **Change Detection:** Deforestation is flagged wherever a patch transitions from `Forest` in the old image to `AnnualCrop`, `Pasture`, `Industrial`, `Residential`, or `PermanentCrop` in the new image.
6. **Rendering:** The UI fetches the JSON metadata and image assets (generated headless via Matplotlib) and renders the dashboard.
