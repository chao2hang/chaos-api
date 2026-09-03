import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@chaos_team/admin-ui-core/register",
        replacement: new URL("../core/src/register.ts", import.meta.url).pathname,
      },
      {
        find: "@chaos_team/admin-ui-core/styles.css",
        replacement: new URL("../core/src/styles.css", import.meta.url).pathname,
      },
      {
        find: "@chaos_team/admin-ui-core",
        replacement: new URL("../core/src/index.ts", import.meta.url).pathname,
      },
    ],
  },
  server: { port: 4173, strictPort: false },
});
