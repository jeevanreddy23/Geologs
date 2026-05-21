// frontend/src/steps/CaptureStep.jsx
import { useState, useRef } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

const SWARM_SEQUENCE = [
  "validation", "photo", "historical", "classifier", "compliance", "qa", "summary", "logger", "report", "dispatch"
];

export default function CaptureStep({ 
  project, 
  interval, 
  setInterval, 
  setLayer, 
  setError, 
  onNext, 
  onBack,
  setActiveAgent,
  setCompletedAgents
}) {
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()

  const valid = interval.depthFrom !== '' && interval.depthTo !== ''

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
  }

  const simulateSwarm = async () => {
    setCompletedAgents([]);
    for (let i = 0; i < SWARM_SEQUENCE.length; i++) {
      const agent = SWARM_SEQUENCE[i];
      if (agent === "photo" && !photo) continue;
      
      setActiveAgent(agent);
      // Artificial delay to show the "intelligence" at work
      await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
      setCompletedAgents(prev => [...prev, agent]);
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    
    // Start visual swarm simulation
    const swarmPromise = simulateSwarm();
    
    try {
      let result
      if (photo) {
        const fd = new FormData()
        fd.append('project_id', project.id)
        fd.append('project_name', project.name)
        fd.append('borehole_id', project.boreholeId)
        fd.append('depth_from', interval.depthFrom)
        fd.append('depth_to', interval.depthTo)
        fd.append('sample_id', interval.sampleId || '')
        fd.append('photo', photo)
        const res = await axios.post(`${API}/log-interval-photo`, fd)
        result = res.data
      } else {
        const res = await axios.post(`${API}/log-interval`, {
          project_id: project.id,
          project_name: project.name,
          borehole_id: project.boreholeId,
          depth_from: parseFloat(interval.depthFrom),
          depth_to: parseFloat(interval.depthTo),
          sample_id: interval.sampleId || '',
        })
        result = res.data
      }
      
      // Wait for swarm visualization to finish if it's still running
      await swarmPromise;
      
      setLayer(result.layer)
      onNext()
    } catch (err) {
      const msg = err.response?.data?.detail?.message || err.response?.data?.detail || err.message
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-primary">Capture Interval</h2>
        <span className="text-secondary">{project.boreholeId} • Metadata Injection</span>
      </div>
      
      <div className="field-row" style={{ marginTop: '1.5rem' }}>
        <div className="field">
          <label>Depth From (m)</label>
          <input type="number" step="0.1" min="0" placeholder="0.00"
            value={interval.depthFrom}
            className="input-premium"
            onChange={e => setInterval(i => ({ ...i, depthFrom: e.target.value }))} />
        </div>
        <div className="field">
          <label>Depth To (m)</label>
          <input type="number" step="0.1" min="0" placeholder="1.50"
            value={interval.depthTo}
            className="input-premium"
            onChange={e => setInterval(i => ({ ...i, depthTo: e.target.value }))} />
        </div>
      </div>

      <div className="field">
        <label>Sample ID / Jar #</label>
        <input placeholder="e.g. DS-04" value={interval.sampleId}
          className="input-premium"
          onChange={e => setInterval(i => ({ ...i, sampleId: e.target.value }))} />
      </div>

      <div className="upload-zone-premium" onClick={() => fileRef.current.click()}>
        {preview ? (
          <div className="preview-container">
            <img src={preview} alt="Soil sample" className="image-preview" />
            <div className="preview-overlay">Tap to Replace</div>
          </div>
        ) : (
          <div className="upload-placeholder">
            <div className="icon-pulse"><Camera size={32} /></div>
            <p>Add Field Photo (Optional)</p>
            <span className="text-xs">Supports USCS Vision Classifier</span>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" capture="environment"
               style={{ display: 'none' }} onChange={handleFile} />
      </div>

      <div className="btn-row" style={{ marginTop: '2rem' }}>
        <button className="btn btn-ghost" onClick={onBack}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={!valid || loading}>
          {loading && <span className="spinner" />}
          {loading ? 'SWARM ANALYSING...' : (photo ? 'INJECT & ANALYSE ?' : 'CLASSIFY INTERVAL ?')}
        </button>
      </div>

      <style>{`
        .input-premium {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 0.75rem;
          color: white;
          outline: none;
          transition: border-color 0.3s;
        }
        .input-premium:focus {
          border-color: var(--accent-gold);
        }
        .upload-zone-premium {
          margin-top: 1.5rem;
          height: 160px;
          border: 2px dashed rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          overflow: hidden;
          transition: all 0.3s;
        }
        .upload-zone-premium:hover {
          border-color: var(--accent-gold);
          background: rgba(234, 179, 8, 0.03);
        }
        .icon-pulse {
          color: var(--accent-gold);
          margin-bottom: 0.5rem;
          animation: glow 2s infinite;
        }
        @keyframes glow {
          0% { filter: drop-shadow(0 0 2px rgba(234, 179, 8, 0.4)); }
          50% { filter: drop-shadow(0 0 10px rgba(234, 179, 8, 0.8)); }
          100% { filter: drop-shadow(0 0 2px rgba(234, 179, 8, 0.4)); }
        }
        .preview-container {
          position: relative;
          width: 100%;
          height: 100%;
        }
        .image-preview {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .preview-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s;
        }
        .preview-container:hover .preview-overlay {
          opacity: 1;
        }
      `}</style>
    </div>
  )
}
