# @chaos_team/admin-ui-core

Framework-neutral industrial UI primitives built as Web Components.

```ts
import { registerAdminElements } from "@chaos_team/admin-ui-core/register";
import "@chaos_team/admin-ui-core/styles.css";

registerAdminElements();
```

```html
<aui-button variant="primary">Deploy New</aui-button>
<aui-status-tag status="success">Online</aui-status-tag>
```

All components use the `--aui-*` design tokens and emit structured `aui-*` CustomEvents.
