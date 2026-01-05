import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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

interface FlowIconPickerProps {
  currentIconSlug?: string;
  onSelect: (slug: string) => void;
  suggestedSlugs?: string[];
}

export function FlowIconPicker({ currentIconSlug, onSelect, suggestedSlugs = [] }: FlowIconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [icons, setIcons] = useState<IconItem[]>([]);
  const [suggestedIcons, setSuggestedIcons] = useState<IconItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load suggested icons when picker opens
  useEffect(() => {
    if (isOpen && suggestedSlugs.length > 0) {
      loadSuggestedIcons();
    }
  }, [isOpen, suggestedSlugs]);

  // Search icons when query changes
  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchIcons();
    } else if (searchQuery.length === 0) {
      setIcons([]);
    }
  }, [searchQuery]);

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

  const searchIcons = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('icon_library')
      .select('id, slug, title, icon_url')
      .or(`title.ilike.%${searchQuery}%,slug.ilike.%${searchQuery}%,tags.cs.{${searchQuery}}`)
      .limit(50);
    
    setIcons(data || []);
    setIsLoading(false);
  };

  const handleSelect = (slug: string) => {
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

        <ScrollArea className="h-64">
          <div className="p-3">
            {/* Suggested icons */}
            {suggestedIcons.length > 0 && !searchQuery && (
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-2">Suggested</p>
                <div className="grid grid-cols-5 gap-2">
                  {suggestedIcons.map((icon) => (
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
            {!searchQuery && suggestedIcons.length === 0 && (
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
