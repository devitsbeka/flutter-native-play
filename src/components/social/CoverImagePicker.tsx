import { useState, useRef } from "react";
import { Upload, Sparkles, Check, Loader2, X, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

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

interface CoverImagePickerProps {
  currentImage?: string | null;
  currentGradient: string;
  onImageChange: (imageUrl: string | null) => void;
  onGradientChange: (gradient: string) => void;
  suggestPrompt?: string;
  title?: string;
}

export function CoverImagePicker({
  currentImage,
  currentGradient,
  onImageChange,
  onGradientChange,
  suggestPrompt,
  title
}: CoverImagePickerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

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

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-cover-image", {
        body: {
          title: title || suggestPrompt || "Quiz",
          subject: suggestPrompt || title || "trivia quiz"
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        onImageChange(data.imageUrl);
        toast({
          title: "სურათი შეიქმნა! ✨",
        });
      }
    } catch (error) {
      console.error("Error generating:", error);
      toast({
        title: "შეცდომა",
        description: "სურათის გენერაცია ვერ მოხერხდა",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRemoveImage = () => {
    onImageChange(null);
  };

  return (
    <div className="space-y-3">
      {/* Preview */}
      <div 
        className="h-32 rounded-xl relative overflow-hidden"
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
            {title || "სათაური"}
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
              <span>ატვირთვა</span>
            </>
          )}
        </button>

        <button
          onClick={handleGenerateAI}
          disabled={isGenerating}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>გენერაცია</span>
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

    </div>
  );
}
