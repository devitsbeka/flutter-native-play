import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Upload, Camera, Sparkles, Check, RefreshCw, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { t } from "@/lib/i18n";
import { useBackgroundGeneration } from "@/contexts/BackgroundGenerationContext";
import { preparePhoto } from "@/utils/imageInput";
import { photoErrorMessage } from "@/utils/photoErrorMessage";
import { isNativePhotoPickerAvailable, takePhotoWithCamera } from "@/utils/nativePhotoPicker";

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
  const [isProcessingFile, setIsProcessingFile] = useState(false);
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
    // Native takes the photo with the system camera. `getUserMedia` below is
    // the browser path only: inside a WKWebView it is gated behind app-bound
    // domains, so on a phone this step used to open onto a black rectangle.
    if (isNativePhotoPickerAvailable()) {
      try {
        const { dataUrl, cancelled } = await takePhotoWithCamera(1024);
        if (cancelled) return;
        if (!dataUrl) throw new Error("No photo returned");
        setUploadedImage(dataUrl);
        setStep("upload");
      } catch (error) {
        console.error("Native camera failed:", error);
        toast.error(t("errors.cameraPermission"));
      }
      return;
    }

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
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);

    try {
      // This copy had no HEIC handling at all, so every iPhone photo failed
      // here outside Safari. Both modals now share one decoder — see
      // imageInput.ts — which tries the browser first and transcodes second.
      const dataUrl = await preparePhoto(file, 1024, 0.85);
      setUploadedImage(dataUrl);
    } catch (error) {
      console.error("Error processing image:", error);
      toast.error(photoErrorMessage(error));
    } finally {
      // Cleared on EVERY exit: an input keeps its last value, and re-picking
      // the same file fires no change event — so one failed photo used to
      // leave the tile unresponsive to that photo with no way to tell.
      input.value = "";
      setIsProcessingFile(false);
    }
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
        className="fixed inset-0 safe-screen z-[100] bg-background flex flex-col"
      >
        {/* Fixed Header */}
        <div className="flex-shrink-0 sticky top-0 z-10 bg-background border-b border-border">
          <div className="flex items-center h-14 px-4">
            <motion.button
              onClick={handleClose}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronLeft className="w-6 h-6 text-foreground" />
            </motion.button>
            
            <h1 className="flex-1 text-center font-display text-lg font-bold text-foreground flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {t("avatar.aiTitle")}
            </h1>
            
            <div className="w-10" />
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
          {/* Show banner if generation is in progress */}
          {isCurrentlyGenerating && (
            <div className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-3 w-full max-w-sm">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">{t("avatar.generating")}</p>
                <p className="text-xs text-muted-foreground">{t("avatar.generatingBackgroundDesc")}</p>
              </div>
            </div>
          )}

          {step === "upload" && (
            <div className="space-y-6 w-full max-w-sm">
              <p className="text-sm text-muted-foreground text-center">
                {t("avatar.description")}
              </p>

              {/* Preview uploaded image */}
              {uploadedImage ? (
                <div className="flex flex-col items-center gap-6">
                  <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-primary/20">
                    <img
                      src={uploadedImage}
                      alt="Uploaded"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setUploadedImage(null)}
                      className="px-5 py-3 rounded-full bg-muted text-sm font-medium flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      {t("avatar.change")}
                    </button>
                    <button
                      onClick={generateAvatar}
                      disabled={isStarting}
                      className="px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2"
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
                <div className="flex gap-4 justify-center">
                  {/* Camera button */}
                  <button
                    onClick={startCamera}
                    className="flex-1 max-w-[160px] aspect-square rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-muted/30 transition-colors"
                  >
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <Camera className="w-7 h-7 text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {t("avatar.takeSelfie")}
                    </span>
                  </button>

                  {/* Upload button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessingFile}
                    className={`flex-1 max-w-[160px] aspect-square rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-muted/30 transition-colors ${isProcessingFile ? 'opacity-50' : ''}`}
                  >
                    {isProcessingFile ? (
                      <>
                        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                          <Loader2 className="w-7 h-7 text-primary animate-spin" />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {t("common.processing") || "Processing..."}
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                          <Upload className="w-7 h-7 text-primary" />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {t("avatar.uploadPhoto")}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                /* image/* alone — see AvatarModal: naming .heic here stops
                   iOS transcoding the photo to JPEG for us. */
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {step === "camera" && (
            <div className="flex flex-col items-center gap-6 w-full max-w-sm">
              <p className="text-sm text-muted-foreground text-center">
                {t("avatar.positionFace")}
              </p>

              {/* Camera viewfinder */}
              <div className="relative w-56 h-56 rounded-full overflow-hidden border-4 border-primary/30">
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

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    stopCamera();
                    setStep("upload");
                  }}
                  className="px-5 py-3 rounded-full bg-muted text-sm font-medium"
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
    </AnimatePresence>
  );
}
