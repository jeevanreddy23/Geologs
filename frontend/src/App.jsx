// frontend/src/App.jsx
import { useState } from "react";
import { 
  Layers, 
  LayoutDashboard, 
  FileText, 
  Database, 
  CheckCircle, 
  Settings, 
  Search, 
  Copy, 
  Zap, 
  Eye, 
  Send 
} from "lucide-react";
import ProjectStep from "./steps/ProjectStep";
import CaptureStep from "./steps/CaptureStep";
import ClassifyStep from "./steps/ClassifyStep";
import ReportStep from "./steps/ReportStep";
import "./App.css";

const STEPS = [
  { name: "Scope", icon: Search },
  { name: "Template", icon: Copy },
  { name: "Validation", icon: Zap },
  { name: "Review", icon: Eye },
  { name: "Issue", icon: Send }
];

export default function App() {
  const [step, setStep] = useState(0);
  const [project, setProject] = useState({ id: "PRJ-2026-G042", name: "Geotechnical Investigation", boreholeId: "BH-01" });
  const [interval, setInterval] = useState({ depthFrom: "", depthTo: "", sampleId: "" });
  const [layer, setLayer] = useState(null);
  const [error, setError] = useState(null);

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <Layers size={28} />
          GEOLOGS
        </div>
        <nav>
          <ul className="nav-links">
            <li className="nav-item active"><LayoutDashboard size={20} /> Dashboard</li>
            <li className="nav-item"><FileText size={20} /> Templates</li>
            <li className="nav-item"><Database size={20} /> Field Data</li>
            <li className="nav-item"><CheckCircle size={20} /> QA/QC</li>
            <li className="nav-item"><Settings size={20} /> Settings</li>
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <div className="project-info">
            <h1>Active Workflow: <span>{project.id}</span></h1>
            <p className="text-secondary">Template: {project.name} - Cored</p>
          </div>
          <div className="header-actions">
            <span className="status-badge">Processing</span>
          </div>
        </header>

        {/* Workflow Stepper */}
        <nav className="step-nav" aria-label="Wizard steps">
          {STEPS.map((sObj, i) => (
            <div 
              key={sObj.name} 
              className={`step-pill ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}
              onClick={() => i <= step && setStep(i)}
            >
              <div className="step-dot">
                <sObj.icon size={20} />
              </div>
              <span className="step-label">{sObj.name}</span>
            </div>
          ))}
        </nav>

        {/* Wizard Body */}
        <div className="wizard-body">
          {error && (
            <div className="card" style={{ border: "1px solid var(--accent-red)", marginBottom: "2rem" }}>
              <p style={{ color: "var(--accent-red)", fontWeight: 700 }}>? {error}</p>
              <button onClick={() => setError(null)} className="btn-ghost" style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}>Dismiss</button>
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
          {(step === 3 || step === 4) && (
            <ReportStep
              project={project}
              layer={layer}
              onBack={back}
            />
          )}
        </div>
      </main>
    </div>
  );
}
