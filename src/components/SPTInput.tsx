import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDownToLine } from "lucide-react";
import type { SPTResult } from "@/lib/as1726";

interface SPTInputProps {
  sptResult: SPTResult | null;
  onChange: (result: SPTResult | null) => void;
}

export function SPTInput({ sptResult, onChange }: SPTInputProps) {
  const result = sptResult || { n1: "", n2: "", n3: "", penetration: "450 mm" };

  const update = (field: keyof SPTResult, value: string) => {
    const updated = { ...result, [field]: value };
    if (!updated.n1 && !updated.n2 && !updated.n3) {
      onChange(null);
    } else {
      onChange(updated);
    }
  };

  return (
    <div className="space-y-3">
      {/* Visual header with SPT diagram */}
      <div className="flex items-center gap-3">
        <div className="relative w-10 h-14 flex-shrink-0">
          {/* Split spoon sampler */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 w-1 h-6 bg-muted-foreground/40 rounded-full" />
          {/* Hammer */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 w-6 h-4 bg-destructive/50 rounded-sm border border-destructive/30" />
          <span className="absolute left-1/2 -translate-x-1/2 top-0.5 text-[6px] font-bold text-destructive-foreground">63.5</span>
          {/* Split spoon */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-3 h-5 bg-muted-foreground/30 rounded-b-sm border border-muted-foreground/20" />
          {/* Drop indicator */}
          <ArrowDownToLine className="absolute right-0 top-1 h-3 w-3 text-destructive/70" />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            SPT — Standard Penetration Test
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            63.5 kg hammer, 760 mm drop, 3 × 150 mm increments
          </p>
        </div>
      </div>

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
