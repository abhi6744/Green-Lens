import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Download, RefreshCw, TrendingDown, Grid3X3,
  Star, AlertTriangle, ZoomIn, Maximize2, Info, ChevronRight
} from 'lucide-react';
import Navbar from '../components/Navbar';
import LandCoverLegend from '../components/LandCoverLegend';
import { getResults, getReportUrl, getOutputImageUrl } from '../services/api';
import type { AnalysisResult } from '../types';
import { CLASS_COLORS } from '../types';

function KpiCard({ icon: Icon, iconBg, label, value, sub }: {
  icon: React.ElementType; iconBg: string; label: string; value: string; sub?: string;
}) {
  return (
    <div className="kpi-card">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-gray-900 leading-tight truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ImageCard({ title, src, alt }: { title: string; src: string; alt: string }) {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <>
      <div className="map-card">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
          <button
            onClick={() => setFullscreen(true)}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
            title="Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
        <div className="bg-gray-900 aspect-square flex items-center justify-center overflow-hidden">
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-contain"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      </div>

      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setFullscreen(false)}
        >
          <div className="relative max-w-5xl w-full max-h-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setFullscreen(false)}
              className="absolute top-2 right-2 p-2 bg-white/20 rounded-lg text-white hover:bg-white/30 z-10"
            >
              ✕
            </button>
            <p className="text-white text-sm font-medium mb-2">{title}</p>
            <img src={src} alt={alt} className="w-full rounded-xl object-contain max-h-[80vh]" />
          </div>
        </div>
      )}
    </>
  );
}

function ClassDistBar({ classDistOld, classDistNew, totalOld, totalNew }: {
  classDistOld: Record<string, number>;
  classDistNew: Record<string, number>;
  totalOld: number;
  totalNew: number;
}) {
  const allClasses = Array.from(new Set([...Object.keys(classDistOld), ...Object.keys(classDistNew)]));

  return (
    <div className="space-y-3">
      {allClasses.map(cls => {
        const oldPct = totalOld > 0 ? ((classDistOld[cls] || 0) / totalOld) * 100 : 0;
        const newPct = totalNew > 0 ? ((classDistNew[cls] || 0) / totalNew) * 100 : 0;
        return (
          <div key={cls}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: CLASS_COLORS[cls] }} />
                <span className="text-xs font-medium text-gray-700">{cls}</span>
              </div>
              <div className="text-xs text-gray-500 flex gap-4">
                <span>{classDistOld[cls] || 0} → {classDistNew[cls] || 0} patches</span>
              </div>
            </div>
            <div className="flex gap-1 h-2.5">
              <div className="flex-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${oldPct}%`, backgroundColor: CLASS_COLORS[cls] + 'cc' }}
                />
              </div>
              <div className="flex-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${newPct}%`, backgroundColor: CLASS_COLORS[cls] }}
                />
              </div>
            </div>
          </div>
        );
      })}
      <div className="flex gap-1 text-xs text-gray-400 mt-2">
        <div className="flex-1 text-center">Old year</div>
        <div className="flex-1 text-center">New year</div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    getResults(jobId)
      .then(setResult)
      .catch(() => setError('Could not load results. The job may have failed.'))
      .finally(() => setLoading(false));
  }, [jobId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-forest-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-600 text-sm">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="card p-8 text-center max-w-sm">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="font-bold text-gray-900 mb-2">Results Unavailable</h2>
          <p className="text-gray-600 text-sm mb-4">{error}</p>
          <button onClick={() => navigate('/')} className="btn-primary text-sm">
            Start New Analysis
          </button>
        </div>
      </div>
    );
  }

  const {
    old_year, new_year, region, deforested_patches, total_patches,
    deforestation_rate_pct,
    class_distribution_old, class_distribution_new, transition_counts,
    model_confidence_avg, maps, warnings, area_source,
    changed_patches,
  } = result;

  const regionDisplay = region && region !== 'unknown' ? region : 'Satellite Change Analysis';
  const reportUrl = getReportUrl(jobId!);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-4 flex items-center gap-1">
          <Link to="/" className="hover:text-forest-600">Home</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-700">Analysis Results</span>
        </nav>

        {/* Header row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analysis Results</h1>
            <p className="text-gray-500 text-sm mt-1">
              Comparison between <strong>{old_year}</strong> and <strong>{new_year}</strong>
              {regionDisplay !== 'Satellite Change Analysis' && ` · ${regionDisplay}`}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-3 flex-shrink-0">
            <a
              href={`/api/results/${jobId}/download-all`}
              download={`greenlens_results_${jobId}.zip`}
              className="btn-secondary text-sm flex items-center gap-2 py-2 px-4"
            >
              <Download className="w-4 h-4" />
              Download Images (ZIP)
            </a>
            <a
              href={reportUrl}
              download={`greenlens_report_${jobId}.json`}
              className="btn-secondary text-sm flex items-center gap-2 py-2 px-4"
            >
              <Download className="w-4 h-4" />
              Download Report
            </a>
            <button
              onClick={() => navigate('/')}
              className="btn-primary text-sm flex items-center gap-2 py-2 px-4"
            >
              <RefreshCw className="w-4 h-4" />
              Run New Analysis
            </button>
          </div>
        </div>

        {/* Warnings */}
        {warnings && warnings.length > 0 && (
          <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800 mb-1">Warnings</p>
                {warnings.map((w, i) => (
                  <p key={i} className="text-sm text-amber-700">{w}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* KPI Row - 3 cards centered */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 max-w-3xl mx-auto w-full">
          <KpiCard
            icon={TrendingDown}
            iconBg="bg-red-100 text-red-700"
            label="Deforestation Rate"
            value={`${deforestation_rate_pct.toFixed(1)}%`}
            sub="of old forest patches"
          />
          <KpiCard
            icon={Grid3X3}
            iconBg="bg-blue-100 text-blue-700"
            label="Changed Patches"
            value={`${changed_patches} / ${total_patches}`}
            sub="Patch-level land-cover changes"
          />
          <KpiCard
            icon={Star}
            iconBg="bg-amber-100 text-amber-700"
            label="Model Confidence"
            value={`${(model_confidence_avg * 100).toFixed(1)}%`}
            sub="Average patch confidence"
          />
        </div>

        {/* 3-image comparison */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title">Satellite Image Comparison</h2>
            <Link
              to={`/results/${jobId}/patches`}
              className="text-sm text-forest-600 hover:text-forest-700 font-medium flex items-center gap-1"
            >
              View patch comparison <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <ImageCard
              title={`Satellite Image - ${old_year}`}
              src={getOutputImageUrl(maps.old_satellite)}
              alt={`Satellite ${old_year}`}
            />
            <ImageCard
              title={`Satellite Image - ${new_year}`}
              src={getOutputImageUrl(maps.new_satellite)}
              alt={`Satellite ${new_year}`}
            />
            <ImageCard
              title="Detected Change (Deforestation)"
              src={getOutputImageUrl(maps.deforestation)}
              alt="Deforestation map"
            />
          </div>

          {/* Change legend */}
          <div className="card p-4">
            <LandCoverLegend showDeforestation compact />
          </div>
        </div>

        {/* Land Cover Comparison */}
        <div className="mb-8">
          <h2 className="section-title">Land Cover Comparison</h2>
          <p className="section-subtitle">Each cell represents a 64×64 patch classified by the model.</p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2 grid sm:grid-cols-2 gap-4">
              <ImageCard
                title={`Land Cover Map - ${old_year}`}
                src={getOutputImageUrl(maps.old_land_cover)}
                alt={`Land cover ${old_year}`}
              />
              <ImageCard
                title={`Land Cover Map - ${new_year}`}
                src={getOutputImageUrl(maps.new_land_cover)}
                alt={`Land cover ${new_year}`}
              />
            </div>
            <div className="card p-4">
              <LandCoverLegend />
            </div>
          </div>
        </div>

        {/* Statistics & Transitions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Class distribution */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Class Distribution</h3>
            <ClassDistBar
              classDistOld={class_distribution_old}
              classDistNew={class_distribution_new}
              totalOld={total_patches}
              totalNew={total_patches}
            />
          </div>

          {/* Transition table */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Transition Summary</h3>
            <p className="text-xs text-gray-500 mb-3">Forest-to-non-forest transitions detected</p>
            <div className="space-y-2">
              {Object.entries(transition_counts)
                .filter(([key]) => key !== 'TotalChanged')
                .map(([key, count]) => (
                  <div key={key} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                    <span className="text-sm text-gray-700">{key}</span>
                    <span className="text-sm font-semibold text-gray-900">{count}</span>
                  </div>
                ))}
              <div className="flex items-center justify-between py-1.5 font-semibold">
                <span className="text-sm text-gray-900">Total Changed Patches</span>
                <span className="text-sm text-forest-700">{changed_patches || deforested_patches}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Note: Only forest to non-forest transitions are considered deforestation.
            </p>
          </div>
        </div>

        {/* Patch comparison link */}
        <div className="card p-6 flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-forest-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Grid3X3 className="w-5 h-5 text-forest-700" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Patch-level Comparison</h3>
              <p className="text-sm text-gray-500">
                Explore individual patches, click to see class labels and confidence scores.
              </p>
            </div>
          </div>
          <Link
            to={`/results/${jobId}/patches`}
            className="btn-primary text-sm flex items-center gap-2 py-2 px-4 flex-shrink-0"
          >
            <ZoomIn className="w-4 h-4" />
            View Patches
          </Link>
        </div>

        {/* Area note */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            Area calculated using: <strong>{area_source}</strong>.
            PATCH_SIZE=64px, resolution={result.metadata_old?.pixel_size_m || '10'} m/pixel.
          </p>
        </div>
      </div>
    </div>
  );
}
