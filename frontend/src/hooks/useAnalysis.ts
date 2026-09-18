// useAnalysis hook - manages the full analysis lifecycle
import { useState, useCallback, useRef } from 'react';
import { startAnalysis, getJobStatus, getResults } from '../services/api';
import type { JobStatusResponse, AnalysisResult } from '../types';

export type AnalysisState = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';

interface UseAnalysisReturn {
  state: AnalysisState;
  jobStatus: JobStatusResponse | null;
  result: AnalysisResult | null;
  error: string | null;
  jobId: string | null;
  startJob: (oldImage: File, newImage: File, oldYear: number, newYear: number) => Promise<void>;
  reset: () => void;
}

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 300; // 7.5 minutes max

export function useAnalysis(): UseAnalysisReturn {
  const [state, setState] = useState<AnalysisState>('idle');
  const [jobStatus, setJobStatus] = useState<JobStatusResponse | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const poll = useCallback(async (jid: string) => {
    if (attemptRef.current >= MAX_POLL_ATTEMPTS) {
      setState('failed');
      setError('Analysis timed out. Please try again with a smaller image.');
      return;
    }

    try {
      const status = await getJobStatus(jid);
      setJobStatus(status);
      attemptRef.current += 1;

      if (status.status === 'completed') {
        const res = await getResults(jid);
        setResult(res);
        setState('completed');
        stopPolling();
      } else if (status.status === 'failed') {
        setState('failed');
        setError(status.error || 'Analysis failed. Please try again.');
        stopPolling();
      } else {
        pollRef.current = setTimeout(() => poll(jid), POLL_INTERVAL_MS);
      }
    } catch (err: unknown) {
      attemptRef.current += 1;
      // If 202 (not ready), keep polling
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 202) {
        pollRef.current = setTimeout(() => poll(jid), POLL_INTERVAL_MS);
      } else {
        setState('failed');
        setError('Network error while checking analysis status.');
        stopPolling();
      }
    }
  }, [stopPolling]);

  const startJob = useCallback(async (
    oldImage: File,
    newImage: File,
    oldYear: number,
    newYear: number
  ) => {
    stopPolling();
    setState('uploading');
    setError(null);
    setResult(null);
    setJobStatus(null);
    attemptRef.current = 0;

    try {
      const { job_id } = await startAnalysis(oldImage, newImage, oldYear, newYear);
      setJobId(job_id);
      setState('processing');
      pollRef.current = setTimeout(() => poll(job_id), POLL_INTERVAL_MS);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to start analysis. Is the backend running?';
      setState('failed');
      setError(msg);
    }
  }, [poll, stopPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setState('idle');
    setJobStatus(null);
    setResult(null);
    setError(null);
    setJobId(null);
    attemptRef.current = 0;
  }, [stopPolling]);

  return { state, jobStatus, result, error, jobId, startJob, reset };
}
