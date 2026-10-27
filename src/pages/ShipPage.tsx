import { useState, useEffect, useRef } from 'react'
import { useAccount } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { RotateCcw, PlayCircle } from 'lucide-react'
import { WizardStepper, type WizardStep, type StepState } from '../components/wizard/WizardStepper'
import { Step1Project } from '../components/wizard/Step1Project'
import { Step2Preflight } from '../components/wizard/Step2Preflight'
import { Step3Deploy } from '../components/wizard/Step3Deploy'
import { Step4Register } from '../components/wizard/Step4Register'
import { Step5Verify } from '../components/wizard/Step5Verify'
import { saveDraft, loadDraft, clearDraft, emptyDraft, type WizardDraft } from '../lib/draft'
import { NETWORK_MODE } from '../config/networks'

const STEP_LABELS = ['Project', 'Preflight', 'Deploy', 'Register', 'Verify & Launch']

function stepState(stepNum: number, current: number): StepState {
  if (stepNum < current) return 'done'
  if (stepNum === current) return 'active'
  return 'upcoming'
}

function buildSteps(current: number): WizardStep[] {
  return STEP_LABELS.map((label, i) => ({
    number: i + 1,
    label,
    state: stepState(i + 1, current),
  }))
}

export function ShipPage() {
  const { address, isConnected } = useAccount()
  const [draft, setDraft] = useState<WizardDraft | null>(null)
  const [showResume, setShowResume] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [isDirectRegister, setIsDirectRegister] = useState(false)
  const [started, setStarted] = useState(false)
  const prevAddressRef = useRef<string | undefined>(undefined)

  // Load draft when wallet connects — runs only when address changes, never on first render
  // with the same address twice, to avoid cascading setState warnings.
  useEffect(() => {
    if (prevAddressRef.current === address) return
    prevAddressRef.current = address
    if (!address) {
      // Defer to next tick to avoid synchronous setState-in-effect
      const t = setTimeout(() => { setDraft(null); setShowResume(false) }, 0)
      return () => clearTimeout(t)
    }
    const existing = loadDraft(address)
    const t = setTimeout(() => {
      if (existing && existing.currentStep > 1) {
        setDraft(existing)
        setShowResume(true)
      } else {
        setDraft(emptyDraft(address))
        setShowResume(false)
      }
    }, 0)
    return () => clearTimeout(t)
  }, [address])

  function startFresh() {
    if (!address) return
    const fresh = emptyDraft(address)
    setDraft(fresh)
    clearDraft(address)
    setCurrentStep(1)
    setIsDirectRegister(false)
    setShowResume(false)
    setStarted(true)
  }

  function resumeDraft() {
    if (!draft) return
    setCurrentStep(draft.currentStep)
    setShowResume(false)
    setStarted(true)
  }

  function jumpToRegister() {
    if (!address) return
    const d = draft ?? emptyDraft(address)
    setDraft(d)
    setCurrentStep(4)
    setIsDirectRegister(true)
    setShowResume(false)
    setStarted(true)
  }

  function updateDraft(updates: Partial<WizardDraft>) {
    if (!draft) return
    const next: WizardDraft = { ...draft, ...updates }
    setDraft(next)
    saveDraft(next)
  }

  function goToStep(step: number, updates?: Partial<WizardDraft>) {
    if (updates) updateDraft({ ...updates, currentStep: step })
    else updateDraft({ currentStep: step })
    setCurrentStep(step)
  }

  function handleFinish() {
    if (address) clearDraft(address)
    setStarted(false)
    setCurrentStep(1)
    setShowResume(false)
    setDraft(emptyDraft(address ?? ''))
  }

  const steps = buildSteps(currentStep)

  // Not connected
  if (!isConnected) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(79,124,255,0.12)' }}>
          <PlayCircle size={26} style={{ color: 'var(--accent)' }} />
        </div>
        <h1 className="display text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>
          Connect your wallet to ship
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
          All transactions are signed by you. StudioShip never sees your keys.
        </p>
        <ConnectKitButton />
      </div>
    )
  }

  // Resume card
  if (!started && showResume && draft) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-16">
        <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text)' }}>Resume your draft</h2>
          <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>
            You have an unfinished ship for <strong style={{ color: 'var(--text)' }}>{draft.projectName || 'a project'}</strong>.
          </p>
          <p className="text-xs mb-5" style={{ color: 'var(--muted)' }}>
            Last saved: {new Date(draft.savedAt).toLocaleString()} · Step {draft.currentStep} of 5
          </p>
          <div className="flex gap-3">
            <button
              onClick={resumeDraft}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              <PlayCircle size={15} /> Resume
            </button>
            <button
              onClick={startFresh}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: 'var(--border)', color: 'var(--text)', border: 'none', cursor: 'pointer' }}
            >
              <RotateCcw size={14} /> Start over
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Wizard not yet started
  if (!started) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="display text-3xl font-bold mb-2" style={{ color: 'var(--text)' }}>Ship your project</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
          5-step guided flow from Arc Studio to {NETWORK_MODE === 'mainnet' ? 'Arc Mainnet' : 'Arc Testnet'}.
        </p>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={startFresh}
            className="px-6 py-3 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            Start shipping →
          </button>
          <button
            onClick={jumpToRegister}
            className="px-6 py-3 rounded-xl text-sm font-medium"
            style={{ background: 'var(--surface)', color: 'var(--accent)', border: '1px solid var(--border)', cursor: 'pointer' }}
          >
            Already deployed? Register existing contract →
          </button>
        </div>
      </div>
    )
  }

  if (!draft) return null

  // Direct-register path: clean standalone page, no stepper, no step numbering
  if (isDirectRegister) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        {/* Back link */}
        <button
          onClick={() => { setIsDirectRegister(false); setStarted(false) }}
          className="flex items-center gap-1.5 text-sm mb-7"
          style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          ← Back
        </button>

        {/* Page heading */}
        <h1 className="display text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>
          Register an existing contract
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
          Your contract is already deployed. Tell us about the project so it appears in the gallery.
        </p>

        {/* Form card */}
        <div className="rounded-2xl p-6 sm:p-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Step4Register
            draft={draft}
            onNext={(updates) => {
              updateDraft(updates)
              setIsDirectRegister(false)
              goToStep(5, updates)
            }}
            onBack={() => { setIsDirectRegister(false); setStarted(false) }}
            isDirectRegister={true}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Stepper */}
      <div className="mb-8">
        <WizardStepper
          steps={steps}
          currentStep={currentStep}
          onStepClick={(step) => step < currentStep && goToStep(step)}
        />
      </div>

      {/* Step card */}
      <div className="rounded-2xl p-6 sm:p-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="display text-xl font-bold mb-5" style={{ color: 'var(--text)' }}>
          Step {currentStep}: {STEP_LABELS[currentStep - 1]}
        </h2>

        {currentStep === 1 && (
          <Step1Project
            key={draft.walletAddress}
            draft={draft}
            onNext={(updates) => goToStep(2, updates)}
            onJumpToRegister={jumpToRegister}
          />
        )}
        {currentStep === 2 && (
          <Step2Preflight
            draft={draft}
            onNext={(updates) => goToStep(3, updates)}
            onBack={() => goToStep(1)}
          />
        )}
        {currentStep === 3 && (
          <Step3Deploy
            draft={draft}
            onNext={(updates) => goToStep(4, updates)}
            onBack={() => goToStep(2)}
          />
        )}
        {currentStep === 4 && (
          <Step4Register
            draft={draft}
            onNext={(updates) => goToStep(5, updates)}
            onBack={() => goToStep(3)}
            isDirectRegister={false}
          />
        )}
        {currentStep === 5 && (
          <Step5Verify
            draft={draft}
            onBack={() => goToStep(4)}
            onFinish={handleFinish}
          />
        )}
      </div>
    </div>
  )
}
