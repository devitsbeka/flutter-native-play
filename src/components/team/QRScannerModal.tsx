import React, { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
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
              setError("კამერაზე წვდომა უარყოფილია. გთხოვთ დაუშვათ კამერა.");
            } else {
              setError("კამერის გახსნა ვერ მოხერხდა");
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
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [open]);

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

  const handleScan = (decodedText: string) => {
    // Stop scanner first
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }

    // Try to extract join code from URL
    let code: string | null = null;

    try {
      // Check if it's a URL
      if (decodedText.includes("/join")) {
        const url = new URL(decodedText);
        // Try query param first: /join?code=XXXXXX
        code = url.searchParams.get("code");
        
        // Try path format: /join/XXXXXX
        if (!code) {
          const pathMatch = url.pathname.match(/\/join\/([A-Z0-9]+)/i);
          if (pathMatch) {
            code = pathMatch[1];
          }
        }
      } else if (/^[A-Z0-9]{4,8}$/i.test(decodedText.trim())) {
        // Plain code format
        code = decodedText.trim().toUpperCase();
      }
    } catch {
      // Not a valid URL, check if it's a plain code
      if (/^[A-Z0-9]{4,8}$/i.test(decodedText.trim())) {
        code = decodedText.trim().toUpperCase();
      }
    }

    if (code) {
      toast.success("კოდი ნაპოვნია!", { description: code });
      handleClose();
      navigate(`/join?code=${code}`);
    } else {
      toast.error("არასწორი QR კოდი", {
        description: "ეს QR კოდი არ შეიცავს თამაშის კოდს",
      });
      // Restart scanner after error
      if (open) {
        const timer = setTimeout(() => {
          if (scannerRef.current === null && open) {
            // Re-trigger effect by closing and opening
          }
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  };

  const handleClose = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
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
          className="fixed inset-0 z-50 bg-background flex flex-col"
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
              <h2 className="text-lg font-bold text-foreground">QR კოდის სკანერი</h2>
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
                    დახურვა
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
              მიმართეთ კამერა QR კოდისკენ • გამოიყენეთ ზუმი დაშორებული კოდებისთვის
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
