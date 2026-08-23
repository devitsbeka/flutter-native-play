import { useState, useCallback } from 'react';
import { Upload, X, Image, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from "@/lib/toast";
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface UploadedIcon {
  file: File;
  preview: string;
  slug: string;
  title: string;
  category: string;
  tags: string[];
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface IconUploadPanelProps {
  onSuccess?: () => void;
}

export function IconUploadPanel({ onSuccess }: IconUploadPanelProps) {
  const [icons, setIcons] = useState<UploadedIcon[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const generateSlug = (filename: string): string => {
    return filename
      .replace(/\.[^/.]+$/, '') // Remove extension
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const generateTitle = (filename: string): string => {
    return filename
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;

    const newIcons: UploadedIcon[] = [];

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} არ არის სურათი`);
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} 5MB-ზე მეტია`);
        return;
      }

      const slug = generateSlug(file.name);
      const title = generateTitle(file.name);

      // Check for duplicates
      if (icons.some(i => i.slug === slug)) {
        toast.error(`${slug} უკვე დამატებულია`);
        return;
      }

      newIcons.push({
        file,
        preview: URL.createObjectURL(file),
        slug,
        title,
        category: 'general',
        tags: [],
        status: 'pending',
      });
    });

    setIcons(prev => [...prev, ...newIcons]);
  }, [icons]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const updateIcon = (index: number, updates: Partial<UploadedIcon>) => {
    setIcons(prev => prev.map((icon, i) => 
      i === index ? { ...icon, ...updates } : icon
    ));
  };

  const removeIcon = (index: number) => {
    setIcons(prev => {
      const icon = prev[index];
      if (icon) {
        URL.revokeObjectURL(icon.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadAll = async () => {
    if (icons.length === 0) {
      toast.error('აიკონები არ არის');
      return;
    }

    setUploading(true);
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < icons.length; i++) {
      const icon = icons[i];
      if (icon.status === 'success') continue;

      updateIcon(i, { status: 'uploading' });

      try {
        // Check if slug already exists
        const { data: existing } = await supabase
          .from('icon_library')
          .select('id')
          .eq('slug', icon.slug)
          .single();

        // Upload to storage (always upsert)
        const fileName = `${icon.slug}.png`;
        const { error: uploadError } = await supabase.storage
          .from('icon-library')
          .upload(fileName, icon.file, {
            contentType: 'image/png',
            upsert: true,
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('icon-library')
          .getPublicUrl(fileName);

        if (existing) {
          // Update existing record
          const { error: dbError } = await supabase
            .from('icon_library')
            .update({
              title: icon.title,
              category: icon.category,
              tags: icon.tags,
              file_name: fileName,
              icon_url: urlData.publicUrl,
            })
            .eq('slug', icon.slug);

          if (dbError) throw dbError;
        } else {
          // Insert new record
          const { error: dbError } = await supabase
            .from('icon_library')
            .insert({
              slug: icon.slug,
              title: icon.title,
              category: icon.category,
              tags: icon.tags,
              file_name: fileName,
              icon_url: urlData.publicUrl,
            });

          if (dbError) throw dbError;
        }

        updateIcon(i, { status: 'success' });
        successCount++;
      } catch (error) {
        console.error(`Error uploading ${icon.slug}:`, error);
        updateIcon(i, { 
          status: 'error', 
          error: error instanceof Error ? error.message : 'უცნობი შეცდომა' 
        });
        errorCount++;
      }
    }

    setUploading(false);

    if (successCount > 0) {
      toast.success(`${successCount} აიკონი აიტვირთა/განახლდა`);
      onSuccess?.();
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} აიკონის ატვირთვა ვერ მოხერხდა`);
    }
  };

  const clearCompleted = () => {
    setIcons(prev => prev.filter(i => i.status !== 'success'));
  };

  const pendingCount = icons.filter(i => i.status === 'pending').length;
  const successCount = icons.filter(i => i.status === 'success').length;

  return (
    <div className="flex flex-col h-full">
      {/* Drop Zone - Compact */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "border-2 border-dashed rounded-xl p-4 text-center transition-colors mb-4",
          dragActive 
            ? "border-primary bg-primary/5" 
            : "border-border hover:border-muted-foreground"
        )}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          id="icon-upload"
        />
        <label htmlFor="icon-upload" className="cursor-pointer">
          <div className="flex items-center justify-center gap-4">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="text-left">
              <p className="font-medium text-sm">აიკონების ატვირთვა</p>
              <p className="text-xs text-muted-foreground">
                გადმოათრიეთ ან დააჭირეთ ასარჩევად
              </p>
            </div>
          </div>
        </label>
      </div>

      {/* Stats */}
      {icons.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4 text-sm">
            <span>სულ: {icons.length}</span>
            {pendingCount > 0 && (
              <Badge variant="outline">{pendingCount} მოლოდინში</Badge>
            )}
            {successCount > 0 && (
              <Badge className="bg-green-100 text-green-800">{successCount} ატვირთული</Badge>
            )}
          </div>
          <div className="flex gap-2">
            {successCount > 0 && (
              <Button variant="outline" size="sm" onClick={clearCompleted}>
                ატვირთულის წაშლა
              </Button>
            )}
            <Button 
              size="sm" 
              onClick={uploadAll} 
              disabled={uploading || pendingCount === 0}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  იტვირთება...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  ყველას ატვირთვა
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Icons List */}
      <ScrollArea className="flex-1">
        <div className="space-y-3">
          {icons.map((icon, index) => (
            <div
              key={index}
              className={cn(
                "p-3 rounded-lg border transition-colors",
                icon.status === 'success' && "border-green-200 bg-green-50/50",
                icon.status === 'error' && "border-red-200 bg-red-50/50",
                icon.status === 'uploading' && "border-blue-200 bg-blue-50/50",
                icon.status === 'pending' && "border-border bg-card"
              )}
            >
              <div className="flex items-start gap-3">
                {/* Preview */}
                <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                  <img 
                    src={icon.preview} 
                    alt={icon.title}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Input
                      value={icon.slug}
                      onChange={(e) => updateIcon(index, { slug: e.target.value })}
                      placeholder="slug"
                      className="h-8 text-sm"
                      disabled={icon.status !== 'pending'}
                    />
                    <Input
                      value={icon.title}
                      onChange={(e) => updateIcon(index, { title: e.target.value })}
                      placeholder="სათაური"
                      className="h-8 text-sm"
                      disabled={icon.status !== 'pending'}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={icon.category}
                      onChange={(e) => updateIcon(index, { category: e.target.value })}
                      placeholder="კატეგორია"
                      className="h-8 text-sm"
                      disabled={icon.status !== 'pending'}
                    />
                    <Input
                      value={icon.tags.join(', ')}
                      onChange={(e) => updateIcon(index, { 
                        tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) 
                      })}
                      placeholder="თეგები (მძიმით გამოყოფილი)"
                      className="h-8 text-sm"
                      disabled={icon.status !== 'pending'}
                    />
                  </div>
                  {icon.error && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {icon.error}
                    </p>
                  )}
                </div>

                {/* Status/Actions */}
                <div className="flex items-center gap-2">
                  {icon.status === 'uploading' && (
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  )}
                  {icon.status === 'success' && (
                    <Check className="w-5 h-5 text-green-500" />
                  )}
                  {icon.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  {icon.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeIcon(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
