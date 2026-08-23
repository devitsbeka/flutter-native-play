import { useState } from 'react';
import { Search, Loader2, AlertTriangle, Trash2, CheckSquare, Square } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useDuplicateDetection } from '@/hooks/useDuplicateDetection';
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { useAdminQuestions } from '@/hooks/useAdminQuestions';
import { toast } from "@/lib/toast";

export default function DuplicateScanner() {
  const [categoryId, setCategoryId] = useState<string>('all');
  const [threshold, setThreshold] = useState([70]);
  const { scanning, scanResult, setScanResult, scanDatabaseForDuplicates, clearScanResult } = useDuplicateDetection();
  const { categories } = useAdminCategories();
  const { deleteQuestion } = useAdminQuestions();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const handleScan = async () => {
    setSelectedIds(new Set());
    await scanDatabaseForDuplicates(
      categoryId === 'all' ? undefined : categoryId,
      threshold[0] / 100
    );
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const success = await deleteQuestion(id);
      if (success && scanResult) {
        const newDuplicates = scanResult.duplicates.filter(d => d.existingId !== id);
        setScanResult({
          ...scanResult,
          duplicates: newDuplicates,
          duplicatesFound: newDuplicates.length
        });
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleSelectAll = () => {
    if (!scanResult) return;
    const allIds = scanResult.duplicates.map(d => d.existingId);
    if (selectedIds.size === allIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    
    setBulkDeleting(true);
    let deleted = 0;
    const idsToDelete = Array.from(selectedIds);
    
    for (const id of idsToDelete) {
      const success = await deleteQuestion(id);
      if (success) deleted++;
    }
    
    if (scanResult) {
      const newDuplicates = scanResult.duplicates.filter(d => !selectedIds.has(d.existingId));
      setScanResult({
        ...scanResult,
        duplicates: newDuplicates,
        duplicatesFound: newDuplicates.length
      });
    }
    
    setSelectedIds(new Set());
    setBulkDeleting(false);
    toast.success(`${deleted} კითხვა წაიშალა`);
  };

  const allSelected = scanResult && scanResult.duplicates.length > 0 && 
    selectedIds.size === scanResult.duplicates.length;

  const answerDupCount = scanResult?.duplicates.filter(d => d.matchType === 'answer').length ?? 0;
  const textDupCount = scanResult?.duplicates.filter(d => d.matchType === 'text').length ?? 0;

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
              სკანერი პირველ რიგში პოულობს კითხვებს იგივე პასუხით (იმავე კატეგორიაში), შემდეგ ტექსტის მსგავსებით
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
                <Label>ტექსტის მსგავსების ზღვარი: {threshold[0]}%</Label>
                <Slider
                  value={threshold}
                  onValueChange={setThreshold}
                  min={50}
                  max={100}
                  step={5}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground">
                  ეხება მხოლოდ ტექსტის მსგავსებას. პასუხის დამთხვევა ყოველთვის ფიქსირდება.
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
                <div className="flex items-center gap-2 text-sm font-normal flex-wrap">
                  <span className="text-muted-foreground">
                    შემოწმდა: {scanResult.totalChecked}
                  </span>
                  {scanResult.duplicatesFound > 0 ? (
                    <>
                      <Badge variant="destructive">
                        {scanResult.duplicatesFound} დუბლიკატი
                      </Badge>
                      {answerDupCount > 0 && (
                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                          {answerDupCount} პასუხით
                        </Badge>
                      )}
                      {textDupCount > 0 && (
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                          {textDupCount} ტექსტით
                        </Badge>
                      )}
                    </>
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
                  {/* Bulk Actions */}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAll}
                      className="gap-2"
                    >
                      {allSelected ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                      {allSelected ? 'ყველას გაუქმება' : 'ყველას მონიშვნა'}
                    </Button>
                    
                    {selectedIds.size > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteSelected}
                        disabled={bulkDeleting}
                        className="gap-2"
                      >
                        {bulkDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        წაშალე მონიშნული ({selectedIds.size})
                      </Button>
                    )}
                  </div>

                  {scanResult.duplicates.map((dup, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border ${
                        dup.matchType === 'answer' 
                          ? 'border-orange-500/30 bg-orange-500/5' 
                          : 'border-destructive/20 bg-destructive/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <Checkbox
                            checked={selectedIds.has(dup.existingId)}
                            onCheckedChange={() => handleToggleSelect(dup.existingId)}
                            className="mt-1"
                          />
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                              {dup.matchType === 'answer' ? (
                                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                                  იგივე პასუხი
                                </Badge>
                              ) : (
                                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                                  მსგავსი ტექსტი ({Math.round(dup.similarity * 100)}%)
                                </Badge>
                              )}
                              {dup.correctAnswer && (
                                <span className="text-xs text-muted-foreground">
                                  პასუხი: <span className="font-medium text-foreground">{dup.correctAnswer}</span>
                                </span>
                              )}
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
