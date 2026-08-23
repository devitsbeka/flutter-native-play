import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { useLevelPositions, saveLevelPositions, LevelPosition } from "@/hooks/useLevelPositions";
import SVGClouds from "@/components/map/SVGClouds";

import islandBackground from "@/assets/map/island-background.svg";
import levelLocked from "@/assets/map/level-locked.svg";
import levelCurrent from "@/assets/map/level-current.svg";

export default function AdventureMapAdmin() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const { positions: savedPositions, loading, defaultPositions } = useLevelPositions();
  
  const [positions, setPositions] = useState<LevelPosition[]>([]);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Initialize positions when loaded
  useEffect(() => {
    if (!loading && savedPositions.length > 0 && positions.length === 0) {
      setPositions(savedPositions);
    }
  }, [loading, savedPositions, positions.length]);

  const handleMouseDown = useCallback((e: React.MouseEvent, levelId: number) => {
    e.preventDefault();
    setDraggingId(levelId);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingId === null || !mapRef.current) return;

    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

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
      toast.success("Positions saved!");
    } catch (error) {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
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
      className="fixed inset-0 safe-screen overflow-hidden bg-sky-400 select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchEnd={handleTouchEnd}
    >
      {/* SVG Clouds overlay - same as adventure map */}
      <SVGClouds className="z-[15]" />

      {/* CSS Animated Clouds - bottom 20% - same as adventure map */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none overflow-hidden" style={{ height: '20%' }}>
        <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-white/40 to-transparent" />
        <motion.div
          className="absolute bottom-0 left-0 w-48 h-24"
          animate={{ x: ['-100%', '100vw'] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        >
          <svg viewBox="0 0 100 50" className="w-full h-full opacity-90">
            <ellipse cx="30" cy="35" rx="25" ry="15" fill="white" />
            <ellipse cx="55" cy="30" rx="30" ry="18" fill="white" />
            <ellipse cx="75" cy="35" rx="20" ry="12" fill="white" />
          </svg>
        </motion.div>
        <motion.div
          className="absolute bottom-4 left-0 w-36 h-20"
          animate={{ x: ['-50%', '100vw'] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear', delay: 5 }}
        >
          <svg viewBox="0 0 100 50" className="w-full h-full opacity-80">
            <ellipse cx="30" cy="35" rx="22" ry="14" fill="white" />
            <ellipse cx="50" cy="28" rx="28" ry="16" fill="white" />
            <ellipse cx="70" cy="35" rx="18" ry="11" fill="white" />
          </svg>
        </motion.div>
        <motion.div
          className="absolute bottom-2 right-0 w-40 h-22"
          animate={{ x: ['100vw', '-100%'] }}
          transition={{ duration: 35, repeat: Infinity, ease: 'linear', delay: 10 }}
        >
          <svg viewBox="0 0 100 50" className="w-full h-full opacity-85">
            <ellipse cx="25" cy="35" rx="20" ry="13" fill="white" />
            <ellipse cx="50" cy="30" rx="25" ry="15" fill="white" />
            <ellipse cx="75" cy="35" rx="22" ry="14" fill="white" />
          </svg>
        </motion.div>
      </div>

      {/* Back button - same position as adventure map */}
      <div className="absolute top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="bg-background/80 backdrop-blur-sm rounded-full shadow-lg"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Floating Save button */}
      <div className="absolute top-4 right-4 z-50">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-primary-foreground shadow-lg gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* Scrollable map container - EXACTLY same as adventure map */}
      <div className="absolute inset-0 pt-16 overflow-auto z-10">
        <div 
          ref={containerRef}
          className="relative w-full"
          style={{ minHeight: "100%" }}
        >
          {/* Map image container for position calculation */}
          <div ref={mapRef} className="relative">
            <img
              src={islandBackground}
              alt="Island Map"
              className="w-full h-auto block"
              draggable={false}
            />
            
            {/* Draggable level nodes - same container structure */}
            <div 
              className="absolute inset-0"
              onTouchMove={handleTouchMove}
            >
              {positions.map((pos) => (
                <motion.div
                  key={pos.id}
                  className={`absolute cursor-grab active:cursor-grabbing focus:outline-none touch-manipulation ${
                    draggingId === pos.id ? "z-50" : "z-10"
                  }`}
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    width: 72,
                    height: 65,
                    transform: "translate(-50%, -50%)",
                  }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: pos.id * 0.05,
                    type: "spring",
                    stiffness: 400,
                    damping: 20,
                  }}
                  whileTap={{ scale: 1.1 }}
                  onMouseDown={(e) => handleMouseDown(e, pos.id)}
                  onTouchStart={(e) => handleTouchStart(e, pos.id)}
                >
                  <img 
                    src={pos.id === 1 ? levelCurrent : levelLocked}
                    alt={`Level ${pos.id}`}
                    className="w-full h-full object-contain pointer-events-none"
                    draggable={false}
                  />
                </motion.div>
              ))}
              
              {/* Trophy at the end - same as adventure map */}
              {positions.length > 0 && (
                <motion.div
                  className="absolute z-20 pointer-events-none"
                  style={{
                    left: `${positions[positions.length - 1].x + 8}%`,
                    top: `${positions[positions.length - 1].y - 2}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
                >
                  <div className="bg-gradient-to-br from-yellow-400 to-amber-500 p-3 rounded-full shadow-lg shadow-amber-500/30">
                    <Trophy className="h-8 w-8 text-white drop-shadow-md" />
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}