import { useState } from 'react'
import { ExternalLink, AlertCircle } from 'lucide-react'
import { CATEGORIES, type Category } from '../../config/networks'
import type { WizardDraft } from '../../lib/draft'

interface Step1Props {
  draft: WizardDraft
  onNext: (updates: Partial<WizardDraft>) => void
  onJumpToRegister: () => void
}

function isValidGithubUrl(url: string): boolean {
  return /^https:\/\/github\.com\/[^/]+\/[^/]+/.test(url.trim())
}

function isValidStudioUrl(url: string): boolean {
  return url === '' || url.startsWith('https://studio.arc.io/')
}

function isValidAddress(addr: string): boolean {
  return addr === '' || /^0x[0-9a-fA-F]{40}$/.test(addr.trim())
}

function normaliseGithubUrl(url: string): string {
  return url.trim().replace(/\.git$/, '').replace(/\/$/, '')
}

export function Step1Project({ draft, onNext, onJumpToRegister }: Step1Props) {
  // Use draft values as initial state; parent remounts this component (via key=walletAddress)
  // when the wallet changes, so we don't need a useEffect to sync.
  const [projectName, setProjectName]     = useState(draft.projectName)
  const [category, setCategory]           = useState<Category | ''>(draft.category as Category | '')
  const [repoUrl, setRepoUrl]             = useState(draft.repoUrl)
  const [branch, setBranch]               = useState(draft.branch)
  const [studioUrl, setStudioUrl]         = useState(draft.studioUrl)
  const [testnetAddress, setTestnetAddress] = useState(draft.testnetAddress)
  const [touched, setTouched]             = useState<Record<string, boolean>>({})

  const repoError   = touched.repoUrl && repoUrl && !isValidGithubUrl(repoUrl) ? 'Enter a valid GitHub repo URL (https://github.com/owner/repo)' : ''
  const studioError = touched.studioUrl && studioUrl && !isValidStudioUrl(studioUrl) ? 'Must start with https://studio.arc.io/' : ''
  const addrError   = touched.testnetAddress && testnetAddress && !isValidAddress(testnetAddress) ? 'Must be a valid 0x address' : ''

  const nameLen = projectName.length
  const isValid =
    nameLen > 0 && nameLen <= 64 &&
    category !== '' &&
    isValidGithubUrl(repoUrl) &&
    isValidStudioUrl(studioUrl) &&
    isValidAddress(testnetAddress)

  function handleNext() {
    if (!isValid) return
    onNext({
      projectName,
      category,
      repoUrl: normaliseGithubUrl(repoUrl),
      branch,
      studioUrl,
      testnetAddress,
    })
  }

  const fieldBase: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid var(--border)',
    background: 'var(--bg)',
    color: 'var(--text)',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
  }
  const errorStyle: React.CSSProperties = { color: 'var(--danger)', fontSize: '12px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px', letterSpacing: '0.02em' }

  return (
    <div>
      {/* Shortcut */}
      <div
        className="mb-6 p-4 rounded-xl flex items-center justify-between gap-3 flex-wrap"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <span className="text-sm" style={{ color: 'var(--muted)' }}>
          Already deployed to mainnet?
        </span>
        <button
          onClick={onJumpToRegister}
          className="flex items-center gap-1.5 text-sm font-semibold"
          style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          Register an existing contract
          <ExternalLink size={13} aria-hidden />
        </button>
      </div>

      <div className="space-y-5">
        {/* Project name */}
        <div>
          <label htmlFor="projectName" style={labelStyle}>
            PROJECT NAME <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <div className="relative">
            <input
              id="projectName"
              type="text"
              maxLength={65}
              placeholder="My Arc App"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, projectName: true }))}
              style={{ ...fieldBase, paddingRight: '60px' }}
              aria-describedby="projectName-counter"
            />
            <span
              id="projectName-counter"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
              style={{ color: nameLen > 64 ? 'var(--danger)' : 'var(--muted)' }}
            >
              {nameLen}/64
            </span>
          </div>
          {touched.projectName && nameLen === 0 && (
            <p style={errorStyle}><AlertCircle size={12} /> Required</p>
          )}
          {touched.projectName && nameLen > 64 && (
            <p style={errorStyle}><AlertCircle size={12} /> Max 64 characters</p>
          )}
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" style={labelStyle}>
            CATEGORY <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category | '')}
            onBlur={() => setTouched((t) => ({ ...t, category: true }))}
            style={{ ...fieldBase, cursor: 'pointer' }}
          >
            <option value="">Select a category…</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {touched.category && category === '' && (
            <p style={errorStyle}><AlertCircle size={12} /> Required</p>
          )}
        </div>

        {/* GitHub repo URL */}
        <div>
          <label htmlFor="repoUrl" style={labelStyle}>
            GITHUB REPO URL <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input
            id="repoUrl"
            type="url"
            placeholder="https://github.com/you/your-project"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, repoUrl: true }))}
            style={fieldBase}
          />
          {repoError && <p style={errorStyle}><AlertCircle size={12} /> {repoError}</p>}
        </div>

        {/* Branch (optional) */}
        <div>
          <label htmlFor="branch" style={labelStyle}>BRANCH <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional — defaults to repo default)</span></label>
          <input
            id="branch"
            type="text"
            placeholder="main"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            style={fieldBase}
          />
        </div>

        {/* Arc Studio URL (optional) */}
        <div>
          <label htmlFor="studioUrl" style={labelStyle}>ARC STUDIO PROJECT URL <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
          <input
            id="studioUrl"
            type="url"
            placeholder="https://studio.arc.io/project/..."
            value={studioUrl}
            onChange={(e) => setStudioUrl(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, studioUrl: true }))}
            style={fieldBase}
            aria-describedby="studioUrl-hint"
          />
          <p id="studioUrl-hint" className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
            Paste the link to your project in Arc Studio — shows judges it was built with Arc Studio.
          </p>
          {studioError && <p style={errorStyle}><AlertCircle size={12} /> {studioError}</p>}
        </div>

        {/* Testnet address (optional) */}
        <div>
          <label htmlFor="testnetAddress" style={labelStyle}>TESTNET CONTRACT ADDRESS <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
          <input
            id="testnetAddress"
            type="text"
            placeholder="0x…"
            value={testnetAddress}
            onChange={(e) => setTestnetAddress(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, testnetAddress: true }))}
            style={{ ...fieldBase, fontFamily: 'var(--font-mono, ui-monospace)' }}
            aria-describedby="testnetAddress-hint"
          />
          <p id="testnetAddress-hint" className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
            The Arc Studio testnet deployment address, if you have one.
          </p>
          {addrError && <p style={errorStyle}><AlertCircle size={12} /> {addrError}</p>}
        </div>

        <button
          onClick={handleNext}
          disabled={!isValid}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
          style={{
            background: isValid ? 'var(--accent)' : 'var(--border)',
            color: isValid ? '#fff' : 'var(--muted)',
            cursor: isValid ? 'pointer' : 'not-allowed',
          }}
        >
          Run Preflight →
        </button>
      </div>
    </div>
  )
}
