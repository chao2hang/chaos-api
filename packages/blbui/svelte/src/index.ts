/*
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
*/

import { registerAdminElements } from "@chaos_team/blbui-core/register";

import "@chaos_team/blbui-core/styles.css";

export { registerAdminElements };
export * from "@chaos_team/blbui-core";

export function adminUi(node: HTMLElement): { destroy: () => void } {
  registerAdminElements();
  node.classList.add("aui-root");
  return { destroy: () => node.classList.remove("aui-root") };
}

export * from "./components";
