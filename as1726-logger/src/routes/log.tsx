import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  type LayerInput,
  type Defect,
  type DefectType,
  blocksSave,
  defectLabel,
  findLayerIndexAtDepth,
  makeDefect,
} from '@/lib/as1726'
import { StrataGrid } from '@/components/StrataGrid'
import { CoreViewer } from '@/components/CoreViewer'
import { LivePdfPreview } from '@/components/LivePdfPreview'
import {
  Upload,
  Save,
  FolderOpen,
  Map,
  Plus,
  Box as BoxIcon,
  Eye,
  EyeOff,
} from 'lucide-react'

export const Route = createFileRoute('/log')({
  component: LogEditor,
})

interface Corebox {
  id: string
  label: string
  depthFrom: number
  depthTo: number
  photoUrl: string | null
}

const STORAGE_KEY = 'borehole-log-v2'

function newBox(prev?: Corebox): Corebox {
  const from = prev ? prev.depthTo : 0
  const to = from + 1
  return {
    id: Math.random().toString(36).slice(2, 9),
    label: 'Box ' + from.toFixed(1) + '-' + to.toFixed(1) + 'm',
    depthFrom: from,
    depthTo: to,
    photoUrl: null,
  }
}

function LogEditor() {
  const [projectName, setProjectName] = React.useState('')
  const [holeId, setHoleId] = React.useState('')
  const [layers, setLayers] = React.useState<LayerInput[]>([])
  const [defects, setDefects] = React.useState<Defect[]>([])
  const [boxes, setBoxes] = React.useState<Corebox[]>([newBox()])
  const [activeBoxId, setActiveBoxId] = React.useState<string>('')
  const [showPreview, setShowPreview] = React.useState(true)

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const p = JSON.parse(saved)
        if (p.projectName) setProjectName(p.projectName)
        if (p.holeId) setHoleId(p.holeId)
        if (Array.isArray(p.layers)) setLayers(p.layers)
        if (Array.isArray(p.defects)) setDefects(p.defects)
        if (Array.isArray(p.boxes) && p.boxes.length) {
          setBoxes(p.boxes.map((b: Corebox) => ({ ...b, photoUrl: null })))
        }
      }
    } catch (e) {
      console.error('Failed to parse saved log', e)
    }
  }, [])

  React.useEffect(() => {
    if (!activeBoxId && boxes.length) setActiveBoxId(boxes[0].id)
  }, [boxes, activeBoxId])

  const activeBox = boxes.find((b) => b.id === activeBoxId) ?? boxes[0]

  const handleSave = () => {
    const serialBoxes = boxes.map(({ photoUrl, ...rest }) => rest)
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ projectName, holeId, layers, defects, boxes: serialBoxes }),
    )
    toast.success('Borehole log saved')
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && activeBox) {
      const objectUrl = URL.createObjectURL(file)
      setBoxes((prev) =>
        prev.map((b) => (b.id === activeBox.id ? { ...b, photoUrl: objectUrl } : b)),
      )
    }
  }

  const updateBox = (id: string, patch: Partial<Corebox>) =>
    setBoxes((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)))

  const addBox = () =>
    setBoxes((prev) => {
      const nb = newBox(prev[prev.length - 1])
      setActiveBoxId(nb.id)
      return [...prev, nb]
    })

  const handleAddDefect = (depth: number, type: DefectType, angle: number | null) => {
    const def = makeDefect(depth, type, angle)
    setDefects((prev) => [...prev, def].sort((a, b) => a.depth - b.depth))
    setLayers((prev) => {
      const idx = findLayerIndexAtDepth(prev, depth)
      if (idx === -1) {
        toast.message(
          'No layer spans ' + depth.toFixed(2) + 'm - logged to the discontinuity column only.',
        )
        return prev
      }
      const next = [...prev]
      const layer = { ...next[idx] }
      const note = defectLabel(def)
      layer.defects = layer.defects ? layer.defects + '\n' + note : note
      next[idx] = layer
      return next
    })
  }

  const validation = blocksSave(layers)
  const validationIssues = validation.ok ? 0 : validation.issues.length

  const boxDefects = activeBox
    ? defects.filter((d) => d.depth >= activeBox.depthFrom && d.depth <= activeBox.depthTo)
    : []

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-950 font-sans text-slate-300">
      {/* LEFT PANEL */}
      <div className="z-30 flex w-72 flex-shrink-0 flex-col border-r border-slate-800 bg-slate-950">
        <div className="border-b border-slate-800/50 p-4">
          <h2 className="mb-4 flex items-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <FolderOpen size={12} className="mr-2" /> Project
          </h2>
          <div className="space-y-3">
            <div>
              <Label className="text-[10px] uppercase text-slate-400">Project Name</Label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="h-8 border-slate-700 bg-slate-900 text-xs"
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase text-slate-400">Hole ID</Label>
              <Input
                value={holeId}
                onChange={(e) => setHoleId(e.target.value)}
                className="h-8 border-slate-700 bg-slate-900 text-xs"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <Map size={12} className="mr-2" /> Coreboxes
            </h2>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={addBox} aria-label="Add corebox">
              <Plus size={14} />
            </Button>
          </div>

          <div className="space-y-2">
            {boxes.map((b) => {
              const active = b.id === activeBox?.id
              return (
                <button
                  key={b.id}
                  onClick={() => setActiveBoxId(b.id)}
                  className={
                    'w-full rounded-md border p-2 text-left transition-colors ' +
                    (active
                      ? 'border-cyan-600 bg-cyan-950/40'
                      : 'border-slate-800 bg-slate-900 hover:bg-slate-800')
                  }
                >
                  <div className="flex items-center text-[11px] font-semibold text-slate-200">
                    <BoxIcon size={12} className="mr-1.5" /> {b.label}
                    {b.photoUrl && <span className="ml-auto text-[9px] text-emerald-400">img</span>}
                  </div>
                  <div className="mt-1 flex gap-1">
                    <Input
                      type="number"
                      step="0.1"
                      value={b.depthFrom}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateBox(b.id, { depthFrom: parseFloat(e.target.value) || 0 })}
                      className="h-6 border-slate-700 bg-slate-950 text-[11px]"
                    />
                    <Input
                      type="number"
                      step="0.1"
                      value={b.depthTo}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateBox(b.id, { depthTo: parseFloat(e.target.value) || 0 })}
                      className="h-6 border-slate-700 bg-slate-950 text-[11px]"
                    />
                  </div>
                </button>
              )
            })}
          </div>

          <input
            type="file"
            id="corebox-upload"
            className="hidden"
            accept="image/*"
            onChange={handleFileUpload}
          />
          <Button
            variant="outline"
            className="mt-4 w-full justify-start border-slate-700 bg-slate-900 text-xs hover:bg-slate-800"
            disabled={!activeBox}
            onClick={() => document.getElementById('corebox-upload')?.click()}
          >
            <Upload size={14} className="mr-2" /> Upload Photo to {activeBox?.label ?? 'box'}
          </Button>
        </div>

        <div className="border-t border-slate-800/50 p-4">
          <Button
            className="w-full justify-start text-xs"
            onClick={handleSave}
            disabled={validationIssues > 0}
          >
            <Save size={14} className="mr-2" />
            {validationIssues > 0 ? 'Fix ' + validationIssues + ' issue(s)' : 'Save Log'}
          </Button>
        </div>
      </div>

      {/* CENTER PANEL */}
      <div className="flex min-w-[300px] flex-1 flex-col border-r border-slate-800 bg-slate-900/50 p-2">
        <CoreViewer
          photoUrl={activeBox?.photoUrl ?? null}
          topDepth={activeBox?.depthFrom ?? 0}
          bottomDepth={activeBox?.depthTo ?? 1}
          defects={boxDefects}
          onAddDefect={handleAddDefect}
        />
      </div>

      {/* RIGHT PANEL */}
      <div className="flex w-[820px] flex-shrink-0 flex-col overflow-hidden bg-slate-950">
        <div className="flex min-h-0 flex-1 flex-col border-b border-slate-800 p-2">
          <div className="mb-2 flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Log Data Grid
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[11px] text-slate-400"
              onClick={() => setShowPreview((s) => !s)}
            >
              {showPreview ? <EyeOff className="mr-1 h-3 w-3" /> : <Eye className="mr-1 h-3 w-3" />}
              {showPreview ? 'Hide preview' : 'Show preview'}
            </Button>
          </div>
          <div className="flex-1 overflow-auto rounded-md border border-slate-800 bg-slate-950">
            <StrataGrid layers={layers} onChange={setLayers} />
          </div>
        </div>

        {showPreview && (
          <div className="h-[46%] min-h-[260px] flex-shrink-0 overflow-hidden border-t border-slate-800">
            <LivePdfPreview
              projectName={projectName}
              holeId={holeId}
              layers={layers}
              defects={defects}
            />
          </div>
        )}
      </div>
    </div>
  )
}
