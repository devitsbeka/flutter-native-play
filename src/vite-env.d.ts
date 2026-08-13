/// <reference types="vite/client" />

// Stamped at build time (see vite.config.ts) and written to dist/version.json,
// so a running page can tell whether it is the build the server now serves.
declare const __BUILD_ID__: string;
