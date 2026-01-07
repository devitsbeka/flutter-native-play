import { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Image, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';

interface IconUsageStat {
  slug: string;
  count: number;
  url: string;
  title: string;
}

interface CategoryCoverage {
  id: string;
  name: string;
  icon: string;
  total: number;
  withIcons: number;
  coverage: number;
}

interface IconUsageStatsProps {
  brokenIconsCount: number;
  totalIcons: number;
  onRefresh?: () => void;
}

export function IconUsageStats({ brokenIconsCount, totalIcons, onRefresh }: IconUsageStatsProps) {
  const [loading, setLoading] = useState(true);
  const [iconUsage, setIconUsage] = useState<IconUsageStat[]>([]);
  const [categoryCoverage, setCategoryCoverage] = useState<CategoryCoverage[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [questionsWithIcons, setQuestionsWithIcons] = useState(0);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Get all questions with their icons
      const { data: questions, error: qError } = await supabase
        .from('questions')
        .select('id, icon_slug, category_id')
        .eq('is_active', true);

      if (qError) throw qError;

      // Get categories
      const { data: categories, error: cError } = await supabase
        .from('categories')
        .select('id, name, icon')
        .eq('is_active', true);

      if (cError) throw cError;

      // Get icon library for URLs
      const { data: icons, error: iError } = await supabase
        .from('icon_library')
        .select('slug, title, icon_url, file_name');

      if (iError) throw iError;

      // Build icon URL map
      const iconMap: Record<string, { url: string; title: string }> = {};
      for (const icon of icons || []) {
        iconMap[icon.slug] = {
          url: icon.icon_url || `https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library/${icon.file_name}`,
          title: icon.title
        };
      }

      // Calculate icon usage
      const usageCounts: Record<string, number> = {};
      let withIcons = 0;

      for (const q of questions || []) {
        if (q.icon_slug) {
          usageCounts[q.icon_slug] = (usageCounts[q.icon_slug] || 0) + 1;
          withIcons++;
        }
      }

      const usageStats: IconUsageStat[] = Object.entries(usageCounts)
        .map(([slug, count]) => ({
          slug,
          count,
          url: iconMap[slug]?.url || '',
          title: iconMap[slug]?.title || slug
        }))
        .sort((a, b) => b.count - a.count);

      setIconUsage(usageStats);
      setTotalQuestions(questions?.length || 0);
      setQuestionsWithIcons(withIcons);

      // Calculate category coverage
      const catStats: Record<string, { total: number; withIcons: number }> = {};
      for (const q of questions || []) {
        if (!catStats[q.category_id]) {
          catStats[q.category_id] = { total: 0, withIcons: 0 };
        }
        catStats[q.category_id].total++;
        if (q.icon_slug) {
          catStats[q.category_id].withIcons++;
        }
      }

      const coverage: CategoryCoverage[] = (categories || [])
        .map(cat => ({
          id: cat.id,
          name: cat.name,
          icon: cat.icon,
          total: catStats[cat.id]?.total || 0,
          withIcons: catStats[cat.id]?.withIcons || 0,
          coverage: catStats[cat.id]?.total 
            ? Math.round((catStats[cat.id].withIcons / catStats[cat.id].total) * 100) 
            : 0
        }))
        .filter(c => c.total > 0)
        .sort((a, b) => a.coverage - b.coverage);

      setCategoryCoverage(coverage);
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const overallCoverage = totalQuestions > 0 
    ? Math.round((questionsWithIcons / totalQuestions) * 100) 
    : 0;

  const uniqueIconsUsed = iconUsage.length;
  const unusedIcons = totalIcons - uniqueIconsUsed;

  const mostUsed = iconUsage.slice(0, 10);
  const leastUsed = [...iconUsage].sort((a, b) => a.count - b.count).slice(0, 10);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>საერთო დაფარვა</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{overallCoverage}%</div>
            <Progress value={overallCoverage} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {questionsWithIcons.toLocaleString()} / {totalQuestions.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>გამოყენებული აიკონები</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-green-500">{uniqueIconsUsed.toLocaleString()}</span>
              <span className="text-sm text-muted-foreground">/ {totalIcons.toLocaleString()}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {unusedIcons.toLocaleString()} გამოუყენებელი
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>გატეხილი აიკონები</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${brokenIconsCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {brokenIconsCount}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {brokenIconsCount === 0 ? 'ყველა მუშაობს ✓' : 'საჭიროებს შეკეთებას'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>უიკონო კითხვები</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {(totalQuestions - questionsWithIcons).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {100 - overallCoverage}% დასაფარავი
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Icon Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              აიკონების გამოყენება
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="most">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="most" className="gap-1">
                  <TrendingUp className="h-3 w-3" />
                  ყველაზე მეტი
                </TabsTrigger>
                <TabsTrigger value="least" className="gap-1">
                  <TrendingDown className="h-3 w-3" />
                  ყველაზე ნაკლები
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="most">
                <ScrollArea className="h-64">
                  <div className="space-y-2 pt-2">
                    {mostUsed.map((icon, idx) => (
                      <div key={icon.slug} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                        <span className="text-sm font-medium text-muted-foreground w-6">#{idx + 1}</span>
                        <div className="h-8 w-8 rounded bg-background p-1 shrink-0">
                          <img src={icon.url} alt="" className="h-full w-full object-contain" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{icon.slug}</p>
                          <p className="text-xs text-muted-foreground truncate">{icon.title}</p>
                        </div>
                        <Badge variant="secondary">{icon.count}</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="least">
                <ScrollArea className="h-64">
                  <div className="space-y-2 pt-2">
                    {leastUsed.map((icon) => (
                      <div key={icon.slug} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                        <div className="h-8 w-8 rounded bg-background p-1 shrink-0">
                          <img src={icon.url} alt="" className="h-full w-full object-contain" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{icon.slug}</p>
                          <p className="text-xs text-muted-foreground truncate">{icon.title}</p>
                        </div>
                        <Badge variant="outline">{icon.count}</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Category Coverage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Image className="h-4 w-4" />
              კატეგორიების დაფარვა
            </CardTitle>
            <CardDescription>
              დახარისხებულია ყველაზე დაბალი დაფარვით
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-72">
              <div className="space-y-3">
                {categoryCoverage.map(cat => (
                  <div key={cat.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span className="text-sm font-medium">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {cat.withIcons}/{cat.total}
                        </span>
                        <Badge 
                          variant={cat.coverage >= 80 ? 'default' : cat.coverage >= 50 ? 'secondary' : 'destructive'}
                          className="min-w-[3rem] justify-center"
                        >
                          {cat.coverage}%
                        </Badge>
                      </div>
                    </div>
                    <Progress 
                      value={cat.coverage} 
                      className={`h-1.5 ${
                        cat.coverage >= 80 ? '[&>div]:bg-green-500' : 
                        cat.coverage >= 50 ? '[&>div]:bg-yellow-500' : 
                        '[&>div]:bg-red-500'
                      }`}
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={() => { loadStats(); onRefresh?.(); }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          განახლება
        </Button>
      </div>
    </div>
  );
}
