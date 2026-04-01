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
  type BoreholeEntry,
  PRIMARY_SOIL_TYPES,
  SECONDARY_DESCRIPTORS,
  MINOR_COMPONENTS,
  COLOURS,
} from "@/lib/as1726";

interface SoilInputProps {
  entry: BoreholeEntry;
  onChange: (updates: Partial<BoreholeEntry>) => void;
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

export function SoilInput({ entry, onChange }: SoilInputProps) {
  const toggleList = (key: "secondaryDescriptors" | "minorComponents", item: string) => {
    const current = entry[key];
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
          value={entry.primarySoilType}
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
        selected={entry.secondaryDescriptors}
        onToggle={(item) => toggleList("secondaryDescriptors", item)}
      />

      {/* Plasticity */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Plasticity
        </Label>
        <Select
          value={entry.plasticity}
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
            value={entry.colour}
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
            value={entry.colourBecoming || "__none__"}
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
        selected={entry.minorComponents}
        onToggle={(item) => toggleList("minorComponents", item)}
      />

      {/* Test Results */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          In-Situ Testing
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">SPT N</span>
            <Input
              type="number"
              value={entry.sptN}
              onChange={(e) => onChange({ sptN: e.target.value })}
              className="bg-muted/50 border-border h-8 text-sm"
              placeholder="—"
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">N60</span>
            <Input
              type="number"
              value={entry.sptN60}
              onChange={(e) => onChange({ sptN60: e.target.value })}
              className="bg-muted/50 border-border h-8 text-sm"
              placeholder="—"
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">DCP Blows</span>
            <Input
              type="number"
              value={entry.dcpBlows}
              onChange={(e) => onChange({ dcpBlows: e.target.value })}
              className="bg-muted/50 border-border h-8 text-sm"
              placeholder="—"
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">CPT</span>
            <Input
              value={entry.cptValue}
              onChange={(e) => onChange({ cptValue: e.target.value })}
              className="bg-muted/50 border-border h-8 text-sm"
              placeholder="—"
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">MC %</span>
            <Input
              type="number"
              value={entry.moistureContent}
              onChange={(e) => onChange({ moistureContent: e.target.value })}
              className="bg-muted/50 border-border h-8 text-sm"
              placeholder="—"
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">CBR %</span>
            <Input
              type="number"
              value={entry.cbrValue}
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
              value={entry.liquidLimit}
              onChange={(e) => onChange({ liquidLimit: e.target.value })}
              className="bg-muted/50 border-border h-8 text-sm"
              placeholder="—"
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">PL %</span>
            <Input
              type="number"
              value={entry.plasticLimit}
              onChange={(e) => onChange({ plasticLimit: e.target.value })}
              className="bg-muted/50 border-border h-8 text-sm"
              placeholder="—"
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">PI %</span>
            <Input
              type="number"
              value={entry.plasticityIndex}
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
          value={entry.gradingSummary}
          onChange={(e) => onChange({ gradingSummary: e.target.value })}
          placeholder="e.g. Well graded, fine to coarse"
          className="bg-muted/50 border-border"
        />
      </div>
    </div>
  );
}
