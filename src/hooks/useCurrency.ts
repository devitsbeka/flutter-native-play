import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface TransactionLog {
  productId?: string;
  productType: string;
  valueReceived: Json;
  platform?: string;
}

/**
 * Why currency is being granted.
 *
 * Credits no longer go through `update_user_currency` — that RPC refuses a
 * positive delta from a signed-in caller, because taking the amount from the
 * client meant any account could mint itself unlimited gems, and gems buy PRO
 * days in the shop.
 *
 * Each kind carries its own per-award and per-day ceiling, defined in
 * `currency_grant_limits`, and every grant is written to `currency_grants`.
 * The kind is a required argument rather than an optional one so that adding
 * a new credit path is a compile error until someone decides what it costs.
 *
 * Adding a kind here means adding a row to that table in a migration, or the
 * grant is rejected as unknown.
 */
export type RewardKind =
  | "quiz_reward"
  | "level_up"
  | "stake_win"
  | "spin"
  | "chest"
  | "mission"
  | "ad_reward"
  | "shop_grant"
  | "feed_trivia";

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

  /**
   * Grant currency for a gameplay reward.
   *
   * The server checks the amount against the ceilings for this kind, counts
   * it against today's total, and records it. A rejection here is not a
   * transient failure — it means the award was larger than the kind allows,
   * or the day's allowance is spent.
   */
  const grant = async (
    kind: RewardKind,
    coinsAmount: number,
    gemsAmount: number,
    reference?: string,
  ): Promise<boolean> => {
    if (!user) return false;
    if (coinsAmount <= 0 && gemsAmount <= 0) return true;

    try {
      const { data, error } = await supabase.rpc("credit_gameplay_reward", {
        p_kind: kind,
        p_coins: Math.max(0, Math.floor(coinsAmount)),
        p_gems: Math.max(0, Math.floor(gemsAmount)),
        p_reference: reference ?? null,
      });

      if (error) throw error;

      // Sync local state only — DB already updated by RPC
      if (data && data.length > 0) {
        setProfileLocal({ coins: data[0].new_coins, gems: data[0].new_gems });
      }
      return true;
    } catch (error) {
      console.error(`Error granting ${kind} reward:`, error);
      return false;
    }
  };

  // Add coins to user balance
  const addCoins = async (
    amount: number,
    kind: RewardKind,
    reference?: string,
  ): Promise<boolean> => {
    if (amount <= 0) return false;
    return grant(kind, amount, 0, reference);
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

  // Add gems to user balance
  const addGems = async (
    amount: number,
    kind: RewardKind,
    reference?: string,
  ): Promise<boolean> => {
    if (amount <= 0) return false;
    return grant(kind, 0, amount, reference);
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

  /**
   * Convert one currency into the other at the server's rate.
   *
   * Callers name the direction and what they are giving up; the rate and the
   * resulting amount are the server's. Previously both sides of the trade
   * were client-supplied, so a single gem could be exchanged for any number
   * of coins.
   */
  const exchangeCurrency = async (
    direction: "gems_to_coins" | "coins_to_gems",
    amount: number,
  ): Promise<boolean> => {
    if (!user || amount <= 0) return false;

    try {
      const { data, error } = await supabase.rpc("exchange_currency", {
        p_direction: direction,
        p_amount: Math.floor(amount),
      });

      if (error) {
        if (error.message?.includes("Insufficient")) return false;
        throw error;
      }

      if (data && data.length > 0) {
        setProfileLocal({ coins: data[0].new_coins, gems: data[0].new_gems });
      }
      return true;
    } catch (error) {
      console.error("Error exchanging currency:", error);
      return false;
    }
  };

  /** Gems → coins at the server's rate. */
  const exchangeGemsForCoins = async (gemsAmount: number): Promise<boolean> =>
    exchangeCurrency("gems_to_coins", gemsAmount);

  // Check if user can afford coins
  const canAffordCoins = (amount: number): boolean => coins >= amount;

  // Check if user can afford gems
  const canAffordGems = (amount: number): boolean => gems >= amount;

  // Add both coins and gems at once
  const addCurrency = async (
    coinsAmount: number,
    gemsAmount: number,
    kind: RewardKind,
    reference?: string,
  ): Promise<boolean> => grant(kind, coinsAmount, gemsAmount, reference);

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
    exchangeCurrency,
    exchangeGemsForCoins,
    logTransaction,
  };
}
