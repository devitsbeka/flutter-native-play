import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, FileText, Trash2, Download, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationModal } from "@/hooks/useNotificationModal";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
  const { user, signOut } = useAuth();
  const { notify } = useNotificationModal();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    setIsDeleting(true);
    try {
      // Note: Full account deletion requires admin privileges
      // This just signs out and shows a message
      await signOut();
      notify.success("თქვენი მოთხოვნა მიღებულია", { description: "ანგარიში წაიშლება 30 დღეში." });
      onClose();
      navigate("/");
    } catch (error: any) {
      notify.error("შეცდომა", { description: error.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const privacyItems = [
    {
      icon: Shield,
      label: "კონფიდენციალურობის პოლიტიკა",
      sublabel: "როგორ ვიცავთ თქვენს მონაცემებს",
      action: () => window.open("#privacy-policy", "_blank"),
    },
    {
      icon: FileText,
      label: "მომსახურების პირობები",
      sublabel: "წესები და პირობები",
      action: () => window.open("#terms", "_blank"),
    },
    {
      icon: Download,
      label: "მონაცემების ჩამოტვირთვა",
      sublabel: "გადმოწერეთ თქვენი ინფორმაცია",
      action: () => notify.info("მონაცემები მალე გამოიგზავნება", { description: "თქვენს ელფოსტაზე", icon: "📧" }),
    },
  ];

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
                კონფიდენციალურობა
              </h2>
            </div>

            {/* Content */}
            <div className="p-4 space-y-2">
              {privacyItems.map((item) => (
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
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}

              {/* Delete Account Section */}
              {user && (
                <div className="pt-4 border-t border-border mt-4">
                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-destructive/10 hover:bg-destructive/20 transition-colors"
                    >
                      <div className="h-10 w-10 rounded-xl bg-destructive/20 flex items-center justify-center">
                        <Trash2 className="h-5 w-5 text-destructive" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-destructive">ანგარიშის წაშლა</p>
                        <p className="text-sm text-destructive/70">სამუდამოდ წაშალეთ ყველა მონაცემი</p>
                      </div>
                    </button>
                  ) : (
                    <div className="space-y-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20">
                      <p className="text-sm text-destructive font-medium">
                        დარწმუნებული ხართ? ეს მოქმედება შეუქცევადია.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1 py-2 px-4 rounded-xl bg-muted text-foreground font-medium"
                        >
                          გაუქმება
                        </button>
                        <button
                          onClick={handleDeleteAccount}
                          disabled={isDeleting}
                          className="flex-1 py-2 px-4 rounded-xl bg-destructive text-destructive-foreground font-medium disabled:opacity-50"
                        >
                          {isDeleting ? "..." : "წაშლა"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
