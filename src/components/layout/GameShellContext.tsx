import { createContext, useContext } from "react";

/**
 * True when a page renders inside the persistent GameShell (icon rail +
 * 458px panel + world canvas). MainLayout uses it to suppress its own nav
 * chrome so embedded pages don't double up navigation.
 */
export const GameShellContext = createContext(false);

export const useInGameShell = () => useContext(GameShellContext);
