import { useCallback, useRef, useState } from 'react';
import { Upload, X, Calendar, FileImage, AlertCircle, CheckCircle } from 'lucide-react';
import type { ImageUpload } from '../types';

interface UploadCardProps {
  label: string;
  sublabel: string;
  badge: string;
  value: ImageUpload;
  onChange: (value: ImageUpload) => void;
  disabled?: boolean;
}

const ALLOWED_EXTENSIONS = ['.tif', '.tiff', '.geotiff', '.png', '.jpg', '.jpeg'];
const MAX_SIZE_MB = 500;

function validateFile(file: File): string | null {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `Unsupported format. Please upload GeoTIFF, TIFF, PNG, or JPG.`;
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return `File too large. Maximum size is ${MAX_SIZE_MB} MB.`;
  }
  return null;
}

export default function UploadCard({ label, sublabel, badge, value, onChange, disabled }: UploadCardProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const err = validateFile(file);
    if (err) {
      onChange({ ...value, file: null, preview: null, error: err });
      return;
    }

    // Create preview for images
    const reader = new FileReader();
    reader.onload = (e) => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      const isTiff = ['.tif', '.tiff', '.geotiff'].includes(ext);
      onChange({
        ...value,
        file,
        preview: isTiff ? null : (e.target?.result as string),
        error: null,
      });
    };
    reader.readAsDataURL(file);
  }, [value, onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleRemove = () => {
    onChange({ file: null, year: value.year, preview: null, error: null });
    if (inputRef.current) inputRef.current.value = '';
  };

  const formatSize = (bytes: number) => {
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const isValid = value.file !== null && value.error === null && value.year.trim() !== '';
  const hasFile = value.file !== null;

  return (
    <div className={`card p-5 flex-1 min-w-0 transition-all duration-200 ${
      disabled ? 'opacity-60 pointer-events-none' : ''
    } ${isValid ? 'ring-2 ring-forest-500/30' : ''}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="w-7 h-7 rounded-full bg-forest-700 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
          {badge}
        </span>
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">{label}</h3>
          <p className="text-xs text-gray-500">{sublabel}</p>
        </div>
        {isValid && <CheckCircle className="w-4 h-4 text-forest-500 ml-auto flex-shrink-0" />}
      </div>

      {/* Year Input */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          <Calendar className="w-3 h-3 inline mr-1" />
          Year
        </label>
        <input
          type="number"
          value={value.year}
          onChange={(e) => onChange({ ...value, year: e.target.value })}
          placeholder="e.g. 2018"
          min="1970"
          max="2100"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
        />
      </div>

      {/* Drop Zone */}
      {!hasFile ? (
        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200
            ${dragging ? 'border-forest-500 bg-forest-50' : 'border-gray-200 hover:border-forest-400 hover:bg-gray-50'}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label={`Upload ${label}`}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        >
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700">
            Drag and drop your image here
          </p>
          <p className="text-xs text-gray-500 mt-1">
            or <span className="text-forest-600 font-medium">click to browse</span>
          </p>
          <p className="text-xs text-gray-400 mt-3">
            Supported: GeoTIFF, TIFF, PNG, JPG
            <br />
            Max size: {MAX_SIZE_MB} MB
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".tif,.tiff,.geotiff,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>
      ) : (
        /* File selected state */
        <div className="border border-gray-200 rounded-xl p-3">
          <div className="flex items-start gap-3">
            {value.preview ? (
              <img
                src={value.preview}
                alt="Preview"
                className="w-14 h-14 rounded-lg object-cover border border-gray-200 flex-shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-forest-100 flex items-center justify-center flex-shrink-0">
                <FileImage className="w-7 h-7 text-forest-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{value.file!.name}</p>
              <p className="text-xs text-gray-500">{formatSize(value.file!.size)}</p>
              <p className="text-xs text-gray-400">
                {value.file!.name.split('.').pop()?.toUpperCase()}
              </p>
            </div>
            <button
              onClick={handleRemove}
              className="p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
              aria-label="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Replace button */}
          <button
            onClick={() => inputRef.current?.click()}
            className="mt-2 text-xs text-forest-600 hover:text-forest-700 font-medium"
          >
            Replace file
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".tif,.tiff,.geotiff,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>
      )}

      {/* Error */}
      {value.error && (
        <div className="mt-2 flex items-start gap-2 text-red-600 bg-red-50 rounded-lg p-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p className="text-xs">{value.error}</p>
        </div>
      )}
    </div>
  );
}
