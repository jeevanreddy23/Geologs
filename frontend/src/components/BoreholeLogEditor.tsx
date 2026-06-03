import React, { useState } from 'react';
import DiscontinuityBuilder from './DiscontinuityBuilder';

interface BoreholeLogEditorProps {
  logData: any[];
  setLogData: (data: any[]) => void;
}

const BoreholeLogEditor: React.FC<BoreholeLogEditorProps> = ({ logData, setLogData }) => {
  const [activeBuilderRow, setActiveBuilderRow] = useState<number | null>(null);

  const handleFieldChange = (index: number, field: string, value: string) => {
    const newData = [...logData];
    newData[index] = { ...newData[index], [field]: value };
    setLogData(newData);
  };

  const handleApproveRow = (index: number) => {
    const newData = [...logData];
    newData[index] = { ...newData[index], status: 'approved' };
    setLogData(newData);
  };

  const getStatusColor = (status: string) => {
    if (status === 'approved') return 'bg-emerald-900/20 border-emerald-700/50 text-emerald-100 shadow-[inset_0_0_10px_rgba(16,185,129,0.1)]';
    if (status === 'error') return 'bg-red-900/30 border-red-700/50 text-red-100 shadow-[inset_0_0_10px_rgba(239,68,68,0.1)]';
    return 'bg-amber-900/20 border-amber-700/50 text-amber-100 shadow-[inset_0_0_10px_rgba(245,158,11,0.1)]'; // Default draft
  };

  return (
    <div className="flex-1 overflow-auto border border-slate-600 bg-slate-800 rounded">
      <table className="w-full text-xs text-left text-slate-300 min-w-max">
        <thead className="bg-slate-700 sticky top-0 z-10 shadow-sm">
          <tr>
            <th className="p-2 border-r border-slate-600">From</th>
            <th className="p-2 border-r border-slate-600">To</th>
            <th className="p-2 border-r border-slate-600">Material</th>
            <th className="p-2 border-r border-slate-600">Description</th>
            <th className="p-2 border-r border-slate-600">TCR/RQD</th>
            <th className="p-2 border-r border-slate-600">Defects</th>
            <th className="p-2 w-24 text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          {logData.length === 0 ? (
            <tr><td colSpan={7} className="p-4 text-center text-slate-500">No AI draft generated yet.</td></tr>
          ) : (
            logData.map((row, idx) => (
              <tr key={idx} className={`border-b border-slate-700/50 transition-all duration-700 ease-in-out ${getStatusColor(row.status)} hover:bg-slate-800/80`}>
                <td className="p-1 border-r border-slate-600/50">
                  <input 
                    type="number" 
                    value={row.from} 
                    onChange={e => handleFieldChange(idx, 'from', e.target.value)}
                    className="w-16 bg-transparent outline-none p-1"
                  />
                </td>
                <td className="p-1 border-r border-slate-600/50">
                  <input 
                    type="number" 
                    value={row.to} 
                    onChange={e => handleFieldChange(idx, 'to', e.target.value)}
                    className="w-16 bg-transparent outline-none p-1"
                  />
                </td>
                <td className="p-1 border-r border-slate-600/50">
                  <input 
                    type="text" 
                    value={row.material} 
                    onChange={e => handleFieldChange(idx, 'material', e.target.value)}
                    className="w-24 bg-transparent outline-none p-1 font-bold"
                  />
                </td>
                <td className="p-1 border-r border-slate-600/50">
                  <textarea 
                    value={row.description} 
                    onChange={e => handleFieldChange(idx, 'description', e.target.value)}
                    className="w-full bg-transparent outline-none p-1 resize-y min-h-[40px]"
                  />
                </td>
                <td className="p-1 border-r border-slate-600/50">
                  <div className="flex flex-col text-[10px]">
                    <div className="flex justify-between border-b border-slate-600/30 pb-1 mb-1">
                      <span className="text-slate-400">TCR:</span>
                      <input type="text" value={row.tcr || ''} onChange={e => handleFieldChange(idx, 'tcr', e.target.value)} className="w-8 bg-transparent text-right outline-none" />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">RQD:</span>
                      <input type="text" value={row.rqd || ''} onChange={e => handleFieldChange(idx, 'rqd', e.target.value)} className="w-8 bg-transparent text-right outline-none" />
                    </div>
                  </div>
                </td>
                <td className="p-1 border-r border-slate-600/50 align-top">
                  <div className="flex flex-col space-y-1">
                    <input 
                      type="text" 
                      value={row.defects || ''} 
                      onChange={e => handleFieldChange(idx, 'defects', e.target.value)}
                      className="w-full bg-slate-900/50 rounded px-1 py-1 outline-none font-mono text-[10px]"
                      placeholder="e.g. 2.4: JN 45 PR"
                    />
                    <button 
                      onClick={() => setActiveBuilderRow(idx)}
                      className="text-[10px] bg-slate-700 hover:bg-slate-600 rounded py-0.5 px-2 w-fit text-slate-300"
                    >
                      + Builder
                    </button>
                  </div>
                </td>
                <td className="p-1 text-center align-middle">
                  {row.status === 'approved' ? (
                    <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px]">Approved</span>
                  ) : (
                    <button 
                      onClick={() => handleApproveRow(idx)}
                      className="btn-success text-[10px] uppercase tracking-wider font-bold py-1 px-3 rounded shadow"
                    >
                      Approve
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {activeBuilderRow !== null && (
        <DiscontinuityBuilder 
          initialDepth={logData[activeBuilderRow]?.from?.toString() || ''}
          onSave={(code) => {
            const currentDefects = logData[activeBuilderRow].defects || '';
            const newDefects = currentDefects ? `${currentDefects}\n${code}` : code;
            handleFieldChange(activeBuilderRow, 'defects', newDefects);
            setActiveBuilderRow(null);
          }}
          onClose={() => setActiveBuilderRow(null)}
        />
      )}
    </div>
  );
};

export default BoreholeLogEditor;
