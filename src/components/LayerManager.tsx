import { Plus, Trash2, ChevronRight, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type SoilLayer, type BoreholeProject, formatAS1726Description } from "@/lib/as1726";

interface LayerManagerProps {
  project: BoreholeProject;
  activeLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onAddLayer: () => void;
  onRemoveLayer: (id: string) => void;
}

export function LayerManager({ project, activeLayerId, onSelectLayer, onAddLayer, onRemoveLayer }: LayerManagerProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
          Layers
          {project.layers.length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/15 text-primary text-[10px] font-bold">
              {project.layers.length}
            </span>
          )}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddLayer}
          className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>

      {project.layers.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border rounded-xl">
          <p className="text-xs text-muted-foreground mb-3">No layers yet</p>
          <Button
            size="sm"
            onClick={onAddLayer}
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add First Layer
          </Button>
        </div>
      ) : (
        <div className="space-y-1 custom-scroll max-h-[400px] overflow-y-auto pr-1">
          {project.layers.map((layer, i) => {
            const isActive = layer.id === activeLayerId;
            const desc = formatAS1726Description(layer);
            const depth = layer.depthFrom && layer.depthTo
              ? `${layer.depthFrom} – ${layer.depthTo}m`
              : "No depth";

            return (
              <div
                key={layer.id}
                onClick={() => onSelectLayer(layer.id)}
                className={`
                  group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150
                  ${isActive
                    ? "bg-primary/8 border border-primary/25 shadow-sm shadow-primary/5"
                    : "border border-transparent hover:bg-muted/40 hover:border-border"
                  }
                `}
              >
                <div className={`
                  w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors
                  ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}
                `}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-mono text-muted-foreground">{depth}</div>
                  <div className="text-xs truncate text-foreground/80">
                    {desc || <span className="italic text-muted-foreground">Empty</span>}
                  </div>
                  {layer.photoUrls.length > 0 && (
                    <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                      📷 {layer.photoUrls.length}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:bg-destructive/10"
                    onClick={(e) => { e.stopPropagation(); onRemoveLayer(layer.id); }}
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
                {isActive && <ChevronRight className="h-3 w-3 text-primary shrink-0" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
