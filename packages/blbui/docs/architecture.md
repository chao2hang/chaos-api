# BLBUI 架构与封装准则

## 组件来源与借鉴边界

- **Base UI / Radix**：借鉴原生语义、受控状态、键盘焦点和 ARIA 设计。
- **Shoelace / Lit**：借鉴 Custom Elements、属性/property 分离和框架无关核心。
- **Ant Design / Arco Design**：借鉴后台场景下的表格、分页、筛选器、空/错/加载状态组合。
- **Melt UI / Headless UI**：借鉴“行为与视觉分离”的适配层思路。
- **本项目规范**：覆盖上述系统的默认视觉，工业后台必须遵循黑白层级、零圆角、锐利边框、等宽数据字体和克制动效。

不会复制第三方库的品牌样式、API 或实现代码；只提取成熟的交互契约。

## 属性与事件

- 简单值使用 HTML attribute，同时在框架绑定中写入 DOM property。
- 数组/对象（如 `items`、`options`）必须通过 property 传递，不能序列化到 attribute。
- Core 事件使用 kebab-case `aui-*`。
- React 适配层负责事件监听和 ref，不把自定义事件交给 React 的 JSX 属性自动猜测。
- Vue 适配层负责 `v-model:value` / `v-model:open` 和 kebab-case 事件。
- Svelte 直接消费 Custom Elements，类型声明扩展事件和 property。

## 可访问性

- 按钮、输入、选择器、分页、tabs、dialog 使用原生元素。
- 选中状态同时输出 `aria-selected` 或 `aria-current`。
- 禁用状态使用真实 `disabled`；不可用导航使用 `aria-disabled`。
- Dialog 使用原生 `<dialog>`，支持 ESC 关闭和 backdrop 点击关闭。
- 每个需要传达状态的区域拥有 `role=status` 或 `role=alert`。

## 下一阶段

- Dropdown / Combobox / DatePicker
- ConfirmDialog / Toast
- Checkbox / Switch / Textarea / Field
- 可配置列的 DataTable 与虚拟滚动适配
- SSR hydration 检查和三框架最小示例应用
- Playwright 跨框架行为矩阵
