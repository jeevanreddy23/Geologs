import { useState, useEffect, useRef } from "react";

export function useSessionTimer() {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const formatted = `${mins}:${secs.toString().padStart(2, "0")}`;

  return { seconds, formatted };
}
