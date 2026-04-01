import { useCallback, useRef, useState } from "react";
import { Upload, Camera, X, Sparkles, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SoilLayer } from "@/lib/as1726";

function compressImage(dataUrl: string, maxSizeMB = 4): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      const MAX_DIM = 1600;
      if (width > MAX_DIM || height > MAX_DIM) {
        const scale = MAX_DIM / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      let quality = 0.8;
      let result = canvas.toDataURL("image/jpeg", quality);
      while (result.length * 0.75 > maxSizeMB * 1024 * 1024 && quality > 0.1) {
        quality -= 0.1;
        result = canvas.toDataURL("image/jpeg", quality);
      }
      resolve({ base64: result.split(",")[1], mimeType: "image/jpeg" });
    };
    img.src = dataUrl;
  });
}

interface PhotoUploadProps {
  photoUrls: string[];
  onPhotosChange: (urls: string[]) => void;
  onAiResult: (updates: Partial<SoilLayer>) => void;
}

export function PhotoUpload({ photoUrls, onPhotosChange, onAiResult }: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingIndex, setAnalyzingIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rawFilesRef = useRef<Map<string, { base64: string; mimeType: string }>>(new Map());

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const newUrls = [...photoUrls, dataUrl];
        onPhotosChange(newUrls);
        rawFilesRef.current.set(dataUrl, { base64: dataUrl.split(",")[1], mimeType: file.type });
      };
      reader.readAsDataURL(file);
    },
    [photoUrls, onPhotosChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      Array.from(e.dataTransfer.files).forEach(handleFile);
    },
    [handleFile]
  );

  const removePhoto = (index: number) => {
    const url = photoUrls[index];
    rawFilesRef.current.delete(url);
    onPhotosChange(photoUrls.filter((_, i) => i !== index));
  };

  const handleAnalyze = async (index: number) => {
    const url = photoUrls[index];
    const raw = rawFilesRef.current.get(url);
    if (!raw) {
      toast.error("Photo data not available");
      return;
    }

    setIsAnalyzing(true);
    setAnalyzingIndex(index);
    try {
      const fullDataUrl = `data:${raw.mimeType};base64,${raw.base64}`;
      const compressed = await compressImage(fullDataUrl);

      const { data, error } = await supabase.functions.invoke("analyze-soil", {
        body: { imageBase64: compressed.base64, mimeType: compressed.mimeType },
      });

      if (error) throw error;
      if (data.error) { toast.error(data.error); return; }

      const updates: Partial<SoilLayer> = {};
      if (data.primarySoilType) updates.primarySoilType = data.primarySoilType;
      if (data.secondaryDescriptors?.length) updates.secondaryDescriptors = data.secondaryDescriptors;
      if (data.plasticity) updates.plasticity = data.plasticity;
      if (data.colour) updates.colour = data.colour;
      if (data.colourBecoming) updates.colourBecoming = data.colourBecoming;
      if (data.minorComponents?.length) updates.minorComponents = data.minorComponents;

      onAiResult(updates);
      toast.success(`AI analysis complete (${data.confidence || "unknown"} confidence)`, {
        description: data.notes || undefined,
      });
    } catch (err) {
      console.error("AI analysis error:", err);
      toast.error("AI analysis failed. Check your API key and try again.");
    } finally {
      setIsAnalyzing(false);
      setAnalyzingIndex(null);
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Soil / Core Photos
      </label>

      {/* Photo grid */}
      {photoUrls.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {photoUrls.map((url, i) => (
            <div key={i} className="relative rounded-lg overflow-hidden border border-border group">
              <img src={url} alt={`Soil sample ${i + 1}`} className="w-full h-28 object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={isAnalyzing}
                  onClick={() => handleAnalyze(i)}
                >
                  {isAnalyzing && analyzingIndex === i ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => removePhoto(i)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          flex flex-col items-center justify-center gap-2 p-6
          border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200
          ${isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/30"
          }
        `}
      >
        <div className="p-2 rounded-full bg-muted">
          {isDragging ? (
            <Upload className="h-5 w-5 text-primary" />
          ) : photoUrls.length > 0 ? (
            <Plus className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Camera className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {photoUrls.length > 0 ? "Add more photos" : "Drop photos or click to browse"}
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          Array.from(e.target.files || []).forEach(handleFile);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
      />
    </div>
  );
}
