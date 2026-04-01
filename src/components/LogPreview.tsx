import {
  formatAS1726Description,
  formatDepthRange,
  formatTestResults,
  type BoreholeEntry,
} from "@/lib/as1726";

interface LogPreviewProps {
  entry: BoreholeEntry;
}

export function LogPreview({ entry }: LogPreviewProps) {
  const description = formatAS1726Description(entry);
  const depthRange = formatDepthRange(entry);
  const testResults = formatTestResults(entry);
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
                {entry.boreholeId && `${entry.boreholeId} · `}
                {depthRange}
              </div>
            )}
            <p className="font-mono text-sm text-foreground leading-relaxed font-medium">
              {description}
            </p>
            {testResults.length > 0 && (
              <div className="pt-2 border-t border-border/50">
                <div className="flex flex-wrap gap-2">
                  {testResults.map((r) => (
                    <span
                      key={r}
                      className="text-xs font-mono text-accent bg-accent/10 px-2 py-0.5 rounded"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {entry.gradingSummary && (
              <p className="text-xs text-muted-foreground font-mono">
                Grading: {entry.gradingSummary}
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
