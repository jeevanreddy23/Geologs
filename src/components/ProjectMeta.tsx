import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BoreholeEntry } from "@/lib/as1726";

interface ProjectMetaProps {
  entry: BoreholeEntry;
  onChange: (updates: Partial<BoreholeEntry>) => void;
}

export function ProjectMeta({ entry, onChange }: ProjectMetaProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Project Name
        </Label>
        <Input
          value={entry.projectName}
          onChange={(e) => onChange({ projectName: e.target.value })}
          placeholder="e.g. Pacific Motorway Upgrade"
          className="bg-muted/50 border-border"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Borehole ID
        </Label>
        <Input
          value={entry.boreholeId}
          onChange={(e) => onChange({ boreholeId: e.target.value })}
          placeholder="e.g. BH-01"
          className="bg-muted/50 border-border"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Depth From (m)
          </Label>
          <Input
            type="number"
            step="0.1"
            value={entry.depthFrom}
            onChange={(e) => onChange({ depthFrom: e.target.value })}
            placeholder="0.0"
            className="bg-muted/50 border-border"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Depth To (m)
          </Label>
          <Input
            type="number"
            step="0.1"
            value={entry.depthTo}
            onChange={(e) => onChange({ depthTo: e.target.value })}
            placeholder="1.5"
            className="bg-muted/50 border-border"
          />
        </div>
      </div>
    </div>
  );
}
