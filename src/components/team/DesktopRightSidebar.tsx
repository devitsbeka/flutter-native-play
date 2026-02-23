import { motion } from "framer-motion";
import { Avatar } from "@/components/shared/Avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useFriends } from "@/hooks/useFriends";
import { useLanguage } from "@/contexts/LanguageContext";
import { DidYouKnowWidget } from "@/components/home/widgets/DidYouKnowWidget";
import { LiveGamesWidget } from "@/components/home/widgets/LiveGamesWidget";

interface DesktopRightSidebarProps {
  onAddFriendClick: () => void;
}

export function DesktopRightSidebar({ onAddFriendClick }: DesktopRightSidebarProps) {
  const { profile } = useAuth();
  const { friends } = useFriends();
  const { t } = useLanguage();

  const suggestedFriends = friends.slice(0, 5);

  return (
    <aside className="hidden xl:flex flex-col w-[320px] min-w-[320px] h-screen sticky top-0 pt-6 pb-4 px-4 overflow-y-auto scrollbar-hide">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Avatar
            imageUrl={profile?.avatar_url || undefined}
            emoji={profile?.nickname?.charAt(0) || "👤"}
            size="md"
          />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">
              {profile?.nickname || t("extra.userLabel")}
            </span>
            <span className="text-xs text-muted-foreground">
              {profile?.total_points || 0} {t("extra.pointsSuffix")}
            </span>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="text-xs font-semibold text-primary hover:text-primary/80"
        >
          {t("extra.switchAccountLabel")}
        </motion.button>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-muted-foreground">
            {t("extra.suggestedLabel")}
          </span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAddFriendClick}
            className="text-xs font-semibold text-foreground hover:text-foreground/70"
          >
            {t("extra.allLabel")}
          </motion.button>
        </div>

        <div className="space-y-3">
          {suggestedFriends.length > 0 ? (
            suggestedFriends.map((friend) => (
              <div key={friend.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar
                    imageUrl={friend.avatarUrl || undefined}
                    emoji={friend.nickname?.charAt(0) || "👤"}
                    size="sm"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">
                      {friend.nickname}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t("extra.suggestedLabel")}
                    </span>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-xs font-semibold text-primary hover:text-primary/80"
                >
                  {t("extra.playLabel")}
                </motion.button>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">
              {t("extra.noFriendsYet")}
            </p>
          )}
        </div>
      </div>

      <div className="mb-4">
        <DidYouKnowWidget />
      </div>

      <div className="mb-4">
        <LiveGamesWidget />
      </div>

      <div className="mt-auto pt-4">
        <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-muted-foreground/50">
          <span className="hover:underline cursor-pointer">{t("extra.aboutUs")}</span>
          <span>·</span>
          <span className="hover:underline cursor-pointer">{t("extra.helpLabel")}</span>
          <span>·</span>
          <span className="hover:underline cursor-pointer">{t("extra.policyLabel2")}</span>
          <span>·</span>
          <span className="hover:underline cursor-pointer">{t("extra.termsLabel")}</span>
        </div>
        <p className="text-[11px] text-muted-foreground/40 mt-3">
          © 2026 MYTRIVIA
        </p>
      </div>
    </aside>
  );
}
