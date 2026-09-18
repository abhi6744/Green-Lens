import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Leaf, ArrowRight, Shield, Activity, TreePine,
  Globe2, BarChart3, Satellite, Layers, Lock, ChevronDown
} from 'lucide-react';
import Navbar from '../components/Navbar';
import UploadCard from '../components/UploadCard';
import { startAnalysis } from '../services/api';
import type { ImageUpload } from '../types';

const DEFAULT_UPLOAD: ImageUpload = { file: null, year: '', preview: null, error: null };

export default function HomePage() {
  const navigate = useNavigate();
  const [oldImg, setOldImg] = useState<ImageUpload>(DEFAULT_UPLOAD);
  const [newImg, setNewImg] = useState<ImageUpload>(DEFAULT_UPLOAD);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isValid =
    oldImg.file !== null &&
    newImg.file !== null &&
    oldImg.year.trim() !== '' &&
    newImg.year.trim() !== '' &&
    !isNaN(Number(oldImg.year)) &&
    !isNaN(Number(newImg.year)) &&
    Number(oldImg.year) !== Number(newImg.year) &&
    Number(oldImg.year) < Number(newImg.year) &&
    oldImg.error === null &&
    newImg.error === null;

  const handleSubmit = useCallback(async () => {
    if (!isValid) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { job_id } = await startAnalysis(
        oldImg.file!,
        newImg.file!,
        Number(oldImg.year),
        Number(newImg.year)
      );
      navigate(`/processing/${job_id}`, {
        state: {
          oldYear: oldImg.year,
          newYear: newImg.year,
          oldFilename: oldImg.file!.name,
          newFilename: newImg.file!.name,
          jobId: job_id,
        }
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to connect to the analysis server. Please make sure the backend is running on http://localhost:8000';
      setSubmitError(msg);
      setSubmitting(false);
    }
  }, [isValid, oldImg, newImg, navigate]);

  const getYearError = () => {
    const o = Number(oldImg.year);
    const n = Number(newImg.year);
    if (oldImg.year && newImg.year && o === n) return 'Old and new years must be different.';
    if (oldImg.year && newImg.year && o > n) return 'The old year must be earlier than the new year.';
    return null;
  };

  const yearError = getYearError();

  return (
    <div className="min-h-screen">
      <Navbar transparent />

      {/* ─── HERO ─── */}
      <section
        className="relative min-h-screen flex items-center pt-16 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0c1f0d 0%, #193a1b 40%, #255828 100%)',
        }}
      >
        {/* Background texture */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Hero copy */}
            <div>
              <p className="text-forest-300 text-sm font-semibold tracking-widest uppercase mb-4">
                Monitor · Analyze · Preserve
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                A Greener Tomorrow with{' '}
                <span className="text-forest-300">Smarter Insights</span>
              </h1>
              <p className="text-forest-100 text-lg mb-8 leading-relaxed max-w-xl">
                Upload satellite images from different time periods to detect land cover changes,
                identify deforestation areas, and understand environmental impact using AI.
              </p>

              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { icon: Activity, label: 'AI-powered', sub: 'analysis' },
                  { icon: BarChart3, label: 'Data-Driven', sub: 'decisions' },
                  { icon: Globe2, label: 'A Sustainable', sub: 'future' },
                ].map(({ icon: Icon, label, sub }) => (
                  <div key={label} className="text-center">
                    <div className="w-12 h-12 rounded-full border-2 border-forest-400 flex items-center justify-center mx-auto mb-2">
                      <Icon className="w-5 h-5 text-forest-300" />
                    </div>
                    <p className="text-white text-xs font-semibold">{label}</p>
                    <p className="text-forest-400 text-xs">{sub}</p>
                  </div>
                ))}
              </div>

              <p className="text-forest-200 italic text-sm">
                "Data today. Forests tomorrow."
              </p>
            </div>

            {/* Right: Upload Panel */}
            <div id="upload-section">
              <div className="bg-white rounded-2xl shadow-2xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 bg-forest-100 rounded-lg flex items-center justify-center">
                    <Satellite className="w-5 h-5 text-forest-700" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900 text-lg">Analyze Land Cover Change</h2>
                    <p className="text-gray-500 text-xs">Upload two satellite images from different time periods</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mb-4 mt-4">
                  <UploadCard
                    label="Old Image"
                    sublabel="Earlier Year"
                    badge="1"
                    value={oldImg}
                    onChange={setOldImg}
                    disabled={submitting}
                  />
                  <UploadCard
                    label="New Image"
                    sublabel="Later Year"
                    badge="2"
                    value={newImg}
                    onChange={setNewImg}
                    disabled={submitting}
                  />
                </div>

                {yearError && (
                  <p className="text-red-500 text-xs mb-3 flex items-center gap-1">
                    <span>⚠</span> {yearError}
                  </p>
                )}

                {submitError && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                    {submitError}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={!isValid || submitting}
                  className="w-full btn-primary flex items-center justify-center gap-2 text-base py-3.5"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Starting analysis...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-5 h-5" />
                      Analyze Change
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-gray-400">
                  <Lock className="w-3 h-3" />
                  <span>Your images are processed securely and are not stored permanently.</span>
                </div>

                <div className="mt-3 p-3 bg-forest-50 rounded-lg border border-forest-100">
                  <p className="text-xs text-forest-700">
                    <strong>Preprocessing is automatic.</strong> Your image is standardized for the 
                    trained model before analysis — no manual conversion needed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50 text-xs text-center">
          <p className="uppercase tracking-widest mb-2">Scroll to explore</p>
          <ChevronDown className="w-5 h-5 mx-auto animate-bounce" />
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-forest-600 text-sm font-semibold tracking-widest uppercase mb-3">How It Works</p>
            <h2 className="text-3xl font-bold text-gray-900">
              From Satellite Images to Real Environmental Impact
            </h2>
            <p className="text-gray-500 mt-3 max-w-2xl mx-auto">
              A simple process to detect change, understand impact, and support a more sustainable future.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 mb-12">
            {[
              {
                icon: Satellite,
                title: 'AI-powered land-cover analysis',
                desc: 'Our deep learning model classifies land cover types from satellite images with high accuracy.',
              },
              {
                icon: Layers,
                title: 'Satellite image comparison',
                desc: 'Compare images from different time periods to detect changes such as deforestation and urbanization.',
              },
              {
                icon: BarChart3,
                title: 'Actionable environmental insights',
                desc: 'Get clear visualizations and metrics to support research, policy decisions, and conservation efforts.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card p-6">
                <div className="w-12 h-12 rounded-xl bg-forest-100 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-forest-700" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Pipeline steps */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4 text-center">The Analysis Pipeline</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {[
                { n: '01', label: 'Upload', desc: 'Upload two satellite images with years' },
                { n: '02', label: 'Preprocess', desc: 'Percentile stretch + per-channel CLAHE' },
                { n: '03', label: 'Patch', desc: 'Split into 64×64 pixel patches' },
                { n: '04', label: 'Infer', desc: 'ResNet50 classifies each patch' },
                { n: '05', label: 'Detect', desc: 'Compare maps to detect deforestation' },
              ].map(({ n, label, desc }) => (
                <div key={n} className="text-center">
                  <div className="w-10 h-10 rounded-full bg-forest-700 text-white text-sm font-bold flex items-center justify-center mx-auto mb-2">
                    {n}
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">{label}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── ABOUT ─── */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-forest-600 text-sm font-semibold tracking-widest uppercase mb-3">About GreenLens</p>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Powered by Deep Learning. Driven by Purpose.
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                GreenLens uses a ResNet50 model trained on the EuroSAT dataset to classify land cover 
                types from satellite imagery. By comparing classifications between two time periods, 
                it identifies regions where forest has been converted to other land uses — a critical 
                signal for deforestation monitoring.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Model', value: 'ResNet50' },
                  { label: 'Patch size', value: '64 × 64 px' },
                  { label: 'Classes', value: '10 land types' },
                  { label: 'Resolution', value: '10 m/pixel' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <p className="font-semibold text-gray-900">{value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              {[
                { icon: Shield, title: 'Privacy First', desc: 'Images are processed and not permanently stored.' },
                { icon: TreePine, title: 'Forest-Focused', desc: 'Optimized to detect Forest → Non-forest transitions.' },
                { icon: Activity, title: 'Real-time Analysis', desc: 'Background processing with live progress updates.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4 p-4 rounded-xl border border-gray-100">
                  <div className="w-10 h-10 rounded-lg bg-forest-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-forest-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                    <p className="text-sm text-gray-600">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── IMPACT ─── */}
      <section id="impact" className="py-20 bg-forest-950 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-forest-300 text-sm font-semibold tracking-widest uppercase mb-4">Impact</p>
          <h2 className="text-3xl font-bold mb-4">
            Supporting Forest Conservation with AI
          </h2>
          <p className="text-forest-200 max-w-2xl mx-auto mb-12">
            Forests are not just trees — they are our shared tomorrow. 
            GreenLens provides the tools to monitor, quantify, and communicate 
            deforestation at scale.
          </p>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { stat: '10 m', label: 'Spatial resolution', desc: 'Sentinel-2 compatible' },
              { stat: '64 px', label: 'Patch granularity', desc: '0.41 km² per patch' },
              { stat: '10', label: 'Land cover classes', desc: 'EuroSAT taxonomy' },
            ].map(({ stat, label, desc }) => (
              <div key={label} className="p-6 rounded-2xl border border-forest-800">
                <p className="text-4xl font-bold text-forest-300 mb-2">{stat}</p>
                <p className="font-semibold text-white mb-1">{label}</p>
                <p className="text-forest-400 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-10 bg-forest-950 border-t border-forest-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-forest-600 rounded-full flex items-center justify-center">
                <Leaf className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white">GreenLens</span>
            </div>
            <p className="text-forest-400 text-sm">
              Satellite insights for a greener planet. Built with ResNet50 + EuroSAT.
            </p>
            <p className="text-forest-500 text-xs">
              © 2024 GreenLens
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
