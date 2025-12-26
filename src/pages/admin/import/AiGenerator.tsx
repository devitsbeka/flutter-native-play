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
import { QuestionPreviewList } from './QuestionPreviewList';
import { validateQuestion, ParsedQuestion } from '@/hooks/useQuestionParser';

// Normalize text for comparison (lowercase, trim, remove extra spaces)
function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Check if two questions are similar (simple similarity check)
function areSimilarQuestions(q1: string, q2: string): boolean {
  const n1 = normalizeText(q1);
  const n2 = normalizeText(q2);
  
  // Exact match
  if (n1 === n2) return true;
  
  // Check if one contains the other (for slight variations)
  if (n1.length > 20 && n2.length > 20) {
    if (n1.includes(n2) || n2.includes(n1)) return true;
  }
  
  return false;
}

export function AiGenerator() {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [count, setCount] = useState(10);
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
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
        .eq('category_id', selectedCategory);

      const existingTexts = (existingQuestions || []).map(q => q.question_text);

      // Generate questions in batches of 5
      const allQuestions: ParsedQuestion[] = [];
      const seenQuestions = new Set<string>();
      const batches = Math.ceil(count / 5);
      let totalDuplicates = 0;

      for (let i = 0; i < batches; i++) {
        const { data, error } = await supabase.functions.invoke('generate-category-trivia', {
          body: {
            category: selectedCategoryData.name,
            difficulty,
            topic: topic || undefined,
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

    const validQuestions = parsedQuestions.filter((q) => q.isValid);
    if (validQuestions.length === 0) {
      toast({
        title: 'შეცდომა',
        description: 'ვალიდური კითხვები არ მოიძებნა',
        variant: 'destructive',
      });
      return;
    }

    setImporting(true);
    try {
      const questionsToImport = validQuestions.map((q) => ({
        category_id: selectedCategory,
        question_text: q.question_text,
        correct_answer: q.correct_answer,
        incorrect_answers: q.incorrect_answers,
        difficulty: q.difficulty,
        level_number: q.level_number,
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
  const invalidCount = parsedQuestions.length - validCount;

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
                disabled={importing || validCount === 0}
                className="flex-1"
              >
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    იმპორტი...
                  </>
                ) : (
                  `${validCount} კითხვის იმპორტი`
                )}
              </Button>
              <Button variant="outline" onClick={() => setParsedQuestions([])}>
                გასუფთავება
              </Button>
            </div>

            <QuestionPreviewList questions={parsedQuestions} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
