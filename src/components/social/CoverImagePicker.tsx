import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Upload, Sparkles, Loader2, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useBackgroundGeneration } from "@/contexts/BackgroundGenerationContext";

const COVER_GRADIENTS = [
  "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
  "linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)",
  "linear-gradient(135deg, #F97316 0%, #EF4444 100%)",
  "linear-gradient(135deg, #10B981 0%, #34D399 100%)",
  "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
  "linear-gradient(135deg, #F59E0B 0%, #F97316 100%)",
  "radial-gradient(ellipse 120% 80% at 20% 30%, rgba(139,92,246,0.8) 0%, transparent 50%), radial-gradient(ellipse 100% 120% at 80% 70%, rgba(236,72,153,0.7) 0%, transparent 50%), linear-gradient(135deg, #4C1D95 0%, #831843 100%)",
  "radial-gradient(ellipse 80% 100% at 70% 20%, rgba(59,130,246,0.8) 0%, transparent 45%), radial-gradient(ellipse 100% 80% at 20% 80%, rgba(6,182,212,0.7) 0%, transparent 45%), linear-gradient(150deg, #1E3A8A 0%, #0E7490 100%)",
  "radial-gradient(ellipse 90% 110% at 30% 60%, rgba(16,185,129,0.8) 0%, transparent 50%), radial-gradient(ellipse 120% 90% at 75% 25%, rgba(52,211,153,0.6) 0%, transparent 50%), linear-gradient(160deg, #064E3B 0%, #047857 100%)",
  "radial-gradient(ellipse 100% 80% at 60% 30%, rgba(249,115,22,0.75) 0%, transparent 45%), radial-gradient(ellipse 80% 100% at 25% 75%, rgba(239,68,68,0.7) 0%, transparent 45%), linear-gradient(145deg, #7C2D12 0%, #991B1B 100%)",
];

interface Generation {
  id: string;
  image_url: string;
  is_selected: boolean;
  created_at: string;
}

interface CoverImagePickerProps {
  currentImage?: string | null;
  currentGradient: string;
  onImageChange: (imageUrl: string | null) => void;
  onGradientChange: (gradient: string) => void;
  suggestPrompt?: string;
  title?: string;
  roundId?: string;
}

const MAX_GENERATIONS = 3;

export function CoverImagePicker({
  currentImage,
  currentGradient,
  onImageChange,
  onGradientChange,
  suggestPrompt,
  title,
  roundId
}: CoverImagePickerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previousGenerations, setPreviousGenerations] = useState<Generation[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { startCoverGeneration, isGenerating } = useBackgroundGeneration();
  const { t } = useLanguage();

  const generationCount = previousGenerations.length;
  const remainingGenerations = MAX_GENERATIONS - generationCount;
  const isCoverGenerating = isGenerating("cover");

  // Fetch previous generations on mount
  useEffect(() => {
    if (roundId && user) {
      fetchPreviousGenerations();
    }
  }, [roundId, user]);

  const fetchPreviousGenerations = async () => {
    if (!roundId || !user) return;

    const { data } = await supabase
      .from("cover_image_generations")
      .select("*")
      .eq("user_id", user.id)
      .eq("round_id", roundId)
      .order("created_at", { ascending: false });

    if (data) {
      setPreviousGenerations(data as Generation[]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "არასწორი ფაილი",
        description: "გთხოვთ აირჩიოთ სურათი",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "ფაილი ძალიან დიდია",
        description: "მაქსიმალური ზომა 5MB",
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
        title: "სურათი აიტვირთა! ✓",
      });
    } catch (error) {
      console.error("Error uploading:", error);
      toast({
        title: "შეცდომა",
        description: "სურათის ატვირთვა ვერ მოხერხდა",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleGenerateAI = async () => {
    if (!user) return;

    if (remainingGenerations <= 0) {
      toast({
        title: "ლიმიტი ამოიწურა",
        description: "თქვენ უკვე დაგენერირეთ 3 სურათი",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Start background generation with skipNotification to auto-apply
      await startCoverGeneration(
        {
          title: title || suggestPrompt || "Quiz",
          subject: suggestPrompt || title || "trivia quiz",
          roundId: roundId,
          skipNotification: true  // Auto-apply without popup
        },
        (imageUrl) => {
          // Called automatically when generation completes
          onImageChange(imageUrl);
          // Refresh generations list
          fetchPreviousGenerations();
        }
      );

    } catch (error: unknown) {
      console.error("Error starting generation:", error);
      
      const errorMessage = error instanceof Error ? error.message : "";
      if (errorMessage.includes("limit")) {
        toast({
          title: "ლიმიტი ამოიწურა",
          description: "თქვენ უკვე დაგენერირეთ 3 სურათი",
          variant: "destructive",
        });
      } else {
        toast({
          title: "შეცდომა",
          description: "სურათის გენერაცია ვერ მოხერხდა",
          variant: "destructive",
        });
      }
    }
  };

  const handleSelectGeneration = (imageUrl: string) => {
    onImageChange(imageUrl);
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

      {/* Upload/Generate buttons */}
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
          onClick={handleGenerateAI}
          disabled={isCoverGenerating || remainingGenerations <= 0}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isCoverGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t("extra.generatingCover")}...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>{t("extra.generateBtn")} {roundId && `(${remainingGenerations})`}</span>
            </>
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Previous Generations */}
      {previousGenerations.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            {t("extra.yourGenerations", { current: previousGenerations.length, max: MAX_GENERATIONS })}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {previousGenerations.map((gen) => (
              <button
                key={gen.id}
                onClick={() => handleSelectGeneration(gen.image_url)}
                className={`relative aspect-[16/9] rounded-lg overflow-hidden border-2 transition-all ${
                  currentImage === gen.image_url 
                    ? "border-primary ring-2 ring-primary/30" 
                    : "border-border hover:border-primary/50"
                }`}
              >
                <img 
                  src={gen.image_url} 
                  alt="Generated cover" 
                  className="w-full h-full object-cover"
                />
                {currentImage === gen.image_url && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
