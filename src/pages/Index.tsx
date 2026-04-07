import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Layers, Plus, Download, FileDown, Timer, CheckCircle2,
  Cloud, Keyboard, Zap, Flame, Trophy, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProjectMeta } from "@/components/ProjectMeta";
import { PhotoUpload } from "@/components/PhotoUpload";
import { SoilInput } from "@/components/SoilInput";
import { LogPreview } from "@/components/LogPreview";
import { LayerManager } from "@/components/LayerManager";
import { DCPInput } from "@/components/DCPInput";
import { SPTInput } from "@/components/SPTInput";
import { generateBoreholeLogPDF } from "@/lib/generateBoreholeLogPDF";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useSessionTimer } from "@/hooks/useSessionTimer";
import { useStreak } from "@/hooks/useStreak";
import {
  type BoreholeProject,
  type SoilLayer,
  defaultProject,
  defaultLayer,
  createLayerId,
  layerToEntry,
  formatAS1726Description,
  formatDepthRange,
  formatTestResults,
} from "@/lib/as1726";
import { toast } from "sonner";

function CompletionRing({ percentage }: { percentage: number }) {
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width="36" height="36" viewBox="0 0 36 36" className="transform -rotate-90">
      <circle cx="18" cy="18" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="2.5" />
      <circle
        cx="18" cy="18" r={radius} fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="2.5"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
      <text
        x="18" y="18"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground font-mono"
        style={{ fontSize: "8px", transform: "rotate(90deg)", transformOrigin: "center" }}
      >
        {percentage}%
      </text>
    </svg>
  );
}

export default function Index() {
  const [project, setProject] = useState<BoreholeProject>(() => {
    try {
      const saved = localStorage.getItem("autosoil_current");
      if (saved) return JSON.parse(saved);
    } catch {}
    return { ...defaultProject, layers: [] };
  });
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [layerAddedAt, setLayerAddedAt] = useState<number | null>(null);

  const activeLayer = project.layers.find((l) => l.id === activeLayerId) || null;
  const { lastSaved, isSaving, saveTimeMs } = useAutoSave(project, "autosoil_current", 3000);
  const { formatted: sessionTime, seconds: sessionSeconds } = useSessionTimer();
  const { streak, isNewStreak } = useStreak();

  // Layer completion percentage (Variable Reward)
  const layerCompletion = useMemo(() => {
    if (!activeLayer) return 0;
    let filled = 0;
    let total = 6;
    if (activeLayer.primarySoilType) filled++;
    if (activeLayer.colour) filled++;
    if (activeLayer.depthFrom && activeLayer.depthTo) filled++;
    if (activeLayer.secondaryDescriptors.length > 0) filled++;
    if (activeLayer.plasticity) filled++;
    if (activeLayer.minorComponents.length > 0) filled++;
    return Math.round((filled / total) * 100);
  }, [activeLayer]);

  // Time-to-log reward when a layer is completed
  useEffect(() => {
    if (layerCompletion === 100 && layerAddedAt) {
      const elapsed = Math.round((Date.now() - layerAddedAt) / 1000);
      if (elapsed > 0 && elapsed < 300) {
        toast.success(`Layer logged in ${elapsed}s`, {
          icon: <Trophy className="h-4 w-4 text-accent" />,
          duration: 3000,
        });
        setLayerAddedAt(null);
      }
    }
  }, [layerCompletion, layerAddedAt]);

  const updateProject = useCallback((updates: Partial<BoreholeProject>) => {
    setProject((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateLayer = useCallback((layerId: string, updates: Partial<SoilLayer>) => {
    setProject((prev) => ({
      ...prev,
      layers: prev.layers.map((l) => (l.id === layerId ? { ...l, ...updates } : l)),
    }));
  }, []);

  const addLayer = useCallback(() => {
    const id = createLayerId();
    const lastLayer = project.layers[project.layers.length - 1];
    const newLayer: SoilLayer = {
      ...defaultLayer,
      id,
      depthFrom: lastLayer?.depthTo || "0.0",
      depthTo: "",
    };
    setProject((prev) => ({ ...prev, layers: [...prev.layers, newLayer] }));
    setActiveLayerId(id);
    setLayerAddedAt(Date.now());
    toast.success("Layer added", { duration: 1200 });
  }, [project.layers]);

  const removeLayer = useCallback(
    (id: string) => {
      setProject((prev) => ({
        ...prev,
        layers: prev.layers.filter((l) => l.id !== id),
      }));
      if (activeLayerId === id) {
        setActiveLayerId(project.layers.find((l) => l.id !== id)?.id || null);
      }
    },
    [activeLayerId, project.layers]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        addLayer();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        localStorage.setItem("autosoil_current", JSON.stringify(project));
        toast.success("Saved", { duration: 800 });
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "e") {
        e.preventDefault();
        handleExportPDF();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [addLayer, project]);

  const handleNewBorehole = () => {
    setProject({ ...defaultProject, projectName: project.projectName });
    setActiveLayerId(null);
    setLayerAddedAt(null);
    toast.info("New borehole started");
  };

  const handleExportCSV = () => {
    if (project.layers.length === 0) { toast.error("No layers to export"); return; }
    const headers = ["Borehole ID", "Depth From", "Depth To", "AS 1726 Description", "Test Results"];
    const rows = project.layers.map((l) => [
      project.boreholeId, l.depthFrom, l.depthTo,
      formatAS1726Description(l), formatTestResults(l).join("; "),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${project.projectName || "borehole"}_log.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const handleExportPDF = () => {
    if (project.layers.length === 0) { toast.error("No layers to export"); return; }
    const entries = project.layers.map((l) => layerToEntry(l, project));
    generateBoreholeLogPDF(entries, project.projectName, project.boreholeId, project);
    toast.success("PDF exported — beautiful log ready", {
      icon: <Sparkles className="h-4 w-4 text-primary" />,
      duration: 2500,
    });
  };

  const layerCount = project.layers.length;

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Header — Linear.app-style glass ─── */}
      <header className="border-b border-border/60 glass sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/15">
              <Layers className="h-4.5 w-4.5 text-primary" />
            </div>
            <div className="leading-none">
              <h1 className="text-[13px] font-semibold text-foreground tracking-tight">Geologs</h1>
              <p className="text-[9px] text-muted-foreground tracking-widest uppercase mt-0.5">AS 1726:2017</p>
            </div>
          </div>

          {/* Status — Dropbox-style simple indicators */}
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-muted-foreground">
            {/* Auto-save */}
            <div className="flex items-center gap-1.5 transition-opacity">
              {isSaving ? (
                <Cloud className="h-3 w-3 text-primary animate-pulse" />
              ) : lastSaved ? (
                <CheckCircle2 className="h-3 w-3 text-primary/50" />
              ) : null}
              <span className="tabular-nums">
                {isSaving ? "Saving…" : lastSaved ? (saveTimeMs !== null ? `Saved (${saveTimeMs}ms)` : "Saved") : ""}
              </span>
            </div>

            {/* Divider */}
            <div className="w-px h-3 bg-border" />

            {/* Session */}
            <div className="flex items-center gap-1 tabular-nums">
              <Timer className="h-3 w-3" />
              <span>{sessionTime}</span>
            </div>

            {/* Streak — Hooked Variable Reward */}
            {streak > 0 && (
              <>
                <div className="w-px h-3 bg-border" />
                <div className={`flex items-center gap-1 text-accent ${isNewStreak ? "animate-streak-pop" : ""}`}>
                  <Flame className="h-3 w-3" />
                  <span className="font-medium">{streak}d</span>
                </div>
              </>
            )}

            {/* Layer count */}
            {layerCount > 0 && (
              <>
                <div className="w-px h-3 bg-border" />
                <div className="flex items-center gap-1 text-primary">
                  <Zap className="h-3 w-3" />
                  <span className="font-medium">{layerCount}</span>
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost" size="sm"
              onClick={() => setShowShortcuts(!showShortcuts)}
              className="text-muted-foreground hover:text-foreground h-8 w-8 p-0 hidden sm:inline-flex"
              title="Keyboard shortcuts"
            >
              <Keyboard className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm" onClick={handleNewBorehole}
              className="bg-primary/10 text-primary hover:bg-primary/20 border-0 h-8 text-xs font-medium"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              New
            </Button>
          </div>
        </div>

        {/* Shortcuts — Notion-style popover */}
        {showShortcuts && (
          <div className="border-t border-border/50 bg-card/80 backdrop-blur px-4 py-2 animate-fade-in">
            <div className="max-w-7xl mx-auto flex flex-wrap gap-5 text-[11px] text-muted-foreground">
              <span><kbd className="inline-flex items-center px-1.5 py-0.5 bg-muted/60 rounded text-[10px] font-mono border border-border/50">⌘N</kbd> <span className="ml-1">New Layer</span></span>
              <span><kbd className="inline-flex items-center px-1.5 py-0.5 bg-muted/60 rounded text-[10px] font-mono border border-border/50">⌘S</kbd> <span className="ml-1">Save</span></span>
              <span><kbd className="inline-flex items-center px-1.5 py-0.5 bg-muted/60 rounded text-[10px] font-mono border border-border/50">⌘E</kbd> <span className="ml-1">Export PDF</span></span>
            </div>
          </div>
        )}
      </header>

      {/* ─── Main — Generous whitespace, Squarespace-level breathing room ─── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8">

          {/* ── Left Panel — sidebar-like, Figma chrome ── */}
          <div className="lg:col-span-4 space-y-4 stagger-children">
            {/* Project Meta */}
            <div className="rounded-xl border border-border/60 bg-card p-5 surface-elevated card-hover">
              <ProjectMeta project={project} onChange={updateProject} />
            </div>

            {/* Layer Manager */}
            <div className="rounded-xl border border-border/60 bg-card p-5 surface-elevated card-hover">
              <LayerManager
                project={project}
                activeLayerId={activeLayerId}
                onSelectLayer={setActiveLayerId}
                onAddLayer={addLayer}
                onRemoveLayer={removeLayer}
              />
            </div>

            {/* In-Situ Testing */}
            {layerCount > 0 && (
              <div className="rounded-xl border border-border/60 bg-card p-5 surface-elevated card-hover space-y-5">
                <h3 className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
                  In-Situ Testing
                </h3>
                <SPTInput
                  sptResult={project.sptResult}
                  onChange={(result) => updateProject({ sptResult: result })}
                />
                <div className="border-t border-border/40 pt-5">
                  <DCPInput
                    readings={project.dcpReadings}
                    startDepth={project.dcpStartDepth}
                    onReadingsChange={(readings) => updateProject({ dcpReadings: readings })}
                    onStartDepthChange={(depth) => updateProject({ dcpStartDepth: depth })}
                  />
                </div>
              </div>
            )}

            {/* Live Preview */}
            {activeLayer && (
              <div className="rounded-xl border border-border/60 bg-card p-5 surface-elevated card-hover">
                <LogPreview layer={activeLayer} boreholeId={project.boreholeId} />
              </div>
            )}
          </div>

          {/* ── Right Panel — the canvas, Figma-style focus area ── */}
          <div className="lg:col-span-8 space-y-5">
            {activeLayer ? (
              <div className="stagger-children space-y-5">
                {/* Layer header with completion ring — Variable Reward */}
                <div className="rounded-xl border border-border/60 bg-card p-6 surface-elevated attention-ring">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                        {project.layers.findIndex((l) => l.id === activeLayerId) + 1}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">Layer Details</h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {formatDepthRange(activeLayer) || "Set depth range to begin"}
                        </p>
                      </div>
                    </div>

                    {/* Completion ring — delight spike */}
                    <div className="flex items-center gap-2">
                      <CompletionRing percentage={layerCompletion} />
                    </div>
                  </div>

                  {/* Depth inputs — large touch targets for mobile */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">From (m)</Label>
                      <Input
                        type="number" step="0.1" min="0" max="100"
                        value={activeLayer.depthFrom}
                        onChange={(e) => updateLayer(activeLayer.id, { depthFrom: e.target.value })}
                        className="bg-muted/30 border-border/60 h-10 text-sm focus:border-primary/40"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">To (m)</Label>
                      <Input
                        type="number" step="0.1" min="0" max="100"
                        value={activeLayer.depthTo}
                        onChange={(e) => updateLayer(activeLayer.id, { depthTo: e.target.value })}
                        className="bg-muted/30 border-border/60 h-10 text-sm focus:border-primary/40"
                      />
                    </div>
                  </div>

                  {/* Photo */}
                  <div className="border-t border-border/40 pt-5">
                    <PhotoUpload
                      photoUrls={activeLayer.photoUrls}
                      onPhotosChange={(urls) => updateLayer(activeLayer.id, { photoUrls: urls })}
                      onAiResult={(updates) => updateLayer(activeLayer.id, updates)}
                    />
                  </div>
                </div>

                {/* Soil classification — progressive disclosure */}
                <div className="rounded-xl border border-border/60 bg-card p-6 surface-elevated attention-ring">
                  <SoilInput
                    layer={activeLayer}
                    onChange={(updates) => updateLayer(activeLayer.id, updates)}
                  />
                </div>
              </div>
            ) : (
              /* Empty state — Apple-level dramatic whitespace */
              <div className="rounded-xl border border-dashed border-border/40 bg-card/20 p-20 text-center animate-fade-in">
                <div className="inline-flex p-5 rounded-2xl bg-muted/30 mb-5">
                  <Layers className="h-10 w-10 text-muted-foreground/40" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">Start Logging</h3>
                <p className="text-xs text-muted-foreground mb-6 max-w-sm mx-auto leading-relaxed">
                  Add your first soil layer to begin. Auto-save keeps your progress safe.
                  <br />
                  <span className="text-muted-foreground/60">
                    Press <kbd className="px-1.5 py-0.5 bg-muted/60 rounded text-[10px] font-mono border border-border/50 mx-0.5">⌘N</kbd> to quick-add.
                  </span>
                </p>
                <Button
                  onClick={addLayer}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 text-sm font-medium hover-scale"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Layer
                </Button>
              </div>
            )}

            {/* Export — Stripe-style prominent CTA */}
            {layerCount > 0 && (
              <div className="flex flex-wrap gap-3 pt-2 animate-fade-in">
                <Button
                  onClick={handleExportPDF}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-5 hover-scale"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                <Button
                  variant="outline" onClick={handleExportCSV}
                  className="border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/30 h-10 px-5"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile bottom bar — field-ready quick actions */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 glass border-t border-border/60 px-4 py-2 flex items-center justify-between z-50">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {isSaving ? <Cloud className="h-3 w-3 text-primary animate-pulse" /> : lastSaved ? <CheckCircle2 className="h-3 w-3 text-primary/50" /> : null}
          <span>{isSaving ? "Saving" : "Saved"}</span>
          {streak > 0 && (
            <span className="flex items-center gap-0.5 text-accent ml-2">
              <Flame className="h-3 w-3" />{streak}d
            </span>
          )}
        </div>
        <Button size="sm" onClick={addLayer} className="bg-primary text-primary-foreground h-8 text-xs">
          <Plus className="h-3.5 w-3.5 mr-1" />Layer
        </Button>
      </div>
    </div>
  );
}
