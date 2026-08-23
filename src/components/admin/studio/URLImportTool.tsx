import { useState } from 'react';
import { Link2, Loader2, Check, X, AlertTriangle, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { QuestionTypeSelector } from './QuestionTypeSelector';
import { MediaPreview } from './MediaPreview';
import { QuestionType, CategoryWithCounts } from '@/hooks/useQuestionStudio';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/lib/toast";
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface URLImportToolProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryWithCounts[];
  onImport: (questions: GeneratedQuestion[]) => Promise<void>;
}

interface GeneratedQuestion {
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  image_url?: string;
  video_url?: string;
  audio_url?: string;
}

interface ParsedContent {
  title: string;
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
  favicon?: string;
}

export function URLImportTool({
  open,
  onOpenChange,
  categories,
  onImport,
}: URLImportToolProps) {
  const [url, setUrl] = useState('');
  const [questionType, setQuestionType] = useState<QuestionType | null>(null);
  const [questionCount, setQuestionCount] = useState('5');
  const [categoryId, setCategoryId] = useState('');

  const [scanning, setScanning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [importing, setImporting] = useState(false);

  const [parsedContent, setParsedContent] = useState<ParsedContent | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());

  const resetState = () => {
    setUrl('');
    setQuestionType(null);
    setQuestionCount('5');
    setCategoryId('');
    setParsedContent(null);
    setGeneratedQuestions([]);
    setSelectedQuestions(new Set());
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(resetState, 200);
  };

  const handleScan = async () => {
    if (!url.trim()) return;

    setScanning(true);
    setParsedContent(null);
    setGeneratedQuestions([]);

    try {
      const { data, error } = await supabase.functions.invoke('parse-wikipedia-media', {
        body: { url, questionType: questionType || 'text' },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Parsing failed');

      setParsedContent({
        title: data.title,
        content: data.content,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        favicon: data.favicon,
      });

      toast.success('გვერდი წარმატებით დასკანირდა');
    } catch (err) {
      console.error('Scan error:', err);
      toast.error('გვერდის სკანირება ვერ მოხერხდა');
    } finally {
      setScanning(false);
    }
  };

  const handleGenerate = async () => {
    if (!parsedContent || !questionType) return;

    setGenerating(true);
    setGeneratedQuestions([]);

    try {
      const { data, error } = await supabase.functions.invoke('generate-media-questions', {
        body: {
          title: parsedContent.title,
          content: parsedContent.content,
          mediaUrl: parsedContent.mediaUrl,
          questionType,
          questionCount: parseInt(questionCount),
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Generation failed');

      const questions = data.questions as GeneratedQuestion[];
      setGeneratedQuestions(questions);
      setSelectedQuestions(new Set(questions.map((_, i) => i)));

      toast.success(`${questions.length} კითხვა დაგენერირდა`);
    } catch (err) {
      console.error('Generation error:', err);
      toast.error('კითხვების გენერაცია ვერ მოხერხდა');
    } finally {
      setGenerating(false);
    }
  };

  const toggleQuestion = (index: number) => {
    setSelectedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleImport = async () => {
    if (!categoryId || selectedQuestions.size === 0) return;

    setImporting(true);
    try {
      const questionsToImport = generatedQuestions.filter((_, i) => selectedQuestions.has(i));
      await onImport(questionsToImport);
      toast.success(`${questionsToImport.length} კითხვა იმპორტირდა`);
      handleClose();
    } catch (err) {
      console.error('Import error:', err);
      toast.error('იმპორტი ვერ მოხერხდა');
    } finally {
      setImporting(false);
    }
  };

  const canScan = url.trim() && questionType;
  const canGenerate = parsedContent && questionType;
  const canImport = categoryId && selectedQuestions.size > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            URL იმპორტი
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Step 1: URL & Type */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>URL (Wikipedia ან სხვა)</Label>
              <div className="flex gap-2">
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://ka.wikipedia.org/wiki/..."
                  className="flex-1"
                />
                {url && (
                  <Button variant="ghost" size="icon" asChild>
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>კითხვის ტიპი</Label>
              <QuestionTypeSelector
                selectedType={questionType}
                onSelect={setQuestionType}
              />
            </div>

            <div className="flex items-end gap-4">
              <div className="space-y-2 flex-1">
                <Label>რაოდენობა</Label>
                <Select value={questionCount} onValueChange={setQuestionCount}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleScan} disabled={!canScan || scanning}>
                {scanning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                სკანირება
              </Button>
            </div>
          </div>

          {/* Step 2: Preview */}
          {parsedContent && (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="flex items-center gap-2">
                {parsedContent.favicon && (
                  <img src={parsedContent.favicon} alt="" className="h-5 w-5" />
                )}
                <h3 className="font-medium">{parsedContent.title}</h3>
              </div>

              {parsedContent.mediaUrl && questionType && questionType !== 'text' && (
                <MediaPreview
                  type={questionType}
                  url={parsedContent.mediaUrl}
                  className="h-40"
                />
              )}

              <p className="text-sm text-muted-foreground line-clamp-3">
                {parsedContent.content.slice(0, 300)}...
              </p>

              <Button onClick={handleGenerate} disabled={!canGenerate || generating}>
                {generating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                დაგენერირება
              </Button>
            </div>
          )}

          {/* Step 3: Generated Questions */}
          {generatedQuestions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>გენერირებული კითხვები ({selectedQuestions.size}/{generatedQuestions.length})</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (selectedQuestions.size === generatedQuestions.length) {
                      setSelectedQuestions(new Set());
                    } else {
                      setSelectedQuestions(new Set(generatedQuestions.map((_, i) => i)));
                    }
                  }}
                >
                  {selectedQuestions.size === generatedQuestions.length ? 'ყველას მოხსნა' : 'ყველას მონიშვნა'}
                </Button>
              </div>

              <ScrollArea className="h-64 border rounded-lg">
                <div className="p-2 space-y-2">
                  {generatedQuestions.map((q, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedQuestions.has(i)
                          ? 'bg-primary/10 border-primary/30'
                          : 'bg-card hover:bg-muted/50'
                      }`}
                      onClick={() => toggleQuestion(i)}
                    >
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={selectedQuestions.has(i)}
                          onCheckedChange={() => toggleQuestion(i)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{q.question_text}</p>
                          <p className="text-xs text-green-600 mt-1">✓ {q.correct_answer}</p>
                          <p className="text-xs text-muted-foreground">
                            {q.incorrect_answers.join(' • ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Step 4: Import */}
          {generatedQuestions.length > 0 && (
            <div className="border-t pt-4 space-y-4">
              <div className="space-y-2">
                <Label>კატეგორია *</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="აირჩიეთ კატეგორია" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>
                  გაუქმება
                </Button>
                <Button onClick={handleImport} disabled={!canImport || importing}>
                  {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  იმპორტი ({selectedQuestions.size})
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
