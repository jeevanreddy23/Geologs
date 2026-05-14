// frontend/src/App.jsx
import { useState } from 'react'
import ProjectStep from './steps/ProjectStep'
import CaptureStep from './steps/CaptureStep'
import ClassifyStep from './steps/ClassifyStep'
import ReportStep from './steps/ReportStep'
import './App.css'

const STEPS = ['Project', 'Capture', 'Classify', 'Report']

export default function App() {
  const [step, setStep] = useState(0)
  const [project, setProject] = useState({ id: '', name: '', boreholeId: '' })
  const [interval, setInterval] = useState({ depthFrom: '', depthTo: '', sampleId: '' })
  const [layer, setLayer] = useState(null)
  const [error, setError] = useState(null)

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1))
  const back = () => setStep(s => Math.max(s - 1, 0))

  return (
    <div className="app">
      <header className="app-header">
        <span className="logo">AutoSoil</span>
        <span className="standard">AS 1726:2017</span>
      </header>

      <nav className="step-nav" aria-label="Wizard steps">
        {STEPS.map((name, i) => (
          <div key={name} className={`step-pill ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
            <span className="step-dot" />
            <span className="step-label">{name}</span>
            {i < STEPS.length - 1 && <span className="step-sep">›</span>}
          </div>
        ))}
      </nav>

      <main className="wizard-body">
        {error && (
          <div className="error-banner" role="alert">
            <span>⚠ {error}</span>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {step === 0 && (
          <ProjectStep project={project} setProject={setProject} onNext={next} />
        )}
        {step === 1 && (
          <CaptureStep
            project={project}
            interval={interval}
            setInterval={setInterval}
            setLayer={setLayer}
            setError={setError}
            onNext={next}
            onBack={back}
          />
        )}
        {step === 2 && (
          <ClassifyStep
            layer={layer}
            setLayer={setLayer}
            project={project}
            interval={interval}
            setError={setError}
            onNext={next}
            onBack={back}
          />
        )}
        {step === 3 && (
          <ReportStep
            project={project}
            layer={layer}
            onBack={back}
          />
        )}
      </main>
    </div>
  )
}
