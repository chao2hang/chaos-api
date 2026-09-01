# chaos-ui 迁移状态

`web/src/components/ui/` 是业务代码访问 UI 基础组件的唯一入口。本目录下的组件已尽可能迁移为
`@chaos_team/chaos-ui/ui` 的 re-export；业务代码不直接依赖 chaos-ui。

## 已迁移（chaos-ui re-export）

accordion, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button, calendar,
card, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu,
hover-card, input, input-group, kbd, label, navigation-menu, pagination, progress,
radio-group, resizable, scroll-area, select 之外的全部 sheet 系组件, separator, sheet,
sidebar, skeleton, slider, switch, table, tabs, textarea, toggle, toggle-group, tooltip

其中两处为适配层而非纯 re-export：

- `dropdown-menu.tsx` — `DropdownMenuItem` 保留本地包装，以维持 Radix 风格的
  `onSelect` 事件桥接（`dropdown-menu-events.ts`，含 `preventDefault` 保持菜单打开的语义）。
- `context-menu.tsx` — chaos-ui 无 `ContextMenuShortcut`，该子组件保留本地实现。

## 保留本地的组件及原因

| 组件 | 原因 |
| --- | --- |
| `alert.tsx` | chaos-ui Alert 为不同设计谱系（icon 列 + 内容包裹层），且 chaos-ui 无 `AlertAction`；本项目 42 处调用依赖现有 DOM 结构 |
| `form.tsx` | 深度定制：提交后自动滚动/聚焦首个错误字段、`data-form-root` 作用域、`FormMessage` 经 i18n `t()` 翻译错误文案 — chaos-ui 均无对应能力 |
| `popover.tsx` | chaos-ui `PopoverContent` 不接受 `collisionPadding` / `collisionBoundary` / `collisionAvoidance`（`model-group-selector` 等调用点依赖） |
| `select.tsx` | 本地 `SelectContent` 在移动端跳过 Portal（内联渲染），chaos-ui 无法表达该行为 |
| `sonner.tsx` | Toaster 定制了 Hugeicons 图标集与主题 CSS 变量 |
| `spinner.tsx` | 基于 HugeiconsIcon 的加载图标，API 与 chaos-ui Spinner 不同 |
| `carousel.tsx` | embla 组合组件，导出 `CarouselApi` 类型与 `useCarousel` hook，chaos-ui 无对应 |
| `combobox.tsx` / `combobox-input.tsx` | 基于 cmdk 的组合组件，chaos-ui Combobox 为不同 API 设计 |
| `native-select.tsx` | chaos-ui NativeSelect 是 options 驱动的另一种 API |
| `menubar.tsx` | chaos-ui 仅导出 `Menubar` 单组件，无完整子组件族 |
| `button-group`, `chart`, `direction`, `empty`, `field`, `icon-badge`, `input-otp`, `item`, `markdown`, `titled-card` | chaos-ui 无对应实现 |

## 重要陷阱：双 @base-ui/react 实例

chaos-ui 自带一份 `@base-ui/react` 依赖（独立于本项目的直接依赖）。两份实例的
React Context 互不相通，因此**同一 primitive 家族不可混用两份实现**
（例如 chaos-ui 的 `Popover` Root 搭配本地 Base UI 的 `PopoverContent` 会抛出
`PopoverRootContext is missing`）。

结论：单个组件家族要么整体使用 chaos-ui re-export，要么整体保留本地实现。
后续新增组件时沿用此规则。

## 后续建议

1. chaos-ui 补齐 `AlertAction` / collision props / 移动端 Select 行为后，可继续收敛保留项。
2. `alert.tsx`、`form.tsx`、`popover.tsx` 若要迁移，需要 chaos-ui 上游支持或业务侧改造，建议单独评估。
3. 后端 API 契约未做任何改动；本迁移仅限前端 UI 基础层。
