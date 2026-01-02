import { motion, AnimatePresence } from "framer-motion";
import { X, HelpCircle, Mail, MessageCircle, FileText, ExternalLink } from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const helpItems = [
  {
    icon: HelpCircle,
    label: "ხშირად დასმული კითხვები",
    sublabel: "პასუხები პოპულარულ კითხვებზე",
    action: () => window.open("#faq", "_blank"),
  },
  {
    icon: MessageCircle,
    label: "მხარდაჭერის ჩატი",
    sublabel: "დაგვიკავშირდით პირდაპირ",
    action: () => window.open("#support", "_blank"),
  },
  {
    icon: Mail,
    label: "ელფოსტა",
    sublabel: "support@worldquizzes.com",
    action: () => window.open("mailto:support@worldquizzes.com", "_blank"),
  },
  {
    icon: FileText,
    label: "გზამკვლევი",
    sublabel: "როგორ ვითამაშოთ",
    action: () => window.open("#guide", "_blank"),
  },
];

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-4 m-auto w-[calc(100%-32px)] max-w-[360px] h-fit max-h-[85vh] bg-background rounded-3xl z-[60] shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="relative px-5 py-4 border-b border-border">
              <button
                onClick={onClose}
                className="absolute left-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-muted/80 flex items-center justify-center hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>

              <h2 className="text-center font-display text-lg font-bold text-foreground">
                დახმარება
              </h2>
            </div>

            {/* Content */}
            <div className="p-4 space-y-2">
              {helpItems.map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.sublabel}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
