import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Banned inappropriate Georgian words
const BANNED_WORDS = [
  'ტრაკი', 'განავალი', 'ფურთხი', 'ბოზი', 'შევეცი', 'მოვეცი', 
  'ტყვნა', 'მუტელი', 'ყლე', 'ქერა', 'დედა', 'მამა', 'შენი'
];

// Helper to generate simple 2-word name
function generateSimpleName(iconName: string): string {
  const suffixes = ['ოთახი', 'გუნდი', 'კლუბი', 'არენა', 'ბრძოლა'];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${iconName} ${suffix}`;
}

// Validate and clean generated name
function validateAndCleanName(name: string, iconName: string): string {
  if (!name) return generateSimpleName(iconName);
  
  // Remove quotes
  let cleaned = name.replace(/^["']|["']$/g, '').trim();
  
  // Remove emojis
  cleaned = cleaned.replace(/[\u{1F600}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, '').trim();
  
  // Check for banned words
  const containsBanned = BANNED_WORDS.some(word => 
    cleaned.toLowerCase().includes(word.toLowerCase())
  );
  
  if (containsBanned) {
    return generateSimpleName(iconName);
  }
  
  // Ensure max 2 words
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  if (words.length > 2) {
    cleaned = words.slice(0, 2).join(' ');
  }
  
  // If too long or empty, use fallback
  if (!cleaned || cleaned.length > 35) {
    return generateSimpleName(iconName);
  }
  
  return cleaned;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get random icons from the icon_library table
    const { data: icons, error: iconError } = await supabase
      .from('icon_library')
      .select('slug, title, icon_url')
      .not('icon_url', 'is', null)
      .limit(100);

    if (iconError || !icons || icons.length === 0) {
      console.error('Failed to fetch icons:', iconError);
      // Fallback to default name
      return new Response(
        JSON.stringify({ 
          name: "სახალისო გუნდი", 
          icon_url: null 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Pick a random icon
    const randomIcon = icons[Math.floor(Math.random() * icons.length)];
    const iconName = randomIcon.title || randomIcon.slug.replace(/-/g, ' ');

    console.log(`Selected icon: ${iconName} (${randomIcon.slug})`);

    // If no AI key, generate a simple 2-word name
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ 
          name: generateSimpleName(iconName), 
          icon_url: randomIcon.icon_url 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use AI to generate a 2-word name based on the icon
    const prompt = `შექმენი მოკლე ქართული სახელი ტრივია თამაშის ოთახისთვის, რომელიც ეფუძნება ამ იკონას: "${iconName}".

მკაცრი წესები:
- მაქსიმუმ 2 სიტყვა! ეს ძალიან მნიშვნელოვანია!
- არ გამოიყენო უხამსი სიტყვები
- არ დაამატო ემოჯი

მაგალითები:
- shark → "ზვიგენების ოთახი" ან "ზვიგენთა ბრძოლა"
- fireplace → "ბუხრის ოთახი"
- pizza → "პიცის კლუბი"
- dragon → "დრაკონთა არენა"
- book → "მკითხველთა ოთახი"
- basket → "კალათბურთელები"
- cat → "კატების ოთახი"
- star → "ვარსკვლავთა არენა"

დაბრუნე მხოლოდ 2 სიტყვიანი სახელი, არაფერი სხვა.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', response.status);
      // Fallback
      return new Response(
        JSON.stringify({ 
          name: `სახალისო ${iconName}`, 
          icon_url: randomIcon.icon_url 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const rawName = data.choices?.[0]?.message?.content?.trim() || '';
    
    // Validate and clean the generated name
    const generatedName = validateAndCleanName(rawName, iconName);

    console.log(`Generated room name: ${generatedName} (raw: ${rawName})`);

    return new Response(
      JSON.stringify({ 
        name: generatedName, 
        icon_url: randomIcon.icon_url 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating room name:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        name: "სახალისო გუნდი", 
        icon_url: null,
        error: errorMessage 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
