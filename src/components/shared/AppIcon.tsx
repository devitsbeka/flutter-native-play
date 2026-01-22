import * as React from "react";
import { cn } from "@/lib/utils";
import { DynamicIcon } from "@/components/shared/DynamicIcon";

type AppIconProps = {
  slug?: string | null;
  categoryId?: string;
  questionId?: string;
  size?: number;
  className?: string;
  hideIfEmpty?: boolean;
};

/**
 * AppIcon: single place to render icons from the icon-library.
 * (We intentionally do NOT support emoji fallbacks.)
 */
export function AppIcon({
  slug,
  categoryId,
  questionId,
  size = 24,
  className,
  hideIfEmpty,
}: AppIconProps) {
  return (
    <DynamicIcon
      slug={slug ?? undefined}
      categoryId={categoryId}
      questionId={questionId}
      size={size}
      hideIfEmpty={hideIfEmpty}
      className={cn("shrink-0", className)}
    />
  );
}
