import * as React from 'react';
import { type LayerInput, SOIL_MAJORS, ROCK_MAJORS, PLASTICITY, CONSISTENCY, DENSITY, MOISTURE, WEATHERING, STRENGTH, computeDerived, validateRow } from '@/lib/as1726';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus } from 'lucide-react';

interface StrataGridProps {
  layers: LayerInput[];
  onChange: (layers: LayerInput[]) => void;
}

const selectClass = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function StrataGrid({ layers, onChange }: StrataGridProps) {

  const handleUpdate = (index: number, field: keyof LayerInput, value: any) => {
    const newLayers = [...layers];
    const layer = { ...newLayers[index], [field]: value };
    
    // Auto derive when changing major, type, or plasticity
    if (field === 'type' || field === 'major' || field === 'plasticity') {
      const derived = computeDerived(layer);
      Object.assign(layer, derived);
    }
    
    newLayers[index] = layer;
    onChange(newLayers);
  };

  const addLayer = (index: number) => {
    const prev = layers[index];
    const newLayer: LayerInput = {
      id: Math.random().toString(36).substring(7),
      depthFrom: prev ? prev.depthTo : 0,
      depthTo: prev ? (prev.depthTo !== null ? prev.depthTo + 1 : 1) : 1,
      type: "soil",
      major: "",
      uscs: "",
      description: ""
    };
    const newLayers = [...layers];
    newLayers.splice(index + 1, 0, newLayer);
    onChange(newLayers);
  };

  const deleteLayer = (index: number) => {
    const newLayers = [...layers];
    newLayers.splice(index, 1);
    onChange(newLayers);
  };

  return (
    <div className="w-full overflow-x-auto border rounded-md">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-muted-foreground bg-muted/50 uppercase">
          <tr>
            <th className="px-2 py-2 w-20">From (m)</th>
            <th className="px-2 py-2 w-20">To (m)</th>
            <th className="px-2 py-2 w-24">Type</th>
            <th className="px-2 py-2 w-32">Major</th>
            <th className="px-2 py-2 w-20">USCS</th>
            <th className="px-2 py-2 w-32">Plasticity</th>
            <th className="px-2 py-2 w-32">Consistency</th>
            <th className="px-2 py-2 w-32">Density</th>
            <th className="px-2 py-2 w-32">Moisture</th>
            <th className="px-2 py-2 w-40">Weathering</th>
            <th className="px-2 py-2 w-40">Strength</th>
            <th className="px-2 py-2 min-w-[200px]">Description</th>
            <th className="px-2 py-2 w-12 text-center">Act</th>
          </tr>
        </thead>
        <tbody>
          {layers.map((layer, idx) => {
            const issues = validateRow(layer);
            const isCohesive = layer.major === "CLAY" || layer.major === "SILT";
            const isGranular = layer.major === "SAND" || layer.major === "GRAVEL" || layer.major === "COBBLES" || layer.major === "BOULDERS";

            return (
              <tr key={layer.id} className="border-b hover:bg-muted/20">
                <td className="px-1 py-1">
                  <Input 
                    type="number" step="0.01" 
                    value={layer.depthFrom ?? ''} 
                    onChange={e => handleUpdate(idx, 'depthFrom', parseFloat(e.target.value))} 
                    className={`h-8 ${issues.some(i => i.field === 'depthFrom') ? 'border-destructive' : ''}`}
                  />
                </td>
                <td className="px-1 py-1">
                  <Input 
                    type="number" step="0.01" 
                    value={layer.depthTo ?? ''} 
                    onChange={e => handleUpdate(idx, 'depthTo', parseFloat(e.target.value))} 
                    className={`h-8 ${issues.some(i => i.field === 'depthTo') ? 'border-destructive' : ''}`}
                  />
                </td>
                <td className="px-1 py-1">
                  <select 
                    value={layer.type} 
                    onChange={e => handleUpdate(idx, 'type', e.target.value as "soil"|"rock")} 
                    className={`${selectClass} h-8`}
                  >
                    <option value="soil">Soil</option>
                    <option value="rock">Rock</option>
                  </select>
                </td>
                <td className="px-1 py-1">
                  <select 
                    value={layer.major} 
                    onChange={e => handleUpdate(idx, 'major', e.target.value)} 
                    className={`${selectClass} h-8 ${issues.some(i => i.field === 'major') ? 'border-destructive' : ''}`}
                  >
                    <option value="" disabled>Select</option>
                    {(layer.type === "soil" ? SOIL_MAJORS : ROCK_MAJORS).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </td>
                <td className="px-1 py-1">
                  <Input 
                    readOnly 
                    value={layer.uscs} 
                    className="h-8 bg-muted text-muted-foreground" 
                    tabIndex={-1}
                  />
                </td>
                <td className="px-1 py-1">
                  <select 
                    value={layer.plasticity || ""} 
                    onChange={e => handleUpdate(idx, 'plasticity', e.target.value)} 
                    disabled={layer.type === "rock" || !isCohesive}
                    className={`${selectClass} h-8`}
                  >
                    <option value=""></option>
                    {PLASTICITY.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </td>
                <td className="px-1 py-1">
                  <select 
                    value={layer.consistency || ""} 
                    onChange={e => handleUpdate(idx, 'consistency', e.target.value)} 
                    disabled={layer.type === "rock" || !isCohesive}
                    className={`${selectClass} h-8`}
                  >
                    <option value=""></option>
                    {CONSISTENCY.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </td>
                <td className="px-1 py-1">
                  <select 
                    value={layer.density || ""} 
                    onChange={e => handleUpdate(idx, 'density', e.target.value)} 
                    disabled={layer.type === "rock" || !isGranular}
                    className={`${selectClass} h-8`}
                  >
                    <option value=""></option>
                    {DENSITY.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </td>
                <td className="px-1 py-1">
                  <select 
                    value={layer.moisture || ""} 
                    onChange={e => handleUpdate(idx, 'moisture', e.target.value)} 
                    disabled={layer.type === "rock"}
                    className={`${selectClass} h-8`}
                  >
                    <option value=""></option>
                    {MOISTURE.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </td>
                <td className="px-1 py-1">
                  <select 
                    value={layer.weathering || ""} 
                    onChange={e => handleUpdate(idx, 'weathering', e.target.value)} 
                    disabled={layer.type === "soil"}
                    className={`${selectClass} h-8`}
                  >
                    <option value=""></option>
                    {WEATHERING.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </td>
                <td className="px-1 py-1">
                  <select 
                    value={layer.strength || ""} 
                    onChange={e => handleUpdate(idx, 'strength', e.target.value)} 
                    disabled={layer.type === "soil"}
                    className={`${selectClass} h-8`}
                  >
                    <option value=""></option>
                    {STRENGTH.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </td>
                <td className="px-1 py-1">
                  <Input 
                    value={layer.description} 
                    onChange={e => handleUpdate(idx, 'description', e.target.value)} 
                    className="h-8"
                  />
                </td>
                <td className="px-1 py-1 text-center">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteLayer(idx)} aria-label="Delete layer">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {layers.length === 0 && (
        <div className="p-4 text-center text-muted-foreground">
          No layers added.
        </div>
      )}
      <div className="p-2 border-t">
        <Button variant="outline" size="sm" onClick={() => addLayer(layers.length - 1)}>
          <Plus className="h-4 w-4 mr-2" /> Add Layer
        </Button>
      </div>
    </div>
  );
}
