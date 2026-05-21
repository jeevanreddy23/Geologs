import React from "react";
import { 
  ShieldCheck, 
  Camera, 
  History, 
  BrainCircuit, 
  CheckCircle2, 
  AlertTriangle,
  FileText,
  Save,
  Printer,
  SendHorizontal
} from "lucide-react";

const AGENTS = [
  { id: "validation", name: "Validation", icon: ShieldCheck, desc: "AS 1726 Integrity" },
  { id: "photo", name: "Photo AI", icon: Camera, desc: "Vision Analysis" },
  { id: "historical", name: "Historical", icon: History, desc: "Offset Context" },
  { id: "classifier", name: "Classifier", icon: BrainCircuit, desc: "USCS Mapping" },
  { id: "compliance", name: "Compliance", icon: CheckCircle2, desc: "Regulatory Check" },
  { id: "qa", name: "Quality Assurance", icon: AlertTriangle, desc: "Verification" },
  { id: "summary", name: "Summary", icon: FileText, desc: "Executive Intel" },
  { id: "logger", name: "Logger", icon: Save, desc: "Data Persistance" },
  { id: "report", name: "Reporter", icon: Printer, desc: "PDF Engine" },
  { id: "dispatch", name: "Dispatch", icon: SendHorizontal, desc: "Stakeholder Notification" },
];

export default function SwarmDashboard({ activeAgent = "validation", completedAgents = [] }) {
  return (
    <div className="swarm-card card">
      <div className="card-header">
        <h3 className="text-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BrainCircuit size={20} className="text-gold" />
          Agent Swarm Intelligence
        </h3>
        <span className="badge badge-success">Swarm Active</span>
      </div>
      <div className="swarm-grid">
        {AGENTS.map((agent) => {
          const isActive = activeAgent === agent.id;
          const isCompleted = completedAgents.includes(agent.id);
          
          return (
            <div 
              key={agent.id} 
              className={`agent-node ${isActive ? "pulse" : ""} ${isCompleted ? "completed" : ""}`}
            >
              <div className="agent-icon-wrapper">
                <agent.icon size={20} />
              </div>
              <div className="agent-info">
                <span className="agent-name">{agent.name}</span>
                <span className="agent-desc">{agent.desc}</span>
              </div>
              {isCompleted && <div className="status-dot success"></div>}
              {isActive && <div className="status-dot warning"></div>}
            </div>
          );
        })}
      </div>
      <style>{`
        .swarm-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }
        .agent-node {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.3s ease;
          position: relative;
        }
        .agent-node.pulse {
          border-color: var(--accent-gold);
          box-shadow: 0 0 15px rgba(234, 179, 8, 0.2);
          background: rgba(234, 179, 8, 0.05);
        }
        .agent-node.completed {
          border-color: var(--accent-green);
          background: rgba(16, 185, 129, 0.05);
        }
        .agent-icon-wrapper {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          color: var(--text-secondary);
        }
        .completed .agent-icon-wrapper { color: var(--accent-green); }
        .pulse .agent-icon-wrapper { color: var(--accent-gold); }
        
        .agent-info { display: flex; flex-direction: column; }
        .agent-name { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); }
        .agent-desc { font-size: 0.7rem; color: var(--text-secondary); }
        
        .status-dot {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        .status-dot.success { background: var(--accent-green); }
        .status-dot.warning { background: var(--accent-gold); animation: blink 1s infinite; }
        
        @keyframes blink {
          0% { opacity: 1; }
          50% { opacity: 0.3; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
