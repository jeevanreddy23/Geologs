import * as React from 'react'
import { Button } from '@/components/ui/button'
import { FileDown, Loader2, RefreshCw } from 'lucide-react'
import type { LayerInput, Defect } from '@/lib/as1726'
import type { ProjectMeta } from '@/lib/openground-pdf'

interface LivePdfPreviewProps {
  projectName?: string
  holeId?: string
  project?: ProjectMeta
  layers: LayerInput[]
  defects?: Defect[]
}

/**
 * Client-only OpenGround-style PDF live preview.
 *
 * @react-pdf/renderer relies on browser APIs, so the library and the document
 * builder are loaded via dynamic import inside an effect. This keeps them out of
 * the TanStack Start SSR bundle entirely (they only ever run in the browser).
 */
export function LivePdfPreview({
  projectName,
  holeId,
  project,
  layers,
  defects,
}: LivePdfPreviewProps) {
  const [mod, setMod] = React.useState<{
    pdf: typeof import('@react-pdf/renderer')
    doc: typeof import('@/lib/openground-pdf')
  } | null>(null)
  const [url, setUrl] = React.useState<string | null>(null)
  const [building, setBuilding] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Load the heavy deps once, on the client only.
  React.useEffect(() => {
    let active = true
    Promise.all([import('@react-pdf/renderer'), import('@/lib/openground-pdf')])
      .then(([pdf, doc]) => {
        if (active) setMod({ pdf, doc })
      })
      .catch((e) => active && setError(String(e)))
    return () => {
      active = false
    }
  }, [])

  const hasData = layers.some((l) => l.depthFrom != null && l.depthTo != null)

  // (Re)generate the blob whenever inputs change.
  const rebuild = React.useCallback(async () => {
    if (!mod || !hasData) return
    setBuilding(true)
    setError(null)
    try {
      const data = mod.doc.buildLogData({ projectName, holeId, project, layers, defects })
      const element = mod.doc.OpenGroundDocument({ data }) as any
      const blob = await mod.pdf.pdf(element).toBlob()
      const next = URL.createObjectURL(blob)
      setUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return next
      })
    } catch (e) {
      setError(String(e))
    } finally {
      setBuilding(false)
    }
  }, [mod, hasData, projectName, holeId, project, layers, defects])

  React.useEffect(() => {
    rebuild()
  }, [rebuild])

  // Clean up the last blob url on unmount.
  React.useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const download = () => {
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = `openground_log_${holeId || 'BH01'}.pdf`
    a.click()
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-3 py-1.5">
        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          OpenGround Live Preview
          {building && <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />}
        </span>
        <div className="flex gap-1">
          <Button
            variant="secondary"
            size="sm"
            className="h-6 text-[11px]"
            onClick={rebuild}
            disabled={!mod || !hasData || building}
          >
            <RefreshCw className="mr-1 h-3 w-3" /> Refresh
          </Button>
          <Button
            size="sm"
            className="h-6 text-[11px]"
            onClick={download}
            disabled={!url}
          >
            <FileDown className="mr-1 h-3 w-3" /> PDF
          </Button>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden bg-slate-800">
        {error ? (
          <div className="p-4 text-xs text-red-400">{error}</div>
        ) : !hasData ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-xs text-slate-500">
            Add at least one layer with depths to generate the borehole log preview.
          </div>
        ) : !mod || !url ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Rendering preview…
          </div>
        ) : (
          <iframe title="OpenGround PDF preview" src={url} className="h-full w-full border-0" />
        )}
      </div>
    </div>
  )
}
