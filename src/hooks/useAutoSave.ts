import { useEffect, useRef, useState } from "react";

export function useAutoSave<T>(data: T, key: string, delayMs = 3000) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const dataRef = useRef(data);

  dataRef.current = data;

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      setIsSaving(true);
      try {
        localStorage.setItem(key, JSON.stringify(dataRef.current));
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

  return { lastSaved, isSaving };
}
