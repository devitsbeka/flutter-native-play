import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useTransform, animate, PanInfo } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconReviewCard } from '@/components/admin/IconReviewCard';
import { IconReviewFilters } from '@/components/admin/IconReviewFilters';
import { useIconReviewQueue } from '@/hooks/useIconReviewQueue';
import { toast } from 'sonner';

const SWIPE_THRESHOLD = 80;

export default function IconReview() {
  const navigate = useNavigate();
  const {
    currentQuestion,
    prevQuestion,
    nextQuestion,
    currentIndex,
    totalLoaded,
    loading,
    stats,
    categoryFilter,
    setCategoryFilter,
    showOnlyWithoutIcons,
    setShowOnlyWithoutIcons,
    goNext,
    goPrev,
    assignIcon,
    removeIcon,
    categories
  } = useIconReviewQueue();

  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);

  // Card transforms based on drag position
  const currentScale = useTransform(x, [-200, 0, 200], [0.95, 1, 0.95]);
  const currentOpacity = useTransform(x, [-200, 0, 200], [0.8, 1, 0.8]);
  const prevX = useTransform(x, [-200, 0, 200], [-30, -60, -90]);
  const prevScale = useTransform(x, [-200, 0, 200], [1, 0.9, 0.85]);
  const prevOpacity = useTransform(x, [-200, 0, 200], [1, 0.5, 0.3]);
  const nextX = useTransform(x, [-200, 0, 200], [90, 60, 30]);
  const nextScale = useTransform(x, [-200, 0, 200], [0.85, 0.9, 1]);
  const nextOpacity = useTransform(x, [-200, 0, 200], [0.3, 0.5, 1]);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    setIsDragging(false);
    
    if (info.offset.x > SWIPE_THRESHOLD && prevQuestion) {
      goPrev();
    } else if (info.offset.x < -SWIPE_THRESHOLD && nextQuestion) {
      goNext();
    }
    
    animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 });
  };

  const handleIconChange = useCallback(async (slug: string | null) => {
    if (slug) {
      const success = await assignIcon(slug);
      if (success) {
        toast.success('აიკონი დაემატა');
        // Auto-advance to next after assignment
        setTimeout(() => {
          if (nextQuestion) goNext();
        }, 300);
      }
    }
  }, [assignIcon, goNext, nextQuestion]);

  const handleRemoveIcon = useCallback(async () => {
    const success = await removeIcon();
    if (success) {
      toast.success('აიკონი წაიშალა');
    }
  }, [removeIcon]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && prevQuestion) {
        goPrev();
      } else if (e.key === 'ArrowRight' && nextQuestion) {
        goNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goPrev, goNext, prevQuestion, nextQuestion]);

  // Progress text
  const progressText = showOnlyWithoutIcons 
    ? `${currentIndex + 1} / ${stats.withoutIcons}`
    : `${currentIndex + 1} / ${stats.total}`;

  return (
    <div className="fixed inset-0 safe-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur z-30">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div className="text-center">
          <div className="text-lg font-semibold text-foreground">
            კითხვები
          </div>
          <div className="text-sm text-muted-foreground">
            {loading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : progressText}
          </div>
        </div>

        <IconReviewFilters
          categories={categories}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          showOnlyWithoutIcons={showOnlyWithoutIcons}
          setShowOnlyWithoutIcons={setShowOnlyWithoutIcons}
          stats={stats}
        />
      </header>

      {/* Card Stack Area */}
      <div className="flex-1 relative overflow-hidden">
        {loading && !currentQuestion ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !currentQuestion ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              ყველა კითხვას აქვს აიკონი!
            </h2>
            <p className="text-muted-foreground">
              შეგიძლიათ ფილტრები შეცვალოთ მეტი კითხვის სანახავად
            </p>
          </div>
        ) : (
          <>
            {/* Previous Card (behind) */}
            {prevQuestion && (
              <IconReviewCard
                question={prevQuestion}
                onIconChange={() => {}}
                position="prev"
                style={{
                  x: prevX,
                  scale: prevScale,
                  opacity: prevOpacity,
                } as any}
              />
            )}

            {/* Next Card (behind) */}
            {nextQuestion && (
              <IconReviewCard
                question={nextQuestion}
                onIconChange={() => {}}
                position="next"
                style={{
                  x: nextX,
                  scale: nextScale,
                  opacity: nextOpacity,
                } as any}
              />
            )}

            {/* Current Card (draggable) */}
            <motion.div
              className="absolute inset-0"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.1}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              style={{ x }}
            >
              <IconReviewCard
                question={currentQuestion}
                onIconChange={handleIconChange}
                position="current"
                style={{
                  scale: currentScale,
                  opacity: currentOpacity,
                } as any}
              />
            </motion.div>
          </>
        )}
      </div>

      {/* Footer Navigation */}
      <footer className="flex-shrink-0 flex items-center justify-between px-4 py-4 border-t border-border bg-background/95 backdrop-blur z-30">
        <Button
          variant="outline"
          size="lg"
          onClick={goPrev}
          disabled={!prevQuestion}
          className="gap-2"
        >
          <ChevronLeft className="w-5 h-5" />
          უკან
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleRemoveIcon}
          disabled={!currentQuestion?.icon_slug}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-5 h-5" />
        </Button>

        <Button
          variant="outline"
          size="lg"
          onClick={goNext}
          disabled={!nextQuestion}
          className="gap-2"
        >
          შემდეგი
          <ChevronRight className="w-5 h-5" />
        </Button>
      </footer>
    </div>
  );
}
