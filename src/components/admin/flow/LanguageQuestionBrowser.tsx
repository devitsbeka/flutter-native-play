import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from "@/lib/toast";
import { Library, Rocket, ArrowRight, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Category } from '@/pages/admin/Flow';

type ProductionStatus = 'library' | 'production';

interface CategoryCount {
  categoryId: string;
  categoryName: string;
  count: number;
}

interface QuestionRow {
  id: string;
  question_text: string;
  correct_answer: string;
  category_id: string;
  difficulty: string;
  in_production: boolean;
}

interface Props {
  language: string;
  languageFlag: string;
  languageName: string;
  categories: Category[];
  onStatsChanged: () => void;
}

export function LanguageQuestionBrowser({ language, languageFlag, languageName, categories, onStatsChanged }: Props) {
  const [activeTab, setActiveTab] = useState<ProductionStatus>('library');
  const [categoryCounts, setCategoryCounts] = useState<CategoryCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [moving, setMoving] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(true);
  const [totalLib, setTotalLib] = useState(0);
  const [totalProd, setTotalProd] = useState(0);

  // Cache translated category names for non-ka languages
  const translatedNamesRef = useRef<Map<string, string>>(new Map());

  // Fetch translated category names when language changes
  useEffect(() => {
    if (language === 'ka') {
      translatedNamesRef.current = new Map();
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('category_translations')
        .select('category_id, name')
        .eq('language', language);
      const map = new Map<string, string>();
      (data || []).forEach(t => map.set(t.category_id, t.name));
      translatedNamesRef.current = map;
    })();
  }, [language]);

  const getCategoryName = useCallback((categoryId: string) => {
    if (language !== 'ka') {
      const translated = translatedNamesRef.current.get(categoryId);
      if (translated) return translated;
    }
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || categoryId;
  }, [language, categories]);

  const fetchCategoryCounts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('category_id, in_production')
        .eq('language', language)
        .eq('is_active', true);

      if (error) throw error;

      const libCounts = new Map<string, number>();
      const prodCounts = new Map<string, number>();
      let libTotal = 0;
      let prodTotal = 0;

      (data || []).forEach(q => {
        const map = q.in_production ? prodCounts : libCounts;
        map.set(q.category_id, (map.get(q.category_id) || 0) + 1);
        if (q.in_production) prodTotal++;
        else libTotal++;
      });

      setTotalLib(libTotal);
      setTotalProd(prodTotal);

      const countsMap = activeTab === 'library' ? libCounts : prodCounts;
      const counts: CategoryCount[] = [];
      
      countsMap.forEach((count, categoryId) => {
        counts.push({
          categoryId,
          categoryName: getCategoryName(categoryId),
          count,
        });
      });

      counts.sort((a, b) => b.count - a.count);
      setCategoryCounts(counts);
      setSelectedCategories(new Set());
    } catch (err) {
      console.error('Error fetching category counts:', err);
    } finally {
      setLoading(false);
    }
  }, [language, activeTab, categories, getCategoryName]);

  useEffect(() => {
    fetchCategoryCounts();
  }, [fetchCategoryCounts]);

  const totalSelected = useMemo(() => {
    return categoryCounts
      .filter(c => selectedCategories.has(c.categoryId))
      .reduce((sum, c) => sum + c.count, 0);
  }, [selectedCategories, categoryCounts]);

  const totalInTab = useMemo(() => {
    return categoryCounts.reduce((sum, c) => sum + c.count, 0);
  }, [categoryCounts]);

  const toggleCategory = (catId: string) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedCategories(new Set(categoryCounts.map(c => c.categoryId)));
  };

  const deselectAll = () => {
    setSelectedCategories(new Set());
  };

  const handleBulkMove = async () => {
    if (selectedCategories.size === 0) return;

    const targetStatus = activeTab === 'library' ? true : false;
    const targetLabel = activeTab === 'library' ? 'Production' : 'Library';
    
    const confirmed = window.confirm(
      `Move ${totalSelected.toLocaleString()} questions from ${categoryCounts.filter(c => selectedCategories.has(c.categoryId)).map(c => c.categoryName).join(', ')} to ${targetLabel}?`
    );
    if (!confirmed) return;

    setMoving(true);
    try {
      const categoryIds = Array.from(selectedCategories);
      
      const { error } = await supabase
        .from('questions')
        .update({ in_production: targetStatus })
        .eq('language', language)
        .eq('is_active', true)
        .eq('in_production', !targetStatus)
        .in('category_id', categoryIds);

      if (error) throw error;

      toast.success(`Moved ${totalSelected.toLocaleString()} questions to ${targetLabel}`);
      setSelectedCategories(new Set());
      fetchCategoryCounts();
      onStatsChanged();
    } catch (err) {
      console.error('Bulk move error:', err);
      toast.error('Failed to move questions');
    } finally {
      setMoving(false);
    }
  };

  const handleMoveAll = async () => {
    if (totalInTab === 0) return;

    const targetStatus = activeTab === 'library' ? true : false;
    const targetLabel = activeTab === 'library' ? 'Production' : 'Library';
    
    const confirmed = window.confirm(
      `Move ALL ${totalInTab.toLocaleString()} ${languageName} questions to ${targetLabel}?`
    );
    if (!confirmed) return;

    setMoving(true);
    try {
      const { error } = await supabase
        .from('questions')
        .update({ in_production: targetStatus })
        .eq('language', language)
        .eq('is_active', true)
        .eq('in_production', !targetStatus);

      if (error) throw error;

      toast.success(`Moved all ${totalInTab.toLocaleString()} questions to ${targetLabel}`);
      fetchCategoryCounts();
      onStatsChanged();
    } catch (err) {
      console.error('Move all error:', err);
      toast.error('Failed to move questions');
    } finally {
      setMoving(false);
    }
  };

  return (
    <div className="border-b border-border/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium hover:bg-accent/30 transition-colors"
      >
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <span className="text-lg">{languageFlag}</span>
        <span>{languageName} Questions Browser</span>
        <Badge variant="secondary" className="ml-auto text-xs">
          {totalLib}L / {totalProd}P
        </Badge>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Tab Switcher */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setActiveTab('library')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all flex-1 justify-center",
                activeTab === 'library'
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Library className="h-4 w-4" />
              <span>Library</span>
              <Badge variant="secondary" className="ml-1 text-xs">
                {totalLib.toLocaleString()}
              </Badge>
            </button>
            
            <button
              onClick={() => setActiveTab('production')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all flex-1 justify-center",
                activeTab === 'production'
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Rocket className="h-4 w-4" />
              <span>Production</span>
              <Badge variant="secondary" className="ml-1 text-xs bg-green-500/20 text-green-700">
                {totalProd.toLocaleString()}
              </Badge>
            </button>
          </div>

          {/* Category List */}
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : categoryCounts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No questions in {activeTab}
            </p>
          ) : (
            <>
              {/* Selection Controls */}
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectedCategories.size === categoryCounts.length ? deselectAll : selectAll}
                  className="text-xs h-7"
                >
                  {selectedCategories.size === categoryCounts.length ? 'Deselect All' : 'Select All'}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {categoryCounts.length} categories
                </span>
              </div>

              {/* Categories */}
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {categoryCounts.map(cat => (
                  <label
                    key={cat.categoryId}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm",
                      selectedCategories.has(cat.categoryId)
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-accent/30 border border-transparent"
                    )}
                  >
                    <Checkbox
                      checked={selectedCategories.has(cat.categoryId)}
                      onCheckedChange={() => toggleCategory(cat.categoryId)}
                    />
                    <span className="flex-1 truncate">{cat.categoryName}</span>
                    <Badge variant="outline" className="text-xs font-mono">
                      {cat.count.toLocaleString()}
                    </Badge>
                  </label>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                {selectedCategories.size > 0 && (
                  <Button
                    onClick={handleBulkMove}
                    disabled={moving}
                    size="sm"
                    className="gap-2 flex-1"
                  >
                    {moving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                    Move {totalSelected.toLocaleString()} → {activeTab === 'library' ? 'Prod' : 'Lib'}
                  </Button>
                )}
                
                <Button
                  onClick={handleMoveAll}
                  disabled={moving || totalInTab === 0}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  Move All ({totalInTab.toLocaleString()}) → {activeTab === 'library' ? 'Prod' : 'Lib'}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
