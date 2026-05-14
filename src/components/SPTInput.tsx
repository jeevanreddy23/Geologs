import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowDownToLine, Plus, Trash2 } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import type { SPTTest } from "@/lib/as1726";

interface SPTInputProps {
  sptTests: SPTTest[];
  totalDepth: string;
  onChange: (tests: SPTTest[]) => void;
}

function generateIntervalDepths(totalDepth: number): number[] {
  const depths: number[] = [];
  for (let d = 1.5; d <= totalDepth; d += 1.5) {
    depths.push(parseFloat(d.toFixed(1)));
  }
  return depths;
}

export function SPTInput({ sptTests, totalDepth, onChange }: SPTInputProps) {
  const total = parseFloat(totalDepth) || 15;
  const intervalDepths = generateIntervalDepths(total);

  // Auto-populate missing depths
  const handleAutoPopulate = () => {
    const existing = new Set(sptTests.map((t) => t.depth));
    const newTests = [...sptTests];
    for (const d of intervalDepths) {
      if (!existing.has(d)) {
        newTests.push({ depth: d, n1: "", n2: "", n3: "", penetration: "450 mm" });
      }
    }
    newTests.sort((a, b) => a.depth - b.depth);
    onChange(newTests);
  };

  const updateTest = (index: number, field: keyof SPTTest, value: string | number) => {
    const updated = [...sptTests];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeTest = (index: number) => {
    onChange(sptTests.filter((_, i) => i !== index));
  };

  const nValue = (test: SPTTest) => (parseInt(test.n2) || 0) + (parseInt(test.n3) || 0);

  const chartData = sptTests
    .filter((t) => t.n2 || t.n3)
    .map((t) => ({
      depth: `${t.depth}m`,
      depthNum: t.depth,
      N: nValue(t),
      refusal: nValue(t) >= 50,
    }));

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="relative w-10 h-14 flex-shrink-0">
          <div className="absolute left-1/2 -translate-x-1/2 top-0 w-1 h-6 bg-muted-foreground/40 rounded-full" />
          <div className="absolute left-1/2 -translate-x-1/2 top-0 w-6 h-4 bg-destructive/50 rounded-sm border border-destructive/30" />
          <span className="absolute left-1/2 -translate-x-1/2 top-0.5 text-[6px] font-bold text-destructive-foreground">63.5</span>
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-3 h-5 bg-muted-foreground/30 rounded-b-sm border border-muted-foreground/20" />
          <ArrowDownToLine className="absolute right-0 top-1 h-3 w-3 text-destructive/70" />
        </div>
        <div className="flex-1">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            SPT — Every 1.5m Interval
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            63.5 kg hammer, 760 mm drop • Tests at 1.5, 3.0, 4.5 m …
          </p>
        </div>
      </div>

      {/* Auto-populate button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleAutoPopulate}
        className="w-full text-xs h-8 border-border/60"
      >
        <Plus className="h-3 w-3 mr-1.5" />
        Auto-fill SPT at 1.5m intervals (to {total}m)
      </Button>

      {/* SPT entries */}
      {sptTests.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          <div className="grid grid-cols-[50px_1fr_1fr_1fr_28px] gap-1 text-[10px] text-muted-foreground font-medium px-0.5">
            <span>Depth</span>
            <span>0–150</span>
            <span>150–300</span>
            <span>300–450</span>
            <span></span>
          </div>
          {sptTests.map((test, i) => {
            const n = nValue(test);
            const isRefusal = n >= 50;
            return (
              <div
                key={i}
                className={`grid grid-cols-[50px_1fr_1fr_1fr_28px] gap-1 items-center ${
                  isRefusal ? "bg-destructive/5 rounded" : ""
                }`}
              >
                <span className="text-xs font-mono text-muted-foreground">{test.depth}m</span>
                <Input
                  type="number" min={0}
                  value={test.n1}
                  onChange={(e) => updateTest(i, "n1", e.target.value)}
                  className="bg-muted/50 border-border h-7 text-xs"
                  placeholder="N₁"
                />
                <Input
                  type="number" min={0}
                  value={test.n2}
                  onChange={(e) => updateTest(i, "n2", e.target.value)}
                  className="bg-muted/50 border-border h-7 text-xs"
                  placeholder="N₂"
                />
                <Input
                  type="number" min={0}
                  value={test.n3}
                  onChange={(e) => updateTest(i, "n3", e.target.value)}
                  className="bg-muted/50 border-border h-7 text-xs"
                  placeholder="N₃"
                />
                <Button
                  variant="ghost" size="sm"
                  onClick={() => removeTest(i)}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
                {(test.n2 || test.n3) && (
                  <div className="col-span-5 text-[10px] font-mono pl-[54px] pb-1">
                    <span className={isRefusal ? "text-destructive font-bold" : "text-primary"}>
                      N = {n}{isRefusal ? " (Refusal)" : ""}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="rounded-lg border border-border p-3 bg-muted/30" style={{ minWidth: 0 }}>
          <Label className="text-xs text-muted-foreground font-semibold mb-2 block">
            SPT N-Value vs Depth
          </Label>
          <div style={{ width: "100%", height: Math.max(180, chartData.length * 24) }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 10, left: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  type="number"
                  domain={[0, 60]}
                  tick={{ fontSize: 10 }}
                  label={{ value: "SPT N-Value", position: "insideBottom", offset: -2, style: { fontSize: 10 } }}
                />
                <YAxis
                  type="category"
                  dataKey="depth"
                  tick={{ fontSize: 9 }}
                  width={40}
                  label={{ value: "Depth (m)", angle: -90, position: "insideLeft", style: { fontSize: 10 } }}
                />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  formatter={(value: number) => [value, "N-Value"]}
                  labelFormatter={(label) => `Depth: ${label}`}
                />
                <Line type="monotone" dataKey="N" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--primary))" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
