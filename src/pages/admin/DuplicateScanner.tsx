import { useState } from 'react';
import { Search, Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useDuplicateDetection } from '@/hooks/useDuplicateDetection';
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { useAdminQuestions } from '@/hooks/useAdminQuestions';
import { cn } from '@/lib/utils';

export default function DuplicateScanner() {
  const [categoryId, setCategoryId] = useState<string>('all');
  const [threshold, setThreshold] = useState([80]);
  const { scanning, scanResult, scanDatabaseForDuplicates, clearScanResult } = useDuplicateDetection();
  const { categories } = useAdminCategories();
  const { deleteQuestion } = useAdminQuestions();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleScan = async () => {
    await scanDatabaseForDuplicates(
      categoryId === 'all' ? undefined : categoryId,
      threshold[0] / 100
    );
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteQuestion(id);
      // Remove from scan results
      if (scanResult) {
        const newDuplicates = scanResult.duplicates.filter(d => d.existingId !== id);
        // Would need to update scanResult here - for now just re-scan
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-500/10 rounded-lg">
            <Search className="h-6 w-6 text-yellow-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">დუბლიკატების სკანერი</h1>
            <p className="text-muted-foreground">მოძებნეთ და წაშალეთ დუბლიკატი კითხვები</p>
          </div>
        </div>

        {/* Scanner Controls */}
        <Card>
          <CardHeader>
            <CardTitle>სკანირების პარამეტრები</CardTitle>
            <CardDescription>
              აირჩიეთ კატეგორია და მსგავსების ზღვარი დუბლიკატების მოსაძებნად
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>კატეგორია</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="აირჩიეთ კატეგორია" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ყველა კატეგორია</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>მსგავსების ზღვარი: {threshold[0]}%</Label>
                <Slider
                  value={threshold}
                  onValueChange={setThreshold}
                  min={50}
                  max={100}
                  step={5}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground">
                  მაღალი ზღვარი = ზუსტი დუბლიკატები, დაბალი = მსგავსი კითხვებიც
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleScan} disabled={scanning}>
                {scanning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    სკანირება...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    სკანირების დაწყება
                  </>
                )}
              </Button>
              {scanResult && (
                <Button variant="outline" onClick={clearScanResult}>
                  გასუფთავება
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {scanResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>შედეგები</span>
                <div className="flex items-center gap-2 text-sm font-normal">
                  <span className="text-muted-foreground">
                    შემოწმდა: {scanResult.totalChecked}
                  </span>
                  {scanResult.duplicatesFound > 0 ? (
                    <Badge variant="destructive">
                      {scanResult.duplicatesFound} დუბლიკატი
                    </Badge>
                  ) : (
                    <Badge variant="secondary">დუბლიკატები არ მოიძებნა</Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {scanResult.duplicates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>დუბლიკატები არ მოიძებნა</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {scanResult.duplicates.map((dup, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-lg border border-destructive/20 bg-destructive/5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                            <span className="text-sm font-medium text-destructive">
                              {Math.round(dup.similarity * 100)}% მსგავსება
                            </span>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="p-2 bg-background rounded border">
                              <p className="text-sm font-medium">კითხვა 1:</p>
                              <p className="text-sm text-muted-foreground">{dup.questionText}</p>
                            </div>
                            <div className="p-2 bg-background rounded border">
                              <p className="text-sm font-medium">კითხვა 2:</p>
                              <p className="text-sm text-muted-foreground">{dup.existingQuestion}</p>
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(dup.existingId)}
                          disabled={deletingId === dup.existingId}
                        >
                          {deletingId === dup.existingId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
