import { UserPlus } from "lucide-react";
import { SafeAvatarImage } from "@/components/shared/SafeAvatar";
import { useLanguage } from "@/contexts/LanguageContext";
import type { PendingInviteFrom } from "@/utils/pendingRoomInvites";

/**
 * "Invited by …" on a room card, with the inviter's face — small.
 *
 * The first version put SafeAvatarImage straight into the pill with a size
 * on containerClassName. That class dresses only the FALLBACK; the loaded
 * image is a bare <img class="w-full h-full">, and inside an inline-flex
 * pill "full" meant the card. The inviter's face filled the whole card and
 * pushed the name off it (owner: "not this large avatar and broken
 * layout"). The face lives in a sized, clipped box now, the way every other
 * avatar on these cards does.
 *
 * Purple, like the Private tab's count badge, so the two say the same thing
 * in the same voice; the Confirm button on the card's bottom row answers it.
 */
export function RoomInviteBadge({ from }: { from: PendingInviteFrom | null }) {
  const { t } = useLanguage();
  const label = from?.nickname
    ? t("extra.roomInvitedBy", { name: from.nickname })
    : t("extra.roomInvitedYou");
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 whitespace-nowrap rounded-full bg-[#7126d5] py-0.5 pl-0.5 pr-2.5 text-xs font-bold text-white shadow-[0_2px_6px_rgba(113,38,213,0.35)]">
      <span className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full bg-white/20">
        {from?.avatar_url ? (
          <SafeAvatarImage
            avatarUrl={from.avatar_url}
            fallback={from.nickname ?? "?"}
            className="h-full w-full object-cover"
            containerClassName="h-full w-full"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <UserPlus className="h-3 w-3" />
          </span>
        )}
      </span>
      <span className="truncate">{label}</span>
    </span>
  );
}
