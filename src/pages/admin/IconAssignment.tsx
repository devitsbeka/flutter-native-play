import { useState, useEffect, useMemo } from 'react';
import { Search, Image, Check, X, ChevronDown, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAdminIconAssignment, QuestionForAssignment } from '@/hooks/useAdminIconAssignment';
import { useIconLibrary } from '@/hooks/useIconLibrary';

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
    categories
  } = useAdminIconAssignment();

  const { getIconBySlug } = useIconLibrary();

  const [selectedQuestion, setSelectedQuestion] = useState<QuestionForAssignment | null>(null);
  const [iconSearchTerm, setIconSearchTerm] = useState('');
  const [icons, setIcons] = useState<IconItem[]>([]);
  const [iconsLoading, setIconsLoading] = useState(true);
  const [autoAdvance, setAutoAdvance] = useState(true);

  // Load icons from JSON
  useEffect(() => {
    const loadIcons = async () => {
      try {
        const response = await fetch('/data/icon-library-meta.json');
        const data = await response.json();
        
        const iconList: IconItem[] = data.items.map((icon: any) => ({
          slug: icon.slug,
          title: icon.title,
          category: icon.category,
          tags: icon.tags || [],
          url: `https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library/${icon.file_name}`
        }));
        
        setIcons(iconList);
      } catch (error) {
        console.error('Error loading icons:', error);
      } finally {
        setIconsLoading(false);
      }
    };
    loadIcons();
  }, []);

  // Filter icons based on search
  const filteredIcons = useMemo(() => {
    if (!iconSearchTerm) return icons;
    
    const term = iconSearchTerm.toLowerCase();
    return icons.filter(icon => 
      icon.slug.toLowerCase().includes(term) ||
      icon.title.toLowerCase().includes(term) ||
      icon.category.toLowerCase().includes(term) ||
      icon.tags.some(tag => tag.toLowerCase().includes(term))
    );
  }, [icons, iconSearchTerm]);

  // Handle icon assignment
  const handleAssignIcon = async (iconSlug: string) => {
    if (!selectedQuestion) {
      toast.error('აირჩიეთ კითხვა');
      return;
    }

    const success = await assignIcon(selectedQuestion.id, iconSlug);
    
    if (success) {
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

  // Get icon URL for a slug
  const getIconUrl = (slug: string | null) => {
    if (!slug) return null;
    const icon = icons.find(i => i.slug === slug);
    return icon?.url || null;
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header with Stats */}
      <div className="border-b border-border/50 bg-card/30 p-4">
        <div className="flex items-center justify-between">
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
          </div>
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
                    <SelectItem key={cat.id} value={cat.id}>
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
          </div>

          {/* Question List */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {questions.map((question) => (
                <button
                  key={question.id}
                  onClick={() => setSelectedQuestion(question)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-all",
                    selectedQuestion?.id === question.id
                      ? "border-primary bg-primary/10"
                      : "border-transparent hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon Preview */}
                    <div className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                      question.icon_slug ? "bg-background" : "bg-muted border-2 border-dashed border-muted-foreground/30"
                    )}>
                      {question.icon_slug ? (
                        <img 
                          src={getIconUrl(question.icon_slug) || ''} 
                          alt="" 
                          className="h-8 w-8 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
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
                          <span className="text-[10px] text-muted-foreground">{question.icon_slug}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              
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
          {/* Selected Question Preview */}
          {selectedQuestion && (
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
            <div className="mt-2 text-xs text-muted-foreground">
              {filteredIcons.length.toLocaleString()} აიკონი
            </div>
          </div>

          {/* Icon Grid */}
          <ScrollArea className="flex-1">
            {iconsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-2 p-3">
                {filteredIcons.map((icon) => (
                  <button
                    key={icon.slug}
                    onClick={() => handleAssignIcon(icon.slug)}
                    disabled={!selectedQuestion}
                    className={cn(
                      "group relative flex flex-col items-center gap-1 rounded-lg p-2 transition-all",
                      "hover:bg-accent/80 hover:shadow-sm",
                      !selectedQuestion && "opacity-50 cursor-not-allowed",
                      selectedQuestion?.icon_slug === icon.slug && "ring-2 ring-primary bg-primary/10"
                    )}
                  >
                    <div className="relative h-12 w-12">
                      <img 
                        src={icon.url} 
                        alt={icon.title}
                        className="h-full w-full object-contain"
                        loading="lazy"
                      />
                      {selectedQuestion?.icon_slug === icon.slug && (
                        <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground truncate max-w-full">
                      {icon.slug}
                    </span>
                  </button>
                ))}
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
  );
}
