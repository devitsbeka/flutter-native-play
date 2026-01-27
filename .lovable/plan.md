

# Fix AI Suggestions: Persistent Refresh with Duplicate Prevention

## Problems Identified

1. **Refresh returns same suggestions** - The AI doesn't know what was already shown, so clicking refresh can return duplicate suggestions
2. **Previously selected topics reappear** - When refreshing, topics you already added as subjects show up again in recommendations

## Solution

Track ALL topics that have been shown or selected during the session, and pass them to the edge function to exclude when generating new suggestions.

## Technical Changes

### File 1: `src/components/admin/studio/bulk/StepCategorySelect.tsx`

Add state to track all used/shown topics and pass them to the edge function:

```typescript
// Add new state to track all topics ever shown or selected
const [usedTopics, setUsedTopics] = useState<Set<string>>(new Set());

// Update fetchSuggestions to accept exclusion list
const fetchSuggestions = async (excludeTopics: string[] = []) => {
  if (!selectedCategory) {
    setAllSuggestions([]);
    return;
  }
  
  setIsLoadingSuggestions(true);
  try {
    const { data, error } = await supabase.functions.invoke('generate-topic-suggestions', {
      body: { 
        categoryName: selectedCategory.name,
        excludeTopics: excludeTopics  // Pass topics to exclude
      }
    });
    
    if (error) throw error;
    
    const newSuggestions = data?.suggestions || [];
    
    // Add new suggestions to used topics set
    setUsedTopics(prev => {
      const updated = new Set(prev);
      newSuggestions.forEach((s: string) => updated.add(s));
      return updated;
    });
    
    setAllSuggestions(newSuggestions);
  } catch (err) {
    console.error('Failed to fetch suggestions:', err);
    setAllSuggestions([]);
  } finally {
    setIsLoadingSuggestions(false);
  }
};

// Update refresh to exclude all previously used topics
const refreshSuggestions = () => {
  // Combine current subjects with all previously shown suggestions
  const toExclude = [...subjects, ...Array.from(usedTopics)];
  fetchSuggestions(toExclude);
};

// When adding a subject, also add to usedTopics
const addSubject = (subject: string) => {
  if (subject.trim() && !subjects.includes(subject.trim())) {
    onSubjectsChange([...subjects, subject.trim()]);
    setUsedTopics(prev => new Set(prev).add(subject.trim()));
  }
};

// Reset usedTopics when category changes
useEffect(() => {
  setUsedTopics(new Set());
  fetchSuggestions([]);
}, [selectedCategory?.id]);
```

### File 2: `supabase/functions/generate-topic-suggestions/index.ts`

Update to accept and use the exclusion list:

```typescript
serve(async (req) => {
  // ...existing code...
  
  try {
    const { categoryName, excludeTopics = [] } = await req.json();
    
    // ...existing category detection code...
    
    // Add exclusion instruction to prompt
    let excludeInstruction = '';
    if (excludeTopics.length > 0) {
      excludeInstruction = `\n\nIMPORTANT: Do NOT include any of these already-used topics: ${excludeTopics.join(', ')}. Generate completely different suggestions.`;
    }
    
    const fullPrompt = prompt + excludeInstruction;
    
    // Use the fullPrompt in the AI call
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: "You are a trivia question expert. Always return valid JSON arrays with specific, famous names. Never repeat topics from the exclusion list." 
          },
          { role: "user", content: fullPrompt }
        ],
        temperature: 0.95, // Higher temperature for more variety
      }),
    });
    
    // ...rest of existing code...
    
    // Filter out any excluded topics that might still appear
    const filteredSuggestions = suggestions.filter(
      (s: string) => !excludeTopics.some(
        (e: string) => e.toLowerCase() === s.toLowerCase()
      )
    );
    
    return new Response(
      JSON.stringify({ 
        suggestions: filteredSuggestions.slice(0, 12),
        categoryType 
      }),
      // ...
    );
  }
});
```

## Flow Diagram

```text
Initial Load:
┌──────────────────┐     ┌─────────────────────┐
│ Select Category  │────>│ Fetch 12 suggestions│
└──────────────────┘     │ usedTopics = []     │
                         └─────────────────────┘
                                   │
                                   v
                         ┌─────────────────────┐
                         │ Show 6 suggestions  │
                         │ Store all 12 in     │
                         │ usedTopics Set      │
                         └─────────────────────┘

Click Refresh:
┌──────────────────┐     ┌─────────────────────┐
│ Click Refresh    │────>│ Fetch NEW 12 topics │
│                  │     │ excludeTopics =     │
│                  │     │   usedTopics +      │
│                  │     │   subjects          │
└──────────────────┘     └─────────────────────┘
                                   │
                                   v
                         ┌─────────────────────┐
                         │ Show 6 NEW topics   │
                         │ Add to usedTopics   │
                         └─────────────────────┘

Select Topic:
┌──────────────────┐     ┌─────────────────────┐
│ Click "+ Messi"  │────>│ Add to subjects     │
│                  │     │ Add to usedTopics   │
│                  │     │ Remove from visible │
└──────────────────┘     └─────────────────────┘
```

## Expected Behavior After Fix

1. **First load**: Shows 6 random athletes (e.g., Messi, Ronaldo, Pelé, Jordan, LeBron, Bolt)
2. **Click "+ Messi"**: Messi moves to subjects, next suggestion from pool appears
3. **Click Refresh**: Fetches 12 NEW names, excluding all previously shown + selected
4. **Click Refresh again**: Fetches 12 MORE new names, none repeated from before

## Summary

| File | Changes |
|------|---------|
| `StepCategorySelect.tsx` | Add `usedTopics` Set state, pass exclusions to edge function, update refresh logic |
| `generate-topic-suggestions/index.ts` | Accept `excludeTopics` param, add exclusion instruction to prompt, filter results |

