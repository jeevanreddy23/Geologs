import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { type LayerInput, blocksSave } from '@/lib/as1726'
import { StrataGrid } from '@/components/StrataGrid'
import { CoreViewer } from '@/components/CoreViewer'
import { Upload, FileDown, FolderOpen, Map } from 'lucide-react'

export const Route = createFileRoute('/log')({
  component: LogEditor,
})

function LogEditor() {
  const [projectName, setProjectName] = React.useState('')
  const [holeId, setHoleId] = React.useState('')
  const [layers, setLayers] = React.useState<LayerInput[]>([])
  
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('borehole-log-v1')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.projectName) setProjectName(parsed.projectName)
        if (parsed.holeId) setHoleId(parsed.holeId)
        if (parsed.layers) setLayers(parsed.layers)
      }
    } catch (e) {
      console.error('Failed to parse saved log', e)
    }
  }, [])

  const handleSave = () => {
    localStorage.setItem(
      'borehole-log-v1',
      JSON.stringify({ projectName, holeId, layers })
    )
    toast.success('Borehole log saved to localStorage')
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const objectUrl = URL.createObjectURL(file)
      setPhotoUrl(objectUrl)
    }
  }

  const handleDepthSelected = (depth: number) => {
    // Inject a defect note into the correct layer based on depth
    let layerFound = false;
    const newLayers = layers.map((l) => {
      if (depth >= l.depthFrom && depth <= l.depthTo) {
        layerFound = true;
        const note = `${depth.toFixed(2)}m: Defect`;
        return { ...l, defects: l.defects ? `${l.defects}\n${note}` : note };
      }
      return l;
    });

    if (layerFound) {
      setLayers(newLayers);
    } else {
      toast.error(`Depth ${depth}m does not fall within any existing layer boundaries.`);
    }
  }

  const validation = blocksSave(layers)
  const validationIssues = validation.ok ? 0 : validation.issues.length

  return (
    <div className="h-screen flex w-full bg-slate-950 text-slate-300 overflow-hidden font-sans">
      
      {/* LEFT PANEL */}
      <div className="w-64 flex flex-col border-r border-slate-800 bg-slate-950 z-30 flex-shrink-0">
        <div className="p-4 border-b border-slate-800/50">
          <h2 className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-4 flex items-center">
            <FolderOpen size={12} className="mr-2"/> Project
          </h2>
          <div className="space-y-4">
            <div>
              <Label className="text-[10px] uppercase text-slate-400">Project Name</Label>
              <Input 
                value={projectName} 
                onChange={(e) => setProjectName(e.target.value)} 
                className="h-8 text-xs bg-slate-900 border-slate-700" 
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase text-slate-400">Hole ID</Label>
              <Input 
                value={holeId} 
                onChange={(e) => setHoleId(e.target.value)} 
                className="h-8 text-xs bg-slate-900 border-slate-700" 
              />
            </div>
          </div>
        </div>

        <div className="p-4 flex-1">
          <h2 className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-4 flex items-center">
            <Map size={12} className="mr-2"/> Corebox Imagery
          </h2>
          <input type="file" id="corebox-upload" className="hidden" accept="image/*" onChange={handleFileUpload} />
          <Button 
            variant="outline" 
            className="w-full text-xs justify-start bg-slate-900 border-slate-700 hover:bg-slate-800"
            onClick={() => document.getElementById('corebox-upload')?.click()}
          >
            <Upload size={14} className="mr-2" /> Upload Photo
          </Button>
          
          <div className="mt-8 border-t border-slate-800/50 pt-4">
            <Button 
              className="w-full text-xs justify-start"
              onClick={handleSave}
              disabled={validationIssues > 0}
            >
              <FileDown size={14} className="mr-2" /> 
              {validationIssues > 0 ? `Fix ${validationIssues} errors` : 'Save Local Log'}
            </Button>
          </div>
        </div>
      </div>

      {/* CENTER PANEL */}
      <div className="flex-1 flex flex-col p-2 border-r border-slate-800 bg-slate-900/50 min-w-[300px]">
        <CoreViewer photoUrl={photoUrl} onDepthSelected={handleDepthSelected} />
      </div>

      {/* RIGHT PANEL */}
      <div className="w-[800px] flex flex-col flex-shrink-0 bg-slate-950 overflow-hidden">
        {/* Full Height: Excel Grid */}
        <div className="flex-1 p-2 overflow-hidden flex flex-col border-b border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 px-1">Log Data Grid</h3>
          <div className="flex-1 overflow-auto rounded-md border border-slate-800 bg-slate-950">
            <StrataGrid layers={layers} onChange={setLayers} />
          </div>
        </div>
      </div>

    </div>
  )
}
