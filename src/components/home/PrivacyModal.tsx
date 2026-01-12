import { motion, AnimatePresence } from "framer-motion";
import { Shield, FileText, Trash2, Download, ChevronRight, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationModal } from "@/hooks/useNotificationModal";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { GameModal } from "@/components/ui/game-modal";

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
  const [isExporting, setIsExporting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user-account");
      
      if (error) throw error;
      
      await signOut();
      notify.success("ანგარიში წაიშალა", { description: "თქვენი ყველა მონაცემი წაიშალა." });
      onClose();
      navigate("/");
    } catch (error: any) {
      console.error("Account deletion error:", error);
      notify.error("შეცდომა", { description: error.message || "ანგარიშის წაშლა ვერ მოხერხდა" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportData = async () => {
    if (!user) return;
    
    setIsExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("export-user-data");
      
      if (error) throw error;
      
      // Create and download the JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quizapp-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      notify.success("მონაცემები გადმოწერილია", { description: "თქვენი მონაცემების ფაილი მზადაა." });
    } catch (error: any) {
      console.error("Data export error:", error);
      notify.error("შეცდომა", { description: error.message || "მონაცემების ექსპორტი ვერ მოხერხდა" });
    } finally {
      setIsExporting(false);
    }
  };

  const privacyItems = [
    {
      icon: Shield,
      label: "კონფიდენციალურობის პოლიტიკა",
      sublabel: "როგორ ვიცავთ თქვენს მონაცემებს",
      action: () => { onClose(); navigate("/privacy-policy"); },
    },
    {
      icon: FileText,
      label: "მომსახურების პირობები",
      sublabel: "წესები და პირობები",
      action: () => { onClose(); navigate("/terms"); },
    },
    {
      icon: Download,
      label: "მონაცემების ჩამოტვირთვა",
      sublabel: isExporting ? "მიმდინარეობს..." : "გადმოწერეთ თქვენი ინფორმაცია",
      action: handleExportData,
      loading: isExporting,
      requiresAuth: true,
    },
  ];

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      title="კონფიდენციალურობა"
      hideFooter
    >
      <div className="space-y-2">
        {privacyItems.map((item) => {
          // Skip items that require auth if user is not logged in
          if (item.requiresAuth && !user) return null;
          
          return (
            <button
              key={item.label}
              onClick={item.action}
              disabled={item.loading}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-50"
              style={{ boxShadow: "0 2px 0 #E5E7EB" }}
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                {item.loading ? (
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                ) : (
                  <item.icon className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900">{item.label}</p>
                <p className="text-sm text-gray-500">{item.sublabel}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </button>
          );
        })}

        {/* Delete Account Section */}
        {user && (
          <div className="pt-4 border-t border-gray-200 mt-4">
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-50 hover:bg-red-100 transition-colors"
                style={{ boxShadow: "0 2px 0 #FEE2E2" }}
              >
                <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-red-500" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-red-600">ანგარიშის წაშლა</p>
                  <p className="text-sm text-red-500/70">სამუდამოდ წაშალეთ ყველა მონაცემი</p>
                </div>
              </button>
            ) : (
              <div 
                className="space-y-3 p-4 rounded-2xl bg-red-50 border border-red-200"
                style={{ boxShadow: "0 2px 0 #FEE2E2" }}
              >
                <p className="text-sm text-red-600 font-medium">
                  დარწმუნებული ხართ? ეს მოქმედება შეუქცევადია.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2 px-4 rounded-xl bg-gray-100 text-gray-700 font-medium"
                    style={{ boxShadow: "0 2px 0 #E5E7EB" }}
                  >
                    გაუქმება
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="flex-1 py-2 px-4 rounded-xl bg-red-500 text-white font-medium disabled:opacity-50"
                    style={{ boxShadow: "0 2px 0 #DC2626" }}
                  >
                    {isDeleting ? "..." : "წაშლა"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </GameModal>
  );
}
