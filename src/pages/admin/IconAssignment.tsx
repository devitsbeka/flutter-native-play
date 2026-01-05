import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Image, Check, X, Loader2, Wand2, Play, StopCircle, Sparkles, AlertTriangle, CheckCircle, Clock, History, Trash2, CheckSquare, Square, CheckCheck, Upload, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAdminIconAssignment, QuestionForAssignment } from '@/hooks/useAdminIconAssignment';
import { useIconLibrary } from '@/hooks/useIconLibrary';
import { useIconVerification } from '@/hooks/useIconVerification';
import { supabase } from '@/integrations/supabase/client';

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
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [iconSearchTerm, setIconSearchTerm] = useState('');
  const [icons, setIcons] = useState<IconItem[]>([]);
  const [iconsLoading, setIconsLoading] = useState(true);
  const [iconsLoadProgress, setIconsLoadProgress] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);
  
  // Use server-side broken icons instead of client-side tracking
  const brokenIconSlugs = useMemo(() => new Set(serverBrokenIcons.map(i => i.slug)), [serverBrokenIcons]);
  const [showBrokenIconsModal, setShowBrokenIconsModal] = useState(false);
  
  // Track recently fixed icons to show them first
  const [recentlyFixedSlugs, setRecentlyFixedSlugs] = useState<Set<string>>(new Set());
  
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

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col overflow-hidden">
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
      <TabsContent value="questions" className="flex-1 mt-0 overflow-hidden flex flex-col">
      {/* Header with Stats and Batch Controls */}
      <div className="border-b border-border/50 bg-card/30 p-4">
        
        {/* Visual Progress Bar */}
        <div className="mt-4 rounded-lg border border-border/50 bg-background/50 p-3">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">მინიჭების პროგრესი</span>
            <span className="font-medium">
              {stats.withIcons.toLocaleString()} / {stats.total.toLocaleString()} 
              <span className="ml-2 text-muted-foreground">
                ({stats.total > 0 ? Math.round((stats.withIcons / stats.total) * 100) : 0}%)
              </span>
            </span>
          </div>
          <Progress 
            value={stats.total > 0 ? (stats.withIcons / stats.total) * 100 : 0} 
            className="h-3"
          />
        </div>

        {/* Fast Assignment Controls */}
        <div className="mt-4 space-y-3">
          {/* Assignment Buttons */}
          <div className="flex items-center gap-4 rounded-lg border border-border/50 bg-background/50 p-3">
            <Wand2 className="h-5 w-5 text-violet-500" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {batchMode === 'diversify' ? 'სმარტ დივერსიფიკაცია' : 'სწრაფი მინიჭება (5x)'}
              </p>
              <p className="text-xs text-muted-foreground">
                {batchMode === 'diversify'
                  ? `სკანირებს ყველა კითხვას და პოულობს უფრო რელევანტურ აიკონებს (დასკანირდა: ${totalScanned})`
                  : categoryFilter 
                    ? `არჩეული კატეგორიის ${stats.withoutIcons} კითხვას დაამუშავებს`
                    : `ყველა ${stats.withoutIcons} კითხვას დაამუშავებს`
                } • Keyword + Title + Tags matching
              </p>
            </div>
            
            {batchRunning ? (
              <div className="flex items-center gap-3">
                <div className="w-72">
                  <Progress value={batchProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {batchStats.processed} დამუშავებული • {batchStats.assigned} {batchMode === 'diversify' ? 'შეცვლილი' : 'მინიჭებული'}
                    {batchStats.uniqueIcons > 0 && (
                      <span className="text-amber-500 ml-1">• {batchStats.uniqueIcons} უნიკალური</span>
                    )}
                  </p>
                  {Object.keys(methodBreakdown).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {methodBreakdown['topic-mapping'] && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
                          topic: {methodBreakdown['topic-mapping']}
                        </span>
                      )}
                      {methodBreakdown['title-match'] && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                          title: {methodBreakdown['title-match']}
                        </span>
                      )}
                      {methodBreakdown['tag-match'] && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400">
                          tag: {methodBreakdown['tag-match']}
                        </span>
                      )}
                      {methodBreakdown['exact-slug'] && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                          exact: {methodBreakdown['exact-slug']}
                        </span>
                      )}
                      {methodBreakdown['topic-diversify'] && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
                          diversify: {methodBreakdown['topic-diversify']}
                        </span>
                      )}
                      {methodBreakdown['category-fallback'] && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">
                          fallback: {methodBreakdown['category-fallback']}
                        </span>
                      )}
                      {methodBreakdown['diversify-to-default'] && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                          to-default: {methodBreakdown['diversify-to-default']}
                        </span>
                      )}
                      {methodBreakdown['already-optimal'] && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400">
                          optimal: {methodBreakdown['already-optimal']}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={stopBatchAssignment}
                >
                  <StopCircle className="h-4 w-4 mr-1" />
                  გაჩერება
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => runBatchAssignment('assign')}
                  disabled={stats.withoutIcons === 0}
                  className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                >
                  <Play className="h-4 w-4 mr-1" />
                  მინიჭება ({stats.withoutIcons.toLocaleString()})
                </Button>
                <Button
                  onClick={() => runBatchAssignment('diversify')}
                  variant="outline"
                  className="border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  დივერსიფიკაცია
                </Button>
                <Button
                  onClick={resetAllIcons}
                  disabled={resetting || stats.withIcons === 0}
                  variant="outline"
                  className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                >
                  {resetting ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-1" />
                  )}
                  რესეტი
                </Button>
              </div>
            )}
          </div>
          
          {/* Method Breakdown Summary - shown after batch completion */}
          {!batchRunning && Object.keys(methodBreakdown).length > 0 && batchStats.processed > 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
              <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-400">ბოლო მინიჭების შედეგი</p>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {methodBreakdown['exact-slug'] && (
                    <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">
                      ზუსტი მატჩი: {methodBreakdown['exact-slug']}
                    </span>
                  )}
                  {methodBreakdown['partial-slug'] && (
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                      ნაწილობრივი: {methodBreakdown['partial-slug']}
                    </span>
                  )}
                  {methodBreakdown['tag-match'] && (
                    <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400">
                      თეგი: {methodBreakdown['tag-match']}
                    </span>
                  )}
                  {methodBreakdown['category-fallback'] && (
                    <span className="text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-400">
                      კატეგორია fallback: {methodBreakdown['category-fallback']}
                    </span>
                  )}
                  {methodBreakdown['none'] && (
                    <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                      მატჩი ვერ მოიძებნა: {methodBreakdown['none']}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMethodBreakdown({})}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Two Panel Layout */}
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-0">
        {/* Left Panel - Questions */}
        <div className="flex min-h-0 flex-col border-r border-border/50">
          {/* Question Filters */}
          <div className="space-y-3 border-b border-border/30 p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="კითხვის ძიება..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <Select
                value={categoryFilter || 'all'}
                onValueChange={(v) => setCategoryFilter(v === 'all' ? null : v)}
              >
                <SelectTrigger className="flex-1">
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

        {/* Right Panel - Icon Picker */}
        <div className="flex min-h-0 flex-col bg-muted/20">
          {/* Bulk Selection Preview */}
          {selectedQuestionIds.size > 0 && (
            <div className="border-b border-border/30 p-4 bg-primary/5">
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
            <div className="border-b border-border/30 p-4 bg-card/50">
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

          {/* Icon Search */}
          <div className="p-3 border-b border-border/30">
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
          <ScrollArea className="flex-1">
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
                    <button
                      key={icon.slug}
                      onClick={() => handleAssignIcon(icon.slug)}
                      disabled={!hasSelection || bulkAssigning}
                      className={cn(
                        "group relative flex flex-col items-center gap-1 rounded-lg p-2 transition-all",
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
      </TabsContent>

      {/* Upload Tab Content */}
      <TabsContent value="upload" className="flex-1 mt-0 overflow-hidden p-4">
        <IconUploadPanel onSuccess={() => {
          // Reload icons after successful upload
          toast.success('აიკონები განახლდა');
        }} />
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
