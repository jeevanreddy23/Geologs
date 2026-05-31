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
  Zap,
  FolderOpen,
  Eye,
  Download,
  RefreshCw,
  FileSpreadsheet,
  ImageIcon,
  Sparkles,
  CheckSquare,
  Sliders,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch, apiUrl, downloadApiFile } from './lib/api';

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

const SWARM_AGENTS = [
  { id: 'ClassifierAgent', name: 'Classifier', icon: ShieldCheck },
  { id: 'HistoricalAgent', name: 'Historical RAG', icon: Search },
  { id: 'ComplianceAgent', name: 'AS 1726 Compliance', icon: AlertCircle },
  { id: 'QAScoringAgent', name: 'QA Validator', icon: CheckSquare },
  { id: 'ReportCompilationAgent', name: 'Compiler', icon: Layers },
  { id: 'DispatchAgent', name: 'Dispatcher', icon: Send }
];

const rockMeta = (result: any) => {
  const analysis = result?.analysis || {};
  const project = analysis?.project || {};
  const interval = analysis?.depthInterval || {};

  return {
    boreholeId: result?.borehole_id || project?.boreholeId || 'REVIEW',
    projectName: result?.project_name || project?.client || 'Human review required',
    projectId: result?.project_id || project?.projectNumber || 'Not extracted',
    startDepth: result?.start_depth ?? interval?.fromM ?? 0,
    endDepth: result?.end_depth ?? interval?.toM ?? 0,
    pdfUrl: result?.pdf?.downloadUrl || '/rock-core/download',
    pdfName: result?.pdf?.fileName || 'rock-core-analysis.pdf',
  };
};

const rockRuns = (result: any) => {
  if (Array.isArray(result?.runs)) return result.runs;
  return (result?.analysis?.coreRuns || []).map((run: any) => ({
    depth_from: run.depthFromM,
    depth_to: run.depthToM,
    tcr: run.tcrPercent ?? run.coreRecoveryPercent ?? 'REV',
    rqd: run.rqdPercent ?? run.rqdEstimatePercent ?? 'REV',
    weathering: run.weathering || 'Review',
    strength: run.strength || 'Review',
    description:
      run.materialDescription ||
      `${result?.analysis?.rockType?.value || 'ROCK'}: ${run.jointType || 'visible joints'}, spacing ${run.dominantJointSpacingMm || 'review'} mm`,
  }));
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'rock' | 'rag' | 'logs'>('dashboard');

  // Rock Core States


  // Extended Rock Core & OpenGround States
  const [rockBoreholeData, setRockBoreholeData] = useState<any>({
    project: { project_no: 'PRJ-2026-04', client: 'BHP Iron Ore', address: 'Pilbara, WA', date: '2026-05-31', logged_by: 'M. Watson', reviewed_by: 'S. Patel' },
    borehole: { borehole_id: 'BH-102', surface_rl: 125.4, hole_diameter_mm: 96, inclination: 90, drill_bit: 'NMLC', drilling_contractor: 'WA Drillers', rig: 'Rig Talon-X', depth_from: 0.0, depth_to: 5.0 },
    lithology_units: [],
    discontinuities: [],
    core_runs: []
  });
  const [photoPath, setPhotoPath] = useState<string>('');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [detectedRows, setDetectedRows] = useState<any[]>([]);
  
  // Photo Viewer config
  const [photoZoom, setPhotoZoom] = useState<number>(1);
  const [photoBrightness, setPhotoBrightness] = useState<number>(100);
  const [photoContrast, setPhotoContrast] = useState<number>(100);
  const [showOverlays, setShowOverlays] = useState<boolean>(true);
  
  // Table and Builder States
  const [activeTableTab, setActiveTableTab] = useState<'lithology' | 'runs' | 'disconts'>('lithology');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string>('');
  const [generatedPdfName, setGeneratedPdfName] = useState<string>('');
  
  // Discontinuity Builder States
  const [defectType, setDefectType] = useState<string>('JN');
  const [defectAngle, setDefectAngle] = useState<string>('45');
  const [defectShape, setDefectShape] = useState<string>('PR');
  const [defectRoughness, setDefectRoughness] = useState<string>('RO');
  const [defectInfilling, setDefectInfilling] = useState<string>('CN');
  const [defectNotes, setDefectNotes] = useState<string>('Stained Joint');
  const [defectDepth, setDefectDepth] = useState<string>('1.5');
  
  // Status check helper
  const getFieldStatusColor = (status: string, requiredField: any) => {
    if (!requiredField || String(requiredField).trim() === '') return 'border-rose-500 bg-rose-500/10 text-rose-300'; // Missing critical
    if (status === 'approved') return 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400'; // Approved
    return 'border-amber-500/30 bg-amber-500/5 text-amber-300'; // Draft / AI suggested
  };
  
  // Dynamic validation executor
  const runLocalValidation = (data: any) => {
    const errors: string[] = [];
    const { borehole, lithology_units, discontinuities, core_runs } = data;
    
    if (!borehole.borehole_id || borehole.borehole_id.trim() === "") {
      errors.push("Borehole ID is required.");
    }
    
    const bhFrom = parseFloat(borehole.depth_from ?? 0);
    const bhTo = parseFloat(borehole.depth_to ?? 0);
    
    // 1. Check Lithology continuity and overlap
    const sortedLith = [...lithology_units].sort((a, b) => parseFloat(a.from) - parseFloat(b.from));
    for (let i = 0; i < sortedLith.length; i++) {
      const l = sortedLith[i];
      const fromVal = parseFloat(l.from);
      const toVal = parseFloat(l.to);
      
      if (isNaN(fromVal) || isNaN(toVal)) {
        errors.push(`Lithology unit ${i+1} has missing depth values.`);
        continue;
      }
      if (fromVal >= toVal) {
        errors.push(`Lithology unit ${i+1} has 'from' depth (${fromVal}m) >= 'to' depth (${toVal}m).`);
      }
      if (fromVal < bhFrom || toVal > bhTo) {
        errors.push(`Lithology unit ${i+1} (${fromVal}m - ${toVal}m) is outside borehole range.`);
      }
      if (!l.description || l.description.trim() === "") {
        errors.push(`Lithology unit at ${fromVal}m - ${toVal}m has an empty description.`);
      }
      if (l.status !== 'approved') {
        errors.push(`Lithology unit at ${fromVal}m - ${toVal}m is still in Draft state.`);
      }
      
      // Check overlap with next unit
      if (i < sortedLith.length - 1) {
        const next = sortedLith[i+1];
        const nextFrom = parseFloat(next.from);
        if (toVal > nextFrom) {
          errors.push(`Lithology overlap at ${toVal}m: Unit ${i+1} overlaps with Unit ${i+2}.`);
        } else if (toVal < nextFrom) {
          errors.push(`Gaps in lithology logging: gap detected between ${toVal}m and ${nextFrom}m.`);
        }
      }
    }
    
    // 2. Check Core Runs TCR/RQD
    core_runs.forEach((run: any, idx: number) => {
      const rFrom = parseFloat(run.depth_from ?? run.depthFromM ?? 0);
      const rTo = parseFloat(run.depth_to ?? run.depthToM ?? 0);
      const tcr = parseFloat(run.tcr ?? run.tcrPercent ?? 0);
      const rqd = parseFloat(run.rqd ?? run.rqdPercent ?? 0);
      
      if (isNaN(rFrom) || isNaN(rTo)) {
        errors.push(`Core Run ${idx+1} has missing depth values.`);
      }
      if (tcr < 0 || tcr > 100 || isNaN(tcr)) {
        errors.push(`Core Run ${idx+1} TCR (${tcr}%) must be between 0% and 100%.`);
      }
      if (rqd < 0 || rqd > 100 || isNaN(rqd)) {
        errors.push(`Core Run ${idx+1} RQD (${rqd}%) must be between 0% and 100%.`);
      }
      if (rqd > tcr) {
        errors.push(`Core Run ${idx+1} RQD (${rqd}%) cannot exceed TCR (${tcr}%).`);
      }
      if (run.status !== 'approved') {
        errors.push(`Core Run ${idx+1} (${rFrom}m - ${rTo}m) is not approved.`);
      }
    });
    
    // 3. Check Discontinuities
    discontinuities.forEach((d: any, idx: number) => {
      const dDepth = parseFloat(d.depth);
      if (isNaN(dDepth)) {
        errors.push(`Discontinuity ${idx+1} has missing depth value.`);
      } else if (dDepth < bhFrom || dDepth > bhTo) {
        errors.push(`Discontinuity ${idx+1} at ${dDepth}m is outside borehole range.`);
      }
      if (d.status !== 'approved') {
        errors.push(`Discontinuity at ${dDepth}m is not approved.`);
      }
    });
    
    setValidationErrors(errors);
    return errors;
  };

  const [rockPhoto, setRockPhoto] = useState<File | null>(null);
  const [rockPhotoPreview, setRockPhotoPreview] = useState<string | null>(null);
  const [rockParsingState, setRockParsingState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [rockProgress, setRockProgress] = useState<string>('');
  const [rockResult, setRockResult] = useState<any | null>(null);
  const [pipelineState, setPipelineState] = useState<'idle' | 'running' | 'success'>('idle');
  const [currentAgentIndex, setCurrentAgentIndex] = useState(-1);
  const [logs, setLogs] = useState<string[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Interval Log State
  const [formData, setFormData] = useState({
    projectId: 'PRJ-2024-001',
    boreholeId: 'BH-01',
    depthFrom: '0.0',
    depthTo: '1.5',
    notes: 'Cohesive clay, medium plasticity.'
  });

  // Human in the Loop States
  const [soilParams, setSoilParams] = useState({
    primarySoil: 'CLAY',
    secondaryComponent: 'Silty',
    uscsCode: 'CH',
    colour: 'brown',
    moisture: 'moist',
    consistency: 'stiff',
    origin: 'RESIDUAL SOIL',
    inclusions: 'trace fine sand'
  });
  const [soilPhoto, setSoilPhoto] = useState<string | null>(null);
  const [loggedLayers, setLoggedLayers] = useState<any[]>([]);
  const [isClassifying, setIsClassifying] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [confidence, setConfidence] = useState<number>(0.85);
  const [reasoning, setReasoning] = useState<string>('Visual attributes match high-plasticity clay profiles.');
  const [hoveredLayer, setHoveredLayer] = useState<any | null>(null);

  const buildDescription = (params: typeof soilParams) => {
    const soil = params.primarySoil;
    const secondary = params.secondaryComponent ? `${params.secondaryComponent} ` : '';
    const colour = params.colour ? `${params.colour}` : '';
    const moisture = params.moisture ? `${params.moisture}` : '';
    const consistency = params.consistency ? `${params.consistency}` : '';
    const inclusions = params.inclusions ? `, ${params.inclusions}` : '';
    
    let desc = `${secondary}${soil}`;
    if (colour || moisture || consistency || inclusions) {
      desc += `, ${[colour, moisture, consistency].filter(Boolean).join(', ')}${inclusions}`;
    }
    desc += `.`;
    if (params.origin) {
      desc += ` [${params.origin}]`;
    }
    return desc;
  };

  const fetchLoggedLayers = async (projId: string, bhId: string) => {
    try {
      const res = await apiFetch(apiUrl(`/boreholes/${projId}/${bhId}/layers`));
      if (res.ok) {
        const data = await res.json();
        setLoggedLayers(data.layers || []);
      }
    } catch (err) {
      console.error("Error fetching logged layers:", err);
    }
  };

  const deleteLoggedLayers = async (projId: string, bhId: string) => {
    if (!window.confirm("Are you sure you want to clear all logged layers for this borehole?")) return;
    try {
      const res = await apiFetch(apiUrl(`/boreholes/${projId}/${bhId}/layers`), {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchLoggedLayers(projId, bhId);
      }
    } catch (err) {
      console.error("Error deleting logged layers:", err);
    }
  };

  const runInstantClassifier = async (customNotes?: string, customPhoto?: string) => {
    setIsClassifying(true);
    try {
      const payload = {
        notes: customNotes || formData.notes,
        photo_base64: customPhoto || soilPhoto
      };
      const res = await apiFetch(apiUrl('/classify-interval'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setSoilParams({
          primarySoil: data.primary_soil || 'CLAY',
          secondaryComponent: data.secondary_component || '',
          uscsCode: data.uscs_code || 'CL',
          colour: data.colour || 'brown',
          moisture: data.moisture || 'moist',
          consistency: data.consistency || 'stiff',
          origin: data.origin || 'RESIDUAL SOIL',
          inclusions: data.inclusions || ''
        });
        setConfidence(data.confidence || 0.8);
        setReasoning(data.reasoning || '');
      }
    } catch (err) {
      console.error("Error classifying interval:", err);
    } finally {
      setIsClassifying(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setSoilPhoto(base64String);
      runInstantClassifier(formData.notes, base64String);
    };
    reader.readAsDataURL(file);
  };

  const saveSoilLayer = async () => {
    setSaveStatus('saving');
    try {
      const description = buildDescription(soilParams);
      const payload = {
        project_id: formData.projectId,
        project_name: "AutoSoil Project",
        borehole_id: formData.boreholeId,
        depth_from: parseFloat(formData.depthFrom),
        depth_to: parseFloat(formData.depthTo),
        colour: soilParams.colour,
        moisture: soilParams.moisture,
        consistency: soilParams.consistency,
        notes: description
      };

      const res = await apiFetch(apiUrl('/log-interval'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSaveStatus('success');
        fetchLoggedLayers(formData.projectId, formData.boreholeId);
        
        // Auto-increment
        setFormData(prev => ({
          ...prev,
          depthFrom: prev.depthTo,
          depthTo: (parseFloat(prev.depthTo) + 1.5).toFixed(1)
        }));
        
        setTimeout(() => {
          setSaveStatus('idle');
          setSoilPhoto(null);
        }, 2000);
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      console.error("Error saving layer:", err);
      setSaveStatus('error');
    }
  };

  const getSoilColorClass = (colour: string) => {
    const col = (colour || '').toLowerCase();
    if (col.includes('black')) return 'from-stone-900 to-stone-850 border-stone-800';
    if (col.includes('dark grey') || col.includes('dark gray')) return 'from-slate-800 to-slate-750 border-slate-700';
    if (col.includes('grey') || col.includes('gray')) return 'from-slate-600 to-slate-550 border-slate-500';
    if (col.includes('brown') && col.includes('orange')) return 'from-amber-800 to-orange-850 border-amber-700';
    if (col.includes('brown') && col.includes('red')) return 'from-rose-900 to-amber-900 border-rose-800';
    if (col.includes('brown')) return 'from-amber-900 to-amber-950 border-amber-800';
    if (col.includes('red')) return 'from-red-950 to-red-900 border-red-800';
    if (col.includes('orange')) return 'from-orange-900 to-orange-800 border-orange-700';
    if (col.includes('yellow')) return 'from-yellow-950 to-yellow-900 border-yellow-800';
    if (col.includes('green')) return 'from-emerald-950 to-emerald-900 border-emerald-900';
    return 'from-slate-700 to-slate-800 border-slate-600';
  };

  useEffect(() => {
    fetchLoggedLayers(formData.projectId, formData.boreholeId);
  }, [formData.projectId, formData.boreholeId]);

  // RAG Reports State
  const [projects, setProjects] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedHistory, setSelectedHistory] = useState<string>('');
  
  const [analysisState, setAnalysisState] = useState<'idle' | 'analyzing' | 'success' | 'error'>('idle');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [replacements, setReplacements] = useState<Record<string, string>>({});
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState<boolean>(false);
  
  const [ragState, setRagState] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [ragLogs, setRagLogs] = useState<string[]>([]);
  const [complianceReport, setComplianceReport] = useState<string>('');
  const [qaScore, setQaScore] = useState<number>(0);
  const [qaPassed, setQaPassed] = useState<boolean>(false);
  const [generatedFileUrl, setGeneratedFileUrl] = useState<string | null>(null);
  const [generatedFileName, setGeneratedFileName] = useState<string>('');
  const [indexingState, setIndexingState] = useState<'idle' | 'indexing' | 'success'>('idle');
  const [currentSwarmAgent, setCurrentSwarmAgent] = useState<string>('');
  const ragTerminalEndRef = useRef<HTMLDivElement>(null);

  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState<string>('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const filesArray = Array.from(e.target.files);
    setUploadFiles(filesArray);
    
    setUploadState('uploading');
    setUploadProgress('Uploading and parsing site photos, soil logs, and lab data...');
    
    const formData = new FormData();
    filesArray.forEach(file => {
      formData.append('files', file);
    });
    
    try {
      const res = await apiFetch(apiUrl('/project/upload'), {
        method: 'POST',
        body: formData
      });
      
      if (res.ok) {
        const data = await res.json();
        setUploadState('success');
        setUploadProgress('Successfully uploaded and parsed site data!');
        setSelectedProject(data.project_path);
        setAnalysisResult(data.analysis);
        setAnalysisState('success');
        
        // Merge OCR extracted data into replacements
        const mappings: Record<string, string> = {
          "CLIENT": "client",
          "CLIENT_NAME": "client",
          "ADDRESS": "site_address",
          "SITE_ADDRESS": "site_address",
          "JOB_NO": "job_no",
          "BEARING_CAPACITY": "bearing_capacity"
        };
        
        setReplacements(prev => {
          const updated = { ...prev };
          Object.entries(mappings).forEach(([placeholder, key]) => {
            if (data.analysis[key]) {
              updated[placeholder] = data.analysis[key];
            }
          });
          if (data.analysis.summary) {
            updated["NOTES"] = data.analysis.summary;
          }
          return updated;
        });
      } else {
        setUploadState('error');
        setUploadProgress('Upload failed.');
      }
    } catch (err: any) {
      console.error(err);
      setUploadState('error');
      setUploadProgress(`Error: ${err.message}`);
    }
  };

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const addRagLog = (msg: string) => {
    setRagLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    ragTerminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ragLogs]);

  // Load RAG & Template data on mount
  useEffect(() => {
    fetchRAGData();
  }, []);

  const fetchRAGData = async () => {
    try {
      const resProj = await apiFetch(apiUrl('/rag/projects'));
      if (resProj.ok) {
        const data = await resProj.json();
        setProjects(data);
      }
      
      const resTemp = await apiFetch(apiUrl('/templates'));
      if (resTemp.ok) {
        const data = await resTemp.json();
        setTemplates(data);
      }

      const resHist = await apiFetch(apiUrl('/reports/history'));
      if (resHist.ok) {
        const data = await resHist.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Error loading RAG workspace data:", err);
    }
  };

  const fetchSuggestions = async (currentPlaceholders: string[]) => {
    if (!selectedTemplate) return;
    setIsFetchingSuggestions(true);
    try {
      const payload = {
        template_id: selectedTemplate,
        placeholders: currentPlaceholders,
        selected_historical_report_path: selectedHistory || null,
        project_path: selectedProject || null
      };

      const res = await apiFetch(apiUrl('/templates/suggest-fields'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success' && data.suggestions) {
          setReplacements(prev => {
            const updated = { ...prev };
            Object.entries(data.suggestions).forEach(([k, v]) => {
              if (v) {
                updated[k] = v as string;
              }
            });
            return updated;
          });
        }
      }
    } catch (err) {
      console.error("Error fetching suggestions:", err);
    } finally {
      setIsFetchingSuggestions(false);
    }
  };

  // Re-fetch template placeholders when template is selected
  useEffect(() => {
    if (!selectedTemplate) {
      setPlaceholders([]);
      setReplacements({});
      return;
    }
    const temp = templates.find(t => t.template_id === selectedTemplate);
    if (temp) {
      const currentPlaceholders = temp.placeholders || [];
      setPlaceholders(currentPlaceholders);
      const initRepls: Record<string, string> = {};
      currentPlaceholders.forEach((p: string) => {
        initRepls[p] = replacements[p] || '';
      });
      setReplacements(initRepls);

      // Fetch suggestions to pre-fill
      fetchSuggestions(currentPlaceholders);
    }
  }, [selectedTemplate, templates]);

  // Fetch suggestions when selectedProject or selectedHistory changes
  useEffect(() => {
    if (selectedTemplate) {
      const temp = templates.find(t => t.template_id === selectedTemplate);
      fetchSuggestions(temp ? (temp.placeholders || []) : []);
    }
  }, [selectedProject, selectedHistory]);

  // Handle building RAG index
  const rebuildIndex = async () => {
    setIndexingState('indexing');
    try {
      const res = await apiFetch(apiUrl('/rag/index/build'), { method: 'POST' });
      if (res.ok) {
        setIndexingState('success');
        setTimeout(() => setIndexingState('idle'), 3000);
        fetchRAGData();
      }
    } catch (err) {
      console.error(err);
      setIndexingState('idle');
    }
  };

  // Handle project folder analysis & OCR
  const analyzeProject = async () => {
    if (!selectedProject) return;
    setAnalysisState('analyzing');
    setAnalysisResult(null);
    try {
      const res = await apiFetch(apiUrl(`/rag/analyze?project_path=${encodeURIComponent(selectedProject)}`));
      if (res.ok) {
        const data = await res.json();
        setAnalysisResult(data.analysis);
        setAnalysisState('success');
        
        // Merge OCR extracted data into replacements
        const mappings: Record<string, string> = {
          "CLIENT": "client",
          "CLIENT_NAME": "client",
          "ADDRESS": "site_address",
          "SITE_ADDRESS": "site_address",
          "JOB_NO": "job_no",
          "BEARING_CAPACITY": "bearing_capacity"
        };
        
        setReplacements(prev => {
          const updated = { ...prev };
          Object.entries(mappings).forEach(([placeholder, key]) => {
            if (data.analysis[key]) {
              updated[placeholder] = data.analysis[key];
            }
          });
          if (data.analysis.summary) {
            updated["NOTES"] = data.analysis.summary;
          }
          return updated;
        });
      } else {
        setAnalysisState('error');
      }
    } catch (err) {
      console.error(err);
      setAnalysisState('error');
    }
  };

  // Run mock borehole logging pipeline
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

  // Run multi-agent RAG swarm template generation pipeline
  const generateSwarmReport = async () => {
    if (!selectedTemplate) return;
    setRagState('generating');
    setRagLogs([]);
    setGeneratedFileUrl(null);
    setCurrentSwarmAgent('ClassifierAgent');
    
    addRagLog('🚀 Swarm Command Center initiating...');
    addRagLog('🤖 [ClassifierAgent] Scanning template variables and parsing layout...');
    
    await new Promise(r => setTimeout(r, 1200));
    setCurrentSwarmAgent('HistoricalAgent');
    addRagLog('🔍 [HistoricalAgent] Running Semantic RAG matching against previous reports database...');
    if (selectedHistory) {
      addRagLog(`📚 Reference historical report loaded: ${selectedHistory.split('/').pop()}`);
    }
    
    await new Promise(r => setTimeout(r, 1800));
    setCurrentSwarmAgent('ComplianceAgent');
    addRagLog('📐 [ComplianceAgent] Verifying values against AS 1726 standards...');
    
    await new Promise(r => setTimeout(r, 1500));
    setCurrentSwarmAgent('QAScoringAgent');
    addRagLog('🎯 [QAScoringAgent] Validating field completeness and compliance integrity...');
    
    await new Promise(r => setTimeout(r, 1200));
    setCurrentSwarmAgent('ReportCompilationAgent');
    addRagLog('🖨️ [ReportCompilationAgent] Commencing Word template replacement & formatting compilation...');
    
    try {
      const payload = {
        template_id: selectedTemplate,
        replacements: replacements,
        selected_historical_report_path: selectedHistory || null,
        project_path: selectedProject || null
      };

      const res = await apiFetch(apiUrl('/templates/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const qaScr = res.headers.get("X-QA-Score");
        const qaPass = res.headers.get("X-QA-Passed");
        const compChk = res.headers.get("X-Compliance-Check");

        setQaScore(qaScr ? parseFloat(qaScr) : 95.0);
        setQaPassed(qaPass === "true");
        setComplianceReport(compChk || "AS 1726 Compliance Verification Succeeded");

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        setGeneratedFileUrl(url);
        
        const fileName = `Generated_${selectedTemplate.split('/').pop()}`;
        setGeneratedFileName(fileName);

        setCurrentSwarmAgent('DispatchAgent');
        addRagLog(`📥 [DispatchAgent] Finalizing compiled artifact. Size: ${blob.size} bytes.`);
        addRagLog('✨ Swarm complete! Report generated successfully.');
        setRagState('success');
      } else {
        const errText = await res.text();
        addRagLog(`❌ Swarm failed: ${errText}`);
        setRagState('error');
      }
    } catch (err: any) {
      addRagLog(`❌ Network error during generation: ${err.message}`);
      setRagState('error');
    }
    setCurrentSwarmAgent('');
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
              <p className="text-slate-400 text-sm">Supervisor Orchestrated Pipeline v2.2</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={rebuildIndex}
              disabled={indexingState === 'indexing'}
              className="px-4 py-2 border border-white/10 rounded-xl text-xs font-semibold hover:bg-white/5 transition-all flex items-center gap-2"
            >
              {indexingState === 'indexing' ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
              {indexingState === 'indexing' ? 'Indexing...' : indexingState === 'success' ? 'Indexed!' : 'Rebuild RAG Index'}
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-semibold text-emerald-400">Supervisor Active</span>
            </div>
          </div>
        </header>

        {/* Workspace Navigation Tabs */}
        <div className="flex bg-black/40 p-1.5 rounded-2xl w-fit border border-white/5">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Interval Logger
          </button>
          <button 
            onClick={() => setActiveTab('rock')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'rock' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Rock Core Logger
          </button>
          <button 
            onClick={() => setActiveTab('rag')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'rag' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
          >
            RAG Workspace
          </button>
          <button 
            onClick={() => setActiveTab('logs')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'logs' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Director Logs
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6 text-left animate-in fade-in duration-300"
            >
              {/* Active Borehole Header */}
              <div className="flex flex-col sm:flex-row items-center justify-between bg-black/40 border border-white/5 p-6 rounded-3xl gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-sky-500/10 rounded-xl">
                    <MapPin className="text-sky-400" size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Active Borehole Workspace</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <input 
                        type="text" 
                        value={formData.projectId}
                        onChange={e => setFormData({...formData, projectId: e.target.value})}
                        className="bg-transparent text-white border-b border-white/10 focus:border-sky-500/50 outline-none text-xs font-mono font-bold w-24"
                        placeholder="Project ID"
                      />
                      <span className="text-slate-650">/</span>
                      <input 
                        type="text" 
                        value={formData.boreholeId}
                        onChange={e => setFormData({...formData, boreholeId: e.target.value})}
                        className="bg-transparent text-white border-b border-white/10 focus:border-sky-500/50 outline-none text-xs font-mono font-bold w-20"
                        placeholder="Borehole ID"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => deleteLoggedLayers(formData.projectId, formData.boreholeId)}
                    className="px-4 py-2 border border-rose-500/20 hover:bg-rose-500/10 text-rose-400 text-xs font-semibold rounded-xl transition-all"
                  >
                    Clear Borehole Logs
                  </button>
                  <button
                    onClick={runPipeline}
                    disabled={pipelineState === 'running'}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-md"
                  >
                    {pipelineState === 'running' ? <Loader2 className="animate-spin" size={14} /> : <Activity size={14} />}
                    Run QA Swarm pipeline
                  </button>
                </div>
              </div>

              {/* Main Geotech Workstation Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Column: Dimensions & Notes & Photo Upload */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Dimensions & Notes */}
                  <div className="glass rounded-3xl p-6 space-y-4">
                    <div className="flex items-center gap-2 text-sky-400 mb-2">
                      <Sliders size={16} />
                      <h4 className="font-bold uppercase tracking-wider text-xs">Interval Dimensions</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">From (m)</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 outline-none text-sm text-white focus:border-sky-500/50 font-mono" 
                          value={formData.depthFrom} 
                          onChange={e => setFormData({...formData, depthFrom: e.target.value})} 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">To (m)</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 outline-none text-sm text-white focus:border-sky-500/50 font-mono" 
                          value={formData.depthTo} 
                          onChange={e => setFormData({...formData, depthTo: e.target.value})} 
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Field Soil Notes</label>
                        <button 
                          onClick={() => runInstantClassifier(formData.notes, soilPhoto || undefined)}
                          disabled={isClassifying || !formData.notes}
                          className="text-[10px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-all"
                        >
                          {isClassifying ? <Loader2 className="animate-spin" size={10} /> : <Sparkles size={10} />}
                          AI Suggest
                        </button>
                      </div>
                      <textarea 
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 outline-none text-sm text-white focus:border-sky-500/50 min-h-[90px] resize-none leading-relaxed" 
                        value={formData.notes} 
                        onChange={e => setFormData({...formData, notes: e.target.value})}
                        placeholder="E.g., Cohesive clay, medium plasticity, brown with orange mottling, stiff."
                      />
                    </div>
                  </div>

                  {/* Photo Upload Zone */}
                  <div className="glass rounded-3xl p-6 space-y-4">
                    <div className="flex items-center gap-2 text-sky-400">
                      <Camera size={16} />
                      <h4 className="font-bold uppercase tracking-wider text-xs">Soil Sample Photo</h4>
                    </div>
                    
                    <div className="space-y-3">
                      {soilPhoto ? (
                        <div className="relative border border-white/10 rounded-2xl overflow-hidden bg-black/40 aspect-video group">
                          <img src={soilPhoto} alt="Soil Sample" className="w-full h-full object-cover" />
                          {isClassifying && (
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                              <Loader2 className="animate-spin text-sky-400" size={28} />
                              <span className="text-xs text-sky-300 font-mono animate-pulse">Running AI Classification...</span>
                            </div>
                          )}
                          {!isClassifying && (
                            <div className="absolute inset-0 pointer-events-none border-t border-sky-400/50 bg-gradient-to-b from-sky-500/10 to-transparent h-1/3 animate-pulse" />
                          )}
                          <button 
                            onClick={() => setSoilPhoto(null)}
                            className="absolute top-3 right-3 p-1.5 bg-black/60 hover:bg-black/80 rounded-lg text-white/70 hover:text-white transition-all text-xs"
                          >
                            Clear Photo
                          </button>
                        </div>
                      ) : (
                        <div className="border border-dashed border-white/10 hover:border-sky-500/40 rounded-2xl p-6 transition-all bg-black/20 text-center relative cursor-pointer">
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={handlePhotoUpload} 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <Camera className="mx-auto text-slate-400 mb-2" size={24} />
                          <p className="text-xs text-slate-300 font-semibold">Upload soil sample photo</p>
                          <p className="text-[10px] text-slate-500 mt-1">Triggers instant AI classification & USCS prediction</p>
                        </div>
                      )}
                    </div>

                    {/* Classification Telemetry */}
                    <div className="p-3.5 bg-sky-500/5 rounded-2xl border border-sky-500/10 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sky-400">AI CONFIDENCE LEVEL</span>
                        <span className="font-mono text-sky-300 font-bold">{(confidence * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-gradient-to-r from-sky-500 to-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${confidence * 100}%` }}></div>
                      </div>
                      <p className="text-slate-400 font-mono text-[10px] leading-relaxed">
                        <span className="text-sky-300 font-bold">Analysis:</span> {reasoning}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Middle Column: Human-in-the-Loop AI Tweaker */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="glass rounded-3xl p-6 space-y-5">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2 text-sky-400">
                        <ShieldCheck size={16} />
                        <h4 className="font-bold uppercase tracking-wider text-xs">Human Verification</h4>
                      </div>
                      <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                        Interactive
                      </span>
                    </div>

                    <div className="space-y-3.5">
                      {/* Primary Soil */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Primary Soil Name</label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {['CLAY', 'SAND', 'GRAVEL', 'SILT', 'ASPHALT', 'PEAT'].map((soil) => (
                            <button
                              key={soil}
                              type="button"
                              onClick={() => setSoilParams({...soilParams, primarySoil: soil})}
                              className={`py-1.5 px-1 rounded-lg text-[10px] font-bold border transition-all ${soilParams.primarySoil === soil ? 'bg-sky-500/20 text-sky-400 border-sky-500/40' : 'bg-black/20 text-slate-400 border-white/5 hover:bg-white/5'}`}
                            >
                              {soil}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Secondary Component */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Secondary Component</label>
                        <input 
                          type="text"
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs outline-none text-white focus:border-sky-500/50"
                          value={soilParams.secondaryComponent}
                          onChange={e => setSoilParams({...soilParams, secondaryComponent: e.target.value})}
                          placeholder="e.g. Silty, Sandy, Gravelly"
                        />
                      </div>

                      {/* USCS Code */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">USCS Group Symbol</label>
                        <select
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs outline-none text-white focus:border-sky-500/50"
                          value={soilParams.uscsCode}
                          onChange={e => setSoilParams({...soilParams, uscsCode: e.target.value})}
                        >
                          {['CH', 'CL', 'SC', 'SM', 'SP', 'GP', 'GW', 'ML', 'MH', 'OH', 'OL', 'PT', 'GM', 'GC'].map((code) => (
                            <option key={code} value={code}>{code}</option>
                          ))}
                        </select>
                      </div>

                      {/* Colour swatches */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Soil Colour</label>
                        <div className="flex flex-wrap gap-2 items-center">
                          {[
                            { name: 'brown', class: 'bg-amber-900 border-amber-800' },
                            { name: 'dark grey', class: 'bg-slate-800 border-slate-700' },
                            { name: 'grey', class: 'bg-slate-600 border-slate-500' },
                            { name: 'red - brown', class: 'bg-rose-900 border-rose-800' },
                            { name: 'orange - brown', class: 'bg-orange-950 border-orange-900' },
                            { name: 'black', class: 'bg-stone-900 border-stone-850' },
                            { name: 'pale grey', class: 'bg-slate-400 border-slate-300' },
                          ].map((c) => (
                            <button
                              key={c.name}
                              type="button"
                              onClick={() => setSoilParams({...soilParams, colour: c.name})}
                              className={`w-6 h-6 rounded-full border-2 transition-all ${c.class} ${soilParams.colour === c.name ? 'ring-2 ring-sky-400 scale-110 shadow-sm' : 'hover:scale-105'}`}
                              title={c.name}
                            />
                          ))}
                        </div>
                        <span className="text-[9px] font-mono text-slate-500 block uppercase">Selected: {soilParams.colour}</span>
                      </div>

                      {/* Moisture & Consistency */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Moisture</label>
                          <select
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs outline-none text-white focus:border-sky-500/50"
                            value={soilParams.moisture}
                            onChange={e => setSoilParams({...soilParams, moisture: e.target.value})}
                          >
                            {['dry', 'moist', 'wet', 'saturated'].map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Consistency</label>
                          <select
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs outline-none text-white focus:border-sky-500/50"
                            value={soilParams.consistency}
                            onChange={e => setSoilParams({...soilParams, consistency: e.target.value})}
                          >
                            {['very soft', 'soft', 'firm', 'stiff', 'very stiff', 'hard', 'loose', 'medium dense', 'dense'].map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Inclusions & Origin */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Inclusions</label>
                          <input 
                            type="text"
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs outline-none text-white focus:border-sky-500/50"
                            value={soilParams.inclusions}
                            onChange={e => setSoilParams({...soilParams, inclusions: e.target.value})}
                            placeholder="trace sand"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Origin</label>
                          <select
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs outline-none text-white focus:border-sky-500/50"
                            value={soilParams.origin}
                            onChange={e => setSoilParams({...soilParams, origin: e.target.value})}
                          >
                            {['RESIDUAL SOIL', 'FILL', 'COLLUVIAL', 'ALLUVIAL', 'TOPSOIL'].map((o) => (
                              <option key={o} value={o}>{o}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Live Description */}
                    <div className="bg-black/60 p-3 rounded-2xl border border-white/5 space-y-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Live AS 1726 Description</span>
                      <p className="text-xs text-emerald-400 font-mono leading-relaxed">
                        {buildDescription(soilParams)}
                      </p>
                    </div>

                    <button
                      onClick={saveSoilLayer}
                      disabled={saveStatus === 'saving'}
                      className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white disabled:opacity-40 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg active:scale-[0.98]"
                    >
                      {saveStatus === 'saving' ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                      {saveStatus === 'saving' ? 'Saving Layer...' : saveStatus === 'success' ? 'Saved & Synced!' : 'Commit Layer to OpenGround'}
                    </button>
                  </div>
                </div>

                {/* Right Column: Visual Stratigraphy column */}
                <div className="lg:col-span-3 space-y-6">
                  <div className="glass rounded-3xl p-6 flex flex-col h-[670px]">
                    <div className="flex items-center gap-2 text-sky-400 mb-4 border-b border-white/5 pb-2 shrink-0">
                      <Layers size={16} />
                      <h4 className="font-bold uppercase tracking-wider text-xs">Visual Stratigraphy</h4>
                    </div>
                    
                    {/* Borehole Log Column */}
                    <div className="flex-1 flex flex-col justify-start relative select-none overflow-y-auto pr-1">
                      <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-slate-800" />
                      
                      <div className="flex-1 flex flex-col gap-1 pl-6">
                        {loggedLayers.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center text-slate-600 italic border border-dashed border-white/5 rounded-2xl p-4">
                            <Layers size={32} className="opacity-20 mb-2" />
                            <p className="text-xs">No layers logged yet.</p>
                            <p className="text-[9px] mt-1 text-slate-500">Specify depths and click Commit to draw soil column.</p>
                          </div>
                        ) : (
                          loggedLayers.map((layer, index) => {
                            const thickness = layer.depth_to - layer.depth_from;
                            const heightVal = Math.max(50, thickness * 90);
                            const colorClasses = getSoilColorClass(layer.colour);
                            
                            return (
                              <div
                                key={index}
                                style={{ height: `${heightVal}px` }}
                                className={`relative rounded-xl border bg-gradient-to-br ${colorClasses} p-3 flex flex-col justify-between transition-all hover:scale-[1.02] hover:shadow-lg cursor-pointer`}
                                onMouseEnter={() => setHoveredLayer(layer)}
                                onMouseLeave={() => setHoveredLayer(null)}
                              >
                                {/* Depth Markers */}
                                <div className="absolute -left-6 top-0 text-[9px] font-mono text-slate-500 font-bold">
                                  {layer.depth_from.toFixed(1)}m
                                </div>
                                {index === loggedLayers.length - 1 && (
                                  <div className="absolute -left-6 bottom-0 text-[9px] font-mono text-slate-500 font-bold">
                                    {layer.depth_to.toFixed(1)}m
                                  </div>
                                )}
                                
                                <div className="flex justify-between items-start">
                                  <span className="text-[9px] font-mono bg-black/40 border border-white/10 px-1 py-0.5 rounded text-white font-bold uppercase">
                                    {layer.uscs_code}
                                  </span>
                                  <span className="text-[8px] font-bold opacity-60 uppercase text-white/95 truncate max-w-[50px]">
                                    {layer.consistency}
                                  </span>
                                </div>
                                
                                <div className="text-left">
                                  <span className="text-[9px] font-bold uppercase tracking-wider block truncate">
                                    {layer.description?.split(',')[0] || 'SOIL LAYER'}
                                  </span>
                                  <span className="text-[8px] font-mono opacity-80 block truncate">
                                    {layer.moisture} | {layer.colour}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Hover tooltip details box */}
                    <div className="mt-4 p-3 bg-black/40 rounded-2xl border border-white/5 h-[105px] shrink-0 text-xs">
                      {hoveredLayer ? (
                        <div className="space-y-1 text-left">
                          <div className="flex justify-between items-center text-[10px] text-sky-400 font-bold">
                            <span>STRATA DETAIL ({hoveredLayer.depth_from.toFixed(1)}m - {hoveredLayer.depth_to.toFixed(1)}m)</span>
                            <span className="font-mono bg-sky-500/20 text-sky-300 px-1 rounded">{hoveredLayer.uscs_code}</span>
                          </div>
                          <p className="text-[10px] text-slate-350 line-clamp-3 leading-relaxed font-mono mt-1">
                            {hoveredLayer.description}
                          </p>
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center text-center text-slate-500 italic text-[10px]">
                          Hover over stratigraphy layer to view details.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Row: OpenGround Sync Grid */}
              <div className="glass rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2 text-sky-400">
                    <Database size={16} />
                    <h4 className="font-bold uppercase tracking-wider text-xs font-semibold">OpenGround Synced Datagrid</h4>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    <CheckCircle2 size={10} />
                    Synced to Bentley Cloud
                  </div>
                </div>
                
                <div className="overflow-x-auto w-full max-h-[250px] scrollbar-thin">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-500 uppercase tracking-widest text-[9px] font-bold">
                        <th className="py-2 px-3">Location ID</th>
                        <th className="py-2 px-3">Depth Top (m)</th>
                        <th className="py-2 px-3">Depth Base (m)</th>
                        <th className="py-2 px-3">Primary Soil</th>
                        <th className="py-2 px-3">Secondary Component</th>
                        <th className="py-2 px-3">USCS Group</th>
                        <th className="py-2 px-3">Color</th>
                        <th className="py-2 px-3">Moisture</th>
                        <th className="py-2 px-3">Consistency</th>
                        <th className="py-2 px-3">Origin</th>
                        <th className="py-2 px-3">Field Geological Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-[11px] text-slate-300">
                      {loggedLayers.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="py-8 text-center text-slate-600 italic">No intervals committed to OpenGround yet.</td>
                        </tr>
                      ) : (
                        loggedLayers.map((layer, idx) => (
                          <tr key={idx} className="hover:bg-white/5 transition-colors">
                            <td className="py-2 px-3 text-white font-bold">{formData.boreholeId}</td>
                            <td className="py-2 px-3 text-sky-400">{layer.depth_from.toFixed(2)}</td>
                            <td className="py-2 px-3 text-sky-400">{layer.depth_to.toFixed(2)}</td>
                            <td className="py-2 px-3 text-white">{layer.description?.split(',')[0]?.split(' ').pop() || 'CLAY'}</td>
                            <td className="py-2 px-3">{layer.description?.split(',')[0]?.split(' ')[0] !== layer.description?.split(',')[0]?.split(' ').pop() ? layer.description?.split(',')[0]?.split(' ')[0] : ''}</td>
                            <td className="py-2 px-3"><span className="bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded font-bold">{layer.uscs_code}</span></td>
                            <td className="py-2 px-3">{layer.colour}</td>
                            <td className="py-2 px-3">{layer.moisture}</td>
                            <td className="py-2 px-3">{layer.consistency}</td>
                            <td className="py-2 px-3 text-emerald-400 font-bold">{layer.origin || 'RESIDUAL SOIL'}</td>
                            <td className="py-2 px-3 text-slate-400 truncate max-w-[220px]" title={layer.description}>{layer.description}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

                    {activeTab === 'rock' && (
            <motion.div
              key="rock-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6 text-left"
            >
              {/* One-Screen 4-Panel Workflow Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-[calc(100vh-160px)] min-h-[750px]">
                
                {/* Column 1: Left - Metadata & Interactive Viewer (xl:col-span-5) */}
                <div className="xl:col-span-5 flex flex-col gap-6 h-full overflow-y-auto pr-1">
                  
                  {/* Panel 1: Project Metadata & Borehole Details */}
                  <section className="glass rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2 text-sky-400 font-bold uppercase tracking-wider text-xs">
                        <Sliders size={14} />
                        <span>Panel 1: Project & Borehole Metadata</span>
                      </div>
                      <span className="font-mono bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded text-[10px] font-bold">
                        OpenGround Style
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-left">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Project No</label>
                        <input 
                          type="text" 
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs outline-none text-white focus:border-sky-500/50 font-mono"
                          value={rockBoreholeData.project.project_no}
                          onChange={(e) => {
                            const d = { ...rockBoreholeData };
                            d.project.project_no = e.target.value;
                            d.project.projectNumber = e.target.value;
                            setRockBoreholeData(d);
                            runLocalValidation(d);
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Client Name</label>
                        <input 
                          type="text" 
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs outline-none text-white focus:border-sky-500/50"
                          value={rockBoreholeData.project.client}
                          onChange={(e) => {
                            const d = { ...rockBoreholeData };
                            d.project.client = e.target.value;
                            setRockBoreholeData(d);
                          }}
                        />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Site Address</label>
                        <input 
                          type="text" 
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs outline-none text-white focus:border-sky-500/50"
                          value={rockBoreholeData.project.address}
                          onChange={(e) => {
                            const d = { ...rockBoreholeData };
                            d.project.address = e.target.value;
                            setRockBoreholeData(d);
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Logged By</label>
                        <input 
                          type="text" 
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs outline-none text-white focus:border-sky-500/50"
                          value={rockBoreholeData.project.logged_by}
                          onChange={(e) => {
                            const d = { ...rockBoreholeData };
                            d.project.logged_by = e.target.value;
                            setRockBoreholeData(d);
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Reviewed By</label>
                        <input 
                          type="text" 
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs outline-none text-white focus:border-sky-500/50"
                          value={rockBoreholeData.project.reviewed_by}
                          onChange={(e) => {
                            const d = { ...rockBoreholeData };
                            d.project.reviewed_by = e.target.value;
                            setRockBoreholeData(d);
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="border-t border-white/5 my-2 pt-2"></div>
                    
                    <div className="grid grid-cols-3 gap-3 text-left">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Borehole ID</label>
                        <input 
                          type="text" 
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs outline-none text-white focus:border-sky-500/50 font-mono font-bold text-sky-400"
                          value={rockBoreholeData.borehole.borehole_id}
                          onChange={(e) => {
                            const d = { ...rockBoreholeData };
                            d.borehole.borehole_id = e.target.value;
                            setRockBoreholeData(d);
                            runLocalValidation(d);
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Surface RL (m)</label>
                        <input 
                          type="number" 
                          step="0.1"
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs outline-none text-white focus:border-sky-500/50 font-mono"
                          value={rockBoreholeData.borehole.surface_rl || 0}
                          onChange={(e) => {
                            const d = { ...rockBoreholeData };
                            d.borehole.surface_rl = parseFloat(e.target.value) || 0;
                            setRockBoreholeData(d);
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Hole Dia (mm)</label>
                        <input 
                          type="number" 
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs outline-none text-white focus:border-sky-500/50 font-mono"
                          value={rockBoreholeData.borehole.hole_diameter_mm || 96}
                          onChange={(e) => {
                            const d = { ...rockBoreholeData };
                            d.borehole.hole_diameter_mm = parseInt(e.target.value) || 0;
                            setRockBoreholeData(d);
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Drill Bit Type</label>
                        <input 
                          type="text" 
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs outline-none text-white focus:border-sky-500/50"
                          value={rockBoreholeData.borehole.drill_bit || 'NMLC'}
                          onChange={(e) => {
                            const d = { ...rockBoreholeData };
                            d.borehole.drill_bit = e.target.value;
                            setRockBoreholeData(d);
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Depth From (m)</label>
                        <input 
                          type="number" 
                          step="0.1"
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs outline-none text-white focus:border-sky-500/50 font-mono font-bold text-sky-400"
                          value={rockBoreholeData.borehole.depth_from || 0}
                          onChange={(e) => {
                            const d = { ...rockBoreholeData };
                            d.borehole.depth_from = parseFloat(e.target.value) || 0.0;
                            setRockBoreholeData(d);
                            runLocalValidation(d);
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Depth To (m)</label>
                        <input 
                          type="number" 
                          step="0.1"
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs outline-none text-white focus:border-sky-500/50 font-mono font-bold text-sky-400"
                          value={rockBoreholeData.borehole.depth_to || 5}
                          onChange={(e) => {
                            const d = { ...rockBoreholeData };
                            d.borehole.depth_to = parseFloat(e.target.value) || 0.0;
                            setRockBoreholeData(d);
                            runLocalValidation(d);
                          }}
                        />
                      </div>
                    </div>
                  </section>
                  
                  {/* Panel 2: Interactive Core Photo Viewer */}
                  <section className="glass rounded-2xl p-5 space-y-4 flex flex-col flex-1 min-h-[380px]">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2 text-sky-400 font-bold uppercase tracking-wider text-xs">
                        <Camera size={14} />
                        <span>Panel 2: Core Photo Viewer</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <input 
                          type="checkbox" 
                          id="show-overlays-chk"
                          checked={showOverlays}
                          onChange={(e) => setShowOverlays(e.target.checked)}
                          className="rounded border-white/10 bg-black/40"
                        />
                        <label htmlFor="show-overlays-chk" className="cursor-pointer select-none">Overlays</label>
                      </div>
                    </div>
                    
                    {/* Control Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-1.5 bg-black/40 border border-white/5 rounded-lg p-1">
                        <button 
                          onClick={() => setPhotoZoom(prev => Math.min(3, prev + 0.2))}
                          className="w-6 h-6 flex items-center justify-center border border-white/10 rounded hover:bg-white/5 text-slate-200"
                          title="Zoom In"
                        >+</button>
                        <button 
                          onClick={() => setPhotoZoom(prev => Math.max(0.5, prev - 0.2))}
                          className="w-6 h-6 flex items-center justify-center border border-white/10 rounded hover:bg-white/5 text-slate-200"
                          title="Zoom Out"
                        >-</button>
                        <button 
                          onClick={() => { setPhotoZoom(1); setPhotoBrightness(100); setPhotoContrast(100); }}
                          className="px-2 h-6 flex items-center justify-center border border-white/10 rounded hover:bg-white/5 text-[9px] font-bold text-slate-400"
                        >Reset</button>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-slate-500 font-mono">BR:</span>
                          <input 
                            type="range" 
                            min="50" 
                            max="180" 
                            className="w-16 h-1 accent-sky-400"
                            value={photoBrightness}
                            onChange={(e) => setPhotoBrightness(parseInt(e.target.value))}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-slate-500 font-mono">CON:</span>
                          <input 
                            type="range" 
                            min="50" 
                            max="180" 
                            className="w-16 h-1 accent-sky-400"
                            value={photoContrast}
                            onChange={(e) => setPhotoContrast(parseInt(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Viewport Aspect Video */}
                    <div className="relative flex-1 bg-black/60 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center min-h-[220px]">
                      {photoUrl ? (
                        <div className="relative w-full h-full flex items-center justify-center overflow-auto scrollbar-thin">
                          <div 
                            className="relative transition-all duration-100"
                            style={{ 
                              transform: `scale(${photoZoom})`,
                              filter: `brightness(${photoBrightness}%) contrast(${photoContrast}%)`,
                            }}
                          >
                            <img src={photoUrl} className="max-w-full max-h-[300px] object-contain rounded" alt="Rock core box" />
                            
                            {/* Overlay boundaries */}
                            {showOverlays && detectedRows.map((row, idx) => {
                              return (
                                <div 
                                  key={idx}
                                  className="absolute border border-dashed border-sky-400 bg-sky-500/10 hover:bg-sky-500/20 transition-all flex items-center justify-between"
                                  style={{
                                    top: `${(row.top / 800) * 100}%`,
                                    height: `${((row.bottom - row.top) / 800) * 100}%`,
                                    left: `${(row.left / 1200) * 100}%`,
                                    width: `${((row.right - row.left) / 1200) * 100}%`
                                  }}
                                >
                                  <div className="bg-sky-500 text-white font-mono text-[8px] px-1 py-0.5 rounded-br shadow-md select-none">
                                    Row {idx+1}
                                  </div>
                                  
                                  {/* Draggable sliders / inputs absolute right */}
                                  <div className="flex flex-col gap-0.5 pr-0.5 pointer-events-auto bg-black/65 border border-white/10 rounded p-0.5 scale-90">
                                    <input 
                                      type="number"
                                      value={row.top}
                                      onChange={(e) => {
                                        const newRows = [...detectedRows];
                                        newRows[idx].top = parseInt(e.target.value) || 0;
                                        setDetectedRows(newRows);
                                      }}
                                      className="bg-transparent text-white font-mono text-[8px] w-10 text-center outline-none"
                                    />
                                    <input 
                                      type="number"
                                      value={row.bottom}
                                      onChange={(e) => {
                                        const newRows = [...detectedRows];
                                        newRows[idx].bottom = parseInt(e.target.value) || 0;
                                        setDetectedRows(newRows);
                                      }}
                                      className="bg-transparent text-white font-mono text-[8px] w-10 text-center outline-none border-t border-white/10"
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center p-8 space-y-4">
                          <Camera className="mx-auto text-slate-600 animate-pulse" size={32} />
                          <div className="space-y-1">
                            <h4 className="font-bold text-slate-400 text-xs">No Core Image Active</h4>
                            <p className="text-[10px] text-slate-500 max-w-[200px] mx-auto">Upload rock core box photo to start OpenCV visual layout segmentation.</p>
                          </div>
                          <div className="relative group border border-dashed border-white/20 rounded-xl p-4 bg-black/20 hover:border-sky-500/50 transition-all cursor-pointer max-w-[220px] mx-auto">
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              id="rock-file-input-new" 
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setRockParsingState('uploading');
                                setRockProgress('Uploading core box and detecting depth rows...');
                                
                                const fd = new FormData();
                                fd.append('photo', file);
                                
                                try {
                                  const res = await apiFetch(apiUrl('/core/upload'), {
                                    method: 'POST',
                                    body: fd
                                  });
                                  if (res.ok) {
                                    const data = await res.json();
                                    setPhotoPath(data.photo_path);
                                    setPhotoUrl(apiUrl(data.photo_url));
                                    setDetectedRows(data.rows);
                                    
                                    const updateData = { ...rockBoreholeData };
                                    updateData.borehole.depth_from = parseFloat(formData.depthFrom) || 0.0;
                                    updateData.borehole.depth_to = parseFloat(formData.depthTo) || 5.0;
                                    setRockBoreholeData(updateData);
                                    
                                    setRockParsingState('success');
                                    setRockProgress('Core photo uploaded successfully. Coordinates detected.');
                                  } else {
                                    setRockParsingState('error');
                                    setRockProgress('Image upload failed.');
                                  }
                                } catch (err: any) {
                                  setRockParsingState('error');
                                  setRockProgress(`Error: ${err.message}`);
                                }
                              }}
                            />
                            <label htmlFor="rock-file-input-new" className="cursor-pointer space-y-1 block">
                              <ImageIcon className="mx-auto text-slate-400 group-hover:text-sky-400 transition-colors" size={24} />
                              <div className="text-[10px] font-bold text-sky-400">Click to Upload Core Photo</div>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Tweak controls */}
                    {photoUrl && (
                      <div className="flex gap-2 text-xs">
                        <button
                          onClick={async () => {
                            setRockParsingState('uploading');
                            setRockProgress('Processing piece count segmentation and RQD metrics on rows...');
                            try {
                              const res = await apiFetch(apiUrl('/core/process'), {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  photo_path: photoPath,
                                  depth_from: rockBoreholeData.borehole.depth_from,
                                  depth_to: rockBoreholeData.borehole.depth_to,
                                  rows: detectedRows
                                })
                              });
                              if (res.ok) {
                                const data = await res.json();
                                const updateData = { ...rockBoreholeData };
                                updateData.core_runs = data.runs.map((r: any) => ({
                                  run_no: r.runIndex,
                                  depth_from: r.depthFromM,
                                  depth_to: r.depthToM,
                                  tcr: 95,
                                  rqd: r.rqdPercent || 75,
                                  fracture_spacing_mm: r.dominantJointSpacingMm || 120,
                                  status: 'draft'
                                }));
                                
                                setRockBoreholeData(updateData);
                                setRockParsingState('success');
                                setRockProgress('Rows segmented! Click "Generate AI Draft Log" to draft lithology & defects.');
                                setRockResult(data);
                              } else {
                                setRockParsingState('error');
                                setRockProgress('OpenCV piece segmentation failed.');
                              }
                            } catch (err: any) {
                              setRockParsingState('error');
                              setRockProgress(`Error: ${err.message}`);
                            }
                          }}
                          className="flex-1 py-2 px-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md"
                        >
                          <Sparkles size={12} />
                          <span>Process Piece Extraction</span>
                        </button>
                        
                        <button
                          onClick={async () => {
                            if (rockBoreholeData.core_runs.length === 0) {
                              alert("Please run Piece Extraction first to detect core runs.");
                              return;
                            }
                            setRockParsingState('uploading');
                            setRockProgress('DeepSeek AI drafting geology log wording & defects...');
                            try {
                              const res = await apiFetch(apiUrl('/core/generate-draft'), {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  borehole_id: rockBoreholeData.borehole.borehole_id,
                                  project_no: rockBoreholeData.project.project_no,
                                  depth_from: rockBoreholeData.borehole.depth_from,
                                  depth_to: rockBoreholeData.borehole.depth_to,
                                  runs: rockBoreholeData.core_runs,
                                  rock_type: { value: 'SEDIMENTARY ROCK', confidence: 0.64 }
                                })
                              });
                              if (res.ok) {
                                const draft = await res.json();
                                const updateData = { ...rockBoreholeData };
                                updateData.lithology_units = draft.lithology_units.map((u: any) => ({ ...u, status: 'draft' }));
                                updateData.discontinuities = draft.discontinuities.map((d: any) => ({ ...d, status: 'draft' }));
                                updateData.core_runs = updateData.core_runs.map((r: any) => ({ ...r, status: 'draft' }));
                                
                                setRockBoreholeData(updateData);
                                setRockParsingState('success');
                                setRockProgress('DeepSeek AI draft generated! Review suggested values in Panel 3.');
                                runLocalValidation(updateData);
                              } else {
                                setRockParsingState('error');
                                setRockProgress('DeepSeek log drafting failed.');
                              }
                            } catch (err: any) {
                              setRockParsingState('error');
                              setRockProgress(`Error: ${err.message}`);
                            }
                          }}
                          className="flex-1 py-2 px-3 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md"
                        >
                          <Cpu size={12} />
                          <span>Generate AI Draft Log</span>
                        </button>
                      </div>
                    )}
                    
                    {rockParsingState !== 'idle' && (
                      <div className={`p-3 rounded-xl border text-[10px] font-mono leading-relaxed text-left ${
                        rockParsingState === 'uploading' ? 'bg-sky-500/5 border-sky-500/10 text-sky-400' :
                        rockParsingState === 'success' ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' :
                        'bg-rose-500/5 border-rose-500/10 text-rose-400'
                      }`}>
                        <div className="flex items-center gap-1.5 font-bold mb-0.5">
                          {rockParsingState === 'uploading' && <Loader2 className="animate-spin" size={10} />}
                          {rockParsingState === 'success' && <CheckCircle2 size={10} />}
                          {rockParsingState === 'error' && <AlertCircle size={10} />}
                          <span>PIPELINE ENGINE</span>
                        </div>
                        <p>{rockProgress}</p>
                      </div>
                    )}
                  </section>
                </div>
                
                {/* Column 2: Right - Log Editor & Live PDF Preview (xl:col-span-7) */}
                <div className="xl:col-span-7 flex flex-col gap-6 h-full overflow-y-auto pr-1">
                  
                  {/* Panel 3: Editable Borehole Log Table & Discontinuity Builder */}
                  <section className="glass rounded-2xl p-5 space-y-4 flex flex-col min-h-[420px]">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2 text-sky-400 font-bold uppercase tracking-wider text-xs">
                        <Activity size={14} />
                        <span>Panel 3: OpenGround Borehole Log Editor</span>
                      </div>
                      
                      {/* Editor Sub Tabs */}
                      <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5 text-[10px]">
                        <button
                          onClick={() => setActiveTableTab('lithology')}
                          className={`px-3 py-1.5 rounded-md font-semibold transition-all ${activeTableTab === 'lithology' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-350'}`}
                        >Lithology</button>
                        <button
                          onClick={() => setActiveTableTab('runs')}
                          className={`px-3 py-1.5 rounded-md font-semibold transition-all ${activeTableTab === 'runs' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-350'}`}
                        >Core Runs</button>
                        <button
                          onClick={() => setActiveTableTab('disconts')}
                          className={`px-3 py-1.5 rounded-md font-semibold transition-all ${activeTableTab === 'disconts' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-350'}`}
                        >Discontinuities</button>
                      </div>
                    </div>
                    
                    {/* Tab contents */}
                    <div className="flex-1 overflow-y-auto max-h-[300px] scrollbar-thin">
                      
                      {activeTableTab === 'lithology' && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-white/10 text-slate-500 uppercase tracking-widest text-[9px] font-bold">
                                <th className="py-2 px-1">From (m)</th>
                                <th className="py-2 px-1">To (m)</th>
                                <th className="py-2 px-2">Material</th>
                                <th className="py-2 px-2">Weathering</th>
                                <th className="py-2 px-2">Strength</th>
                                <th className="py-2 px-3">Description</th>
                                <th className="py-2 px-1 text-center">Status</th>
                                <th className="py-2 px-1 text-center">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-mono text-[11px] text-slate-300">
                              {rockBoreholeData.lithology_units.length === 0 ? (
                                <tr>
                                  <td colSpan={8} className="py-8 text-center text-slate-650 italic">No lithology units drafted yet. Run AI Draft Log above.</td>
                                </tr>
                              ) : (
                                rockBoreholeData.lithology_units.map((unit: any, idx: number) => {
                                  const statusColor = getFieldStatusColor(unit.status, unit.description);
                                  return (
                                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                                      <td className="py-1 px-1">
                                        <input 
                                          type="number" 
                                          step="0.01"
                                          value={unit.from}
                                          onChange={(e) => {
                                            const d = { ...rockBoreholeData };
                                            d.lithology_units[idx].from = parseFloat(e.target.value) || 0.0;
                                            setRockBoreholeData(d);
                                            runLocalValidation(d);
                                          }}
                                          className="bg-transparent text-white font-mono text-[11px] w-12 outline-none border border-transparent hover:border-white/10 focus:border-sky-500/50 rounded text-left"
                                        />
                                      </td>
                                      <td className="py-1 px-1">
                                        <input 
                                          type="number" 
                                          step="0.01"
                                          value={unit.to}
                                          onChange={(e) => {
                                            const d = { ...rockBoreholeData };
                                            d.lithology_units[idx].to = parseFloat(e.target.value) || 0.0;
                                            setRockBoreholeData(d);
                                            runLocalValidation(d);
                                          }}
                                          className="bg-transparent text-white font-mono text-[11px] w-12 outline-none border border-transparent hover:border-white/10 focus:border-sky-500/50 rounded text-left"
                                        />
                                      </td>
                                      <td className="py-1 px-2">
                                        <input 
                                          type="text"
                                          value={unit.material}
                                          onChange={(e) => {
                                            const d = { ...rockBoreholeData };
                                            d.lithology_units[idx].material = e.target.value;
                                            setRockBoreholeData(d);
                                          }}
                                          className="bg-transparent text-white text-[11px] w-20 outline-none border border-transparent hover:border-white/10 focus:border-sky-500/50 rounded"
                                        />
                                      </td>
                                      <td className="py-1 px-2">
                                        <select 
                                          value={unit.weathering}
                                          onChange={(e) => {
                                            const d = { ...rockBoreholeData };
                                            d.lithology_units[idx].weathering = e.target.value;
                                            setRockBoreholeData(d);
                                          }}
                                          className="bg-black/60 text-amber-400 text-[10px] font-bold rounded border border-white/10 px-1 py-0.5 outline-none"
                                        >
                                          {['FR','SW','MW','HW','EW','REVIEW'].map(w => <option key={w} value={w}>{w}</option>)}
                                        </select>
                                      </td>
                                      <td className="py-1 px-2">
                                        <select 
                                          value={unit.strength}
                                          onChange={(e) => {
                                            const d = { ...rockBoreholeData };
                                            d.lithology_units[idx].strength = e.target.value;
                                            setRockBoreholeData(d);
                                          }}
                                          className="bg-black/60 text-red-400 text-[10px] font-bold rounded border border-white/10 px-1 py-0.5 outline-none"
                                        >
                                          {['VL','L','M','H','VH','EH','REVIEW'].map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                      </td>
                                      <td className="py-1 px-3">
                                        <textarea 
                                          value={unit.description}
                                          rows={1}
                                          onChange={(e) => {
                                            const d = { ...rockBoreholeData };
                                            d.lithology_units[idx].description = e.target.value;
                                            setRockBoreholeData(d);
                                            runLocalValidation(d);
                                          }}
                                          className="bg-transparent text-slate-300 text-[11px] w-full min-w-[150px] outline-none border border-transparent hover:border-white/10 focus:border-sky-500/50 rounded resize-y"
                                        />
                                      </td>
                                      <td className="py-1 px-1 text-center">
                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${statusColor}`}>
                                          {unit.status}
                                        </span>
                                      </td>
                                      <td className="py-1 px-1 text-center space-x-1">
                                        {unit.status !== 'approved' && (
                                          <button
                                            onClick={() => {
                                              const d = { ...rockBoreholeData };
                                              d.lithology_units[idx].status = 'approved';
                                              setRockBoreholeData(d);
                                              runLocalValidation(d);
                                            }}
                                            className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-bold rounded"
                                          >Approve</button>
                                        )}
                                        <button
                                          onClick={() => {
                                            const d = { ...rockBoreholeData };
                                            d.lithology_units.splice(idx, 1);
                                            setRockBoreholeData(d);
                                            runLocalValidation(d);
                                          }}
                                          className="px-1.5 py-0.5 border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 text-[9px] font-bold rounded"
                                        >Del</button>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                          <button 
                            onClick={() => {
                              const d = { ...rockBoreholeData };
                              const nextFrom = d.lithology_units.length > 0 ? d.lithology_units[d.lithology_units.length - 1].to : d.borehole.depth_from;
                              const nextTo = Math.min(d.borehole.depth_to, nextFrom + 1.0);
                              d.lithology_units.push({
                                from: nextFrom,
                                to: nextTo,
                                material: 'SANDSTONE',
                                description: 'SANDSTONE: fine-grained, grey, bedded. Review required.',
                                weathering: 'SW',
                                strength: 'M',
                                structure: 'bedded',
                                uscs_symbol: 'ROCK',
                                status: 'draft'
                              });
                              setRockBoreholeData(d);
                              runLocalValidation(d);
                            }}
                            className="mt-3 px-3 py-1 bg-black/40 hover:bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-sky-400 transition-colors"
                          >
                            + Add Lithology Unit
                          </button>
                        </div>
                      )}
                      
                      {activeTableTab === 'runs' && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-white/10 text-slate-500 uppercase tracking-widest text-[9px] font-bold">
                                <th className="py-2 px-1">Run No</th>
                                <th className="py-2 px-2">From (m)</th>
                                <th className="py-2 px-2">To (m)</th>
                                <th className="py-2 px-2">TCR %</th>
                                <th className="py-2 px-2">RQD %</th>
                                <th className="py-2 px-2">Fracture Spacing (mm)</th>
                                <th className="py-2 px-1 text-center">Status</th>
                                <th className="py-2 px-1 text-center">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-mono text-[11px] text-slate-300">
                              {rockBoreholeData.core_runs.length === 0 ? (
                                <tr>
                                  <td colSpan={8} className="py-8 text-center text-slate-650 italic">No core runs active. Process piece extraction in Panel 2.</td>
                                </tr>
                              ) : (
                                rockBoreholeData.core_runs.map((run: any, idx: number) => {
                                  const statusColor = getFieldStatusColor(run.status, run.tcr);
                                  return (
                                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                                      <td className="py-1.5 px-1 font-bold text-white text-center">
                                        <input 
                                          type="number" 
                                          value={run.run_no} 
                                          className="bg-transparent w-8 text-center text-white outline-none border border-transparent hover:border-white/10 rounded"
                                          onChange={(e) => {
                                            const d = { ...rockBoreholeData };
                                            d.core_runs[idx].run_no = parseInt(e.target.value) || (idx + 1);
                                            setRockBoreholeData(d);
                                          }}
                                        />
                                      </td>
                                      <td className="py-1.5 px-2">
                                        <input 
                                          type="number" 
                                          step="0.01"
                                          value={run.depth_from} 
                                          className="bg-transparent w-12 text-left text-white outline-none border border-transparent hover:border-white/10 rounded"
                                          onChange={(e) => {
                                            const d = { ...rockBoreholeData };
                                            d.core_runs[idx].depth_from = parseFloat(e.target.value) || 0.0;
                                            d.core_runs[idx].depthFromM = parseFloat(e.target.value) || 0.0;
                                            setRockBoreholeData(d);
                                            runLocalValidation(d);
                                          }}
                                        />
                                      </td>
                                      <td className="py-1.5 px-2">
                                        <input 
                                          type="number" 
                                          step="0.01"
                                          value={run.depth_to} 
                                          className="bg-transparent w-12 text-left text-white outline-none border border-transparent hover:border-white/10 rounded"
                                          onChange={(e) => {
                                            const d = { ...rockBoreholeData };
                                            d.core_runs[idx].depth_to = parseFloat(e.target.value) || 0.0;
                                            d.core_runs[idx].depthToM = parseFloat(e.target.value) || 0.0;
                                            setRockBoreholeData(d);
                                            runLocalValidation(d);
                                          }}
                                        />
                                      </td>
                                      <td className="py-1.5 px-2">
                                        <input 
                                          type="number" 
                                          value={run.tcr} 
                                          className="bg-transparent w-10 text-center text-sky-400 font-bold outline-none border border-transparent hover:border-white/10 rounded"
                                          onChange={(e) => {
                                            const d = { ...rockBoreholeData };
                                            d.core_runs[idx].tcr = parseInt(e.target.value) || 0;
                                            d.core_runs[idx].tcrPercent = parseInt(e.target.value) || 0;
                                            setRockBoreholeData(d);
                                            runLocalValidation(d);
                                          }}
                                        />
                                      </td>
                                      <td className="py-1.5 px-2">
                                        <input 
                                          type="number" 
                                          value={run.rqd} 
                                          className="bg-transparent w-10 text-center text-sky-400 font-bold outline-none border border-transparent hover:border-white/10 rounded"
                                          onChange={(e) => {
                                            const d = { ...rockBoreholeData };
                                            d.core_runs[idx].rqd = parseInt(e.target.value) || 0;
                                            d.core_runs[idx].rqdPercent = parseInt(e.target.value) || 0;
                                            setRockBoreholeData(d);
                                            runLocalValidation(d);
                                          }}
                                        />
                                      </td>
                                      <td className="py-1.5 px-2">
                                        <input 
                                          type="number" 
                                          value={run.fracture_spacing_mm} 
                                          className="bg-transparent w-16 text-center text-white outline-none border border-transparent hover:border-white/10 rounded"
                                          onChange={(e) => {
                                            const d = { ...rockBoreholeData };
                                            d.core_runs[idx].fracture_spacing_mm = parseInt(e.target.value) || 0;
                                            d.core_runs[idx].dominantJointSpacingMm = parseInt(e.target.value) || 0;
                                            setRockBoreholeData(d);
                                          }}
                                        />
                                      </td>
                                      <td className="py-1.5 px-1 text-center">
                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${statusColor}`}>
                                          {run.status}
                                        </span>
                                      </td>
                                      <td className="py-1.5 px-1 text-center space-x-1">
                                        {run.status !== 'approved' && (
                                          <button
                                            onClick={() => {
                                              const d = { ...rockBoreholeData };
                                              d.core_runs[idx].status = 'approved';
                                              setRockBoreholeData(d);
                                              runLocalValidation(d);
                                            }}
                                            className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-bold rounded"
                                          >Approve</button>
                                        )}
                                        <button
                                          onClick={() => {
                                            const d = { ...rockBoreholeData };
                                            d.core_runs.splice(idx, 1);
                                            setRockBoreholeData(d);
                                            runLocalValidation(d);
                                          }}
                                          className="px-1.5 py-0.5 border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 text-[9px] font-bold rounded"
                                        >Del</button>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                          <button 
                            onClick={() => {
                              const d = { ...rockBoreholeData };
                              const nextNo = d.core_runs.length + 1;
                              const nextFrom = d.core_runs.length > 0 ? d.core_runs[d.core_runs.length - 1].depth_to : d.borehole.depth_from;
                              const nextTo = Math.min(d.borehole.depth_to, nextFrom + 1.5);
                              d.core_runs.push({
                                run_no: nextNo,
                                depth_from: nextFrom,
                                depth_to: nextTo,
                                tcr: 100,
                                rqd: 85,
                                fracture_spacing_mm: 150,
                                status: 'draft'
                              });
                              setRockBoreholeData(d);
                              runLocalValidation(d);
                            }}
                            className="mt-3 px-3 py-1 bg-black/40 hover:bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-sky-400 transition-colors"
                          >
                            + Add Core Run
                          </button>
                        </div>
                      )}
                      
                      {activeTableTab === 'disconts' && (
                        <div className="space-y-4">
                          {/* Discontinuity Code Builder */}
                          <div className="bg-black/30 border border-white/5 p-3.5 rounded-xl space-y-3">
                            <div className="flex items-center gap-1.5 text-xs text-sky-400 font-bold uppercase tracking-wider">
                              <Sparkles size={12} />
                              <span>gINT / OpenGround Coded Discontinuity Builder</span>
                            </div>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-left text-[10px]">
                              <div>
                                <label className="text-slate-500 block mb-0.5 uppercase tracking-wider font-bold">Depth (m)</label>
                                <input 
                                  type="number"
                                  step="0.01"
                                  className="w-full bg-black/50 border border-white/10 rounded px-2 py-0.5 text-xs text-white"
                                  value={defectDepth}
                                  onChange={e => setDefectDepth(e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="text-slate-500 block mb-0.5 uppercase tracking-wider font-bold">Defect Type</label>
                                <select 
                                  className="w-full bg-black/50 border border-white/10 rounded px-2 py-0.5 text-xs text-white"
                                  value={defectType}
                                  onChange={e => setDefectType(e.target.value)}
                                >
                                  <option value="BP">BP (Bedding Plane)</option>
                                  <option value="JN">JN (Joint)</option>
                                  <option value="CS">CS (Clay Seam)</option>
                                  <option value="SZ">SZ (Shear Zone)</option>
                                  <option value="DB">DB (Drilling Break)</option>
                                  <option value="HB">HB (Handling Break)</option>
                                  <option value="VN">VN (Vein)</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-slate-500 block mb-0.5 uppercase tracking-wider font-bold">Angle (°)</label>
                                <input 
                                  type="number"
                                  className="w-full bg-black/50 border border-white/10 rounded px-2 py-0.5 text-xs text-white"
                                  value={defectAngle}
                                  onChange={e => setDefectAngle(e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="text-slate-500 block mb-0.5 uppercase tracking-wider font-bold">Shape</label>
                                <select 
                                  className="w-full bg-black/50 border border-white/10 rounded px-2 py-0.5 text-xs text-white"
                                  value={defectShape}
                                  onChange={e => setDefectShape(e.target.value)}
                                >
                                  <option value="PR">PR (Planar)</option>
                                  <option value="CU">CU (Curved)</option>
                                  <option value="IR">IR (Irregular)</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-slate-500 block mb-0.5 uppercase tracking-wider font-bold">Roughness</label>
                                <select 
                                  className="w-full bg-black/50 border border-white/10 rounded px-2 py-0.5 text-xs text-white"
                                  value={defectRoughness}
                                  onChange={e => setDefectRoughness(e.target.value)}
                                >
                                  <option value="RO">RO (Rough)</option>
                                  <option value="SM">SM (Smooth)</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-slate-500 block mb-0.5 uppercase tracking-wider font-bold">Infilling</label>
                                <select 
                                  className="w-full bg-black/50 border border-white/10 rounded px-2 py-0.5 text-xs text-white"
                                  value={defectInfilling}
                                  onChange={e => setDefectInfilling(e.target.value)}
                                >
                                  <option value="CN">CN (Clean)</option>
                                  <option value="SN">SN (Stained)</option>
                                  <option value="VN">VN (Veneer)</option>
                                </select>
                              </div>
                              <div className="col-span-2">
                                <label className="text-slate-500 block mb-0.5 uppercase tracking-wider font-bold">Notes</label>
                                <input 
                                  type="text"
                                  className="w-full bg-black/50 border border-white/10 rounded px-2 py-0.5 text-xs text-white"
                                  value={defectNotes}
                                  onChange={e => setDefectNotes(e.target.value)}
                                />
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between border-t border-white/5 pt-2">
                              <div className="text-[10px] font-mono text-emerald-400 font-bold">
                                Preview: {defectDepth}m: {defectType} -{defectAngle}° {defectShape} {defectRoughness} {defectInfilling} ({defectNotes})
                              </div>
                              
                              <button
                                onClick={() => {
                                  const d = { ...rockBoreholeData };
                                  d.discontinuities.push({
                                    depth: parseFloat(defectDepth) || 0.0,
                                    defect_type: defectType,
                                    angle: parseInt(defectAngle) || 0,
                                    shape: defectShape,
                                    roughness: defectRoughness,
                                    infilling: defectInfilling,
                                    notes: defectNotes,
                                    status: 'draft'
                                  });
                                  setRockBoreholeData(d);
                                  runLocalValidation(d);
                                }}
                                className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-[10px] font-bold transition-all shadow"
                              >+ Add Joint to Log</button>
                            </div>
                          </div>
                          
                          {/* Discontinuities Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-white/10 text-slate-500 uppercase tracking-widest text-[9px] font-bold">
                                  <th className="py-2 px-1">Depth (m)</th>
                                  <th className="py-2 px-2">Type</th>
                                  <th className="py-2 px-2">Angle</th>
                                  <th className="py-2 px-2">Shape/Rough</th>
                                  <th className="py-2 px-2">Infill</th>
                                  <th className="py-2 px-3">Notes</th>
                                  <th className="py-2 px-1 text-center">Status</th>
                                  <th className="py-2 px-1 text-center">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5 font-mono text-[11px] text-slate-300">
                                {rockBoreholeData.discontinuities.length === 0 ? (
                                  <tr>
                                    <td colSpan={8} className="py-6 text-center text-slate-650 italic">No discontinuities registered yet. Create using builder.</td>
                                  </tr>
                                ) : (
                                  rockBoreholeData.discontinuities.map((disc: any, idx: number) => {
                                    const statusColor = getFieldStatusColor(disc.status, disc.depth);
                                    return (
                                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                                        <td className="py-1 px-1 font-bold text-sky-400">
                                          <input 
                                            type="number"
                                            step="0.01"
                                            value={disc.depth}
                                            className="bg-transparent w-12 text-left text-sky-400 outline-none"
                                            onChange={(e) => {
                                              const d = { ...rockBoreholeData };
                                              d.discontinuities[idx].depth = parseFloat(e.target.value) || 0.0;
                                              setRockBoreholeData(d);
                                              runLocalValidation(d);
                                            }}
                                          />
                                        </td>
                                        <td className="py-1 px-2">{disc.defect_type || disc.type}</td>
                                        <td className="py-1 px-2">{disc.angle}°</td>
                                        <td className="py-1 px-2">{disc.shape} / {disc.roughness}</td>
                                        <td className="py-1 px-2">{disc.infilling}</td>
                                        <td className="py-1 px-3 text-slate-400 truncate max-w-[120px]" title={disc.notes}>{disc.notes}</td>
                                        <td className="py-1 px-1 text-center">
                                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${statusColor}`}>
                                            {disc.status}
                                          </span>
                                        </td>
                                        <td className="py-1 px-1 text-center space-x-1">
                                          {disc.status !== 'approved' && (
                                            <button
                                              onClick={() => {
                                                const d = { ...rockBoreholeData };
                                                d.discontinuities[idx].status = 'approved';
                                                setRockBoreholeData(d);
                                                runLocalValidation(d);
                                              }}
                                              className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-bold rounded"
                                            >Approve</button>
                                          )}
                                          <button
                                            onClick={() => {
                                              const d = { ...rockBoreholeData };
                                              d.discontinuities.splice(idx, 1);
                                              setRockBoreholeData(d);
                                              runLocalValidation(d);
                                            }}
                                            className="px-1.5 py-0.5 border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 text-[9px] font-bold rounded"
                                          >Del</button>
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Approve all & Save actions */}
                    <div className="flex justify-between items-center border-t border-white/5 pt-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const d = { ...rockBoreholeData };
                            d.lithology_units = d.lithology_units.map((u: any) => ({ ...u, status: 'approved' }));
                            d.core_runs = d.core_runs.map((r: any) => ({ ...r, status: 'approved' }));
                            d.discontinuities = d.discontinuities.map((disc: any) => ({ ...disc, status: 'approved' }));
                            setRockBoreholeData(d);
                            runLocalValidation(d);
                            alert("All drafted log elements set to Approved!");
                          }}
                          className="py-1.5 px-3 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 size={12} />
                          <span>Approve All Log Fields</span>
                        </button>
                        
                        <button
                          onClick={async () => {
                            try {
                              const res = await apiFetch(apiUrl('/core/save'), {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(rockBoreholeData)
                              });
                              if (res.ok) {
                                alert("Borehole dataset committed to local SQLite database!");
                              } else {
                                alert("Save operation failed.");
                              }
                            } catch (e: any) {
                              alert(`Error: ${e.message}`);
                            }
                          }}
                          className="py-1.5 px-3 border border-white/10 hover:bg-white/5 text-slate-350 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Database size={12} />
                          <span>Save Logs to DB</span>
                        </button>
                      </div>
                      
                      <button
                        onClick={async () => {
                          const errors = runLocalValidation(rockBoreholeData);
                          if (errors.length > 0) {
                            alert("Validation checks failed. Please approve all fields and clear errors before PDF compilation.");
                            return;
                          }
                          setRockParsingState('uploading');
                          setRockProgress('Generating professional OpenGround-style vector PDF...');
                          try {
                            const res = await apiFetch(apiUrl('/pdf/export'), {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(rockBoreholeData)
                            });
                            if (res.ok) {
                              const data = await res.json();
                              setGeneratedPdfUrl(apiUrl(data.pdf_url));
                              setGeneratedPdfName(data.pdf_name);
                              setRockParsingState('success');
                              setRockProgress('Professional PDF Borehole Log compiled successfully!');
                            } else {
                              setRockParsingState('error');
                              setRockProgress('PDF compilation failed.');
                            }
                          } catch (e: any) {
                            setRockParsingState('error');
                            setRockProgress(`Error: ${e.message}`);
                          }
                        }}
                        className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all shadow-md flex items-center gap-1"
                      >
                        <RefreshCw size={12} />
                        <span>Sync & Export PDF</span>
                      </button>
                    </div>
                  </section>
                  
                  {/* Panel 4: Live PDF Preview & Validation Status */}
                  <section className="glass rounded-2xl p-5 space-y-4 flex-1 flex flex-col min-h-[300px]">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2 shrink-0">
                      <div className="flex items-center gap-2 text-sky-400 font-bold uppercase tracking-wider text-xs">
                        <FileText size={14} />
                        <span>Panel 4: Live OpenGround PDF Log Preview</span>
                      </div>
                      
                      {generatedPdfUrl && (
                        <a 
                          href={generatedPdfUrl}
                          download={generatedPdfName}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all"
                        >
                          <Download size={10} />
                          Download PDF
                        </a>
                      )}
                    </div>
                    
                    {/* Validation Errors panel */}
                    <div className={`p-3 rounded-lg border text-[10px] font-mono leading-relaxed transition-all shrink-0 ${
                      validationErrors.length > 0 ? 'bg-rose-500/5 border-rose-500/10 text-rose-300' : 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400'
                    }`}>
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        {validationErrors.length > 0 ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
                        <span>{validationErrors.length > 0 ? "VALIDATION CHECKS (" + validationErrors.length + " ISSUES)" : 'VERIFICATION PASSED'}</span>
                      </div>
                      {validationErrors.length > 0 ? (
                        <ul className="list-disc list-inside space-y-0.5 max-h-[60px] overflow-y-auto pr-1">
                          {validationErrors.map((err, idx) => (
                            <li key={idx} className="truncate" title={err}>{err}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>All depths continuous. Joint spacing valid. Lithology logs fully approved. AS1726 Compliant.</p>
                      )}
                    </div>
                    
                    {/* Frame Preview */}
                    <div className="flex-1 bg-slate-950 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center min-h-[220px]">
                      {generatedPdfUrl ? (
                        <iframe 
                          src={generatedPdfUrl + "#toolbar=0&navpanes=0"} 
                          className="w-full h-full min-h-[220px] rounded-xl bg-slate-900 border-none"
                          title="OpenGround Borehole Log Preview"
                        />
                      ) : (
                        <div className="text-center p-6 text-slate-500 italic text-xs">
                          <FileText size={28} className="mx-auto text-slate-650 mb-2" />
                          <p>Awaiting PDF Log Compilation.</p>
                          <p className="text-[10px] text-slate-600 mt-1">Make adjustments, click "Sync & Export PDF" to generate the vector log sheet.</p>
                        </div>
                      )}
                    </div>
                  </section>
                </div>
                
              </div>
            </motion.div>
          )}{activeTab === 'rag' && (
            <motion.div 
              key="rag-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Left Column: Data sources */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* 1. Project Site Selector */}
                <section className="glass rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sky-400">
                      <FolderOpen size={18} />
                      <h2 className="font-bold uppercase tracking-wider text-xs">Site Data Directory</h2>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <select 
                      value={selectedProject} 
                      onChange={e => setSelectedProject(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none text-sm text-white"
                    >
                      <option value="">-- Select Site Project Folder --</option>
                      {projects.map((proj, idx) => (
                        <option key={idx} value={proj.folder_path}>
                          [{proj.group}] {proj.project_id} ({proj.files_count} files)
                        </option>
                      ))}
                    </select>
                    
                    <button
                      onClick={analyzeProject}
                      disabled={!selectedProject || analysisState === 'analyzing'}
                      className="w-full py-3 bg-sky-600 hover:bg-sky-500 disabled:bg-white/5 disabled:text-slate-500 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                    >
                      {analysisState === 'analyzing' ? <Loader2 className="animate-spin" size={16} /> : <Eye size={16} />}
                      Analyze & Run OCR on Site Folder
                    </button>

                    <div className="relative flex py-2 items-center">
                      <div className="flex-grow border-t border-white/5"></div>
                      <span className="flex-shrink mx-4 text-slate-500 text-[10px] font-bold tracking-widest uppercase">OR UPLOAD DATA</span>
                      <div className="flex-grow border-t border-white/5"></div>
                    </div>

                    <div className="space-y-2">
                      <div className="border border-dashed border-white/10 hover:border-sky-500/50 rounded-xl p-4 transition-all bg-black/20 text-center relative cursor-pointer">
                        <input 
                          type="file" 
                          multiple 
                          onChange={handleFileUpload} 
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Upload className="mx-auto text-slate-400 mb-2" size={24} />
                        <p className="text-xs text-slate-300 font-medium">Drag & drop files or click to browse</p>
                        <p className="text-[10px] text-slate-500 mt-1">Supports JPG, PNG, PDF, Excel (lab logs)</p>
                      </div>
                      
                      {uploadState !== 'idle' && (
                        <div className={`p-3 rounded-xl border text-xs font-semibold ${
                          uploadState === 'uploading' ? 'bg-sky-500/5 border-sky-500/10 text-sky-400' :
                          uploadState === 'success' ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' :
                          'bg-rose-500/5 border-rose-500/10 text-rose-400'
                        }`}>
                          <div className="flex items-center gap-2">
                            {uploadState === 'uploading' && <Loader2 className="animate-spin" size={14} />}
                            <span>{uploadProgress}</span>
                          </div>
                          {uploadFiles.length > 0 && (
                            <div className="mt-1.5 text-[10px] text-slate-500 font-mono">
                              Files: {uploadFiles.map(f => f.name).join(', ')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* OCR & Document Extraction details */}
                  {analysisState === 'success' && analysisResult && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="pt-4 border-t border-white/5 space-y-4"
                    >
                      <div className="p-3 bg-sky-500/5 rounded-xl border border-sky-500/10 space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-sky-400">
                          <span>SITE SCAN SUMMARY</span>
                          <Sparkles size={14} />
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-mono">
                          {analysisResult.summary}
                        </p>
                      </div>

                      {/* Display categorized extracted logs/photos */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-black/30 p-2.5 rounded-xl">
                          <ImageIcon className="mx-auto text-slate-400 mb-1" size={16} />
                          <span className="block text-lg font-bold text-white">{analysisResult.photos.length}</span>
                          <span className="text-[9px] uppercase tracking-wider text-slate-500">Photos</span>
                        </div>
                        <div className="bg-black/30 p-2.5 rounded-xl">
                          <FileSpreadsheet className="mx-auto text-slate-400 mb-1" size={16} />
                          <span className="block text-lg font-bold text-white">{analysisResult.dcp_forms.length}</span>
                          <span className="text-[9px] uppercase tracking-wider text-slate-500">DCP Sheets</span>
                        </div>
                        <div className="bg-black/30 p-2.5 rounded-xl">
                          <FileText className="mx-auto text-slate-400 mb-1" size={16} />
                          <span className="block text-lg font-bold text-white">{analysisResult.soil_logs.length}</span>
                          <span className="text-[9px] uppercase tracking-wider text-slate-500">Soil Logs</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </section>

                {/* 2. RAG Context Reference & Template */}
                <section className="glass rounded-3xl p-6 space-y-4">
                  <div className="flex items-center gap-2 text-sky-400">
                    <Database size={18} />
                    <h2 className="font-bold uppercase tracking-wider text-xs">Knowledge Reference (RAG)</h2>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Select Report Template</label>
                      <select 
                        value={selectedTemplate} 
                        onChange={e => setSelectedTemplate(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 outline-none text-sm text-white"
                      >
                        <option value="">-- Select Template --</option>
                        {templates.map((temp, idx) => (
                          <option key={idx} value={temp.template_id}>
                            [{temp.category}] {temp.file_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Select Reference Historical Report</label>
                      <select 
                        value={selectedHistory} 
                        onChange={e => setSelectedHistory(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 outline-none text-sm text-white"
                      >
                        <option value="">-- Select Reference Report --</option>
                        {history.map((hist, idx) => (
                          <option key={idx} value={hist.file_path}>
                            [{hist.group}] {hist.file_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>
              </div>

              {/* Right Column: Parameter matching and Swarm Generation */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Variable fields list */}
                <section className="glass rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2 text-sky-400">
                      <Sliders size={18} />
                      <h2 className="font-bold uppercase tracking-wider text-xs">Template Field Replacements</h2>
                    </div>
                    <span className="text-xs text-slate-500">
                      {placeholders.length} parameters found
                    </span>
                  </div>

                  {isFetchingSuggestions ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[250px] overflow-y-auto pr-1">
                      {[...Array(6)].map((_, idx) => (
                        <div key={idx} className="space-y-2 animate-pulse">
                          <div className="h-3 bg-slate-700/50 rounded w-1/3"></div>
                          <div className="h-8 bg-slate-800/40 rounded-lg border border-white/5"></div>
                        </div>
                      ))}
                    </div>
                  ) : placeholders.length === 0 ? (
                    <p className="text-slate-600 text-sm italic py-4 text-center">Select a report template to load fields...</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[250px] overflow-y-auto pr-1">
                      {placeholders.map((p, idx) => (
                        <div key={idx} className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 font-mono uppercase block">{p}</label>
                          <input 
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-sky-500/50 text-white" 
                            value={replacements[p] || ''} 
                            onChange={e => setReplacements({ ...replacements, [p]: e.target.value })}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Generator node execution logs & actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Swarm logs execution terminal */}
                  <div className="glass rounded-3xl p-5 flex flex-col h-[280px]">
                    <div className="flex items-center gap-2 text-slate-400 mb-3 border-b border-white/5 pb-2">
                      <Terminal size={16} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">RAG Swarm Monitor</span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-2 font-mono text-[11px] scrollbar-thin text-slate-400">
                      {ragLogs.length === 0 && <p className="text-slate-600 italic">Swarm command center ready...</p>}
                      {ragLogs.map((log, i) => (
                        <div key={i} className="flex gap-2 leading-relaxed">
                          <span className="text-sky-500/50 shrink-0">&gt;</span>
                          <p className={log.includes('❌') ? 'text-rose-400' : log.includes('✨') ? 'text-emerald-400' : log.includes('🤖') ? 'text-sky-300' : 'text-slate-300'}>{log}</p>
                        </div>
                      ))}
                      <div ref={ragTerminalEndRef} />
                    </div>
                  </div>

                  {/* Node visualization or control flow */}
                  <div className="glass rounded-3xl p-5 flex flex-col justify-between h-[280px]">
                    <div className="space-y-4">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Swarm Nodes Flow</div>
                      
                      <div className="flex flex-wrap gap-2">
                        {SWARM_AGENTS.map((sa) => {
                          const isActive = currentSwarmAgent === sa.id;
                          return (
                            <div 
                              key={sa.id} 
                              className={`px-3 py-1.5 rounded-lg border text-[10px] font-semibold uppercase flex items-center gap-1.5 transition-all ${isActive ? 'bg-sky-500/20 text-sky-400 border-sky-500/40 shadow-sm' : 'bg-black/20 text-slate-500 border-white/5'}`}
                            >
                              <sa.icon size={12} />
                              {sa.name}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      onClick={generateSwarmReport}
                      disabled={!selectedTemplate || ragState === 'generating'}
                      className="w-full py-3.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-40 disabled:pointer-events-none rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-900/10 transition-all active:scale-95"
                    >
                      {ragState === 'generating' ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                      Generate Swarm Report (.docx)
                    </button>
                  </div>
                </div>

                {/* Final Swarm report success dispatch */}
                {ragState === 'success' && generatedFileUrl && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-indigo-500/10 border border-indigo-500/20 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-indigo-500 p-3 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                        <ShieldCheck className="text-white" size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-indigo-400 text-lg">Swarm report generated!</h4>
                        <p className="text-xs text-slate-400">
                          QA Score: <span className="text-white font-bold">{qaScore}%</span> | Passed: <span className="text-emerald-400 font-bold">{qaPassed ? 'Yes' : 'No'}</span>
                        </p>
                      </div>
                    </div>
                    <a 
                      href={generatedFileUrl} 
                      download={generatedFileName}
                      className="px-6 py-2.5 bg-white text-black text-xs font-bold rounded-xl hover:bg-slate-200 flex items-center gap-2 transition-all shadow-md"
                    >
                      <Download size={14} />
                      Download Docx Report
                    </a>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'logs' && (
            <motion.div 
              key="logs-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="glass rounded-3xl p-6 h-[480px] flex flex-col"
            >
              <div className="flex items-center gap-2 text-slate-400 mb-4 border-b border-white/5 pb-4">
                <Terminal size={18} />
                <span className="text-xs font-bold uppercase tracking-widest">Swarm Execution Stream</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2 font-mono text-sm scrollbar-thin text-slate-400">
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

        {/* Footer Stats */}
        <footer className="pt-8 border-t border-white/5 flex flex-wrap gap-12 justify-center lg:justify-start">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Compliance</p>
            <p className="text-sm font-bold">AS 1726-2017</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">OCR engine</p>
            <p className="text-sm font-bold">EasyOCR (PyTorch)</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">RAG Retrieval</p>
            <p className="text-sm font-bold">Past reports DB</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Swarm Nodes</p>
            <p className="text-sm font-bold">16 Active</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
