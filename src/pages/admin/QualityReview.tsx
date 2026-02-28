import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useQuestionQualityReview, ReviewResult } from '@/hooks/useQuestionQualityReview';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Play, 
  ChevronDown, 
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  FileText,
  BookOpen,
  Wand2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

const gradeConfig = {
  A: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle2, label: 'Excellent' },
  B: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Sparkles, label: 'Good' },
  C: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: AlertTriangle, label: 'Needs Work' },
  D: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle, label: 'Poor' },
};

export default function QualityReview() {
  const [categoryId, setCategoryId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'production' | 'library'>('production');
  const [sourceMode, setSourceMode] = useState<'last-added' | 'all'>('last-added');
  const [limit, setLimit] = useState<number>(200);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'grade' | 'score'>('grade');
  const [languageFilter, setLanguageFilter] = useState<string>('all');

  const { 
    reviewing, 
    resolving,
    progress, 
    resolveProgress,
    results, 
    summary,
    resolvedIds,
    startReview, 
    loadSavedIssues,
    moveToLibrary, 
    resolveQuestions,
    clearResults 
  } = useQuestionQualityReview();

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['categories-for-review'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, category_id')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Sort results
  const sortedResults = useMemo(() => {
    const sorted = [...results];
    
    sorted.sort((a, b) => {
      // Resolved questions always come first
      const aResolved = resolvedIds.has(a.id) ? 0 : 1;
      const bResolved = resolvedIds.has(b.id) ? 0 : 1;
      if (aResolved !== bResolved) return aResolved - bResolved;
      
      // Then sort by grade or score
      if (sortBy === 'grade') {
        const gradeOrder = { D: 0, C: 1, B: 2, A: 3 };
        return gradeOrder[a.grade] - gradeOrder[b.grade];
      } else {
        return a.overall_score - b.overall_score;
      }
    });
    
    return sorted;
  }, [results, sortBy, resolvedIds]);

  // Count C and D grade questions directly from results
  const lowGradeCount = useMemo(() => 
    results.filter(r => r.grade === 'C' || r.grade === 'D').length,
    [results]
  );

  const handleStartReview = () => {
    clearResults();
    setSelectedIds(new Set());
    startReview({
      categoryId: categoryId === 'all' ? undefined : categoryId,
      onlyProduction: statusFilter === 'production',
      limit: sourceMode === 'all' ? 1000 : limit,
      sourceMode,
      language: languageFilter,
    });
  };

  const handleShowIssues = () => {
    clearResults();
    setSelectedIds(new Set());
    loadSavedIssues({
      categoryId: categoryId === 'all' ? undefined : categoryId,
      onlyProduction: statusFilter === 'production',
      limit: sourceMode === 'all' ? 1000 : limit,
      sourceMode,
      language: languageFilter,
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Directly filter from results for C and D grades
      const cdIds = results
        .filter(r => r.grade === 'C' || r.grade === 'D')
        .map(r => r.id);
      setSelectedIds(new Set(cdIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const toggleExpanded = (id: string) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedIds(newSet);
  };

  const handleMoveToLibrary = () => {
    moveToLibrary(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleResolveSelected = () => {
    resolveQuestions(Array.from(selectedIds));
  };

  const handleResolveSingle = (id: string) => {
    resolveQuestions([id]);
  };

  // Check if all C-D questions are selected
  const allCDSelected = useMemo(() => {
    const cdIds = results.filter(r => r.grade === 'C' || r.grade === 'D').map(r => r.id);
    return cdIds.length > 0 && cdIds.every(id => selectedIds.has(id));
  }, [results, selectedIds]);

  const progressPercent = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
  const resolvePercent = resolveProgress.total > 0 ? (resolveProgress.current / resolveProgress.total) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quality Review</h1>
          <p className="text-muted-foreground text-sm">AI-powered question quality analysis</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={handleShowIssues} 
            disabled={reviewing || resolving}
            className="gap-2"
          >
            <AlertCircle className="h-4 w-4" />
            Show Issues
          </Button>
          <Button 
            onClick={handleStartReview} 
            disabled={reviewing || resolving}
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            {reviewing ? 'Reviewing...' : 'Run Review'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Category</label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Status</label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="library">Library</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Source</label>
              <Select value={sourceMode} onValueChange={(v) => setSourceMode(v as 'last-added' | 'all')}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last-added">Last Added</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {sourceMode === 'last-added' && (
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Count</label>
                <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Language</label>
              <Select value={languageFilter} onValueChange={setLanguageFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ka">Georgian</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Sort By</label>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grade">Grade (Worst)</SelectItem>
                  <SelectItem value="score">Score (Low)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      {reviewing && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Reviewing questions...</span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resolve Progress */}
      {resolving && (
        <Card className="border-primary/50">
          <CardContent className="pt-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Resolving questions with AI...
                </span>
                <span>{resolveProgress.current} / {resolveProgress.total}</span>
              </div>
              <Progress value={resolvePercent} className="h-2" />
              {resolveProgress.currentQuestion && (
                <p className="text-xs text-muted-foreground truncate">
                  {resolveProgress.currentQuestion}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {results.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {(['A', 'B', 'C', 'D'] as const).map(grade => {
            const config = gradeConfig[grade];
            const Icon = config.icon;
            return (
              <Card key={grade} className={cn("border", config.color)}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <Icon className="h-8 w-8" />
                    <div>
                      <div className="text-2xl font-bold">{summary[grade]}</div>
                      <div className="text-xs opacity-80">Grade {grade}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Review Results ({results.length})
              </CardTitle>
              {lowGradeCount > 0 && (
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox 
                      checked={allCDSelected}
                      onCheckedChange={handleSelectAll}
                    />
                    Select all C-D ({lowGradeCount})
                  </label>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleResolveSelected}
                    disabled={selectedIds.size === 0 || resolving}
                    className="gap-2"
                  >
                    <Wand2 className="h-4 w-4" />
                    Resolve Selected ({selectedIds.size})
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleMoveToLibrary}
                    disabled={selectedIds.size === 0 || resolving}
                    className="gap-2"
                  >
                    <BookOpen className="h-4 w-4" />
                    Move to Library ({selectedIds.size})
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-2">
                {sortedResults.map((result) => (
                  <QuestionResultCard
                    key={result.id}
                    result={result}
                    isExpanded={expandedIds.has(result.id)}
                    isSelected={selectedIds.has(result.id)}
                    isResolved={resolvedIds.has(result.id)}
                    isResolving={resolving}
                    onToggleExpand={() => toggleExpanded(result.id)}
                    onToggleSelect={(checked) => handleSelectOne(result.id, checked)}
                    onResolve={() => handleResolveSingle(result.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!reviewing && results.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select filters and click "Run Review" to analyze questions</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface QuestionResultCardProps {
  result: ReviewResult;
  isExpanded: boolean;
  isSelected: boolean;
  isResolved: boolean;
  isResolving: boolean;
  onToggleExpand: () => void;
  onToggleSelect: (checked: boolean) => void;
  onResolve: () => void;
}

function QuestionResultCard({ 
  result, 
  isExpanded, 
  isSelected,
  isResolved,
  isResolving,
  onToggleExpand, 
  onToggleSelect,
  onResolve 
}: QuestionResultCardProps) {
  const config = gradeConfig[result.grade];
  const Icon = config.icon;
  const showCheckbox = (result.grade === 'C' || result.grade === 'D') && !isResolved;
  const showResolve = (result.grade === 'C' || result.grade === 'D') && !isResolved;

  return (
    <div className={cn(
      "border rounded-lg p-3 transition-colors",
      isResolved && "bg-green-500/10 border-green-500/50",
      isSelected && !isResolved && "bg-accent/50 border-accent"
    )}>
      <div className="flex items-start gap-3">
        {showCheckbox && (
          <Checkbox 
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            className="mt-1"
          />
        )}
        
        <Collapsible open={isExpanded} onOpenChange={onToggleExpand} className="flex-1">
          <CollapsibleTrigger className="w-full text-left">
            <div className="flex items-start gap-3">
              <button className="mt-1">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{result.question_text}</p>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <span>Grammar: {result.grammar_score}%</span>
                  <span>Unique: {result.uniqueness_score}%</span>
                  <span>Clarity: {result.confusion_score}%</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isResolved && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Fixed
                  </Badge>
                )}
                {showResolve && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onResolve();
                    }}
                    disabled={isResolving}
                    className="gap-1 h-7 px-2"
                  >
                    <Wand2 className="h-3 w-3" />
                    Fix
                  </Button>
                )}
                <Badge variant="outline" className={cn("gap-1", config.color)}>
                  <Icon className="h-3 w-3" />
                  {result.grade} ({result.overall_score}%)
                </Badge>
              </div>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-3 pl-7 space-y-3">
            {/* Answers */}
            <div className="text-sm space-y-1">
              <p className="text-green-400">✓ {result.correct_answer}</p>
              {result.incorrect_answers.map((ans, i) => (
                <p key={i} className="text-red-400/70">✗ {ans}</p>
              ))}
            </div>

            {/* Issues */}
            {result.grammar_issues.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Grammar Issues:</p>
                <ul className="text-sm text-yellow-400/80 space-y-0.5">
                  {result.grammar_issues.map((issue, i) => (
                    <li key={i}>• {issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.uniqueness_issues.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Uniqueness Issues:</p>
                <ul className="text-sm text-orange-400/80 space-y-0.5">
                  {result.uniqueness_issues.map((issue, i) => (
                    <li key={i}>• {issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.confusion_issues.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Clarity Issues:</p>
                <ul className="text-sm text-red-400/80 space-y-0.5">
                  {result.confusion_issues.map((issue, i) => (
                    <li key={i}>• {issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.recommendations.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Recommendations:</p>
                <ul className="text-sm text-blue-400/80 space-y-0.5">
                  {result.recommendations.map((rec, i) => (
                    <li key={i}>• {rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
