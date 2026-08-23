import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, RefreshCw } from "lucide-react";
import { useEconomyConfigAdmin, EconomyConfigItem } from "@/hooks/useEconomyConfig";
import { toast } from "@/lib/toast";

const CATEGORY_LABELS: Record<string, string> = {
  game_stakes: "🎮 Game Stakes",
  rewards: "🎁 Rewards",
  daily_rewards: "📅 Daily Rewards",
  chests: "📦 Chests",
  spin_wheel: "🎡 Spin Wheel",
  ads: "📺 Ads",
  ratios: "🔄 Ratios",
  onboarding: "👋 New Players",
  powerups: "⚡ Power-ups",
  vip: "👑 VIP",
  xp: "⭐ XP",
};

const CATEGORY_ORDER = [
  "game_stakes",
  "rewards",
  "daily_rewards",
  "chests",
  "spin_wheel",
  "ads",
  "ratios",
  "onboarding",
  "powerups",
  "vip",
  "xp",
];

export function EconomyConfigTab() {
  const { groupedItems, isLoading, refetch, updateConfig, isUpdating } = useEconomyConfigAdmin();
  const [editedValues, setEditedValues] = useState<Record<string, number>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  const handleValueChange = (id: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setEditedValues((prev) => ({ ...prev, [id]: numValue }));
    }
  };

  const handleSave = async (item: EconomyConfigItem) => {
    const newValue = editedValues[item.id];
    if (newValue === undefined || newValue === item.value) return;

    setSavingIds((prev) => new Set(prev).add(item.id));
    
    try {
      updateConfig({ id: item.id, value: newValue });
      toast.success(`Updated ${item.id} to ${newValue}`);
      setEditedValues((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    } catch {
      toast.error("Failed to update");
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const hasChanges = (id: string, currentValue: number) => {
    return editedValues[id] !== undefined && editedValues[id] !== currentValue;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sortedCategories = CATEGORY_ORDER.filter((cat) => groupedItems[cat]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Edit economy values. Changes apply instantly across the app.
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sortedCategories.map((category) => (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {CATEGORY_LABELS[category] || category}
              </CardTitle>
              <CardDescription>
                {groupedItems[category].length} settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {groupedItems[category].map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <label className="text-sm font-medium truncate block">
                      {item.id.replace(/_/g, " ")}
                    </label>
                    {item.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <Input
                    type="number"
                    value={editedValues[item.id] ?? item.value}
                    onChange={(e) => handleValueChange(item.id, e.target.value)}
                    className="w-24 text-right"
                  />
                  {hasChanges(item.id, Number(item.value)) && (
                    <Button
                      size="sm"
                      onClick={() => handleSave(item)}
                      disabled={savingIds.has(item.id) || isUpdating}
                    >
                      {savingIds.has(item.id) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                  {!hasChanges(item.id, Number(item.value)) && (
                    <Badge variant="outline" className="w-10 justify-center">
                      ✓
                    </Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
