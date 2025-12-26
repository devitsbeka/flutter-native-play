import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileJson, Loader2, Copy } from 'lucide-react';
import { useQuestionParser } from '@/hooks/useQuestionParser';
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { useAdminQuestions } from '@/hooks/useAdminQuestions';
import { QuestionPreviewList } from './QuestionPreviewList';
import { useToast } from '@/hooks/use-toast';

const EXAMPLE_JSON = `[
  {
    "question": "რა არის საქართველოს დედაქალაქი?",
    "correct": "თბილისი",
    "wrong": ["ბათუმი", "ქუთაისი", "რუსთავი"]
  },
  {
    "question_text": "რომელი მდინარე ჩაედინება შავ ზღვაში?",
    "correct_answer": "რიონი",
    "incorrect_answers": ["მტკვარი", "არაგვი", "ალაზანი"],
    "difficulty": "medium",
    "level_number": 1
  }
]`;

export function JsonImport() {
  const [jsonText, setJsonText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const { parsedQuestions, parseFromJson, clearParsedQuestions, updateQuestion, removeQuestion } = useQuestionParser();
  const { categories } = useAdminCategories();
  const { bulkAddQuestions } = useAdminQuestions();
  const { toast } = useToast();
  const [importing, setImporting] = useState(false);

  const handleParse = () => {
    if (!jsonText.trim()) {
      toast({
        title: 'შეცდომა',
        description: 'გთხოვთ შეიყვანოთ JSON',
        variant: 'destructive',
      });
      return;
    }
    parseFromJson(jsonText);
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
        setJsonText('');
      }
    } finally {
      setImporting(false);
    }
  };

  const copyExample = () => {
    setJsonText(EXAMPLE_JSON);
    toast({
      title: 'კოპირებულია',
      description: 'მაგალითი ჩასმულია',
    });
  };

  const validCount = parsedQuestions.filter((q) => q.isValid).length;
  const invalidCount = parsedQuestions.length - validCount;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            JSON იმპორტი
          </CardTitle>
          <CardDescription>
            ჩასვით JSON ფორმატში კითხვები. მხარდაჭერილია ორივე - მარტივი და სრული ფორმატი.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="json">JSON მონაცემები</Label>
              <Button variant="ghost" size="sm" onClick={copyExample}>
                <Copy className="h-4 w-4 mr-1" />
                მაგალითი
              </Button>
            </div>
            <Textarea
              id="json"
              placeholder={EXAMPLE_JSON}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="font-mono text-sm min-h-[200px]"
            />
          </div>

          <div className="flex gap-3">
            <Button onClick={handleParse} disabled={!jsonText.trim()}>
              გარჩევა
            </Button>
            {jsonText && (
              <Button variant="outline" onClick={() => setJsonText('')}>
                გასუფთავება
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {parsedQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>გარჩეული კითხვები ({parsedQuestions.length})</span>
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
