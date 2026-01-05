import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GenerationPanel } from '@/components/admin/flow/GenerationPanel';
import { QuestionPreviewList } from '@/components/admin/flow/QuestionPreviewList';
import { QuestionQueue } from '@/components/admin/flow/QuestionQueue';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GeneratedQuestion {
  id: string;
  questionText: string;
  correctAnswer: string;
  incorrectAnswers: string[];
  categoryId: string;
  categoryName: string;
  difficulty: string;
  language: string;
  iconSlug?: string;
  status: 'pending' | 'approved' | 'rejected';
  isValid: boolean;
  warnings: string[];
}

export interface Category {
  id: string;
  name: string;
  category_id: string;
}

const LANGUAGES = [
  { code: 'ka', name: 'Georgian', flag: '🇬🇪' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'pt-br', name: 'Portuguese', flag: '🇧🇷' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'nb', name: 'Norwegian', flag: '🇳🇴' },
  { code: 'da', name: 'Danish', flag: '🇩🇰' },
  { code: 'fi', name: 'Finnish', flag: '🇫🇮' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'cs', name: 'Czech', flag: '🇨🇿' },
  { code: 'sk', name: 'Slovak', flag: '🇸🇰' },
  { code: 'hu', name: 'Hungarian', flag: '🇭🇺' },
  { code: 'ro', name: 'Romanian', flag: '🇷🇴' },
  { code: 'hr', name: 'Croatian', flag: '🇭🇷' },
  { code: 'sr-latn', name: 'Serbian', flag: '🇷🇸' },
];

export { LANGUAGES };

export default function Flow() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [stats, setStats] = useState({ inLib: 0, inProd: 0 });

  useEffect(() => {
    fetchCategories();
    fetchStats();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, category_id')
      .eq('is_active', true)
      .order('name');
    
    if (error) {
      console.error('Error fetching categories:', error);
      return;
    }
    setCategories(data || []);
  };

  const fetchStats = async () => {
    const { count: libCount } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('in_production', false);
    
    const { count: prodCount } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('in_production', true);
    
    setStats({ inLib: libCount || 0, inProd: prodCount || 0 });
  };

  const handleQuestionsGenerated = (questions: GeneratedQuestion[]) => {
    setGeneratedQuestions(prev => [...questions, ...prev]);
  };

  const handleApprove = (id: string) => {
    setGeneratedQuestions(prev =>
      prev.map(q => q.id === id ? { ...q, status: 'approved' as const } : q)
    );
  };

  const handleReject = (id: string) => {
    setGeneratedQuestions(prev =>
      prev.map(q => q.id === id ? { ...q, status: 'rejected' as const } : q)
    );
  };

  const handleBulkApprove = (ids: string[]) => {
    setGeneratedQuestions(prev =>
      prev.map(q => ids.includes(q.id) ? { ...q, status: 'approved' as const } : q)
    );
  };

  const handleBulkReject = (ids: string[]) => {
    setGeneratedQuestions(prev =>
      prev.map(q => ids.includes(q.id) ? { ...q, status: 'rejected' as const } : q)
    );
  };

  const handlePublishToLib = async () => {
    const approved = generatedQuestions.filter(q => q.status === 'approved' && q.isValid);
    if (approved.length === 0) {
      toast.error('No approved questions to publish');
      return;
    }

    const questionsToInsert = approved.map(q => ({
      question_text: q.questionText,
      correct_answer: q.correctAnswer,
      incorrect_answers: q.incorrectAnswers,
      category_id: q.categoryId,
      difficulty: q.difficulty,
      icon_slug: q.iconSlug,
      in_production: false,
      is_active: true,
    }));

    const { error } = await supabase.from('questions').insert(questionsToInsert);
    
    if (error) {
      console.error('Error publishing questions:', error);
      toast.error('Failed to publish questions');
      return;
    }

    toast.success(`Published ${approved.length} questions to Library`);
    setGeneratedQuestions(prev => prev.filter(q => q.status !== 'approved'));
    fetchStats();
  };

  const handlePublishToProd = async () => {
    const approved = generatedQuestions.filter(q => q.status === 'approved' && q.isValid);
    if (approved.length === 0) {
      toast.error('No approved questions to publish');
      return;
    }

    const questionsToInsert = approved.map(q => ({
      question_text: q.questionText,
      correct_answer: q.correctAnswer,
      incorrect_answers: q.incorrectAnswers,
      category_id: q.categoryId,
      difficulty: q.difficulty,
      icon_slug: q.iconSlug,
      in_production: true,
      is_active: true,
    }));

    const { error } = await supabase.from('questions').insert(questionsToInsert);
    
    if (error) {
      console.error('Error publishing questions:', error);
      toast.error('Failed to publish questions');
      return;
    }

    toast.success(`Published ${approved.length} questions to Production`);
    setGeneratedQuestions(prev => prev.filter(q => q.status !== 'approved'));
    fetchStats();
  };

  const handleClearRejected = () => {
    setGeneratedQuestions(prev => prev.filter(q => q.status !== 'rejected'));
  };

  const pendingCount = generatedQuestions.filter(q => q.status === 'pending').length;
  const approvedCount = generatedQuestions.filter(q => q.status === 'approved').length;
  const rejectedCount = generatedQuestions.filter(q => q.status === 'rejected').length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-card/30">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span className="text-2xl">⚡</span>
          Flow - Question Factory
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate, review, and publish questions in 20 languages
        </p>
      </div>

      {/* Three Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Generation Panel */}
        <div className="w-80 border-r border-border/50 flex flex-col bg-card/20">
          <ScrollArea className="flex-1">
            <GenerationPanel
              categories={categories}
              languages={LANGUAGES}
              onQuestionsGenerated={handleQuestionsGenerated}
              isGenerating={isGenerating}
              setIsGenerating={setIsGenerating}
            />
          </ScrollArea>
        </div>

        {/* Middle: Preview & Review */}
        <div className="flex-1 flex flex-col bg-background/50">
          <QuestionPreviewList
            questions={generatedQuestions}
            onApprove={handleApprove}
            onReject={handleReject}
            onBulkApprove={handleBulkApprove}
            onBulkReject={handleBulkReject}
            languages={LANGUAGES}
          />
        </div>

        {/* Right: Queue */}
        <div className="w-72 border-l border-border/50 bg-card/20">
          <QuestionQueue
            pendingCount={pendingCount}
            approvedCount={approvedCount}
            rejectedCount={rejectedCount}
            inLibCount={stats.inLib}
            inProdCount={stats.inProd}
            onPublishToLib={handlePublishToLib}
            onPublishToProd={handlePublishToProd}
            onClearRejected={handleClearRejected}
          />
        </div>
      </div>
    </div>
  );
}
