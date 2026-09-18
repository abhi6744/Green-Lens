import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
from scipy.ndimage import gaussian_filter
from PIL import Image
import base64
from typing import List
import os

CLASS_COLORS = {
    'AnnualCrop': '#1f77b4',
    'Forest': '#2ca02c',
    'HerbaceousVegetation': '#8c564b',
    'Highway': '#7f7f7f',
    'Industrial': '#bcbd22',
    'Pasture': '#ff7f0e',
    'PermanentCrop': '#d62728',
    'Residential': '#9467bd',
    'River': '#17becf',
    'SeaLake': '#e377c2',
}

def generate_land_cover_map(pred_map: np.ndarray, class_names: List[str], title: str, output_path: str) -> str:
    cmap_colors = [CLASS_COLORS[c] for c in class_names]
    cmap = mcolors.ListedColormap(cmap_colors)
    bounds = np.arange(len(class_names) + 1) - 0.5
    norm = mcolors.BoundaryNorm(bounds, cmap.N)
    
    plt.figure(figsize=(10, 10))
    plt.imshow(pred_map, cmap=cmap, norm=norm)
    plt.title(title)
    plt.axis('off')
    
    cbar = plt.colorbar(ticks=range(len(class_names)), fraction=0.046, pad=0.04)
    cbar.ax.set_yticklabels(class_names)
    
    plt.savefig(output_path, bbox_inches='tight', dpi=150)
    plt.close()
    return output_path

def generate_deforestation_map(img_new: np.ndarray, deforestation_mask: np.ndarray, 
                               patch_size: int, grid_rows: int, grid_cols: int,
                               output_path: str) -> str:
    mask_full_res = np.repeat(np.repeat(deforestation_mask.astype(float), patch_size, axis=0), patch_size, axis=1)
    mask_smoothed = gaussian_filter(mask_full_res, sigma=15)
    if mask_smoothed.max() > 0:
        mask_smoothed = mask_smoothed / mask_smoothed.max()
        
    overlay = np.zeros((*mask_smoothed.shape, 4))
    overlay[..., 0] = 1.0  # Red
    overlay[..., 3] = mask_smoothed * 0.7  # Alpha
    
    h, w = overlay.shape[:2]
    base_img = img_new[:h, :w]
    
    fig, ax = plt.subplots(figsize=(10, 10))
    ax.imshow(base_img)
    ax.imshow(overlay)
    ax.set_title("Deforestation Detected")
    ax.axis('off')
    
    plt.savefig(output_path, bbox_inches='tight', dpi=150)
    plt.close()
    return output_path

def generate_satellite_thumbnail(img: np.ndarray, grid_rows: int, grid_cols: int,
                                  patch_size: int, output_path: str) -> str:
    h = grid_rows * patch_size
    w = grid_cols * patch_size
    cropped = img[:h, :w]
    im = Image.fromarray(cropped)
    im.save(output_path)
    return output_path

def encode_image_to_base64(image_path: str) -> str:
    with open(image_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
    return f"data:image/png;base64,{encoded_string}"
