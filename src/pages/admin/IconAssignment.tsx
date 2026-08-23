import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Image, Check, X, Loader2, Wand2, Play, StopCircle, Sparkles, AlertTriangle, CheckCircle, Clock, History, Trash2, CheckSquare, Square, CheckCheck, Upload, RefreshCw, Zap, ChevronDown, BarChart3, ArrowRightLeft, Wrench, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BrokenIconsModal } from '@/components/admin/BrokenIconsModal';
import { IconAssignmentHistory } from '@/components/admin/IconAssignmentHistory';
import { IconUploadPanel } from '@/components/admin/IconUploadPanel';
import { IconSuggestionsPanel } from '@/components/admin/IconSuggestionsPanel';
import { BulkIconReassignment } from '@/components/admin/BulkIconReassignment';
import { IconUsageStats } from '@/components/admin/IconUsageStats';
import { cn } from '@/lib/utils';
import { toast } from "@/lib/toast";
import { useAdminIconAssignment, QuestionForAssignment } from '@/hooks/useAdminIconAssignment';
import { useIconLibrary } from '@/hooks/useIconLibrary';
import { useIconVerification } from '@/hooks/useIconVerification';
import { supabase } from '@/integrations/supabase/client';
import { isLatinScript, transliterateLatin, getGeorgianEquivalents } from '@/utils/transliteration';
import { EditQuestionDialog } from '@/components/social/EditQuestionDialog';

interface IconItem {
  slug: string;
  title: string;
  category: string;
  tags: string[];
  url: string;
}

export default function IconAssignment() {
  const {
    questions,
    loading,
    hasMore,
    stats,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    showOnlyWithoutIcons,
    setShowOnlyWithoutIcons,
    languageFilter,
    setLanguageFilter,
    loadMore,
    assignIcon,
    removeIcon,
    categories,
    refetch
  } = useAdminIconAssignment();

  const { getIconBySlug } = useIconLibrary();
  
  // Server-side icon verification
  const { 
    stats: verificationStats, 
    brokenIcons: serverBrokenIcons, 
    isVerifying, 
    verifyProgress, 
    runVerification,
    markIconAsFixed 
  } = useIconVerification();

  const [selectedQuestion, setSelectedQuestion] = useState<QuestionForAssignment | null>(null);
  const [selectedQuestionDetails, setSelectedQuestionDetails] = useState<{
    question_text: string;
    correct_answer: string;
    incorrect_answers: string[];
    icon_slug: string | null;
  } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [iconSearchTerm, setIconSearchTerm] = useState('');
  const [icons, setIcons] = useState<IconItem[]>([]);
  const [iconsLoading, setIconsLoading] = useState(true);
  const [iconsLoadProgress, setIconsLoadProgress] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);

  const fetchSelectedQuestionDetails = useCallback(async (questionId: string) => {
    setDetailsLoading(true);
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('question_text, correct_answer, incorrect_answers, icon_slug')
        .eq('id', questionId)
        .single();

      if (error) throw error;

      setSelectedQuestionDetails({
        question_text: data.question_text,
        correct_answer: data.correct_answer,
        incorrect_answers: Array.isArray(data.incorrect_answers) ? (data.incorrect_answers as any[]) : [],
        icon_slug: (data.icon_slug ?? null) as string | null,
      });
    } catch (e: unknown) {
      console.error('Failed to fetch question details:', e);
      setSelectedQuestionDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedQuestion?.id) {
      setSelectedQuestionDetails(null);
      return;
    }
    fetchSelectedQuestionDetails(selectedQuestion.id);
  }, [selectedQuestion?.id, fetchSelectedQuestionDetails]);

  const isTrueFalseQuestion = useMemo(() => {
    const answers = [
      selectedQuestionDetails?.correct_answer,
      ...(selectedQuestionDetails?.incorrect_answers || [])
    ].filter(Boolean) as string[];

    if (answers.length !== 2) return false;
    const lower = answers.map(a => a.toLowerCase());
    return (
      (lower.includes('მართალია') && lower.includes('მცდარია')) ||
      (lower.includes('true') && lower.includes('false'))
    );
  }, [selectedQuestionDetails]);

  const handleSaveQuestionEdits = useCallback(async (updated: {
    question_text: string;
    correct_answer: string;
    incorrect_answers?: string[];
    icon_slug?: string | null;
  }) => {
    if (!selectedQuestion?.id) return;

    const incorrectAnswers = (updated.incorrect_answers || [])
      .map(a => (a ?? '').toString().trim())
      .filter(a => a.length > 0);

    if (!isTrueFalseQuestion && incorrectAnswers.length < 3) {
      toast.error('შეავსეთ 3 არასწორი პასუხი');
      return;
    }

    setIsSavingEdit(true);
    try {
      const { error } = await supabase
        .from('questions')
        .update({
          question_text: updated.question_text.trim(),
          correct_answer: updated.correct_answer.trim(),
          incorrect_answers: isTrueFalseQuestion ? incorrectAnswers.slice(0, 1) : incorrectAnswers.slice(0, 3),
          icon_slug: updated.icon_slug ?? null,
        })
        .eq('id', selectedQuestion.id);

      if (error) throw error;

      toast.success('კითხვა განახლდა');
      await refetch();
      await fetchSelectedQuestionDetails(selectedQuestion.id);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Error';
      toast.error('ვერ შევინახე ცვლილება', { description: message });
    } finally {
      setIsSavingEdit(false);
    }
  }, [selectedQuestion?.id, refetch, fetchSelectedQuestionDetails, isTrueFalseQuestion, selectedQuestion]);
  
  // Use server-side broken icons instead of client-side tracking
  const brokenIconSlugs = useMemo(() => new Set(serverBrokenIcons.map(i => i.slug)), [serverBrokenIcons]);
  const [showBrokenIconsModal, setShowBrokenIconsModal] = useState(false);
  
  // Track recently fixed icons to show them first
  const [recentlyFixedSlugs, setRecentlyFixedSlugs] = useState<Set<string>>(new Set());
  
  // Track recently used icons for quick access
  const [recentlyUsedSlugs, setRecentlyUsedSlugs] = useState<string[]>([]);
  
  // Load recently used icons from assignment history on mount
  useEffect(() => {
    const loadRecentlyUsed = async () => {
      try {
        const { data, error } = await supabase
          .from('icon_assignment_history')
          .select('new_icon_slug')
          .not('new_icon_slug', 'is', null)
          .order('assigned_at', { ascending: false })
          .limit(50);
        
        if (error) throw error;
        
        // Get unique slugs preserving order
        const uniqueSlugs: string[] = [];
        const seen = new Set<string>();
        for (const row of data || []) {
          if (row.new_icon_slug && !seen.has(row.new_icon_slug)) {
            seen.add(row.new_icon_slug);
            uniqueSlugs.push(row.new_icon_slug);
          }
          if (uniqueSlugs.length >= 20) break;
        }
        
        setRecentlyUsedSlugs(uniqueSlugs);
      } catch (error) {
        console.error('Error loading recently used icons:', error);
      }
    };
    loadRecentlyUsed();
  }, []);
  
  // Add to recently used when assigning
  const addToRecentlyUsed = useCallback((slug: string) => {
    setRecentlyUsedSlugs(prev => {
      const filtered = prev.filter(s => s !== slug);
      return [slug, ...filtered].slice(0, 20);
    });
  }, []);
  
  // Batch assignment state
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchStats, setBatchStats] = useState({ processed: 0, assigned: 0, uniqueIcons: 0 });
  const [shouldStop, setShouldStop] = useState(false);
  const [methodBreakdown, setMethodBreakdown] = useState<Record<string, number>>({});
  const [batchMode, setBatchMode] = useState<'assign' | 'diversify'>('assign');
  const [diversifyOffset, setDiversifyOffset] = useState(0);
  const [totalScanned, setTotalScanned] = useState(0);
  const [resetting, setResetting] = useState(false);
  
  // Fast mode (no longer toggleable - always uses fast batch)

  // Load ALL icons from database with pagination
  useEffect(() => {
    const loadIcons = async () => {
      try {
        const allIcons: IconItem[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;
        
        while (hasMore) {
          const { data, error } = await supabase
            .from('icon_library')
            .select('slug, title, category, tags, icon_url, file_name')
            .order('title')
            .range(page * pageSize, (page + 1) * pageSize - 1);
          
          if (error) throw error;
          
          if (data && data.length > 0) {
            const iconList: IconItem[] = data.map((icon: any) => ({
              slug: icon.slug,
              title: icon.title,
              category: icon.category,
              tags: icon.tags || [],
              url: icon.icon_url || `https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library/${icon.file_name}`
            }));
            
            allIcons.push(...iconList);
            setIconsLoadProgress(allIcons.length);
            page++;
            
            // If we got less than pageSize, we've reached the end
            hasMore = data.length === pageSize;
          } else {
            hasMore = false;
          }
        }
        
        console.log(`Loaded ${allIcons.length} icons from database`);
        setIcons(allIcons);
      } catch (error) {
        console.error('Error loading icons:', error);
      } finally {
        setIconsLoading(false);
      }
    };
    loadIcons();
  }, []);

  // Filter icons based on search and exclude broken ones, show recently fixed first
  const filteredIcons = useMemo(() => {
    // First filter out broken icons using server-verified data
    const validIcons = icons.filter(icon => !brokenIconSlugs.has(icon.slug));
    
    let result = validIcons;
    if (iconSearchTerm) {
      const term = iconSearchTerm.toLowerCase();
      result = validIcons.filter(icon => 
        icon.slug.toLowerCase().includes(term) ||
        icon.title.toLowerCase().includes(term) ||
        icon.category.toLowerCase().includes(term) ||
        icon.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }
    
    // Sort: recently fixed first, then keep original order
    return result.sort((a, b) => {
      const aRecent = recentlyFixedSlugs.has(a.slug);
      const bRecent = recentlyFixedSlugs.has(b.slug);
      if (aRecent && !bRecent) return -1;
      if (!aRecent && bRecent) return 1;
      return 0;
    });
  }, [icons, iconSearchTerm, brokenIconSlugs, recentlyFixedSlugs]);

  // Handle icon load error - no-op since we use server-side verification
  const handleIconError = (slug: string) => {
    // Client-side errors are now ignored; use runVerification() for accurate data
    console.log('Icon load error (ignored, use server verification):', slug);
  };

  // Handle icon fixed from modal
  const handleIconFixed = async (slug: string, newUrl: string) => {
    setIcons(prev => prev.map(i => 
      i.slug === slug ? { ...i, url: newUrl } : i
    ));
    // Update server-side verification
    await markIconAsFixed(slug, newUrl);
    // Track as recently fixed to show first in grid
    setRecentlyFixedSlugs(prev => new Set([slug, ...prev]));
  };

  // Toggle question selection for multi-select
  const toggleQuestionSelection = useCallback((questionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedQuestionIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  }, []);

  // Select all currently visible/filtered questions
  const selectAllQuestions = useCallback(() => {
    setSelectedQuestionIds(new Set(questions.map(q => q.id)));
  }, [questions]);

  // Deselect all
  const deselectAllQuestions = useCallback(() => {
    setSelectedQuestionIds(new Set());
  }, []);

  // Handle bulk icon assignment
  const handleBulkAssignIcon = async (iconSlug: string) => {
    if (selectedQuestionIds.size === 0) {
      toast.error('აირჩიეთ კითხვები');
      return;
    }

    setBulkAssigning(true);
    const questionIds = Array.from(selectedQuestionIds);
    const selectedQuestions = questions.filter(q => selectedQuestionIds.has(q.id));
    let successCount = 0;

    try {
      // Batch update all questions
      const { error } = await supabase
        .from('questions')
        .update({ icon_slug: iconSlug })
        .in('id', questionIds);

      if (error) throw error;

      // Log to history
      const historyEntries = selectedQuestions.map(q => ({
        question_id: q.id,
        question_text: q.question_text.substring(0, 200),
        old_icon_slug: q.icon_slug,
        new_icon_slug: iconSlug,
        assignment_method: 'bulk-manual',
        category_id: q.category_id,
        category_name: q.category_name,
        assigned_by: null
      }));

      await supabase.from('icon_assignment_history').insert(historyEntries);

      successCount = questionIds.length;
      toast.success(`${successCount} კითხვას მინიჭდა აიკონი: ${iconSlug}`);
      
      // Add to recently used
      addToRecentlyUsed(iconSlug);
      
      // Clear selection and refresh
      setSelectedQuestionIds(new Set());
      setSelectedQuestion(null);
      refetch();
    } catch (error) {
      console.error('Bulk assign error:', error);
      toast.error('შეცდომა ბულკ მინიჭებისას');
    } finally {
      setBulkAssigning(false);
    }
  };

  // Handle icon assignment (manual - single)
  const handleAssignIcon = async (iconSlug: string) => {
    // If multiple questions selected, do bulk assignment
    if (selectedQuestionIds.size > 0) {
      await handleBulkAssignIcon(iconSlug);
      return;
    }

    if (!selectedQuestion) {
      toast.error('აირჩიეთ კითხვა');
      return;
    }

    const oldIconSlug = selectedQuestion.icon_slug;
    const success = await assignIcon(selectedQuestion.id, iconSlug);
    
    if (success) {
      // Log to assignment history
      await supabase.from('icon_assignment_history').insert({
        question_id: selectedQuestion.id,
        question_text: selectedQuestion.question_text.substring(0, 200),
        old_icon_slug: oldIconSlug,
        new_icon_slug: iconSlug,
        assignment_method: 'manual',
        category_id: selectedQuestion.category_id,
        category_name: selectedQuestion.category_name,
        assigned_by: null // Could add user id if needed
      });
      
      // Add to recently used
      addToRecentlyUsed(iconSlug);
      
      toast.success(`აიკონი მინიჭებულია: ${iconSlug}`);
      
      if (autoAdvance) {
        const currentIndex = questions.findIndex(q => q.id === selectedQuestion.id);
        const nextQuestion = questions[currentIndex + 1];
        if (nextQuestion) {
          setSelectedQuestion(nextQuestion);
        } else {
          setSelectedQuestion(null);
        }
      } else {
        setSelectedQuestion(prev => prev ? { ...prev, icon_slug: iconSlug } : null);
      }
    } else {
      toast.error('შეცდომა აიკონის მინიჭებისას');
    }
  };

  // Handle icon removal
  const handleRemoveIcon = async () => {
    if (!selectedQuestion) return;
    
    const success = await removeIcon(selectedQuestion.id);
    if (success) {
      toast.success('აიკონი წაიშალა');
      setSelectedQuestion(prev => prev ? { ...prev, icon_slug: null } : null);
    }
  };

  // Run batch assignment by category
  const runBatchAssignment = async (mode: 'assign' | 'diversify' = 'assign') => {
    setBatchRunning(true);
    setBatchMode(mode);
    setShouldStop(false);
    setBatchProgress(0);
    setBatchStats({ processed: 0, assigned: 0, uniqueIcons: 0 });
    setMethodBreakdown({});
    setTotalScanned(0);
    
    // Reset offset for diversify mode
    let currentOffset = 0;
    if (mode === 'diversify') {
      setDiversifyOffset(0);
    }

    let totalProcessed = 0;
    let totalAssigned = 0;
    const batchSize = 250;
    const accumulatedMethods: Record<string, number> = {};

    const functionName = 'batch-assign-icons';
    const brokenSlugsArray = Array.from(brokenIconSlugs);
    
    const modeLabel = mode === 'diversify' ? 'დივერსიფიკაცია' : 'სწრაფი მინიჭება';
    toast.info(`${modeLabel} დაიწყო... (${brokenSlugsArray.length} გატეხილი გამორიცხულია)`);

    try {
      while (!shouldStop) {
        const requestBody: any = { 
          brokenSlugs: brokenSlugsArray,
          mode
        };
        
        // For assign mode, include category filter
        if (mode === 'assign') {
          requestBody.categoryId = categoryFilter;
        }
        
        // For diversify mode, use offset pagination
        if (mode === 'diversify') {
          requestBody.offset = currentOffset;
        }
        
        const { data, error } = await supabase.functions.invoke(functionName, {
          body: requestBody
        });

        if (error) {
          console.error('Batch error:', error);
          toast.error(`შეცდომა: ${error.message}`);
          break;
        }

        totalProcessed += data.processed;
        totalAssigned += mode === 'diversify' ? data.diversified : data.assigned;
        
        // Update offset for diversify mode
        if (mode === 'diversify' && data.nextOffset !== undefined) {
          currentOffset = data.nextOffset;
          setDiversifyOffset(currentOffset);
          setTotalScanned(currentOffset);
        }
        
        // Accumulate method breakdown
        if (data.methodBreakdown) {
          Object.entries(data.methodBreakdown).forEach(([method, count]) => {
            accumulatedMethods[method] = (accumulatedMethods[method] || 0) + (count as number);
          });
          setMethodBreakdown({ ...accumulatedMethods });
        }
        
        setBatchStats({ 
          processed: totalProcessed, 
          assigned: totalAssigned,
          uniqueIcons: data.uniqueIcons || 0
        });
        
        // Calculate progress
        const total = mode === 'diversify' 
          ? (data.totalWithIcons || stats.withIcons || 1)
          : stats.withoutIcons;
        const progress = total > 0 
          ? Math.min(100, (totalProcessed / total) * 100)
          : 100;
        setBatchProgress(progress);

        // If done, stop
        if (data.done) {
          const successLabel = mode === 'diversify' ? 'გაუმჯობესდა' : 'მინიჭდა';
          toast.success(`დასრულდა! ${successLabel} ${totalAssigned} აიკონი (${totalProcessed} დასკანირდა)`);
          break;
        }
        
        // For assign mode, stop if no more questions
        if (mode === 'assign' && data.processed === 0) {
          toast.success(`დასრულდა! მინიჭებულია ${totalAssigned} აიკონი`);
          break;
        }

        // Short delay
        await new Promise(r => setTimeout(r, 200));
      }
    } catch (err) {
      console.error('Batch assignment error:', err);
      toast.error('მინიჭება შეფერხდა');
    } finally {
      setBatchRunning(false);
      setShouldStop(false);
      refetch();
    }
  };

  const stopBatchAssignment = () => {
    setShouldStop(true);
    toast.info('შეჩერება...');
  };

  // Reset all icons
  const resetAllIcons = async () => {
    if (!confirm('ნამდვილად გსურთ ყველა აიკონის წაშლა? ეს მოქმედება შეუქცევადია!')) {
      return;
    }
    
    setResetting(true);
    try {
      const { error } = await supabase
        .from('questions')
        .update({ icon_slug: null })
        .not('icon_slug', 'is', null);
      
      if (error) throw error;
      
      toast.success('ყველა აიკონი წაიშალა');
      refetch();
    } catch (err) {
      console.error('Reset error:', err);
      toast.error('შეცდომა აიკონების წაშლისას');
    } finally {
      setResetting(false);
    }
  };

  // Get icon URL for a slug
  const getIconUrl = (slug: string | null) => {
    if (!slug) return null;
    const icon = icons.find(i => i.slug === slug);
    return icon?.url || null;
  };

  // State for active tab
  const [activeTab, setActiveTab] = useState<string>('questions');
  const [fixingBrokenRefs, setFixingBrokenRefs] = useState(false);

  const fixBrokenIconReferences = useCallback(async () => {
    setFixingBrokenRefs(true);
    try {
      const { data, error } = await supabase.functions.invoke('fix-broken-icon-references', {
        body: { dryRun: false }
      });

      if (error) throw error;

      toast.success(
        `დასრულდა: ${data.updatedToCategory} კატეგორიაზე, ${data.clearedToNull} გასუფთავდა (გატეხილი: ${data.brokenFound})`
      );

      refetch();
    } catch (err) {
      console.error('Fix broken references error:', err);
      toast.error('შეცდომა გატეხილი მინიჭებების გასწორებისას');
    } finally {
      setFixingBrokenRefs(false);
    }
  }, [refetch]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col overflow-visible">
      {/* Tab Navigation */}
      <div className="border-b border-border/50 bg-card/30 px-4 pt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
              <Image className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">აიკონების მინიჭება</h1>
              <p className="text-xs text-muted-foreground">კითხვებზე აიკონების მარტივი მინიჭება</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{stats.total.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">სულ</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-500">{stats.withIcons.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">აიკონით</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-orange-500">{stats.withoutIcons.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">უიკონო</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-500">{verificationStats.broken.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">გატეხილი</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-amber-500">
                {(icons.length - verificationStats.total).toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">შეუმოწმ.</div>
            </div>
            {fixingBrokenRefs ? (
              <Button size="sm" variant="ghost" disabled className="gap-1" title="გატეხილი მინიჭებების გასწორება">
                <Loader2 className="h-3 w-3 animate-spin" />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={fixBrokenIconReferences}
                title="გატეხილი icon_slug მინიჭებების გასწორება (კატეგორიის აიკონზე fallback)"
              >
                <Wrench className="h-4 w-4" />
              </Button>
            )}

            {isVerifying ? (
              <Button size="sm" variant="ghost" disabled className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
              </Button>
            ) : (
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => runVerification().then(() => toast.success('ვერიფიკაცია დასრულდა'))}
                title="ხელახლა შემოწმება"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        <TabsList className="bg-muted/50">
          <TabsTrigger value="questions" className="gap-2">
            <Image className="h-4 w-4" />
            კითხვები
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            სტატისტიკა
          </TabsTrigger>
          <TabsTrigger value="reassign" className="gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            შეცვლა
          </TabsTrigger>
          <TabsTrigger value="upload" className="gap-2">
            <Upload className="h-4 w-4" />
            ატვირთვა
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            ისტორია
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Questions Tab Content */}
      <TabsContent value="questions" className="flex-1 mt-0 overflow-visible flex flex-col">
      {/* Header with Stats and Batch Controls - HIDDEN FOR NOW */}
      {/* 
      <div className="border-b border-border/50 bg-card/30 p-4">
        ... Progress Bar and Fast Assignment Controls hidden ...
      </div>
      */}

      {/* Main Content - Two Panel Layout */}
       <div className="grid min-h-0 flex-1 grid-cols-2 gap-0 overflow-visible">
        {/* Left Panel - Questions */}
        <div className="flex min-h-0 flex-col border-r border-border/50">
          {/* Question Filters */}
          <div className="space-y-3 border-b border-border/30 p-3">
            <div className="space-y-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="ძიება (ქართულად ან ინგლისურად)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              {searchTerm && isLatinScript(searchTerm) && (
                <div className="text-xs text-muted-foreground px-1">
                  🔍 ეძებს: <span className="font-medium">"{searchTerm}"</span>
                  {transliterateLatin(searchTerm) !== searchTerm.toLowerCase() && (
                    <span> → <span className="text-primary">"{transliterateLatin(searchTerm)}"</span></span>
                  )}
                  {getGeorgianEquivalents(searchTerm.toLowerCase()).length > 0 && (
                    <span className="text-green-600 dark:text-green-400"> | {getGeorgianEquivalents(searchTerm.toLowerCase()).slice(0, 2).join(', ')}</span>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              <Select
                value={categoryFilter || 'all'}
                onValueChange={(v) => setCategoryFilter(v === 'all' ? null : v)}
              >
                <SelectTrigger className="flex-1 min-w-[140px]">
                  <SelectValue placeholder="ყველა კატეგორია" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ყველა კატეგორია</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={(cat as any).uuid || cat.id} value={(cat as any).uuid || cat.id}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={languageFilter || 'all'}
                onValueChange={(v) => setLanguageFilter(v === 'all' ? null : v)}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="ენა" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🌐 ყველა ენა</SelectItem>
                  <SelectItem value="ka">🇬🇪 ქართული</SelectItem>
                  <SelectItem value="en">🇺🇸 English</SelectItem>
                  <SelectItem value="fr">🇫🇷 Français</SelectItem>
                  <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
                  <SelectItem value="es">🇪🇸 Español</SelectItem>
                  <SelectItem value="it">🇮🇹 Italiano</SelectItem>
                  <SelectItem value="pt">🇵🇹 Português</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex items-center gap-2">
                <Switch
                  id="only-without"
                  checked={showOnlyWithoutIcons}
                  onCheckedChange={setShowOnlyWithoutIcons}
                />
                <Label htmlFor="only-without" className="text-xs whitespace-nowrap">უიკონო</Label>
              </div>
            </div>

            {/* Bulk Selection Controls */}
            <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 p-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllQuestions}
                  disabled={questions.length === 0}
                  className="h-7 text-xs gap-1.5"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  ყველა ({questions.length})
                </Button>
                {selectedQuestionIds.size > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deselectAllQuestions}
                    className="h-7 text-xs gap-1.5 text-muted-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                    გასუფთავება
                  </Button>
                )}
              </div>
              {selectedQuestionIds.size > 0 && (
                <Badge variant="secondary" className="bg-primary/20 text-primary">
                  {selectedQuestionIds.size} არჩეული
                </Badge>
              )}
            </div>
          </div>

          {/* Question List */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {questions.map((question) => {
                const isChecked = selectedQuestionIds.has(question.id);
                return (
                  <div
                    key={question.id}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-all flex items-start gap-3",
                      selectedQuestion?.id === question.id
                        ? "border-primary bg-primary/10"
                        : isChecked
                          ? "border-primary/50 bg-primary/5"
                          : question.icon_slug 
                            ? "border-l-4 border-l-green-500 border-y-transparent border-r-transparent bg-green-500/5 hover:bg-green-500/10"
                            : "border-transparent hover:bg-accent/50 opacity-70"
                    )}
                  >
                    {/* Checkbox for multi-select */}
                    <div 
                      className="shrink-0 pt-0.5" 
                      onClick={(e) => toggleQuestionSelection(question.id, e)}
                    >
                      <Checkbox 
                        checked={isChecked}
                        className="h-4 w-4"
                      />
                    </div>

                    <button
                      onClick={() => {
                        setSelectedQuestion(question);
                        setSelectedQuestionIds(new Set()); // Clear bulk selection when clicking individual
                      }}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon Preview */}
                        <div className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg relative",
                          question.icon_slug ? "bg-background shadow-sm" : "bg-muted border-2 border-dashed border-muted-foreground/30"
                        )}>
                          {question.icon_slug ? (
                            <>
                              <img 
                                src={getIconUrl(question.icon_slug) || ''} 
                                alt="" 
                                className="h-8 w-8 object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
                                <Check className="h-2.5 w-2.5 text-white" />
                              </div>
                            </>
                          ) : (
                            <Image className="h-4 w-4 text-muted-foreground/50" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm line-clamp-2">{question.question_text}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {question.category_name}
                            </Badge>
                            {question.language && question.language !== 'ka' && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono uppercase">
                                {question.language}
                              </Badge>
                            )}
                            {question.icon_slug && (
                              <span className="text-[10px] text-green-600 font-medium">{question.icon_slug}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
              
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
              
              {!loading && hasMore && (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={loadMore}
                >
                  მეტის ჩატვირთვა
                </Button>
              )}
              
              {!loading && questions.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  კითხვები ვერ მოიძებნა
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Icon Picker (sticky for easy editing while scrolling the question list) */}
        <div className="sticky top-4 self-start flex h-[calc(100vh-8rem)] min-h-0 flex-1 flex-col overflow-hidden bg-muted/20">
          {/* Bulk Selection Preview */}
          {selectedQuestionIds.size > 0 && (
            <div className="shrink-0 border-b border-border/30 p-4 bg-primary/5">
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary/20">
                  <CheckCheck className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">ბულკ მინიჭება</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedQuestionIds.size} კითხვა არჩეულია. აირჩიეთ აიკონი ყველასთვის მინიჭებისთვის.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deselectAllQuestions}
                    className="h-6 px-2 text-xs mt-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3 mr-1" />
                    არჩევის გაუქმება
                  </Button>
                </div>
                {bulkAssigning && (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                )}
              </div>
            </div>
          )}

          {/* Selected Question Preview - only show when no bulk selection */}
          {selectedQuestion && selectedQuestionIds.size === 0 && (
            <div className="shrink-0 border-b border-border/30 p-4 bg-card/50">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "flex h-16 w-16 shrink-0 items-center justify-center rounded-xl",
                  selectedQuestion.icon_slug ? "bg-background shadow-sm" : "bg-muted border-2 border-dashed"
                )}>
                  {selectedQuestion.icon_slug ? (
                    <img 
                      src={getIconUrl(selectedQuestion.icon_slug) || ''} 
                      alt="" 
                      className="h-12 w-12 object-contain"
                    />
                  ) : (
                    <Image className="h-6 w-6 text-muted-foreground/50" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-2">{selectedQuestion.question_text}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">{selectedQuestion.category_name}</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setIsEditOpen(true)}
                      disabled={detailsLoading}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    {selectedQuestion.icon_slug && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                        onClick={handleRemoveIcon}
                      >
                        <X className="h-3 w-3 mr-1" />
                        წაშლა
                      </Button>
                    )}
                  </div>

                  {/* Answers preview */}
                  <div className="mt-3 rounded-lg border border-border/40 bg-background/40 p-3">
                    {detailsLoading || !selectedQuestionDetails ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        იტვირთება პასუხები...
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-[10px] font-semibold text-muted-foreground">ANSWERS</div>
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-bold text-emerald-600">✓</span>
                          <span className="text-xs leading-relaxed break-words">{selectedQuestionDetails.correct_answer}</span>
                        </div>
                        {selectedQuestionDetails.incorrect_answers.map((a, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="text-xs font-bold text-red-600">✗</span>
                            <span className="text-xs leading-relaxed break-words">{a}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-3">
                <Switch
                  id="auto-advance"
                  checked={autoAdvance}
                  onCheckedChange={setAutoAdvance}
                />
                <Label htmlFor="auto-advance" className="text-xs">ავტო-გადასვლა შემდეგ კითხვაზე</Label>
              </div>
            </div>
          )}

          {/* Edit question modal */}
          {selectedQuestion && selectedQuestionIds.size === 0 && selectedQuestionDetails && (
            <EditQuestionDialog
              open={isEditOpen}
              onOpenChange={(open) => {
                if (!open && isSavingEdit) return;
                setIsEditOpen(open);
              }}
              answerFormat={isTrueFalseQuestion ? 'true_false' : '4_answers'}
              question={{
                question_text: selectedQuestionDetails.question_text,
                correct_answer: selectedQuestionDetails.correct_answer,
                incorrect_answers: selectedQuestionDetails.incorrect_answers,
                icon_slug: selectedQuestionDetails.icon_slug,
              }}
              onSave={handleSaveQuestionEdits}
            />
          )}

          {/* Icon Suggestions Panel - shows keywords and suggested icons */}
          {selectedQuestion && selectedQuestionIds.size === 0 && (
            <div className="shrink-0 max-h-[250px] overflow-hidden">
              <IconSuggestionsPanel
                question={{
                  id: selectedQuestion.id,
                  question_text: selectedQuestion.question_text,
                  correct_answer: selectedQuestion.correct_answer,
                  icon_slug: selectedQuestion.icon_slug
                }}
                onAssignIcon={handleAssignIcon}
                getIconUrl={getIconUrl}
                onRefresh={refetch}
              />
            </div>
          )}

          {/* Recently Used Icons - Quick Access (Always Open) */}
          {recentlyUsedSlugs.length > 0 && (
            <div className="shrink-0 border-b border-border/30 p-3 bg-amber-500/5">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-medium text-amber-600">ბოლოს გამოყენებული</span>
                <span className="text-[10px] text-muted-foreground">({recentlyUsedSlugs.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recentlyUsedSlugs.slice(0, 10).map((slug) => {
                  const icon = icons.find(i => i.slug === slug);
                  if (!icon) return null;
                  const hasSelection = selectedQuestion || selectedQuestionIds.size > 0;
                  return (
                    <button
                      key={slug}
                      onClick={() => handleAssignIcon(slug)}
                      disabled={!hasSelection || bulkAssigning}
                      title={icon.title}
                      className={cn(
                        "relative flex items-center justify-center rounded-lg p-1.5 transition-all bg-background/80 border border-border/50 hover:border-amber-500/50 hover:shadow-sm",
                        (!hasSelection || bulkAssigning) && "opacity-50 cursor-not-allowed",
                        selectedQuestion?.icon_slug === slug && selectedQuestionIds.size === 0 && "ring-2 ring-primary"
                      )}
                    >
                      <img
                        src={icon.url}
                        alt={icon.title}
                        className="h-8 w-8 object-contain"
                        loading="lazy"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Icon Search + Grid Section */}
          <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
            {/* Icon Search */}
            <div className="shrink-0 p-3 border-b border-border/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="აიკონის ძიება..."
                value={iconSearchTerm}
                onChange={(e) => setIconSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span>{filteredIcons.length.toLocaleString()} აიკონი</span>
              {recentlyFixedSlugs.size > 0 && (
                <button
                  onClick={() => setRecentlyFixedSlugs(new Set())}
                  className="text-green-500 hover:text-green-600 flex items-center gap-1.5 font-medium"
                >
                  <Check className="h-3 w-3" />
                  {recentlyFixedSlugs.size} გასწორებული
                </button>
              )}
              {verificationStats.broken > 0 && (
                <button
                  onClick={() => setShowBrokenIconsModal(true)}
                  className="text-orange-500 hover:text-orange-600 flex items-center gap-1.5 font-medium"
                >
                  <AlertTriangle className="h-3 w-3" />
                  {verificationStats.broken} გატეხილი
                </button>
              )}
            </div>
          </div>

          {/* Broken Icons Modal */}
          <BrokenIconsModal
            open={showBrokenIconsModal}
            onOpenChange={setShowBrokenIconsModal}
            brokenIcons={brokenIconSlugs}
            icons={icons}
            onIconFixed={handleIconFixed}
            totalIconsInLibrary={icons.length}
          />

          {/* Icon Grid */}
          <ScrollArea className="flex-1 min-h-0">
            {iconsLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  იტვირთება... {iconsLoadProgress.toLocaleString()} აიკონი
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-2 p-3">
                {filteredIcons.map((icon) => {
                  const hasSelection = selectedQuestion || selectedQuestionIds.size > 0;
                  return (
                    <div key={icon.slug} className="relative group">
                      <button
                        onClick={() => handleAssignIcon(icon.slug)}
                        disabled={!hasSelection || bulkAssigning}
                        className={cn(
                          "w-full flex flex-col items-center gap-1 rounded-lg p-2 transition-all",
                          "hover:bg-accent/80 hover:shadow-sm",
                          (!hasSelection || bulkAssigning) && "opacity-50 cursor-not-allowed",
                          selectedQuestion?.icon_slug === icon.slug && selectedQuestionIds.size === 0 && "ring-2 ring-primary bg-primary/10"
                        )}
                      >
                        <div className="relative h-12 w-12">
                          <img 
                            src={icon.url} 
                            alt={icon.title}
                            className="h-full w-full object-contain"
                            loading="lazy"
                            onError={() => handleIconError(icon.slug)}
                          />
                          {recentlyFixedSlugs.has(icon.slug) && (
                            <div className="absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                          {selectedQuestion?.icon_slug === icon.slug && selectedQuestionIds.size === 0 && (
                            <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                              <Check className="h-3 w-3 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground truncate max-w-full">
                          {icon.slug}
                        </span>
                      </button>
                      
                      {/* Replace button on hover */}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id={`replace-${icon.slug}`}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          try {
                            toast.info(`იცვლება: ${icon.slug}...`);
                            
                            // Delete and re-upload
                            await supabase.storage.from('icon-library').remove([`${icon.slug}.png`]);
                            
                            const { error: uploadError } = await supabase.storage
                              .from('icon-library')
                              .upload(`${icon.slug}.png`, file, {
                                contentType: 'image/png',
                                upsert: true,
                              });
                            
                            if (uploadError) throw uploadError;
                            
                            // Update URL with cache buster
                            const newUrl = `https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library/${icon.slug}.png?v=${Date.now()}`;
                            await supabase.from('icon_library').update({ icon_url: newUrl }).eq('slug', icon.slug);
                            
                            // Update local state
                            setIcons(prev => prev.map(i => i.slug === icon.slug ? { ...i, url: newUrl } : i));
                            
                            toast.success(`აიკონი "${icon.slug}" განახლდა!`);
                          } catch (error) {
                            console.error('Replace error:', error);
                            toast.error('შეცდომა ჩანაცვლებისას');
                          }
                          
                          // Reset input
                          e.target.value = '';
                        }}
                      />
                      <label
                        htmlFor={`replace-${icon.slug}`}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer bg-background/90 rounded p-1 hover:bg-accent shadow-sm"
                        title="აიკონის ჩანაცვლება"
                      >
                        <RefreshCw className="h-3 w-3 text-muted-foreground" />
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
            
            {!iconsLoading && filteredIcons.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                აიკონები ვერ მოიძებნა
              </div>
            )}
          </ScrollArea>
          </div>
        </div>
      </div>
      </TabsContent>

      {/* Upload Tab Content */}
      <TabsContent value="upload" className="flex-1 mt-0 overflow-hidden p-4">
        <IconUploadPanel onSuccess={() => {
          // Reload icons after successful upload
          toast.success('აიკონები განახლდა');
        }} />
      </TabsContent>

      {/* Stats Tab Content */}
      <TabsContent value="stats" className="flex-1 mt-0 overflow-auto p-4">
        <IconUsageStats 
          brokenIconsCount={verificationStats.broken}
          totalIcons={icons.length}
          onRefresh={refetch}
        />
      </TabsContent>

      {/* Bulk Reassign Tab Content */}
      <TabsContent value="reassign" className="flex-1 mt-0 overflow-auto p-4">
        <div className="max-w-4xl mx-auto">
          <BulkIconReassignment 
            icons={icons}
            brokenIconSlugs={brokenIconSlugs}
            onComplete={refetch}
          />
        </div>
      </TabsContent>

      {/* History Tab Content */}
      <TabsContent value="history" className="flex-1 mt-0 overflow-hidden">
        <IconAssignmentHistory 
          categories={categories.map(c => ({ id: c.id, uuid: (c as any).uuid, name: c.name, icon: c.icon }))} 
          getIconUrl={getIconUrl}
        />
      </TabsContent>
    </Tabs>
  );
}
