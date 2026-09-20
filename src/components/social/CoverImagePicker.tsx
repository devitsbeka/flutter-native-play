import { useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Upload, Loader2, X, Check, Shuffle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { COVER_GRADIENTS, randomCoverGradient } from "@/config/coverGradients";

/**
 * A cover is a gradient or a photo. It is not generated.
 *
 * This offered three goes at `generate-cover-image` per round, kept the
 * results in `cover_image_generations` and showed them back as a grid to
 * re-pick from. The gradient was the fallback underneath, and the fallback
 * is the whole feature now: pick one, or shuffle, or use a photo from the
 * camera roll (owner: "use random background gradients, or upload photo
 * option, no generations for trivia covers").
 *
 * `onGradientChange` had been a prop nothing ever called -- there was no way
 * to choose a gradient at all, only to accept whichever one the creating
 * modal happened to seed. The swatches below are what it is for.
 *
 * The upload still goes through `validate-cover-image`. That is a content
 * screen on somebody's camera roll, not generation, and it is what keeps a
 * public cover inside guideline 1.2.
 */
interface CoverImagePickerProps {
  currentImage?: string | null;
  currentGradient: string;
  onImageChange: (imageUrl: string | null) => void;
  onGradientChange: (gradient: string) => void;
  title?: string;
}

export function CoverImagePicker({
  currentImage,
  currentGradient,
  onImageChange,
  onGradientChange,
  title,
}: CoverImagePickerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: t("extra.invalidFileTitle"),
        description: t("extra.selectImageDesc"),
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t("extra.fileTooLargeTitle"),
        description: t("extra.maxSizeMBDesc"),
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("quiz-covers")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("quiz-covers")
        .getPublicUrl(fileName);

      // Appropriateness screen before the image can become a public quiz
      // cover (guideline 1.2). The function existed and nothing called it —
      // any camera-roll photo went straight to the public feed. Relevance
      // is advisory; only a content-safety flag blocks, and validator
      // outages fail open so a model hiccup doesn't break uploads.
      let verdict: { isAppropriate?: boolean } | null = null;
      try {
        const { data } = await supabase.functions.invoke("validate-cover-image", {
          body: { imageUrl: publicUrl, title },
        });
        verdict = data;
      } catch {
        // Validator unreachable — fail open, same as the function's own
        // error paths. Landing in the outer catch would keep the uploaded
        // file but never set it, orphaning it in a public bucket.
        verdict = null;
      }
      if (verdict && verdict.isAppropriate === false) {
        await supabase.storage.from("quiz-covers").remove([fileName]);
        toast({
          title: t("extra.textNotAllowed"),
          variant: "destructive",
        });
        return;
      }

      onImageChange(publicUrl);
      toast({
        title: t("extra.imageUploadedToast"),
      });
    } catch (error) {
      console.error("Error uploading:", error);
      toast({
        title: t("extra.errorTitle"),
        description: t("extra.uploadErrorDesc"),
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  /**
   * Choosing a gradient clears the photo.
   *
   * They occupy the same slot -- the preview draws the image when there is
   * one and the gradient when there is not -- so a tapped swatch that left
   * an image in place would look like it did nothing.
   */
  const pickGradient = (gradient: string) => {
    onGradientChange(gradient);
    if (currentImage) onImageChange(null);
  };

  const handleRemoveImage = () => {
    onImageChange(null);
  };

  return (
    <div className="space-y-3">
      {/* Preview */}
      <div 
        className="aspect-[16/9] w-full rounded-xl relative overflow-hidden"
        style={{ background: currentImage ? undefined : currentGradient }}
      >
        {currentImage && (
          <img 
            src={currentImage} 
            alt="Cover" 
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black/20" />
        
        {/* Preview title */}
        <div className="absolute inset-0 flex items-center justify-center">
          <h4 className="text-lg font-bold text-white text-center px-4 drop-shadow-lg line-clamp-2">
            {title || t("extra.editDefaultTitle")}
          </h4>
        </div>

        {/* Remove image button */}
        {currentImage && (
          <button
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        )}
      </div>

      {/* Photo, or a gradient rolled again */}
      <div className="flex gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Upload className="w-4 h-4" />
              <span>{t("extra.uploadBtn")}</span>
            </>
          )}
        </button>

        <button
          onClick={() => pickGradient(randomCoverGradient())}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-border hover:border-primary/50 transition-colors text-sm font-medium text-muted-foreground hover:text-foreground active:scale-95"
        >
          <Shuffle className="w-4 h-4" />
          <span>{t("extra.shuffleGradientBtn")}</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* The whole set, so shuffling is not the only way to reach one */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          {t("extra.coverBackgroundLabel")}
        </label>
        <div className="grid grid-cols-8 gap-2">
          {COVER_GRADIENTS.map((gradient) => {
            const isCurrent = !currentImage && currentGradient === gradient;
            return (
              <button
                key={gradient}
                type="button"
                onClick={() => pickGradient(gradient)}
                aria-label={t("extra.coverBackgroundLabel")}
                aria-pressed={isCurrent}
                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all active:scale-95 ${
                  isCurrent ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
                }`}
                style={{ background: gradient }}
              >
                {isCurrent && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="w-4 h-4 rounded-full bg-white/90 flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary" />
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
