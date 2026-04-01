import { useCallback, useRef, useState } from "react";
import { Upload, Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PhotoUploadProps {
  photoUrl: string | null;
  onPhotoChange: (url: string | null) => void;
}

export function PhotoUpload({ photoUrl, onPhotoChange }: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => onPhotoChange(e.target?.result as string);
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

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        Soil / Core Photo
      </label>

      {photoUrl ? (
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
            onClick={() => onPhotoChange(null)}
          >
            <X className="h-4 w-4" />
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
