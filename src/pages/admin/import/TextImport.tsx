import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Loader2, Copy } from 'lucide-react';
import { useQuestionParser } from '@/hooks/useQuestionParser';
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { useAdminQuestions } from '@/hooks/useAdminQuestions';
import { QuestionPreviewList } from './QuestionPreviewList';
import { useToast } from '@/hooks/use-toast';

const EXAMPLE_TEXT = `1. რა არის საქართველოს დედაქალაქი?
A) თბილისი ✓
B) ბათუმი
C) ქუთაისი
D) რუსთავი

2. რომელი მდინარე ჩაედინება შავ ზღვაში?
a) მტკვარი
b) რიონი *
c) არაგვი
d) ალაზანი

კითხვა: რა წელს დაარსდა თბილისი?
სწორი: 458 წელს
არასწორი: 500 წელს, 400 წელს, 600 წელს`;

export function TextImport() {
  const [text, setText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const { parsing, parsedQuestions, parseFromText, clearParsedQuestions } = useQuestionParser();
  const { categories } = useAdminCategories();
  const { bulkAddQuestions } = useAdminQuestions();
  const { toast } = useToast();
  const [importing, setImporting] = useState(false);

  const handleParse = async () => {
    if (!text.trim()) {
      toast({
        title: 'შეცდომა',
        description: 'გთხოვთ შეიყვანოთ ტექსტი',
        variant: 'destructive',
      });
      return;
    }
    await parseFromText(text);
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
        setText('');
      }
    } finally {
      setImporting(false);
    }
  };

  const copyExample = () => {
    setText(EXAMPLE_TEXT);
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
            <FileText className="h-5 w-5" />
            ტექსტის იმპორტი
          </CardTitle>
          <CardDescription>
            ჩასვით ნებისმიერი ფორმატის ტექსტი კითხვებით და AI ავტომატურად გარჩევს. მხარდაჭერილია სხვადასხვა ფორმატი.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="text">ტექსტი კითხვებით</Label>
              <Button variant="ghost" size="sm" onClick={copyExample}>
                <Copy className="h-4 w-4 mr-1" />
                მაგალითი
              </Button>
            </div>
            <Textarea
              id="text"
              placeholder={EXAMPLE_TEXT}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[250px]"
            />
          </div>

          <div className="flex gap-3">
            <Button onClick={handleParse} disabled={parsing || !text.trim()}>
              {parsing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  გარჩევა...
                </>
              ) : (
                'AI გარჩევა'
              )}
            </Button>
            {text && (
              <Button variant="outline" onClick={() => setText('')}>
                გასუფთავება
              </Button>
            )}
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-2">მხარდაჭერილი ფორმატები:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>A/B/C/D ვარიანტებით (✓, *, (correct) მარკერი სწორ პასუხზე)</li>
              <li>ნუმერაციით (1. 2. 3. ...)</li>
              <li>"კითხვა:" / "სწორი:" / "არასწორი:" ფორმატი</li>
              <li>ნებისმიერი სხვა ფორმატი - AI შეეცდება გარჩევას</li>
            </ul>
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
