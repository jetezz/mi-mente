/**
 * Stepper Component
 * Indicador de pasos para flujos multi-paso
 */

interface Step {
  id: string;
  label: string;
  icon?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: string;
  completedSteps?: string[];
  onStepClick?: (stepId: string) => void;
}

export function Stepper({ steps, currentStep, completedSteps = [], onStepClick }: StepperProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(step.id);
        const isCurrent = step.id === currentStep;
        const isPast = index < currentIndex;
        const isClickable = onStepClick && (isCompleted || isPast);

        return (
          <div key={step.id} className="flex items-center">
            {/* Step indicator */}
            <button
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all
                ${isCurrent
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  : isCompleted || isPast
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-dark-700/50 text-dark-500 border border-dark-600/30'
                }
                ${isClickable ? 'cursor-pointer hover:bg-dark-700' : 'cursor-default'}
              `}
            >
              <span className="text-sm">
                {isCompleted ? '✓' : step.icon || index + 1}
              </span>
              <span className="text-sm font-medium hidden sm:block">{step.label}</span>
            </button>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={`
                  w-8 h-0.5 mx-1
                  ${isPast || isCompleted ? 'bg-green-500/50' : 'bg-dark-700'}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Variante vertical
export function VerticalStepper({ steps, currentStep, completedSteps = [] }: StepperProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="flex flex-col">
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(step.id);
        const isCurrent = step.id === currentStep;
        const isPast = index < currentIndex;

        return (
          <div key={step.id} className="flex items-start">
            {/* Step indicator column */}
            <div className="flex flex-col items-center mr-4">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  ${isCurrent
                    ? 'bg-primary-500 text-white'
                    : isCompleted || isPast
                      ? 'bg-green-500 text-white'
                      : 'bg-dark-700 text-dark-400'
                  }
                `}
              >
                {isCompleted ? '✓' : index + 1}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`
                    w-0.5 h-8 my-1
                    ${isPast || isCompleted ? 'bg-green-500/50' : 'bg-dark-700'}
                  `}
                />
              )}
            </div>

            {/* Step content */}
            <div className={`pb-8 ${isCurrent ? 'text-dark-100' : 'text-dark-400'}`}>
              <p className="font-medium">{step.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
