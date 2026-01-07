import { motion } from "framer-motion";
import { Avatar } from "@/components/shared/Avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useFriends } from "@/hooks/useFriends";
import { DidYouKnowWidget } from "@/components/home/widgets/DidYouKnowWidget";
import { LiveGamesWidget } from "@/components/home/widgets/LiveGamesWidget";

interface DesktopRightSidebarProps {
  onAddFriendClick: () => void;
}

export function DesktopRightSidebar({ onAddFriendClick }: DesktopRightSidebarProps) {
  const { profile } = useAuth();
  const { friends } = useFriends();

  // Get a few friends to show as suggestions
  const suggestedFriends = friends.slice(0, 5);

  return (
    <aside className="hidden xl:flex flex-col w-[320px] min-w-[320px] h-screen sticky top-0 pt-6 pb-4 px-4 overflow-y-auto scrollbar-hide">
      {/* Current User Profile */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Avatar
            imageUrl={profile?.avatar_url || undefined}
            emoji={profile?.nickname?.charAt(0) || "👤"}
            size="md"
          />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">
              {profile?.nickname || "მომხმარებელი"}
            </span>
            <span className="text-xs text-muted-foreground">
              {profile?.total_points || 0} ქულა
            </span>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="text-xs font-semibold text-primary hover:text-primary/80"
        >
          გადართვა
        </motion.button>
      </div>

      {/* Suggested Friends Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-muted-foreground">
            მეგობრების შემოთავაზება
          </span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAddFriendClick}
            className="text-xs font-semibold text-foreground hover:text-foreground/70"
          >
            ყველა
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
                      შემოთავაზება
                    </span>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-xs font-semibold text-primary hover:text-primary/80"
                >
                  თამაში
                </motion.button>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">
              მეგობრები ჯერ არ გყავს
            </p>
          )}
        </div>
      </div>

      {/* Did You Know Widget */}
      <div className="mb-4">
        <DidYouKnowWidget />
      </div>

      {/* Live Games Widget */}
      <div className="mb-4">
        <LiveGamesWidget />
      </div>

      {/* Footer Links - Instagram style */}
      <div className="mt-auto pt-4">
        <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-muted-foreground/50">
          <span className="hover:underline cursor-pointer">ჩვენს შესახებ</span>
          <span>·</span>
          <span className="hover:underline cursor-pointer">დახმარება</span>
          <span>·</span>
          <span className="hover:underline cursor-pointer">პოლიტიკა</span>
          <span>·</span>
          <span className="hover:underline cursor-pointer">პირობები</span>
        </div>
        <p className="text-[11px] text-muted-foreground/40 mt-3">
          © 2026 MYTRIVIA
        </p>
      </div>
    </aside>
  );
}
