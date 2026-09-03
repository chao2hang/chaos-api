/*
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
*/

declare namespace svelte.JSX {
  interface HTMLAttributes<T> {
    "on:aui-input"?: (event: CustomEvent<{ value: string }>) => void;
    "on:aui-change"?: (event: CustomEvent<{ value: string }>) => void;
    "on:aui-close"?: (event: CustomEvent<{ open: boolean }>) => void;
    "on:aui-page-change"?: (event: CustomEvent<{ page: number }>) => void;
    "on:aui-tab-change"?: (event: CustomEvent<{ id: string }>) => void;
    "on:aui-nav-change"?: (event: CustomEvent<{ id: string }>) => void;
    items?: unknown;
    options?: unknown;
  }
}
