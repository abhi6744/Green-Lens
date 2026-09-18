// API service layer
import axios from 'axios';
import type { JobStatusResponse, AnalysisResult } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:8000');

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
});

export const getHealth = async () => {
  const res = await api.get('/api/health');
  return res.data;
};

export const startAnalysis = async (
  oldImage: File,
  newImage: File,
  oldYear: number,
  newYear: number
): Promise<{ job_id: string; status: string }> => {
  const formData = new FormData();
  formData.append('old_image', oldImage);
  formData.append('new_image', newImage);
  formData.append('old_year', oldYear.toString());
  formData.append('new_year', newYear.toString());

  const res = await api.post('/api/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const getJobStatus = async (jobId: string): Promise<JobStatusResponse> => {
  const res = await api.get(`/api/analyze/${jobId}`);
  return res.data;
};

export const getResults = async (jobId: string): Promise<AnalysisResult> => {
  const res = await api.get(`/api/results/${jobId}`);
  return res.data;
};

export const getAssetUrl = (jobId: string, assetName: string): string => {
  return `${API_BASE}/api/results/${jobId}/asset/${assetName}`;
};

export const getReportUrl = (jobId: string): string => {
  return `${API_BASE}/api/results/${jobId}/report`;
};

export const getOutputImageUrl = (assetName: string): string => {
  return `${API_BASE}/outputs/${assetName}`;
};
