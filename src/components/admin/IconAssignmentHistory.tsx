import { useState } from 'react';
import { Clock, ArrowRight, Loader2, RefreshCw, Filter } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useIconAssignmentHistory } from '@/hooks/useIconAssignmentHistory';
import { cn } from '@/lib/utils';

interface IconAssignmentHistoryProps {
  categories: Array<{ id: string; uuid?: string; name: string; icon: string }>;
  getIconUrl: (slug: string | null) => string | null;
}

export function IconAssignmentHistory({ categories, getIconUrl }: IconAssignmentHistoryProps) {
  const [timeRange, setTimeRange] = useState<'hour' | 'day' | 'week' | 'all'>('day');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [methodFilter, setMethodFilter] = useState<string | null>(null);

  const { history, loading, totalCount, uniqueMethods, refetch } = useIconAssignmentHistory({
    timeRange,
    categoryId: categoryFilter,
    method: methodFilter,
    limit: 200
  });

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return 'ახლახანს';
    if (diffMins < 60) return `${diffMins} წუთის წინ`;
    if (diffHours < 24) return `${diffHours} საათის წინ`;
    return date.toLocaleDateString('ka-GE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'exact-slug':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'prefix-match':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'topic-mapping':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'category-fallback':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'manual':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'exact-slug': return 'ზუსტი';
      case 'prefix-match': return 'პრეფიქსი';
      case 'topic-mapping': return 'თემა';
      case 'category-fallback': return 'კატეგორია';
      case 'manual': return 'ხელით';
      default: return method;
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">მინიჭების ისტორია</h2>
              <p className="text-xs text-muted-foreground">{totalCount} ჩანაწერი</p>
            </div>
          </div>
          
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
            განახლება
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-border/30 p-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
          </div>
          
          <Select
            value={timeRange}
            onValueChange={(v) => setTimeRange(v as 'hour' | 'day' | 'week' | 'all')}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hour">ბოლო საათი</SelectItem>
              <SelectItem value="day">ბოლო 24 სთ</SelectItem>
              <SelectItem value="week">ბოლო კვირა</SelectItem>
              <SelectItem value="all">ყველა</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={categoryFilter || 'all'}
            onValueChange={(v) => setCategoryFilter(v === 'all' ? null : v)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="ყველა კატეგორია" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ყველა კატეგორია</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.uuid || cat.id} value={cat.uuid || cat.id}>
                  {cat.icon} {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={methodFilter || 'all'}
            onValueChange={(v) => setMethodFilter(v === 'all' ? null : v)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="ყველა მეთოდი" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ყველა მეთოდი</SelectItem>
              {uniqueMethods.map(method => (
                <SelectItem key={method} value={method}>
                  {getMethodLabel(method)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* History List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">იტვირთება...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>ისტორია ცარიელია</p>
            <p className="text-xs mt-1">მინიჭებები აქ გამოჩნდება</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {history.map((item) => (
              <div key={item.id} className="p-3 hover:bg-accent/30 transition-colors">
                <div className="flex items-start gap-3">
                  {/* Icon Change Visual */}
                  <div className="flex items-center gap-2 shrink-0">
                    {item.old_icon_slug ? (
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <img 
                          src={getIconUrl(item.old_icon_slug) || ''} 
                          alt="" 
                          className="h-8 w-8 object-contain opacity-50"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-muted/50 border-2 border-dashed border-muted-foreground/20" />
                    )}
                    
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    
                    <div className="h-10 w-10 rounded-lg bg-background shadow-sm flex items-center justify-center">
                      <img 
                        src={getIconUrl(item.new_icon_slug) || ''} 
                        alt="" 
                        className="h-8 w-8 object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  </div>

                  {/* Question and Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-2">{item.question_text}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {item.category_name || 'უცნობი'}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={cn("text-[10px] px-1.5 py-0 border", getMethodColor(item.assignment_method))}
                      >
                        {getMethodLabel(item.assignment_method)}
                      </Badge>
                      <span className="text-[10px] text-green-600 font-medium">
                        {item.new_icon_slug}
                      </span>
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-muted-foreground">
                      {formatTime(item.assigned_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
