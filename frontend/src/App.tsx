import { useState, useRef } from 'react';
import VerticalLoggingCanvas from './components/VerticalLoggingCanvas';
import {
  Upload,
  FileDown,
  X,
  Settings2,
  FolderOpen,
  Loader2,
  FileText,
  CheckCircle2,
  Search,
  Cloud,
  ShieldCheck,
  Database,
  Camera,
  Activity,
  Bell,
  ClipboardCheck
} from 'lucide-react';
import { apiUrl, apiFetch } from './lib/api';
import './App.css';

function App() {
  const [projectData, setProjectData] = useState({ client: '', boreholeId: '' });
  const [depths, setDepths] = useState({ from: '0.0', to: '10.0' });
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [visionData, setVisionData] = useState<any | null>(null);
  const [logData, setLogData] = useState<any[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const approvedCount = logData.filter((u) => u.status === 'approved').length;
  const reviewCount = Math.max(logData.length - approvedCount, 0);
  const hasDraft = logData.length > 0;
  const activeBorehole = projectData.boreholeId || 'BH-01';

  const handleFileUpload = async (event: any) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    setPhotoData(null);
    setLogData([]);

    const formData = new FormData();
    formData.append('photo', file);
    formData.append('client', projectData.client || '');
    formData.append('borehole_id', activeBorehole);
    formData.append('depth_from', depths.from || '0');
    formData.append('depth_to', depths.to || '10');

    try {
      const res = await apiFetch(apiUrl('/core/auto-log'), { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Auto-log failed (${res.status})`);
      }
      const draft = await res.json();

      setPhotoData(draft.annotated_photo_url ? apiUrl(draft.annotated_photo_url) : apiUrl(draft.photo_url));
      setVisionData({
        rows: draft.rows,
        core_segments: draft.core_segments,
        defects: draft.defects,
        core_recovery: draft.core_recovery
      });
      setLogData((draft.lithology_units || []).map((unit: any, i: number) => ({
        ...unit,
        status: unit.status || 'draft',
        tcr: draft.core_recovery?.[i]?.tcr_percent ?? '',
        rqd: draft.core_recovery?.[i]?.rqd_percent ?? '',
        defects: ''
      })));
      if (draft.warnings?.length) console.warn('Pipeline warnings:', draft.warnings);
    } catch (err: any) {
      console.error('Failed to process image:', err);
      alert(err.message || 'Failed to run the auto-log pipeline.');
    } finally {
      setIsProcessing(false);
    }
  };

  const approveAll = () => {
    if (logData.length === 0) return;
    setLogData(logData.map((u) => ({ ...u, status: 'approved', review_required: false })));
  };

  const generatePDF = async () => {
    if (logData.some((u) => u.status !== 'approved')) {
      alert('Human review required: approve all lithology units before exporting.');
      return;
    }
    try {
      const payload = {
        project: projectData,
        borehole: { id: activeBorehole },
        lithology_units: logData,
        discontinuities: visionData?.defects || [],
        core_runs: visionData?.core_recovery || []
      };
      const res = await apiFetch(apiUrl('/pdf/export'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setPdfUrl(apiUrl(data.pdf_url));
        setIsPdfModalOpen(true);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || 'Failed to generate PDF');
      }
    } catch (e) {
      console.error('PDF generation error', e);
    }
  };

  return (
    <div className="autoshell">
      <header className="product-bar">
        <div className="brand-lockup">
          <div className="brand-mark">
            <span />
          </div>
          <div>
            <p className="brand-title">AutoSoil Logger</p>
            <p className="brand-subtitle">Image-first geotechnical logging</p>
          </div>
        </div>

        <div className="project-search">
          <Search size={15} />
          <input aria-label="Search project data" placeholder="Search locations, intervals, reports..." />
        </div>

        <nav className="workflow-tabs" aria-label="Workflow navigation">
          {['Explorer', 'Core Photos', 'Borehole Grid', 'Reports', 'QA'].map((tab) => (
            <button key={tab} className={tab === 'Core Photos' ? 'active' : ''}>{tab}</button>
          ))}
        </nav>

        <div className="top-status">
          <span className="standard-pill"><ShieldCheck size={14} /> AS 1726:2017</span>
          <span className="sync-pill"><Cloud size={14} /> Vercel ready</span>
          <button className="icon-button" aria-label="Notifications"><Bell size={16} /></button>
        </div>
      </header>

      <div className="workspace-grid">
        <aside className="project-explorer">
          <section className="explorer-card">
            <div className="section-heading">
              <FolderOpen size={15} />
              <span>Project Explorer</span>
            </div>
            <div className="project-node selected">
              <span className="node-kicker">Active location</span>
              <strong>{activeBorehole}</strong>
              <small>{depths.from}m to {depths.to}m core run</small>
            </div>
            <div className="tree-list">
              <button><span>Locations</span><b>4</b></button>
              <button><span>Core Photos</span><b>{photoData ? 1 : 0}</b></button>
              <button><span>Lithology Units</span><b>{logData.length}</b></button>
              <button><span>Defects</span><b>{visionData?.defects?.length || 0}</b></button>
              <button><span>Reports</span><b>{pdfUrl ? 1 : 0}</b></button>
            </div>
          </section>

          <section className="explorer-card">
            <div className="section-heading">
              <Settings2 size={15} />
              <span>Core Run Setup</span>
            </div>
            <label className="field-label">Client / Project</label>
            <input
              type="text"
              value={projectData.client}
              onChange={(e) => setProjectData({ ...projectData, client: e.target.value })}
              className="control-input"
              placeholder="e.g. MPA Infrastructure"
            />
            <label className="field-label">Borehole ID</label>
            <input
              type="text"
              value={projectData.boreholeId}
              onChange={(e) => setProjectData({ ...projectData, boreholeId: e.target.value })}
              className="control-input"
              placeholder="e.g. BH-04"
            />
            <div className="depth-grid">
              <div>
                <label className="field-label">From (m)</label>
                <input
                  type="number"
                  step="0.01"
                  value={depths.from}
                  onChange={(e) => setDepths({ ...depths, from: e.target.value })}
                  className="control-input mono"
                />
              </div>
              <div>
                <label className="field-label">To (m)</label>
                <input
                  type="number"
                  step="0.01"
                  value={depths.to}
                  onChange={(e) => setDepths({ ...depths, to: e.target.value })}
                  className="control-input mono"
                />
              </div>
            </div>
          </section>

          <section className="explorer-card command-stack">
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="command-button primary"
            >
              {isProcessing ? <Loader2 size={17} className="spin" /> : <Upload size={17} />}
              <span>{isProcessing ? 'Processing Core Box' : 'Upload Core Box'}</span>
            </button>
            <button
              onClick={approveAll}
              disabled={logData.length === 0 || isProcessing}
              className="command-button success"
            >
              <CheckCircle2 size={17} />
              <span>{hasDraft && reviewCount === 0 ? 'All Units Approved' : `Approve Units (${approvedCount}/${logData.length})`}</span>
            </button>
            <button
              onClick={generatePDF}
              disabled={logData.length === 0}
              className="command-button dark"
            >
              <FileDown size={17} />
              <span>Export PDF</span>
            </button>
          </section>
        </aside>

        <main className="production-canvas">
          <div className="canvas-toolbar">
            <div>
              <p className="eyebrow">AutoSoil CoreLog</p>
              <h1>Vision-assisted rock core logging workspace</h1>
            </div>
            <div className="toolbar-metrics">
              <span><Camera size={14} /> {photoData ? 'Photo loaded' : 'Awaiting photo'}</span>
              <span><Activity size={14} /> {isProcessing ? 'Vision running' : 'Vision idle'}</span>
              <span><ClipboardCheck size={14} /> {reviewCount} review</span>
            </div>
          </div>
          <div className="canvas-frame">
            <VerticalLoggingCanvas
              photoUrl={photoData}
              visionData={visionData}
              logData={logData}
              setLogData={setLogData}
              maxDepth={10}
              isProcessing={isProcessing}
            />
          </div>
        </main>

        <aside className="review-panel">
          <section className="review-hero">
            <p className="eyebrow">Review Gate</p>
            <h2>{hasDraft ? `${reviewCount} fields need review` : 'Upload a core tray to begin'}</h2>
            <p>
              AI output stays draft until a reviewer approves critical geology, scale, defects,
              recovery, and report fields.
            </p>
          </section>

          <section className="qa-card">
            <div className="section-heading">
              <Database size={15} />
              <span>Detected Data</span>
            </div>
            <div className="metric-row">
              <span>Rows</span>
              <strong>{visionData?.rows?.length || 0}</strong>
            </div>
            <div className="metric-row">
              <span>Core pieces</span>
              <strong>{visionData?.core_segments?.length || 0}</strong>
            </div>
            <div className="metric-row">
              <span>Defects</span>
              <strong>{visionData?.defects?.length || 0}</strong>
            </div>
            <div className="metric-row">
              <span>Recovery runs</span>
              <strong>{visionData?.core_recovery?.length || 0}</strong>
            </div>
          </section>

          <section className="qa-card">
            <div className="section-heading">
              <ShieldCheck size={15} />
              <span>QA Signals</span>
            </div>
            <div className="qa-item good">
              <span>Renderer boundary</span>
              <strong>Protected</strong>
            </div>
            <div className={`qa-item ${reviewCount > 0 ? 'warn' : 'good'}`}>
              <span>Human review</span>
              <strong>{hasDraft ? (reviewCount > 0 ? 'Required' : 'Clear') : 'Waiting'}</strong>
            </div>
            <div className="qa-item warn">
              <span>Scale calibration</span>
              <strong>Reviewer check</strong>
            </div>
          </section>
        </aside>
      </div>

      <footer className="validation-strip">
        <span><ShieldCheck size={14} /> Compliance: AS 1726-2017</span>
        <span><Database size={14} /> OCR engine: DeepSeek proxy via Vercel</span>
        <span><Cloud size={14} /> Deployment: Vercel frontend</span>
        <span><ClipboardCheck size={14} /> Export readiness: {hasDraft && reviewCount === 0 ? 'Approved draft' : 'Draft review'}</span>
      </footer>

      {isPdfModalOpen && (
        <div className="pdf-overlay">
          <div className="pdf-panel">
            <div className="pdf-header">
              <h2>
                <FileText size={20} />
                Live OpenGround-style PDF Preview
              </h2>
              <button onClick={() => setIsPdfModalOpen(false)} aria-label="Close PDF preview">
                <X size={22} />
              </button>
            </div>
            <div className="pdf-body">
              {pdfUrl ? (
                <iframe src={pdfUrl} title="PDF Preview" />
              ) : (
                <div className="pdf-loading">Loading preview...</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
