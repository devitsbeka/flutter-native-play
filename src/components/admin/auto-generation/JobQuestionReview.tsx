import { useState, useEffect, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Trash2,
  Upload,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/lib/toast";

interface JobQuestion {
  id: string;
  job_id: string;
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty: string;
  category_id: string;
  category_name: string;
  icon_slug: string | null;
  status: string;
  is_duplicate: boolean;
  duplicate_of: string | null;
  validation_warnings: string[] | null;
  created_at: string;
}

interface JobQuestionReviewProps {
  jobId?: string;
}

export const JobQuestionReview = forwardRef<HTMLDivElement, JobQuestionReviewProps>(
  function JobQuestionReview({ jobId }, ref) {
  const [questions, setQuestions] = useState<JobQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [importing, setImporting] = useState(false);
  const pageSize = 50;

  useEffect(() => {
    fetchQuestions();
  }, [jobId, statusFilter, page]);

  const fetchQuestions = async () => {
    setLoading(true);
    
    let query = supabase
      .from('generation_job_questions')
      .select('*', { count: 'exact' });

    if (jobId) {
      query = query.eq('job_id', jobId);
    }

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (!error && data) {
      setQuestions(data.map(q => ({
        ...q,
        incorrect_answers: Array.isArray(q.incorrect_answers) 
          ? q.incorrect_answers 
          : JSON.parse(q.incorrect_answers as string || '[]')
      })));
      setTotalCount(count || 0);
    }
    setLoading(false);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === questions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(questions.map(q => q.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;

    const { error } = await supabase
      .from('generation_job_questions')
      .update({ status: 'approved' })
      .in('id', Array.from(selectedIds));

    if (error) {
      toast.error('შეცდომა დამტკიცებისას');
    } else {
      toast.success(`${selectedIds.size} კითხვა დამტკიცებულია`);
      setSelectedIds(new Set());
      fetchQuestions();
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.size === 0) return;

    const { error } = await supabase
      .from('generation_job_questions')
      .update({ status: 'rejected' })
      .in('id', Array.from(selectedIds));

    if (error) {
      toast.error('შეცდომა უარყოფისას');
    } else {
      toast.success(`${selectedIds.size} კითხვა უარყოფილია`);
      setSelectedIds(new Set());
      fetchQuestions();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const { error } = await supabase
      .from('generation_job_questions')
      .delete()
      .in('id', Array.from(selectedIds));

    if (error) {
      toast.error('შეცდომა წაშლისას');
    } else {
      toast.success(`${selectedIds.size} კითხვა წაშლილია`);
      setSelectedIds(new Set());
      fetchQuestions();
    }
  };

  const handleImportApproved = async () => {
    setImporting(true);
    try {
      // Get all approved questions
      const { data: approvedQuestions, error: fetchError } = await supabase
        .from('generation_job_questions')
        .select('*')
        .eq('status', 'approved')
        .eq('is_duplicate', false);

      if (fetchError) throw fetchError;

      if (!approvedQuestions || approvedQuestions.length === 0) {
        toast.info('არ არის დასაიმპორტებელი კითხვები');
        return;
      }

      // Insert into questions table
      const questionsToInsert = approvedQuestions.map(q => ({
        question_text: q.question_text,
        correct_answer: q.correct_answer,
        incorrect_answers: q.incorrect_answers,
        difficulty: q.difficulty,
        category_id: q.category_id,
        icon_slug: q.icon_slug,
        language: 'ka',
        is_active: true,
        in_production: false,
      }));

      const { error: insertError } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (insertError) throw insertError;

      // Mark as imported
      await supabase
        .from('generation_job_questions')
        .update({ status: 'imported' })
        .in('id', approvedQuestions.map(q => q.id));

      toast.success(`${approvedQuestions.length} კითხვა დაიმპორტდა!`);
      fetchQuestions();

    } catch (error: any) {
      console.error('Import error:', error);
      toast.error('შეცდომა იმპორტისას: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const getStatusBadge = (status: string, isDuplicate: boolean) => {
    if (isDuplicate) {
      return <Badge variant="destructive" className="text-xs">დუბლიკატი</Badge>;
    }
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-500 text-xs">დამტკიცებული</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="text-xs">უარყოფილი</Badge>;
      case 'imported':
        return <Badge className="bg-blue-500/20 text-blue-500 text-xs">იმპორტირებული</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">მოლოდინში</Badge>;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'hard': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">გენერირებული კითხვები</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-8">
                <Filter className="w-3 h-3 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ყველა</SelectItem>
                <SelectItem value="pending">მოლოდინში</SelectItem>
                <SelectItem value="approved">დამტკიცებული</SelectItem>
                <SelectItem value="rejected">უარყოფილი</SelectItem>
                <SelectItem value="imported">იმპორტირებული</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="ghost" onClick={fetchQuestions}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Bulk Actions */}
        <div className="flex items-center gap-2 mb-3 pb-3 border-b">
          <Checkbox 
            checked={selectedIds.size === questions.length && questions.length > 0}
            onCheckedChange={handleSelectAll}
          />
          <span className="text-sm text-muted-foreground">
            {selectedIds.size > 0 ? `${selectedIds.size} არჩეული` : 'არჩევა'}
          </span>
          
          {selectedIds.size > 0 && (
            <>
              <Button size="sm" variant="ghost" onClick={handleBulkApprove} className="text-green-500">
                <CheckCircle2 className="w-4 h-4 mr-1" />
                დამტკიცება
              </Button>
              <Button size="sm" variant="ghost" onClick={handleBulkReject} className="text-yellow-500">
                <XCircle className="w-4 h-4 mr-1" />
                უარყოფა
              </Button>
              <Button size="sm" variant="ghost" onClick={handleBulkDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-1" />
                წაშლა
              </Button>
            </>
          )}

          <div className="flex-1" />
          
          <Button 
            size="sm" 
            onClick={handleImportApproved}
            disabled={importing}
          >
            {importing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            იმპორტი ({statusFilter === 'approved' ? totalCount : '?'})
          </Button>
        </div>

        {/* Questions List */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            კითხვები არ მოიძებნა
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              <AnimatePresence>
                {questions.map((q, index) => (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.02 }}
                    className={`p-3 rounded-lg border ${
                      selectedIds.has(q.id) ? 'border-primary bg-primary/5' : 'border-border'
                    } ${q.is_duplicate ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        checked={selectedIds.has(q.id)}
                        onCheckedChange={() => toggleSelect(q.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusBadge(q.status, q.is_duplicate)}
                          <span className={`text-xs ${getDifficultyColor(q.difficulty)}`}>
                            {q.difficulty}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {q.category_name}
                          </span>
                        </div>
                        <p className="text-sm font-medium mb-1">{q.question_text}</p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="text-green-500">✓ {q.correct_answer}</span>
                          {q.incorrect_answers.map((ans, i) => (
                            <span key={i} className="text-muted-foreground">✗ {ans}</span>
                          ))}
                        </div>
                        {q.validation_warnings && q.validation_warnings.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-yellow-500">
                            <AlertTriangle className="w-3 h-3" />
                            {q.validation_warnings.join(', ')}
                          </div>
                        )}
                        {q.is_duplicate && q.duplicate_of && (
                          <div className="text-xs text-destructive mt-1 truncate">
                            დუბლიკატი: {q.duplicate_of}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t">
            <span className="text-sm text-muted-foreground">
              {page * pageSize + 1}-{Math.min((page + 1) * pageSize, totalCount)} / {totalCount}
            </span>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
