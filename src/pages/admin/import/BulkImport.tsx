import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  PackagePlus, Upload, Loader2, CheckCircle2, XCircle, AlertTriangle, 
  Download, FileJson, BarChart3, Wand2
} from 'lucide-react';
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { useAdminQuestions } from '@/hooks/useAdminQuestions';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { QuestionPreviewList, SelectableParsedQuestion } from './QuestionPreviewList';
import { validateQuestion, ParsedQuestion } from '@/hooks/useQuestionParser';
import { cn } from '@/lib/utils';

// Category slug to UUID mapping (from database)
const CATEGORY_SLUG_MAP: Record<string, string> = {
  anime_manga: 'b9a45cde-fa7a-47e4-bdd2-35b58085b95d',
  archaeology: '54ae077e-d975-4e7d-b710-75a9b7b05d60',
  architecture: '5e49f995-e562-42fa-a452-9a38ee8efeb0',
  astronomy: '342a8343-2671-4faa-a870-008cb2bf319e',
  biology: '17a65a4f-22a9-4e41-b312-0990f68ff04e',
  nature: '16f4b260-ccbd-4885-abac-604115bf3b74',
  geography: 'b352d1cf-a825-48a3-b85b-b916368669a3',
  geology: '5e0d45ac-c8bd-431d-a072-e8df2b643c8a',
  ecology: 'cf214615-056c-4b13-b047-b61be0d6a6f5',
  economics: 'c384d660-dc34-4e4a-bbbc-919c0009c8c1',
  languages: '747e57c5-56b9-48bd-af27-5b2bde9dc7a4',
  video_games: 'a4e83e6a-93dd-450a-b7ed-00c10278089e',
  movies: 'cd03367e-62fd-425e-a81a-cd5664149e14',
  space: '6713f663-9f5e-46fe-874e-d1e808abab79',
  math: 'a9bd3fe7-d241-4265-86fd-eab21226bd49',
  medicine: 'a21bad24-764e-4310-8355-101f7d593299',
  memes_internet: 'fd2b667e-1735-44df-b577-822aa05dfc0d',
  science: 'fe5c3271-5e40-4c6a-828c-0854f30af501',
  myths_reality: '3af995ce-b0a9-4221-9964-fe738e5f2e47',
  fashion: '8d7a3d46-705b-43a8-8a40-d57d86615721',
  world_history: '0ab371b2-85c5-4016-b14e-8e352caa6e6d',
  world_cuisine: '5de491b3-b02f-4402-b1d5-f1506ac3513d',
  music: '80b2b8b6-8637-43a2-b78b-6fe502609fa1',
  politics: 'b078f516-0f47-4c2b-83cd-8efc6165cc89',
  pop_culture: '0faf0fd6-dafc-4fb0-9719-dd639a089bbc',
  programming: '9a515acc-54fc-4bbf-80b1-cfa21cb7ceb3',
  religion_mythology: 'f86cec23-8436-47e8-be96-9f4be204ceb0',
  robotics_ai: '62d2aef2-f69e-4506-afa5-fef756e52da7',
  military_history: '83af5aca-52b1-4499-adf9-77f256ea0908',
  georgian_history: '88c4ac45-a37c-4a8e-9f22-9012b0e6df3c',
  fun_facts: '730095eb-5d25-4c37-b8f2-88a880dbec27',
  tv_series: 'ae1bcb74-802a-4169-a549-56200c4a4873',
  social_media: 'b3db9b77-a0c3-439f-8403-4076affe4818',
  sports: '25442741-92ef-4d73-8ea3-071fdd20201a',
  technology: '23f43d93-5fc3-4a00-9381-f1efb1cf7765',
  physics: 'ad8cc9d2-06e8-4ada-865a-0b7a24a96b81',
  philosophy: 'd10a457a-02f9-423e-8104-df9d965663d9',
  psychology: '331241d2-6aa9-4107-8f12-7108f3749e35',
  georgian_culture: '3ddbd6b0-e031-4fa3-99ce-e8c1f89e193f',
  georgian_literature: '7eb970df-fd5a-474f-9c2f-52ab0d2b4371',
  georgian_cuisine: 'a1adbfea-6fe4-42e2-8a2c-da35423c90fb',
  chemistry: 'ba1eb6cc-c9d9-4e08-b5f5-7cb11fdfd116',
  celebrities: 'c38e0f1f-3325-4027-be2f-dcb253985096',
  animals: '9e7ed994-2920-4a9e-b25a-cc97b15cf1bd',
  art: 'd0ac21f1-f19f-4fdb-8582-265d9c6c00ae',
};

interface BulkQuestion {
  category_slug: string;
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  language: string;
  icon_keyword?: string;
}

interface ImportStats {
  total: number;
  valid: number;
  invalid: number;
  byCategory: Record<string, number>;
  byDifficulty: Record<string, number>;
  byLanguage: Record<string, number>;
  unmappedCategories: string[];
}

export function BulkImport() {
  const [questions, setQuestions] = useState<SelectableParsedQuestion[]>([]);
  const [rawData, setRawData] = useState<BulkQuestion[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<number, string>>({}); // index -> category_id
  const [languageMap, setLanguageMap] = useState<Record<number, string>>({}); // index -> language
  const [destination, setDestination] = useState<'library' | 'production'>('library');
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [assigningIcons, setAssigningIcons] = useState(false);
  const [fileName, setFileName] = useState('');
  const { toast } = useToast();
  const { bulkAddQuestions } = useAdminQuestions();

  const stats: ImportStats | null = useMemo(() => {
    if (questions.length === 0) return null;
    const valid = questions.filter(q => q.isValid).length;
    const byCategory: Record<string, number> = {};
    const byDifficulty: Record<string, number> = {};
    const byLanguage: Record<string, number> = {};
    const unmappedCategories: string[] = [];

    rawData.forEach((q, i) => {
      const slug = q.category_slug;
      byCategory[slug] = (byCategory[slug] || 0) + 1;
      byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] || 0) + 1;
      byLanguage[q.language] = (byLanguage[q.language] || 0) + 1;
      if (!CATEGORY_SLUG_MAP[slug] && !unmappedCategories.includes(slug)) {
        unmappedCategories.push(slug);
      }
    });

    return {
      total: questions.length,
      valid,
      invalid: questions.length - valid,
      byCategory,
      byDifficulty,
      byLanguage,
      unmappedCategories,
    };
  }, [questions, rawData]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const items: BulkQuestion[] = json.questions || (Array.isArray(json) ? json : [json]);

        if (items.length === 0) {
          toast({ title: 'შეცდომა', description: 'კითხვები ვერ მოიძებნა ფაილში', variant: 'destructive' });
          return;
        }

        setRawData(items);
        const catMap: Record<number, string> = {};
        const langMap: Record<number, string> = {};

        const parsed: SelectableParsedQuestion[] = items.map((item, idx) => {
          const categoryId = CATEGORY_SLUG_MAP[item.category_slug];
          if (categoryId) catMap[idx] = categoryId;
          langMap[idx] = item.language || 'ka';

          const q: Partial<ParsedQuestion> = {
            question_text: item.question_text || '',
            correct_answer: item.correct_answer || '',
            incorrect_answers: item.incorrect_answers || [],
            difficulty: item.difficulty || 'medium',
            level_number: 1,
            icon_keyword: item.icon_keyword || null,
          };

          const validation = validateQuestion(q);
          
          // Add category mapping warning
          if (!categoryId && item.category_slug) {
            validation.warnings.push(`კატეგორია "${item.category_slug}" ვერ მოიძებნა`);
            validation.isValid = false;
          }

          return {
            ...q,
            ...validation,
            selected: validation.isValid,
          } as SelectableParsedQuestion;
        });

        setCategoryMap(catMap);
        setLanguageMap(langMap);
        setQuestions(parsed);

        toast({
          title: 'ფაილი წაიკითხა',
          description: `${items.length} კითხვა მოიძებნა`,
        });
      } catch (err: any) {
        toast({ title: 'შეცდომა', description: 'არასწორი JSON ფორმატი: ' + (err.message || ''), variant: 'destructive' });
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-uploaded
    e.target.value = '';
  }, [toast]);

  const handleAutoAssignIcons = async () => {
    const questionsWithoutIcons = questions
      .map((q, idx) => ({ idx, q }))
      .filter(({ q }) => !q.icon_keyword && q.question_text);

    if (questionsWithoutIcons.length === 0) {
      toast({ title: 'ინფო', description: 'ყველა კითხვას უკვე აქვს აიკონი' });
      return;
    }

    setAssigningIcons(true);
    try {
      // Send to edge function in batches of 100
      const batchSize = 100;
      const updates: { idx: number; slug: string }[] = [];

      for (let i = 0; i < questionsWithoutIcons.length; i += batchSize) {
        const batch = questionsWithoutIcons.slice(i, i + batchSize);
        const payload = batch.map(({ idx, q }) => ({
          question_index: idx,
          question_text: q.question_text,
          correct_answer: q.correct_answer,
          category_name: rawData[idx]?.category_slug || '',
        }));

        const { data, error } = await supabase.functions.invoke('bulk-import-assign-icons', {
          body: { questions: payload },
        });

        if (!error && data?.assignments) {
          updates.push(...data.assignments);
        }
      }

      // Apply icon assignments
      if (updates.length > 0) {
        setQuestions(prev => {
          const updated = [...prev];
          for (const { idx, slug } of updates) {
            if (updated[idx]) {
              updated[idx] = { ...updated[idx], icon_keyword: slug };
            }
          }
          return updated;
        });
        toast({ title: 'აიკონები მინიჭებულია', description: `${updates.length} კითხვას მიენიჭა აიკონი` });
      } else {
        toast({ title: 'ინფო', description: 'აიკონების მინიჭება ვერ მოხერხდა', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Icon assignment error:', err);
      toast({ title: 'შეცდომა', description: 'აიკონების მინიჭება ვერ მოხერხდა', variant: 'destructive' });
    } finally {
      setAssigningIcons(false);
    }
  };

  const handleImport = async () => {
    const selectedQuestions = questions
      .map((q, idx) => ({ q, idx }))
      .filter(({ q }) => q.selected && q.isValid);

    if (selectedQuestions.length === 0) {
      toast({ title: 'შეცდომა', description: 'არჩეული კითხვები ვერ მოიძებნა', variant: 'destructive' });
      return;
    }

    setImporting(true);
    setImportProgress(0);

    try {
      const chunkSize = 100;
      let imported = 0;

      for (let i = 0; i < selectedQuestions.length; i += chunkSize) {
        const chunk = selectedQuestions.slice(i, i + chunkSize);
        const questionsToImport = chunk.map(({ q, idx }) => ({
          category_id: categoryMap[idx] || '',
          question_text: q.question_text,
          correct_answer: q.correct_answer,
          incorrect_answers: q.incorrect_answers,
          difficulty: q.difficulty,
          level_number: q.level_number || 1,
          language: languageMap[idx] || 'ka',
          icon_slug: q.icon_keyword || null,
          is_active: true,
          in_production: destination === 'production',
        }));

        const result = await bulkAddQuestions(questionsToImport);
        if (result) {
          imported += result.length;
        }
        setImportProgress(Math.round(((i + chunk.length) / selectedQuestions.length) * 100));
      }

      toast({ title: 'იმპორტი დასრულდა', description: `${imported} კითხვა დაემატა ${destination === 'production' ? 'პროდაქშენში' : 'ბიბლიოთეკაში'}` });
      
      // Clear state
      setQuestions([]);
      setRawData([]);
      setCategoryMap({});
      setLanguageMap({});
      setFileName('');
    } catch (err: any) {
      console.error('Import error:', err);
      toast({ title: 'შეცდომა', description: err.message || 'იმპორტი ვერ მოხერხდა', variant: 'destructive' });
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  };

  const handleUpdate = (index: number, updates: Partial<SelectableParsedQuestion>) => {
    setQuestions(prev => {
      const updated = [...prev];
      const q = { ...updated[index], ...updates };
      const validation = validateQuestion(q);
      updated[index] = { ...q, ...validation };
      return updated;
    });
  };

  const handleRemove = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
    setRawData(prev => prev.filter((_, i) => i !== index));
  };

  const handleSelectionChange = (index: number, selected: boolean) => {
    setQuestions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], selected };
      return updated;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    setQuestions(prev => prev.map(q => ({ ...q, selected: q.isValid ? selected : false })));
  };

  const selectedCount = questions.filter(q => q.selected && q.isValid).length;
  const validCount = questions.filter(q => q.isValid).length;

  return (
    <div className="space-y-6">
      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5" />
            მასობრივი იმპორტი
          </CardTitle>
          <CardDescription>
            ატვირთეთ JSON ფაილი ათასობით კითხვით. გამოიყენეთ სქემა-ფაილი AI აგენტებისთვის.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 items-center">
            <Label htmlFor="bulk-file" className="cursor-pointer">
              <div className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md border-2 border-dashed transition-colors",
                "hover:border-primary hover:bg-primary/5",
                fileName ? "border-green-500/50 bg-green-500/5" : "border-border"
              )}>
                <Upload className="h-4 w-4" />
                <span className="text-sm">{fileName || 'აირჩიეთ JSON ფაილი'}</span>
              </div>
              <input
                id="bulk-file"
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </Label>

            <a href="/question-import-schema.json" download className="inline-flex">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                სქემა
              </Button>
            </a>
            <a href="/question-quality-guide.md" download className="inline-flex">
              <Button variant="outline" size="sm">
                <FileJson className="h-4 w-4 mr-1" />
                ინსტრუქცია
              </Button>
            </a>
          </div>

          {/* Expected format hint */}
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">მოსალოდნელი ფორმატი:</p>
            <pre className="whitespace-pre-wrap font-mono">
{`{
  "questions": [
    {
      "category_slug": "astronomy",
      "question_text": "რომელია ყველაზე დიდი პლანეტა?",
      "correct_answer": "იუპიტერი",
      "incorrect_answers": ["სატურნი", "მარსი", "ნეპტუნი"],
      "difficulty": "easy",
      "language": "ka",
      "icon_keyword": "planet"
    }
  ]
}`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Stats Dashboard */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              სტატისტიკა
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">სულ</div>
              </div>
              <div className="rounded-lg bg-green-500/10 p-3 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.valid}</div>
                <div className="text-xs text-muted-foreground">ვალიდური</div>
              </div>
              <div className="rounded-lg bg-destructive/10 p-3 text-center">
                <div className="text-2xl font-bold text-destructive">{stats.invalid}</div>
                <div className="text-xs text-muted-foreground">პრობლემური</div>
              </div>
              <div className="rounded-lg bg-primary/10 p-3 text-center">
                <div className="text-2xl font-bold text-primary">{selectedCount}</div>
                <div className="text-xs text-muted-foreground">არჩეული</div>
              </div>
            </div>

            {/* Category breakdown */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {Object.entries(stats.byCategory).map(([slug, count]) => (
                <Badge 
                  key={slug} 
                  variant={CATEGORY_SLUG_MAP[slug] ? 'secondary' : 'destructive'}
                  className="text-xs"
                >
                  {slug}: {count}
                </Badge>
              ))}
            </div>

            {/* Difficulty breakdown */}
            <div className="flex gap-2 mb-3">
              {Object.entries(stats.byDifficulty).map(([diff, count]) => (
                <Badge key={diff} variant="outline" className={cn(
                  "text-xs",
                  diff === 'easy' && 'border-green-500/50 text-green-600',
                  diff === 'medium' && 'border-yellow-500/50 text-yellow-600',
                  diff === 'hard' && 'border-red-500/50 text-red-600',
                )}>
                  {diff}: {count}
                </Badge>
              ))}
            </div>

            {/* Language breakdown */}
            <div className="flex gap-2 mb-3">
              {Object.entries(stats.byLanguage).map(([lang, count]) => (
                <Badge key={lang} variant="outline" className="text-xs">
                  {lang}: {count}
                </Badge>
              ))}
            </div>

            {/* Unmapped categories warning */}
            {stats.unmappedCategories.length > 0 && (
              <div className="bg-destructive/10 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">უცნობი კატეგორიები:</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.unmappedCategories.join(', ')}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview & Import */}
      {questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>კითხვების გადახედვა ({questions.length})</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAutoAssignIcons}
                  disabled={assigningIcons}
                >
                  {assigningIcons ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4 mr-1" />
                  )}
                  აიკონების მინიჭება
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Destination selection */}
            <div className="flex items-center gap-6">
              <Label className="text-sm font-medium">დანიშნულება:</Label>
              <RadioGroup
                value={destination}
                onValueChange={(v) => setDestination(v as 'library' | 'production')}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="library" id="dest-library" />
                  <Label htmlFor="dest-library" className="text-sm cursor-pointer">ბიბლიოთეკა</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="production" id="dest-production" />
                  <Label htmlFor="dest-production" className="text-sm cursor-pointer">პროდაქშენი</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Question list */}
            <QuestionPreviewList
              questions={questions}
              onUpdate={handleUpdate}
              onRemove={handleRemove}
              onSelectionChange={handleSelectionChange}
              onSelectAll={handleSelectAll}
              showSelection
            />

            {/* Import button */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleImport}
                disabled={importing || selectedCount === 0}
                className="min-w-[200px]"
              >
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    იმპორტი... {importProgress}%
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {selectedCount} კითხვის იმპორტი
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => { setQuestions([]); setRawData([]); setFileName(''); }}>
                გასუფთავება
              </Button>
            </div>

            {importing && <Progress value={importProgress} className="h-2" />}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
