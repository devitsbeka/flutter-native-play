import { useCallback, useSyncExternalStore } from "react";

type Breakpoint = "xxs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const breakpoints: Record<Breakpoint, number> = {
    xxs: 320,
    xs: 600,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    "2xl": 1536,
};

function getBreakpoint(): Breakpoint {
    if (typeof window === "undefined") return "md";

    const width = window.innerWidth;

    if (width < breakpoints.xxs) return "xxs";
    if (width < breakpoints.xs) return "xs";
    if (width < breakpoints.sm) return "sm";
    if (width < breakpoints.md) return "md";
    if (width < breakpoints.lg) return "lg";
    if (width < breakpoints.xl) return "xl";
    return "2xl";
}

function subscribe(callback: () => void): () => void {
    window.addEventListener("resize", callback);
    return () => window.removeEventListener("resize", callback);
}

export function useBreakpoint(): Breakpoint {
    const getSnapshot = useCallback(() => getBreakpoint(), []);
    const getServerSnapshot = useCallback(() => "md" as Breakpoint, []);

    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useIsBreakpoint(breakpoint: Breakpoint): boolean {
    const currentBreakpoint = useBreakpoint();
    return currentBreakpoint === breakpoint;
}

export function useIsBreakpointUp(breakpoint: Breakpoint): boolean {
    const currentBreakpoint = useBreakpoint();
    const breakpointOrder: Breakpoint[] = ["xxs", "xs", "sm", "md", "lg", "xl", "2xl"];
    return breakpointOrder.indexOf(currentBreakpoint) >= breakpointOrder.indexOf(breakpoint);
}

export function useIsBreakpointDown(breakpoint: Breakpoint): boolean {
    const currentBreakpoint = useBreakpoint();
    const breakpointOrder: Breakpoint[] = ["xxs", "xs", "sm", "md", "lg", "xl", "2xl"];
    return breakpointOrder.indexOf(currentBreakpoint) < breakpointOrder.indexOf(breakpoint);
}
