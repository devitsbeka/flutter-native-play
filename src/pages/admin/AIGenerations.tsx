import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, History, FlaskConical, Loader2 } from 'lucide-react';
import { useAIGenerationSettings } from '@/hooks/useAIGenerationSettings';
import { AISettingsCard } from '@/components/admin/AISettingsCard';
import { GenerationHistoryTable } from '@/components/admin/GenerationHistoryTable';
import { TestGenerationPanel } from '@/components/admin/TestGenerationPanel';

const AIGenerations = () => {
  const [activeTab, setActiveTab] = useState('settings');
  const { settings, isLoading, updateSetting } = useAIGenerationSettings();
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleSave = async (id: string, updates: Parameters<typeof updateSetting.mutate>[0]['updates']) => {
    setSavingId(id);
    try {
      await updateSetting.mutateAsync({ id, updates });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI გენერაცია</h1>
        <p className="text-muted-foreground">
          მართეთ ავატარების გენერაციის პარამეტრები და ტესტირება
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" />
            პარამეტრები
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            ისტორია
          </TabsTrigger>
          <TabsTrigger value="test" className="gap-2">
            <FlaskConical className="w-4 h-4" />
            ტესტი
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {settings?.map((setting) => (
                <AISettingsCard
                  key={setting.id}
                  setting={setting}
                  onSave={(updates) => handleSave(setting.id, updates)}
                  isSaving={savingId === setting.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <GenerationHistoryTable />
        </TabsContent>

        <TabsContent value="test" className="mt-6">
          <TestGenerationPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIGenerations;
