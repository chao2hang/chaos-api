/*
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
*/

import { readFile } from "node:fs/promises";

const [core, business, catalog] = await Promise.all([
  readFile(new URL("../core/src/register.ts", import.meta.url), "utf8"),
  readFile(new URL("../business/src/register.ts", import.meta.url), "utf8"),
  readFile(new URL("../docs-site/src/catalog.ts", import.meta.url), "utf8"),
]);

const registered = [
  ...core.matchAll(/defineOnce\("([^"]+)"/g),
  ...business.matchAll(/defineOnce\("([^"]+)"/g),
].map((match) => match[1]);
const documented = [...catalog.matchAll(/item\(\s*"[^"]+",\s*"([^"]+)"/g)].map((match) => match[1]);
const registeredSet = new Set(registered);
const documentedSet = new Set(documented);
const missing = registered.filter((tag) => !documentedSet.has(tag));
const extra = documented.filter((tag) => !registeredSet.has(tag));
if (
  missing.length ||
  extra.length ||
  registeredSet.size !== registered.length ||
  documentedSet.size !== documented.length
) {
  console.error(
    JSON.stringify(
      {
        missing,
        extra,
        duplicateRegistered: registered.length - registeredSet.size,
        duplicateDocumented: documented.length - documentedSet.size,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}
console.log(`Catalog check passed: ${registeredSet.size} registered components documented`);
