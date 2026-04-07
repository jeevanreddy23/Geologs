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

      <div className="grid grid-cols-2 gap-3">
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
