import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface TransactionLog {
  productId?: string;
  productType: string;
  valueReceived: Json;
  platform?: string;
}

export function useCurrency() {
  const { user, profile, setProfileLocal } = useAuth();

  // Current balances with defaults
  const coins = profile?.coins ?? 0;
  const gems = profile?.gems ?? 0;

  // Log a purchase transaction to the database
  const logTransaction = async (
    currencyUsed: "gems" | "coins" | "usd",
    amountPaid: number,
    transaction: TransactionLog
  ): Promise<void> => {
    if (!user) return;

    try {
      const insertData = {
        user_id: user.id,
        product_id: transaction.productId || null,
        product_type: transaction.productType,
        currency_used: currencyUsed,
        amount_paid: amountPaid,
        value_received: transaction.valueReceived,
        platform: transaction.platform || "web",
      };
      
      const { error } = await supabase.from("purchase_transactions").insert([insertData]);
      if (error) throw error;
    } catch (error) {
      console.error("Error logging transaction:", error);
      // Don't throw - transaction logging shouldn't block the purchase
    }
  };

  // Add coins to user balance using secure RPC
  const addCoins = async (amount: number): Promise<boolean> => {
    if (!user || amount <= 0) return false;

    try {
      const { data, error } = await supabase.rpc('update_user_currency', {
        p_user_id: user.id,
        p_coins_delta: amount,
        p_gems_delta: 0,
      });

      if (error) throw error;

      // Sync local state only — DB already updated by RPC
      if (data && data.length > 0) {
        setProfileLocal({ coins: data[0].new_coins, gems: data[0].new_gems });
      }
      return true;
    } catch (error) {
      console.error("Error adding coins:", error);
      return false;
    }
  };

  // Spend coins from user balance using secure RPC with database-level locking
  // Optionally logs the transaction if transactionLog is provided
  const spendCoins = async (amount: number, transactionLog?: TransactionLog): Promise<boolean> => {
    if (!user || amount <= 0) return false;

    try {
      const { data, error } = await supabase.rpc('update_user_currency', {
        p_user_id: user.id,
        p_coins_delta: -amount,
        p_gems_delta: 0,
      });

      if (error) {
        // Handle insufficient funds error gracefully
        if (error.message?.includes('Insufficient')) {
          return false;
        }
        throw error;
      }

      // Sync local state only — DB already updated by RPC
      if (data && data.length > 0) {
        setProfileLocal({ coins: data[0].new_coins, gems: data[0].new_gems });
      }

      // Log transaction if provided
      if (transactionLog) {
        await logTransaction("coins", amount, transactionLog);
      }

      return true;
    } catch (error) {
      console.error("Error spending coins:", error);
      return false;
    }
  };

  // Add gems to user balance using secure RPC
  const addGems = async (amount: number): Promise<boolean> => {
    if (!user || amount <= 0) return false;

    try {
      const { data, error } = await supabase.rpc('update_user_currency', {
        p_user_id: user.id,
        p_coins_delta: 0,
        p_gems_delta: amount,
      });

      if (error) throw error;

      // Sync local state only — DB already updated by RPC
      if (data && data.length > 0) {
        setProfileLocal({ coins: data[0].new_coins, gems: data[0].new_gems });
      }
      return true;
    } catch (error) {
      console.error("Error adding gems:", error);
      return false;
    }
  };

  // Spend gems from user balance using secure RPC with database-level locking
  // Optionally logs the transaction if transactionLog is provided
  const spendGems = async (amount: number, transactionLog?: TransactionLog): Promise<boolean> => {
    if (!user || amount <= 0) return false;

    try {
      const { data, error } = await supabase.rpc('update_user_currency', {
        p_user_id: user.id,
        p_coins_delta: 0,
        p_gems_delta: -amount,
      });

      if (error) {
        // Handle insufficient funds error gracefully
        if (error.message?.includes('Insufficient')) {
          return false;
        }
        throw error;
      }

      // Sync local state only — DB already updated by RPC
      if (data && data.length > 0) {
        setProfileLocal({ coins: data[0].new_coins, gems: data[0].new_gems });
      }

      // Log transaction if provided
      if (transactionLog) {
        await logTransaction("gems", amount, transactionLog);
      }

      return true;
    } catch (error) {
      console.error("Error spending gems:", error);
      return false;
    }
  };

  // Exchange gems for coins in a single atomic RPC call. Two separate
  // spend/add calls could debit the gems and then fail to credit the coins.
  const exchangeGemsForCoins = async (
    gemsAmount: number,
    coinsAmount: number
  ): Promise<boolean> => {
    if (!user || gemsAmount <= 0 || coinsAmount <= 0) return false;

    try {
      const { data, error } = await supabase.rpc('update_user_currency', {
        p_user_id: user.id,
        p_coins_delta: coinsAmount,
        p_gems_delta: -gemsAmount,
      });

      if (error) {
        if (error.message?.includes('Insufficient')) {
          return false;
        }
        throw error;
      }

      if (data && data.length > 0) {
        setProfileLocal({ coins: data[0].new_coins, gems: data[0].new_gems });
      }
      return true;
    } catch (error) {
      console.error("Error exchanging gems for coins:", error);
      return false;
    }
  };

  // Check if user can afford coins
  const canAffordCoins = (amount: number): boolean => coins >= amount;

  // Check if user can afford gems
  const canAffordGems = (amount: number): boolean => gems >= amount;

  // Add both coins and gems at once (for rewards) using secure RPC
  const addCurrency = async (coinsAmount: number, gemsAmount: number = 0): Promise<boolean> => {
    if (!user) return false;
    if (coinsAmount <= 0 && gemsAmount <= 0) return true;

    try {
      const { data, error } = await supabase.rpc('update_user_currency', {
        p_user_id: user.id,
        p_coins_delta: coinsAmount > 0 ? coinsAmount : 0,
        p_gems_delta: gemsAmount > 0 ? gemsAmount : 0,
      });

      if (error) throw error;

      // Sync local state only — DB already updated by RPC
      if (data && data.length > 0) {
        setProfileLocal({ coins: data[0].new_coins, gems: data[0].new_gems });
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
    exchangeGemsForCoins,
    logTransaction,
  };
}
