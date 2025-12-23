import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Save, RotateCcw, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLevelPositions, saveLevelPositions, LevelPosition } from "@/hooks/useLevelPositions";
import islandBackground from "@/assets/map/island-background.svg";
import levelLocked from "@/assets/map/level-locked.svg";
import levelCurrent from "@/assets/map/level-current.svg";

export default function AdventureMapAdmin() {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const { positions: savedPositions, loading, defaultPositions } = useLevelPositions();
  
  const [positions, setPositions] = useState<LevelPosition[]>([]);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Initialize positions when loaded
  useState(() => {
    if (!loading && positions.length === 0) {
      setPositions(savedPositions);
    }
  });

  // Update positions when saved positions load
  if (!loading && positions.length === 0 && savedPositions.length > 0) {
    setPositions(savedPositions);
  }

  const handleMouseDown = useCallback((e: React.MouseEvent, levelId: number) => {
    e.preventDefault();
    setDraggingId(levelId);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingId === null || !mapRef.current) return;

    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Clamp values between 0 and 100
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));

    setPositions((prev) =>
      prev.map((pos) =>
        pos.id === draggingId
          ? { ...pos, x: Math.round(clampedX * 10) / 10, y: Math.round(clampedY * 10) / 10 }
          : pos
      )
    );
  }, [draggingId]);

  const handleMouseUp = useCallback(() => {
    setDraggingId(null);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent, levelId: number) => {
    e.preventDefault();
    setDraggingId(levelId);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (draggingId === null || !mapRef.current) return;

    const touch = e.touches[0];
    const rect = mapRef.current.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));

    setPositions((prev) =>
      prev.map((pos) =>
        pos.id === draggingId
          ? { ...pos, x: Math.round(clampedX * 10) / 10, y: Math.round(clampedY * 10) / 10 }
          : pos
      )
    );
  }, [draggingId]);

  const handleTouchEnd = useCallback(() => {
    setDraggingId(null);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveLevelPositions(positions);
      toast.success("Level positions saved successfully!");
    } catch (error) {
      toast.error("Failed to save positions");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPositions(defaultPositions);
    toast.info("Positions reset to defaults");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-sky-400">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-sky-400 select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-background/90 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <h1 className="text-lg font-bold text-foreground">Level Position Editor</h1>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="gap-1"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="gap-1"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute top-16 left-4 right-4 z-40 text-center py-2 px-4 bg-amber-500/90 rounded-lg text-white text-sm">
        <Move className="inline h-4 w-4 mr-2" />
        Drag level nodes to reposition them. Changes apply to all users.
      </div>

      {/* Map container */}
      <div className="absolute inset-0 pt-28 overflow-auto">
        <div 
          ref={mapRef}
          className="relative w-full"
          style={{ minHeight: "100%" }}
        >
          <img
            src={islandBackground}
            alt="Island Map"
            className="w-full h-auto block"
            draggable={false}
          />
          
          {/* Draggable level nodes */}
          <div className="absolute inset-0">
            {positions.map((pos) => (
              <motion.div
                key={pos.id}
                className={`absolute cursor-grab active:cursor-grabbing ${
                  draggingId === pos.id ? "z-50" : "z-10"
                }`}
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: "translate(-50%, -50%)",
                }}
                whileTap={{ scale: 1.1 }}
                onMouseDown={(e) => handleMouseDown(e, pos.id)}
                onTouchStart={(e) => handleTouchStart(e, pos.id)}
              >
                {/* Node image */}
                <img 
                  src={pos.id === 1 ? levelCurrent : levelLocked}
                  alt={`Level ${pos.id}`}
                  className="w-12 h-12 pointer-events-none"
                  draggable={false}
                />
                
                {/* Level number */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-xs font-bold text-amber-900 -mt-1">
                    {pos.id}
                  </span>
                </div>
                
                {/* Position indicator */}
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-foreground/80 text-background text-xs px-2 py-0.5 rounded">
                  {pos.x.toFixed(1)}%, {pos.y.toFixed(1)}%
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
