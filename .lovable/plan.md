

# Plan: Improve QR Code Scanner with Zoom and Autofocus

## Current Problems

Based on the screenshot and code analysis:

1. **No zoom control** - Users can't zoom in to scan distant QR codes
2. **No torch/flashlight** - Difficult to scan in low-light conditions  
3. **Small scan area** - Fixed 250x250 qrbox may miss distant codes
4. **No autofocus optimization** - Default camera settings may not optimize for close-up scanning

---

## Solution Overview

Enhance the QR scanner with:
- Zoom slider control for manual zoom adjustment
- Torch (flashlight) button for low-light conditions
- Auto-zoom capability for distant QR codes
- Optimized camera constraints for better focus
- Improved visual feedback

---

## Technical Implementation

### File: `src/components/team/QRScannerModal.tsx`

### Change 1: Add State for Zoom and Torch

Add new state variables and refs:

```tsx
const [zoomLevel, setZoomLevel] = useState<number>(1);
const [zoomCapability, setZoomCapability] = useState<{min: number; max: number; step: number} | null>(null);
const [torchEnabled, setTorchEnabled] = useState(false);
const [torchSupported, setTorchSupported] = useState(false);
```

### Change 2: Enhance Camera Initialization

Update the scanner configuration to:
- Use higher resolution for better detection
- Enable continuous autofocus via video constraints
- Capture zoom/torch capabilities after camera starts

```tsx
await scanner.start(
  { facingMode: "environment" },
  {
    fps: 15, // Increase FPS for faster detection
    qrbox: { width: 280, height: 280 }, // Slightly larger scan area
    aspectRatio: 1.0,
    videoConstraints: {
      facingMode: "environment",
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      advanced: [{ focusMode: "continuous" }] as any
    }
  },
  (decodedText) => { ... },
  () => { ... }
);

// After start, get camera capabilities
if (mounted) {
  try {
    const capabilities = scanner.getRunningTrackCameraCapabilities();
    const zoom = capabilities.zoomFeature();
    if (zoom.isSupported()) {
      setZoomCapability({ min: zoom.min(), max: zoom.max(), step: zoom.step() });
      setZoomLevel(zoom.value() || 1);
    }
    const torch = capabilities.torchFeature();
    setTorchSupported(torch.isSupported());
  } catch (e) {
    console.log("Camera capabilities not available");
  }
}
```

### Change 3: Add Zoom Control Function

```tsx
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
```

### Change 4: Add Torch Toggle Function

```tsx
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
```

### Change 5: Add UI Controls

Add controls below the viewfinder overlay:

```tsx
{/* Camera Controls */}
{!isStarting && !error && (
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
)}
```

### Change 6: Add Required Imports

```tsx
import { 
  ChevronLeft, 
  ScanLine, 
  AlertCircle, 
  Flashlight, // New
  ZoomIn,      // New
  ZoomOut      // New
} from "lucide-react";
import { cn } from "@/lib/utils"; // Add if not present
```

### Change 7: Update Footer Text

```tsx
<div className="flex-shrink-0 p-4 text-center bg-background border-t border-border/50">
  <p className="text-xs text-muted-foreground">
    მიმართეთ კამერა QR კოდისკენ • გამოიყენეთ ზუმი დაშორებული კოდებისთვის
  </p>
</div>
```

---

## Visual Design

```text
┌──────────────────────────────────────┐
│  ←  [📷] QR კოდის სკანერი            │
├──────────────────────────────────────┤
│                                      │
│                                      │
│      ┌────────────────────┐          │
│      │                    │          │
│      │     QR SCAN AREA   │          │
│      │   ─────────────    │          │
│      │                    │          │
│      └────────────────────┘          │
│                                      │
│              💡 (torch)              │
│                                      │
│  🔍─ ───────────────────── 🔎 2.5x   │  ← Zoom slider
│                                      │
├──────────────────────────────────────┤
│  მიმართეთ კამერა • გამოიყენეთ ზუმი  │
└──────────────────────────────────────┘
```

---

## Summary

| Feature | Implementation |
|---------|---------------|
| Zoom slider | Range input using `zoomFeature().apply()` |
| Torch/flashlight | Toggle button using `torchFeature().apply()` |
| Better autofocus | `focusMode: "continuous"` in video constraints |
| Higher resolution | Request 1920x1080 for sharper image |
| Larger scan area | Increase qrbox from 250 to 280 |
| Higher FPS | Increase from 10 to 15 for faster detection |

These changes will significantly improve the scanner's ability to detect QR codes at various distances and lighting conditions.

