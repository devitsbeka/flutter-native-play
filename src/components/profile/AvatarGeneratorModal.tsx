import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Camera, Sparkles, Check, RefreshCw, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import { useBackgroundGeneration } from "@/contexts/BackgroundGenerationContext";

interface AvatarGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AvatarGeneratorModal({ isOpen, onClose }: AvatarGeneratorModalProps) {
  const { user } = useAuth();
  const { startAvatarGeneration, isGenerating } = useBackgroundGeneration();
  const [step, setStep] = useState<"upload" | "camera">("upload");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup camera stream
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

  // Capture photo from camera
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) return;

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw mirrored image (selfie mode)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    // Convert to base64
    const imageData = canvas.toDataURL("image/jpeg", 0.9);
    setUploadedImage(imageData);
    
    // Stop camera and go back to upload step with preview
    stopCamera();
    setStep("upload");
  }, [stopCamera]);

  // Cleanup on unmount or close
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Stop camera when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
  }, [isOpen, stopCamera]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error(t("errors.selectImageFile"));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("errors.imageTooLarge"));
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

    setIsStarting(true);

    try {
      // Start background generation - modal can be closed
      await startAvatarGeneration(uploadedImage, () => {
        // This will be called when generation completes and user applies
        // Could refresh profile or trigger other updates
      });

      // Close modal immediately - generation continues in background
      handleClose();
      
    } catch (error) {
      console.error("Error starting avatar generation:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start generation");
    } finally {
      setIsStarting(false);
    }
  };

  const resetState = () => {
    setStep("upload");
    setUploadedImage(null);
    setIsStarting(false);
    stopCamera();
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  if (!isOpen) return null;

  const isCurrentlyGenerating = isGenerating("avatar");

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
              <h2 className="font-display text-lg font-bold">{t("avatar.aiTitle")}</h2>
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
            {/* Show banner if generation is in progress */}
            {isCurrentlyGenerating && (
              <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">{t("avatar.generating")}</p>
                  <p className="text-xs text-muted-foreground">{t("avatar.generatingBackgroundDesc")}</p>
                </div>
              </div>
            )}

            {step === "upload" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  {t("avatar.description")}
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
                        onClick={() => setUploadedImage(null)}
                        className="px-4 py-2 rounded-full bg-muted text-sm font-medium flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        {t("avatar.change")}
                      </button>
                      <button
                        onClick={generateAvatar}
                        disabled={isStarting}
                        className="px-6 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2"
                      >
                        {isStarting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        {t("avatar.generate")}
                      </button>
                    </div>
                    {/* Hint that modal can be closed */}
                    <p className="text-xs text-muted-foreground text-center">
                      {t("avatar.canCloseHint")}
                    </p>
                  </div>
                ) : (
                  <div className="flex gap-3 justify-center">
                    {/* Camera button */}
                    <button
                      onClick={startCamera}
                      className="flex-1 max-w-[140px] aspect-square rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-muted/30 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Camera className="w-6 h-6 text-primary" />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {t("avatar.takeSelfie")}
                      </span>
                    </button>

                    {/* Upload button */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 max-w-[140px] aspect-square rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-muted/30 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Upload className="w-6 h-6 text-primary" />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {t("avatar.uploadPhoto")}
                      </span>
                    </button>
                  </div>
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

            {step === "camera" && (
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm text-muted-foreground text-center">
                  {t("avatar.positionFace")}
                </p>

                {/* Camera viewfinder */}
                <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-primary/30">
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

                {/* Hidden canvas for capture */}
                <canvas ref={canvasRef} className="hidden" />

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      stopCamera();
                      setStep("upload");
                    }}
                    className="px-4 py-2 rounded-full bg-muted text-sm font-medium"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    onClick={capturePhoto}
                    disabled={!isCameraReady}
                    className="px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" />
                    {t("avatar.capture")}
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
