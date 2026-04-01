import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BoreholeProject } from "@/lib/as1726";

interface ProjectMetaProps {
  project: BoreholeProject;
  onChange: (updates: Partial<BoreholeProject>) => void;
}

export function ProjectMeta({ project, onChange }: ProjectMetaProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Project Name
        </Label>
        <Input
          value={project.projectName}
          onChange={(e) => onChange({ projectName: e.target.value })}
          placeholder="e.g. Pacific Motorway Upgrade"
          className="bg-muted/50 border-border"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Borehole ID
          </Label>
          <Input
            value={project.boreholeId}
            onChange={(e) => onChange({ boreholeId: e.target.value })}
            placeholder="e.g. BH-01"
            className="bg-muted/50 border-border"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Total Depth (m)
          </Label>
          <Input
            type="number"
            step="0.5"
            min="0"
            max="30"
            value={project.totalDepth}
            onChange={(e) => onChange({ totalDepth: e.target.value })}
            placeholder="30"
            className="bg-muted/50 border-border"
          />
        </div>
      </div>
    </div>
  );
}
