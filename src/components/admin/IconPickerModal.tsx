import { useState, useEffect } from 'react';
import { Search, X, Clock, Sparkles, Lightbulb, AlertTriangle, Shuffle, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { CONTEXT_KEYWORD_MAP } from '@/components/admin/KeywordSuggestions';
import { validateIconKeyword } from '@/utils/iconAnswerValidation';

const ICON_STORAGE_URL = 'https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library';

interface IconItem {
  id: string;
  slug: string;
  title: string;
  icon_url: string | null;
}

interface IconPickerModalProps {
  open: boolean;
  onClose: () => void;
  currentSlug?: string | null;
  currentKeyword?: string | null;
  questionText?: string;      // For context analysis
  correctAnswer?: string;     // For context analysis
  onSelect: (slug: string) => void;
}

// Store recently used icons in localStorage
const RECENT_ICONS_KEY = 'recentIcons';
const MAX_RECENT_ICONS = 15;

function getRecentIcons(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_ICONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addRecentIcon(slug: string) {
  if (!slug) return;
  const recent = getRecentIcons().filter(s => s !== slug);
  recent.unshift(slug);
  localStorage.setItem(RECENT_ICONS_KEY, JSON.stringify(recent.slice(0, MAX_RECENT_ICONS)));
}

export function IconPickerModal({ open, onClose, currentSlug, currentKeyword, questionText, correctAnswer, onSelect }: IconPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [icons, setIcons] = useState<IconItem[]>([]);
  const [recentIcons, setRecentIcons] = useState<IconItem[]>([]);
  const [suggestedIcons, setSuggestedIcons] = useState<IconItem[]>([]);
  const [contextIcons, setContextIcons] = useState<IconItem[]>([]);
  const [randomIcons, setRandomIcons] = useState<IconItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRandom, setIsLoadingRandom] = useState(false);
  const [brokenIcons, setBrokenIcons] = useState<Set<string>>(new Set());

  const handleImageError = (slug: string) => {
    setBrokenIcons(prev => new Set([...prev, slug]));
  };

  const filterBrokenIcons = (iconList: IconItem[]) => 
    iconList.filter(icon => !brokenIcons.has(icon.slug));

  // Fetch random icons
  const fetchRandomIcons = async () => {
    setIsLoadingRandom(true);
    try {
      const { count } = await supabase
        .from('icon_library')
        .select('*', { count: 'exact', head: true });
      
      const totalCount = count || 500;
      const offset = Math.floor(Math.random() * Math.max(1, totalCount - 30));
      
      const { data } = await supabase
        .from('icon_library')
        .select('id, slug, title, icon_url')
        .range(offset, offset + 29);
      
      // Shuffle for extra randomness
      const shuffled = [...(data || [])].sort(() => Math.random() - 0.5);
      setRandomIcons(shuffled);
    } catch (error) {
      console.error('Error fetching random icons:', error);
    } finally {
      setIsLoadingRandom(false);
    }
  };

  // Load recent, suggested, context-based, and random icons when modal opens
  useEffect(() => {
    if (open) {
      loadRecentIcons();
      fetchRandomIcons();
      if (currentKeyword) {
        loadSuggestedIcons(currentKeyword);
      }
      if (questionText) {
        loadContextIcons(questionText, correctAnswer);
      }
      setSearchQuery('');
      setIcons([]);
    }
  }, [open, currentKeyword, questionText, correctAnswer]);

  // Search icons when query changes
  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchIcons();
    } else if (searchQuery.length === 0) {
      setIcons([]);
    }
  }, [searchQuery]);

  const loadRecentIcons = async () => {
    const recentSlugs = getRecentIcons();
    if (recentSlugs.length === 0) return;

    const { data } = await supabase
      .from('icon_library')
      .select('id, slug, title, icon_url')
      .in('slug', recentSlugs)
      .limit(MAX_RECENT_ICONS);
    
    if (data) {
      // Sort by the order in recentSlugs
      const sorted = recentSlugs
        .map(slug => data.find(icon => icon.slug === slug))
        .filter(Boolean) as IconItem[];
      setRecentIcons(sorted);
    }
  };

  const loadSuggestedIcons = async (keyword: string) => {
    // Search for icons matching the keyword
    const { data } = await supabase
      .from('icon_library')
      .select('id, slug, title, icon_url')
      .or(`title.ilike.%${keyword}%,slug.ilike.%${keyword}%,tags.cs.{${keyword}}`)
      .limit(10);
    
    if (data) {
      setSuggestedIcons(data);
    }
  };

  // Load context-based icons by analyzing question text ONLY (not answer!)
  const loadContextIcons = async (question: string, answer?: string) => {
    // CRITICAL: Only analyze the question, NOT the answer!
    // Using the answer would suggest icons that reveal the correct answer
    const text = question.toLowerCase();
    const keywordSet = new Set<string>();
    
    // Find matching keywords from context map
    for (const [pattern, iconKeywords] of Object.entries(CONTEXT_KEYWORD_MAP)) {
      if (text.includes(pattern)) {
        iconKeywords.slice(0, 3).forEach(kw => keywordSet.add(kw));
      }
    }
    
    // Filter out keywords that would reveal the answer
    let keywords = [...keywordSet];
    if (answer) {
      keywords = keywords.filter(kw => {
        const validation = validateIconKeyword(kw, answer);
        return validation.isValid;
      });
    }
    
    keywords = keywords.slice(0, 8);
    if (keywords.length === 0) {
      setContextIcons([]);
      return;
    }
    
    // Build OR query for all keywords
    const orConditions = keywords.map(kw => `slug.ilike.%${kw}%`).join(',');
    
    const { data } = await supabase
      .from('icon_library')
      .select('id, slug, title, icon_url')
      .or(orConditions)
      .limit(20);
    
    if (data) {
      // Filter results to exclude icons that reveal the answer
      const safeIcons = answer 
        ? data.filter(icon => validateIconKeyword(icon.slug, answer).isValid)
        : data;
      setContextIcons(safeIcons);
    }
  };

  // Check if text contains Georgian characters
  const isGeorgian = (text: string) => /[\u10A0-\u10FF]/.test(text);

  const searchIcons = async () => {
    setIsLoading(true);
    try {
      // Always use smart search for both Georgian AND English queries
      const { data, error } = await supabase.functions.invoke('smart-icon-search', {
        body: { query: searchQuery, limit: 60 }
      });
      
      if (error) throw error;
      setIcons(data?.icons || []);
    } catch (error) {
      console.error('Error searching icons:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (slug: string) => {
    addRecentIcon(slug);
    onSelect(slug);
    onClose();
  };

  const getIconUrl = (icon: IconItem) => {
    if (icon.icon_url) return icon.icon_url;
    return `${ICON_STORAGE_URL}/${icon.slug}.png`;
  };

  const getIconUrlFromSlug = (slug: string) => {
    return `${ICON_STORAGE_URL}/${slug}.png`;
  };

  const IconGrid = ({ icons, title, icon: Icon }: { icons: IconItem[], title: string, icon?: React.ElementType }) => {
    const visibleIcons = filterBrokenIcons(icons);
    if (visibleIcons.length === 0) return null;
    
    return (
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {visibleIcons.map((icon) => {
            // Check if this icon would reveal the answer
            const validation = correctAnswer 
              ? validateIconKeyword(icon.slug, correctAnswer)
              : { isValid: true, severity: 'ok' as const };
            const isBlocked = !validation.isValid && validation.severity === 'error';
            const isWarning = !validation.isValid && validation.severity === 'warning';
            
            return (
              <button
                key={icon.id}
                onClick={() => !isBlocked && handleSelect(icon.slug)}
                disabled={isBlocked}
                className={cn(
                  "aspect-square rounded-lg border border-border/50 flex items-center justify-center transition-all relative",
                  currentSlug === icon.slug && "ring-2 ring-primary bg-primary/10",
                  brokenIcons.has(icon.slug) && "hidden",
                  isBlocked && "opacity-40 cursor-not-allowed border-destructive/50 bg-destructive/10",
                  isWarning && "border-yellow-500/50 bg-yellow-500/10",
                  !isBlocked && "hover:border-primary/50 hover:bg-accent/50 hover:scale-105"
                )}
                title={isBlocked ? validation.warning : isWarning ? validation.warning : icon.title}
              >
                <img 
                  src={getIconUrl(icon)} 
                  alt={icon.title}
                  className="w-8 h-8 object-contain"
                  onError={() => handleImageError(icon.slug)}
                />
                {/* Warning badge for icons that might reveal answer */}
                {(isBlocked || isWarning) && (
                  <div className={cn(
                    "absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center",
                    isBlocked ? "bg-destructive" : "bg-yellow-500"
                  )}>
                    <AlertTriangle className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            აიკონის არჩევა
            {currentKeyword && (
              <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                🏷️ {currentKeyword}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="მოძებნე 9000+ აიკონში..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
              autoFocus
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-foreground"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Current icon display */}
          {currentSlug && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <img 
                src={getIconUrlFromSlug(currentSlug)} 
                alt="Current icon"
                className="w-10 h-10 object-contain"
              />
              <div className="flex-1">
                <p className="text-sm font-medium">მიმდინარე აიკონი</p>
                <p className="text-xs text-muted-foreground">{currentSlug}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => handleSelect('')}
              >
                წაშლა
              </Button>
            </div>
          )}

          <ScrollArea className="h-[350px]">
            <div className="pr-4">
              {/* Search results */}
              {searchQuery && (
                <div>
                  {isLoading ? (
                    <p className="text-sm text-muted-foreground text-center py-8">იძებნება...</p>
                  ) : icons.length > 0 ? (
                    <IconGrid icons={icons} title={`${icons.length} შედეგი`} icon={Search} />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">აიკონი ვერ მოიძებნა</p>
                  )}
                </div>
              )}

              {/* Non-search state */}
              {!searchQuery && (
                <>
                  {/* Context-based icons (from question analysis) */}
                  {contextIcons.length > 0 && (
                    <IconGrid icons={contextIcons} title="კონტექსტის მიხედვით" icon={Lightbulb} />
                  )}

                  {/* Suggested icons based on keyword */}
                  {suggestedIcons.length > 0 && (
                    <IconGrid icons={suggestedIcons} title="შეთავაზებული" icon={Sparkles} />
                  )}

                  {/* Recently used icons */}
                  {recentIcons.length > 0 && (
                    <IconGrid icons={recentIcons} title="ბოლოს გამოყენებული" icon={Clock} />
                  )}

                  {/* Random icons section */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Shuffle className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm font-medium text-muted-foreground">რანდომ აიკონები</p>
                      </div>
                      <button
                        onClick={fetchRandomIcons}
                        disabled={isLoadingRandom}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 text-muted-foreground ${isLoadingRandom ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                    {isLoadingRandom ? (
                      <div className="flex items-center justify-center py-6">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-6 gap-2">
                        {filterBrokenIcons(randomIcons).map((icon) => {
                          const validation = correctAnswer 
                            ? validateIconKeyword(icon.slug, correctAnswer)
                            : { isValid: true, severity: 'ok' as const };
                          const isBlocked = !validation.isValid && validation.severity === 'error';
                          const isWarning = !validation.isValid && validation.severity === 'warning';
                          
                          return (
                            <button
                              key={icon.id}
                              onClick={() => !isBlocked && handleSelect(icon.slug)}
                              disabled={isBlocked}
                              className={cn(
                                "aspect-square rounded-lg border border-border/50 flex items-center justify-center transition-all relative",
                                currentSlug === icon.slug && "ring-2 ring-primary bg-primary/10",
                                brokenIcons.has(icon.slug) && "hidden",
                                isBlocked && "opacity-40 cursor-not-allowed border-destructive/50 bg-destructive/10",
                                isWarning && "border-yellow-500/50 bg-yellow-500/10",
                                !isBlocked && "hover:border-primary/50 hover:bg-accent/50 hover:scale-105"
                              )}
                              title={isBlocked ? validation.warning : isWarning ? validation.warning : icon.title}
                            >
                              <img 
                                src={getIconUrl(icon)} 
                                alt={icon.title}
                                className="w-8 h-8 object-contain"
                                onError={() => handleImageError(icon.slug)}
                              />
                              {(isBlocked || isWarning) && (
                                <div className={cn(
                                  "absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center",
                                  isBlocked ? "bg-destructive" : "bg-yellow-500"
                                )}>
                                  <AlertTriangle className="w-3 h-3 text-white" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
