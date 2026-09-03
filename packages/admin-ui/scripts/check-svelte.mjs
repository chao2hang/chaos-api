import { createRequire } from "node:module";
import { readdir, readFile } from "node:fs/promises";

const require = createRequire(new URL("../package.json", import.meta.url));
const { compile } = require("svelte/compiler");
const directory = new URL("../svelte/src/components/", import.meta.url);

for (const file of await readdir(directory)) {
  if (!file.endsWith(".svelte")) continue;
  const source = await readFile(new URL(file, directory), "utf8");
  compile(source, { filename: file, generate: "client" });
}

console.log("Svelte component syntax check passed");
