import { useState, useEffect } from 'react';
import { Search, X, Clock, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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

export function IconPickerModal({ open, onClose, currentSlug, currentKeyword, onSelect }: IconPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [icons, setIcons] = useState<IconItem[]>([]);
  const [recentIcons, setRecentIcons] = useState<IconItem[]>([]);
  const [suggestedIcons, setSuggestedIcons] = useState<IconItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [brokenIcons, setBrokenIcons] = useState<Set<string>>(new Set());

  const handleImageError = (slug: string) => {
    setBrokenIcons(prev => new Set([...prev, slug]));
  };

  const filterBrokenIcons = (iconList: IconItem[]) => 
    iconList.filter(icon => !brokenIcons.has(icon.slug));
  // Load recent and suggested icons when modal opens
  useEffect(() => {
    if (open) {
      loadRecentIcons();
      if (currentKeyword) {
        loadSuggestedIcons(currentKeyword);
      }
      setSearchQuery('');
      setIcons([]);
    }
  }, [open, currentKeyword]);

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

  const searchIcons = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('icon_library')
      .select('id, slug, title, icon_url')
      .or(`title.ilike.%${searchQuery}%,slug.ilike.%${searchQuery}%,tags.cs.{${searchQuery}}`)
      .limit(60);
    
    setIcons(data || []);
    setIsLoading(false);
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
          {visibleIcons.map((icon) => (
            <button
              key={icon.id}
              onClick={() => handleSelect(icon.slug)}
              className={cn(
                "aspect-square rounded-lg border border-border/50 flex items-center justify-center hover:border-primary/50 hover:bg-accent/50 transition-all hover:scale-105",
                currentSlug === icon.slug && "ring-2 ring-primary bg-primary/10",
                brokenIcons.has(icon.slug) && "hidden"
              )}
              title={icon.title}
            >
              <img 
                src={getIconUrl(icon)} 
                alt={icon.title}
                className="w-8 h-8 object-contain"
                onError={() => handleImageError(icon.slug)}
              />
            </button>
          ))}
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
                  {/* Suggested icons based on keyword */}
                  {suggestedIcons.length > 0 && (
                    <IconGrid icons={suggestedIcons} title="შეთავაზებული" icon={Sparkles} />
                  )}

                  {/* Recently used icons */}
                  {recentIcons.length > 0 && (
                    <IconGrid icons={recentIcons} title="ბოლოს გამოყენებული" icon={Clock} />
                  )}

                  {/* Empty state */}
                  {suggestedIcons.length === 0 && recentIcons.length === 0 && (
                    <div className="text-center py-8">
                      <Search className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        ჩაწერე საძიებო სიტყვა აიკონის მოსაძებნად
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
