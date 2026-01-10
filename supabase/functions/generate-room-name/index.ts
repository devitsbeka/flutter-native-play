import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // If no AI key, generate a simple name
    if (!lovableApiKey) {
      const funnyPrefixes = [
        "გიჟური", "მაგარი", "ეპიკური", "ლეგენდარული", "საოცარი",
        "ბრწყინვალე", "ფანტასტიური", "დიდებული", "მხიარული", "ჭკვიანი"
      ];
      const prefix = funnyPrefixes[Math.floor(Math.random() * funnyPrefixes.length)];
      return new Response(
        JSON.stringify({ 
          name: `${prefix} ${iconName}`, 
          icon_url: randomIcon.icon_url 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use AI to generate a funny name based on the icon
    const prompt = `შექმენი ძალიან სასაცილო და კრეატიული ქართული სახელი ტრივია თამაშის ოთახისთვის, რომელიც ეფუძნება ამ იკონას/თემას: "${iconName}".

მაგალითები:
- "pizza" → "პიცის მოყვარულები 🍕"
- "dragon" → "ცეცხლის მფრქვეველები 🐉"
- "banana" → "გადარეული ბანანები 🍌"
- "robot" → "რობოტების აჯანყება 🤖"
- "thunder" → "მეხი-ჭექა ბრიგადა ⚡"

მოთხოვნები:
- მაქსიმუმ 25 სიმბოლო (ემოჯის გარეშე)
- უნდა იყოს სასაცილო და დასამახსოვრებელი
- შეიძლება დაამატო შესაბამისი ემოჯი ბოლოს
- მხოლოდ სახელი დააბრუნე, არაფერი სხვა`;

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
    let generatedName = data.choices?.[0]?.message?.content?.trim() || `სახალისო ${iconName}`;
    
    // Clean up the response - remove quotes if present
    generatedName = generatedName.replace(/^["']|["']$/g, '').trim();
    
    // Ensure it's not too long (max 30 chars including emoji)
    if (generatedName.length > 35) {
      generatedName = generatedName.substring(0, 32) + '...';
    }

    console.log(`Generated room name: ${generatedName}`);

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
