# Chaos Admin UI

基于 `docs/admin-style-guide.md` 的 **Obsidian Industrial Console** 跨框架组件库。

## 当前状态

当前版本为 `0.1.0`，已经提供无框架 Web Components 核心和 React/Vue/Svelte 适配入口：

| 包                            | 用途                                              |
| ----------------------------- | ------------------------------------------------- |
| `@chaos_team/admin-ui-core`   | Lit 实现的无框架核心、CSS tokens、Custom Elements |
| `@chaos_team/admin-ui-react`  | React 18/19 类型化绑定                            |
| `@chaos_team/admin-ui-vue`    | Vue 3 绑定                                        |
| `@chaos_team/admin-ui-svelte` | Svelte 5 的核心注册和类型入口                     |

## 组件清单

- 基础：`Button`、`Card`、`Input`、`Textarea`、`Select`、`Checkbox`、`Switch`、`StatusTag`
- 反馈：`Spinner`、`Skeleton`、`EmptyState`、`ErrorState`、`Separator`、`CopyableText`
- 布局：`Shell`、`Page`、`PageHeader`、`Stat`、`FilterBar`
- 数据：`Table`、`Pagination`、`Tabs`
- 导航：`Nav`、`Breadcrumb`
- 叠加层：`Dialog`、`ConfirmDialog`

## 设计原则

- 画布 `#0a0a0a`，容器 `#0f0f0f`，表头 `#18181b`。
- 1px 锐利边框，默认零圆角，不使用厚重阴影或玻璃拟态。
- UI 使用 Space Grotesk，数据/路径/时间/状态使用 JetBrains Mono。
- 所有颜色状态同时保留文本语义，不依赖颜色作为唯一信息。
- 组件提供 loading、empty、error、disabled、focus 等稳定状态。
- `prefers-reduced-motion` 下关闭装饰性动画。
- Core 使用 Lit Shadow DOM 隔离组件内部样式，同时通过 CSS variables 和 slots 允许宿主应用定制主题与内容；不会给业务页面施加全局 `* { !important }` 覆盖。

## Core 使用

```ts
import { registerAdminElements } from "@chaos_team/admin-ui-core/register";
import "@chaos_team/admin-ui-core/styles.css";

registerAdminElements();
```

```html
<div class="aui-root">
  <aui-page title="Channels" description="Manage upstream channels.">
    <span slot="actions">
      <aui-button variant="primary">Deploy New</aui-button>
    </span>

    <aui-filter-bar>
      <aui-input placeholder="Search channels"></aui-input>
    </aui-filter-bar>

    <aui-table>
      <table>
        <thead>
          <tr>
            <th>NAME</th>
            <th>STATUS</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>OPENAI</td>
            <td><aui-status-tag status="success">ONLINE</aui-status-tag></td>
          </tr>
        </tbody>
      </table>
    </aui-table>
  </aui-page>
</div>
```

## React 使用

```tsx
import { AdminButton, AdminInput, AdminPage, AdminStatusTag } from "@chaos_team/admin-ui-react";

export function ChannelsPage() {
  return (
    <AdminPage title="Channels" description="Manage upstream channels.">
      <AdminButton variant="primary">Deploy New</AdminButton>
      <AdminInput placeholder="Search channels" onValueChange={setSearch} />
      <AdminStatusTag status="success">ONLINE</AdminStatusTag>
    </AdminPage>
  );
}
```

## Vue 使用

```vue
<script setup lang="ts">
import { ref } from "vue";
import { AdminButton, AdminInput, AdminPage } from "@chaos_team/admin-ui-vue";

const search = ref("");
</script>

<template>
  <AdminPage title="Channels" description="Manage upstream channels.">
    <AdminButton variant="primary">Deploy New</AdminButton>
    <AdminInput v-model:value="search" placeholder="Search channels" />
  </AdminPage>
</template>
```

## Svelte 使用

Svelte 直接使用 Custom Elements；在应用入口调用 `registerAdminElements()`，并导入样式：

```svelte
<script lang="ts">
  import { registerAdminElements } from '@chaos_team/admin-ui-svelte'
  import '@chaos_team/admin-ui-core/styles.css'

  registerAdminElements()
  let page = 1
</script>

<div class="aui-root">
  <aui-page title="Channels" description="Manage upstream channels.">
    <aui-button variant="primary">Deploy New</aui-button>
    <aui-pagination total-pages={4} {page} on:aui-page-change={(event) => page = event.detail.page} />
  </aui-page>
</div>
```

## 事件约定

Core 事件使用 `aui-*` 前缀并通过 `CustomEvent.detail` 传递结构化数据：

| 事件              | detail              |
| ----------------- | ------------------- |
| `aui-input`       | `{ value: string }` |
| `aui-change`      | `{ value: string }` |
| `aui-page-change` | `{ page: number }`  |
| `aui-tab-change`  | `{ id: string }`    |
| `aui-close`       | `{ open: false }`   |
| `aui-nav-change`  | `{ id: string }`    |

React/Vue 绑定会将这些事件映射为 `onValueChange`、`@value-change`、`onPageChange`、`@page-change` 等框架惯用 API。

## 迁移策略

1. 新页面优先使用 `@chaos_team/admin-ui-react`，不再新增 `bg-[#0a0a0a]`、`border-zinc-800` 等散落样式。
2. 现有 React 页面先迁移 Button、StatusTag、Page、FilterBar、Table、Pagination。
3. 保留 `web/src/components/ui` 作为现有业务兼容层，不在本阶段一次性删除。
4. Vue/Svelte 应用接入时只安装对应 bindings 和 core，不需要 React runtime。

## 校验

```bash
cd packages/admin-ui
bun run typecheck
bun run check:svelte
./web/node_modules/.bin/oxlint -c web/.oxlintrc.json packages/admin-ui/core/src packages/admin-ui/react/src packages/admin-ui/vue/src packages/admin-ui/svelte/src
./web/node_modules/.bin/oxfmt --check packages/admin-ui/core/src packages/admin-ui/react/src packages/admin-ui/vue/src packages/admin-ui/svelte/src
```
