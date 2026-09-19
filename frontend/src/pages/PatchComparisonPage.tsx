import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Grid3X3, AlertTriangle } from 'lucide-react';
import Navbar from '../components/Navbar';
import LandCoverLegend from '../components/LandCoverLegend';
import { getResults, getOutputImageUrl } from '../services/api';
import type { AnalysisResult, PatchResult } from '../types';
import { CLASS_COLORS } from '../types';

interface PatchDetailProps {
  patch: PatchResult | null;
}

function PatchDetail({ patch }: PatchDetailProps) {
  if (!patch) {
    return (
      <div className="card p-5 text-center text-gray-400">
        <Grid3X3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Click a patch to view details</p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Patch {patch.id}</h3>
        {patch.deforestation && (
          <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            Deforestation
          </span>
        )}
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <p className="text-xs text-gray-500 mb-1">Location (row, col)</p>
          <p className="font-medium text-gray-900">({patch.row}, {patch.col})</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl border border-gray-100 min-w-0">
            <p className="text-xs text-gray-500 mb-1">Old Class</p>
            <div className="flex items-start gap-1.5 min-w-0">
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0 mt-0.5"
                style={{ backgroundColor: CLASS_COLORS[patch.old_class] }}
              />
              <p className="font-semibold text-gray-900 text-xs leading-tight break-words min-w-0">{patch.old_class}</p>
            </div>
            <p className="text-xs text-gray-400 mt-1">Conf: {(patch.old_confidence * 100).toFixed(1)}%</p>
          </div>

          <div className="p-3 rounded-xl border border-gray-100 min-w-0">
            <p className="text-xs text-gray-500 mb-1">New Class</p>
            <div className="flex items-start gap-1.5 min-w-0">
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0 mt-0.5"
                style={{ backgroundColor: CLASS_COLORS[patch.new_class] }}
              />
              <p className="font-semibold text-gray-900 text-xs leading-tight break-words min-w-0">{patch.new_class}</p>
            </div>
            <p className="text-xs text-gray-400 mt-1">Conf: {(patch.new_confidence * 100).toFixed(1)}%</p>
          </div>
        </div>

        <div className="pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Detected Change</p>
          {patch.deforestation ? (
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-red-700 font-semibold">Deforestation</span>
            </div>
          ) : patch.old_class !== patch.new_class ? (
            <p className="text-blue-700 font-medium">Land cover changed</p>
          ) : (
            <p className="text-green-700 font-medium">No change</p>
          )}
        </div>

        {patch.thumbnail_old && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Patch Preview (old)</p>
            <img
              src={patch.thumbnail_old}
              alt="Patch thumbnail"
              className="w-full rounded-lg border border-gray-200"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function PatchComparisonPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPatch, setSelectedPatch] = useState<PatchResult | null>(null);
  const [thumbPage, setThumbPage] = useState(0);
  const THUMB_PER_PAGE = 10;

  useEffect(() => {
    if (!jobId) return;
    getResults(jobId)
      .then(data => {
        setResult(data);
        // Select first deforestation patch by default
        const defPatch = data.patches.find(p => p.deforestation);
        if (defPatch) setSelectedPatch(defPatch);
        else if (data.patches.length > 0) setSelectedPatch(data.patches[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [jobId]);

  if (loading || !result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-forest-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { patches, maps, old_year, new_year } = result;
  const totalPages = Math.ceil(patches.length / THUMB_PER_PAGE);
  const visiblePatches = patches.slice(thumbPage * THUMB_PER_PAGE, (thumbPage + 1) * THUMB_PER_PAGE);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-4 flex items-center gap-1">
          <Link to="/" className="hover:text-forest-600">Home</Link>
          <ChevronRight className="w-4 h-4" />
          <Link to={`/results/${jobId}`} className="hover:text-forest-600">Analysis Results</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-700">Patch Comparison</span>
        </nav>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Patch-level Comparison</h1>
            <p className="text-gray-500 text-sm">
              Explore how individual patches changed between {old_year} and {new_year}.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs bg-red-50 text-red-700 px-3 py-1.5 rounded-full border border-red-200">
            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
            Red patches = detected deforestation
          </div>
        </div>

        {/* Maps row */}
        <div className="grid lg:grid-cols-4 gap-4 mb-6">
          <div className="lg:col-span-3 grid sm:grid-cols-3 gap-4">
            {/* Old map */}
            <div className="map-card">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-700">Land Cover Map — {old_year}</p>
              </div>
              <div className="bg-gray-900 aspect-square">
                <img
                  src={getOutputImageUrl(maps.old_land_cover)}
                  alt={`Land cover ${old_year}`}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            {/* New map */}
            <div className="map-card">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-700">Land Cover Map — {new_year}</p>
              </div>
              <div className="bg-gray-900 aspect-square">
                <img
                  src={getOutputImageUrl(maps.new_land_cover)}
                  alt={`Land cover ${new_year}`}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            {/* Deforestation map */}
            <div className="map-card">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-700">Detected Change (Deforestation)</p>
              </div>
              <div className="bg-gray-900 aspect-square">
                <img
                  src={getOutputImageUrl(maps.deforestation)}
                  alt="Deforestation"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>

          {/* Patch detail */}
          <div>
            <PatchDetail patch={selectedPatch} />
            <div className="mt-4 card p-4">
              <LandCoverLegend compact showDeforestation />
            </div>
          </div>
        </div>

        {/* Thumbnail strip */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 text-sm">
              Patch Thumbnails — click to view details
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <button
                onClick={() => setThumbPage(p => Math.max(0, p - 1))}
                disabled={thumbPage === 0}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>{thumbPage + 1} / {Math.max(1, totalPages)}</span>
              <button
                onClick={() => setThumbPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={thumbPage >= totalPages - 1}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-forest">
            {visiblePatches.map((patch) => (
              <button
                key={patch.id}
                onClick={() => setSelectedPatch(patch)}
                className={`flex-shrink-0 w-20 rounded-xl overflow-hidden border-2 transition-all ${
                  selectedPatch?.id === patch.id
                    ? 'border-forest-500 shadow-md scale-105'
                    : 'border-transparent hover:border-gray-300'
                } ${patch.deforestation ? 'ring-2 ring-red-400/50' : ''}`}
                title={`${patch.id}: ${patch.old_class} → ${patch.new_class}`}
              >
                <div className="relative">
                  {patch.thumbnail_old ? (
                    <img
                      src={patch.thumbnail_old}
                      alt={`Patch ${patch.id}`}
                      className="w-full h-16 object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-16 flex items-center justify-center"
                      style={{ backgroundColor: CLASS_COLORS[patch.old_class] + '33' }}
                    >
                      <div
                        className="w-4 h-4 rounded-sm"
                        style={{ backgroundColor: CLASS_COLORS[patch.old_class] }}
                      />
                    </div>
                  )}
                  {patch.deforestation && (
                    <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-bl" />
                  )}
                </div>
                <div
                  className="py-1 px-1 text-center"
                  style={{
                    backgroundColor: CLASS_COLORS[patch.new_class] + '22',
                    borderTop: `2px solid ${CLASS_COLORS[patch.new_class]}`
                  }}
                >
                  <p className="text-xs font-medium truncate" style={{ color: CLASS_COLORS[patch.new_class] }}>
                    {patch.new_class.slice(0, 6)}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <p className="text-xs text-red-600 mt-3 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
            Red indicator = patches classified as Forest in {old_year} and converted to 
            non-forest land cover in {new_year}.
          </p>
        </div>
      </div>
    </div>
  );
}
