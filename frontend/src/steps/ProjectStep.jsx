// frontend/src/steps/ProjectStep.jsx
export default function ProjectStep({ project, setProject, onNext }) {
  const valid = project.id && project.name && project.boreholeId
  return (
    <div className="card">
      <h2>Project details</h2>
      <p className="sub">Set once per field session</p>
      <div className="field">
        <label>Project ID</label>
        <input placeholder="e.g. PROJ-2024-001" value={project.id}
          onChange={e => setProject(p => ({ ...p, id: e.target.value }))} />
      </div>
      <div className="field">
        <label>Project name</label>
        <input placeholder="e.g. Greenfield Road Development" value={project.name}
          onChange={e => setProject(p => ({ ...p, name: e.target.value }))} />
      </div>
      <div className="field">
        <label>Borehole ID</label>
        <input placeholder="e.g. BH-04" value={project.boreholeId}
          onChange={e => setProject(p => ({ ...p, boreholeId: e.target.value }))} />
      </div>
      <div className="btn-row">
        <span />
        <button className="btn btn-primary" onClick={onNext} disabled={!valid}>
          Start logging →
        </button>
      </div>
    </div>
  )
}
