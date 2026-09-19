import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Settings, FileImage, Lightbulb } from 'lucide-react';
import Navbar from '../components/Navbar';
import ProcessingSteps from '../components/ProcessingSteps';
import { getJobStatus } from '../services/api';

interface LocationState {
  oldYear?: string;
  newYear?: string;
  oldFilename?: string;
  newFilename?: string;
}

export default function ProcessingPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  const [pollingStatus, setPollingStatus] = useState<{
    status: string;
    stage: string | null;
    stage_label: string | null;
    progress: number;
    error: string | null;
  }>({
    status: 'queued',
    stage: null,
    stage_label: 'Starting...',
    progress: 0,
    error: null,
  });

  useEffect(() => {
    if (!jobId) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const MAX_ATTEMPTS = 300;
    let cancelled = false;

    const poll = async () => {
      if (cancelled || attempts >= MAX_ATTEMPTS) {
        if (!cancelled) {
          setPollingStatus(prev => ({ ...prev, status: 'failed', error: 'Analysis timed out.' }));
        }
        return;
      }

      try {
        const data = await getJobStatus(jobId);
        attempts++;

        if (cancelled) return;

        setPollingStatus({
          status: data.status,
          stage: data.stage,
          stage_label: data.stage_label,
          progress: data.progress || 0,
          error: data.error,
        });

        if (data.status === 'completed') {
          navigate(`/results/${jobId}`, { replace: true });
        } else if (data.status === 'failed') {
          // Stay on page, error shown
        } else {
          timeoutId = setTimeout(poll, 1500);
        }
      } catch {
        if (cancelled) return;
        attempts++;
        timeoutId = setTimeout(poll, 2000);
      }
    };

    // Start polling
    timeoutId = setTimeout(poll, 800);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [jobId, navigate]);

  const oldYear = state?.oldYear || '-';
  const newYear = state?.newYear || '-';
  const oldFilename = state?.oldFilename || 'old_image';
  const newFilename = state?.newFilename || 'new_image';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <span>Home</span>
          <span className="mx-2">›</span>
          <span className="text-gray-700">Processing</span>
        </nav>

        <div className="card p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-forest-100 rounded-xl flex items-center justify-center">
              <Settings
                className="w-6 h-6 text-forest-700"
                style={{
                  animation: 'spin 3s linear infinite',
                }}
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Processing Your Images</h1>
              <p className="text-gray-500 text-sm">
                Please wait while we analyse the satellite images. This may take a few minutes.
              </p>
            </div>
          </div>

          <div className="mt-8 grid md:grid-cols-3 gap-8">
            {/* Image previews */}
            <div className="md:col-span-2 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Old image card */}
                <div className="border border-gray-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-600 mb-2">
                    Old Image {oldYear !== '-' ? `(${oldYear})` : ''}
                  </p>
                  <div className="h-32 bg-forest-900 rounded-lg flex items-center justify-center mb-3">
                    <FileImage className="w-10 h-10 text-forest-300" />
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-700 truncate font-medium">{oldFilename}</p>
                    {pollingStatus.progress > 15 && (
                      <span className="text-forest-500 flex-shrink-0">✓</span>
                    )}
                  </div>
                </div>

                {/* New image card */}
                <div className="border border-gray-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-600 mb-2">
                    New Image {newYear !== '-' ? `(${newYear})` : ''}
                  </p>
                  <div className="h-32 bg-forest-900 rounded-lg flex items-center justify-center mb-3">
                    <FileImage className="w-10 h-10 text-forest-300" />
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-700 truncate font-medium">{newFilename}</p>
                    {pollingStatus.progress > 15 && (
                      <span className="text-forest-500 flex-shrink-0">✓</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Error state */}
              {pollingStatus.status === 'failed' && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm font-semibold text-red-700 mb-1">Analysis Failed</p>
                  <p className="text-sm text-red-600">{pollingStatus.error || 'An unexpected error occurred.'}</p>
                  <button
                    onClick={() => navigate('/')}
                    className="mt-3 text-sm text-red-700 font-medium hover:underline"
                  >
                    ← Try again with different images
                  </button>
                </div>
              )}
            </div>

            {/* Processing steps */}
            <div>
              <ProcessingSteps
                currentStage={pollingStatus.stage}
                progress={pollingStatus.progress}
              />
            </div>
          </div>

          {/* Did you know */}
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Did you know?</p>
              <p className="text-sm text-amber-700">
                The model analyzes each 64×64 pixel patch independently, classifying it into one of 10 
                land cover types (Forest, Pasture, Residential, etc.) using ResNet50.
                Comparing the old and new patch classifications reveals where deforestation has occurred.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
