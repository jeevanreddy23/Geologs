// src/App.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Layers, 
  Camera, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  MapPin,
  Loader2,
  Terminal,
  Cpu,
  ShieldCheck,
  Search,
  Database,
  Send,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AGENTS = [
  { id: 'validation', name: 'Validation', icon: ShieldCheck },
  { id: 'photo', name: 'Photo Analyst', icon: Camera },
  { id: 'historical', name: 'Historical', icon: Search },
  { id: 'classifier', name: 'Geologist', icon: Activity },
  { id: 'compliance', name: 'Compliance', icon: AlertCircle },
  { id: 'qa', name: 'Peer Review', icon: CheckCircle2 },
  { id: 'summary', name: 'Executive', icon: FileText },
  { id: 'logger', name: 'DB Sync', icon: Database },
  { id: 'report', name: 'Reporter', icon: Layers },
  { id: 'dispatch', name: 'Dispatch', icon: Send },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'logs'>('dashboard');
  const [pipelineState, setPipelineState] = useState<'idle' | 'running' | 'success'>('idle');
  const [currentAgentIndex, setCurrentAgentIndex] = useState(-1);
  const [logs, setLogs] = useState<string[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    projectId: 'PRJ-2024-001',
    boreholeId: 'BH-01',
    depthFrom: '0.0',
    depthTo: '1.5',
    notes: 'Cohesive clay, medium plasticity.'
  });

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const runPipeline = async () => {
    setPipelineState('running');
    setLogs([]);
    addLog('🚀 Initializing Geotechnical Supervisor...');
    
    for (let i = 0; i < AGENTS.length; i++) {
      setCurrentAgentIndex(i);
      const agent = AGENTS[i];
      addLog(`🤖 Agent [${agent.name}] activated...`);
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
      addLog(`✅ Agent [${agent.name}] completed task.`);
    }

    setCurrentAgentIndex(-1);
    setPipelineState('success');
    addLog('✨ Pipeline completed successfully. AS 1726 compliance verified.');
  };

  return (
    <div className="min-h-screen bg-[#070709] text-white p-4 md:p-8 font-['Inter']">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-sky-500 p-3 rounded-2xl shadow-[0_0_20px_rgba(56,189,248,0.3)]">
              <Zap className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">GeoLogs <span className="text-sky-500">Pro</span></h1>
              <p className="text-slate-400 text-sm">Supervisor Orchestrated Pipeline v2.1</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-semibold text-emerald-400">Supervisor Active</span>
            </div>
            <button 
              onClick={runPipeline}
              disabled={pipelineState === 'running'}
              className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-sky-900/20"
            >
              {pipelineState === 'running' ? <Loader2 className="animate-spin" size={20} /> : <Activity size={20} />}
              Launch Pipeline
            </button>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Panel: Configuration */}
          <div className="lg:col-span-4 space-y-6">
            <section className="glass rounded-3xl p-8 space-y-6">
              <div className="flex items-center gap-2 text-sky-400 mb-2">
                <MapPin size={18} />
                <h2 className="font-bold uppercase tracking-wider text-sm">Interval Config</h2>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-widest">Project ID</label>
                  <input className="input-field" value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-widest">Borehole</label>
                  <input className="input-field" value={formData.boreholeId} onChange={e => setFormData({...formData, boreholeId: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-widest">From (m)</label>
                  <input className="input-field" type="number" value={formData.depthFrom} onChange={e => setFormData({...formData, depthFrom: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-widest">To (m)</label>
                  <input className="input-field" type="number" value={formData.depthTo} onChange={e => setFormData({...formData, depthTo: e.target.value})} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-widest">Field Notes</label>
                <textarea 
                  className="input-field min-h-[100px] resize-none" 
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                />
              </div>
            </section>

            {/* Quick Status */}
            <div className="glass rounded-3xl p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 rounded-2xl">
                  <Cpu className="text-amber-500" size={24} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">System Load</p>
                  <p className="text-xl font-bold">12% <span className="text-xs font-normal text-slate-500">Normal</span></p>
                </div>
              </div>
              <Activity size={32} className="text-slate-800" />
            </div>
          </div>

          {/* Right Panel: Swarm Visualization */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Tabs */}
            <div className="flex bg-black/40 p-1 rounded-2xl w-fit border border-white/5">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Agent Swarm
              </button>
              <button 
                onClick={() => setActiveTab('logs')}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'logs' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Director Logs
              </button>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' ? (
                <motion.div 
                  key="grid"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
                >
                  {AGENTS.map((agent, index) => {
                    const isActive = currentAgentIndex === index;
                    const isDone = currentAgentIndex > index || pipelineState === 'success';
                    
                    return (
                      <div 
                        key={agent.id} 
                        className={`agent-node ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
                      >
                        <div className="agent-icon-container">
                          <agent.icon size={24} />
                        </div>
                        <span className={`text-xs font-bold text-center uppercase tracking-wider ${isActive ? 'text-sky-400' : isDone ? 'text-emerald-400' : 'text-slate-600'}`}>
                          {agent.name}
                        </span>
                        {isActive && <div className="pulse"></div>}
                        {isDone && <CheckCircle2 className="text-emerald-500" size={14} />}
                      </div>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div 
                  key="logs"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="glass rounded-3xl p-6 h-[450px] flex flex-col"
                >
                  <div className="flex items-center gap-2 text-slate-400 mb-4 border-b border-white/5 pb-4">
                    <Terminal size={18} />
                    <span className="text-xs font-bold uppercase tracking-widest">Swarm Execution Stream</span>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-2 font-mono text-sm scrollbar-thin">
                    {logs.length === 0 && <p className="text-slate-600 italic">Waiting for pipeline launch...</p>}
                    {logs.map((log, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="text-sky-500/50 shrink-0">~</span>
                        <p className={log.includes('✅') ? 'text-emerald-400' : log.includes('🤖') ? 'text-sky-300' : 'text-slate-400'}>{log}</p>
                      </div>
                    ))}
                    <div ref={terminalEndRef} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success Overlay */}
            {pipelineState === 'success' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6"
              >
                <div className="flex items-center gap-6">
                  <div className="bg-emerald-500 p-4 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                    <ShieldCheck className="text-white" size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-emerald-400">Analysis Finalized</h3>
                    <p className="text-slate-400">USCS Code: <span className="text-white font-bold">CH</span> | Quality Score: <span className="text-white font-bold">98/100</span></p>
                  </div>
                </div>
                <button className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-slate-200 transition-all">
                  Download Report
                </button>
              </motion.div>
            )}
          </div>
        </main>

        {/* Footer Stats */}
        <footer className="pt-8 border-t border-white/5 flex flex-wrap gap-12 justify-center lg:justify-start">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Compliance</p>
            <p className="text-sm font-bold">AS 1726-2017</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Model</p>
            <p className="text-sm font-bold">GPT-4o-vision</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Swarm Nodes</p>
            <p className="text-sm font-bold">10 Active</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Memory</p>
            <p className="text-sm font-bold">PostgreSQL Vector</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;