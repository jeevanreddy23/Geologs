import React, { useState } from 'react';
import { Ruler, Edit3, Camera, Activity, FileText, CheckCircle, PlusCircle, AlertTriangle, Loader2 } from 'lucide-react';
import DiscontinuityBuilder from './DiscontinuityBuilder';

interface VerticalLoggingCanvasProps {
  photoUrl: string | null;
  visionData: any | null;
  logData: any[];
  setLogData: (data: any[]) => void;
  maxDepth?: number;
  isProcessing?: boolean;
}

const VerticalLoggingCanvas: React.FC<VerticalLoggingCanvasProps> = ({ 
  photoUrl, 
  visionData, 
  logData, 
  setLogData,
  maxDepth = 10,
  isProcessing = false
}) => {
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

  const pxPerMeter = 120; // 120px per meter for vertical scale
  const totalHeight = maxDepth * pxPerMeter;

  // Generate depth markers
  const depthMarkers = [];
  for (let i = 0; i <= maxDepth; i++) {
    depthMarkers.push(i);
  }

  return (
    <div className="flex h-full w-full bg-slate-950 overflow-hidden text-sm relative text-slate-300">
      
      {/* HEADER ROW FOR TRACKS */}
      <div className="absolute top-0 left-0 w-full h-12 bg-slate-900 border-b border-slate-800 flex items-center z-20 shadow-lg px-2">
        <div className="w-16 flex justify-center items-center font-bold text-slate-400 text-xs tracking-widest"><Ruler size={14} className="mr-1"/> DEPTH</div>
        <div className="w-48 flex justify-center items-center font-bold text-slate-400 text-xs tracking-widest border-l border-slate-800"><Camera size={14} className="mr-1"/> CORE PHOTO</div>
        <div className="flex-1 flex justify-center items-center font-bold text-slate-400 text-xs tracking-widest border-l border-slate-800"><Edit3 size={14} className="mr-1"/> LITHOLOGY & MATERIAL</div>
        <div className="w-40 flex justify-center items-center font-bold text-slate-400 text-xs tracking-widest border-l border-slate-800"><Activity size={14} className="mr-1"/> TCR / RQD</div>
        <div className="flex-1 flex justify-center items-center font-bold text-slate-400 text-xs tracking-widest border-l border-slate-800"><FileText size={14} className="mr-1"/> DISCONTINUITIES</div>
        <div className="w-24 flex justify-center items-center font-bold text-slate-400 text-xs tracking-widest border-l border-slate-800">STATUS</div>
      </div>

      {/* SCROLLABLE CANVAS AREA */}
      <div className="flex-1 overflow-y-auto mt-12 relative pb-24 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
        <div className="flex relative" style={{ height: `${totalHeight}px`, minWidth: '1000px' }}>
          
          {/* TRACK 1: Depth Ruler */}
          <div className="w-16 flex-shrink-0 bg-slate-900/50 border-r border-slate-800 relative z-0">
            {depthMarkers.map((m) => (
              <div 
                key={m} 
                className="absolute w-full flex items-end justify-end pr-2 border-b border-slate-700/50 text-slate-500 font-mono text-xs"
                style={{ top: 0, height: `${m * pxPerMeter}px` }}
              >
                {m.toFixed(1)}m
              </div>
            ))}
          </div>

          {/* TRACK 2: Core Photo */}
          <div className="w-48 flex-shrink-0 border-r border-slate-800 relative overflow-hidden bg-slate-900/20 p-2">
            {isProcessing ? (
               <div className="w-full h-full flex flex-col items-center justify-center text-cyan-500 border border-dashed border-cyan-900/50 rounded bg-slate-900/40">
                  <Loader2 size={32} className="mb-2 opacity-80 animate-spin" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 animate-pulse text-center px-2">Slicing & Stitching Core Box...</span>
               </div>
            ) : photoUrl ? (
              <div className="w-full h-full relative rounded overflow-hidden shadow-2xl border border-slate-700/50">
                 <img src={photoUrl} alt="Core" className="absolute top-0 left-0 w-full object-fill" style={{ height: '100%' }} />
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 border border-dashed border-slate-700 rounded bg-slate-900/30">
                <Camera size={32} className="mb-2 opacity-50" />
                <span className="text-xs uppercase tracking-widest">No Image</span>
              </div>
            )}
          </div>

          {/* TRACK 3: Lithology & Material */}
          <div className="flex-1 relative border-r border-slate-800 bg-slate-900/10">
            {logData.length === 0 && !isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-600 italic">Generate AI Draft to populate...</div>
            )}
            {logData.map((row, idx) => {
              const top = parseFloat(row.from) * pxPerMeter;
              const height = (parseFloat(row.to) - parseFloat(row.from)) * pxPerMeter;
              return (
                <div 
                  key={`litho-${idx}`} 
                  className="absolute w-full p-2 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                  style={{ top: `${top}px`, height: `${height}px` }}
                >
                  <div className="flex flex-col h-full bg-slate-900/80 rounded border border-slate-700/50 p-2 shadow-sm backdrop-blur-sm group">
                     <div className="flex justify-between items-center mb-1">
                        <input 
                          type="text" 
                          value={row.material} 
                          onChange={e => handleFieldChange(idx, 'material', e.target.value)}
                          className="bg-transparent font-bold text-cyan-400 outline-none w-1/2 uppercase tracking-wide text-xs"
                          placeholder="MATERIAL"
                        />
                        <div className="text-[10px] text-slate-500 font-mono font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {row.from}m - {row.to}m
                        </div>
                     </div>
                     <textarea 
                        value={row.description} 
                        onChange={e => handleFieldChange(idx, 'description', e.target.value)}
                        className="flex-1 bg-transparent outline-none text-slate-300 resize-none text-xs leading-relaxed"
                        placeholder="Detailed material description..."
                     />
                  </div>
                </div>
              );
            })}
          </div>

          {/* TRACK 4: TCR / RQD */}
          <div className="w-40 relative border-r border-slate-800 bg-slate-900/10">
            {logData.map((row, idx) => {
              const top = parseFloat(row.from) * pxPerMeter;
              const height = (parseFloat(row.to) - parseFloat(row.from)) * pxPerMeter;
              return (
                <div 
                  key={`runs-${idx}`} 
                  className="absolute w-full p-2 border-b border-slate-800/50 flex items-center justify-center"
                  style={{ top: `${top}px`, height: `${height}px` }}
                >
                  <div className="w-full flex flex-col space-y-2">
                    <div className="bg-slate-900/80 rounded border border-slate-700/50 p-2 shadow-sm backdrop-blur-sm">
                      <div className="flex justify-between items-center border-b border-slate-700/50 pb-1 mb-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">TCR</span>
                        <input 
                          type="text" 
                          value={row.tcr || ''} 
                          onChange={e => handleFieldChange(idx, 'tcr', e.target.value)} 
                          className="w-12 bg-slate-950 border border-slate-700 text-cyan-300 text-right outline-none rounded px-1 text-xs font-mono" 
                          placeholder="%"
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">RQD</span>
                        <input 
                          type="text" 
                          value={row.rqd || ''} 
                          onChange={e => handleFieldChange(idx, 'rqd', e.target.value)} 
                          className="w-12 bg-slate-950 border border-slate-700 text-fuchsia-400 text-right outline-none rounded px-1 text-xs font-mono" 
                          placeholder="%"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* TRACK 5: Discontinuities */}
          <div className="flex-1 relative border-r border-slate-800 bg-slate-900/10">
            {logData.map((row, idx) => {
              const top = parseFloat(row.from) * pxPerMeter;
              const height = (parseFloat(row.to) - parseFloat(row.from)) * pxPerMeter;
              return (
                <div 
                  key={`defects-${idx}`} 
                  className="absolute w-full p-2 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                  style={{ top: `${top}px`, height: `${height}px` }}
                >
                  <div className="flex flex-col h-full bg-slate-900/80 rounded border border-slate-700/50 p-2 shadow-sm backdrop-blur-sm relative group">
                    <textarea 
                      value={row.defects || ''} 
                      onChange={e => handleFieldChange(idx, 'defects', e.target.value)}
                      className="flex-1 bg-transparent outline-none text-rose-300 font-mono text-[11px] leading-relaxed resize-none"
                      placeholder="e.g. 2.4: JN 45 PR"
                    />
                    <button 
                      onClick={() => setActiveBuilderRow(idx)}
                      className="absolute bottom-2 right-2 text-[10px] bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 rounded py-1 px-2 flex items-center transition-colors"
                    >
                      <PlusCircle size={10} className="mr-1" /> Add Defect
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* TRACK 6: Status */}
          <div className="w-24 relative bg-slate-900/20">
            {logData.map((row, idx) => {
              const top = parseFloat(row.from) * pxPerMeter;
              const height = (parseFloat(row.to) - parseFloat(row.from)) * pxPerMeter;
              const isApproved = row.status === 'approved';
              return (
                <div 
                  key={`status-${idx}`} 
                  className="absolute w-full p-2 border-b border-slate-800/50 flex items-center justify-center"
                  style={{ top: `${top}px`, height: `${height}px` }}
                >
                  {isApproved ? (
                    <div className="flex flex-col items-center justify-center text-emerald-400">
                      <CheckCircle size={20} className="mb-1 opacity-80" />
                      <span className="text-[9px] uppercase font-bold tracking-widest">Approved</span>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleApproveRow(idx)}
                      className="flex flex-col items-center justify-center text-amber-500/80 hover:text-amber-400 transition-colors group"
                    >
                      <AlertTriangle size={20} className="mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] uppercase font-bold tracking-widest border border-amber-500/50 rounded px-1 group-hover:bg-amber-500/20">Review</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {activeBuilderRow !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <DiscontinuityBuilder 
            initialDepth={logData[activeBuilderRow]?.from?.toString() || ''}
            onSave={(code) => {
              const currentDefects = logData[activeBuilderRow].defects || '';
              const newDefects = currentDefects ? `${currentDefects}
${code}` : code;
              handleFieldChange(activeBuilderRow, 'defects', newDefects);
              setActiveBuilderRow(null);
            }}
            onClose={() => setActiveBuilderRow(null)}
          />
        </div>
      )}

    </div>
  );
};

export default VerticalLoggingCanvas;
