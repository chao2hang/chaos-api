import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@chaos_team/blbui-core/register",
        replacement: new URL("../core/src/register.ts", import.meta.url).pathname,
      },
      {
        find: "@chaos_team/blbui-core/styles.css",
        replacement: new URL("../core/src/styles.css", import.meta.url).pathname,
      },
      {
        find: "@chaos_team/blbui-core",
        replacement: new URL("../core/src/index.ts", import.meta.url).pathname,
      },
      {
        find: "@chaos_team/blbui-business/register",
        replacement: new URL("../business/src/register.ts", import.meta.url).pathname,
      },
      {
        find: "@chaos_team/blbui-business/styles.css",
        replacement: new URL("../business/src/styles.css", import.meta.url).pathname,
      },
      {
        find: "@chaos_team/blbui-business",
        replacement: new URL("../business/src/index.ts", import.meta.url).pathname,
      },
    ],
  },
  server: { port: 4173, strictPort: false },
});
