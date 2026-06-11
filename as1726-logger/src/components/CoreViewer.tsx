import * as React from 'react'
import QuickPinchZoom, { make3dTransformValue } from 'react-quick-pinch-zoom'
import { Crosshair, Ruler, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { DEFECT_TYPES, type DefectType, type Defect } from '@/lib/as1726'

interface CoreViewerProps {
  photoUrl: string | null
  topDepth: number
  bottomDepth: number
  defects?: Defect[]
  onAddDefect?: (depth: number, type: DefectType, angle: number | null) => void
}

type CalMode = 'none' | 'top' | 'bottom'

interface PendingDefect {
  frac: number
  depth: number
  screenX: number
  screenY: number
}

export function CoreViewer({
  photoUrl,
  topDepth,
  bottomDepth,
  defects = [],
  onAddDefect,
}: CoreViewerProps) {
  const imgRef = React.useRef<HTMLImageElement>(null)
  const wrapRef = React.useRef<HTMLDivElement>(null)

  const [calMode, setCalMode] = React.useState<CalMode>('none')
  const [topFrac, setTopFrac] = React.useState<number | null>(null)
  const [bottomFrac, setBottomFrac] = React.useState<number | null>(null)
  const [pending, setPending] = React.useState<PendingDefect | null>(null)
  const [angle, setAngle] = React.useState<string>('')

  const span = bottomDepth - topDepth
  const isCalibrated =
    topFrac !== null && bottomFrac !== null && bottomFrac !== topFrac && span > 0

  React.useEffect(() => {
    setTopFrac(null)
    setBottomFrac(null)
    setCalMode('none')
    setPending(null)
  }, [photoUrl])

  const onUpdate = React.useCallback(
    ({ x, y, scale }: { x: number; y: number; scale: number }) => {
      const el = wrapRef.current
      if (el) el.style.setProperty('transform', make3dTransformValue({ x, y, scale }))
    },
    [],
  )

  const fracToDepth = (frac: number) =>
    topDepth + ((frac - (topFrac ?? 0)) / ((bottomFrac ?? 1) - (topFrac ?? 0))) * span

  const depthToFrac = (depth: number) =>
    (topFrac ?? 0) + ((depth - topDepth) / span) * ((bottomFrac ?? 1) - (topFrac ?? 0))

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imgRef.current) return
    const rect = imgRef.current.getBoundingClientRect()
    const frac = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))

    if (calMode === 'top') {
      setTopFrac(frac)
      setCalMode('none')
      toast.success('Top of core set at ' + topDepth.toFixed(2) + ' m')
      return
    }
    if (calMode === 'bottom') {
      setBottomFrac(frac)
      setCalMode('none')
      toast.success('Bottom of core set at ' + bottomDepth.toFixed(2) + ' m')
      return
    }
    if (isCalibrated) {
      const depth = Number(fracToDepth(frac).toFixed(2))
      setAngle('')
      setPending({ frac, depth, screenX: e.clientX, screenY: e.clientY })
    } else {
      toast.error('Calibrate the scale first: set the top and bottom of the core.')
    }
  }

  const confirmDefect = (type: DefectType) => {
    if (!pending) return
    const parsed = angle.trim() === '' ? null : Number(angle)
    const ang = parsed !== null && Number.isFinite(parsed) ? parsed : null
    onAddDefect?.(pending.depth, type, ang)
    toast.success(type + ' added at ' + pending.depth.toFixed(2) + ' m')
    setPending(null)
  }

  const ticks: { frac: number; depth: number; major: boolean }[] = []
  if (isCalibrated) {
    const start = Math.ceil(Math.min(topDepth, bottomDepth) * 10) / 10
    const end = Math.floor(Math.max(topDepth, bottomDepth) * 10) / 10
    for (let d = start; d <= end + 1e-6; d = Math.round((d + 0.1) * 10) / 10) {
      const frac = depthToFrac(d)
      if (frac < -0.001 || frac > 1.001) continue
      const major = Math.abs(d * 2 - Math.round(d * 2)) < 1e-6
      ticks.push({ frac, depth: d, major })
    }
  }

  const tickBar = (major: boolean) =>
    (major ? 'w-4 bg-amber-300' : 'w-2 bg-amber-300/60') + ' h-px'
  const imgCursor =
    calMode !== 'none' || isCalibrated ? 'cursor-crosshair' : 'cursor-grab'

  return (
    <Card className="relative flex h-full flex-col overflow-hidden rounded-md border-slate-800 bg-slate-950 shadow-inner">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 p-2">
        <div className="flex items-center gap-2">
          <Button
            variant={calMode === 'top' ? 'default' : 'secondary'}
            size="sm"
            className="text-xs"
            disabled={!photoUrl}
            onClick={() => setCalMode(calMode === 'top' ? 'none' : 'top')}
          >
            <Crosshair className="mr-1 h-3 w-3" /> Set Top ({topDepth.toFixed(2)}m)
          </Button>
          <Button
            variant={calMode === 'bottom' ? 'default' : 'secondary'}
            size="sm"
            className="text-xs"
            disabled={!photoUrl}
            onClick={() => setCalMode(calMode === 'bottom' ? 'none' : 'bottom')}
          >
            <Crosshair className="mr-1 h-3 w-3" /> Set Bottom ({bottomDepth.toFixed(2)}m)
          </Button>
        </div>
        <div className="font-mono text-xs text-slate-400">
          {isCalibrated ? 'Scale calibrated' : 'Uncalibrated'}
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden bg-black/60">
        {!photoUrl ? (
          <div className="flex h-full flex-col items-center justify-center text-slate-500">
            <Ruler className="mb-2 h-12 w-12 opacity-50" />
            <p className="text-sm tracking-wide">Select a corebox image to begin</p>
          </div>
        ) : (
          <QuickPinchZoom onUpdate={onUpdate} maxZoom={6} minZoom={0.5}>
            <div ref={wrapRef} className="relative inline-block origin-top-left transform-gpu">
              <img
                ref={imgRef}
                src={photoUrl}
                alt="Core tray"
                onClick={handleImageClick}
                className={'block max-h-[78vh] max-w-full select-none object-contain ' + imgCursor}
              />

              <div className="pointer-events-none absolute inset-0">
                {ticks.map((t) => (
                  <div
                    key={t.depth}
                    className="absolute left-0 flex items-center"
                    style={{ top: t.frac * 100 + '%' }}
                  >
                    <div className={tickBar(t.major)} />
                    {t.major && (
                      <span className="ml-0.5 rounded-sm bg-amber-900/80 px-1 text-[9px] leading-tight text-amber-100">
                        {t.depth.toFixed(1)}
                      </span>
                    )}
                  </div>
                ))}

                {topFrac !== null && (
                  <div
                    className="absolute w-full border-t-2 border-dashed border-cyan-500"
                    style={{ top: topFrac * 100 + '%' }}
                  >
                    <span className="absolute left-1 -mt-2.5 rounded-sm bg-cyan-900 px-1 text-[10px] text-cyan-100">
                      {topDepth.toFixed(2)}m
                    </span>
                  </div>
                )}
                {bottomFrac !== null && (
                  <div
                    className="absolute w-full border-t-2 border-dashed border-emerald-500"
                    style={{ top: bottomFrac * 100 + '%' }}
                  >
                    <span className="absolute left-1 -mt-2.5 rounded-sm bg-emerald-900 px-1 text-[10px] text-emerald-100">
                      {bottomDepth.toFixed(2)}m
                    </span>
                  </div>
                )}

                {isCalibrated &&
                  defects.map((d) => {
                    const frac = depthToFrac(d.depth)
                    if (frac < -0.001 || frac > 1.001) return null
                    return (
                      <div
                        key={d.id}
                        className="absolute w-full border-t border-rose-500/80"
                        style={{ top: frac * 100 + '%' }}
                      >
                        <span className="absolute right-1 -mt-2.5 rounded-sm bg-rose-900/90 px-1 text-[9px] text-rose-100">
                          {d.type} {d.angle != null ? d.angle + '°' : ''}
                        </span>
                      </div>
                    )
                  })}
              </div>
            </div>
          </QuickPinchZoom>
        )}
      </div>

      {pending && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPending(null)} aria-hidden />
          <div
            className="fixed z-50 w-52 rounded-md border border-slate-700 bg-slate-900 p-2 shadow-xl"
            style={{
              left: Math.min(pending.screenX + 6, window.innerWidth - 220),
              top: Math.min(pending.screenY + 6, window.innerHeight - 220),
            }}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-200">
                Mark defect @ {pending.depth.toFixed(2)} m
              </span>
              <button
                className="text-slate-500 hover:text-slate-300"
                onClick={() => setPending(null)}
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <label className="mb-1 block text-[10px] uppercase text-slate-400">
              Apparent dip (deg)
            </label>
            <Input
              type="number"
              value={angle}
              placeholder="e.g. 35"
              onChange={(e) => setAngle(e.target.value)}
              className="mb-2 h-7 bg-slate-950 text-xs"
            />
            <div className="grid grid-cols-2 gap-1">
              {DEFECT_TYPES.map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant="secondary"
                  className="h-7 justify-start text-[11px] capitalize"
                  onClick={() => confirmDefect(t)}
                >
                  <Check className="mr-1 h-3 w-3" /> {t}
                </Button>
              ))}
            </div>
          </div>
        </>
      )}
    </Card>
  )
}
