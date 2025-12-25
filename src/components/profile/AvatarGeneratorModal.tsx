import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Camera, Sparkles, Check, RefreshCw, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AvatarGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AvatarGeneratorModal({ isOpen, onClose }: AvatarGeneratorModalProps) {
  const { user, profile, updateProfile } = useAuth();
  const [step, setStep] = useState<"upload" | "generating" | "preview">("upload");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [generatedAvatar, setGeneratedAvatar] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    // Convert to base64 for preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const generateAvatar = async () => {
    if (!uploadedImage || !user) return;

    setIsLoading(true);
    setStep("generating");

    try {
      // First upload the image to storage to get a public URL
      const fileName = `temp/${user.id}/${Date.now()}.jpg`;
      
      // Convert base64 to blob
      const base64Data = uploadedImage.split(",")[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/jpeg" });

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, blob, { upsert: true });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;
      console.log("Uploaded image URL:", imageUrl);

      // Call the edge function to generate avatar
      const { data, error } = await supabase.functions.invoke("generate-avatar", {
        body: { imageUrl },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || "Failed to generate avatar");
      }

      setGeneratedAvatar(data.avatarUrl);
      setStep("preview");
      toast.success("Avatar generated!");

    } catch (error) {
      console.error("Error generating avatar:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate avatar");
      setStep("upload");
    } finally {
      setIsLoading(false);
    }
  };

  const saveAvatar = async () => {
    if (!generatedAvatar || !user) return;

    setIsLoading(true);

    try {
      // Download the generated avatar and upload to our storage
      const response = await fetch(generatedAvatar);
      const blob = await response.blob();
      
      const fileName = `${user.id}/avatar_${Date.now()}.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, blob, { upsert: true });

      if (uploadError) {
        throw new Error(`Failed to save avatar: ${uploadError.message}`);
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      await updateProfile({ avatar_url: urlData.publicUrl });

      toast.success("Avatar saved as profile picture!");
      onClose();
      resetState();

    } catch (error) {
      console.error("Error saving avatar:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save avatar");
    } finally {
      setIsLoading(false);
    }
  };

  const resetState = () => {
    setStep("upload");
    setUploadedImage(null);
    setGeneratedAvatar(null);
    setIsLoading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-background rounded-3xl w-full max-w-sm overflow-hidden shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="font-display text-lg font-bold">AI Avatar</h2>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {step === "upload" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Upload your photo to generate a 3D cartoon avatar
                </p>

                {/* Preview uploaded image */}
                {uploadedImage ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/20">
                      <img
                        src={uploadedImage}
                        alt="Uploaded"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 rounded-full bg-muted text-sm font-medium flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Change
                      </button>
                      <button
                        onClick={generateAvatar}
                        disabled={isLoading}
                        className="px-6 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        Generate
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-square max-w-[200px] mx-auto rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-muted/30 transition-colors"
                  >
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Tap to upload photo
                    </span>
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            )}

            {step === "generating" && (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/20">
                    <img
                      src={uploadedImage || ""}
                      alt="Uploaded"
                      className="w-full h-full object-cover opacity-50"
                    />
                  </div>
                  <motion.div
                    className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-foreground">Creating your avatar...</p>
                  <p className="text-sm text-muted-foreground">This may take 30-60 seconds</p>
                </div>
                <motion.div
                  className="flex gap-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full bg-primary"
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </motion.div>
              </div>
            )}

            {step === "preview" && generatedAvatar && (
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm text-muted-foreground text-center">
                  Your 3D avatar is ready!
                </p>

                <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-primary shadow-lg">
                  <img
                    src={generatedAvatar}
                    alt="Generated Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => {
                      setStep("upload");
                      setGeneratedAvatar(null);
                    }}
                    disabled={isLoading}
                    className="flex-1 py-3 rounded-full bg-muted text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Regenerate
                  </button>
                  <button
                    onClick={saveAvatar}
                    disabled={isLoading}
                    className="flex-1 py-3 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Use as PP
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
