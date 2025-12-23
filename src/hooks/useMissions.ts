import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Mission {
  id: string;
  mission_id: string;
  mission_title: string;
  mission_description: string | null;
  target_value: number;
  current_progress: number;
  reward_xp: number;
  completed: boolean;
  completed_at: string | null;
}

const DAILY_MISSIONS = [
  {
    mission_id: "win_games",
    mission_title: "მოიგე 3 თამაში",
    mission_description: "დღეს მოიგე 3 თამაში",
    target_value: 3,
    reward_xp: 50,
  },
  {
    mission_id: "answer_correct",
    mission_title: "სწორი პასუხები",
    mission_description: "გასცე 10 სწორი პასუხი",
    target_value: 10,
    reward_xp: 30,
  },
  {
    mission_id: "play_categories",
    mission_title: "კატეგორიები",
    mission_description: "ითამაშე 2 სხვადასხვა კატეგორიაში",
    target_value: 2,
    reward_xp: 40,
  },
];

export function useMissions() {
  const { user, profile, updateProfile } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMissions = useCallback(async () => {
    if (!user) {
      setMissions([]);
      setLoading(false);
      return;
    }

    try {
      const today = new Date().toISOString().split("T")[0];

      // Get today's missions
      const { data, error } = await supabase
        .from("user_missions")
        .select("*")
        .eq("user_id", user.id)
        .eq("mission_date", today);

      if (error) throw error;

      if (data && data.length > 0) {
        setMissions(data);
      } else {
        // Create daily missions for today
        const missionsToCreate = DAILY_MISSIONS.map((m) => ({
          user_id: user.id,
          ...m,
          mission_date: today,
        }));

        const { data: newMissions, error: insertError } = await supabase
          .from("user_missions")
          .insert(missionsToCreate)
          .select();

        if (insertError) throw insertError;
        setMissions(newMissions || []);
      }
    } catch (error) {
      console.error("Error fetching missions:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  const updateMissionProgress = async (
    missionId: string,
    progressIncrement: number
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const mission = missions.find((m) => m.mission_id === missionId);
      if (!mission || mission.completed) return false;

      const newProgress = Math.min(
        mission.current_progress + progressIncrement,
        mission.target_value
      );
      const isCompleted = newProgress >= mission.target_value;

      const updates: Record<string, unknown> = {
        current_progress: newProgress,
      };

      if (isCompleted) {
        updates.completed = true;
        updates.completed_at = new Date().toISOString();
      }

      await supabase
        .from("user_missions")
        .update(updates)
        .eq("id", mission.id);

      // Award XP if completed
      if (isCompleted && profile) {
        await updateProfile({
          total_points: (profile.total_points || 0) + mission.reward_xp,
        });

        // Record reward
        await supabase.from("user_rewards").insert({
          user_id: user.id,
          reward_type: "mission",
          reward_value: {
            mission_id: missionId,
            xp_earned: mission.reward_xp,
          },
        });
      }

      await fetchMissions();
      return true;
    } catch (error) {
      console.error("Error updating mission progress:", error);
      return false;
    }
  };

  const completedCount = missions.filter((m) => m.completed).length;
  const totalCount = missions.length;

  return {
    missions,
    loading,
    updateMissionProgress,
    refreshMissions: fetchMissions,
    completedCount,
    totalCount,
  };
}
