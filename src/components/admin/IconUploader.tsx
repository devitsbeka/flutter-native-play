import { useState, useCallback } from 'react';
import { Upload, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/lib/toast";
import { cn } from '@/lib/utils';

interface IconUploaderProps {
  onSuccess?: (slug: string) => void;
  onClose?: () => void;
}

const ICON_STORAGE_URL = 'https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library';

export function IconUploader({ onSuccess, onClose }: IconUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('custom');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const generateSlug = (filename: string) => {
    return filename
      .toLowerCase()
      .replace(/\.png$/i, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (!selectedFile.type.includes('png')) {
      toast.error('მხოლოდ PNG ფაილები');
      return;
    }
    if (selectedFile.size > 500 * 1024) {
      toast.error('მაქსიმუმ 500KB');
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    
    const generatedSlug = generateSlug(selectedFile.name);
    setSlug(generatedSlug);
    setTitle(selectedFile.name.replace(/\.png$/i, '').replace(/[-_]/g, ' '));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }, [handleFileSelect]);

  const handleUpload = async () => {
    if (!file || !slug.trim() || !title.trim()) {
      toast.error('შეავსე ყველა ველი');
      return;
    }

    setUploading(true);
    try {
      // Check if slug already exists
      const { data: existing } = await supabase
        .from('icon_library')
        .select('slug')
        .eq('slug', slug)
        .single();

      if (existing) {
        toast.error('ეს slug უკვე არსებობს');
        setUploading(false);
        return;
      }

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('icon-library')
        .upload(`${slug}.png`, file, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Insert into database
      const tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);
      const { error: dbError } = await supabase
        .from('icon_library')
        .insert({
          slug,
          title,
          category,
          tags: tagsArray,
          file_name: `${slug}.png`,
          icon_url: `${ICON_STORAGE_URL}/${slug}.png`
        });

      if (dbError) throw dbError;

      toast.success('აიკონი აიტვირთა!');
      onSuccess?.(slug);
      
      // Reset form
      setFile(null);
      setPreview(null);
      setSlug('');
      setTitle('');
      setTags('');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'შეცდომა ატვირთვისას');
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setSlug('');
    setTitle('');
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      {!file ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
          )}
          onClick={() => document.getElementById('icon-file-input')?.click()}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            ჩააგდე PNG ან დააკლიკე
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            მაქსიმუმ 500KB
          </p>
          <input
            id="icon-file-input"
            type="file"
            accept=".png"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />
        </div>
      ) : (
        <div className="flex items-start gap-4 p-3 bg-muted/50 rounded-lg">
          <div className="relative">
            <img src={preview!} alt="Preview" className="w-16 h-16 object-contain bg-white rounded border" />
            <button
              onClick={clearFile}
              className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="flex-1 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Slug</Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="h-8 text-sm"
                  placeholder="icon-slug"
                />
              </div>
              <div>
                <Label className="text-xs">სათაური</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-8 text-sm"
                  placeholder="Icon Title"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">კატეგორია</Label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="h-8 text-sm"
                  placeholder="custom"
                />
              </div>
              <div>
                <Label className="text-xs">თეგები (მძიმით)</Label>
                <Input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="h-8 text-sm"
                  placeholder="tag1, tag2"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            გაუქმება
          </Button>
        )}
        <Button 
          size="sm" 
          onClick={handleUpload} 
          disabled={!file || !slug || !title || uploading}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
          ატვირთვა
        </Button>
      </div>
    </div>
  );
}
