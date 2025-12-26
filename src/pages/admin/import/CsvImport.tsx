import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileSpreadsheet, Loader2, Upload, Copy } from 'lucide-react';
import { useQuestionParser } from '@/hooks/useQuestionParser';
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { useAdminQuestions } from '@/hooks/useAdminQuestions';
import { QuestionPreviewList } from './QuestionPreviewList';
import { useToast } from '@/hooks/use-toast';

const EXAMPLE_CSV = `question,correct_answer,wrong1,wrong2,wrong3,difficulty,level
რა არის საქართველოს დედაქალაქი?,თბილისი,ბათუმი,ქუთაისი,რუსთავი,easy,1
რომელი მდინარე ჩაედინება შავ ზღვაში?,რიონი,მტკვარი,არაგვი,ალაზანი,medium,1`;

export function CsvImport() {
  const [csvText, setCsvText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const { parsedQuestions, parseFromCsv, clearParsedQuestions } = useQuestionParser();
  const { categories } = useAdminCategories();
  const { bulkAddQuestions } = useAdminQuestions();
  const { toast } = useToast();
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
    };
    reader.readAsText(file);
  };

  const handleParse = () => {
    if (!csvText.trim()) {
      toast({
        title: 'შეცდომა',
        description: 'გთხოვთ შეიყვანოთ CSV',
        variant: 'destructive',
      });
      return;
    }
    parseFromCsv(csvText);
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
        setCsvText('');
      }
    } finally {
      setImporting(false);
    }
  };

  const copyExample = () => {
    setCsvText(EXAMPLE_CSV);
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
            <FileSpreadsheet className="h-5 w-5" />
            CSV იმპორტი
          </CardTitle>
          <CardDescription>
            ატვირთეთ CSV ფაილი ან ჩასვით CSV ტექსტი. სვეტები: question, correct_answer, wrong1, wrong2, wrong3, difficulty, level
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              CSV ატვირთვა
            </Button>
            <Button variant="ghost" onClick={copyExample}>
              <Copy className="h-4 w-4 mr-1" />
              მაგალითი
            </Button>
          </div>

          <div>
            <Label htmlFor="csv">CSV მონაცემები</Label>
            <Textarea
              id="csv"
              placeholder={EXAMPLE_CSV}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="font-mono text-sm min-h-[150px]"
            />
          </div>

          <div className="flex gap-3">
            <Button onClick={handleParse} disabled={!csvText.trim()}>
              გარჩევა
            </Button>
            {csvText && (
              <Button variant="outline" onClick={() => setCsvText('')}>
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
