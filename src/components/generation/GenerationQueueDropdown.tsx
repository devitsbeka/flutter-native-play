import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Check, X, ImageIcon, User, Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useBackgroundGeneration, GenerationJob } from "@/contexts/BackgroundGenerationContext";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";

function JobItem({ job }: { job: GenerationJob }) {
  const [elapsedTime, setElapsedTime] = useState(0);
  
  useEffect(() => {
    if (job.status !== "generating") return;
    
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - job.startedAt.getTime()) / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [job.status, job.startedAt]);

  const getIcon = () => {
    if (job.type === "avatar") return <User className="w-4 h-4" />;
    return <ImageIcon className="w-4 h-4" />;
  };

  const getStatusIcon = () => {
    switch (job.status) {
      case "generating":
        return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
      case "completed":
        return <Check className="w-4 h-4 text-emerald-500" />;
      case "failed":
        return <X className="w-4 h-4 text-destructive" />;
    }
  };

  const getLabel = () => {
    if (job.type === "avatar") return "ავატარი";
    return "სურათი";
  };

  const getTimeDisplay = () => {
    if (job.status === "generating") {
      const remaining = Math.max(0, job.estimatedTime - elapsedTime);
      if (remaining > 0) {
        return `~${remaining} წმ`;
      }
      return "მზადდება...";
    }
    return formatDistanceToNow(job.startedAt, { addSuffix: true, locale: ka });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
    >
      {/* Thumbnail or placeholder */}
      <div className="relative w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
        {job.status === "completed" && job.imageUrl ? (
          <img 
            src={job.imageUrl} 
            alt={getLabel()} 
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-muted-foreground">{getIcon()}</span>
        )}
        {job.status === "generating" && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">
            {getLabel()}
          </span>
          {job.status === "completed" && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">
              მზადაა
            </span>
          )}
          {job.status === "failed" && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
              შეცდომა
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {getTimeDisplay()}
        </span>
      </div>

      {/* Status icon */}
      <div className="shrink-0">
        {getStatusIcon()}
      </div>
    </motion.div>
  );
}

export function GenerationQueueDropdown() {
  const { activeJobs } = useBackgroundGeneration();
  const [open, setOpen] = useState(false);

  const generatingCount = activeJobs.filter(j => j.status === "generating").length;
  const hasJobs = activeJobs.length > 0;
  const completedJobs = activeJobs.filter(j => j.status === "completed");
  const pendingJobs = activeJobs.filter(j => j.status === "generating");
  const failedJobs = activeJobs.filter(j => j.status === "failed");

  if (!hasJobs) return null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="relative flex items-center justify-center w-9 h-9 rounded-full bg-card text-foreground shadow-sm"
        >
          <Sparkles className="w-5 h-5" />
          {generatingCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-50" />
              <span className="relative min-w-[16px] h-[16px] flex items-center justify-center px-1 text-[9px] font-bold text-primary-foreground bg-primary rounded-full">
                {generatingCount}
              </span>
            </span>
          )}
        </motion.button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-72 bg-popover z-[200] p-0"
        sideOffset={8}
      >
        <DropdownMenuLabel className="px-3 py-2 text-sm font-bold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          AI გენერაციები
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        
        <div className="max-h-80 overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {/* Pending jobs first */}
            {pendingJobs.length > 0 && (
              <div key="pending">
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/30">
                  მზადდება ({pendingJobs.length})
                </div>
                {pendingJobs.map(job => (
                  <JobItem key={job.id} job={job} />
                ))}
              </div>
            )}

            {/* Completed jobs */}
            {completedJobs.length > 0 && (
              <div key="completed">
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/30">
                  დასრულებული ({completedJobs.length})
                </div>
                {completedJobs.map(job => (
                  <JobItem key={job.id} job={job} />
                ))}
              </div>
            )}

            {/* Failed jobs */}
            {failedJobs.length > 0 && (
              <div key="failed">
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/30">
                  წარუმატებელი ({failedJobs.length})
                </div>
                {failedJobs.map(job => (
                  <JobItem key={job.id} job={job} />
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>

        {activeJobs.length === 0 && (
          <div className="p-6 text-center text-muted-foreground text-sm">
            არ არის აქტიური გენერაციები
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
