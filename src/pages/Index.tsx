import { useState, useCallback, useEffect } from "react";
import {
  Layers, Plus, Download, Save, FileDown, Timer, CheckCircle2,
  Cloud, Keyboard, Zap, ChevronDown,
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

  const activeLayer = project.layers.find((l) => l.id === activeLayerId) || null;
  const { lastSaved, isSaving } = useAutoSave(project, "autosoil_current", 3000);
  const { formatted: sessionTime } = useSessionTimer();

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
    toast.success("Layer added", { duration: 1500 });
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
        toast.success("Saved", { duration: 1000 });
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
    toast.info("New borehole started");
  };

  const handleExportCSV = () => {
    if (project.layers.length === 0) {
      toast.error("No layers to export");
      return;
    }
    const headers = ["Borehole ID", "Depth From", "Depth To", "AS 1726 Description", "Test Results"];
    const rows = project.layers.map((l) => [
      project.boreholeId,
      l.depthFrom,
      l.depthTo,
      formatAS1726Description(l),
      formatTestResults(l).join("; "),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.projectName || "borehole"}_log.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const handleExportPDF = () => {
    if (project.layers.length === 0) {
      toast.error("No layers to export");
      return;
    }
    const entries = project.layers.map((l) => layerToEntry(l, project));
    generateBoreholeLogPDF(entries, project.projectName, project.boreholeId, project);
    toast.success("PDF exported");
  };

  const layerCount = project.layers.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header — glass effect, premium feel */}
      <header className="border-b border-border glass sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground tracking-tight">
                Geologs
              </h1>
              <p className="text-[10px] text-muted-foreground tracking-wide">
                AS 1726:2017
              </p>
            </div>
          </div>

          {/* Status bar */}
          <div className="hidden sm:flex items-center gap-4 text-[11px] text-muted-foreground">
            {/* Auto-save indicator */}
            <div className="flex items-center gap-1.5">
              {isSaving ? (
                <Cloud className="h-3 w-3 text-primary animate-save-pulse" />
              ) : lastSaved ? (
                <CheckCircle2 className="h-3 w-3 text-primary/60" />
              ) : null}
              <span>{isSaving ? "Saving…" : lastSaved ? "Saved" : ""}</span>
            </div>

            {/* Session timer */}
            <div className="flex items-center gap-1.5">
              <Timer className="h-3 w-3" />
              <span>{sessionTime}</span>
            </div>

            {/* Layer count badge */}
            {layerCount > 0 && (
              <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                <Zap className="h-3 w-3" />
                <span className="font-medium">{layerCount} layer{layerCount !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowShortcuts(!showShortcuts)}
              className="text-muted-foreground hover:text-foreground h-8 w-8 p-0 hidden sm:flex"
              title="Keyboard shortcuts"
            >
              <Keyboard className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewBorehole}
              className="border-border text-muted-foreground hover:text-foreground hover:border-primary/30 h-8 text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              New
            </Button>
          </div>
        </div>

        {/* Shortcuts bar */}
        {showShortcuts && (
          <div className="border-t border-border bg-muted/30 px-4 py-2 animate-in">
            <div className="max-w-7xl mx-auto flex flex-wrap gap-4 text-[11px] text-muted-foreground">
              <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">⌘N</kbd> New Layer</span>
              <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">⌘S</kbd> Save</span>
              <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">⌘E</kbd> Export PDF</span>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
          {/* ── Left Panel ── */}
          <div className="lg:col-span-4 space-y-5">
            {/* Project Meta */}
            <div className="rounded-xl border border-border bg-card p-5 surface-elevated animate-slide-up">
              <ProjectMeta project={project} onChange={updateProject} />
            </div>

            {/* Layer Manager */}
            <div className="rounded-xl border border-border bg-card p-5 surface-elevated animate-slide-up">
              <LayerManager
                project={project}
                activeLayerId={activeLayerId}
                onSelectLayer={setActiveLayerId}
                onAddLayer={addLayer}
                onRemoveLayer={removeLayer}
              />
            </div>

            {/* Borehole-level In-Situ Testing */}
            {layerCount > 0 && (
              <div className="rounded-xl border border-border bg-card p-5 surface-elevated space-y-5 animate-slide-up">
                <h3 className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
                  In-Situ Testing
                </h3>
                <SPTInput
                  sptResult={project.sptResult}
                  onChange={(result) => updateProject({ sptResult: result })}
                />
                <div className="border-t border-border pt-4">
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
              <div className="rounded-xl border border-border bg-card p-5 surface-elevated animate-slide-up">
                <LogPreview layer={activeLayer} boreholeId={project.boreholeId} />
              </div>
            )}
          </div>

          {/* ── Right Panel ── */}
          <div className="lg:col-span-8 space-y-5">
            {activeLayer ? (
              <>
                {/* Layer depth + photo */}
                <div className="rounded-xl border border-border bg-card p-5 surface-elevated animate-in">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                      {project.layers.findIndex((l) => l.id === activeLayerId) + 1}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Layer Details</h3>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDepthRange(activeLayer) || "Set depth range below"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        From (m)
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={activeLayer.depthFrom}
                        onChange={(e) => updateLayer(activeLayer.id, { depthFrom: e.target.value })}
                        className="bg-muted/40 border-border h-9 focus:border-primary/50 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        To (m)
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={activeLayer.depthTo}
                        onChange={(e) => updateLayer(activeLayer.id, { depthTo: e.target.value })}
                        className="bg-muted/40 border-border h-9 focus:border-primary/50 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  {/* Photo upload */}
                  <div className="border-t border-border pt-4">
                    <PhotoUpload
                      photoUrls={activeLayer.photoUrls}
                      onPhotosChange={(urls) => updateLayer(activeLayer.id, { photoUrls: urls })}
                      onAiResult={(updates) => updateLayer(activeLayer.id, updates)}
                    />
                  </div>
                </div>

                {/* Soil classification */}
                <div className="rounded-xl border border-border bg-card p-5 surface-elevated animate-in">
                  <SoilInput
                    layer={activeLayer}
                    onChange={(updates) => updateLayer(activeLayer.id, updates)}
                  />
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-card/30 p-16 text-center animate-slide-up">
                <div className="inline-flex p-4 rounded-2xl bg-muted/50 mb-4">
                  <Layers className="h-8 w-8 text-muted-foreground/60" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">No layer selected</h3>
                <p className="text-xs text-muted-foreground mb-5 max-w-xs mx-auto">
                  Add your first soil layer to start logging. Use{" "}
                  <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">⌘N</kbd>{" "}
                  for quick add.
                </p>
                <Button onClick={addLayer} className="bg-primary text-primary-foreground hover:bg-primary/90 h-9">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Layer
                </Button>
              </div>
            )}

            {/* Export Buttons */}
            {layerCount > 0 && (
              <div className="flex flex-wrap gap-3 animate-in">
                <Button
                  onClick={handleExportPDF}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 h-10"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportCSV}
                  className="border-border text-muted-foreground hover:text-foreground hover:border-primary/30 h-10"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
