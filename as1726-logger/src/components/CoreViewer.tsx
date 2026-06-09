import * as React from 'react';
import QuickPinchZoom, { make3dTransformValue } from 'react-quick-pinch-zoom';
import { ZoomIn, ZoomOut, Crosshair, MapPin, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

interface CoreViewerProps {
  photoUrl: string | null;
  onDepthSelected?: (depth: number) => void;
}

export function CoreViewer({ photoUrl, onDepthSelected }: CoreViewerProps) {
  const imgRef = React.useRef<HTMLImageElement>(null);
  const zoomRef = React.useRef<QuickPinchZoom>(null);
  
  const [calibrationMode, setCalibrationMode] = React.useState<'none' | 'top' | 'bottom'>('none');
  const [topPoint, setTopPoint] = React.useState<{x: number, y: number, depth: number} | null>(null);
  const [bottomPoint, setBottomPoint] = React.useState<{x: number, y: number, depth: number} | null>(null);
  
  const isCalibrated = topPoint && bottomPoint && topPoint.y !== bottomPoint.y;

  const onUpdate = React.useCallback(({ x, y, scale }: any) => {
    const { current: img } = imgRef;
    if (img) {
      const value = make3dTransformValue({ x, y, scale });
      img.style.setProperty('transform', value);
      
      const overlay = document.getElementById('core-overlay-container');
      if (overlay) {
        overlay.style.setProperty('transform', value);
      }
    }
  }, []);

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imgRef.current) return;
    
    // Get click relative to image native size
    const rect = imgRef.current.getBoundingClientRect();
    
    // x, y relative to the visible rendered size (scaled)
    // we need to map it back to unscaled coordinate
    const scale = rect.width / imgRef.current.naturalWidth;
    
    const clickX = (e.clientX - rect.left) / scale;
    const clickY = (e.clientY - rect.top) / scale;

    if (calibrationMode === 'top') {
      setTopPoint({ x: clickX, y: clickY, depth: 0 }); // Hardcode 0m or prompt? Let's assume start of box is 0m
      setCalibrationMode('none');
      toast.success("Top depth set to 0.00m");
    } else if (calibrationMode === 'bottom') {
      setBottomPoint({ x: clickX, y: clickY, depth: 1 }); // Assume box is 1m long
      setCalibrationMode('none');
      toast.success("Bottom depth set to 1.00m");
    } else if (isCalibrated) {
      // Calculate depth
      const yDeltaPx = bottomPoint.y - topPoint.y;
      const depthDelta = bottomPoint.depth - topPoint.depth;
      const pxPerMeter = yDeltaPx / depthDelta;
      
      const clickDepth = topPoint.depth + ((clickY - topPoint.y) / pxPerMeter);
      
      if (onDepthSelected) {
        onDepthSelected(Number(clickDepth.toFixed(2)));
        toast(`Selected depth: ${clickDepth.toFixed(2)}m`);
      }
    }
  };

  return (
    <Card className="flex flex-col h-full bg-slate-950 border-slate-800 rounded-md overflow-hidden relative shadow-inner">
      <div className="flex items-center justify-between bg-slate-900 p-2 border-b border-slate-800">
        <div className="flex space-x-2">
          <Button 
            variant={calibrationMode === 'top' ? 'default' : 'secondary'} 
            size="sm" 
            className="text-xs"
            onClick={() => setCalibrationMode(calibrationMode === 'top' ? 'none' : 'top')}
          >
            <Crosshair className="w-3 h-3 mr-1" /> Set Top (0m)
          </Button>
          <Button 
            variant={calibrationMode === 'bottom' ? 'default' : 'secondary'} 
            size="sm" 
            className="text-xs"
            onClick={() => setCalibrationMode(calibrationMode === 'bottom' ? 'none' : 'bottom')}
          >
            <Crosshair className="w-3 h-3 mr-1" /> Set Bottom (1m)
          </Button>
        </div>
        <div className="text-xs text-slate-400 font-mono">
          {isCalibrated ? '✅ Scale Calibrated' : '⚠️ Uncalibrated'}
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden bg-black/60">
        {!photoUrl ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <Ruler className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm tracking-wide">Select a corebox image to begin</p>
          </div>
        ) : (
          <QuickPinchZoom onUpdate={onUpdate} ref={zoomRef} maxZoom={5} minZoom={0.5}>
            <div className="relative w-full h-full flex items-center justify-center">
              <img 
                ref={imgRef}
                src={photoUrl} 
                alt="Core tray" 
                onClick={handleImageClick}
                className={`max-w-full max-h-full object-contain transform-gpu origin-top-left ${calibrationMode !== 'none' || isCalibrated ? 'cursor-crosshair' : 'cursor-grab'}`}
              />
              
              {/* Overlays Container */}
              <div id="core-overlay-container" className="absolute top-0 left-0 w-full h-full pointer-events-none transform-gpu origin-top-left">
                {topPoint && (
                  <div className="absolute w-full border-t-2 border-dashed border-cyan-500" style={{ top: `${topPoint.y}px` }}>
                     <span className="absolute left-1 bg-cyan-900 text-cyan-100 text-[10px] px-1 rounded-sm -mt-2.5">0.0m</span>
                  </div>
                )}
                {bottomPoint && (
                  <div className="absolute w-full border-t-2 border-dashed border-emerald-500" style={{ top: `${bottomPoint.y}px` }}>
                     <span className="absolute left-1 bg-emerald-900 text-emerald-100 text-[10px] px-1 rounded-sm -mt-2.5">1.0m</span>
                  </div>
                )}
              </div>
            </div>
          </QuickPinchZoom>
        )}
      </div>
    </Card>
  );
}
