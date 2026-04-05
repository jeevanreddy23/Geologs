import { useState, useCallback } from "react";
import { Layers, Plus, FileText, Download, Save, FileDown } from "lucide-react";
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
  const [project, setProject] = useState<BoreholeProject>({ ...defaultProject, layers: [] });
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);

  const activeLayer = project.layers.find((l) => l.id === activeLayerId) || null;

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
    toast.success("New layer added");
  }, [project.layers]);

  const removeLayer = useCallback((id: string) => {
    setProject((prev) => ({
      ...prev,
      layers: prev.layers.filter((l) => l.id !== id),
    }));
    if (activeLayerId === id) {
      setActiveLayerId(project.layers.find((l) => l.id !== id)?.id || null);
    }
  }, [activeLayerId, project.layers]);

  const handleNewBorehole = () => {
    setProject({ ...defaultProject, projectName: project.projectName });
    setActiveLayerId(null);
    toast.info("New borehole started");
  };

  const handleSave = () => {
    localStorage.setItem("autosoil_current", JSON.stringify(project));
    toast.success("Project saved locally");
  };

  const handleExportCSV = () => {
    if (project.layers.length === 0) { toast.error("No layers to export"); return; }
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
    if (project.layers.length === 0) { toast.error("No layers to export"); return; }
    const entries = project.layers.map((l) => layerToEntry(l, project));
    generateBoreholeLogPDF(entries, project.projectName, project.boreholeId);
    toast.success("PDF exported");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground tracking-tight">
                Auto-Soil Logger
              </h1>
              <p className="text-xs text-muted-foreground">
                AS 1726:2017 Geotechnical Logging
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSave}
              className="border-border text-muted-foreground hover:text-foreground">
              <Save className="h-3.5 w-3.5 mr-1.5" />Save
            </Button>
            <Button variant="outline" size="sm" onClick={handleNewBorehole}
              className="border-border text-muted-foreground hover:text-foreground">
              <Plus className="h-3.5 w-3.5 mr-1.5" />New Borehole
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel */}
          <div className="lg:col-span-4 space-y-6">
            <div className="rounded-xl border border-border bg-card p-5 surface-elevated space-y-6">
              <ProjectMeta project={project} onChange={updateProject} />
            </div>

            {/* Layer Manager */}
            <div className="rounded-xl border border-border bg-card p-5 surface-elevated">
              <LayerManager
                project={project}
                activeLayerId={activeLayerId}
                onSelectLayer={setActiveLayerId}
                onAddLayer={addLayer}
                onRemoveLayer={removeLayer}
              />
            </div>

            {/* Borehole-level In-Situ Testing */}
            {project.layers.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5 surface-elevated space-y-4">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  In-Situ Testing (Borehole)
                </h3>
                <SPTInput
                  sptResult={project.sptResult}
                  onChange={(result) => updateProject({ sptResult: result })}
                />
                <DCPInput
                  readings={project.dcpReadings}
                  startDepth={project.dcpStartDepth}
                  onReadingsChange={(readings) => updateProject({ dcpReadings: readings })}
                  onStartDepthChange={(depth) => updateProject({ dcpStartDepth: depth })}
                />
              </div>
            )}

            {/* Live Preview for active layer */}
            {activeLayer && (
              <div className="rounded-xl border border-border bg-card p-5 surface-elevated">
                <LogPreview layer={activeLayer} boreholeId={project.boreholeId} />
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-8 space-y-6">
            {activeLayer ? (
              <>
                {/* Layer depth */}
                <div className="rounded-xl border border-border bg-card p-5 surface-elevated">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                      {project.layers.findIndex((l) => l.id === activeLayerId) + 1}
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">Layer Details</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                        Depth From (m)
                      </Label>
                      <Input
                        type="number" step="0.1" min="0" max="30"
                        value={activeLayer.depthFrom}
                        onChange={(e) => updateLayer(activeLayer.id, { depthFrom: e.target.value })}
                        className="bg-muted/50 border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                        Depth To (m)
                      </Label>
                      <Input
                        type="number" step="0.1" min="0" max="30"
                        value={activeLayer.depthTo}
                        onChange={(e) => updateLayer(activeLayer.id, { depthTo: e.target.value })}
                        className="bg-muted/50 border-border"
                      />
                    </div>
                  </div>

                  {/* Photo upload per layer */}
                  <div className="border-t border-border pt-4">
                    <PhotoUpload
                      photoUrls={activeLayer.photoUrls}
                      onPhotosChange={(urls) => updateLayer(activeLayer.id, { photoUrls: urls })}
                      onAiResult={(updates) => updateLayer(activeLayer.id, updates)}
                    />
                  </div>
                </div>

                {/* Soil classification */}
                <div className="rounded-xl border border-border bg-card p-5 surface-elevated">
                  <SoilInput
                    layer={activeLayer}
                    onChange={(updates) => updateLayer(activeLayer.id, updates)}
                  />
                </div>
              </>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-border bg-card/50 p-12 text-center">
                <Layers className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-foreground mb-1">No layer selected</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Add a soil layer to start logging
                </p>
                <Button variant="outline" onClick={addLayer}>
                  <Plus className="h-4 w-4 mr-2" />Add First Layer
                </Button>
              </div>
            )}

            {/* Export Buttons */}
            {project.layers.length > 0 && (
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" size="lg" onClick={handleExportPDF}
                  className="border-border text-muted-foreground hover:text-foreground">
                  <FileDown className="h-4 w-4 mr-2" />Export PDF
                </Button>
                <Button variant="outline" size="lg" onClick={handleExportCSV}
                  className="border-border text-muted-foreground hover:text-foreground">
                  <Download className="h-4 w-4 mr-2" />Export CSV
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
