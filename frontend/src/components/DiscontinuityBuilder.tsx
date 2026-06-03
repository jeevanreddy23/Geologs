import React, { useState } from 'react';
import { X } from 'lucide-react';

interface DiscontinuityBuilderProps {
  initialDepth: string;
  onSave: (codeStr: string) => void;
  onClose: () => void;
}

const DiscontinuityBuilder: React.FC<DiscontinuityBuilderProps> = ({ initialDepth, onSave, onClose }) => {
  const [depth, setDepth] = useState(initialDepth);
  const [defectType, setDefectType] = useState('JN');
  const [angle, setAngle] = useState('');
  const [shape, setShape] = useState('PR');
  const [roughness, setRoughness] = useState('RO');
  const [infilling, setInfilling] = useState('CN');

  const types = [
    { code: 'BP', label: 'Bedding Plane' },
    { code: 'JN', label: 'Joint' },
    { code: 'CS', label: 'Clay Seam' },
    { code: 'SZ', label: 'Shear Zone' },
    { code: 'DB', label: 'Drilling Break' },
    { code: 'HB', label: 'Handling Break' },
    { code: 'VN', label: 'Vein' }
  ];

  const shapes = [
    { code: 'PR', label: 'Planar' },
    { code: 'CU', label: 'Curved' },
    { code: 'IR', label: 'Irregular' }
  ];

  const roughnesses = [
    { code: 'RO', label: 'Rough' },
    { code: 'SM', label: 'Smooth' }
  ];

  const infillings = [
    { code: 'CN', label: 'Clean' },
    { code: 'SN', label: 'Stained' },
    { code: 'VN', label: 'Veneer' }
  ];

  const handleSave = () => {
    // Generate the standard format: e.g. "8.42: BP -5° PR RO SN"
    const angStr = angle ? ` -${angle}°` : '';
    const output = `${depth}: ${defectType}${angStr} ${shape} ${roughness} ${infilling}`;
    onSave(output);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300">
      <div className="glass border border-slate-600 rounded-xl shadow-2xl w-96 max-w-full overflow-hidden transform transition-all">
        <div className="flex justify-between items-center p-3 border-b border-slate-700 bg-slate-900 rounded-t-lg">
          <h3 className="font-bold text-slate-200">Discontinuity Builder</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>
        
        <div className="p-4 space-y-3 text-sm">
          <div className="flex space-x-2">
            <div className="flex-1">
              <label className="block text-slate-400 mb-1">Depth (m)</label>
              <input 
                type="text" 
                value={depth} 
                onChange={e => setDepth(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white" 
              />
            </div>
            <div className="flex-1">
              <label className="block text-slate-400 mb-1">Angle (deg)</label>
              <input 
                type="text" 
                value={angle} 
                onChange={e => setAngle(e.target.value)}
                placeholder="e.g. 45"
                className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white" 
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Defect Type</label>
            <select 
              value={defectType} 
              onChange={e => setDefectType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white"
            >
              {types.map(t => <option key={t.code} value={t.code}>{t.code} - {t.label}</option>)}
            </select>
          </div>

          <div className="flex space-x-2">
            <div className="flex-1">
              <label className="block text-slate-400 mb-1">Shape</label>
              <select 
                value={shape} 
                onChange={e => setShape(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white"
              >
                {shapes.map(t => <option key={t.code} value={t.code}>{t.code} - {t.label}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-slate-400 mb-1">Roughness</label>
              <select 
                value={roughness} 
                onChange={e => setRoughness(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white"
              >
                {roughnesses.map(t => <option key={t.code} value={t.code}>{t.code} - {t.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Infilling/Condition</label>
            <select 
              value={infilling} 
              onChange={e => setInfilling(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white"
            >
              {infillings.map(t => <option key={t.code} value={t.code}>{t.code} - {t.label}</option>)}
            </select>
          </div>
          
          <div className="pt-2">
            <p className="text-slate-400 text-xs mb-2">Preview: <span className="text-white font-mono">{`${depth}: ${defectType}${angle ? ` -${angle}°` : ''} ${shape} ${roughness} ${infilling}`}</span></p>
            <button 
              onClick={handleSave}
              className="w-full btn-primary py-2 rounded font-medium justify-center"
            >
              Insert Code
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscontinuityBuilder;
