/*
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
*/

import { registerAdminElements } from "@chaos_team/blbui-core/register";
import { registerBusinessElements } from "@chaos_team/blbui-business/register";
import "@chaos_team/blbui-core/styles.css";
import "@chaos_team/blbui-business/styles.css";
import "./styles.css";
import { mountDocsApp } from "./app";

registerAdminElements();
registerBusinessElements();
mountDocsApp(document.querySelector("#app") as HTMLElement);
