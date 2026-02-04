import * as React from "react";
import { AvatarImage } from "@/components/ui/avatar";
import { resolveAvatarUrl } from "@/utils/avatarUtils";

type AvatarImageProps = React.ComponentPropsWithoutRef<typeof AvatarImage>;

/**
 * ResolvedAvatarImage - Drop-in replacement for AvatarImage that automatically
 * resolves avatar URLs (handles local asset paths like /src/assets/avatars/...)
 */
export const ResolvedAvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarImage>,
  AvatarImageProps
>(({ src, ...props }, ref) => {
  const resolvedSrc = resolveAvatarUrl(src as string | null | undefined) || src;
  return <AvatarImage ref={ref} src={resolvedSrc} {...props} />;
});

ResolvedAvatarImage.displayName = "ResolvedAvatarImage";
