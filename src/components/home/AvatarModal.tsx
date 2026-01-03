import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, RefreshCw, Loader2, Check, ImageIcon, Wand2, Sparkles, Play } from "lucide-react";
import { GameModal, GameModalFooter } from "@/components/ui/game-modal";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { t } from "@/lib/i18n";

// Import default bot avatars
import botAvatar1 from '@/assets/avatars/bot-avatar-1.png';
import botAvatar2 from '@/assets/avatars/bot-avatar-2.png';
import botAvatar3 from '@/assets/avatars/bot-avatar-3.png';
import botAvatar4 from '@/assets/avatars/bot-avatar-4.png';
import botAvatar5 from '@/assets/avatars/bot-avatar-5.png';
import botAvatar6 from '@/assets/avatars/bot-avatar-6.png';
import botAvatar7 from '@/assets/avatars/bot-avatar-7.png';
import botAvatar8 from '@/assets/avatars/bot-avatar-8.png';
import botAvatar9 from '@/assets/avatars/bot-avatar-9.png';
import botAvatar10 from '@/assets/avatars/bot-avatar-10.png';

const DEFAULT_AVATARS = [
  botAvatar1, botAvatar2, botAvatar3, botAvatar4, botAvatar5,
  botAvatar6, botAvatar7, botAvatar8, botAvatar9, botAvatar10,
];

interface AvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AvatarGeneration {
  id: string;
  avatar_url: string;
  is_current: boolean;
  created_at: string;
}

export function AvatarModal({ isOpen, onClose }: AvatarModalProps) {
  const { user, profile, updateProfile } = useAuth();
  const [step, setStep] = useState<"gallery" | "upload" | "camera" | "generating" | "preview">("gallery");
  const [generations, setGenerations] = useState<AvatarGeneration[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [generatedAvatar, setGeneratedAvatar] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load avatar generations
  useEffect(() => {
    if (isOpen && user) {
      loadGenerations();
    }
  }, [isOpen, user]);

  const loadGenerations = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('avatar_generations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(12);

    if (!error && data) {
      setGenerations(data);
    }
  };

  // Camera controls
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setStep("camera");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsCameraReady(true);
        };
      }
    } catch (error) {
      console.error("Camera error:", error);
      toast.error(t("errors.cameraPermission"));
      setStep("upload");
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL("image/jpeg", 0.9);
    setUploadedImage(imageData);
    stopCamera();
    setStep("upload");
  }, [stopCamera]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setStep("gallery");
      setUploadedImage(null);
      setGeneratedAvatar(null);
      setSelectedAvatar(null);
    }
  }, [isOpen, stopCamera]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(t("errors.selectImageFile"));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("errors.imageTooLarge"));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
      setStep("upload");
    };
    reader.readAsDataURL(file);
  };

  const generateAvatar = async () => {
    if (!uploadedImage || !user) return;

    setIsLoading(true);
    setStep("generating");

    try {
      // Upload the image to storage
      const fileName = `${user.id}/temp_${Date.now()}.jpg`;
      
      const base64Data = uploadedImage.split(",")[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/jpeg" });

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, blob, { upsert: true });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;

      // Generate avatar via edge function
      const { data, error } = await supabase.functions.invoke("generate-avatar", {
        body: { imageUrl },
      });

      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error || "Failed to generate avatar");

      setGeneratedAvatar(data.avatarUrl);
      setStep("preview");
      
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#A855F7", "#EC4899", "#FFD700"],
      });

    } catch (error) {
      console.error("Error generating avatar:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate avatar");
      setStep("upload");
    } finally {
      setIsLoading(false);
    }
  };

  const saveAvatar = async (avatarUrl?: string) => {
    const urlToSave = avatarUrl || generatedAvatar;
    if (!urlToSave || !user) return;

    setIsLoading(true);

    try {
      // Download and re-upload to our storage
      const response = await fetch(urlToSave);
      const blob = await response.blob();
      
      const fileName = `${user.id}/avatar_${Date.now()}.png`;
      
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, blob, { 
          upsert: true,
          contentType: 'image/png'
        });

      if (uploadError) {
        throw new Error(`Failed to save avatar: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const finalUrl = urlData.publicUrl;

      // Save to avatar_generations table
      await supabase.from('avatar_generations').update({ is_current: false }).eq('user_id', user.id);
      
      await supabase.from('avatar_generations').insert({
        user_id: user.id,
        avatar_url: finalUrl,
        source_image_url: uploadedImage || null,
        is_current: true,
      });

      // Update profile
      await updateProfile({ avatar_url: finalUrl });

      toast.success(t("avatar.avatarSaved"));
      onClose();

    } catch (error) {
      console.error("Error saving avatar:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save avatar");
    } finally {
      setIsLoading(false);
    }
  };

  const selectPreviousAvatar = async (avatarUrl: string) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Update all to not current
      await supabase.from('avatar_generations').update({ is_current: false }).eq('user_id', user.id);
      
      // Set selected as current
      await supabase.from('avatar_generations').update({ is_current: true }).eq('avatar_url', avatarUrl);
      
      // Update profile - check for error!
      const result = await updateProfile({ avatar_url: avatarUrl });
      
      if (result?.error) {
        throw result.error;
      }
      
      toast.success(t("avatar.avatarUpdated"));
      onClose();
    } catch (error) {
      console.error("Error updating avatar:", error);
      toast.error(t("errors.generationFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const selectDefaultAvatar = async (avatarPath: string) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Update profile directly with the default avatar path
      const result = await updateProfile({ avatar_url: avatarPath });
      
      if (result?.error) {
        throw result.error;
      }
      
      toast.success(t("avatar.avatarUpdated"));
      onClose();
    } catch (error) {
      console.error("Error updating avatar:", error);
      toast.error(t("errors.generationFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const animateAvatar = async () => {
    if (!profile?.avatar_url || !user) {
      toast.error(t("errors.noAvatarToAnimate"));
      return;
    }

    setIsAnimating(true);
    toast.info(t("avatar.startingAnimation"), { duration: 5000 });

    try {
      // Start the animation
      const { data, error } = await supabase.functions.invoke("animate-avatar", {
        body: { 
          imageUrl: profile.avatar_url,
          userId: user.id
        },
      });

      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error || "Failed to start animation");

      // If completed immediately (unlikely)
      if (data.videoUrl) {
        await updateProfile({ animated_avatar_url: data.videoUrl });
        toast.success(t("avatar.avatarAnimated"), { duration: 5000 });
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#A855F7", "#EC4899", "#3B82F6"],
        });
        setIsAnimating(false);
        return;
      }

      // Get polling info
      const requestId = data.requestId;
      const statusUrl = data.statusUrl;
      const responseUrl = data.responseUrl;
      
      if (!requestId || !statusUrl || !responseUrl) {
        throw new Error("No request ID or URLs received");
      }

      toast.info(t("avatar.animationStarted"), { duration: 3000 });

      // Poll every 5 seconds for up to 3 minutes (36 attempts)
      const maxAttempts = 36;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 5000));

        const { data: statusData, error: statusError } = await supabase.functions.invoke("animate-avatar", {
          body: { 
            requestId,
            statusUrl,
            responseUrl,
            userId: user.id
          },
        });

        if (statusError) {
          console.error("Status check error:", statusError);
          continue;
        }

        if (statusData?.success && statusData?.videoUrl) {
          toast.success(t("avatar.avatarAnimated"), { duration: 5000 });
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#A855F7", "#EC4899", "#3B82F6"],
          });
          // Profile is updated by the edge function, trigger a refresh
          window.location.reload();
          return;
        }

        // Show progress every 15 seconds (every 3rd attempt)
        if ((attempt + 1) % 3 === 0) {
          toast.info(t("avatar.stillProcessing", { time: Math.round((attempt + 1) * 5 / 60) }), { duration: 2000 });
        }
      }

      toast.error(t("avatar.animationTakingLong"));

    } catch (error) {
      console.error("Error animating avatar:", error);
      toast.error(error instanceof Error ? error.message : "Failed to animate avatar");
    } finally {
      setIsAnimating(false);
    }
  };

  // Content based on step
  const renderContent = () => {
    if (step === "gallery") {
      return (
        <div className="space-y-4">
          {/* Current Avatar */}
          <div className="flex flex-col items-center">
            <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-primary/30 mb-2">
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt="Current avatar" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <ImageIcon className="w-10 h-10 text-muted-foreground" />
                </div>
              )}
              {profile?.animated_avatar_url && (
                <div className="absolute top-0 right-0 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-background">
                  <Play className="w-2.5 h-2.5 text-primary-foreground" fill="currentColor" />
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{t("avatar.currentAvatar")}</p>
            
            {/* Animate Avatar Button */}
            {profile?.avatar_url && (
              <motion.button
                onClick={animateAvatar}
                disabled={isAnimating}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 text-xs font-medium text-primary hover:from-primary/30 hover:to-accent/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isAnimating ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>{t("avatar.animating")}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    <span>{profile?.animated_avatar_url ? t("avatar.reAnimate") : t("avatar.animateAvatar")}</span>
                  </>
                )}
              </motion.button>
            )}
          </div>

          {/* My Generated Avatars */}
          {generations.length > 0 && (
            <div>
              <p className="text-sm font-medium text-foreground mb-2">{t("avatar.myAvatars")}</p>
              <div className="grid grid-cols-5 gap-2">
                {generations.slice(0, 10).map((gen) => (
                  <motion.button
                    key={gen.id}
                    onClick={() => selectPreviousAvatar(gen.avatar_url)}
                    disabled={isLoading}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      gen.is_current ? "border-primary" : "border-border hover:border-primary/50"
                    } disabled:opacity-50`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <img 
                      src={gen.avatar_url} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                    {gen.is_current && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary" />
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Default Avatars */}
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t("avatar.defaultAvatars")}</p>
            <div className="grid grid-cols-5 gap-2">
              {DEFAULT_AVATARS.map((avatar, index) => {
                const isSelected = profile?.avatar_url === avatar;
                return (
                  <motion.button
                    key={index}
                    onClick={() => selectDefaultAvatar(avatar)}
                    disabled={isLoading}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      isSelected ? "border-amber-500" : "border-border hover:border-amber-400/50"
                    } disabled:opacity-50`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <img 
                      src={avatar} 
                      alt={`Default avatar ${index + 1}`} 
                      className="w-full h-full object-cover"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                        <Check className="w-4 h-4 text-amber-500" />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Generate New Section */}
          <div className="pt-2">
            <p className="text-sm font-medium text-foreground mb-2">{t("avatar.createNew")}</p>
            <div className="flex gap-3">
              <motion.button
                onClick={startCamera}
                className="flex-1 aspect-square max-w-[100px] rounded-2xl border-2 border-dashed border-primary/30 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Camera className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">{t("avatar.takeSelfie")}</span>
              </motion.button>

              <motion.button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 aspect-square max-w-[100px] rounded-2xl border-2 border-dashed border-primary/30 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">{t("avatar.uploadPhoto")}</span>
              </motion.button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      );
    }

    if (step === "upload" && uploadedImage) {
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/30">
            <img src={uploadedImage} alt="Uploaded" className="w-full h-full object-cover" />
          </div>
          
          <p className="text-sm text-muted-foreground text-center">
            {t("avatar.description")}
          </p>

          <div className="flex gap-2 w-full">
            <ChunkyButton
              variant="secondary"
              size="md"
              onClick={() => {
                setUploadedImage(null);
                setStep("gallery");
              }}
              className="flex-1"
              icon={<RefreshCw className="w-4 h-4" />}
            >
              {t("avatar.change")}
            </ChunkyButton>
            <ChunkyButton
              variant="primary"
              size="md"
              onClick={generateAvatar}
              className="flex-1"
              icon={<Wand2 className="w-4 h-4" />}
            >
              {t("avatar.generate")}
            </ChunkyButton>
          </div>
        </div>
      );
    }

    if (step === "camera") {
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-primary/30">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
            {!isCameraReady && (
              <div className="absolute inset-0 bg-muted flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex gap-2 w-full">
            <ChunkyButton
              variant="secondary"
              size="md"
              onClick={() => {
                stopCamera();
                setStep("gallery");
              }}
              className="flex-1"
            >
              {t("common.cancel")}
            </ChunkyButton>
            <ChunkyButton
              variant="primary"
              size="md"
              onClick={capturePhoto}
              disabled={!isCameraReady}
              className="flex-1"
              icon={<Camera className="w-4 h-4" />}
            >
              {t("avatar.capture")}
            </ChunkyButton>
          </div>
        </div>
      );
    }

    if (step === "generating") {
      return (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="relative">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/20 opacity-50">
              <img src={uploadedImage || ""} alt="Uploading" className="w-full h-full object-cover" />
            </div>
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">{t("avatar.generating")}</p>
            <p className="text-sm text-muted-foreground">{t("avatar.generatingTime")}</p>
          </div>
          <motion.div className="flex gap-1">
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
      );
    }

    if (step === "preview" && generatedAvatar) {
      return (
        <div className="flex flex-col items-center gap-4">
          <motion.div 
            className="w-36 h-36 rounded-full overflow-hidden border-4 border-primary shadow-lg"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <img src={generatedAvatar} alt="Generated Avatar" className="w-full h-full object-cover" />
          </motion.div>
          <p className="text-sm text-muted-foreground text-center">{t("avatar.avatarReady")}</p>
          <div className="flex gap-2 w-full">
            <ChunkyButton
              variant="secondary"
              size="md"
              onClick={() => {
                setStep("gallery");
                setGeneratedAvatar(null);
                setUploadedImage(null);
              }}
              disabled={isLoading}
              className="flex-1"
              icon={<RefreshCw className="w-4 h-4" />}
            >
              {t("avatar.regenerate")}
            </ChunkyButton>
            <ChunkyButton
              variant="success"
              size="md"
              onClick={() => saveAvatar()}
              disabled={isLoading}
              className="flex-1"
              icon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            >
              {t("avatar.useAsProfile")}
            </ChunkyButton>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      variant="primary"
      iconEmoji="🎨"
      title={t("avatar.title")}
      subtitle={t("avatar.subtitle")}
      showSparkles
    >
      {renderContent()}
    </GameModal>
  );
}
