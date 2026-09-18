import { CLASS_COLORS, CLASS_NAMES } from '../types';

interface LandCoverLegendProps {
  compact?: boolean;
  showDeforestation?: boolean;
}

export default function LandCoverLegend({ compact = false, showDeforestation = false }: LandCoverLegendProps) {
  return (
    <div>
      {showDeforestation && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="text-xs font-semibold text-red-700 mb-2 uppercase tracking-wide">Change Map Legend</h4>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-4 h-4 rounded-sm bg-red-500 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-red-800">Deforestation</p>
              <p className="text-xs text-red-600">Forest → Non-Forest</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm bg-gray-300 flex-shrink-0" />
            <p className="text-xs text-gray-600">No Change</p>
          </div>
          <p className="text-xs text-red-600 mt-2 leading-relaxed">
            Red areas indicate regions classified as Forest in the old image and classified 
            as a target non-forest land-cover class in the new image.
          </p>
        </div>
      )}

      <div>
        <h4 className={`font-semibold text-gray-700 mb-2 uppercase tracking-wide ${compact ? 'text-xs' : 'text-xs'}`}>
          Land Cover Classes
        </h4>
        <div className={`grid ${compact ? 'grid-cols-2 gap-1' : 'grid-cols-1 gap-1.5'}`}>
          {CLASS_NAMES.map((name) => (
            <div key={name} className="flex items-center gap-2">
              <div
                className={`rounded-sm flex-shrink-0 ${compact ? 'w-3 h-3' : 'w-4 h-4'}`}
                style={{ backgroundColor: CLASS_COLORS[name] }}
              />
              <span className={`text-gray-700 truncate ${compact ? 'text-xs' : 'text-xs'}`}>{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
