import { useState, useRef } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface IconReplacerProps {
  slug: string;
  currentUrl: string;
  onReplaced?: (newUrl: string) => void;
}

export function IconReplacer({ slug, currentUrl, onReplaced }: IconReplacerProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.type.includes('png') && !selectedFile.type.includes('image')) {
      toast.error('მხოლოდ სურათები');
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  };

  const handleReplace = async () => {
    if (!file) return;

    setUploading(true);
    try {
      // Delete existing file first
      await supabase.storage.from('icon-library').remove([`${slug}.png`]);

      // Upload new file
      const { error: uploadError } = await supabase.storage
        .from('icon-library')
        .upload(`${slug}.png`, file, {
          contentType: 'image/png',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Update icon_url with cache buster
      const newUrl = `https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library/${slug}.png?v=${Date.now()}`;
      
      const { error: dbError } = await supabase
        .from('icon_library')
        .update({ icon_url: newUrl })
        .eq('slug', slug);

      if (dbError) throw dbError;

      // Trigger cache refresh globally so all components get the new icon
      window.dispatchEvent(new CustomEvent('icon-library-refresh'));

      toast.success(`აიკონი "${slug}" განახლდა!`);
      onReplaced?.(newUrl);
      setOpen(false);
      setFile(null);
      setPreview(null);
    } catch (error) {
      console.error('Replace error:', error);
      toast.error('შეცდომა აიკონის ჩანაცვლებისას');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={() => setOpen(true)}
        title="აიკონის ჩანაცვლება"
      >
        <RefreshCw className="h-3 w-3" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>აიკონის ჩანაცვლება: {slug}</DialogTitle>
            <DialogDescription>
              აირჩიე ახალი სურათი ჩასანაცვლებლად
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current vs New comparison */}
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2">მიმდინარე</p>
                <div className="w-20 h-20 rounded-lg border bg-muted flex items-center justify-center">
                  <img 
                    src={currentUrl} 
                    alt="Current" 
                    className="w-16 h-16 object-contain"
                  />
                </div>
              </div>
              
              {preview && (
                <>
                  <span className="text-muted-foreground">→</span>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-2">ახალი</p>
                    <div className="w-20 h-20 rounded-lg border border-primary bg-muted flex items-center justify-center">
                      <img 
                        src={preview} 
                        alt="New" 
                        className="w-16 h-16 object-contain"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* File input */}
            <div>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => inputRef.current?.click()}
              >
                აირჩიე ახალი სურათი
              </Button>
            </div>

            {/* Replace button */}
            {file && (
              <Button
                className="w-full"
                onClick={handleReplace}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    იცვლება...
                  </>
                ) : (
                  'ჩანაცვლება'
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
