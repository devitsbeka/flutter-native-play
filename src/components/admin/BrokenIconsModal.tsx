import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Search, AlertTriangle, Upload, Check, Loader2, X, CheckSquare, Square, FolderUp, Download, FileText, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from "@/lib/toast";
import { supabase } from '@/integrations/supabase/client';

interface IconItem {
  slug: string;
  title: string;
  category: string;
  tags: string[];
  url: string;
}

interface BrokenIconsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brokenIcons: Set<string>;
  icons: IconItem[];
  onIconFixed: (slug: string, newUrl: string) => void;
  totalIconsInLibrary: number;
}

interface FixedIcon {
  slug: string;
  newUrl: string;
}

interface PersistentStats {
  totalFixed: number;
  fixedSlugs: Set<string>;
}

interface FileMatch {
  file: File;
  matchedSlug: string;
  originalName: string;
  matchType: 'exact' | 'normalized';
}

interface UploadProgress {
  current: number;
  total: number;
  currentSlug: string;
  startTime: number;
}

// Normalize filename to match slug
const normalizeToSlug = (filename: string): string => {
  return filename
    .replace(/\.(png|jpg|jpeg|svg|webp)$/i, '') // Remove extension
    .replace(/_/g, '-')                          // Underscores to dashes
    .replace(/[-_]?v?\d+$/i, '')                // Remove version suffixes like -v2, _v3
    .replace(/[-_]?(copy|final|new|fixed)$/i, '') // Remove common suffixes
    .toLowerCase()
    .trim();
};

export function BrokenIconsModal({ 
  open, 
  onOpenChange, 
  brokenIcons, 
  icons,
  onIconFixed,
  totalIconsInLibrary
}: BrokenIconsModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIcons, setSelectedIcons] = useState<Set<string>>(new Set());
  const [uploadingIcons, setUploadingIcons] = useState<Set<string>>(new Set());
  const [fixedIcons, setFixedIcons] = useState<Map<string, string>>(new Map());
  const [persistentStats, setPersistentStats] = useState<PersistentStats>({ totalFixed: 0, fixedSlugs: new Set() });
  const [loadingStats, setLoadingStats] = useState(true);
  const bulkInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
  // Match preview state
  const [pendingFiles, setPendingFiles] = useState<FileMatch[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Load persistent fix history from database
  useEffect(() => {
    const loadFixHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('icon_fix_history')
          .select('icon_slug');
        
        if (error) throw error;
        
        const slugs = new Set((data || []).map(d => d.icon_slug));
        setPersistentStats({
          totalFixed: slugs.size,
          fixedSlugs: slugs
        });
      } catch (error) {
        console.error('Error loading fix history:', error);
      } finally {
        setLoadingStats(false);
      }
    };
    
    if (open) {
      loadFixHistory();
    }
  }, [open]);

  // Get broken icon details with search filter
  const brokenIconDetails = useMemo(() => {
    const broken = icons.filter(icon => brokenIcons.has(icon.slug) && !fixedIcons.has(icon.slug));
    if (!searchTerm) return broken;
    
    const term = searchTerm.toLowerCase();
    return broken.filter(icon => 
      icon.slug.toLowerCase().includes(term) ||
      icon.title.toLowerCase().includes(term) ||
      icon.category.toLowerCase().includes(term)
    );
  }, [icons, brokenIcons, searchTerm, fixedIcons]);

  // Create a lookup map for broken slugs (for faster matching)
  const brokenSlugSet = useMemo(() => {
    const slugs = new Set<string>();
    icons.forEach(icon => {
      if (brokenIcons.has(icon.slug) && !fixedIcons.has(icon.slug)) {
        slugs.add(icon.slug);
      }
    });
    return slugs;
  }, [icons, brokenIcons, fixedIcons]);

  // Recently fixed icons - show first
  const recentlyFixed = useMemo(() => {
    return icons.filter(icon => fixedIcons.has(icon.slug));
  }, [icons, fixedIcons]);

  // Working icons (not broken, not fixed in this session)
  const workingIcons = useMemo(() => {
    const working = icons.filter(icon => !brokenIcons.has(icon.slug) && !fixedIcons.has(icon.slug));
    if (!searchTerm) return working.slice(0, 20);
    
    const term = searchTerm.toLowerCase();
    return working.filter(icon => 
      icon.slug.toLowerCase().includes(term) ||
      icon.title.toLowerCase().includes(term) ||
      icon.category.toLowerCase().includes(term)
    ).slice(0, 20);
  }, [icons, brokenIcons, searchTerm, fixedIcons]);

  // Toggle icon selection
  const toggleSelect = (slug: string) => {
    setSelectedIcons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(slug)) {
        newSet.delete(slug);
      } else {
        newSet.add(slug);
      }
      return newSet;
    });
  };

  // Select/Deselect all
  const toggleSelectAll = () => {
    if (selectedIcons.size === brokenIconDetails.length) {
      setSelectedIcons(new Set());
    } else {
      setSelectedIcons(new Set(brokenIconDetails.map(i => i.slug)));
    }
  };

  // Export broken icons list
  const exportBrokenIconsList = () => {
    const brokenSlugs = Array.from(brokenSlugSet).sort();
    const content = brokenSlugs.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `broken-icons-${brokenSlugs.length}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${brokenSlugs.length} slug ექსპორტირებულია`);
  };

  // Match files to broken icon slugs
  const matchFilesToSlugs = useCallback((files: FileList | File[]): FileMatch[] => {
    const matches: FileMatch[] = [];
    const usedSlugs = new Set<string>();
    
    Array.from(files).forEach(file => {
      if (!file.type.includes('png') && !file.name.toLowerCase().endsWith('.png')) return;
      
      const originalName = file.name;
      const exactSlug = originalName.replace(/\.png$/i, '');
      const normalizedSlug = normalizeToSlug(originalName);
      
      // Try exact match first
      if (brokenSlugSet.has(exactSlug) && !usedSlugs.has(exactSlug)) {
        matches.push({ file, matchedSlug: exactSlug, originalName, matchType: 'exact' });
        usedSlugs.add(exactSlug);
      }
      // Try normalized match
      else if (brokenSlugSet.has(normalizedSlug) && !usedSlugs.has(normalizedSlug)) {
        matches.push({ file, matchedSlug: normalizedSlug, originalName, matchType: 'normalized' });
        usedSlugs.add(normalizedSlug);
      }
    });
    
    return matches;
  }, [brokenSlugSet]);

  // Upload single icon and save to fix history
  const uploadSingleIcon = async (slug: string, file: File): Promise<boolean> => {
    if (!file || !file.type.includes('png')) {
      return false;
    }
    
    try {
      const fileName = `${slug}.png`;
      const icon = icons.find(i => i.slug === slug);
      const oldUrl = icon?.url || null;
      
      const { error: uploadError } = await supabase.storage
        .from('icon-library')
        .upload(fileName, file, { 
          cacheControl: '3600',
          upsert: true 
        });
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('icon-library')
        .getPublicUrl(fileName);
      
      const newUrl = urlData.publicUrl + '?t=' + Date.now();
      
      const { error: updateError } = await supabase
        .from('icon_library')
        .update({ 
          icon_url: newUrl,
          file_name: fileName 
        })
        .eq('slug', slug);
      
      if (updateError) throw updateError;
      
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from('icon_fix_history')
        .upsert({ 
          icon_slug: slug,
          old_url: oldUrl,
          new_url: newUrl,
          fixed_by: user?.id
        }, { onConflict: 'icon_slug' });
      
      setFixedIcons(prev => new Map(prev).set(slug, newUrl));
      setPersistentStats(prev => ({
        totalFixed: prev.totalFixed + (prev.fixedSlugs.has(slug) ? 0 : 1),
        fixedSlugs: new Set([...prev.fixedSlugs, slug])
      }));
      
      onIconFixed(slug, newUrl);
      return true;
    } catch (error) {
      console.error('Error uploading icon:', error);
      return false;
    }
  };

  // Upload single icon with UI feedback
  const uploadSingleIconWithUI = async (slug: string, file: File) => {
    if (!file || !file.type.includes('png')) {
      toast.error('მხოლოდ PNG ფაილები დაშვებულია');
      return;
    }

    setUploadingIcons(prev => new Set([...prev, slug]));
    
    const success = await uploadSingleIcon(slug, file);
    
    if (success) {
      toast.success(`აიკონი ატვირთულია: ${slug}`);
    } else {
      toast.error(`შეცდომა: ${slug}`);
    }
    
    setUploadingIcons(prev => {
      const newSet = new Set(prev);
      newSet.delete(slug);
      return newSet;
    });
  };

  // Process files and show preview
  const handleFilesSelected = (files: FileList | File[]) => {
    const matches = matchFilesToSlugs(files);
    
    if (matches.length === 0) {
      toast.error('ვერ მოიძებნა შესაბამისი ფაილები. ფაილის სახელი უნდა ემთხვეოდეს ან ჰგავდეს slug-ს');
      return;
    }
    
    setPendingFiles(matches);
    setShowPreview(true);
  };

  // Execute bulk upload from preview
  const executeBulkUpload = async () => {
    if (pendingFiles.length === 0) return;
    
    setShowPreview(false);
    const startTime = Date.now();
    let successCount = 0;
    
    setUploadProgress({ current: 0, total: pendingFiles.length, currentSlug: '', startTime });
    
    // Upload in parallel batches of 3
    const batchSize = 3;
    for (let i = 0; i < pendingFiles.length; i += batchSize) {
      const batch = pendingFiles.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async ({ file, matchedSlug }) => {
        setUploadProgress(prev => prev ? { ...prev, currentSlug: matchedSlug } : null);
        const success = await uploadSingleIcon(matchedSlug, file);
        if (success) successCount++;
      }));
      
      setUploadProgress(prev => prev ? { ...prev, current: Math.min(i + batchSize, pendingFiles.length) } : null);
    }
    
    setUploadProgress(null);
    setPendingFiles([]);
    
    if (successCount > 0) {
      toast.success(`${successCount} აიკონი ატვირთულია`);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const items = e.dataTransfer.items;
    const files: File[] = [];
    
    // Handle folder drops
    const processEntry = async (entry: FileSystemEntry): Promise<void> => {
      if (entry.isFile) {
        const fileEntry = entry as FileSystemFileEntry;
        return new Promise((resolve) => {
          fileEntry.file((file) => {
            if (file.name.toLowerCase().endsWith('.png')) {
              files.push(file);
            }
            resolve();
          });
        });
      } else if (entry.isDirectory) {
        const dirEntry = entry as FileSystemDirectoryEntry;
        const reader = dirEntry.createReader();
        return new Promise((resolve) => {
          reader.readEntries(async (entries) => {
            for (const subEntry of entries) {
              await processEntry(subEntry);
            }
            resolve();
          });
        });
      }
    };
    
    // Process all dropped items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const entry = item.webkitGetAsEntry?.();
      if (entry) {
        await processEntry(entry);
      } else if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file?.name.toLowerCase().endsWith('.png')) {
          files.push(file);
        }
      }
    }
    
    if (files.length > 0) {
      handleFilesSelected(files);
    } else {
      toast.error('PNG ფაილები ვერ მოიძებნა');
    }
  };

  const remainingCount = brokenIcons.size - fixedIcons.size;
  const sessionFixedCount = fixedIcons.size;
  const workingIconsCount = totalIconsInLibrary - brokenIcons.size + sessionFixedCount;
  const healthPercentage = totalIconsInLibrary > 0 
    ? Math.round((workingIconsCount / totalIconsInLibrary) * 100)
    : 100;

  // Calculate estimated time remaining
  const getEstimatedTime = () => {
    if (!uploadProgress || uploadProgress.current === 0) return null;
    const elapsed = (Date.now() - uploadProgress.startTime) / 1000;
    const rate = uploadProgress.current / elapsed;
    const remaining = (uploadProgress.total - uploadProgress.current) / rate;
    return Math.ceil(remaining);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b border-border/50 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/20">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <DialogTitle className="text-lg">გატეხილი აიკონები</DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {remainingCount} დარჩენილი • {sessionFixedCount} გამოსწორებული ამ სესიაში
                </p>
              </div>
            </div>
            
            {/* Export Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={exportBrokenIconsList}
              className="shrink-0"
            >
              <Download className="h-4 w-4 mr-1.5" />
              ექსპორტი (.txt)
            </Button>
          </div>
          
          {/* Persistent Progress Stats */}
          <div className="mt-4 space-y-3">
            {/* Health Progress Bar */}
            <div className="rounded-lg border border-border/50 bg-background/50 p-3">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">ბიბლიოთეკის ჯანმრთელობა</span>
                <span className="font-medium">
                  {workingIconsCount.toLocaleString()} / {totalIconsInLibrary.toLocaleString()} მუშა
                  <span className={cn(
                    "ml-2 font-bold",
                    healthPercentage >= 90 ? "text-green-500" :
                    healthPercentage >= 70 ? "text-yellow-500" : "text-orange-500"
                  )}>
                    ({healthPercentage}%)
                  </span>
                </span>
              </div>
              <Progress 
                value={healthPercentage} 
                className="h-2"
              />
            </div>
            
            {/* Stats Summary */}
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="rounded-lg border border-border/50 bg-background/50 p-2">
                <div className="text-lg font-bold text-foreground">{totalIconsInLibrary.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground">სულ აიკონი</div>
              </div>
              <div className="rounded-lg border border-border/50 bg-background/50 p-2">
                <div className="text-lg font-bold text-green-500">{workingIconsCount.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground">მუშა</div>
              </div>
              <div className="rounded-lg border border-border/50 bg-background/50 p-2">
                <div className="text-lg font-bold text-orange-500">{remainingCount.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground">გატეხილი</div>
              </div>
              <div className="rounded-lg border border-border/50 bg-background/50 p-2">
                <div className="text-lg font-bold text-violet-500">{persistentStats.totalFixed.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground">სულ გამოსწორ.</div>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Upload Progress Overlay */}
        {uploadProgress && (
          <div className="absolute inset-0 bg-background/90 z-50 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md w-full px-8">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <div>
                <p className="text-lg font-medium">იტვირთება აიკონები...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {uploadProgress.current} / {uploadProgress.total}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  მიმდინარე: {uploadProgress.currentSlug}
                </p>
              </div>
              <Progress value={(uploadProgress.current / uploadProgress.total) * 100} className="h-3" />
              {getEstimatedTime() && (
                <p className="text-xs text-muted-foreground">
                  დარჩენილი დრო: ~{getEstimatedTime()} წამი
                </p>
              )}
            </div>
          </div>
        )}

        {/* Match Preview Modal */}
        {showPreview && (
          <div className="absolute inset-0 bg-background/95 z-50 flex flex-col">
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-medium">ფაილების შემოწმება</h3>
                  <p className="text-sm text-muted-foreground">
                    {pendingFiles.length} ფაილი მოიძებნა • {brokenSlugSet.size - pendingFiles.length} დარჩება
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => { setShowPreview(false); setPendingFiles([]); }}>
                  გაუქმება
                </Button>
                <Button onClick={executeBulkUpload} className="bg-gradient-to-r from-green-500 to-emerald-600">
                  <Upload className="h-4 w-4 mr-1.5" />
                  ატვირთვა ({pendingFiles.length})
                </Button>
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {pendingFiles.slice(0, 100).map(({ file, matchedSlug, originalName, matchType }) => (
                    <div key={matchedSlug} className="flex items-center gap-3 p-2 rounded-lg border border-border/50 bg-background/50">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate">{originalName}</p>
                        <p className="text-xs text-muted-foreground">→ {matchedSlug}</p>
                      </div>
                      <Badge variant={matchType === 'exact' ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                        {matchType === 'exact' ? 'ზუსტი' : 'ნორმალ.'}
                      </Badge>
                    </div>
                  ))}
                  {pendingFiles.length > 100 && (
                    <div className="col-span-2 text-center text-sm text-muted-foreground py-2">
                      ... და კიდევ {pendingFiles.length - 100}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Toolbar */}
        <div className="p-3 border-b border-border/30 space-y-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="აიკონის ძიება..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
              className="shrink-0"
            >
              {selectedIcons.size === brokenIconDetails.length && brokenIconDetails.length > 0 ? (
                <>
                  <CheckSquare className="h-4 w-4 mr-1.5" />
                  ყველას მოხსნა
                </>
              ) : (
                <>
                  <Square className="h-4 w-4 mr-1.5" />
                  ყველას არჩევა
                </>
              )}
            </Button>

            <input
              ref={bulkInputRef}
              type="file"
              accept=".png,image/png"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) {
                  handleFilesSelected(e.target.files);
                }
                e.target.value = '';
              }}
            />
            
            {/* Folder input with webkitdirectory */}
            <input
              ref={folderInputRef}
              type="file"
              accept=".png,image/png"
              multiple
              // @ts-ignore - webkitdirectory is not in types but works
              webkitdirectory=""
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) {
                  handleFilesSelected(e.target.files);
                }
                e.target.value = '';
              }}
            />
            
            <Button
              variant="outline"
              onClick={() => folderInputRef.current?.click()}
              className="shrink-0"
            >
              <FolderUp className="h-4 w-4 mr-1.5" />
              ფოლდერი
            </Button>
            
            <Button
              onClick={() => bulkInputRef.current?.click()}
              className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shrink-0"
            >
              <Upload className="h-4 w-4 mr-1.5" />
              Bulk ატვირთვა
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground">
            💡 ფაილის სახელები შეიძლება იყოს: <code className="bg-muted px-1 rounded">pyramid.png</code>, <code className="bg-muted px-1 rounded">workshop_pegboard.png</code>, ან <code className="bg-muted px-1 rounded">sword-v2.png</code>
          </p>
        </div>

        {/* Drop Zone + Icons Grid */}
        <div
          ref={dropZoneRef}
          className={cn(
            "flex-1 min-h-0 relative transition-colors",
            isDragging && "bg-primary/5"
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Drop Zone Overlay */}
          {isDragging && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg m-4">
              <div className="text-center">
                <FolderUp className="h-12 w-12 mx-auto text-primary mb-2" />
                <p className="text-lg font-medium">ჩააგდეთ ფაილები ან ფოლდერი აქ</p>
                <p className="text-sm text-muted-foreground">PNG ფაილები ავტომატურად დამატჩდება</p>
              </div>
            </div>
          )}
          
          <ScrollArea className="h-full">
            <div className="p-4">
              {/* Recently Fixed Section */}
              {recentlyFixed.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-green-600 mb-3 flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    გამოსწორებული ({recentlyFixed.length})
                  </h3>
                  <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                    {recentlyFixed.map(icon => (
                      <div
                        key={icon.slug}
                        className="relative rounded-xl border-2 border-green-500/50 bg-green-500/10 p-3"
                      >
                        <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <div className="h-14 w-14 rounded-lg bg-background flex items-center justify-center p-1.5">
                            <img 
                              src={fixedIcons.get(icon.slug)} 
                              alt={icon.title}
                              className="h-full w-full object-contain"
                            />
                          </div>
                          <div className="text-center w-full">
                            <p className="text-xs font-medium truncate">{icon.slug}</p>
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 mt-1">
                              {icon.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Broken Icons */}
              {brokenIconDetails.length > 0 ? (
                <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {brokenIconDetails.map(icon => {
                    const isSelected = selectedIcons.has(icon.slug);
                    const isUploading = uploadingIcons.has(icon.slug);
                    
                    return (
                      <div
                        key={icon.slug}
                        className={cn(
                          "relative rounded-xl border-2 p-3 transition-all",
                          isSelected 
                            ? "border-primary bg-primary/10" 
                            : "border-orange-500/30 bg-orange-500/5 hover:border-orange-500/50"
                        )}
                      >
                        {/* Selection Checkbox */}
                        <button
                          onClick={() => toggleSelect(icon.slug)}
                          className="absolute top-2 left-2 z-10"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-5 w-5 text-primary" />
                          ) : (
                            <Square className="h-5 w-5 text-muted-foreground/50 hover:text-muted-foreground" />
                          )}
                        </button>

                        <div className="flex flex-col items-center gap-2 pt-4">
                          {/* Broken Icon Placeholder */}
                          <div className="h-14 w-14 rounded-lg bg-muted/50 flex items-center justify-center border-2 border-dashed border-orange-500/40">
                            <AlertTriangle className="h-6 w-6 text-orange-500/60" />
                          </div>
                          
                          <div className="text-center w-full">
                            <p className="text-xs font-medium truncate" title={icon.slug}>
                              {icon.slug}
                            </p>
                            <Badge variant="outline" className="text-[9px] px-1 py-0 mt-1">
                              {icon.category}
                            </Badge>
                          </div>

                          {/* Upload Button */}
                          <label className="w-full cursor-pointer">
                            <input
                              type="file"
                              accept=".png,image/png"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) uploadSingleIconWithUI(icon.slug, file);
                                e.target.value = '';
                              }}
                              disabled={isUploading}
                            />
                            <div className={cn(
                              "flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-xs font-medium transition-colors",
                              isUploading
                                ? "bg-muted text-muted-foreground"
                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                            )}>
                              {isUploading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Upload className="h-3.5 w-3.5" />
                              )}
                              {isUploading ? 'იტვირთება...' : 'ატვირთვა'}
                            </div>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : remainingCount === 0 ? (
                <div className="text-center py-12">
                  <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8 text-green-500" />
                  </div>
                  <p className="text-lg font-medium text-green-600">ყველა აიკონი გამოსწორებულია!</p>
                  <p className="text-sm text-muted-foreground mt-1">{fixedIcons.size} აიკონი ატვირთულია</p>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  ძიებით ვერ მოიძებნა
                </div>
              )}
              
              {/* Working Icons Preview */}
              {workingIcons.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border/50">
                  <h3 className="text-sm font-medium text-green-600 mb-3 flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    მუშა აიკონები (პირველი 20)
                  </h3>
                  <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                    {workingIcons.map(icon => (
                      <div
                        key={icon.slug}
                        className="relative rounded-xl border border-border/50 bg-background/50 p-3"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className="h-14 w-14 rounded-lg bg-background flex items-center justify-center p-1.5">
                            <img 
                              src={icon.url} 
                              alt={icon.title}
                              className="h-full w-full object-contain"
                              loading="lazy"
                            />
                          </div>
                          <div className="text-center w-full">
                            <p className="text-xs font-medium truncate" title={icon.slug}>
                              {icon.slug}
                            </p>
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 mt-1">
                              {icon.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
