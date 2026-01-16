import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { MainLayout } from "@/components/layout/MainLayout";
import { User, Lock, HelpCircle, Shield, LogOut, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";

const settingsItems = [
  {
    icon: User,
    labelKey: "settings.editName",
    route: "/settings/name",
    color: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    icon: Lock,
    labelKey: "settings.changePassword",
    route: "/settings/password",
    color: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    icon: HelpCircle,
    labelKey: "menu.help",
    route: "/support",
    color: "bg-blue-500/10",
    iconColor: "text-blue-500",
  },
  {
    icon: Shield,
    labelKey: "menu.privacy",
    route: "/settings/privacy",
    color: "bg-amber-500/10",
    iconColor: "text-amber-500",
  },
];

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { t } = useLanguage();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <MainLayout showPlayButton={false}>
    <div className="min-h-screen bg-background">

      <div className="p-4 pb-12 space-y-2">
        {settingsItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.button
              key={item.labelKey}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => navigate(item.route)}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors"
            >
              <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${item.iconColor}`} />
              </div>
              <span className="flex-1 text-left font-medium text-foreground">
                {t(item.labelKey)}
              </span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </motion.button>
          );
        })}

        {user && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={handleSignOut}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:bg-destructive/10 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
              <LogOut className="w-6 h-6 text-destructive" />
            </div>
            <span className="flex-1 text-left font-medium text-destructive">
              {t("menu.signOut")}
            </span>
            <ChevronRight className="w-5 h-5 text-destructive/50" />
          </motion.button>
        )}
      </div>
    </div>
    </MainLayout>
  );
}
