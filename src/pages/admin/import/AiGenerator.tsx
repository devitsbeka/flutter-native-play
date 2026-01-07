import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Sparkles, Loader2, AlertTriangle } from 'lucide-react';
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { useAdminQuestions } from '@/hooks/useAdminQuestions';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { QuestionPreviewList, SelectableParsedQuestion } from './QuestionPreviewList';
import { validateQuestion } from '@/hooks/useQuestionParser';

// Normalize text for comparison (lowercase, trim, remove extra spaces and punctuation)
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[?.!,;:'"()]/g, '')
    .replace(/\s+/g, ' ');
}

// Extract keywords from text (numbers, significant words)
function extractKeywords(text: string): Set<string> {
  const normalized = normalizeText(text);
  // Extract numbers (years, quantities)
  const numbers = text.match(/\d+/g) || [];
  // Extract words longer than 3 characters
  const words = normalized.split(' ').filter(w => w.length > 3);
  return new Set([...numbers, ...words]);
}

// Calculate Jaccard similarity between two texts
function calculateSimilarity(q1: string, q2: string): number {
  const keywords1 = extractKeywords(q1);
  const keywords2 = extractKeywords(q2);
  
  if (keywords1.size === 0 || keywords2.size === 0) return 0;
  
  const intersection = [...keywords1].filter(k => keywords2.has(k));
  const union = new Set([...keywords1, ...keywords2]);
  
  return intersection.length / union.size;
}

// Check if two questions are similar using multiple methods
function areSimilarQuestions(q1: string, q2: string): boolean {
  const n1 = normalizeText(q1);
  const n2 = normalizeText(q2);
  
  // Exact match
  if (n1 === n2) return true;
  
  // Check if one contains the other (for slight variations)
  if (n1.length > 15 && n2.length > 15) {
    if (n1.includes(n2) || n2.includes(n1)) return true;
  }
  
  // Jaccard similarity check - 0.6 threshold catches semantic duplicates
  const similarity = calculateSimilarity(q1, q2);
  if (similarity >= 0.6) return true;
  
  return false;
}

export function AiGenerator() {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [count, setCount] = useState(10);
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);
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

    try {
      // Fetch existing questions for this category to check duplicates
      const { data: existingQuestions } = await supabase
        .from('questions')
        .select('question_text')
        .eq('category_id', selectedCategory)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(200); // Get last 200 questions for thorough duplicate checking

      const existingTexts = (existingQuestions || []).map(q => q.question_text);

      // Generate questions in batches of 5
      const allQuestions: SelectableParsedQuestion[] = [];
      const seenQuestions = new Set<string>();
      const batches = Math.ceil(count / 5);
      let totalDuplicates = 0;

      for (let i = 0; i < batches; i++) {
        // Pass full category context to AI so it generates relevant questions
        const { data, error } = await supabase.functions.invoke('generate-category-trivia', {
          body: {
            category: selectedCategoryData.name,
            categoryId: selectedCategoryData.category_id, // e.g. "georgian_history"
            categoryDescription: selectedCategoryData.description, // Full description for context
            difficulty,
            topic: topic || undefined,
            existingQuestions: existingTexts, // Send existing questions to AI
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
              icon_keyword: q.icon_keyword || null, // Store icon keyword from AI
            };

            const questionText = normalizedQ.question_text;
            const normalizedText = normalizeText(questionText);

            // Check for duplicates in existing DB questions
            const isDuplicateInDb = existingTexts.some(existing => 
              areSimilarQuestions(existing, questionText)
            );

            // Check for duplicates in current batch
            const isDuplicateInBatch = seenQuestions.has(normalizedText);

            if (isDuplicateInDb || isDuplicateInBatch) {
              totalDuplicates++;
              continue; // Skip duplicate
            }

            seenQuestions.add(normalizedText);
            
            const validation = validateQuestion(normalizedQ);
            allQuestions.push({
              ...normalizedQ,
              ...validation,
              selected: true, // Auto-select valid questions
            });
          }
        }

        // Stop if we have enough unique questions
        if (allQuestions.length >= count) break;
      }

      // Trim to requested count
      const finalQuestions = allQuestions.slice(0, count);
      setParsedQuestions(finalQuestions);
      setDuplicatesFound(totalDuplicates);

      toast({
        title: 'წარმატება',
        description: totalDuplicates > 0 
          ? `${finalQuestions.length} უნიკალური კითხვა გენერირდა (${totalDuplicates} დუბლიკატი გაფილტრდა)`
          : `${finalQuestions.length} კითხვა გენერირდა`,
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

          <Button onClick={handleGenerate} disabled={generating || !selectedCategory} className="w-full">
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                გენერირება...
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
