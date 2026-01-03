-- Create AI generation settings table
CREATE TABLE public.ai_generation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_type TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  style_image_url TEXT,
  model TEXT,
  model_settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_generation_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage settings
CREATE POLICY "Admins can view AI settings"
ON public.ai_generation_settings FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert AI settings"
ON public.ai_generation_settings FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update AI settings"
ON public.ai_generation_settings FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete AI settings"
ON public.ai_generation_settings FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Create updated_at trigger
CREATE TRIGGER update_ai_generation_settings_updated_at
BEFORE UPDATE ON public.ai_generation_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings matching current hardcoded values
INSERT INTO public.ai_generation_settings (setting_type, name, description, prompt, model, model_settings) VALUES
(
  'avatar_static',
  'Static Avatar Generation',
  'Transforms user photos into semi-realistic 3D rendered portraits using Lovable AI',
  'Transform this photo into a high-quality SEMI-REALISTIC 3D rendered portrait.

STYLE REQUIREMENTS:
- SEMI-REALISTIC 3D render like a modern video game character (Unreal Engine, Final Fantasy style)
- REALISTIC eye proportions - NOT cartoon-style big eyes
- Highly detailed, realistic skin with subtle subsurface scattering
- Dramatic, moody lighting with dark atmosphere
- DARK GRADIENT BACKGROUND (charcoal gray to black)
- Preserve the person''s EXACT facial structure, features, and proportions
- Add subtle violet/purple color tones to the hair for artistic flair
- Soft hair rendering with realistic strand details
- Keep their exact hairstyle, hair color base, clothing and accessories
- Professional portrait composition (head and shoulders, slightly angled)
- Cinematic quality with depth of field effect
- Mature, sophisticated aesthetic - NOT cartoonish or childish

The result should look like a premium AAA video game character portrait - realistic but stylized, dramatic lighting, dark moody atmosphere.',
  'google/gemini-2.5-flash-image-preview',
  '{}'::jsonb
),
(
  'avatar_animation',
  'Avatar Animation',
  'Animates static avatars using Fal.ai Vidu API',
  'Create a subtle, professional portrait animation. The person should have minimal natural movement - gentle breathing, subtle facial micro-expressions, and slight natural head movement. Keep the movement professional and dignified.',
  'fal-ai/vidu/v2/start-end',
  '{"duration": 4, "resolution": "720p", "movement_amplitude": "auto", "enhance_face": true}'::jsonb
),
(
  'lightx_avatar',
  'LightX Avatar Generation',
  'Alternative avatar generation using LightX API for batch processing',
  'Transform this photo into a high-quality 3D rendered portrait with professional studio lighting and a dark gradient background. Preserve facial features exactly while adding a stylized, polished look.',
  'lightx',
  '{"expand_padding": 150, "style_id": "3d-portrait"}'::jsonb
);