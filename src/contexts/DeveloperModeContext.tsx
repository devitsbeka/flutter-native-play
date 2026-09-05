import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useAdminRole } from "@/hooks/useAdminRole";

/**
 * Developer mode: the switch that shows what is built but not yet released.
 *
 * Some modes ship in the bundle before they are ready for players — Versus
 * King and Team Battle today (see DEVELOPER_ONLY_GAME_TYPES in the game type
 * registry). They are invisible to everyone until they are promoted; an
 * admin flips this switch in the side menu to see and play them.
 *
 * The switch is per device (localStorage) — it is a tool, not a setting —
 * and it is only ever ON for an admin: the stored flag is read for anyone,
 * but `developerMode` is false unless `has_role(admin)` says so, so a
 * non-admin who sets the key by hand sees nothing.
 */
const STORAGE_KEY = "developer_mode";

export function readDeveloperModeFlag(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeDeveloperModeFlag(on: boolean) {
  try {
    if (on) localStorage.setItem(STORAGE_KEY, "1");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage blocked — the switch simply does not persist */
  }
}

interface DeveloperModeContextType {
  /** Whether the signed-in person may see the switch at all. */
  isAdmin: boolean;
  /** The switch, as it applies: on AND an admin. */
  developerMode: boolean;
  /** The stored position of the switch, admin or not (what the toggle shows). */
  enabled: boolean;
  setEnabled: (on: boolean) => void;
}

const DeveloperModeContext = createContext<DeveloperModeContextType>({
  isAdmin: false,
  developerMode: false,
  enabled: false,
  setEnabled: () => {},
});

export function DeveloperModeProvider({ children }: { children: ReactNode }) {
  const { isAdmin } = useAdminRole();
  const [enabled, setEnabledState] = useState<boolean>(readDeveloperModeFlag);

  const setEnabled = useCallback((on: boolean) => {
    writeDeveloperModeFlag(on);
    setEnabledState(on);
  }, []);

  const value = useMemo<DeveloperModeContextType>(
    () => ({ isAdmin, developerMode: isAdmin && enabled, enabled, setEnabled }),
    [isAdmin, enabled, setEnabled],
  );

  return <DeveloperModeContext.Provider value={value}>{children}</DeveloperModeContext.Provider>;
}

/** Safe outside the provider (tests, isolated mounts): everything is off. */
export function useDeveloperMode(): DeveloperModeContextType {
  return useContext(DeveloperModeContext);
}
