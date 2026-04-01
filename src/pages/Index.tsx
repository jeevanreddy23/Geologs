import { useState, useCallback } from "react";
import { Layers, Plus, FileText, Download, Save, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectMeta } from "@/components/ProjectMeta";
import { PhotoUpload } from "@/components/PhotoUpload";
import { SoilInput } from "@/components/SoilInput";
import { LogPreview } from "@/components/LogPreview";
import { generateBoreholeLogPDF } from "@/lib/generateBoreholeLogPDF";
import {
  type BoreholeEntry,
  defaultEntry,
  formatAS1726Description,
  formatDepthRange,
  formatTestResults,
} from "@/lib/as1726";
import { toast } from "sonner";

export default function Index() {
  const [entry, setEntry] = useState<BoreholeEntry>({ ...defaultEntry });
  const [logEntries, setLogEntries] = useState<BoreholeEntry[]>([]);

  const updateEntry = useCallback((updates: Partial<BoreholeEntry>) => {
    setEntry((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleGenerateLog = () => {
    if (!entry.primarySoilType) {
      toast.error("Select a primary soil type first");
      return;
    }
    setLogEntries((prev) => [...prev, { ...entry }]);
    toast.success("Log entry added");
  };

  const handleNewBorehole = () => {
    setEntry({
      ...defaultEntry,
      projectName: entry.projectName,
    });
    setLogEntries([]);
    toast.info("New borehole started");
  };

  const handleSave = () => {
    const data = { entry, logEntries };
    localStorage.setItem("autosoil_current", JSON.stringify(data));
    toast.success("Project saved locally");
  };

  const handleExportCSV = () => {
    if (logEntries.length === 0) {
      toast.error("No log entries to export");
      return;
    }
    const headers = ["Borehole ID", "Depth From", "Depth To", "AS 1726 Description", "Test Results"];
    const rows = logEntries.map((e) => [
      e.boreholeId,
      e.depthFrom,
      e.depthTo,
      formatAS1726Description(e),
      formatTestResults(e).join("; "),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entry.projectName || "borehole"}_log.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              className="border-border text-muted-foreground hover:text-foreground"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Save
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewBorehole}
              className="border-border text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Borehole
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel - Project Meta & Photo */}
          <div className="lg:col-span-4 space-y-6">
            <div className="rounded-xl border border-border bg-card p-5 surface-elevated space-y-6">
              <ProjectMeta entry={entry} onChange={updateEntry} />
              <div className="border-t border-border pt-4">
                <PhotoUpload
                  photoUrl={entry.photoUrl}
                  onPhotoChange={(url) => updateEntry({ photoUrl: url })}
                  onAiResult={updateEntry}
                />
              </div>
            </div>

            {/* Live Preview */}
            <div className="rounded-xl border border-border bg-card p-5 surface-elevated">
              <LogPreview entry={entry} />
            </div>
          </div>

          {/* Right Panel - Soil Input & Actions */}
          <div className="lg:col-span-8 space-y-6">
            <div className="rounded-xl border border-border bg-card p-5 surface-elevated">
              <SoilInput entry={entry} onChange={updateEntry} />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                className="flex-1 min-w-[200px] bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                onClick={handleGenerateLog}
              >
                <FileText className="h-4 w-4 mr-2" />
                Generate Log Entry
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={handleExportCSV}
                className="border-border text-muted-foreground hover:text-foreground"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>

            {/* Log History */}
            {logEntries.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5 surface-elevated space-y-3">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Log Entries ({logEntries.length})
                </h3>
                <div className="space-y-2">
                  {logEntries.map((le, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-muted/30 border border-border/50"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono text-muted-foreground">
                          {le.boreholeId && `${le.boreholeId} · `}
                          {formatDepthRange(le)}
                        </span>
                      </div>
                      <p className="text-sm font-mono text-foreground">
                        {formatAS1726Description(le)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
