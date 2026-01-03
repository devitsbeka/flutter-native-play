import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Save, ChevronDown, ChevronUp, Sparkles, Wand2, Film, Image } from 'lucide-react';
import { AIGenerationSetting } from '@/hooks/useAIGenerationSettings';

interface AISettingsCardProps {
  setting: AIGenerationSetting;
  onSave: (updates: Partial<AIGenerationSetting>) => void;
  isSaving: boolean;
}

const getSettingIcon = (type: string) => {
  switch (type) {
    case 'avatar_static':
      return <Wand2 className="w-5 h-5" />;
    case 'avatar_animation':
      return <Film className="w-5 h-5" />;
    case 'lightx_avatar':
      return <Image className="w-5 h-5" />;
    default:
      return <Sparkles className="w-5 h-5" />;
  }
};

const getSettingColor = (type: string) => {
  switch (type) {
    case 'avatar_static':
      return 'bg-violet-500/10 text-violet-600 border-violet-500/20';
    case 'avatar_animation':
      return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    case 'lightx_avatar':
      return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    default:
      return 'bg-primary/10 text-primary border-primary/20';
  }
};

export const AISettingsCard = ({ setting, onSave, isSaving }: AISettingsCardProps) => {
  const [prompt, setPrompt] = useState(setting.prompt);
  const [negativePrompt, setNegativePrompt] = useState(setting.negative_prompt || '');
  const [styleImageUrl, setStyleImageUrl] = useState(setting.style_image_url || '');
  const [model, setModel] = useState(setting.model || '');
  const [modelSettings, setModelSettings] = useState(JSON.stringify(setting.model_settings, null, 2));
  const [isActive, setIsActive] = useState(setting.is_active);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const changed =
      prompt !== setting.prompt ||
      negativePrompt !== (setting.negative_prompt || '') ||
      styleImageUrl !== (setting.style_image_url || '') ||
      model !== (setting.model || '') ||
      modelSettings !== JSON.stringify(setting.model_settings, null, 2) ||
      isActive !== setting.is_active;
    setHasChanges(changed);
  }, [prompt, negativePrompt, styleImageUrl, model, modelSettings, isActive, setting]);

  const handleSave = () => {
    let parsedModelSettings = setting.model_settings;
    try {
      parsedModelSettings = JSON.parse(modelSettings);
    } catch (e) {
      console.error('Invalid JSON for model settings');
    }

    onSave({
      prompt,
      negative_prompt: negativePrompt || null,
      style_image_url: styleImageUrl || null,
      model: model || null,
      model_settings: parsedModelSettings,
      is_active: isActive,
    });
  };

  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-1 h-full ${isActive ? 'bg-emerald-500' : 'bg-muted'}`} />
      
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${getSettingColor(setting.setting_type)}`}>
              {getSettingIcon(setting.setting_type)}
            </div>
            <div>
              <CardTitle className="text-lg">{setting.name}</CardTitle>
              <CardDescription className="mt-1">{setting.description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={isActive ? 'default' : 'secondary'}>
              {isActive ? 'აქტიური' : 'გათიშული'}
            </Badge>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`prompt-${setting.id}`}>მთავარი პრომპტი</Label>
          <Textarea
            id={`prompt-${setting.id}`}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={8}
            className="font-mono text-sm"
            placeholder="Enter the main generation prompt..."
          />
          <p className="text-xs text-muted-foreground">
            {prompt.length} სიმბოლო
          </p>
        </div>

        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              დამატებითი პარამეტრები
              {isAdvancedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor={`negative-${setting.id}`}>ნეგატიური პრომპტი</Label>
              <Textarea
                id={`negative-${setting.id}`}
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                rows={3}
                className="font-mono text-sm"
                placeholder="Things to avoid in generation..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`style-${setting.id}`}>სტილის სურათის URL</Label>
              <Input
                id={`style-${setting.id}`}
                value={styleImageUrl}
                onChange={(e) => setStyleImageUrl(e.target.value)}
                placeholder="https://example.com/style-reference.jpg"
              />
              {styleImageUrl && (
                <div className="mt-2">
                  <img
                    src={styleImageUrl}
                    alt="Style reference"
                    className="w-24 h-24 object-cover rounded-lg border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor={`model-${setting.id}`}>მოდელი</Label>
              <Input
                id={`model-${setting.id}`}
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="google/gemini-2.5-flash-image-preview"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`settings-${setting.id}`}>მოდელის პარამეტრები (JSON)</Label>
              <Textarea
                id={`settings-${setting.id}`}
                value={modelSettings}
                onChange={(e) => setModelSettings(e.target.value)}
                rows={4}
                className="font-mono text-sm"
                placeholder='{"duration": 4, "resolution": "720p"}'
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'ინახება...' : 'შენახვა'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
