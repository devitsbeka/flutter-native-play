import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LevelPosition {
  id: number;
  x: number;
  y: number;
}

// Default positions matching the winding S-curve path on the island
const DEFAULT_POSITIONS: LevelPosition[] = [
  { id: 1, x: 22, y: 90 },
  { id: 2, x: 45, y: 86 },
  { id: 3, x: 68, y: 80 },
  { id: 4, x: 78, y: 70 },
  { id: 5, x: 65, y: 60 },
  { id: 6, x: 42, y: 54 },
  { id: 7, x: 22, y: 48 },
  { id: 8, x: 28, y: 38 },
  { id: 9, x: 50, y: 32 },
  { id: 10, x: 72, y: 26 },
  { id: 11, x: 75, y: 16 },
  { id: 12, x: 55, y: 10 },
  { id: 13, x: 35, y: 5 },
];

export function useLevelPositions() {
  const [positions, setPositions] = useState<LevelPosition[]>(DEFAULT_POSITIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPositions() {
      try {
        const { data, error } = await supabase
          .from("level_positions")
          .select("level_id, x, y")
          .order("level_id");

        if (error) {
          console.error("Error fetching level positions:", error);
          return;
        }

        if (data && data.length > 0) {
          // Merge database positions with defaults
          const dbPositions = data.map((row) => ({
            id: row.level_id,
            x: Number(row.x),
            y: Number(row.y),
          }));

          // Use database positions where available, defaults for the rest
          const mergedPositions = DEFAULT_POSITIONS.map((defaultPos) => {
            const dbPos = dbPositions.find((p) => p.id === defaultPos.id);
            return dbPos || defaultPos;
          });

          setPositions(mergedPositions);
        }
      } catch (err) {
        console.error("Error in useLevelPositions:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchPositions();
  }, []);

  return { positions, loading, defaultPositions: DEFAULT_POSITIONS };
}

export async function saveLevelPositions(positions: LevelPosition[]) {
  const upsertData = positions.map((pos) => ({
    level_id: pos.id,
    x: pos.x,
    y: pos.y,
  }));

  const { error } = await supabase
    .from("level_positions")
    .upsert(upsertData, { onConflict: "level_id" });

  if (error) {
    console.error("Error saving level positions:", error);
    throw error;
  }

  return true;
}
