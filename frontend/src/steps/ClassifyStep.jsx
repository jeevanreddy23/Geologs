// frontend/src/steps/ClassifyStep.jsx
export default function ClassifyStep({ layer, project, interval, onNext, onBack }) {
  if (!layer) return (
    <div className="card">
      <h2>Classify</h2>
      <p className="sub">No classification result yet — go back to Capture.</p>
      <div className="btn-row">
        <button className="btn btn-ghost" onClick={onBack}>← Back</button>
      </div>
    </div>
  )

  const qaScore = layer._classifier_confidence ?? null
  const qaPassed = qaScore == null || qaScore >= 0.7

  return (
    <div className="card">
      <h2>Classification result</h2>
      <p className="sub">
        {project.boreholeId} — {interval.depthFrom}m to {interval.depthTo}m
        {' '}· Review and confirm
      </p>
      {qaScore != null && (
        <div className={`qa-badge ${qaPassed ? 'qa-pass' : 'qa-fail'}`}>
          {qaPassed ? '✓' : '⚠'} QA score: {(qaScore * 100).toFixed(0)}%
        </div>
      )}
      <div style={{ marginTop: '16px' }}>
        {[
          ['USCS code', layer.uscs_code],
          ['Description', layer.description],
          ['Colour', layer.colour],
          ['Moisture', layer.moisture],
          ['Consistency', layer.consistency],
          ['Structure', layer.structure || '—'],
          ['Inclusions', layer.inclusions || '—'],
        ].map(([key, val]) => (
          <div key={key} className="layer-field">
            <span className="key">{key}</span>
            <span className="val">{val}</span>
          </div>
        ))}
      </div>
      <div className="btn-row">
        <button className="btn btn-ghost" onClick={onBack}>← Re-capture</button>
        <button className="btn btn-primary" onClick={onNext}>Log this interval →</button>
      </div>
    </div>
  )
}
