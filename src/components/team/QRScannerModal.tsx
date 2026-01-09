import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ScanLine, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface QRScannerModalProps {
  open: boolean;
  onClose: () => void;
}

export function QRScannerModal({ open, onClose }: QRScannerModalProps) {
  const navigate = useNavigate();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (!open) return;

    let mounted = true;
    setError(null);
    setIsStarting(true);

    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
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
      onClose();
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm p-0 bg-background border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-primary" />
            <span className="font-medium">QR კოდის სკანერი</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Scanner Area */}
        <div className="relative aspect-square bg-black">
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
                კამერა იტვირთება...
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
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 text-center">
          <p className="text-xs text-muted-foreground">
            მიმართეთ კამერა QR კოდისკენ თამაშში შესაერთებლად
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
