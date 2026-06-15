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

  const preview = `${depth}: ${defectType}${angle ? ` -${angle}deg` : ''} ${shape} ${roughness} ${infilling}`;

  const handleSave = () => {
    onSave(preview);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/25 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300">
      <div className="glass rounded-lg w-96 max-w-full overflow-hidden transform transition-all">
        <div className="flex justify-between items-center p-3 border-b border-slate-200 bg-slate-50 rounded-t-lg">
          <h3 className="font-bold text-slate-900">Discontinuity Builder</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900" aria-label="Close discontinuity builder">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3 text-sm text-slate-800">
          <div className="flex space-x-2">
            <div className="flex-1">
              <label className="block text-slate-500 mb-1 font-bold text-[11px] uppercase tracking-wider">Depth (m)</label>
              <input
                type="text"
                value={depth}
                onChange={e => setDepth(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded p-1.5 text-slate-900 outline-none focus:border-sky-600"
              />
            </div>
            <div className="flex-1">
              <label className="block text-slate-500 mb-1 font-bold text-[11px] uppercase tracking-wider">Angle (deg)</label>
              <input
                type="text"
                value={angle}
                onChange={e => setAngle(e.target.value)}
                placeholder="e.g. 45"
                className="w-full bg-white border border-slate-200 rounded p-1.5 text-slate-900 outline-none focus:border-sky-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-500 mb-1 font-bold text-[11px] uppercase tracking-wider">Defect Type</label>
            <select
              value={defectType}
              onChange={e => setDefectType(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded p-1.5 text-slate-900 outline-none focus:border-sky-600"
            >
              {types.map(t => <option key={t.code} value={t.code}>{t.code} - {t.label}</option>)}
            </select>
          </div>

          <div className="flex space-x-2">
            <div className="flex-1">
              <label className="block text-slate-500 mb-1 font-bold text-[11px] uppercase tracking-wider">Shape</label>
              <select
                value={shape}
                onChange={e => setShape(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded p-1.5 text-slate-900 outline-none focus:border-sky-600"
              >
                {shapes.map(t => <option key={t.code} value={t.code}>{t.code} - {t.label}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-slate-500 mb-1 font-bold text-[11px] uppercase tracking-wider">Roughness</label>
              <select
                value={roughness}
                onChange={e => setRoughness(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded p-1.5 text-slate-900 outline-none focus:border-sky-600"
              >
                {roughnesses.map(t => <option key={t.code} value={t.code}>{t.code} - {t.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-500 mb-1 font-bold text-[11px] uppercase tracking-wider">Infilling/Condition</label>
            <select
              value={infilling}
              onChange={e => setInfilling(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded p-1.5 text-slate-900 outline-none focus:border-sky-600"
            >
              {infillings.map(t => <option key={t.code} value={t.code}>{t.code} - {t.label}</option>)}
            </select>
          </div>

          <div className="pt-2">
            <p className="text-slate-500 text-xs mb-2">Preview: <span className="text-slate-950 font-mono">{preview}</span></p>
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
