import { Check } from "lucide-react";
import { CircleFlag } from "@/components/shared/CircleFlag";
import { LANGUAGES } from "@/locales";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * The signed-out header's right-hand control: a puck showing the language
 * you are reading in, opening the list of the seven we ship.
 *
 * It stands where search and the notification bell used to, on the guest
 * home and in every PageHeader. Neither earns its place signed out: there is
 * nothing of yours to find and nothing to be notified about. The language,
 * by contrast, decides whether the rest of the screen is readable at all,
 * and a visitor arriving from the wrong locale had no other way to change it
 * before signing in.
 *
 * Chunky-white 3D, the same vocabulary as the logged-in home's cards
 * (LoggedInHomeV2Mobile's CARD): white face, a solid lavender edge under it
 * rather than a blurred shadow, and the whole thing sinking onto that edge
 * when pressed.
 *
 * Reactivity comes from useLanguage() rather than the static `t`, so the
 * flag on the puck repaints the moment a language is picked; Index consumes
 * the same context, which is what re-translates the screen behind it.
 */
export function LanguagePicker() {
  const { language, setLanguage, currentLanguage, t } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${t("settings.language")}: ${currentLanguage.nativeName}`}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/95 shadow-[0_3px_0_0_#e2d6f2,0_6px_14px_rgba(60,30,90,0.14)] transition-[transform,box-shadow] duration-100 active:translate-y-[3px] active:shadow-[0_0_0_0_#e2d6f2,0_2px_6px_rgba(60,30,90,0.14)]"
        >
          <CircleFlag code={currentLanguage.code} className="size-[26px]" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        // border-0 and the rounded/shadow overrides replace the primitive's
        // flat popover look; overflow-hidden stays so the item highlights
        // are clipped to the rounded corners.
        className="z-50 min-w-[204px] rounded-[22px] border-0 bg-white/95 p-[6px] shadow-[0_4px_0_0_#e2d6f2,0_10px_26px_rgba(60,30,90,0.18)]"
      >
        {LANGUAGES.map((lang) => {
          const active = lang.code === language;
          return (
            <DropdownMenuItem
              key={lang.code}
              onSelect={() => setLanguage(lang.code)}
              className={`flex cursor-pointer items-center gap-3 rounded-[15px] px-3 py-2.5 text-[15px] focus:bg-[#f4eefc] ${
                active ? "bg-[#f4eefc] font-semibold text-[#402666]" : "text-[#002b63]"
              }`}
            >
              <CircleFlag code={lang.code} className="size-[22px] shrink-0" />
              <span className="flex-1">{lang.nativeName}</span>
              {active && <Check className="size-4 shrink-0 text-[#7126d5]" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
