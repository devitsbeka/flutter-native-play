import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export function useCurrency() {
  const { user, profile, updateProfile } = useAuth();

  // Current balances with defaults
  const coins = profile?.coins ?? 0;
  const gems = profile?.gems ?? 0;

  // Add coins to user balance
  const addCoins = async (amount: number): Promise<boolean> => {
    if (!user || amount <= 0) return false;

    try {
      const newCoins = coins + amount;
      await updateProfile({ coins: newCoins } as any);
      return true;
    } catch (error) {
      console.error("Error adding coins:", error);
      return false;
    }
  };

  // Spend coins from user balance
  const spendCoins = async (amount: number): Promise<boolean> => {
    if (!user || amount <= 0) return false;

    if (coins < amount) {
      // Return false - let the calling component handle the notification
      return false;
    }

    try {
      const newCoins = coins - amount;
      await updateProfile({ coins: newCoins } as any);
      return true;
    } catch (error) {
      console.error("Error spending coins:", error);
      return false;
    }
  };

  // Add gems to user balance
  const addGems = async (amount: number): Promise<boolean> => {
    if (!user || amount <= 0) return false;

    try {
      const newGems = gems + amount;
      await updateProfile({ gems: newGems } as any);
      return true;
    } catch (error) {
      console.error("Error adding gems:", error);
      return false;
    }
  };

  // Spend gems from user balance
  const spendGems = async (amount: number): Promise<boolean> => {
    if (!user || amount <= 0) return false;

    if (gems < amount) {
      // Return false - let the calling component handle the notification
      return false;
    }

    try {
      const newGems = gems - amount;
      await updateProfile({ gems: newGems } as any);
      return true;
    } catch (error) {
      console.error("Error spending gems:", error);
      return false;
    }
  };

  // Check if user can afford coins
  const canAffordCoins = (amount: number): boolean => coins >= amount;

  // Check if user can afford gems
  const canAffordGems = (amount: number): boolean => gems >= amount;

  // Add both coins and gems at once (for rewards)
  const addCurrency = async (coinsAmount: number, gemsAmount: number = 0): Promise<boolean> => {
    if (!user) return false;

    try {
      const updates: any = {};
      if (coinsAmount > 0) updates.coins = coins + coinsAmount;
      if (gemsAmount > 0) updates.gems = gems + gemsAmount;
      
      if (Object.keys(updates).length > 0) {
        await updateProfile(updates);
      }
      return true;
    } catch (error) {
      console.error("Error adding currency:", error);
      return false;
    }
  };

  return {
    coins,
    gems,
    addCoins,
    spendCoins,
    addGems,
    spendGems,
    canAffordCoins,
    canAffordGems,
    addCurrency,
  };
}
