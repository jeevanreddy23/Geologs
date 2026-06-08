import * as React from 'react';
import type { LayerInput } from '@/lib/as1726';

interface StrataProfileProps {
  layers: LayerInput[];
}

export function StrataProfile({ layers }: StrataProfileProps) {
  const maxDepth = layers.reduce((max, l) => Math.max(max, l.depthTo || 0), 0);
  
  if (maxDepth === 0 || layers.length === 0) {
    return (
      <div className="h-full min-h-[400px] w-full flex flex-col items-center justify-center text-muted-foreground p-4 border border-dashed rounded-md bg-muted/20">
        <div className="mb-2">Borehole Profile</div>
        <div className="text-sm">Add layers to see visualization</div>
      </div>
    );
  }

  const getColor = (layer: LayerInput) => {
    if (layer.type === "rock") {
       if (layer.major === "SANDSTONE") return "bg-stone-300 text-stone-900";
       if (layer.major === "SHALE") return "bg-slate-600 text-slate-100";
       if (layer.major === "BASALT") return "bg-zinc-800 text-zinc-100";
       if (layer.major === "LIMESTONE") return "bg-blue-200 text-blue-900";
       if (layer.major === "GRANITE") return "bg-rose-200 text-rose-900";
       return "bg-slate-400 text-slate-900";
    } else {
       if (layer.major === "CLAY") return "bg-orange-800 text-orange-50";
       if (layer.major === "SILT") return "bg-yellow-700 text-yellow-50";
       if (layer.major === "SAND") return "bg-amber-300 text-amber-900";
       if (layer.major === "GRAVEL") return "bg-stone-500 text-stone-50";
       return "bg-yellow-900 text-yellow-50";
    }
  };

  return (
    <div className="relative w-full border-2 border-border bg-muted/30 flex flex-col rounded shadow-inner" style={{ minHeight: "600px" }}>
       {layers.map((layer) => {
         if (layer.depthFrom === null || layer.depthTo === null) return null;
         const thickness = layer.depthTo - layer.depthFrom;
         if (thickness <= 0) return null;
         
         const heightPct = (thickness / maxDepth) * 100;
         const colorClasses = getColor(layer);
         
         return (
           <div 
             key={layer.id} 
             className={`w-full relative border-b border-border/50 flex flex-col items-center justify-center text-xs overflow-hidden transition-all hover:brightness-110 group ${colorClasses}`}
             style={{ height: `${heightPct}%`, minHeight: '24px' }}
             title={`${layer.depthFrom} - ${layer.depthTo}m: ${layer.major}\n${layer.description}`}
           >
             <span className="px-1 py-0.5 rounded drop-shadow-sm font-semibold truncate max-w-[90%] z-10 bg-background/20 backdrop-blur-sm">
               {layer.major || 'Unknown'} {layer.uscs ? `(${layer.uscs})` : ''}
             </span>
             <div className="absolute left-1 top-0 text-[10px] opacity-70 group-hover:opacity-100 transition-opacity">{layer.depthFrom.toFixed(2)}m</div>
             <div className="absolute left-1 bottom-0 text-[10px] opacity-70 group-hover:opacity-100 transition-opacity">{layer.depthTo.toFixed(2)}m</div>
           </div>
         )
       })}
    </div>
  )
}
