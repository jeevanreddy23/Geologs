// src/App.tsx
import React, { useState } from 'react';
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
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const App: React.FC = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    projectId: 'PRJ-2024-001',
    boreholeId: 'BH-01',
    depthFrom: '0.0',
    depthTo: '1.5',
    color: '',
    moisture: '',
    consistency: '',
  });

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    setLoading(true);
    // Simulate API call to backend/api/v1/log-interval
    await new Promise(r => setTimeout(r, 3000));
    setLoading(false);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setStep(1);
    }, 4000);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-4xl w-full glass rounded-3xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Sidebar */}
        <div className="md:w-1/3 bg-slate-900/50 p-8 border-b md:border-b-0 md:border-r border-slate-700">
          <div className="flex items-center gap-3 mb-12">
            <div className="bg-sky-500 p-2 rounded-xl">
              <Activity className="text-white" size={24} />
            </div>
            <h2 className="text-2xl font-bold gradient-text">AutoSoil</h2>
          </div>

          <div className="space-y-8">
            {[
              { id: 1, label: 'Location Info', icon: MapPin },
              { id: 2, label: 'Visual Descriptors', icon: Camera },
              { id: 3, label: 'Swarm Review', icon: Layers },
            ].map((item) => (
              <div key={item.id} className={`flex items-center gap-4 ${step === item.id ? 'text-sky-400' : 'text-slate-500'}`}>
                <div className={`p-2 rounded-lg ${step === item.id ? 'bg-sky-500/10' : 'bg-transparent'}`}>
                  <item.icon size={20} />
                </div>
                <span className="font-medium">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-12 text-xs text-slate-500 flex items-center gap-2">
            <CheckCircle2 size={12} className="text-emerald-500" />
            AS 1726:2017 Compliant Pipeline
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 md:p-12 relative">
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col items-center justify-center text-center space-y-4"
              >
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={48} className="text-emerald-500" />
                </div>
                <h3 className="text-2xl font-bold">Layer Logged!</h3>
                <p className="text-slate-400">Swarm agents have classified and verified the interval.</p>
              </motion.div>
            ) : (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {step === 1 && (
                  <>
                    <h3 className="text-3xl font-bold">Project Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400">Project ID</label>
                        <input className="input-field" value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400">Borehole</label>
                        <input className="input-field" value={formData.boreholeId} onChange={e => setFormData({...formData, boreholeId: e.target.value})} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400">From (m)</label>
                        <input className="input-field" type="number" step="0.1" value={formData.depthFrom} onChange={e => setFormData({...formData, depthFrom: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400">To (m)</label>
                        <input className="input-field" type="number" step="0.1" value={formData.depthTo} onChange={e => setFormData({...formData, depthTo: e.target.value})} />
                      </div>
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <h3 className="text-3xl font-bold">Field Observation</h3>
                    <div className="space-y-4">
                      <div className="bg-sky-500/5 border border-dashed border-sky-500/30 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-sky-500/10 transition-colors">
                        <Camera size={40} className="text-sky-500" />
                        <span className="text-slate-400">Upload core photo for AI vision analysis</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input placeholder="Colour" className="input-field" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} />
                        <input placeholder="Moisture" className="input-field" value={formData.moisture} onChange={e => setFormData({...formData, moisture: e.target.value})} />
                        <input placeholder="Consistency" className="input-field" value={formData.consistency} onChange={e => setFormData({...formData, consistency: e.target.value})} />
                      </div>
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <h3 className="text-3xl font-bold">Swarm Verification</h3>
                    <p className="text-slate-400">The multi-agent pipeline will now classify the soil and run QA checks against Australian Standard 1726.</p>
                    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="bg-amber-500/20 p-2 rounded-lg">
                          <AlertCircle className="text-amber-500" size={20} />
                        </div>
                        <div>
                          <p className="font-medium text-amber-200">Consistency Validation</p>
                          <p className="text-xs text-slate-400">Checking cohesive properties based on visual photo analysis...</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="bg-sky-500/20 p-2 rounded-lg">
                          <FileText className="text-sky-400" size={20} />
                        </div>
                        <div>
                          <p className="font-medium text-sky-200">Automated Logging</p>
                          <p className="text-xs text-slate-400">Drafting log entries in real-time...</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex gap-4 pt-8">
                  {step > 1 && (
                    <button onClick={prevStep} className="px-6 py-3 rounded-xl border border-slate-700 font-semibold hover:bg-slate-800 transition-colors">
                      Back
                    </button>
                  )}
                  <button 
                    onClick={step === 3 ? handleSubmit : nextStep} 
                    className="btn-primary flex-1 justify-center"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <>
                        {step === 3 ? 'Process with Swarm' : 'Continue'}
                        <ChevronRight size={20} />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default App;
