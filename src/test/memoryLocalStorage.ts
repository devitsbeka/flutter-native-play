/**
 * An in-memory localStorage for tests.
 *
 * Vitest runs in the node environment, where `localStorage` does not exist —
 * so any module that reads it throws on import rather than failing a useful
 * assertion. This is a full enough stand-in for the parts the app uses,
 * including `length` and `key(i)`, which the session-binding cleanup walks.
 */
export interface MemoryLocalStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  key(index: number): string | null;
  readonly length: number;
}

export function installMemoryLocalStorage(): MemoryLocalStorage {
  const store = new Map<string, string>();

  const api: MemoryLocalStorage = {
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    // Insertion-ordered, like a real Storage.
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };

  Object.defineProperty(globalThis, "localStorage", {
    value: api,
    configurable: true,
    writable: true,
  });

  return api;
}
