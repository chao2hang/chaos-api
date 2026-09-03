/*
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
*/

import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const license = resolve(root, "../../LICENSE");

const packages = [
  {
    directory: "core",
    entries: ["src/index.ts", "src/register.ts"],
    external: ["lit"],
    copy: ["src/styles.css", "src/tokens.css"],
  },
  {
    directory: "react",
    entries: ["src/index.tsx"],
    external: [
      "react",
      "react-dom",
      "@chaos_team/admin-ui-core",
      "@chaos_team/admin-ui-core/register",
      "@chaos_team/admin-ui-core/styles.css",
    ],
  },
  {
    directory: "vue",
    entries: ["src/index.ts"],
    external: [
      "vue",
      "@chaos_team/admin-ui-core",
      "@chaos_team/admin-ui-core/register",
      "@chaos_team/admin-ui-core/styles.css",
    ],
  },
  {
    directory: "business",
    entries: ["src/index.ts", "src/register.ts"],
    external: ["lit", "@chaos_team/admin-ui-core"],
    copy: ["src/styles.css"],
  },
  {
    directory: "business-react",
    entries: ["src/index.tsx"],
    external: [
      "react",
      "react-dom",
      "@chaos_team/admin-ui-business",
      "@chaos_team/admin-ui-business/register",
      "@chaos_team/admin-ui-business/styles.css",
    ],
  },
];

async function buildPackage(config) {
  const directory = resolve(root, config.directory);
  const dist = join(directory, "dist");
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });

  const result = await Bun.build({
    entrypoints: config.entries.map((entry) => join(directory, entry)),
    outdir: dist,
    target: "browser",
    format: "esm",
    splitting: false,
    minify: false,
    external: config.external,
  });
  if (!result.success) {
    throw new Error(`Failed to build ${config.directory}`);
  }

  for (const source of config.copy ?? []) {
    const target = source.replace(/^src\//, "");
    await cp(join(directory, source), join(dist, target));
    if (target.endsWith(".css")) {
      await writeFile(
        join(dist, `${target}.d.ts`),
        "declare const stylesheet: string; export default stylesheet;\n",
      );
    }
  }
  await cp(license, join(dist, "LICENSE"));
  console.log(`built ${config.directory}`);
}

for (const config of packages) {
  await buildPackage(config);
}

// Svelte components are intentionally shipped as source .svelte files so the
// consuming Svelte/Vite compiler can optimize them for its own runtime.
const svelteDirectory = resolve(root, "svelte");
const svelteDist = join(svelteDirectory, "dist");
await rm(svelteDist, { recursive: true, force: true });
await cp(join(svelteDirectory, "src"), join(svelteDist, "src"), { recursive: true });
await cp(license, join(svelteDist, "LICENSE"));
await writeFile(
  join(svelteDist, "index.js"),
  'export { registerAdminElements } from "@chaos_team/admin-ui-core/register";\n',
);
await writeFile(
  join(svelteDist, "components.js"),
  [
    'export { default as AdminButton } from "./src/components/Button.svelte";',
    'export { default as AdminDialog } from "./src/components/Dialog.svelte";',
    'export { default as AdminInput } from "./src/components/Input.svelte";',
    'export { default as AdminPage } from "./src/components/Page.svelte";',
    'export { default as AdminPagination } from "./src/components/Pagination.svelte";',
    'export { default as AdminStatusTag } from "./src/components/StatusTag.svelte";',
    'export { default as AdminTable } from "./src/components/Table.svelte";',
  ].join("\n") + "\n",
);
await writeFile(
  join(svelteDist, "components.d.ts"),
  [
    'export { default as AdminButton } from "./src/components/Button.svelte";',
    'export { default as AdminDialog } from "./src/components/Dialog.svelte";',
    'export { default as AdminInput } from "./src/components/Input.svelte";',
    'export { default as AdminPage } from "./src/components/Page.svelte";',
    'export { default as AdminPagination } from "./src/components/Pagination.svelte";',
    'export { default as AdminStatusTag } from "./src/components/StatusTag.svelte";',
    'export { default as AdminTable } from "./src/components/Table.svelte";',
  ].join("\n") + "\n",
);
console.log("built svelte");
