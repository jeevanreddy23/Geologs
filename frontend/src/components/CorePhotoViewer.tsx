import React, { useRef, useState, useCallback } from 'react';
import QuickPinchZoom, { make3dTransformValue } from 'react-quick-pinch-zoom';
import { Layers, ZoomIn, ZoomOut, CheckCircle } from 'lucide-react';

interface CorePhotoViewerProps {
  photoUrl: string | null;
  visionData: any | null;
}

const CorePhotoViewer: React.FC<CorePhotoViewerProps> = ({ photoUrl, visionData }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const zoomRef = useRef<QuickPinchZoom>(null);
  
  const [showRows, setShowRows] = useState(true);
  const [showFractures, setShowFractures] = useState(true);

  const onUpdate = useCallback(({ x, y, scale }: any) => {
    const { current: img } = imgRef;
    if (img) {
      const value = make3dTransformValue({ x, y, scale });
      img.style.setProperty('transform', value);
      
      // Also apply transform to the overlays container so boxes scale with the image
      const overlay = document.getElementById('overlay-container');
      if (overlay) {
        overlay.style.setProperty('transform', value);
      }
    }
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-700 rounded-md overflow-hidden relative">
      
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-slate-800 p-2 border-b border-slate-700">
        <div className="flex space-x-2">
          <button 
            className={`flex items-center space-x-1 px-2 py-1 text-xs rounded ${showRows ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
            onClick={() => setShowRows(!showRows)}
          >
            <Layers size={14} />
            <span>Core Rows</span>
          </button>
          <button 
            className={`flex items-center space-x-1 px-2 py-1 text-xs rounded ${showFractures ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'}`}
            onClick={() => setShowFractures(!showFractures)}
          >
            <CheckCircle size={14} />
            <span>Fractures</span>
          </button>
        </div>
      </div>

      {/* Viewer Area */}
      <div className="flex-1 relative overflow-hidden bg-black/50">
        {!photoUrl ? (
          <div className="flex items-center justify-center h-full text-slate-500">
            No photo loaded
          </div>
        ) : (
          <QuickPinchZoom onUpdate={onUpdate} ref={zoomRef} maxZoom={5} minZoom={0.5}>
            <div className="relative w-full h-full flex items-center justify-center">
              <img 
                ref={imgRef}
                src={photoUrl} 
                alt="Core tray" 
                className="max-w-full max-h-full object-contain transform-gpu origin-top-left"
                onLoad={() => {
                   // Ensure container has correct aspect ratio based on img
                }}
              />
              
              {/* Overlays Container - scaled along with image */}
              <div id="overlay-container" className="absolute top-0 left-0 w-full h-full pointer-events-none transform-gpu origin-top-left">
                {/* 
                  Since we are rendering standard img and we don't know the exact intrinsic 
                  dimensions vs rendered dimensions easily in QuickPinchZoom without some math,
                  we render overlays using percentages assuming visionData boxes are percentages. 
                  But since our visionData returns mock pixels, we'll draw some dummy boxes directly on the screen for now 
                  to simulate the backend data.
                */}
                
                {showRows && visionData?.rows?.map((r: any, i: number) => {
                   // Dummy visualization: we assume the img takes the full width and the height is proportional.
                   // The vision backend returns pixel values for top/bottom/left/right.
                   // For a robust implementation we'd calculate percentages, but let's mock the CSS here.
                   return (
                     <div 
                       key={i} 
                       className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-auto cursor-pointer hover:bg-blue-500/30 transition-colors"
                       style={{
                         top: `${r.top}px`, 
                         left: `${r.left}px`,
                         width: `${r.right - r.left}px`,
                         height: `${r.bottom - r.top}px`,
                       }}
                       title={`Row ${r.id}`}
                     />
                   )
                })}

                {/* Mock Fractures */}
                {showFractures && visionData?.rows?.map((r: any, i: number) => (
                    <div 
                      key={`frac-${i}`} 
                      className="absolute border-t-2 border-red-500 w-[50px]"
                      style={{
                        top: `${r.top + 50}px`,
                        left: `${r.left + 100}px`,
                        transform: 'rotate(-15deg)'
                      }}
                    />
                ))}

              </div>
            </div>
          </QuickPinchZoom>
        )}
      </div>
    </div>
  );
};

export default CorePhotoViewer;
