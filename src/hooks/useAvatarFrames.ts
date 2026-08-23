import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/lib/toast";
import { t as tStandalone } from "@/contexts/LanguageContext";

export interface AvatarFrame {
  id: string;
  name: string;
  description: string;
  price: number;
  gradient: string;
  borderStyle: string;
  animationClass?: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  vipOnly?: boolean;
}

export const AVATAR_FRAMES: AvatarFrame[] = [
  {
    id: "galaxy",
    name: "Galaxy",
    get description() { return tStandalone("extra.frameDescGalaxy"); },
    price: 15,
    gradient: "from-indigo-500 via-purple-500 to-pink-500",
    borderStyle: "border-4 border-purple-400",
    animationClass: "animate-pulse",
    rarity: "rare",
  },
  {
    id: "fire",
    name: "Fire",
    get description() { return tStandalone("extra.frameDescFire"); },
    price: 25,
    gradient: "from-orange-500 via-red-500 to-yellow-500",
    borderStyle: "border-4 border-orange-400",
    animationClass: "animate-pulse",
    rarity: "epic",
  },
  {
    id: "ice",
    name: "Ice",
    get description() { return tStandalone("extra.frameDescIce"); },
    price: 15,
    gradient: "from-cyan-400 via-blue-500 to-indigo-500",
    borderStyle: "border-4 border-cyan-400",
    rarity: "rare",
  },
  {
    id: "golden",
    name: "Golden Crown",
    get description() { return tStandalone("extra.frameDescGolden"); },
    price: 50,
    gradient: "from-yellow-400 via-amber-500 to-orange-500",
    borderStyle: "border-4 border-yellow-400",
    animationClass: "animate-pulse",
    rarity: "legendary",
  },
  {
    id: "neon",
    name: "Neon Glow",
    get description() { return tStandalone("extra.frameDescNeon"); },
    price: 25,
    gradient: "from-green-400 via-cyan-500 to-blue-500",
    borderStyle: "border-4 border-green-400",
    animationClass: "animate-pulse",
    rarity: "epic",
  },
  {
    id: "rainbow",
    name: "Rainbow",
    get description() { return tStandalone("extra.frameDescRainbow"); },
    price: 40,
    gradient: "from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500",
    borderStyle: "border-4 border-pink-400",
    rarity: "legendary",
  },
  // VIP-Exclusive Frames
  {
    id: "vip-crown",
    name: "Royal Crown",
    get description() { return tStandalone("extra.frameDescVipCrown"); },
    price: 0,
    gradient: "from-yellow-300 via-amber-400 to-yellow-600",
    borderStyle: "border-4 border-yellow-300",
    animationClass: "animate-pulse",
    rarity: "legendary",
    vipOnly: true,
  },
  {
    id: "vip-diamond",
    name: "Diamond Elite",
    get description() { return tStandalone("extra.frameDescVipDiamond"); },
    price: 0,
    gradient: "from-pink-400 via-purple-500 to-indigo-500",
    borderStyle: "border-4 border-pink-300",
    animationClass: "animate-pulse",
    rarity: "legendary",
    vipOnly: true,
  },
  {
    id: "vip-royal",
    name: "Royal Flame",
    get description() { return tStandalone("extra.frameDescVipRoyal"); },
    price: 0,
    gradient: "from-red-500 via-orange-500 to-yellow-400",
    borderStyle: "border-4 border-red-400",
    animationClass: "animate-pulse",
    rarity: "epic",
    vipOnly: true,
  },
];

export function useAvatarFrames() {
  const { user } = useAuth();
  const [unlockedFrames, setUnlockedFrames] = useState<Set<string>>(new Set());
  const [equippedFrame, setEquippedFrame] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user's unlocked frames
  useEffect(() => {
    if (!user) {
      setUnlockedFrames(new Set());
      setEquippedFrame(null);
      setLoading(false);
      return;
    }

    const fetchFrames = async () => {
      try {
        const { data, error } = await supabase
          .from("user_avatar_frames")
          .select("*")
          .eq("user_id", user.id);

        if (error) throw error;

        const frames = new Set(data?.map((f) => f.frame_id) || []);
        setUnlockedFrames(frames);

        const equipped = data?.find((f) => f.is_equipped);
        setEquippedFrame(equipped?.frame_id || null);
      } catch (error) {
        console.error("Error fetching avatar frames:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFrames();
  }, [user]);

  const unlockFrame = async (frameId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase.from("user_avatar_frames").insert({
        user_id: user.id,
        frame_id: frameId,
      });

      if (error) throw error;

      setUnlockedFrames((prev) => new Set([...prev, frameId]));
      return true;
    } catch (error) {
      console.error("Error unlocking frame:", error);
      toast.error(tStandalone("extra.frameUnlockFailed"));
      return false;
    }
  };

  const equipFrame = async (frameId: string | null): Promise<boolean> => {
    if (!user) return false;

    try {
      // First, unequip all frames
      await supabase
        .from("user_avatar_frames")
        .update({ is_equipped: false })
        .eq("user_id", user.id);

      // If frameId is provided, equip that frame
      if (frameId) {
        const { error } = await supabase
          .from("user_avatar_frames")
          .update({ is_equipped: true })
          .eq("user_id", user.id)
          .eq("frame_id", frameId);

        if (error) throw error;
      }

      setEquippedFrame(frameId);
      toast.success(frameId ? tStandalone("extra.frameActivated") : tStandalone("extra.frameDeactivated"));
      return true;
    } catch (error) {
      console.error("Error equipping frame:", error);
      toast.error(tStandalone("extra.frameActivationFailed"));
      return false;
    }
  };

  const isFrameUnlocked = (frameId: string) => unlockedFrames.has(frameId);

  const getEquippedFrameData = () => {
    if (!equippedFrame) return null;
    return AVATAR_FRAMES.find((f) => f.id === equippedFrame) || null;
  };

  return {
    unlockedFrames,
    equippedFrame,
    loading,
    unlockFrame,
    equipFrame,
    isFrameUnlocked,
    getEquippedFrameData,
    frames: AVATAR_FRAMES,
  };
}
