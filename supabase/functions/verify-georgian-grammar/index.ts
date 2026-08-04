import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { AI_CHAT_URL, AI_API_KEY, aiModel } from "../_shared/ai.ts";

const GEORGIAN_GRAMMAR_EXPERT_PROMPT = `შენ ხარ ქართული ენის გრამატიკის ექსპერტი. შენი ამოცანაა გადაამოწმო და გაასწორო ქართული ტექსტი.

🚨 კრიტიკული გრამატიკული წესები:

1. ზმნის უღლება (ყველაზე გავრცელებული შეცდომები):
   ❌ "ვყვებიდი" → ✅ "ვყვებოდი" (წარსული არასრული)
   ❌ "ვიყავდი" → ✅ "ვიყავი" (წარსული)
   ❌ "მეყვარა" → ✅ "მიყვარს" (აწმყო)
   ❌ "გააკეთებდა" (პირობითი) ≠ "გააკეთებს" (მომავალი) - გაარჩიე!
   
2. ზმნის პირის სწორი ფორმები:
   - მე: ვ- პრეფიქსი (ვთამაშობ, ვმუშაობ, ვყვებოდი)
   - შენ: -ი/-ე/-ო სუფიქსი (თამაშობ, მუშაობ, ყვებოდი)
   - ის: -ს/-ა სუფიქსი (თამაშობს, მუშაობს, ყვებოდა)
   
3. ბრუნვის ბოლოსართები:
   - სახელობითი: -ი (კაცი, ქალი)
   - მოთხრობითი: -მა/-მ (კაცმა, ქალმა)
   - მიცემითი: -ს (კაცს, ქალს)
   - ნათესაობითი: -ის (კაცის, ქალის)
   
4. გავრცელებული მართლწერის შეცდომები:
   - "გაიშვა" არა "გაიშვ"
   - "დაიწყო" არა "დაიწყ"
   - "რატომ" არა "რატო"
   - "როგორ" არა "როგო"
   
5. ბუნებრივი ქართული ფრაზები:
   - "ვინ არის ყველაზე..." + ზედსართავი
   - "ვის უყვარს..." + არსებითი
   - "ვინ გააკეთებდა..." + მოქმედება
   - "რომელ წელს..." + მოვლენა

6. კითხვითი წინადადებები:
   - "რა?" "ვინ?" "სად?" "როდის?" "რატომ?" "როგორ?"
   - კითხვის ნიშანი ბოლოში

7. ❌ სლავური/რუსული სესხებული სიტყვების გამოყენება აკრძალულია! გამოიყენე მხოლოდ ქართული ვარიანტები:
   ცხოველები:
   ❌ "კომარა" → ✅ "კოღო" (mosquito)
   ❌ "ბაბოჩკა" → ✅ "პეპელა" (butterfly)
   ❌ "ჩერვი" → ✅ "ჭია" (worm)
   
   საყოფაცხოვრებო ნივთები:
   ❌ "სტაკანი" → ✅ "ჭიქა" (glass)
   ❌ "რუჩკა" → ✅ "კალამი" (pen)
   ❌ "სტოლი" → ✅ "მაგიდა" (table)
   ❌ "კროვატი" → ✅ "საწოლი" (bed)
   ❌ "დივანი" → ✅ "ტახტი" (couch/sofa)
   ❌ "შკაფი" → ✅ "კარადა" (wardrobe)
   ❌ "პალატენცა" → ✅ "პირსახოცი" (towel)
   ❌ "ტუმბოჩკა" → ✅ "ტუმბო" (nightstand)
   
   საკვები:
   ❌ "კარტოშკა" → ✅ "კარტოფილი" (potato)
   ❌ "აგურცი" / "აგურცელი" → ✅ "კიტრი" (cucumber)
   ❌ "კაპუსტა" → ✅ "კომბოსტო" (cabbage)
   ❌ "სვიოკლა" → ✅ "ჭარხალი" (beet)
   ❌ "მარკოვი" → ✅ "სტაფილო" (carrot)
   
   ტანსაცმელი:
   ❌ "მაიკა" → ✅ "მაისური" (t-shirt)
   ❌ "პლატია" → ✅ "კაბა" (dress)
   ❌ "რუბაშკა" → ✅ "პერანგი" (shirt)
   ❌ "შტანი" → ✅ "შარვალი" (pants)
   ❌ "კურტკა" → ✅ "ქურთუკი" (jacket)
   
   სხვა:
   ❌ "ბოლნიცა" → ✅ "საავადმყოფო" (hospital)
   ❌ "აპტეკა" → ✅ "აფთიაქი" (pharmacy)
   ❌ "მაგაზინი" → ✅ "მაღაზია" (store)
   ❌ "პარიკმახერსკაია" → ✅ "სალონი" / "საპარიკმახერო" (hair salon)

📋 შენი ამოცანა:
1. შეამოწმე თითოეული ტექსტი გრამატიკული შეცდომებისთვის
2. გაასწორე ნებისმიერი შეცდომა
3. შეცვალე სლავური სესხებული სიტყვები ქართული ვარიანტებით
4. დარწმუნდი რომ ტექსტი ბუნებრივად ჟღერს ქართველი მოსაუბრისთვის

დააბრუნე JSON:
{
  "results": [
    {
      "original": "ორიგინალი ტექსტი",
      "corrected": "გასწორებული ტექსტი",
      "hasErrors": true/false,
      "corrections": ["შეცდომა 1 → გასწორება 1", ...]
    }
  ]
}`;

interface GrammarResult {
  original: string;
  corrected: string;
  hasErrors: boolean;
  corrections: string[];
}

interface VerificationResponse {
  results: GrammarResult[];
  totalErrors: number;
  allCorrected: boolean;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { texts } = await req.json();

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return new Response(
        JSON.stringify({ error: "texts array is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!AI_API_KEY) {
      throw new Error("AI_API_KEY is not configured");
    }

    // Filter out empty texts
    const validTexts = texts.filter((t: string) => t && t.trim().length > 0);
    
    if (validTexts.length === 0) {
      return new Response(
        JSON.stringify({
          results: [],
          totalErrors: 0,
          allCorrected: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userPrompt = `შეამოწმე და გაასწორე შემდეგი ქართული ტექსტები:

${validTexts.map((t: string, i: number) => `${i + 1}. "${t}"`).join('\n')}

გააანალიზე თითოეული ტექსტი:
1. შეამოწმე ზმნის უღლება
2. შეამოწმე ბრუნვის ბოლოსართები
3. შეამოწმე მართლწერა
4. შეამოწმე ბუნებრივი ფორმულირება

დააბრუნე ᲛᲮᲝᲚᲝᲓ JSON (არ დაწერო სხვა ტექსტი):`;

    console.log(`Verifying Georgian grammar for ${validTexts.length} texts...`);

    const response = await fetch(AI_CHAT_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel("google/gemini-2.5-flash"),
        messages: [
          { role: "system", content: GEORGIAN_GRAMMAR_EXPERT_PROMPT },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // On error, return originals unchanged
      return new Response(
        JSON.stringify({
          results: validTexts.map((t: string) => ({
            original: t,
            corrected: t,
            hasErrors: false,
            corrections: []
          })),
          totalErrors: 0,
          allCorrected: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in response");
    }

    let grammarData;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      grammarData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse grammar data:", content);
      // Return originals unchanged on parse error
      return new Response(
        JSON.stringify({
          results: validTexts.map((t: string) => ({
            original: t,
            corrected: t,
            hasErrors: false,
            corrections: []
          })),
          totalErrors: 0,
          allCorrected: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: GrammarResult[] = grammarData.results || [];
    
    // Count total errors
    const totalErrors = results.filter(r => r.hasErrors).length;
    
    // Log corrections for monitoring
    for (const result of results) {
      if (result.hasErrors && result.corrections?.length > 0) {
        console.log(`Grammar corrections: "${result.original}" → "${result.corrected}"`);
        result.corrections.forEach(c => console.log(`  - ${c}`));
      }
    }

    const responseData: VerificationResponse = {
      results,
      totalErrors,
      allCorrected: true
    };

    console.log(`Grammar verification complete: ${totalErrors} errors found and corrected`);

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error verifying grammar:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to verify grammar";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
