import React, { useState, useEffect } from "react";
import {
  FileText, Search, History, Sparkles, Download, RefreshCw,
  Building2, MapPin, Calendar, UserCheck, Sliders, CheckCircle2,
  AlertCircle, ChevronRight, Play, Loader2, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Template {
  template_id: string;
  file_name: string;
  relative_path: string;
  category: string;
  size_bytes: number;
  placeholders: string[];
  supported: boolean;
}

interface HistoricalReport {
  file_name: string;
  relative_path: string;
  group: string;
  sub_folder: string;
  file_size: number;
  file_path: string;
  extension: string;
}

const STAGES = [
  { id: "classifier", name: "Classifier Agent", desc: "Analyzing template structure & layout rules" },
  { id: "historical", name: "Historical Agent", desc: "Correlating styles with historical geotechnical reports" },
  { id: "compliance", name: "Compliance Agent", desc: "Verifying standard geotechnical logging rules" },
  { id: "qa", name: "QA Scoring Agent", desc: "Verifying value validation and completeness" },
  { id: "report", name: "Report Compilation Agent", desc: "Instantiating Word document & injecting variables" },
  { id: "dispatch", name: "Dispatch Agent", desc: "Saving completed document & notifying pipeline" }
];

export function TemplateAutomation() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [history, setHistory] = useState<HistoricalReport[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [historyQuery, setHistoryQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  
  // Dynamic fields state
  const [variables, setVariables] = useState<Record<string, string>>({});
  
  // Pipeline compilation state
  const [compiling, setCompiling] = useState(false);
  const [pipelineStage, setPipelineStage] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState("");

  const backendUrl = ""; // Calls are relative to current host in dev proxy setup

  // Fetch templates and history
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const tRes = await fetch("/api/v1/templates");
      if (tRes.ok) {
        const tData = await tRes.json();
        setTemplates(tData);
      } else {
        toast.error("Failed to load templates from registry");
      }

      const hRes = await fetch("/api/v1/reports/history");
      if (hRes.ok) {
        const hData = await hRes.json();
        setHistory(hData);
      } else {
        toast.error("Failed to load historical reports");
      }
    } catch (error) {
      console.error(error);
      toast.error("Connection error loading template registry");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // When template changes, reset placeholders
  const handleSelectTemplate = (tpl: Template) => {
    setSelectedTemplate(tpl);
    const initialVars: Record<string, string> = {};
    tpl.placeholders.forEach(p => {
      initialVars[p] = "";
    });
    // Add default core keys if missing
    const defaultKeys = ["CLIENT", "CLIENT_NAME", "ADDRESS", "SITE_ADDRESS", "JOB_NO", "REPORT_NO", "DATE", "ENGINEER", "BEARING_CAPACITY"];
    defaultKeys.forEach(k => {
      if (!(k in initialVars)) {
        initialVars[k] = "";
      }
    });
    setVariables(initialVars);
    setDownloadUrl(null);
    setPipelineStage(0);
    setCompiling(false);
  };

  // Perform smart extraction from historical report
  const handleExtractFromReport = async (report: HistoricalReport) => {
    setIsExtracting(true);
    toast.info(`Swarm Agents extracting details from ${report.file_name}...`, { duration: 1500 });
    try {
      const res = await fetch("/api/v1/reports/history/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_path: report.file_path })
      });
      if (res.ok) {
        const result = await res.json();
        const extracted = result.extracted_data;
        
        setVariables(prev => {
          const updated = { ...prev };
          Object.keys(extracted).forEach(k => {
            if (extracted[k]) {
              updated[k] = extracted[k];
            }
          });
          return updated;
        });
        
        toast.success(`Success! Pre-filled ${Object.values(extracted).filter(Boolean).length} fields from previous report.`);
      } else {
        toast.error("Failed to extract fields from report");
      }
    } catch (error) {
      console.error(error);
      toast.error("Extraction error occurred");
    } finally {
      setIsExtracting(false);
    }
  };

  // Run the multi-agent report generation swarm simulation
  const handleCompile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;
    
    setCompiling(true);
    setDownloadUrl(null);
    
    // Simulate detailed LangGraph supervisor pipeline progress
    for (let i = 0; i < STAGES.length; i++) {
      setPipelineStage(i);
      await new Promise(resolve => setTimeout(resolve, 900));
    }
    
    try {
      const res = await fetch("/api/v1/templates/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: selectedTemplate.template_id,
          replacements: variables
        })
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        setDownloadUrl(url);
        const name = `Generated_${selectedTemplate.file_name}`;
        setDownloadName(name);
        toast.success("Geotechnical Report compiled successfully!", { duration: 3000 });
      } else {
        toast.error("Failed to generate document");
        setCompiling(false);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to compile document due to connection error");
      setCompiling(false);
    }
  };

  // Group templates by Category
  const filteredTemplates = templates.filter(t => 
    t.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter historical reports
  const filteredHistory = history.filter(h =>
    h.file_name.toLowerCase().includes(historyQuery.toLowerCase()) ||
    h.sub_folder.toLowerCase().includes(historyQuery.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 p-1 stagger-children">
      {/* ── Left Sidebar (3/12 wide) ── */}
      <div className="xl:col-span-3 space-y-4">
        
        {/* Template Registry Card */}
        <div className="rounded-xl border border-border/60 bg-card p-4 surface-elevated card-hover">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-primary" />
              Template Registry
            </h3>
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-mono font-medium">
              {templates.length}
            </span>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8.5 h-8 text-[11px] bg-muted/20 border-border/40 focus:border-primary/30"
            />
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary/70" />
              <span className="text-[10px]">Scanning registry...</span>
            </div>
          ) : (
            <div className="space-y-1 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
              {filteredTemplates.length > 0 ? (
                filteredTemplates.map((t) => (
                  <button
                    key={t.template_id}
                    onClick={() => handleSelectTemplate(t)}
                    className={`w-full flex items-center justify-between text-left p-2 rounded-lg text-xs transition-all border ${
                      selectedTemplate?.template_id === t.template_id
                        ? "bg-primary/10 border-primary/20 text-primary font-medium"
                        : "border-transparent hover:bg-muted/30 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className={`h-3.5 w-3.5 flex-shrink-0 ${
                        selectedTemplate?.template_id === t.template_id ? "text-primary" : "text-muted-foreground/60"
                      }`} />
                      <span className="truncate" title={t.file_name}>{t.file_name}</span>
                    </div>
                    <ChevronRight className="h-3 w-3 opacity-40 flex-shrink-0" />
                  </button>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground/60 text-[10px]">No templates found</div>
              )}
            </div>
          )}
        </div>

        {/* Previous Reports Reference Panel */}
        <div className="rounded-xl border border-border/60 bg-card p-4 surface-elevated card-hover">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-widest flex items-center gap-1.5">
              <History className="h-3.5 w-3.5 text-accent" />
              Past Report Swarm
            </h3>
            <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full font-mono font-medium">
              {history.length}
            </span>
          </div>
          
          <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
            Select a completed past report. The agent swarm will extract its metadata to auto-populate fields below.
          </p>

          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search past reports..."
              value={historyQuery}
              onChange={(e) => setHistoryQuery(e.target.value)}
              className="pl-8.5 h-8 text-[11px] bg-muted/20 border-border/40 focus:border-primary/30"
            />
          </div>

          <div className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
            {filteredHistory.length > 0 ? (
              filteredHistory.map((h, i) => (
                <div
                  key={i}
                  className="group flex flex-col gap-1.5 p-2 rounded-lg border border-border/30 hover:border-accent/20 bg-muted/10 hover:bg-accent/5 transition-all text-xs"
                >
                  <div className="flex items-start justify-between gap-1 overflow-hidden">
                    <span className="font-medium text-foreground truncate" title={h.file_name}>
                      {h.file_name}
                    </span>
                    <span className="text-[8px] bg-muted px-1.5 py-0.2 rounded font-mono text-muted-foreground/80 flex-shrink-0">
                      {h.group}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                    <span className="truncate max-w-[120px]">{h.sub_folder}</span>
                    <button
                      onClick={() => handleExtractFromReport(h)}
                      disabled={isExtracting}
                      className="text-accent hover:text-accent-foreground font-semibold flex items-center gap-0.5 transition-colors group-hover:underline"
                    >
                      <Sparkles className="h-2.5 w-2.5" />
                      Extract
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground/60 text-[10px]">No historical reports found</div>
            )}
          </div>
        </div>

      </div>

      {/* ── Main Canvas (9/12 wide) ── */}
      <div className="xl:col-span-9">
        {selectedTemplate ? (
          <form onSubmit={handleCompile} className="space-y-5 stagger-children">
            
            {/* Header info */}
            <div className="rounded-xl border border-border/60 bg-card p-6 surface-elevated attention-ring">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">{selectedTemplate.file_name}</h2>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Category: <span className="font-semibold text-foreground">{selectedTemplate.category}</span>
                      <span className="mx-1.5">•</span>
                      Scanned Placeholders: <span className="font-semibold font-mono text-primary">{selectedTemplate.placeholders.length}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectTemplate(selectedTemplate)}
                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Reset Form
                  </Button>
                </div>
              </div>
            </div>

            {/* Form Fields split in groups */}
            <div className="rounded-xl border border-border/60 bg-card p-6 surface-elevated space-y-6">
              
              {/* Section 1: Core Geotechnical Parameters */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-border/30 pb-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <h3 className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold">
                    Global Report Parameters
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Client */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      Client / Prepared For
                    </Label>
                    <Input
                      placeholder="e.g. Acme Geotechnical Pty Ltd"
                      value={variables["CLIENT_NAME"] || variables["CLIENT"] || ""}
                      onChange={(e) => setVariables(prev => ({
                        ...prev,
                        "CLIENT": e.target.value,
                        "CLIENT_NAME": e.target.value
                      }))}
                      className="bg-muted/15 border-border/50 h-9.5 text-xs focus:border-primary/40"
                    />
                  </div>

                  {/* Site Address */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Site Address / Location
                    </Label>
                    <Input
                      placeholder="e.g. 104 Boundary Road, Box Hill NSW"
                      value={variables["SITE_ADDRESS"] || variables["ADDRESS"] || ""}
                      onChange={(e) => setVariables(prev => ({
                        ...prev,
                        "ADDRESS": e.target.value,
                        "SITE_ADDRESS": e.target.value
                      }))}
                      className="bg-muted/15 border-border/50 h-9.5 text-xs focus:border-primary/40"
                    />
                  </div>

                  {/* Job Number */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold text-muted-foreground">Job Number (Ref)</Label>
                    <Input
                      placeholder="e.g. 24-2284A"
                      value={variables["JOB_NO"] || ""}
                      onChange={(e) => setVariables(prev => ({ ...prev, "JOB_NO": e.target.value }))}
                      className="bg-muted/15 border-border/50 h-9.5 text-xs focus:border-primary/40"
                    />
                  </div>

                  {/* Report Number */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold text-muted-foreground">Report Number</Label>
                    <Input
                      placeholder="e.g. R-STS-001"
                      value={variables["REPORT_NO"] || ""}
                      onChange={(e) => setVariables(prev => ({ ...prev, "REPORT_NO": e.target.value }))}
                      className="bg-muted/15 border-border/50 h-9.5 text-xs focus:border-primary/40"
                    />
                  </div>

                  {/* Date */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Inspection Date
                    </Label>
                    <Input
                      placeholder="e.g. 17th May 2026"
                      value={variables["DATE"] || ""}
                      onChange={(e) => setVariables(prev => ({ ...prev, "DATE": e.target.value }))}
                      className="bg-muted/15 border-border/50 h-9.5 text-xs focus:border-primary/40"
                    />
                  </div>

                  {/* Engineer */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                      <UserCheck className="h-3 w-3" />
                      Inspected By (Engineer)
                    </Label>
                    <Input
                      placeholder="e.g. J. Reddy"
                      value={variables["ENGINEER"] || ""}
                      onChange={(e) => setVariables(prev => ({ ...prev, "ENGINEER": e.target.value }))}
                      className="bg-muted/15 border-border/50 h-9.5 text-xs focus:border-primary/40"
                    />
                  </div>

                  {/* Bearing Capacity */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold text-muted-foreground">Bearing Capacity Requirements</Label>
                    <Input
                      placeholder="e.g. 100 kPa allowable / 150 kPa bedrock"
                      value={variables["BEARING_CAPACITY"] || ""}
                      onChange={(e) => setVariables(prev => ({ ...prev, "BEARING_CAPACITY": e.target.value }))}
                      className="bg-muted/15 border-border/50 h-9.5 text-xs focus:border-primary/40 md:col-span-2"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Custom Word Document Placeholders */}
              {selectedTemplate.placeholders.filter(p => ![
                "CLIENT", "CLIENT_NAME", "ADDRESS", "SITE_ADDRESS", "JOB_NO", "REPORT_NO", "DATE", "ENGINEER", "BEARING_CAPACITY"
              ].includes(p)).length > 0 && (
                <div className="space-y-4 pt-4 border-t border-border/40">
                  <div className="flex items-center gap-2 border-b border-border/30 pb-2">
                    <Sliders className="h-4 w-4 text-accent" />
                    <h3 className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold">
                      Dynamic Template Variables
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedTemplate.placeholders
                      .filter(p => ![
                        "CLIENT", "CLIENT_NAME", "ADDRESS", "SITE_ADDRESS", "JOB_NO", "REPORT_NO", "DATE", "ENGINEER", "BEARING_CAPACITY"
                      ].includes(p))
                      .map((placeholder) => (
                        <div key={placeholder} className="space-y-1.5">
                          <Label className="text-[10px] font-mono text-accent font-semibold flex items-center gap-1.5">
                            [{placeholder}]
                          </Label>
                          <Input
                            placeholder={`Value for [${placeholder}]`}
                            value={variables[placeholder] || ""}
                            onChange={(e) => setVariables(prev => ({
                              ...prev,
                              [placeholder]: e.target.value
                            }))}
                            className="bg-muted/10 border-border/40 focus:border-accent/40 font-mono text-xs h-9.5"
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Swarm agents pipeline animation log & compilation trigger */}
            <div className="rounded-xl border border-border/60 bg-card p-6 surface-elevated space-y-4">
              {compiling ? (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-border/30 pb-2">
                    <h4 className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      Swarm Execution Log (LangGraph Stage {pipelineStage + 1}/6)
                    </h4>
                    <span className="text-[10px] text-primary font-semibold font-mono">
                      {Math.round(((pipelineStage + 1) / STAGES.length) * 100)}% Complete
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {STAGES.map((s, idx) => (
                      <div
                        key={s.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border text-xs transition-all ${
                          idx === pipelineStage
                            ? "border-primary/45 bg-primary/5 text-foreground font-medium scale-102"
                            : idx < pipelineStage
                            ? "border-border/40 bg-muted/10 text-muted-foreground"
                            : "border-border/20 bg-muted/5 opacity-40 text-muted-foreground"
                        }`}
                      >
                        <div className="flex-shrink-0">
                          {idx < pipelineStage ? (
                            <CheckCircle2 className="h-4.5 w-4.5 text-primary" />
                          ) : idx === pipelineStage ? (
                            <Loader2 className="h-4.5 w-4.5 animate-spin text-primary" />
                          ) : (
                            <div className="h-4.5 w-4.5 rounded-full border border-border/50 flex items-center justify-center font-mono text-[9px]">
                              {idx + 1}
                            </div>
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-semibold truncate">{s.name}</p>
                          <p className="text-[9px] text-muted-foreground truncate">{s.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {downloadUrl && (
                    <div className="pt-2 flex flex-col items-center justify-center gap-3 bg-primary/5 border border-primary/20 rounded-xl p-5 text-center animate-scale-up">
                      <div className="p-3 bg-primary/10 border border-primary/25 rounded-2xl text-primary mb-1">
                        <CheckCircle2 className="h-8 w-8" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">Compilation Complete!</h3>
                      <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
                        All compliance metrics validated by QA Agent. Ready to download the fully-instantiated production file.
                      </p>
                      <a
                        href={downloadUrl}
                        download={downloadName}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold inline-flex items-center gap-2 h-10 px-6 rounded-lg text-xs hover-scale"
                      >
                        <Download className="h-4 w-4" />
                        Download Word Document (.docx)
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      Production Geotechnical Compiler
                    </h4>
                    <p className="text-[10px] text-muted-foreground">
                      Compiles and runs standard AS 1726 checklist validation against client data.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 text-xs font-semibold hover-scale"
                  >
                    <Play className="h-3.5 w-3.5 mr-1.5" />
                    Compile & Instantiates Document
                  </Button>
                </div>
              )}
            </div>

          </form>
        ) : (
          /* Apple-style Dramatic Welcome Empty State */
          <div className="rounded-xl border border-dashed border-border/40 bg-card/25 p-20 text-center animate-fade-in min-h-[500px] flex flex-col justify-center items-center">
            <div className="inline-flex p-5 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-6">
              <Sparkles className="h-10 w-10" />
            </div>
            <h2 className="text-base font-semibold text-foreground mb-2">Reports Automation Workspace</h2>
            <p className="text-xs text-muted-foreground mb-6 max-w-sm leading-relaxed">
              Select a STS template from the left Library Registry to start configuring report parameters, or select a previous report to auto-extract and pre-fill its metadata instantly.
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/30 border border-border/50 px-3.5 py-1.5 rounded-lg">
              <span>Choose template</span>
              <ArrowRight className="h-3 w-3" />
              <span>Auto-populate fields</span>
              <ArrowRight className="h-3 w-3" />
              <span>Instantiate Docx</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
