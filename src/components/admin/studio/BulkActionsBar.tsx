import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Rocket, Library, Trash2, ChevronDown, Copy, Palette, X, Scissors } from 'lucide-react';
import { useState } from 'react';
import { ProductionStatus } from '@/hooks/useQuestionStudio';
import { motion, AnimatePresence } from 'framer-motion';

interface BulkActionsBarProps {
  selectedCount: number;
  productionStatus: ProductionStatus;
  onPushToProduction: () => void;
  onRemoveFromProduction: () => void;
  onDelete: () => void;
  onChangeDifficulty: (difficulty: 'easy' | 'medium' | 'hard') => void;
  onShortenAnswers: () => void;
  shortenDisabled?: boolean;
  onClearSelection: () => void;
}

export function BulkActionsBar({
  selectedCount,
  productionStatus,
  onPushToProduction,
  onRemoveFromProduction,
  onDelete,
  onChangeDifficulty,
  onShortenAnswers,
  shortenDisabled,
  onClearSelection,
}: BulkActionsBarProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-2 px-4 py-2.5 bg-background border border-border rounded-xl shadow-lg">
            <span className="text-sm font-medium text-muted-foreground">
              {selectedCount} არჩეული
            </span>
            
            <div className="h-4 w-px bg-border" />

            {productionStatus === 'library' ? (
              <Button size="sm" variant="default" onClick={onPushToProduction} className="gap-1.5">
                <Rocket className="h-3.5 w-3.5" />
                Push to Production
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={onRemoveFromProduction} className="gap-1.5">
                <Library className="h-3.5 w-3.5" />
                Move to Library
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1">
                  <Palette className="h-3.5 w-3.5" />
                  სირთულე
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="bg-popover">
                <DropdownMenuItem onClick={() => onChangeDifficulty('easy')}>
                  მარტივი
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChangeDifficulty('medium')}>
                  საშუალო
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChangeDifficulty('hard')}>
                  რთული
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              size="sm"
              variant="outline"
              onClick={onShortenAnswers}
              disabled={shortenDisabled}
              className="gap-1.5"
            >
              <Scissors className="h-3.5 w-3.5" />
              შემოკლება
            </Button>

            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setShowDeleteDialog(true)}
              className="gap-1.5 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="h-3.5 w-3.5" />
              წაშლა
            </Button>

            <Button size="sm" variant="ghost" onClick={onClearSelection} className="px-2">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>დარწმუნებული ხართ?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedCount} კითხვა სამუდამოდ წაიშლება. ეს მოქმედება შეუქცევადია.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>გაუქმება</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete();
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              წაშლა
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
