import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { joinCodeFromQr } from "@/utils/joinCodeFromQr";
import { ChevronLeft, ScanLine, AlertCircle, Flashlight, ZoomIn, ZoomOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QRScannerModalProps {
  open: boolean;
  onClose: () => void;
}

export function QRScannerModal({ open, onClose }: QRScannerModalProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [zoomCapability, setZoomCapability] = useState<{min: number; max: number; step: number} | null>(null);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  // The decode callback fires on every frame, so a QR that is not a game code
  // would otherwise raise fifteen toasts a second for as long as it is held up.
  const lastRejectionRef = useRef(0);

  /**
   * Stop the camera, whatever state it is in.
   *
   * Html5Qrcode.stop() *throws* — synchronously, and a string rather than an
   * Error — when the scanner is not currently scanning:
   *
   *   if (!this.stateManagerProxy.isScanning()) {
   *     throw "Cannot stop, scanner is not running or paused.";
   *   }
   *
   * Every call site here used `.stop().catch(() => {})`, which catches a
   * rejected promise and does nothing at all for a synchronous throw. So when
   * the camera had failed to start — permission refused, no camera, or simply
   * still starting — the throw escaped:
   *
   *   · from the back button's handler, before it could call onClose, so the
   *     screen would not close;
   *   · from the effect's cleanup on unmount, which is why leaving via the
   *     home button produced "დაფიქსირდა შეცდომა" instead of the home page.
   *
   * Both reports, one cause. The ref is cleared first so a second call is a
   * no-op even if this one throws.
   */
  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      await scanner.stop();
    } catch {
      // Was not running. Nothing to stop, and nothing worth reporting.
    }
    try {
      scanner.clear();
    } catch {
      // Nothing rendered to clear.
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    let mounted = true;
    setError(null);
    setIsStarting(true);
    setZoomCapability(null);
    setTorchSupported(false);
    setTorchEnabled(false);
    setZoomLevel(1);

    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: { width: 280, height: 280 },
            aspectRatio: 1.0,
            videoConstraints: {
              facingMode: "environment",
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              advanced: [{ focusMode: "continuous" }] as any
            }
          },
          (decodedText) => {
            if (!mounted) return;
            handleScan(decodedText);
          },
          () => {
            // Ignore scan errors (no QR found in frame)
          }
        );

        if (mounted) {
          setIsStarting(false);
          
          // Get camera capabilities after start
          try {
            const capabilities = scanner.getRunningTrackCameraCapabilities();
            const zoom = capabilities.zoomFeature();
            if (zoom.isSupported()) {
              setZoomCapability({ 
                min: zoom.min(), 
                max: zoom.max(), 
                step: zoom.step() 
              });
              setZoomLevel(zoom.value() || 1);
            }
            const torch = capabilities.torchFeature();
            setTorchSupported(torch.isSupported());
          } catch (e) {
            console.log("Camera capabilities not available");
          }
        }
      } catch (err) {
        console.error("QR Scanner error:", err);
        if (mounted) {
          setIsStarting(false);
          if (err instanceof Error) {
            if (err.message.includes("Permission")) {
              setError(t("extra.cameraPermissionDenied"));
            } else {
              setError(t("extra.cameraOpenFailed"));
            }
          }
        }
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(startScanner, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
      void stopScanner();
    };
  }, [open, stopScanner]);

  const handleZoomChange = async (value: number) => {
    if (scannerRef.current && zoomCapability) {
      try {
        const capabilities = scannerRef.current.getRunningTrackCameraCapabilities();
        const zoom = capabilities.zoomFeature();
        await zoom.apply(value);
        setZoomLevel(value);
      } catch (e) {
        console.error("Failed to apply zoom:", e);
      }
    }
  };

  const toggleTorch = async () => {
    if (scannerRef.current && torchSupported) {
      try {
        const capabilities = scannerRef.current.getRunningTrackCameraCapabilities();
        const torch = capabilities.torchFeature();
        const newValue = !torchEnabled;
        await torch.apply(newValue);
        setTorchEnabled(newValue);
      } catch (e) {
        console.error("Failed to toggle torch:", e);
      }
    }
  };

  const handleScan = async (decodedText: string) => {
    const code = joinCodeFromQr(decodedText);

    if (!code) {
      // Keep scanning. This used to stop the camera and then try to restart
      // it by returning a cleanup function from a plain callback — which is
      // not an effect, so nothing ever ran it. One poster on a wall and the
      // scanner was dead until you left the screen and came back.
      const now = Date.now();
      if (now - lastRejectionRef.current < 2000) return;
      lastRejectionRef.current = now;
      toast.error(t("extra.invalidQrCode"), {
        description: t("extra.qrNoGameCode"),
      });
      return;
    }

    await stopScanner();
    toast.success(t("extra.codeFound"), { description: code });
    onClose();
    navigate(`/join?code=${code}`);
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          /* Above the bottom navigation, which sits at z-[60] and z-[70]. At
             z-50 the tab bar floated over a full-screen camera view: the home
             button was on top of the viewfinder and reachable while scanning,
             which is how leaving this screen mid-scan was discovered at all. */
          className="fixed inset-0 z-[100] bg-background flex flex-col"
        >
          {/* Fixed Header */}
          <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-background/95 backdrop-blur-sm">
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <ScanLine className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground">{t("extra.qrScannerTitle")}</h2>
            </div>
          </div>

          {/* Scanner Area */}
          <div className="flex-1 flex flex-col">
            <div className="relative flex-1 bg-black">
              <div id="qr-reader" className="w-full h-full" />

              {/* Loading overlay */}
              {isStarting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <ScanLine className="w-12 h-12 text-primary" />
                  </motion.div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    {t("extra.cameraLoading")}
                  </p>
                </div>
              )}

              {/* Error overlay */}
              {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-6">
                  <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                  <p className="text-center text-sm text-muted-foreground">
                    {error}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={handleClose}
                  >
                    {t("extra.closeBtn")}
                  </Button>
                </div>
              )}

              {/* Viewfinder overlay */}
              {!isStarting && !error && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* Corner brackets */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64">
                    {/* Top-left corner */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl-lg" />
                    {/* Top-right corner */}
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-lg" />
                    {/* Bottom-left corner */}
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-lg" />
                    {/* Bottom-right corner */}
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br-lg" />
                    
                    {/* Scanning line animation */}
                    <motion.div
                      className="absolute left-2 right-2 h-0.5 bg-primary/60"
                      animate={{ top: ["10%", "90%", "10%"] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </div>

                {/* Camera Controls */}
                <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-3">
                  {/* Torch Button */}
                  {torchSupported && (
                    <button
                      onClick={toggleTorch}
                      className={cn(
                        "mx-auto w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                        torchEnabled 
                          ? "bg-yellow-500 text-black" 
                          : "bg-white/20 text-white hover:bg-white/30"
                      )}
                    >
                      <Flashlight className="w-6 h-6" />
                    </button>
                  )}
                  
                  {/* Zoom Slider */}
                  {zoomCapability && (
                    <div className="bg-black/60 rounded-full px-4 py-2 flex items-center gap-3">
                      <ZoomOut className="w-4 h-4 text-white/70" />
                      <input
                        type="range"
                        min={zoomCapability.min}
                        max={zoomCapability.max}
                        step={zoomCapability.step}
                        value={zoomLevel}
                        onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                        className="flex-1 h-1 bg-white/30 rounded-full appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none
                          [&::-webkit-slider-thumb]:w-5
                          [&::-webkit-slider-thumb]:h-5
                          [&::-webkit-slider-thumb]:rounded-full
                          [&::-webkit-slider-thumb]:bg-primary"
                      />
                      <ZoomIn className="w-4 h-4 text-white/70" />
                      <span className="text-white/70 text-xs w-8">{zoomLevel.toFixed(1)}x</span>
                    </div>
                  )}
                </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 p-4 text-center bg-background border-t border-border/50">
              <p className="text-xs text-muted-foreground">
              {t("extra.qrFooterHint")}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
