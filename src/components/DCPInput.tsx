import { Plus, Trash2, ArrowDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import type { DCPReading } from "@/lib/as1726";

interface DCPInputProps {
  readings: DCPReading[];
  startDepth: string;
  onReadingsChange: (readings: DCPReading[]) => void;
  onStartDepthChange: (depth: string) => void;
}

export function DCPInput({ readings, startDepth, onReadingsChange, onStartDepthChange }: DCPInputProps) {
  const addReading = () => {
    onReadingsChange([...readings, { blows: 0, isDoubleBound: false }]);
  };

  const removeReading = (index: number) => {
    onReadingsChange(readings.filter((_, i) => i !== index));
  };

  const updateReading = (index: number, updates: Partial<DCPReading>) => {
    const updated = readings.map((r, i) => (i === index ? { ...r, ...updates } : r));
    onReadingsChange(updated);
  };

  const start = parseFloat(startDepth) || 0;

  return (
    <div className="space-y-3">
      {/* Visual header with DCP diagram */}
      <div className="flex items-center gap-3">
        <div className="relative w-10 h-14 flex-shrink-0">
          {/* DCP rod visual */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 w-1.5 h-10 bg-muted-foreground/40 rounded-full" />
          {/* Hammer weight */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 w-5 h-3 bg-primary/70 rounded-sm" />
          {/* Cone tip */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-1 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[8px] border-l-transparent border-r-transparent border-t-muted-foreground/60" />
          {/* Drop arrow */}
          <ArrowDown className="absolute right-0 top-1 h-3 w-3 text-primary animate-bounce" />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            DCP — Dynamic Cone Penetrometer
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            8 kg hammer, 575 mm drop, blows per 0.1 m
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={addReading} className="h-7 text-xs">
          <Plus className="h-3 w-3 mr-1" />
          Add Interval
        </Button>
      </div>

      <div className="space-y-1">
        <span className="text-xs text-muted-foreground">Start Depth (m)</span>
        <Input
          type="number"
          step="0.1"
          value={startDepth}
          onChange={(e) => onStartDepthChange(e.target.value)}
          className="bg-muted/50 border-border h-8 text-sm w-32"
          placeholder="0.0"
        />
      </div>

      {readings.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-[60px_1fr_60px_40px] gap-0 bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border">
            <span>Depth</span>
            <span>Blows</span>
            <span>DB</span>
            <span></span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {readings.map((reading, i) => {
              const depth = start + i * 0.1;
              return (
                <div
                  key={i}
                  className="grid grid-cols-[60px_1fr_60px_40px] gap-0 items-center px-3 py-1 border-b border-border/50 last:border-0"
                >
                  <span className="text-xs font-mono text-muted-foreground">
                    {depth.toFixed(1)}m
                  </span>
                  <Input
                    type="number"
                    min={0}
                    value={reading.blows || ""}
                    onChange={(e) =>
                      updateReading(i, { blows: parseInt(e.target.value) || 0 })
                    }
                    className="bg-background border-border h-7 text-sm w-20"
                  />
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={reading.isDoubleBound}
                      onCheckedChange={(checked) =>
                        updateReading(i, { isDoubleBound: !!checked })
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeReading(i)}
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DCP Graph: Depth (x) vs Blows (y) */}
      {readings.length > 1 && (
        <div className="rounded-lg border border-border p-3 bg-muted/30">
          <Label className="text-xs text-muted-foreground font-semibold mb-2 block">DCP Profile</Label>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart
              data={readings.map((r, i) => ({
                depth: parseFloat((start + i * 0.1).toFixed(1)),
                blows: r.blows,
              }))}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="depth"
                type="number"
                label={{ value: "Depth (m)", position: "insideBottom", offset: -2, style: { fontSize: 10 } }}
                tick={{ fontSize: 10 }}
                domain={["dataMin", "dataMax"]}
              />
              <YAxis
                dataKey="blows"
                label={{ value: "Blows", angle: -90, position: "insideLeft", style: { fontSize: 10 } }}
                tick={{ fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8 }}
                formatter={(value: number) => [value, "Blows"]}
                labelFormatter={(label) => `Depth: ${label}m`}
              />
              <Line
                type="monotone"
                dataKey="blows"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3, fill: "hsl(var(--primary))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {readings.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          Click "Add Interval" to enter DCP blow counts per 0.1m increment
        </p>
      )}
    </div>
  );
}
