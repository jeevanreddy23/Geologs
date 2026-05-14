import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BoreholeProject } from "@/lib/as1726";
import { MapPin } from "lucide-react";

interface ProjectMetaProps {
  project: BoreholeProject;
  onChange: (updates: Partial<BoreholeProject>) => void;
}

export function ProjectMeta({ project, onChange }: ProjectMetaProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <MapPin className="h-3.5 w-3.5 text-primary" />
        <Label className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
          Project
        </Label>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] text-muted-foreground">Project Name</Label>
        <Input
          value={project.projectName}
          onChange={(e) => onChange({ projectName: e.target.value })}
          placeholder="e.g. Pacific Motorway Upgrade"
          className="bg-muted/30 border-border/60 h-9 focus:border-primary/40"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 pb-2 pt-2 border-t border-border/40">
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground uppercase tracking-tight">Client</Label>
          <Input 
            value={project.client || ""} 
            onChange={(e) => onChange({ client: e.target.value })}
            placeholder="e.g. Acme Corp"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground uppercase tracking-tight">Job No.</Label>
          <Input 
            value={project.jobNo || ""} 
            onChange={(e) => onChange({ jobNo: e.target.value })}
            placeholder="P1234.56"
            className="h-8 text-sm font-mono"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] text-muted-foreground uppercase tracking-tight">Location</Label>
        <Input 
          value={project.location || ""} 
          onChange={(e) => onChange({ location: e.target.value })}
          placeholder="e.g. Brisbane Site B"
          className="h-8 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground uppercase tracking-tight">Ground EL (m)</Label>
          <Input 
            type="number" step="0.1" 
            value={project.groundLevel || ""} 
            onChange={(e) => onChange({ groundLevel: e.target.value })}
            placeholder="0.0"
            className="h-8 text-sm font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground uppercase tracking-tight">Water Depth (m)</Label>
          <Input 
            type="number" step="0.1" 
            value={project.groundwaterDepth || ""} 
            onChange={(e) => onChange({ groundwaterDepth: e.target.value })}
            placeholder="—"
            className="h-8 text-sm font-mono"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-border/40 pt-4">
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Borehole ID</Label>
          <Input
            value={project.boreholeId}
            onChange={(e) => onChange({ boreholeId: e.target.value })}
            placeholder="BH-01"
            className="bg-muted/30 border-border/60 h-9 font-mono text-sm focus:border-primary/40"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Total Depth (m)</Label>
          <Input
            type="number" step="0.5" min="0" max="100"
            value={project.totalDepth}
            onChange={(e) => onChange({ totalDepth: e.target.value })}
            placeholder="30"
            className="bg-muted/30 border-border/60 h-9 font-mono text-sm focus:border-primary/40"
          />
        </div>
      </div>
    </div>
  );
}
