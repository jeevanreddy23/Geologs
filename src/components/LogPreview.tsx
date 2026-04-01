import {
  formatAS1726Description,
  formatDepthRange,
  formatTestResults,
  type SoilLayer,
} from "@/lib/as1726";

interface LogPreviewProps {
  layer: SoilLayer;
  boreholeId?: string;
}

export function LogPreview({ layer, boreholeId }: LogPreviewProps) {
  const description = formatAS1726Description(layer);
  const depthRange = formatDepthRange(layer);
  const testResults = formatTestResults(layer);
  const hasContent = description.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          Live AS 1726 Output
        </h3>
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 glow-border">
        {hasContent ? (
          <div className="space-y-3">
            {depthRange && (
              <div className="text-xs text-muted-foreground font-mono">
                {boreholeId && `${boreholeId} · `}
                {depthRange}
              </div>
            )}
            <p className="font-mono text-sm text-foreground leading-relaxed font-medium">
              {description}
            </p>
            {testResults.length > 0 && (
              <div className="pt-2 border-t border-border/50">
                <div className="flex flex-wrap gap-2">
                  {testResults.map((r, i) => (
                    <span
                      key={i}
                      className="text-xs font-mono text-accent bg-accent/10 px-2 py-0.5 rounded"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {layer.gradingSummary && (
              <p className="text-xs text-muted-foreground font-mono">
                Grading: {layer.gradingSummary}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Start entering soil data to see the AS 1726 formatted description…
          </p>
        )}
      </div>
    </div>
  );
}
