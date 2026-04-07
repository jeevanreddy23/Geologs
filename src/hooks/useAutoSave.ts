import { useEffect, useRef, useState } from "react";

interface AutoSaveResult {
  lastSaved: Date | null;
  isSaving: boolean;
  saveTimeMs: number | null;
}

export function useAutoSave<T>(data: T, key: string, delayMs = 3000): AutoSaveResult {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveTimeMs, setSaveTimeMs] = useState<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const dataRef = useRef(data);
  const changeTimestampRef = useRef<number>(Date.now());

  dataRef.current = data;

  useEffect(() => {
    changeTimestampRef.current = Date.now();

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      setIsSaving(true);
      const start = Date.now();
      try {
        localStorage.setItem(key, JSON.stringify(dataRef.current));
        const elapsed = Date.now() - start;
        setSaveTimeMs(elapsed);
        setLastSaved(new Date());
      } catch {
        // ignore quota errors
      }
      setTimeout(() => setIsSaving(false), 400);
    }, delayMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [data, key, delayMs]);

  return { lastSaved, isSaving, saveTimeMs };
}
