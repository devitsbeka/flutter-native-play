import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { 
  BookOpen, 
  ChevronDown, 
  Plus, 
  X, 
  Loader2, 
  ExternalLink,
  Trash2 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface KnowledgeSource {
  id: string;
  url: string;
  title: string;
  faviconUrl: string;
  contentSummary: string;
  domain: string;
}

interface Props {
  sources: KnowledgeSource[];
  onSourcesChange: (sources: KnowledgeSource[]) => void;
  maxSources?: number;
}

export function KnowledgeSourcesList({ sources, onSourcesChange, maxSources = 5 }: Props) {
  const [isOpen, setIsOpen] = useState(true);
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddSource = async () => {
    if (!url.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    if (sources.length >= maxSources) {
      toast.error(`Maximum ${maxSources} sources allowed`);
      return;
    }

    // Check for duplicates
    const normalizedUrl = url.toLowerCase().replace(/\/+$/, '');
    if (sources.some(s => s.url.toLowerCase().replace(/\/+$/, '') === normalizedUrl)) {
      toast.error('This URL is already added');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-url-metadata', {
        body: { url: url.trim() },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch URL');
      }

      const newSource: KnowledgeSource = {
        id: `ks-${Date.now()}`,
        url: data.url,
        title: data.title,
        faviconUrl: data.faviconUrl,
        contentSummary: data.contentSummary,
        domain: data.domain,
      };

      onSourcesChange([...sources, newSource]);
      setUrl('');
      toast.success(`Added: ${data.title}`);
    } catch (err) {
      console.error('Error adding source:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to fetch URL');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveSource = (id: string) => {
    onSourcesChange(sources.filter(s => s.id !== id));
  };

  const handleClearAll = () => {
    onSourcesChange([]);
    toast.success('All sources cleared');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      handleAddSource();
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border-t border-border/50">
      <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Knowledge Sources</span>
          {sources.length > 0 && (
            <span className="bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded-full font-medium">
              {sources.length}
            </span>
          )}
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 text-muted-foreground transition-transform",
          isOpen && "rotate-180"
        )} />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="px-4 pb-4 space-y-3">
          {/* URL Input */}
          <div className="flex gap-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://en.wikipedia.org/..."
              className="h-9 text-sm"
              disabled={isLoading || sources.length >= maxSources}
            />
            <Button
              size="sm"
              onClick={handleAddSource}
              disabled={isLoading || !url.trim() || sources.length >= maxSources}
              className="h-9 px-3"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>

          {sources.length >= maxSources && (
            <p className="text-xs text-amber-500">
              Maximum {maxSources} sources. Remove one to add more.
            </p>
          )}

          {/* Sources List */}
          {sources.length > 0 ? (
            <div className="space-y-2">
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-2 pr-2">
                  {sources.map((source) => (
                    <div
                      key={source.id}
                      className="flex items-center gap-2 p-2 bg-card rounded-lg border border-border/50 group"
                    >
                      <img
                        src={source.faviconUrl}
                        alt=""
                        className="w-5 h-5 rounded flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23888"><circle cx="12" cy="12" r="10"/></svg>';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" title={source.title}>
                          {source.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {source.domain}
                        </p>
                      </div>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Open in new tab"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                      </a>
                      <button
                        onClick={() => handleRemoveSource(source.id)}
                        className="p-1 hover:bg-destructive/20 rounded text-muted-foreground hover:text-destructive transition-colors"
                        title="Remove source"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Clear All Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="w-full h-8 text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Clear all sources
              </Button>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">
                Add URLs (Wikipedia, etc.) for AI to use as knowledge when generating questions
              </p>
            </div>
          )}

          {sources.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              AI will use these {sources.length} source{sources.length !== 1 ? 's' : ''} for factual reference
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
