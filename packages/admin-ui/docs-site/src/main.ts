/*
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
*/

import { registerAdminElements } from "@chaos_team/admin-ui-core/register";
import "@chaos_team/admin-ui-core/styles.css";
import "./styles.css";
import { mountDocsApp } from "./app";

registerAdminElements();
mountDocsApp(document.querySelector("#app") as HTMLElement);
