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
import { DCPInput } from "@/components/DCPInput";
import { SPTInput } from "@/components/SPTInput";

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
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <Badge
              key={opt}
              variant={active ? "default" : "outline"}
              className={`cursor-pointer text-xs transition-colors ${
                active
                  ? "bg-primary text-primary-foreground hover:bg-primary/80"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
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
    <div className="space-y-5">
      {/* Primary Soil Type */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Primary Soil Type
        </Label>
        <Select
          value={layer.primarySoilType}
          onValueChange={(v) => onChange({ primarySoilType: v })}
        >
          <SelectTrigger className="bg-muted/50 border-border">
            <SelectValue placeholder="Select soil type..." />
          </SelectTrigger>
          <SelectContent>
            {PRIMARY_SOIL_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
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
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Plasticity
        </Label>
        <Select
          value={layer.plasticity}
          onValueChange={(v) => onChange({ plasticity: v })}
        >
          <SelectTrigger className="bg-muted/50 border-border">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Colour */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Colour
          </Label>
          <Select
            value={layer.colour}
            onValueChange={(v) => onChange({ colour: v })}
          >
            <SelectTrigger className="bg-muted/50 border-border">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {COLOURS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Becoming
          </Label>
          <Select
            value={layer.colourBecoming || "__none__"}
            onValueChange={(v) => onChange({ colourBecoming: v === "__none__" ? "" : v })}
          >
            <SelectTrigger className="bg-muted/50 border-border">
              <SelectValue placeholder="Optional..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {COLOURS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Minor Components */}
      <ToggleChips
        label="Minor Components"
        options={MINOR_COMPONENTS}
        selected={layer.minorComponents}
        onToggle={(item) => toggleList("minorComponents", item)}
      />

      {/* SPT */}
      <SPTInput
        sptResult={layer.sptResult}
        onChange={(result) => onChange({ sptResult: result })}
      />

      {/* DCP */}
      <DCPInput
        readings={layer.dcpReadings}
        startDepth={layer.dcpStartDepth}
        onReadingsChange={(readings) => onChange({ dcpReadings: readings })}
        onStartDepthChange={(depth) => onChange({ dcpStartDepth: depth })}
      />

      {/* Other In-Situ Tests */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Other Testing
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">CPT</span>
            <Input
              value={layer.cptValue}
              onChange={(e) => onChange({ cptValue: e.target.value })}
              className="bg-muted/50 border-border h-8 text-sm"
              placeholder="—"
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">MC %</span>
            <Input
              type="number"
              value={layer.moistureContent}
              onChange={(e) => onChange({ moistureContent: e.target.value })}
              className="bg-muted/50 border-border h-8 text-sm"
              placeholder="—"
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">CBR %</span>
            <Input
              type="number"
              value={layer.cbrValue}
              onChange={(e) => onChange({ cbrValue: e.target.value })}
              className="bg-muted/50 border-border h-8 text-sm"
              placeholder="—"
            />
          </div>
        </div>
      </div>

      {/* Atterberg Limits */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Atterberg Limits
        </Label>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">LL %</span>
            <Input
              type="number"
              value={layer.liquidLimit}
              onChange={(e) => onChange({ liquidLimit: e.target.value })}
              className="bg-muted/50 border-border h-8 text-sm"
              placeholder="—"
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">PL %</span>
            <Input
              type="number"
              value={layer.plasticLimit}
              onChange={(e) => onChange({ plasticLimit: e.target.value })}
              className="bg-muted/50 border-border h-8 text-sm"
              placeholder="—"
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">PI %</span>
            <Input
              type="number"
              value={layer.plasticityIndex}
              onChange={(e) => onChange({ plasticityIndex: e.target.value })}
              className="bg-muted/50 border-border h-8 text-sm"
              placeholder="—"
            />
          </div>
        </div>
      </div>

      {/* Grading Summary */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Grading Summary
        </Label>
        <Input
          value={layer.gradingSummary}
          onChange={(e) => onChange({ gradingSummary: e.target.value })}
          placeholder="e.g. Well graded, fine to coarse"
          className="bg-muted/50 border-border"
        />
      </div>
    </div>
  );
}
