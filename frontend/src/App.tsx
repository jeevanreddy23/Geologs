import { useState, useRef } from 'react';
import VerticalLoggingCanvas from './components/VerticalLoggingCanvas';
import { Upload, FileDown, Wand2, X, Settings2, FolderOpen, Loader2 } from 'lucide-react';
import './App.css';

function App() {
  const [projectData, setProjectData] = useState({ client: '', boreholeId: '' });
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [visionData, setVisionData] = useState<any | null>(null);
  const [logData, setLogData] = useState<any[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: any) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setIsProcessing(true);
    setPhotoData(null); // Clear previous

    const formData = new FormData();
    formData.append('photo', file);
    
    try {
      // 1. Upload
      const uploadRes = await fetch('http://localhost:8000/api/v1/core/upload', {
        method: 'POST',
        body: formData
      });
      const uploadData = await uploadRes.json();
      
      if (uploadData.status === 'success') {
         // 2. Stitch visually
         const stitchRes = await fetch('http://localhost:8000/api/v1/core/stitch', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             photo_path: uploadData.photo_path,
             num_rows: 4
           })
         });
         const stitchData = await stitchRes.json();
         setPhotoData(stitchData.stitched_photo_url);

         // 3. Process vision data (legacy pipeline for boxes if needed, or we just mock for now)
         const processRes = await fetch('http://localhost:8000/api/v1/core/process', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             photo_path: uploadData.photo_path,
             depth_from: 0,
             depth_to: 10,
             rows: []
           })
         }).catch(() => null);
         
         if (processRes && processRes.ok) {
             const processData = await processRes.json();
             setVisionData(processData.vision_data || { rows: [] });
         } else {
             setVisionData({ rows: [] });
         }
      }
    } catch (err) {
      console.error('Failed to process image:', err);
      alert('Failed to upload and stitch image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const generateDraft = async () => {
    if (!visionData) return alert("Upload and process an image first");
    try {
        const res = await fetch('http://localhost:8000/api/v1/core/generate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            borehole_id: projectData.boreholeId || 'BH-01',
            project_no: projectData.client || 'P-123',
            depth_from: 0,
            depth_to: 10,
            runs: visionData.rows,
            rock_type: { value: 'SEDIMENTARY ROCK' }
        })
        });
        const draft = await res.json();
        if (draft.lithology_units) {
        setLogData(draft.lithology_units.map((unit: any, i: number) => ({
            ...unit,
            status: unit.status || 'draft',
            tcr: draft.core_recovery?.[i]?.tcr || '',
            rqd: draft.core_recovery?.[i]?.rqd || '',
            defects: draft.discontinuities?.[i]?.notes || ''
        })));
        }
    } catch (err) {
        console.error("Failed to generate draft", err);
    }
  };

  const generatePDF = async () => {
    try {
        const payload = {
            project: projectData,
            borehole: { id: projectData.boreholeId || 'BH-01' },
            lithology_units: logData,
            discontinuities: [],
            core_runs: []
        };
        const res = await fetch('http://localhost:8000/api/v1/pdf/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
        });
        if (res.ok) {
            const data = await res.json();
            setPdfUrl(`http://localhost:8000${data.pdf_url}`);
            setIsPdfModalOpen(true);
        } else {
            alert("Failed to generate PDF");
        }
    } catch (e) {
        console.error("PDF generation error", e);
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200 overflow-hidden font-sans">
      
      {/* LEFT SIDEBAR: Tools & Metadata */}
      <div className="w-72 flex flex-col border-r border-slate-800 bg-slate-950 z-30 shadow-2xl">
        
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-900/50">
            <div className="w-6 h-6 rounded bg-cyan-500 mr-3 flex items-center justify-center">
                <div className="w-3 h-3 bg-slate-950 rounded-sm"></div>
            </div>
            <h1 className="text-lg font-bold tracking-widest text-slate-100">AUTOSOIL</h1>
        </div>

        {/* Global Controls */}
        <div className="p-6 border-b border-slate-800/50">
            <h2 className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-4 flex items-center"><FolderOpen size={12} className="mr-2"/> Project Info</h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Client / Project</label>
                    <input 
                        type="text" 
                        value={projectData.client}
                        onChange={(e) => setProjectData({...projectData, client: e.target.value})}
                        className="w-full bg-slate-900/50 border border-slate-700/50 focus:border-cyan-500/50 rounded p-2 text-sm outline-none transition-colors" 
                        placeholder="e.g. Kore Mining"
                    />
                </div>
                <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Borehole ID</label>
                    <input 
                        type="text" 
                        value={projectData.boreholeId}
                        onChange={(e) => setProjectData({...projectData, boreholeId: e.target.value})}
                        className="w-full bg-slate-900/50 border border-slate-700/50 focus:border-cyan-500/50 rounded p-2 text-sm outline-none transition-colors" 
                        placeholder="e.g. BH-01"
                    />
                </div>
            </div>
        </div>

        {/* Action Toolbox */}
        <div className="flex-1 p-6">
            <h2 className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-4 flex items-center"><Settings2 size={12} className="mr-2"/> Workflows</h2>
            <div className="space-y-3">
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*" />
                
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-lg border border-slate-700/50 transition-all group shadow-sm disabled:opacity-50"
                >
                    {isProcessing ? <Loader2 size={16} className="animate-spin text-cyan-400" /> : <Upload size={16} className="text-slate-400 group-hover:text-slate-200 transition-colors" />}
                    <span className="text-sm font-semibold tracking-wide">
                        {isProcessing ? "Processing Box..." : "Upload Core Box"}
                    </span>
                </button>

                <button 
                    onClick={generateDraft}
                    disabled={!visionData || isProcessing}
                    className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white py-3 rounded-lg transition-all shadow-lg shadow-cyan-900/20"
                >
                    <Wand2 size={16} />
                    <span className="text-sm font-semibold tracking-wide">Generate AI Draft</span>
                </button>

                <div className="pt-6 mt-6 border-t border-slate-800/50">
                    <button 
                        onClick={generatePDF}
                        disabled={logData.length === 0}
                        className="w-full flex items-center justify-center space-x-2 bg-slate-100 hover:bg-white text-slate-900 disabled:bg-slate-800 disabled:text-slate-600 py-3 rounded-lg transition-all shadow-md"
                    >
                        <FileDown size={16} />
                        <span className="text-sm font-bold tracking-wide">Export OpenGround PDF</span>
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* MAIN CANVAS */}
      <div className="flex-1 relative bg-slate-950 overflow-hidden">
        <VerticalLoggingCanvas 
            photoUrl={photoData} 
            visionData={visionData} 
            logData={logData} 
            setLogData={setLogData} 
            maxDepth={10} 
            isProcessing={isProcessing}
        />
      </div>

      {/* PDF PREVIEW SLIDE-OVER MODAL */}
      {isPdfModalOpen && (
        <div className="absolute inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm">
            <div className="w-[800px] h-full bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col transform transition-transform duration-300">
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                    <h2 className="text-lg font-bold tracking-wider text-slate-200 flex items-center">
                        <FileText className="mr-2 text-cyan-500" size={20} />
                        Live PDF Preview
                    </h2>
                    <button 
                        onClick={() => setIsPdfModalOpen(false)}
                        className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-200 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>
                <div className="flex-1 bg-slate-950 p-6 overflow-hidden">
                    {pdfUrl ? (
                        <iframe src={pdfUrl} className="w-full h-full border border-slate-700 rounded-lg shadow-inner bg-white" title="PDF Preview" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">Loading...</div>
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
}

export default App;
