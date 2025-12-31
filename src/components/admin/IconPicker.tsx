import { useState, useEffect } from 'react';
import { Search, Loader2, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { IconUploader } from './IconUploader';

interface IconItem {
  slug: string;
  title: string;
  tags: string[];
  category: string;
  icon_url: string | null;
}

interface IconPickerProps {
  value?: string;
  onChange: (slug: string) => void;
}

const ICON_STORAGE_URL = 'https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library';

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [icons, setIcons] = useState<IconItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [showUploader, setShowUploader] = useState(false);

  const refreshIcons = async () => {
    const { count } = await supabase
      .from('icon_library')
      .select('*', { count: 'exact', head: true });
    setTotalCount(count || 0);

    const { data } = await supabase
      .from('icon_library')
      .select('slug, title, tags, category, icon_url')
      .order('title')
      .limit(100);
    setIcons(data || []);
  };

  useEffect(() => {
    async function loadIcons() {
      try {
        // Get total count
        const { count } = await supabase
          .from('icon_library')
          .select('*', { count: 'exact', head: true });
        
        setTotalCount(count || 0);

        // Load first 100 icons
        const { data, error } = await supabase
          .from('icon_library')
          .select('slug, title, tags, category, icon_url')
          .order('title')
          .limit(100);

        if (error) throw error;
        setIcons(data || []);
      } catch (error) {
        console.error('Failed to load icons:', error);
      } finally {
        setLoading(false);
      }
    }
    loadIcons();
  }, []);

  // Search icons from database when search term changes
  const searchIcons = async (term: string) => {
    if (!term.trim()) {
      // Reset to first 100 when search is cleared
      const { data } = await supabase
        .from('icon_library')
        .select('slug, title, tags, category, icon_url')
        .order('title')
        .limit(100);
      setIcons(data || []);
      return;
    }

    const { data } = await supabase
      .from('icon_library')
      .select('slug, title, tags, category, icon_url')
      .or(`slug.ilike.%${term}%,title.ilike.%${term}%,category.ilike.%${term}%`)
      .order('title')
      .limit(100);
    
    setIcons(data || []);
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      searchIcons(search);
    }, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  const filteredIcons = icons;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Selected icon preview */}
      {value && (
        <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
          <img 
            src={`${ICON_STORAGE_URL}/${value}.png`}
            alt={value}
            className="w-12 h-12 object-contain"
          />
          <div>
            <p className="font-medium text-sm">{value}</p>
            <p className="text-xs text-muted-foreground">არჩეული აიკონი</p>
          </div>
        </div>
      )}

      {/* Upload section */}
      {showUploader ? (
        <div className="border rounded-lg p-3 bg-muted/30">
          <IconUploader 
            onSuccess={(slug) => {
              setShowUploader(false);
              refreshIcons();
              onChange(slug);
            }}
            onClose={() => setShowUploader(false)}
          />
        </div>
      ) : (
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full" 
          onClick={() => setShowUploader(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          ახალი აიკონის ატვირთვა
        </Button>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="მოძებნე აიკონი... (მაგ: globe, music, book)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Icons grid */}
      <ScrollArea className="h-64 border rounded-lg">
        <div className="grid grid-cols-6 gap-1 p-2">
          {filteredIcons.map((icon) => (
            <button
              key={icon.slug}
              type="button"
              onClick={() => onChange(icon.slug)}
              className={cn(
                "p-2 rounded-lg hover:bg-muted transition-all flex flex-col items-center gap-1",
                value === icon.slug && "bg-primary/20 ring-2 ring-primary"
              )}
              title={icon.title}
            >
              <img
                src={`${ICON_STORAGE_URL}/${icon.slug}.png`}
                alt={icon.title}
                className="w-10 h-10 object-contain"
                loading="lazy"
              />
              <span className="text-[9px] text-muted-foreground truncate w-full text-center">
                {icon.slug.length > 10 ? icon.slug.slice(0, 10) + '...' : icon.slug}
              </span>
            </button>
          ))}
        </div>
        
        {filteredIcons.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            აიკონი ვერ მოიძებნა
          </div>
        )}
      </ScrollArea>
      
      <p className="text-xs text-muted-foreground">
        {totalCount.toLocaleString()} აიკონი ხელმისაწვდომია • ნაჩვენებია {filteredIcons.length}
      </p>
    </div>
  );
}
