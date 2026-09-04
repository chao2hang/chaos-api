# @chaos_team/blbui-core

Framework-neutral industrial UI primitives built as Web Components.

```ts
import { registerAdminElements } from "@chaos_team/blbui-core/register";
import "@chaos_team/blbui-core/styles.css";

registerAdminElements();
```

```html
<aui-button variant="primary">Deploy New</aui-button>
<aui-status-tag status="success">Online</aui-status-tag>
```

All components use the `--aui-*` design tokens and emit structured `aui-*` CustomEvents.
