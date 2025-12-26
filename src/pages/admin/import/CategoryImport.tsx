import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FolderPlus, Loader2, Copy, CheckCircle2, XCircle } from 'lucide-react';
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { CategoryMockupPreview } from '@/components/admin/CategoryMockupPreview';

interface ParsedCategory {
  category_id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
  total_levels: number;
  type: string;
  isValid: boolean;
  isDuplicate: boolean;
}

const EXAMPLE_JSON = `[
  {
    "category_id": "geography",
    "name": "გეოგრაფია",
    "icon": "🌍",
    "color": "from-blue-400 to-cyan-500",
    "description": "გეოგრაფიული ცოდნა",
    "total_levels": 20,
    "type": "classic"
  },
  {
    "category_id": "history",
    "name": "ისტორია",
    "icon": "🏰",
    "color": "from-amber-400 to-orange-500",
    "description": "ისტორიული ფაქტები",
    "total_levels": 20,
    "type": "classic"
  }
]`;

export function CategoryImport() {
  const [jsonText, setJsonText] = useState('');
  const [parsedCategories, setParsedCategories] = useState<ParsedCategory[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const { categories, addCategory } = useAdminCategories();
  const { toast } = useToast();

  const handleParse = () => {
    if (!jsonText.trim()) {
      toast({
        title: 'შეცდომა',
        description: 'გთხოვთ შეიყვანოთ JSON',
        variant: 'destructive',
      });
      return;
    }

    try {
      const data = JSON.parse(jsonText);
      const items = Array.isArray(data) ? data : [data];
      const existingIds = new Set(categories.map(c => c.category_id));

      const parsed: ParsedCategory[] = items.map((item: any) => {
        const isDuplicate = existingIds.has(item.category_id);
        const isValid = Boolean(
          item.category_id && 
          item.name && 
          !isDuplicate
        );

        return {
          category_id: item.category_id || '',
          name: item.name || '',
          icon: item.icon || '📚',
          color: item.color || 'from-blue-400 to-cyan-500',
          description: item.description || '',
          total_levels: item.total_levels || 20,
          type: item.type || 'classic',
          isValid,
          isDuplicate,
        };
      });

      setParsedCategories(parsed);
      if (parsed.length > 0) {
        setSelectedIndex(0);
      }
    } catch (err) {
      toast({
        title: 'შეცდომა',
        description: 'არასწორი JSON ფორმატი',
        variant: 'destructive',
      });
    }
  };

  const handleImport = async () => {
    const validCategories = parsedCategories.filter(c => c.isValid);
    if (validCategories.length === 0) {
      toast({
        title: 'შეცდომა',
        description: 'ვალიდური კატეგორიები არ მოიძებნა',
        variant: 'destructive',
      });
      return;
    }

    setImporting(true);
    let successCount = 0;

    try {
      for (const cat of validCategories) {
        const result = await addCategory({
          category_id: cat.category_id,
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          description: cat.description || '',
          total_levels: cat.total_levels,
          type: cat.type,
          is_active: true,
          sort_order: 0,
        });
        if (result) successCount++;
      }

      if (successCount > 0) {
        toast({
          title: 'წარმატება',
          description: `${successCount} კატეგორია დაემატა`,
        });
        setParsedCategories([]);
        setJsonText('');
        setSelectedIndex(null);
      }
    } finally {
      setImporting(false);
    }
  };

  const copyExample = () => {
    setJsonText(EXAMPLE_JSON);
    toast({
      title: 'კოპირებულია',
      description: 'მაგალითი ჩასმულია',
    });
  };

  const validCount = parsedCategories.filter(c => c.isValid).length;
  const duplicateCount = parsedCategories.filter(c => c.isDuplicate).length;
  const selectedCategory = selectedIndex !== null ? parsedCategories[selectedIndex] : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            კატეგორიების იმპორტი
          </CardTitle>
          <CardDescription>
            ჩასვით JSON ფორმატში კატეგორიები მასობრივი იმპორტისთვის
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="json">JSON მონაცემები</Label>
              <Button variant="ghost" size="sm" onClick={copyExample}>
                <Copy className="h-4 w-4 mr-1" />
                მაგალითი
              </Button>
            </div>
            <Textarea
              id="json"
              placeholder={EXAMPLE_JSON}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="font-mono text-sm min-h-[200px]"
            />
          </div>

          <div className="flex gap-3">
            <Button onClick={handleParse} disabled={!jsonText.trim()}>
              გარჩევა
            </Button>
            {jsonText && (
              <Button variant="outline" onClick={() => setJsonText('')}>
                გასუფთავება
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {parsedCategories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>გარჩეული კატეგორიები ({parsedCategories.length})</span>
              <div className="flex items-center gap-2 text-sm font-normal">
                <span className="text-green-500">✓ {validCount} ვალიდური</span>
                {duplicateCount > 0 && (
                  <span className="text-yellow-500">⚠ {duplicateCount} დუბლიკატი</span>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category List */}
              <ScrollArea className="h-[400px] rounded-md border p-4">
                <div className="space-y-3">
                  {parsedCategories.map((cat, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedIndex(idx)}
                      className={cn(
                        'p-3 rounded-lg border cursor-pointer transition-colors',
                        selectedIndex === idx && 'ring-2 ring-primary',
                        cat.isValid ? 'bg-card hover:bg-accent' : 'bg-destructive/5 border-destructive/20',
                        cat.isDuplicate && 'bg-yellow-500/5 border-yellow-500/20'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'p-2 rounded-lg bg-gradient-to-br',
                          cat.color
                        )}>
                          <span className="text-xl">{cat.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {cat.isValid ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive shrink-0" />
                            )}
                            <span className="font-medium truncate">{cat.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {cat.category_id}
                            {cat.isDuplicate && ' (უკვე არსებობს)'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Preview */}
              <div className="flex items-center justify-center">
                {selectedCategory ? (
                  <CategoryMockupPreview
                    name={selectedCategory.name}
                    icon={selectedCategory.icon}
                    color={selectedCategory.color}
                    description={selectedCategory.description}
                    totalLevels={selectedCategory.total_levels}
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <p>აირჩიეთ კატეგორია პრევიუსთვის</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={handleImport}
                disabled={importing || validCount === 0}
              >
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    იმპორტი...
                  </>
                ) : (
                  `${validCount} კატეგორიის იმპორტი`
                )}
              </Button>
              <Button variant="outline" onClick={() => {
                setParsedCategories([]);
                setSelectedIndex(null);
              }}>
                გასუფთავება
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
