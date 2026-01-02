import { useState, useMemo, useRef } from 'react';
import { Search, AlertTriangle, Upload, Check, Loader2, X, CheckSquare, Square, FolderUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
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
}

interface FixedIcon {
  slug: string;
  newUrl: string;
}

export function BrokenIconsModal({ 
  open, 
  onOpenChange, 
  brokenIcons, 
  icons,
  onIconFixed 
}: BrokenIconsModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIcons, setSelectedIcons] = useState<Set<string>>(new Set());
  const [uploadingIcons, setUploadingIcons] = useState<Set<string>>(new Set());
  const [fixedIcons, setFixedIcons] = useState<Map<string, string>>(new Map());
  const bulkInputRef = useRef<HTMLInputElement>(null);

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

  // Recently fixed icons
  const recentlyFixed = useMemo(() => {
    return icons.filter(icon => fixedIcons.has(icon.slug));
  }, [icons, fixedIcons]);

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

  // Upload single icon
  const uploadSingleIcon = async (slug: string, file: File) => {
    if (!file || !file.type.includes('png')) {
      toast.error('მხოლოდ PNG ფაილები დაშვებულია');
      return;
    }

    setUploadingIcons(prev => new Set([...prev, slug]));
    
    try {
      const fileName = `${slug}.png`;
      
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
      
      setFixedIcons(prev => new Map(prev).set(slug, newUrl));
      onIconFixed(slug, newUrl);
      toast.success(`აიკონი ატვირთულია: ${slug}`);
    } catch (error) {
      console.error('Error uploading icon:', error);
      toast.error(`შეცდომა: ${slug}`);
    } finally {
      setUploadingIcons(prev => {
        const newSet = new Set(prev);
        newSet.delete(slug);
        return newSet;
      });
    }
  };

  // Bulk upload - matches files by filename to slug
  const handleBulkUpload = async (files: FileList) => {
    const fileMap = new Map<string, File>();
    
    // Match files to slugs
    Array.from(files).forEach(file => {
      const slug = file.name.replace(/\.png$/i, '');
      if (brokenIcons.has(slug) && !fixedIcons.has(slug)) {
        fileMap.set(slug, file);
      }
    });

    if (fileMap.size === 0) {
      toast.error('ვერ მოიძებნა შესაბამისი ფაილები. ფაილის სახელი უნდა ემთხვეოდეს slug-ს');
      return;
    }

    toast.info(`${fileMap.size} ფაილი ატვირთვა...`);

    let successCount = 0;
    for (const [slug, file] of fileMap) {
      await uploadSingleIcon(slug, file);
      successCount++;
    }

    toast.success(`${successCount} აიკონი ატვირთულია`);
  };

  const remainingCount = brokenIcons.size - fixedIcons.size;

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
                  {remainingCount} დარჩენილი • {fixedIcons.size} გამოსწორებული
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

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
                  handleBulkUpload(e.target.files);
                }
                e.target.value = '';
              }}
            />
            <Button
              onClick={() => bulkInputRef.current?.click()}
              className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shrink-0"
            >
              <FolderUp className="h-4 w-4 mr-1.5" />
              Bulk ატვირთვა
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground">
            💡 Bulk ატვირთვისთვის PNG ფაილების სახელები უნდა ემთხვეოდეს slug-ებს (მაგ: pyramid.png, sword.png)
          </p>
        </div>

        {/* Icons Grid */}
        <ScrollArea className="flex-1 min-h-0">
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
                              if (file) uploadSingleIcon(icon.slug, file);
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
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
