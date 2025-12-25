import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, X, ArrowLeft, Loader2, Check, RefreshCw, Sparkles, Image as ImageIcon } from "lucide-react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { t } from "@/lib/i18n";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { toast } from "sonner";
import confetti from "canvas-confetti";

// Confetti celebration for avatar completion
const celebrateAvatarConfetti = () => {
  const end = Date.now() + 1000;
  const colors = ["#A855F7", "#8B5CF6", "#FFD700", "#22C55E"];

  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors: colors,
      zIndex: 9999,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors: colors,
      zIndex: 9999,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
};

// Shimmer effect component
const ShimmerOverlay = () => (
  <motion.div
    className="absolute inset-0 overflow-hidden"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
  >
    <motion.div
      className="absolute inset-0"
      style={{
        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
      }}
      animate={{
        x: ["-100%", "200%"],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  </motion.div>
);

// Sparkle particle for loading state
const LoadingSparkle = ({ index }: { index: number }) => {
  const angle = (360 / 8) * index;
  const radius = 80;
  
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-full"
      style={{
        background: "radial-gradient(circle, #A855F7 0%, transparent 70%)",
        boxShadow: "0 0 10px #A855F7",
      }}
      animate={{
        x: [
          Math.cos((angle * Math.PI) / 180) * radius,
          Math.cos(((angle + 45) * Math.PI) / 180) * (radius + 10),
          Math.cos(((angle + 90) * Math.PI) / 180) * radius,
        ],
        y: [
          Math.sin((angle * Math.PI) / 180) * radius,
          Math.sin(((angle + 45) * Math.PI) / 180) * (radius + 10),
          Math.sin(((angle + 90) * Math.PI) / 180) * radius,
        ],
        opacity: [0.3, 1, 0.3],
        scale: [0.8, 1.2, 0.8],
      }}
      transition={{
        duration: 2,
        delay: index * 0.1,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
};

// Progress messages during generation
const progressMessages = [
  { key: "generatingStep1", emoji: "📤" },
  { key: "generatingStep2", emoji: "🎨" },
  { key: "generatingStep3", emoji: "✂️" },
  { key: "generatingStep4", emoji: "✨" },
];

export function AvatarCreationFlow() {
  const { 
    step, 
    setStep, 
    uploadedImage, 
    setUploadedImage,
    generatedAvatar,
    setGeneratedAvatar,
  } = useOnboarding();
  
  const { user, updateProfile } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const isOpen = step === "avatar-upload" || step === "avatar-camera" || step === "avatar-generating" || step === "avatar-preview";
  
  // Progress animation during generation
  useEffect(() => {
    if (step === "avatar-generating") {
      const interval = setInterval(() => {
        setProgressIndex((prev) => (prev + 1) % progressMessages.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [step]);
  
  // Cleanup camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraReady(false);
  }, []);
  
  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setStep("avatar-camera");
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
      toast.error(t("errors.cameraAccess"));
      setStep("avatar-upload");
    }
  }, [setStep]);
  
  // Capture photo
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Mirror for selfie
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL("image/jpeg", 0.9);
    setUploadedImage(imageData);
    
    stopCamera();
    setStep("avatar-upload");
  }, [stopCamera, setUploadedImage, setStep]);
  
  // Handle file select
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      toast.error("გთხოვთ აირჩიოთ სურათი");
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error("სურათი 5MB-ზე ნაკლები უნდა იყოს");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  // Generate avatar
  const generateAvatar = async () => {
    if (!uploadedImage || !user) return;
    
    setIsLoading(true);
    setStep("avatar-generating");
    setProgressIndex(0);
    
    try {
      // Upload image to storage
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
      
      if (uploadError) throw new Error(uploadError.message);
      
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);
      
      // Call edge function
      const { data, error } = await supabase.functions.invoke("generate-avatar", {
        body: { imageUrl: urlData.publicUrl },
      });
      
      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error);
      
      setGeneratedAvatar(data.avatarUrl);
      setStep("avatar-preview");
      toast.success(t("onboarding.avatarReady"));
      
    } catch (error: any) {
      console.error("Avatar generation error:", error);
      toast.error(error.message || t("errors.generationFailed"));
      setStep("avatar-upload");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Save avatar
  const saveAvatar = async () => {
    if (!generatedAvatar || !user) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch(generatedAvatar);
      const blob = await response.blob();
      
      const fileName = `${user.id}/avatar_${Date.now()}.png`;
      
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, blob, { upsert: true, contentType: "image/png" });
      
      if (uploadError) throw new Error(uploadError.message);
      
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);
      
      await updateProfile({ avatar_url: urlData.publicUrl });
      
      // Celebrate with confetti!
      celebrateAvatarConfetti();
      
      toast.success(t("success.avatarSaved"));
      setStep("walkthrough");
      
    } catch (error: any) {
      console.error("Save avatar error:", error);
      toast.error(error.message || t("errors.generic"));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative w-full max-w-sm overflow-hidden rounded-3xl"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,240,255,0.98) 100%)",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
          }}
        >
          {/* Header */}
          <div className="relative p-4 border-b border-border/50">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="font-display text-lg font-bold">{t("onboarding.createAvatar")}</h2>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              {/* Upload Step */}
              {step === "avatar-upload" && (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col items-center"
                >
                  <p className="text-sm text-muted-foreground text-center mb-6">
                    {t("onboarding.avatarSubtitle")}
                  </p>
                  
                  {/* Preview if image uploaded */}
                  {uploadedImage ? (
                    <div className="flex flex-col items-center gap-4 mb-6">
                      <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-primary/20 shadow-lg">
                        <img src={uploadedImage} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                      
                      <div className="flex gap-3">
                        <ChunkyButton
                          variant="ghost"
                          size="sm"
                          onClick={() => setUploadedImage(null)}
                          icon={<RefreshCw className="w-4 h-4" />}
                        >
                          შეცვლა
                        </ChunkyButton>
                        <ChunkyButton
                          variant="primary"
                          size="sm"
                          onClick={generateAvatar}
                          icon={<Sparkles className="w-4 h-4" />}
                        >
                          გენერაცია
                        </ChunkyButton>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4 mb-6">
                      {/* Camera button */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={startCamera}
                        className="flex-1 aspect-square max-w-[140px] rounded-3xl border-3 border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center gap-3 transition-colors hover:bg-primary/10 hover:border-primary/50"
                        style={{
                          boxShadow: "inset 0 2px 8px rgba(168,85,247,0.1)",
                        }}
                      >
                        <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                          <Camera className="w-7 h-7 text-primary" />
                        </div>
                        <span className="text-sm font-semibold text-primary">
                          {t("onboarding.takePhoto")}
                        </span>
                      </motion.button>
                      
                      {/* Upload button */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 aspect-square max-w-[140px] rounded-3xl border-3 border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center gap-3 transition-colors hover:bg-primary/10 hover:border-primary/50"
                        style={{
                          boxShadow: "inset 0 2px 8px rgba(168,85,247,0.1)",
                        }}
                      >
                        <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                          <ImageIcon className="w-7 h-7 text-primary" />
                        </div>
                        <span className="text-sm font-semibold text-primary">
                          {t("onboarding.chooseFromLibrary")}
                        </span>
                      </motion.button>
                    </div>
                  )}
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </motion.div>
              )}
              
              {/* Camera Step */}
              {step === "avatar-camera" && (
                <motion.div
                  key="camera"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col items-center"
                >
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    {t("onboarding.positionFace")}
                  </p>
                  
                  {/* Camera viewfinder with silhouette */}
                  <div className="relative w-56 h-56 rounded-full overflow-hidden mb-6">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                    
                    {/* Silhouette overlay */}
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      viewBox="0 0 100 100"
                    >
                      {/* Outer dark ring */}
                      <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(168,85,247,0.5)" strokeWidth="4" />
                      
                      {/* Head/shoulders guide (dotted) */}
                      <ellipse 
                        cx="50" cy="38" rx="20" ry="24" 
                        fill="none" 
                        stroke="rgba(168,85,247,0.4)" 
                        strokeWidth="1.5" 
                        strokeDasharray="4,3"
                      />
                      <path 
                        d="M30,75 Q30,55 50,55 Q70,55 70,75" 
                        fill="none" 
                        stroke="rgba(168,85,247,0.4)" 
                        strokeWidth="1.5"
                        strokeDasharray="4,3"
                      />
                    </svg>
                    
                    {!isCameraReady && (
                      <div className="absolute inset-0 bg-muted flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                  
                  <canvas ref={canvasRef} className="hidden" />
                  
                  <div className="flex gap-3">
                    <ChunkyButton
                      variant="ghost"
                      size="md"
                      onClick={() => {
                        stopCamera();
                        setStep("avatar-upload");
                      }}
                    >
                      {t("common.cancel")}
                    </ChunkyButton>
                    <ChunkyButton
                      variant="primary"
                      size="md"
                      onClick={capturePhoto}
                      disabled={!isCameraReady}
                      icon={<Camera className="w-5 h-5" />}
                    >
                      {t("onboarding.capture")}
                    </ChunkyButton>
                  </div>
                </motion.div>
              )}
              
              {/* Generating Step */}
              {step === "avatar-generating" && (
                <motion.div
                  key="generating"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center py-8"
                >
                  {/* Animated avatar preview with shimmer */}
                  <div className="relative mb-8">
                    <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-primary/30">
                      <div className="relative w-full h-full">
                        <img
                          src={uploadedImage || ""}
                          alt="Processing"
                          className="w-full h-full object-cover opacity-70"
                        />
                        <ShimmerOverlay />
                      </div>
                    </div>
                    
                    {/* Orbiting sparkles */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <LoadingSparkle key={i} index={i} />
                      ))}
                    </div>
                    
                    {/* Spinning ring */}
                    <motion.div
                      className="absolute inset-[-8px] rounded-full border-4 border-transparent border-t-primary"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                  
                  <h3 className="font-display text-xl font-bold text-foreground mb-2">
                    {t("onboarding.generatingTitle")}
                  </h3>
                  
                  <motion.div
                    key={progressIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-muted-foreground"
                  >
                    <span className="text-xl">{progressMessages[progressIndex].emoji}</span>
                    <span>{t(`onboarding.${progressMessages[progressIndex].key}`)}</span>
                  </motion.div>
                </motion.div>
              )}
              
              {/* Preview Step */}
              {step === "avatar-preview" && generatedAvatar && (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center"
                >
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="relative mb-6"
                  >
                    <div className="w-44 h-44 rounded-full overflow-hidden border-4 border-primary shadow-xl">
                      <img
                        src={generatedAvatar}
                        alt="Generated Avatar"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {/* Success checkmark */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3, type: "spring" }}
                      className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-success flex items-center justify-center shadow-lg"
                    >
                      <Check className="w-6 h-6 text-white" />
                    </motion.div>
                  </motion.div>
                  
                  <h3 className="font-display text-xl font-bold text-foreground mb-6">
                    {t("onboarding.avatarReady")}
                  </h3>
                  
                  <div className="flex gap-3 w-full">
                    <ChunkyButton
                      variant="ghost"
                      size="md"
                      onClick={() => {
                        setGeneratedAvatar(null);
                        setStep("avatar-upload");
                      }}
                      disabled={isLoading}
                      icon={<RefreshCw className="w-4 h-4" />}
                      className="flex-1"
                    >
                      {t("onboarding.regenerate")}
                    </ChunkyButton>
                    <ChunkyButton
                      variant="primary"
                      size="md"
                      onClick={saveAvatar}
                      disabled={isLoading}
                      icon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      className="flex-1"
                    >
                      {t("onboarding.useThis")}
                    </ChunkyButton>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
