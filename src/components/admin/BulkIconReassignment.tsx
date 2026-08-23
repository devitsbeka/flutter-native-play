import { useState, useMemo, useEffect } from 'react';
import { ArrowRight, Loader2, Search, AlertTriangle, Check, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from "@/lib/toast";
import { supabase } from '@/integrations/supabase/client';

interface IconItem {
  slug: string;
  title: string;
  category: string;
  url: string;
  usageCount?: number;
}

interface BulkIconReassignmentProps {
  icons: IconItem[];
  brokenIconSlugs: Set<string>;
  onComplete?: () => void;
}

export function BulkIconReassignment({ icons, brokenIconSlugs, onComplete }: BulkIconReassignmentProps) {
  const [sourceIconSlug, setSourceIconSlug] = useState<string | null>(null);
  const [targetIconSlug, setTargetIconSlug] = useState<string | null>(null);
  const [sourceSearch, setSourceSearch] = useState('');
  const [targetSearch, setTargetSearch] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [iconUsage, setIconUsage] = useState<Record<string, number>>({});
  const [loadingUsage, setLoadingUsage] = useState(true);

  // Load icon usage counts
  useEffect(() => {
    const loadUsage = async () => {
      setLoadingUsage(true);
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('icon_slug')
          .not('icon_slug', 'is', null)
          .eq('is_active', true);

        if (error) throw error;

        const counts: Record<string, number> = {};
        for (const q of data || []) {
          if (q.icon_slug) {
            counts[q.icon_slug] = (counts[q.icon_slug] || 0) + 1;
          }
        }
        setIconUsage(counts);
      } catch (err) {
        console.error('Error loading icon usage:', err);
      } finally {
        setLoadingUsage(false);
      }
    };
    loadUsage();
  }, []);

  // Filter icons for source (only those in use)
  const sourceIcons = useMemo(() => {
    const usedIcons = icons.filter(icon => (iconUsage[icon.slug] || 0) > 0);
    if (!sourceSearch) return usedIcons.sort((a, b) => (iconUsage[b.slug] || 0) - (iconUsage[a.slug] || 0));
    const term = sourceSearch.toLowerCase();
    return usedIcons.filter(icon =>
      icon.slug.toLowerCase().includes(term) ||
      icon.title.toLowerCase().includes(term)
    ).sort((a, b) => (iconUsage[b.slug] || 0) - (iconUsage[a.slug] || 0));
  }, [icons, sourceSearch, iconUsage]);

  // Filter icons for target (exclude broken and source)
  const targetIcons = useMemo(() => {
    const validIcons = icons.filter(icon => 
      !brokenIconSlugs.has(icon.slug) && 
      icon.slug !== sourceIconSlug
    );
    if (!targetSearch) return validIcons;
    const term = targetSearch.toLowerCase();
    return validIcons.filter(icon =>
      icon.slug.toLowerCase().includes(term) ||
      icon.title.toLowerCase().includes(term)
    );
  }, [icons, targetSearch, brokenIconSlugs, sourceIconSlug]);

  const sourceIcon = icons.find(i => i.slug === sourceIconSlug);
  const targetIcon = icons.find(i => i.slug === targetIconSlug);
  const affectedCount = sourceIconSlug ? iconUsage[sourceIconSlug] || 0 : 0;

  const handleReassign = async () => {
    if (!sourceIconSlug || !targetIconSlug) {
      toast.error('აირჩიეთ ორივე აიკონი');
      return;
    }

    if (sourceIconSlug === targetIconSlug) {
      toast.error('წყარო და სამიზნე არ შეიძლება იყოს ერთი და იგივე');
      return;
    }

    const confirmMsg = `ნამდვილად გსურთ ${affectedCount} კითხვაზე "${sourceIconSlug}" → "${targetIconSlug}" შეცვლა?`;
    if (!confirm(confirmMsg)) return;

    setReassigning(true);
    try {
      // Get all questions with source icon
      const { data: questions, error: fetchError } = await supabase
        .from('questions')
        .select('id, question_text, category_id')
        .eq('icon_slug', sourceIconSlug)
        .eq('is_active', true);

      if (fetchError) throw fetchError;

      if (!questions || questions.length === 0) {
        toast.error('კითხვები ვერ მოიძებნა');
        return;
      }

      // Update all questions
      const { error: updateError } = await supabase
        .from('questions')
        .update({ icon_slug: targetIconSlug })
        .eq('icon_slug', sourceIconSlug)
        .eq('is_active', true);

      if (updateError) throw updateError;

      // Log to history
      const historyEntries = questions.map(q => ({
        question_id: q.id,
        question_text: q.question_text?.substring(0, 200) || '',
        old_icon_slug: sourceIconSlug,
        new_icon_slug: targetIconSlug,
        assignment_method: 'bulk-reassign',
        category_id: q.category_id,
        assigned_by: null
      }));

      await supabase.from('icon_assignment_history').insert(historyEntries);

      toast.success(`${questions.length} კითხვაზე აიკონი შეიცვალა: ${sourceIconSlug} → ${targetIconSlug}`);

      // Update local usage counts
      setIconUsage(prev => ({
        ...prev,
        [sourceIconSlug]: 0,
        [targetIconSlug]: (prev[targetIconSlug] || 0) + questions.length
      }));

      // Reset selection
      setSourceIconSlug(null);
      setTargetIconSlug(null);
      
      onComplete?.();
    } catch (err) {
      console.error('Reassignment error:', err);
      toast.error('შეცდომა აიკონების შეცვლისას');
    } finally {
      setReassigning(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-primary" />
          მასობრივი შეცვლა
        </CardTitle>
        <CardDescription>
          ერთი აიკონის ყველა გამოყენება შეცვალეთ მეორეთი
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Source and Target Selection */}
        <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-start">
          {/* Source Icon Picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">წყარო (შესაცვლელი)</label>
            <div className="relative">
              <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="აიკონის ძიება..."
                value={sourceSearch}
                onChange={(e) => setSourceSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <ScrollArea className="h-48 rounded-lg border">
              <div className="p-2 space-y-1">
                {loadingUsage ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : sourceIcons.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    გამოყენებული აიკონები არ მოიძებნა
                  </div>
                ) : (
                  sourceIcons.map(icon => (
                    <button
                      key={icon.slug}
                      onClick={() => setSourceIconSlug(icon.slug)}
                      className={cn(
                        "w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors",
                        sourceIconSlug === icon.slug
                          ? "bg-primary text-primary-foreground"
                          : brokenIconSlugs.has(icon.slug)
                            ? "bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30"
                            : "hover:bg-accent"
                      )}
                    >
                      <img src={icon.url} alt="" className="h-6 w-6 object-contain" />
                      <span className="text-xs truncate flex-1">{icon.slug}</span>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {iconUsage[icon.slug] || 0}
                      </Badge>
                      {brokenIconSlugs.has(icon.slug) && (
                        <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Arrow */}
          <div className="flex flex-col items-center justify-center pt-16">
            <ArrowRight className="h-8 w-8 text-muted-foreground" />
            {affectedCount > 0 && (
              <Badge variant="outline" className="mt-2 text-xs">
                {affectedCount} კითხვა
              </Badge>
            )}
          </div>

          {/* Target Icon Picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">სამიზნე (ახალი)</label>
            <div className="relative">
              <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="აიკონის ძიება..."
                value={targetSearch}
                onChange={(e) => setTargetSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <ScrollArea className="h-48 rounded-lg border">
              <div className="p-2 space-y-1">
                {targetIcons.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    აიკონები არ მოიძებნა
                  </div>
                ) : (
                  targetIcons.slice(0, 100).map(icon => (
                    <button
                      key={icon.slug}
                      onClick={() => setTargetIconSlug(icon.slug)}
                      className={cn(
                        "w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors",
                        targetIconSlug === icon.slug
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent"
                      )}
                    >
                      <img src={icon.url} alt="" className="h-6 w-6 object-contain" />
                      <span className="text-xs truncate flex-1">{icon.slug}</span>
                      {(iconUsage[icon.slug] || 0) > 0 && (
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {iconUsage[icon.slug]}
                        </Badge>
                      )}
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Preview */}
        {sourceIcon && targetIcon && (
          <div className="flex items-center justify-center gap-4 p-4 rounded-lg bg-muted/50">
            <div className="text-center">
              <div className="h-12 w-12 mx-auto mb-1 rounded-lg bg-background p-1">
                <img src={sourceIcon.url} alt="" className="h-full w-full object-contain" />
              </div>
              <span className="text-xs font-medium">{sourceIcon.slug}</span>
            </div>
            <ArrowRight className="h-6 w-6 text-primary" />
            <div className="text-center">
              <div className="h-12 w-12 mx-auto mb-1 rounded-lg bg-background p-1">
                <img src={targetIcon.url} alt="" className="h-full w-full object-contain" />
              </div>
              <span className="text-xs font-medium">{targetIcon.slug}</span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={handleReassign}
          disabled={!sourceIconSlug || !targetIconSlug || reassigning}
          className="w-full"
        >
          {reassigning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              შეცვლა...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              შეცვლა ({affectedCount} კითხვა)
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
