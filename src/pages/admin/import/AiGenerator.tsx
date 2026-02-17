import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Sparkles, Loader2, AlertTriangle, Search } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { useAdminQuestions } from '@/hooks/useAdminQuestions';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { QuestionPreviewList, SelectableParsedQuestion } from './QuestionPreviewList';
import { validateQuestion } from '@/hooks/useQuestionParser';

// Simple exact-match dedup for within-session batch only
function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/[?.!,;:'"()]/g, '').replace(/\s+/g, ' ');
}

export function AiGenerator() {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [count, setCount] = useState(10);
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [useResearch, setUseResearch] = useState(true);
  const [parsedQuestions, setParsedQuestions] = useState<SelectableParsedQuestion[]>([]);
  const [importing, setImporting] = useState(false);
  const [duplicatesFound, setDuplicatesFound] = useState(0);

  const { categories } = useAdminCategories();
  const { bulkAddQuestions } = useAdminQuestions();
  const { toast } = useToast();

  const selectedCategoryData = categories.find((c) => c.id === selectedCategory);

  const handleGenerate = async () => {
    if (!selectedCategory || !selectedCategoryData) {
      toast({
        title: 'შეცდომა',
        description: 'გთხოვთ აირჩიოთ კატეგორია',
        variant: 'destructive',
      });
      return;
    }

    setGenerating(true);
    setParsedQuestions([]);
    setDuplicatesFound(0);
    setGenerationProgress(0);

    try {
      // Step 1: Extract topic fingerprint
      setGenerationStatus('თემების ანალიზი...');
      setGenerationProgress(10);

      let coveredTopics: string[] = [];
      let existingAnswers: string[] = [];
      try {
        const { data: topicData, error: topicError } = await supabase.functions.invoke('extract-category-topics', {
          body: { categoryId: selectedCategory },
        });
        if (!topicError && topicData?.topics) {
          coveredTopics = topicData.topics;
          existingAnswers = topicData.existingAnswers || [];
          console.log(`Extracted ${coveredTopics.length} covered topics, ${existingAnswers.length} existing answers`);
        }
      } catch (topicErr) {
        console.warn('Topic extraction failed:', topicErr);
      }

      // Step 2: Research phase (if enabled)
      let researchedFacts: any[] = [];
      if (useResearch) {
        setGenerationStatus('ახალი ფაქტების მოძიება...');
        setGenerationProgress(30);

        try {
          const { data: researchData, error: researchError } = await supabase.functions.invoke('research-category-facts', {
            body: {
              category: selectedCategoryData.name,
              coveredTopics,
              existingAnswers,
              count: Math.max(count + 10, 25), // Request extra to account for filtering
            },
          });
          if (!researchError && researchData?.facts) {
            researchedFacts = researchData.facts;
            console.log(`Researched ${researchedFacts.length} fresh facts`);
          }
        } catch (researchErr) {
          console.warn('Research failed, falling back to standard generation:', researchErr);
        }
      }

      setGenerationProgress(50);
      setGenerationStatus('კითხვების გენერირება...');

      // Generate questions - if we have researched facts, do it in one call
      const allQuestions: SelectableParsedQuestion[] = [];
      const seenQuestions = new Set<string>();
      const batches = researchedFacts.length > 0 ? 1 : Math.ceil(count / 5);
      let totalDuplicates = 0;

      for (let i = 0; i < batches; i++) {
        setGenerationProgress(50 + Math.round((i / batches) * 40));
        
        const { data, error } = await supabase.functions.invoke('generate-category-trivia', {
          body: {
            category: selectedCategoryData.name,
            categoryId: selectedCategoryData.category_id,
            categoryDescription: selectedCategoryData.description,
            difficulty,
            topic: topic || undefined,
            coveredTopics,
            researchedFacts: researchedFacts.length > 0 ? researchedFacts : undefined,
          },
        });

        if (error) throw error;

        if (data.questions) {
          for (const q of data.questions) {
            const normalizedQ = {
              question_text: q.question_text || q.question || '',
              correct_answer: q.correct_answer || '',
              incorrect_answers: q.incorrect_answers || [],
              difficulty: q.difficulty || difficulty,
              level_number: q.level_number || 1,
              icon_keyword: q.icon_keyword || null,
            };

            const normalizedText = normalizeText(normalizedQ.question_text);

            // Only check for duplicates within current session batch
            if (seenQuestions.has(normalizedText)) {
              totalDuplicates++;
              continue;
            }

            seenQuestions.add(normalizedText);
            
            const validation = validateQuestion(normalizedQ);
            allQuestions.push({
              ...normalizedQ,
              ...validation,
              selected: true,
            });
          }
        }

        // Stop if we have enough unique questions
        if (allQuestions.length >= count) break;
      }
      setGenerationProgress(95);
      setGenerationStatus('დასრულება...');

      // Trim to requested count
      const finalQuestions = allQuestions.slice(0, count);
      setParsedQuestions(finalQuestions);
      setDuplicatesFound(totalDuplicates);
      setGenerationProgress(100);

      const researchNote = researchedFacts.length > 0 ? ` (${researchedFacts.length} ახალი ფაქტიდან)` : '';
      toast({
        title: 'წარმატება',
        description: totalDuplicates > 0 
          ? `${finalQuestions.length} უნიკალური კითხვა გენერირდა${researchNote} (${totalDuplicates} დუბლიკატი გაფილტრდა)`
          : `${finalQuestions.length} კითხვა გენერირდა${researchNote}`,
      });
    } catch (err: any) {
      console.error('Error generating questions:', err);
      toast({
        title: 'შეცდომა',
        description: err.message || 'კითხვების გენერაცია ვერ მოხერხდა',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
      setGenerationStatus('');
      setGenerationProgress(0);
    }
  };

  const handleImport = async () => {
    if (!selectedCategory) {
      toast({
        title: 'შეცდომა',
        description: 'გთხოვთ აირჩიოთ კატეგორია',
        variant: 'destructive',
      });
      return;
    }

    const selectedQuestions = parsedQuestions.filter((q) => q.isValid && q.selected);
    if (selectedQuestions.length === 0) {
      toast({
        title: 'შეცდომა',
        description: 'გთხოვთ აირჩიოთ კითხვები იმპორტისთვის',
        variant: 'destructive',
      });
      return;
    }

    setImporting(true);
    try {
      const questionsToImport = selectedQuestions.map((q) => ({
        category_id: selectedCategory,
        question_text: q.question_text,
        correct_answer: q.correct_answer,
        incorrect_answers: q.incorrect_answers,
        difficulty: q.difficulty,
        level_number: q.level_number,
        icon_slug: (q as any).icon_keyword || null, // Map icon_keyword to icon_slug
        is_active: true,
      }));

      const result = await bulkAddQuestions(questionsToImport);
      if (result) {
        setParsedQuestions([]);
      }
    } finally {
      setImporting(false);
    }
  };

  const validCount = parsedQuestions.filter((q) => q.isValid).length;
  const selectedCount = parsedQuestions.filter((q) => q.isValid && q.selected).length;
  const invalidCount = parsedQuestions.length - validCount;

  const handleSelectionChange = (index: number, selected: boolean) => {
    setParsedQuestions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], selected };
      return updated;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    setParsedQuestions(prev => 
      prev.map(q => q.isValid ? { ...q, selected } : q)
    );
  };

  const handleUpdate = (index: number, updates: Partial<SelectableParsedQuestion>) => {
    setParsedQuestions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
  };

  const handleRemove = (index: number) => {
    setParsedQuestions(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI გენერატორი
          </CardTitle>
          <CardDescription>
            ხელოვნური ინტელექტი ავტომატურად გენერირებს კითხვებს არჩეული კატეგორიისთვის
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>კატეგორია</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="აირჩიეთ კატეგორია" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>სირთულე</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as 'easy' | 'medium' | 'hard')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">მარტივი</SelectItem>
                  <SelectItem value="medium">საშუალო</SelectItem>
                  <SelectItem value="hard">რთული</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>თემა / საკვანძო სიტყვები (არასავალდებულო)</Label>
            <Input
              placeholder="მაგ: უძველესი ისტორია, მეფეები, არქიტექტურა..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                ვებ კვლევა (ახალი ფაქტები)
              </Label>
              <p className="text-sm text-muted-foreground">
                AI მოიძიებს ახალ, ნაკლებად ცნობილ ფაქტებს კითხვების გენერაციამდე
              </p>
            </div>
            <Switch checked={useResearch} onCheckedChange={setUseResearch} />
          </div>

          <div>
            <Label>კითხვების რაოდენობა: {count}</Label>
            <Slider
              value={[count]}
              onValueChange={(v) => setCount(v[0])}
              min={5}
              max={50}
              step={5}
              className="mt-2"
            />
          </div>

          {generating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{generationStatus}</span>
                <span className="text-muted-foreground">{generationProgress}%</span>
              </div>
              <Progress value={generationProgress} className="h-2" />
            </div>
          )}

          <Button onClick={handleGenerate} disabled={generating || !selectedCategory} className="w-full">
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {generationStatus || 'გენერირება...'}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {count} კითხვის გენერაცია
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {parsedQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>გენერირებული კითხვები ({parsedQuestions.length})</span>
              <div className="flex items-center gap-2 text-sm font-normal">
                {duplicatesFound > 0 && (
                  <span className="flex items-center gap-1 text-amber-500">
                    <AlertTriangle className="h-4 w-4" />
                    {duplicatesFound} დუბლიკატი გაფილტრდა
                  </span>
                )}
                <span className="text-green-500">✓ {validCount} ვალიდური</span>
                {invalidCount > 0 && (
                  <span className="text-destructive">✗ {invalidCount} პრობლემური</span>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button
                onClick={handleImport}
                disabled={importing || selectedCount === 0}
                className="flex-1"
              >
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    იმპორტი...
                  </>
                ) : (
                  `${selectedCount} კითხვის იმპორტი`
                )}
              </Button>
              <Button variant="outline" onClick={() => setParsedQuestions([])}>
                გასუფთავება
              </Button>
            </div>

            <QuestionPreviewList 
              questions={parsedQuestions} 
              showSelection={true}
              onSelectionChange={handleSelectionChange}
              onSelectAll={handleSelectAll}
              onUpdate={handleUpdate}
              onRemove={handleRemove}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
