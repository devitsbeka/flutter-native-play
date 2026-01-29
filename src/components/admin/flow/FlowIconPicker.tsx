import { useState, useEffect } from 'react';
import { Search, X, Clock, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { buildBilingualSearchTerms } from '@/utils/transliteration';

const ICON_STORAGE_URL = 'https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library';
const RECENT_ICONS_KEY = 'flow_recent_icons';
const MAX_RECENT_ICONS = 10;

// Helper functions for recent icons
function getRecentIconSlugs(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_ICONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addRecentIcon(slug: string) {
  if (!slug) return;
  const recent = getRecentIconSlugs().filter(s => s !== slug);
  recent.unshift(slug);
  localStorage.setItem(RECENT_ICONS_KEY, JSON.stringify(recent.slice(0, MAX_RECENT_ICONS)));
}

interface IconItem {
  id: string;
  slug: string;
  title: string;
  icon_url: string | null;
}

interface FlowIconPickerProps {
  currentIconSlug?: string;
  onSelect: (slug: string) => void;
  suggestedSlugs?: string[];
  questionText?: string;
  isExpanded?: boolean;
}

export function FlowIconPicker({ currentIconSlug, onSelect, suggestedSlugs = [], questionText, isExpanded = false }: FlowIconPickerProps) {
  const [isOpen, setIsOpen] = useState(isExpanded);
  const [searchQuery, setSearchQuery] = useState('');
  const [icons, setIcons] = useState<IconItem[]>([]);
  const [suggestedIcons, setSuggestedIcons] = useState<IconItem[]>([]);
  const [recentIcons, setRecentIcons] = useState<IconItem[]>([]);
  const [contextIcons, setContextIcons] = useState<IconItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load recent icons when picker opens
  useEffect(() => {
    if (isOpen) {
      loadRecentIcons();
    }
  }, [isOpen]);

  // Load suggested icons when picker opens
  useEffect(() => {
    if (isOpen && suggestedSlugs.length > 0) {
      loadSuggestedIcons();
    }
  }, [isOpen, suggestedSlugs]);

  // Load context-based icons when picker opens
  useEffect(() => {
    if (isOpen && questionText) {
      loadContextIcons(questionText);
    }
  }, [isOpen, questionText]);

  // Search icons when query changes
  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchIcons();
    } else if (searchQuery.length === 0) {
      setIcons([]);
    }
  }, [searchQuery]);

  const loadRecentIcons = async () => {
    const recentSlugs = getRecentIconSlugs();
    if (recentSlugs.length === 0) {
      setRecentIcons([]);
      return;
    }

    const { data } = await supabase
      .from('icon_library')
      .select('id, slug, title, icon_url')
      .in('slug', recentSlugs);

    if (data) {
      // Preserve order from localStorage
      const sorted = recentSlugs
        .map(slug => data.find(icon => icon.slug === slug))
        .filter(Boolean) as IconItem[];
      setRecentIcons(sorted);
    }
  };

  const loadSuggestedIcons = async () => {
    const { data } = await supabase
      .from('icon_library')
      .select('id, slug, title, icon_url')
      .in('slug', suggestedSlugs)
      .limit(10);
    
    if (data) {
      setSuggestedIcons(data);
    }
  };

  const loadContextIcons = async (question: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('smart-icon-search', {
        body: { query: question, limit: 12 }
      });

      if (data?.results) {
        setContextIcons(data.results);
      }
    } catch (err) {
      console.error('Error loading context icons:', err);
    }
  };

  const searchIcons = async () => {
    setIsLoading(true);
    
    // Build bilingual search terms from user input
    const searchTerms = buildBilingualSearchTerms(searchQuery);
    
    // Build OR conditions for all terms
    const orConditions = searchTerms.flatMap(term => [
      `title.ilike.%${term}%`,
      `slug.ilike.%${term}%`,
      `tags.cs.{${term}}`
    ]).join(',');
    
    const { data } = await supabase
      .from('icon_library')
      .select('id, slug, title, icon_url')
      .or(orConditions)
      .limit(50);
    
    // Score and sort results - prioritize exact matches
    const scored = (data || []).map(icon => {
      let score = 0;
      const queryLower = searchQuery.toLowerCase();
      
      // Exact slug match = highest priority
      if (icon.slug.toLowerCase() === queryLower) score += 100;
      // Slug starts with query
      else if (icon.slug.toLowerCase().startsWith(queryLower)) score += 50;
      // Slug contains query
      else if (icon.slug.toLowerCase().includes(queryLower)) score += 25;
      
      // Title matches
      if (icon.title.toLowerCase().includes(queryLower)) score += 10;
      
      return { ...icon, score };
    });
    
    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    
    setIcons(scored);
    setIsLoading(false);
  };

  const handleSelect = (slug: string) => {
    if (slug) {
      addRecentIcon(slug);
    }
    onSelect(slug);
    setIsOpen(false);
    setSearchQuery('');
  };

  const getIconUrl = (icon: IconItem) => {
    if (icon.icon_url) return icon.icon_url;
    return `${ICON_STORAGE_URL}/${icon.slug}.png`;
  };

  const currentIconUrl = currentIconSlug 
    ? `${ICON_STORAGE_URL}/${currentIconSlug}.png`
    : null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center justify-center rounded-lg border border-border/50 hover:border-primary/50 transition-colors",
            currentIconSlug ? "w-10 h-10 p-1" : "px-2 py-1"
          )}
        >
          {currentIconUrl ? (
            <img 
              src={currentIconUrl} 
              alt="Question icon"
              className="w-7 h-7 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <span className="text-xs text-muted-foreground">+ Icon</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search 9k icons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-8 h-9"
              autoFocus
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        <ScrollArea className="h-72">
          <div className="p-3 space-y-4">
            {/* Recently used icons */}
            {!searchQuery && recentIcons.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">ბოლოს გამოყენებული</p>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {recentIcons.map((icon) => (
                    <button
                      key={icon.id}
                      onClick={() => handleSelect(icon.slug)}
                      className={cn(
                        "w-12 h-12 rounded-lg border border-border/50 flex items-center justify-center hover:border-primary/50 hover:bg-accent/50 transition-colors",
                        currentIconSlug === icon.slug && "ring-2 ring-primary"
                      )}
                      title={icon.title}
                    >
                      <img 
                        src={getIconUrl(icon)} 
                        alt={icon.title}
                        className="w-8 h-8 object-contain"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Context-based + suggested icons */}
            {!searchQuery && (contextIcons.length > 0 || suggestedIcons.length > 0) && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <p className="text-xs text-muted-foreground">რეკომენდებული</p>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {/* Combine and dedupe context + suggested icons */}
                  {[...contextIcons, ...suggestedIcons]
                    .filter((icon, idx, arr) => 
                      arr.findIndex(i => i.slug === icon.slug) === idx
                    )
                    .slice(0, 15)
                    .map((icon) => (
                      <button
                        key={icon.id}
                        onClick={() => handleSelect(icon.slug)}
                        className={cn(
                          "w-12 h-12 rounded-lg border border-border/50 flex items-center justify-center hover:border-primary/50 hover:bg-accent/50 transition-colors",
                          currentIconSlug === icon.slug && "ring-2 ring-primary"
                        )}
                        title={icon.title}
                      >
                        <img 
                          src={getIconUrl(icon)} 
                          alt={icon.title}
                          className="w-8 h-8 object-contain"
                        />
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Search results */}
            {searchQuery && (
              <div>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Searching...</p>
                ) : icons.length > 0 ? (
                  <div className="grid grid-cols-5 gap-2">
                    {icons.map((icon) => (
                      <button
                        key={icon.id}
                        onClick={() => handleSelect(icon.slug)}
                        className={cn(
                          "w-12 h-12 rounded-lg border border-border/50 flex items-center justify-center hover:border-primary/50 hover:bg-accent/50 transition-colors",
                          currentIconSlug === icon.slug && "ring-2 ring-primary"
                        )}
                        title={icon.title}
                      >
                        <img 
                          src={getIconUrl(icon)} 
                          alt={icon.title}
                          className="w-8 h-8 object-contain"
                        />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No icons found</p>
                )}
              </div>
            )}

            {/* Empty state */}
            {!searchQuery && recentIcons.length === 0 && contextIcons.length === 0 && suggestedIcons.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Type to search icons
              </p>
            )}
          </div>
        </ScrollArea>

        {currentIconSlug && (
          <div className="p-2 border-t border-border/50">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-destructive hover:text-destructive"
              onClick={() => handleSelect('')}
            >
              Remove icon
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
