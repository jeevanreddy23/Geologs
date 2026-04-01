import { useCallback, useRef, useState } from "react";
import { Upload, Camera, X, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { BoreholeEntry } from "@/lib/as1726";

interface PhotoUploadProps {
  photoUrl: string | null;
  onPhotoChange: (url: string | null) => void;
  onAiResult: (updates: Partial<BoreholeEntry>) => void;
}

export function PhotoUpload({ photoUrl, onPhotoChange, onAiResult }: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rawFileRef = useRef<{ base64: string; mimeType: string } | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        onPhotoChange(dataUrl);

        // Store raw base64 for AI analysis
        const base64 = dataUrl.split(",")[1];
        rawFileRef.current = { base64, mimeType: file.type };
      };
      reader.readAsDataURL(file);
    },
    [onPhotoChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleAnalyze = async () => {
    if (!rawFileRef.current) {
      toast.error("Upload a photo first");
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-soil", {
        body: {
          imageBase64: rawFileRef.current.base64,
          mimeType: rawFileRef.current.mimeType,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      // Map AI response to form fields
      const updates: Partial<BoreholeEntry> = {};
      if (data.primarySoilType) updates.primarySoilType = data.primarySoilType;
      if (data.secondaryDescriptors?.length) updates.secondaryDescriptors = data.secondaryDescriptors;
      if (data.plasticity) updates.plasticity = data.plasticity;
      if (data.colour) updates.colour = data.colour;
      if (data.colourBecoming) updates.colourBecoming = data.colourBecoming;
      if (data.minorComponents?.length) updates.minorComponents = data.minorComponents;

      onAiResult(updates);

      const confidence = data.confidence || "unknown";
      toast.success(`AI analysis complete (${confidence} confidence)`, {
        description: data.notes || undefined,
      });
    } catch (err) {
      console.error("AI analysis error:", err);
      toast.error("AI analysis failed. Check your API key and try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        Soil / Core Photo
      </label>

      {photoUrl ? (
        <div className="space-y-2">
          <div className="relative rounded-lg overflow-hidden border border-border">
            <img
              src={photoUrl}
              alt="Soil sample"
              className="w-full h-48 object-cover"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7"
              onClick={() => {
                onPhotoChange(null);
                rawFileRef.current = null;
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/80 font-medium"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analysing with Claude…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Analyse with AI
              </>
            )}
          </Button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            flex flex-col items-center justify-center gap-3 p-8
            border-2 border-dashed rounded-lg cursor-pointer
            transition-all duration-200
            ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/30"
            }
          `}
        >
          <div className="p-3 rounded-full bg-muted">
            {isDragging ? (
              <Upload className="h-6 w-6 text-primary" />
            ) : (
              <Camera className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              Drop photo here or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Soil samples, core trays, site photos
            </p>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
