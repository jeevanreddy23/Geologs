// frontend/src/steps/CaptureStep.jsx
import { useState, useRef } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

export default function CaptureStep({ project, interval, setInterval, setLayer, setError, onNext, onBack }) {
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

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
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
      <h2>Capture</h2>
      <p className="sub">{project.boreholeId} — enter depth interval</p>
      <div className="field-row">
        <div className="field">
          <label>Depth from (m)</label>
          <input type="number" step="0.1" min="0" placeholder="0.00"
            value={interval.depthFrom}
            onChange={e => setInterval(i => ({ ...i, depthFrom: e.target.value }))} />
        </div>
        <div className="field">
          <label>Depth to (m)</label>
          <input type="number" step="0.1" min="0" placeholder="1.50"
            value={interval.depthTo}
            onChange={e => setInterval(i => ({ ...i, depthTo: e.target.value }))} />
        </div>
      </div>
      <div className="field">
        <label>Sample ID (optional)</label>
        <input placeholder="e.g. DS-04" value={interval.sampleId}
          onChange={e => setInterval(i => ({ ...i, sampleId: e.target.value }))} />
      </div>
      <div className="upload-zone" onClick={() => fileRef.current.click()}>
        <div className="upload-icon">📷</div>
        {preview
          ? <img src={preview} alt="Selected soil sample" />
          : <div className="upload-hint">Tap to add field photo (optional)<br/>Photo improves classification accuracy</div>
        }
        <input ref={fileRef} type="file" accept="image/*" capture="environment"
               style={{ display: 'none' }} onChange={handleFile} />
      </div>
      <div className="btn-row">
        <button className="btn btn-ghost" onClick={onBack}>← Back</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={!valid || loading}>
          {loading && <span className="spinner" />}
          {loading ? 'Analysing…' : (photo ? 'Analyse photo →' : 'Classify →')}
        </button>
      </div>
    </div>
  )
}
