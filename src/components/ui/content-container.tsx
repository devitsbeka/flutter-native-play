import React from 'react';
import { cn } from '@/lib/utils';

interface ContentContainerProps {
  children: React.ReactNode;
  className?: string;
  /** Maximum width variant */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  /** Whether to center the container horizontally */
  centered?: boolean;
  /** Whether to add default horizontal padding */
  padded?: boolean;
  /** Whether the container should fill available height */
  fillHeight?: boolean;
  /** Whether to use flex column layout */
  flexCol?: boolean;
}

const maxWidthClasses = {
  sm: 'max-w-sm',      // 384px
  md: 'max-w-md',      // 448px
  lg: 'max-w-lg',      // 512px
  xl: 'max-w-xl',      // 576px
  '2xl': 'max-w-2xl',  // 672px
  full: 'max-w-full',
};

/**
 * A reusable content container that applies consistent max-width constraints.
 * Use this to keep content from stretching too wide on tablet/desktop.
 * 
 * @example
 * // Basic usage - centers content with max-w-xl
 * <ContentContainer>
 *   <YourContent />
 * </ContentContainer>
 * 
 * @example
 * // Full height flex column layout (common for full-page screens)
 * <ContentContainer fillHeight flexCol>
 *   <Header />
 *   <MainContent className="flex-1" />
 *   <Footer />
 * </ContentContainer>
 * 
 * @example
 * // Custom max-width
 * <ContentContainer maxWidth="lg">
 *   <NarrowContent />
 * </ContentContainer>
 */
export const ContentContainer: React.FC<ContentContainerProps> = ({
  children,
  className,
  maxWidth = 'xl',
  centered = true,
  padded = false,
  fillHeight = false,
  flexCol = false,
}) => {
  return (
    <div
      className={cn(
        'w-full',
        maxWidthClasses[maxWidth],
        centered && 'mx-auto',
        padded && 'px-4',
        fillHeight && 'flex-1',
        flexCol && 'flex flex-col',
        className
      )}
    >
      {children}
    </div>
  );
};

export default ContentContainer;
