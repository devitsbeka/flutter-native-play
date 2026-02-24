import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, AlertCircle } from "lucide-react";
import { translateErrorMessage } from "@/utils/errorTranslations";
import { useLanguage } from "@/contexts/LanguageContext";

interface EmailEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEmail: string;
}

export function EmailEditModal({ isOpen, onClose, currentEmail }: EmailEditModalProps) {
  const [newEmail, setNewEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleSubmit = async () => {
    if (!newEmail.trim()) {
      toast({
        title: t("extra.errorLabel"),
        description: t("extra.enterNewEmail"),
        variant: "destructive",
      });
      return;
    }

    if (newEmail === currentEmail) {
      toast({
        title: t("extra.errorLabel"), 
        description: t("extra.emailSameAsOld"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      
      if (error) throw error;

      toast({
        title: t("extra.successLabel"),
        description: t("extra.emailSuccess"),
      });
      setNewEmail("");
      onClose();
    } catch (error: any) {
      toast({
        title: t("extra.errorLabel"),
        description: translateErrorMessage(error.message),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            {t("extra.changeEmail")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">{t("extra.currentEmailLabel")}</label>
            <div className="px-3 py-2 bg-secondary/50 rounded-lg text-foreground">
              {currentEmail}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">{t("extra.newEmailLabel")}</label>
            <Input
              type="email"
              placeholder={t("extra.enterNewEmail")}
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {t("extra.emailConfirmNote")}
            </p>
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || !newEmail.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("extra.changingEmail")}
              </>
            ) : (
              t("extra.changeBtn2")
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
