import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SPTResult } from "@/lib/as1726";

interface SPTInputProps {
  sptResult: SPTResult | null;
  onChange: (result: SPTResult | null) => void;
}

export function SPTInput({ sptResult, onChange }: SPTInputProps) {
  const result = sptResult || { n1: "", n2: "", n3: "", penetration: "450 mm" };

  const update = (field: keyof SPTResult, value: string) => {
    const updated = { ...result, [field]: value };
    // If all empty, set null
    if (!updated.n1 && !updated.n2 && !updated.n3) {
      onChange(null);
    } else {
      onChange(updated);
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
        SPT — Standard Penetration Test
      </Label>
      <p className="text-xs text-muted-foreground">
        Enter N-values for three 150mm increments (total 450mm penetration)
      </p>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">0–150mm</span>
          <Input
            type="number"
            min={0}
            value={result.n1}
            onChange={(e) => update("n1", e.target.value)}
            className="bg-muted/50 border-border h-8 text-sm"
            placeholder="N₁"
          />
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">150–300mm</span>
          <Input
            type="number"
            min={0}
            value={result.n2}
            onChange={(e) => update("n2", e.target.value)}
            className="bg-muted/50 border-border h-8 text-sm"
            placeholder="N₂"
          />
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">300–450mm</span>
          <Input
            type="number"
            min={0}
            value={result.n3}
            onChange={(e) => update("n3", e.target.value)}
            className="bg-muted/50 border-border h-8 text-sm"
            placeholder="N₃"
          />
        </div>
      </div>
      <div className="space-y-1">
        <span className="text-xs text-muted-foreground">Penetration</span>
        <Select
          value={result.penetration || "450 mm"}
          onValueChange={(v) => update("penetration", v)}
        >
          <SelectTrigger className="bg-muted/50 border-border h-8 text-sm w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="450 mm">450 mm (standard)</SelectItem>
            <SelectItem value="300 mm">300 mm</SelectItem>
            <SelectItem value="600 mm">600 mm</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {sptResult && (sptResult.n2 || sptResult.n3) && (
        <div className="text-xs font-mono text-primary bg-primary/5 rounded px-2 py-1">
          N-value = {(parseInt(sptResult.n2) || 0) + (parseInt(sptResult.n3) || 0)}
        </div>
      )}
    </div>
  );
}
