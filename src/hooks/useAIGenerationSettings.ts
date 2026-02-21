import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';
import { translateErrorMessage } from '@/utils/errorTranslations';

export interface AIGenerationSetting {
  id: string;
  setting_type: string;
  name: string;
  description: string | null;
  prompt: string;
  negative_prompt: string | null;
  style_image_url: string | null;
  model: string | null;
  model_settings: Json;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useAIGenerationSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error, refetch } = useQuery({
    queryKey: ['ai-generation-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_generation_settings')
        .select('*')
        .order('setting_type');

      if (error) throw error;
      return data as AIGenerationSetting[];
    },
  });

  const updateSetting = useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: Partial<Omit<AIGenerationSetting, 'id' | 'created_at' | 'updated_at'>>
    }) => {
      const { data, error } = await supabase
        .from('ai_generation_settings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-generation-settings'] });
      toast({
        title: 'პარამეტრები შენახულია',
        description: 'AI გენერაციის პარამეტრები წარმატებით განახლდა',
      });
    },
    onError: (error) => {
      toast({
        title: 'შეცდომა',
        description: translateErrorMessage(error.message),
        variant: 'destructive',
      });
    },
  });

  const getSettingByType = (type: string) => {
    return settings?.find(s => s.setting_type === type);
  };

  return {
    settings,
    isLoading,
    error,
    refetch,
    updateSetting,
    getSettingByType,
  };
};

// Hook to fetch a single setting by type (for edge functions to use via API)
export const fetchSettingByType = async (settingType: string): Promise<AIGenerationSetting | null> => {
  const { data, error } = await supabase
    .from('ai_generation_settings')
    .select('*')
    .eq('setting_type', settingType)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error fetching AI setting:', error);
    return null;
  }

  return data as AIGenerationSetting;
};
