import {
  formatAS1726Description,
  formatDepthRange,
  formatTestResults,
  type SoilLayer,
} from "@/lib/as1726";
import { FileText } from "lucide-react";

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
        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
        <FileText className="h-3 w-3 text-primary/60" />
        <h3 className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
          Live Output
        </h3>
      </div>

      <div className="rounded-lg border border-primary/10 bg-primary/3 p-4 glow-border transition-all duration-300">
        {hasContent ? (
          <div className="space-y-3 animate-fade-in">
            {depthRange && (
              <div className="text-[10px] text-muted-foreground font-mono tracking-wider">
                {boreholeId && <span className="text-primary/60">{boreholeId}</span>}
                {boreholeId && " · "}
                {depthRange}
              </div>
            )}
            <p className="font-mono text-[13px] text-foreground leading-relaxed font-medium">
              {description}
            </p>
            {testResults.length > 0 && (
              <div className="pt-2.5 border-t border-border/20">
                <div className="flex flex-wrap gap-1.5">
                  {testResults.map((r, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-mono text-accent/90 bg-accent/8 px-2 py-0.5 rounded-md border border-accent/10"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {layer.gradingSummary && (
              <p className="text-[10px] text-muted-foreground font-mono mt-1">
                Grading: {layer.gradingSummary}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/60 italic">
            Start entering data to see formatted AS 1726 output…
          </p>
        )}
      </div>
    </div>
  );
}
