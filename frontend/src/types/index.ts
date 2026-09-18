// API types matching backend schemas

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface JobStatusResponse {
  job_id: string;
  status: JobStatus;
  stage: string | null;
  stage_label: string | null;
  progress: number;
  error: string | null;
}

export interface PatchResult {
  id: string;
  row: number;
  col: number;
  pixel_y: number;
  pixel_x: number;
  old_class: string;
  new_class: string;
  old_confidence: number;
  new_confidence: number;
  deforestation: boolean;
  thumbnail_old?: string;
}

export interface ResultMaps {
  old_satellite: string;
  new_satellite: string;
  old_land_cover: string;
  new_land_cover: string;
  deforestation: string;
}

export interface AnalysisResult {
  job_id: string;
  status: JobStatus;
  old_year: number;
  new_year: number;
  old_filename?: string;
  new_filename?: string;
  region: string;
  grid_rows: number;
  grid_cols: number;
  total_patches: number;
  forest_patches_old: number;
  deforested_patches: number;
  changed_patches: number;
  deforestation_rate_pct: number;
  estimated_area_km2: number;
  area_source: string;
  class_distribution_old: Record<string, number>;
  class_distribution_new: Record<string, number>;
  transition_counts: Record<string, number>;
  model_confidence_avg: number;
  maps: ResultMaps;
  patches: PatchResult[];
  warnings: string[];
  metadata_old?: Record<string, string>;
  metadata_new?: Record<string, string>;
}

// Upload state
export interface ImageUpload {
  file: File | null;
  year: string;
  preview: string | null;
  error: string | null;
}

// Class colors (matches visualization.py CLASS_COLORS)
export const CLASS_COLORS: Record<string, string> = {
  AnnualCrop: '#1f77b4',
  Forest: '#2ca02c',
  HerbaceousVegetation: '#8c564b',
  Highway: '#7f7f7f',
  Industrial: '#bcbd22',
  Pasture: '#ff7f0e',
  PermanentCrop: '#d62728',
  Residential: '#9467bd',
  River: '#17becf',
  SeaLake: '#e377c2',
};

export const CLASS_NAMES = [
  'AnnualCrop',
  'Forest',
  'HerbaceousVegetation',
  'Highway',
  'Industrial',
  'Pasture',
  'PermanentCrop',
  'Residential',
  'River',
  'SeaLake',
];
