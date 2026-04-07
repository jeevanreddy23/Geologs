import { useState, useEffect } from "react";

const STREAK_KEY = "geologs_streak";
const LAST_SESSION_KEY = "geologs_last_session";

interface StreakData {
  count: number;
  lastDate: string;
}

export function useStreak() {
  const [streak, setStreak] = useState(0);
  const [isNewStreak, setIsNewStreak] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    
    try {
      const stored = localStorage.getItem(STREAK_KEY);
      const data: StreakData = stored ? JSON.parse(stored) : { count: 0, lastDate: "" };
      
      if (data.lastDate === today) {
        // Already logged today
        setStreak(data.count);
        return;
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      if (data.lastDate === yesterdayStr) {
        // Consecutive day — increment streak
        const newCount = data.count + 1;
        setStreak(newCount);
        setIsNewStreak(true);
        localStorage.setItem(STREAK_KEY, JSON.stringify({ count: newCount, lastDate: today }));
      } else {
        // Streak broken or first day
        setStreak(1);
        setIsNewStreak(data.count > 0);
        localStorage.setItem(STREAK_KEY, JSON.stringify({ count: 1, lastDate: today }));
      }
    } catch {
      setStreak(1);
      localStorage.setItem(STREAK_KEY, JSON.stringify({ count: 1, lastDate: today }));
    }
  }, []);

  return { streak, isNewStreak };
}
