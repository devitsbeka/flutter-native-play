import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link2, Loader2, AlertTriangle, Download } from 'lucide-react';
import { useQuestionParser } from '@/hooks/useQuestionParser';
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { useAdminQuestions } from '@/hooks/useAdminQuestions';
import { QuestionPreviewList } from './QuestionPreviewList';
import { useToast } from '@/hooks/use-toast';

export function ParserTool() {
  const [url, setUrl] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const { parsing, parsedQuestions, parseFromUrl, clearParsedQuestions } = useQuestionParser();
  const { categories } = useAdminCategories();
  const { bulkAddQuestions } = useAdminQuestions();
  const { toast } = useToast();
  const [importing, setImporting] = useState(false);

  const handleParse = async () => {
    if (!url.trim()) {
      toast({
        title: 'შეცდომა',
        description: 'გთხოვთ შეიყვანოთ URL',
        variant: 'destructive',
      });
      return;
    }
    await parseFromUrl(url);
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
        clearParsedQuestions();
        setUrl('');
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
            <Link2 className="h-5 w-5" />
            URL Parser
          </CardTitle>
          <CardDescription>
            შეიყვანეთ ვებ-გვერდის მისამართი კვიზებით და AI ავტომატურად ამოიღებს კითხვებს
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="url">ვებ-გვერდის URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com/quiz"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={parsing}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleParse} disabled={parsing || !url.trim()}>
                {parsing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    იტვირთება...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    ამოღება
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-foreground">მოითხოვს Firecrawl კონექტორს</p>
                <p>URL Parser-ის გამოსაყენებლად საჭიროა Firecrawl კონექტორის დაკავშირება. გადადით Settings → Connectors</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {parsedQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>ამოღებული კითხვები ({parsedQuestions.length})</span>
              <div className="flex items-center gap-2 text-sm font-normal">
                <span className="text-green-500">✓ {validCount} ვალიდური</span>
                {invalidCount > 0 && (
                  <span className="text-destructive">✗ {invalidCount} პრობლემური</span>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
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
              <Button
                onClick={handleImport}
                disabled={importing || validCount === 0 || !selectedCategory}
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
              <Button variant="outline" onClick={clearParsedQuestions}>
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
