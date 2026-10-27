import { Check, AlertCircle } from 'lucide-react'

export type StepState = 'upcoming' | 'active' | 'done' | 'error'

export interface WizardStep {
  number: number
  label: string
  state: StepState
}

interface WizardStepperProps {
  steps: WizardStep[]
  currentStep: number
  onStepClick?: (step: number) => void
}

const stepColors: Record<StepState, { bg: string; border: string; text: string }> = {
  done:     { bg: 'var(--success)',  border: 'var(--success)',  text: '#fff' },
  active:   { bg: 'var(--accent)',   border: 'var(--accent)',   text: '#fff' },
  error:    { bg: 'var(--danger)',   border: 'var(--danger)',   text: '#fff' },
  upcoming: { bg: 'transparent',     border: 'var(--border)',   text: 'var(--muted)' },
}

export function WizardStepper({ steps, currentStep, onStepClick }: WizardStepperProps) {
  return (
    <>
      {/* Desktop stepper */}
      <nav aria-label="Wizard steps" className="hidden sm:flex items-center gap-0">
        {steps.map((step, i) => {
          const colors = stepColors[step.state]
          const isClickable = step.state === 'done' && onStepClick
          return (
            <div key={step.number} className="flex items-center">
              <button
                onClick={() => isClickable && onStepClick(step.number)}
                disabled={!isClickable}
                aria-current={step.state === 'active' ? 'step' : undefined}
                aria-label={`Step ${step.number}: ${step.label}${step.state === 'done' ? ' (completed)' : ''}`}
                className="flex items-center gap-2 group"
                style={{ cursor: isClickable ? 'pointer' : 'default', background: 'none', border: 'none', padding: 0 }}
              >
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 transition-all"
                  style={{
                    background: colors.bg,
                    border: `2px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  {step.state === 'done' ? (
                    <Check size={14} strokeWidth={3} aria-hidden />
                  ) : step.state === 'error' ? (
                    <AlertCircle size={14} aria-hidden />
                  ) : (
                    step.number
                  )}
                </span>
                <span
                  className="text-sm font-medium whitespace-nowrap"
                  style={{ color: step.state === 'active' ? 'var(--text)' : step.state === 'done' ? 'var(--text)' : 'var(--muted)' }}
                >
                  {step.label}
                </span>
              </button>
              {i < steps.length - 1 && (
                <span
                  className="mx-3 flex-shrink-0"
                  style={{
                    display: 'block',
                    width: '32px',
                    height: '2px',
                    background: step.state === 'done' ? 'var(--success)' : 'var(--border)',
                    borderRadius: '1px',
                  }}
                  aria-hidden
                />
              )}
            </div>
          )
        })}
      </nav>

      {/* Mobile: "Step N of 5 — Label" */}
      <div className="sm:hidden flex items-center gap-2">
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
          style={{
            background: stepColors.active.bg,
            border: `2px solid ${stepColors.active.border}`,
            color: stepColors.active.text,
          }}
        >
          {currentStep}
        </span>
        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
          Step {currentStep} of {steps.length}{' '}
          <span style={{ color: 'var(--muted)' }}>
            — {steps.find((s) => s.number === currentStep)?.label ?? ''}
          </span>
        </span>
      </div>
    </>
  )
}
