import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { Eye, EyeOff, Save, CreditCard, Check, AlertTriangle, Loader2 } from "lucide-react";

interface AppSetting {
  key: string;
  value: string | null;
  description: string | null;
  is_secret: boolean;
}

export default function Settings() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .order("key");

      if (error) throw error;

      setSettings(data || []);
      // Initialize edited values with current values
      const values: Record<string, string> = {};
      data?.forEach((setting) => {
        values[setting.key] = setting.value || "";
      });
      setEditedValues(values);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (key: string) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .update({
          value: editedValues[key] || null,
          updated_at: new Date().toISOString(),
        })
        .eq("key", key);

      if (error) throw error;

      toast.success(`${key} updated successfully`);
      fetchSettings();
    } catch (error) {
      console.error("Error saving setting:", error);
      toast.error("Failed to save setting");
    } finally {
      setIsSaving(false);
    }
  };

  const maskValue = (value: string | null) => {
    if (!value) return "";
    if (value.length <= 8) return "••••••••";
    return "••••••••" + value.slice(-4);
  };

  const isConfigured = (key: string) => {
    const setting = settings.find((s) => s.key === key);
    return setting?.value && setting.value.length > 0;
  };

  const hasChanges = (key: string) => {
    const setting = settings.find((s) => s.key === key);
    return editedValues[key] !== (setting?.value || "");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stripeSettings = settings.filter((s) =>
    s.key.startsWith("stripe_")
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure API keys and application settings
        </p>
      </div>

      {/* Payment Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <CardTitle>Payment Settings</CardTitle>
          </div>
          <CardDescription>
            Configure Stripe for processing real-money gem purchases
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {stripeSettings.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No payment settings found. Please check database configuration.
            </p>
          ) : (
            stripeSettings.map((setting) => (
              <div key={setting.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={setting.key} className="flex items-center gap-2">
                    {setting.key === "stripe_secret_key"
                      ? "Stripe Secret Key"
                      : "Stripe Webhook Secret"}
                    {isConfigured(setting.key) ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                        <Check className="w-3 h-3 mr-1" />
                        Configured
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Not configured
                      </Badge>
                    )}
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  {setting.description}
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id={setting.key}
                      type={showSecrets[setting.key] ? "text" : "password"}
                      value={
                        showSecrets[setting.key]
                          ? editedValues[setting.key] || ""
                          : editedValues[setting.key]
                          ? maskValue(editedValues[setting.key])
                          : ""
                      }
                      onChange={(e) => {
                        if (showSecrets[setting.key]) {
                          setEditedValues((prev) => ({
                            ...prev,
                            [setting.key]: e.target.value,
                          }));
                        }
                      }}
                      placeholder={
                        setting.key === "stripe_secret_key"
                          ? "sk_live_..."
                          : "whsec_..."
                      }
                      className="pr-10"
                      readOnly={!showSecrets[setting.key]}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() =>
                        setShowSecrets((prev) => ({
                          ...prev,
                          [setting.key]: !prev[setting.key],
                        }))
                      }
                    >
                      {showSecrets[setting.key] ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <Button
                    onClick={() => handleSave(setting.key)}
                    disabled={!hasChanges(setting.key) || isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))
          )}

          <div className="pt-4 border-t">
            <h4 className="font-medium mb-2">Setup Instructions</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>
                Go to{" "}
                <a
                  href="https://dashboard.stripe.com/apikeys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Stripe Dashboard → API Keys
                </a>
              </li>
              <li>Copy your Secret key (starts with sk_live_ or sk_test_)</li>
              <li>Paste it above and click Save</li>
              <li>
                For webhooks, go to{" "}
                <a
                  href="https://dashboard.stripe.com/webhooks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Stripe Dashboard → Webhooks
                </a>
              </li>
              <li>Add endpoint: your-app-url/functions/v1/stripe-gem-webhook</li>
              <li>Copy the Signing secret and paste above</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
