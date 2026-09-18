import { CheckCircle, Circle, Loader } from 'lucide-react';

interface ProcessingStep {
  id: string;
  label: string;
  detail: string;
}

const STEPS: ProcessingStep[] = [
  { id: 'validating', label: 'Validating input images', detail: 'Checking file format, size and metadata...' },
  { id: 'reading', label: 'Reading image data', detail: 'Extracting RGB bands...' },
  { id: 'enhancing', label: 'Applying image enhancement', detail: 'Performing contrast stretch and CLAHE...' },
  { id: 'patching', label: 'Creating 64 × 64 patches', detail: 'Splitting images into patches...' },
  { id: 'inferring', label: 'Running model inference', detail: 'Classifying land cover using ResNet50...' },
  { id: 'comparing', label: 'Comparing land-cover maps', detail: 'Detecting changes between years...' },
  { id: 'generating', label: 'Generating results', detail: 'Finalizing maps and statistics...' },
];

interface ProcessingStepsProps {
  currentStage: string | null;
  progress: number;
}

function getStepStatus(stepId: string, currentStage: string | null): 'completed' | 'active' | 'pending' {
  const stageIndex = STEPS.findIndex(s => s.id === currentStage);
  const stepIndex = STEPS.findIndex(s => s.id === stepId);
  
  if (stageIndex === -1) return 'pending';
  if (stepIndex < stageIndex) return 'completed';
  if (stepIndex === stageIndex) return 'active';
  return 'pending';
}

export default function ProcessingSteps({ currentStage, progress }: ProcessingStepsProps) {
  const currentStep = STEPS.find(s => s.id === currentStage);

  return (
    <div className="space-y-3">
      {STEPS.map((step) => {
        const status = getStepStatus(step.id, currentStage);
        return (
          <div key={step.id} className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {status === 'completed' ? (
                <CheckCircle className="w-5 h-5 text-forest-500" />
              ) : status === 'active' ? (
                <Loader className="w-5 h-5 text-forest-600 animate-spin" />
              ) : (
                <Circle className="w-5 h-5 text-gray-300" />
              )}
            </div>
            <div>
              <p className={`text-sm font-medium ${
                status === 'completed' ? 'text-forest-700 line-through opacity-60' :
                status === 'active' ? 'text-gray-900' :
                'text-gray-400'
              }`}>
                {step.label}
              </p>
              {status === 'active' && (
                <p className="text-xs text-gray-500 mt-0.5">{step.detail}</p>
              )}
            </div>
          </div>
        );
      })}

      {/* Progress bar */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-600">
            {currentStep ? currentStep.label : 'Processing...'}
          </p>
          <span className="text-sm font-semibold text-forest-700">{progress}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-forest-600 to-forest-400 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
