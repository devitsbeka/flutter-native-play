import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link2, Loader2, AlertTriangle, Download, Check, X, Globe, Brain, FileText, Sparkles, ChevronDown, ChevronUp, Edit2 } from 'lucide-react';
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { useAdminQuestions } from '@/hooks/useAdminQuestions';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { validateQuestion, ParsedQuestion, CHAR_LIMITS } from '@/hooks/useQuestionParser';
import { cn } from '@/lib/utils';

interface ExtendedParsedQuestion extends ParsedQuestion {
  approved?: boolean;
}

type ParsingStep = 'idle' | 'scraping' | 'analyzing' | 'extracting' | 'validating' | 'complete' | 'error';

interface StepStatus {
  step: ParsingStep;
  label: string;
  description: string;
  icon: React.ElementType;
}

const STEPS: StepStatus[] = [
  { step: 'scraping', label: 'გვერდის წაკითხვა', description: 'Firecrawl იღებს გვერდის შინაარსს...', icon: Globe },
  { step: 'analyzing', label: 'კონტენტის ანალიზი', description: 'AI აანალიზებს ტექსტს...', icon: Brain },
  { step: 'extracting', label: 'კითხვების ამოღება', description: 'ვპოულობთ კვიზის კითხვებს...', icon: FileText },
  { step: 'validating', label: 'ვალიდაცია', description: 'კითხვების შემოწმება...', icon: Sparkles },
];

export function ParserTool() {
  const [url, setUrl] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentStep, setCurrentStep] = useState<ParsingStep>('idle');
  const [parsedQuestions, setParsedQuestions] = useState<ExtendedParsedQuestion[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scrapedContent, setScrapedContent] = useState<string | null>(null);
  
  const { categories } = useAdminCategories();
  const { bulkAddQuestions } = useAdminQuestions();
  const { toast } = useToast();
  const [importing, setImporting] = useState(false);

  const handleParse = useCallback(async () => {
    if (!url.trim()) {
      toast({
        title: 'შეცდომა',
        description: 'გთხოვთ შეიყვანოთ URL',
        variant: 'destructive',
      });
      return;
    }

    setCurrentStep('scraping');
    setErrorMessage(null);
    setParsedQuestions([]);
    setScrapedContent(null);

    try {
      // Simulate step progression for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      setCurrentStep('analyzing');
      
      const { data, error } = await supabase.functions.invoke('parse-quiz-url', {
        body: { url },
      });

      if (error) throw error;

      setCurrentStep('extracting');
      await new Promise(resolve => setTimeout(resolve, 300));

      if (!data.success) {
        throw new Error(data.error || 'გვერდის დამუშავება ვერ მოხერხდა');
      }

      setCurrentStep('validating');
      await new Promise(resolve => setTimeout(resolve, 300));

      // Store scraped content for debugging
      if (data.scrapedContent) {
        setScrapedContent(data.scrapedContent);
      }

      const questions = (data.questions || []).map((q: any) => {
        const validation = validateQuestion(q);
        return {
          ...q,
          difficulty: q.difficulty || 'medium',
          level_number: q.level_number || 1,
          ...validation,
          approved: true, // Default to approved
        };
      });

      setParsedQuestions(questions);
      setCurrentStep('complete');

      if (questions.length === 0) {
        toast({
          title: 'კითხვები ვერ მოიძებნა',
          description: 'გვერდზე ვერ მოიძებნა კვიზის კითხვები. სცადეთ სხვა URL.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'წარმატება!',
          description: `${questions.length} კითხვა მოიძებნა`,
        });
      }
    } catch (err: any) {
      console.error('Error parsing URL:', err);
      setCurrentStep('error');
      setErrorMessage(err.message || 'URL-ის დამუშავება ვერ მოხერხდა');
      toast({
        title: 'შეცდომა',
        description: err.message || 'URL-ის დამუშავება ვერ მოხერხდა',
        variant: 'destructive',
      });
    }
  }, [url, toast]);

  const handleImport = async () => {
    if (!selectedCategory) {
      toast({
        title: 'შეცდომა',
        description: 'გთხოვთ აირჩიოთ კატეგორია',
        variant: 'destructive',
      });
      return;
    }

    const approvedQuestions = parsedQuestions.filter((q) => q.approved && q.isValid);
    if (approvedQuestions.length === 0) {
      toast({
        title: 'შეცდომა',
        description: 'დასამტკიცებელი კითხვები არ მოიძებნა',
        variant: 'destructive',
      });
      return;
    }

    setImporting(true);
    try {
      const questionsToImport = approvedQuestions.map((q) => ({
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
        setUrl('');
        setCurrentStep('idle');
        toast({
          title: 'წარმატება!',
          description: `${approvedQuestions.length} კითხვა დაემატა`,
        });
      }
    } finally {
      setImporting(false);
    }
  };

  const toggleQuestionApproval = (index: number) => {
    setParsedQuestions(prev => prev.map((q, i) => 
      i === index ? { ...q, approved: !q.approved } : q
    ));
  };

  const removeQuestion = (index: number) => {
    setParsedQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const resetParser = () => {
    setCurrentStep('idle');
    setParsedQuestions([]);
    setErrorMessage(null);
    setScrapedContent(null);
  };

  const isParsing = ['scraping', 'analyzing', 'extracting', 'validating'].includes(currentStep);
  const approvedCount = parsedQuestions.filter(q => q.approved && q.isValid).length;
  const totalCount = parsedQuestions.length;

  return (
    <div className="space-y-6">
      {/* Input Card */}
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
                disabled={isParsing}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleParse} disabled={isParsing || !url.trim()}>
                {isParsing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    მუშავდება...
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

      {/* Progress Panel */}
      <AnimatePresence mode="wait">
        {currentStep !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className={cn(
              "border-2",
              currentStep === 'error' ? "border-destructive/50" : 
              currentStep === 'complete' ? "border-success/50" : "border-primary/50"
            )}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {currentStep === 'error' ? (
                      <X className="h-5 w-5 text-destructive" />
                    ) : currentStep === 'complete' ? (
                      <Check className="h-5 w-5 text-success" />
                    ) : (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    )}
                    {currentStep === 'error' ? 'შეცდომა' : 
                     currentStep === 'complete' ? 'დასრულდა!' : 'მუშავდება...'}
                  </span>
                  {(currentStep === 'complete' || currentStep === 'error') && (
                    <Button variant="ghost" size="sm" onClick={resetParser}>
                      თავიდან
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Steps Progress */}
                <div className="space-y-3">
                  {STEPS.map((step, index) => {
                    const stepIndex = STEPS.findIndex(s => s.step === currentStep);
                    const thisStepIndex = index;
                    const isActive = currentStep === step.step;
                    const isCompleted = stepIndex > thisStepIndex || currentStep === 'complete';
                    const isPending = stepIndex < thisStepIndex && currentStep !== 'error' && currentStep !== 'complete';
                    
                    return (
                      <motion.div
                        key={step.step}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg transition-colors",
                          isActive && "bg-primary/10",
                          isCompleted && "bg-success/10",
                          isPending && "opacity-40"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                          isActive && "bg-primary text-primary-foreground",
                          isCompleted && "bg-success text-success-foreground",
                          isPending && "bg-muted text-muted-foreground"
                        )}>
                          {isCompleted ? (
                            <Check className="h-5 w-5" />
                          ) : isActive ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <step.icon className="h-5 w-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "font-medium",
                            isActive && "text-primary",
                            isCompleted && "text-success"
                          )}>
                            {step.label}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {isActive ? step.description : isCompleted ? 'დასრულდა' : 'მოლოდინში'}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Error Message */}
                {currentStep === 'error' && errorMessage && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg"
                  >
                    <p className="text-sm text-destructive">{errorMessage}</p>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Questions Preview Panel */}
      <AnimatePresence>
        {parsedQuestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    ამოღებული კითხვები ({totalCount})
                  </span>
                  <div className="flex items-center gap-2 text-sm font-normal">
                    <span className="text-success flex items-center gap-1">
                      <Check className="h-4 w-4" /> {approvedCount} დამტკიცებული
                    </span>
                    <span className="text-muted-foreground">
                      / {totalCount - approvedCount} უარყოფილი
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Import Controls */}
                <div className="flex gap-3 items-end p-4 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <Label>კატეგორია</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="აირჩიეთ კატეგორია" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.icon} {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleImport}
                    disabled={importing || approvedCount === 0 || !selectedCategory}
                    className="bg-success hover:bg-success/90"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        იმპორტი...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        {approvedCount} კითხვის იმპორტი
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={resetParser}>
                    გასუფთავება
                  </Button>
                </div>

                {/* Questions List */}
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {parsedQuestions.map((question, index) => (
                    <QuestionPreviewCard
                      key={index}
                      question={question}
                      index={index}
                      onToggleApprove={() => toggleQuestionApproval(index)}
                      onRemove={() => removeQuestion(index)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface QuestionPreviewCardProps {
  question: ExtendedParsedQuestion;
  index: number;
  onToggleApprove: () => void;
  onRemove: () => void;
}

function QuestionPreviewCard({ question, index, onToggleApprove, onRemove }: QuestionPreviewCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isApproved = question.approved ?? true;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "border rounded-lg overflow-hidden transition-colors",
        isApproved ? "border-border" : "border-destructive/30 bg-destructive/5"
      )}
    >
      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        {/* Approve/Reject Toggle */}
        <button
          onClick={onToggleApprove}
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors",
            isApproved 
              ? "bg-success text-success-foreground" 
              : "bg-destructive/20 text-destructive hover:bg-destructive/30"
          )}
        >
          {isApproved ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </button>

        {/* Question Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={cn(
              "font-medium text-sm",
              !isApproved && "text-muted-foreground line-through"
            )}>
              {index + 1}. {question.question_text}
            </p>
            <div className="flex items-center gap-1 shrink-0">
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full",
                question.difficulty === 'easy' && "bg-success/20 text-success",
                question.difficulty === 'medium' && "bg-amber-500/20 text-amber-600",
                question.difficulty === 'hard' && "bg-destructive/20 text-destructive"
              )}>
                {question.difficulty === 'easy' ? 'მარტივი' : 
                 question.difficulty === 'medium' ? 'საშუალო' : 'რთული'}
              </span>
            </div>
          </div>

          {/* Validation Warnings */}
          {question.warnings && question.warnings.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {question.warnings.map((warning, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-600">
                  {warning}
                </span>
              ))}
            </div>
          )}

          {/* Expand/Collapse */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? 'დამალვა' : 'პასუხების ნახვა'}
          </button>
        </div>

        {/* Remove Button */}
        <button
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive p-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Expanded Content - Answers */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t bg-muted/30 overflow-hidden"
          >
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                <span className="text-sm font-medium text-success">{question.correct_answer}</span>
              </div>
              {question.incorrect_answers.map((ans, i) => (
                <div key={i} className="flex items-center gap-2">
                  <X className="h-4 w-4 text-destructive/50" />
                  <span className="text-sm text-muted-foreground">{ans}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
