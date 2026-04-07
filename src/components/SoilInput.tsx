import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type SoilLayer,
  PRIMARY_SOIL_TYPES,
  SECONDARY_DESCRIPTORS,
  MINOR_COMPONENTS,
  COLOURS,
} from "@/lib/as1726";
import { FlaskConical, Palette, Layers } from "lucide-react";

interface SoilInputProps {
  layer: SoilLayer;
  onChange: (updates: Partial<SoilLayer>) => void;
}

function ToggleChips({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (item: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <Badge
              key={opt}
              variant={active ? "default" : "outline"}
              className={`cursor-pointer text-[11px] transition-all duration-150 ${
                active
                  ? "bg-primary/15 text-primary border-primary/30 hover:bg-primary/25"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-muted/40"
              }`}
              onClick={() => onToggle(opt)}
            >
              {opt}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}

export function SoilInput({ layer, onChange }: SoilInputProps) {
  const toggleList = (key: "secondaryDescriptors" | "minorComponents", item: string) => {
    const current = layer[key];
    const next = current.includes(item)
      ? current.filter((i) => i !== item)
      : [...current, item];
    onChange({ [key]: next });
  };

  return (
    <div className="space-y-6">
      {/* Section: Classification */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-primary" />
          <Label className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
            Classification
          </Label>
        </div>

        {/* Primary Soil Type */}
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Primary Soil Type</Label>
          <Select
            value={layer.primarySoilType}
            onValueChange={(v) => onChange({ primarySoilType: v })}
          >
            <SelectTrigger className="bg-muted/40 border-border h-9 focus:border-primary/50">
              <SelectValue placeholder="Select soil type…" />
            </SelectTrigger>
            <SelectContent>
              {PRIMARY_SOIL_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Secondary Descriptors */}
        <ToggleChips
          label="Secondary Descriptors"
          options={SECONDARY_DESCRIPTORS}
          selected={layer.secondaryDescriptors}
          onToggle={(item) => toggleList("secondaryDescriptors", item)}
        />

        {/* Plasticity */}
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Plasticity</Label>
          <Select
            value={layer.plasticity}
            onValueChange={(v) => onChange({ plasticity: v })}
          >
            <SelectTrigger className="bg-muted/40 border-border h-9 w-40">
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Section: Colour */}
      <div className="space-y-4 border-t border-border pt-5">
        <div className="flex items-center gap-2">
          <Palette className="h-3.5 w-3.5 text-primary" />
          <Label className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
            Colour
          </Label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Primary</Label>
            <Select
              value={layer.colour}
              onValueChange={(v) => onChange({ colour: v })}
            >
              <SelectTrigger className="bg-muted/40 border-border h-9">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {COLOURS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Becoming</Label>
            <Select
              value={layer.colourBecoming || "__none__"}
              onValueChange={(v) => onChange({ colourBecoming: v === "__none__" ? "" : v })}
            >
              <SelectTrigger className="bg-muted/40 border-border h-9">
                <SelectValue placeholder="Optional…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {COLOURS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Minor Components */}
      <div className="border-t border-border pt-5">
        <ToggleChips
          label="Minor Components"
          options={MINOR_COMPONENTS}
          selected={layer.minorComponents}
          onToggle={(item) => toggleList("minorComponents", item)}
        />
      </div>

      {/* Section: Tests */}
      <div className="space-y-4 border-t border-border pt-5">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-3.5 w-3.5 text-primary" />
          <Label className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
            Lab Tests
          </Label>
        </div>

        {/* Atterberg Limits */}
        <div className="space-y-2">
          <span className="text-[11px] text-muted-foreground font-medium">Atterberg Limits</span>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground">LL %</span>
              <Input
                type="number"
                value={layer.liquidLimit}
                onChange={(e) => onChange({ liquidLimit: e.target.value })}
                className="bg-muted/40 border-border h-8 text-sm focus:border-primary/50"
                placeholder="—"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground">PL %</span>
              <Input
                type="number"
                value={layer.plasticLimit}
                onChange={(e) => onChange({ plasticLimit: e.target.value })}
                className="bg-muted/40 border-border h-8 text-sm focus:border-primary/50"
                placeholder="—"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground">PI %</span>
              <Input
                type="number"
                value={layer.plasticityIndex}
                onChange={(e) => onChange({ plasticityIndex: e.target.value })}
                className="bg-muted/40 border-border h-8 text-sm focus:border-primary/50"
                placeholder="—"
              />
            </div>
          </div>
        </div>

        {/* MC, CBR, Salinity, Aggressivity */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground">MC %</span>
            <Input
              type="number"
              value={layer.moistureContent}
              onChange={(e) => onChange({ moistureContent: e.target.value })}
              className="bg-muted/40 border-border h-8 text-sm focus:border-primary/50"
              placeholder="—"
            />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground">CBR %</span>
            <Input
              type="number"
              value={layer.cbrValue}
              onChange={(e) => onChange({ cbrValue: e.target.value })}
              className="bg-muted/40 border-border h-8 text-sm focus:border-primary/50"
              placeholder="—"
            />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground">Salinity</span>
            <Input
              value={layer.salinity}
              onChange={(e) => onChange({ salinity: e.target.value })}
              className="bg-muted/40 border-border h-8 text-sm focus:border-primary/50"
              placeholder="—"
            />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground">Aggressivity</span>
            <Input
              value={layer.aggressivity}
              onChange={(e) => onChange({ aggressivity: e.target.value })}
              className="bg-muted/40 border-border h-8 text-sm focus:border-primary/50"
              placeholder="—"
            />
          </div>
        </div>
      </div>

      {/* Grading Summary */}
      <div className="space-y-1.5 border-t border-border pt-5">
        <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">
          Grading Summary
        </Label>
        <Input
          value={layer.gradingSummary}
          onChange={(e) => onChange({ gradingSummary: e.target.value })}
          placeholder="e.g. Well graded, fine to coarse"
          className="bg-muted/40 border-border h-9 focus:border-primary/50"
        />
      </div>
    </div>
  );
}
