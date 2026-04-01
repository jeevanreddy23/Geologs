import { Plus, Trash2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type SoilLayer, type BoreholeProject, createLayerId, defaultLayer, formatAS1726Description } from "@/lib/as1726";

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
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          Soil Layers ({project.layers.length})
        </h3>
        <Button variant="outline" size="sm" onClick={onAddLayer} className="h-7 text-xs">
          <Plus className="h-3 w-3 mr-1" />
          Add Layer
        </Button>
      </div>

      {project.layers.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-border rounded-lg">
          <p className="text-sm text-muted-foreground mb-2">No layers yet</p>
          <Button variant="outline" size="sm" onClick={onAddLayer}>
            <Plus className="h-3 w-3 mr-1" />
            Add First Layer
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          {project.layers.map((layer, i) => {
            const isActive = layer.id === activeLayerId;
            const desc = formatAS1726Description(layer);
            const depth = layer.depthFrom && layer.depthTo
              ? `${layer.depthFrom}m – ${layer.depthTo}m`
              : "No depth set";

            return (
              <div
                key={layer.id}
                onClick={() => onSelectLayer(layer.id)}
                className={`
                  flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all
                  ${isActive
                    ? "bg-primary/10 border border-primary/30"
                    : "bg-muted/30 border border-transparent hover:border-border hover:bg-muted/50"
                  }
                `}
              >
                <div className={`
                  w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0
                  ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}
                `}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono text-muted-foreground">{depth}</div>
                  <div className="text-xs truncate text-foreground">
                    {desc || <span className="italic text-muted-foreground">Empty layer</span>}
                  </div>
                  {layer.photoUrls.length > 0 && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      📷 {layer.photoUrls.length} photo{layer.photoUrls.length !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => { e.stopPropagation(); onRemoveLayer(layer.id); }}
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </Button>
                  {isActive && <ChevronRight className="h-3 w-3 text-primary" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
