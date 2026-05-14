// frontend/src/steps/ReportStep.jsx
import { useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

export default function ReportStep({ project, layer, onBack }) {
  const [loading, setLoading] = useState(false)
  const [reportUrl, setReportUrl] = useState(null)
  const [error, setError] = useState(null)

  const generateReport = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.post(
        `${API}/generate-report/${project.boreholeId}`,
        null,
        { params: { project_id: project.id, project_name: project.name },
          responseType: 'blob' }
      )
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      setReportUrl(url)
    } catch (e) {
      setError('Report generation failed — check that all intervals are logged')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <h2>Report</h2>
      <p className="sub">{project.boreholeId} · AS 1726:2017 borehole log</p>
      {layer && (
        <div style={{ marginBottom: '16px', padding: '12px',
                      background: '#f0fdf4', borderRadius: '8px',
                      fontSize: '13px', color: '#15803d' }}>
          ✓ Last logged: {layer.uscs_code} at {layer.depth_from}–{layer.depth_to}m
        </div>
      )}
      {error && (
        <div style={{ padding: '10px 12px', background: '#fef2f2',
                      borderRadius: '8px', fontSize: '13px', color: '#b91c1c',
                      marginBottom: '12px' }}>
          ⚠ {error}
        </div>
      )}
      {reportUrl && (
        <a href={reportUrl} download={`${project.boreholeId}_log.pdf`}
           className="btn btn-primary"
           style={{ display: 'block', textAlign: 'center', marginBottom: '12px', textDecoration: 'none' }}>
          ↓ Download PDF log
        </a>
      )}
      <div className="btn-row">
        <button className="btn btn-ghost" onClick={onBack}>← Log more</button>
        <button className="btn btn-primary" onClick={generateReport} disabled={loading}>
          {loading && <span className="spinner" />}
          {loading ? 'Generating…' : 'Generate PDF report'}
        </button>
      </div>
    </div>
  )
}
