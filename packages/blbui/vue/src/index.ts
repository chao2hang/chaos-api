/*
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
*/

import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  type PropType,
  type VNode,
} from "vue";
import { registerAdminElements } from "@chaos_team/blbui-core/register";
import type {
  AdminButtonSize,
  AdminButtonVariant,
  AdminNavItem,
  AdminSelectOption,
  AdminStatus,
  AdminTabItem,
} from "@chaos_team/blbui-core";

import "@chaos_team/blbui-core/styles.css";

type AdminElement = HTMLElement & Record<string, unknown>;

type ElementOptions = {
  tag: string;
  properties?: string[];
  event?: string;
  eventProp?: string;
  events?: Array<{ name: string; prop: string }>;
  slots?: string[];
};

function syncAdminElement(
  element: AdminElement | null,
  properties: string[],
  props: Record<string, unknown>,
): void {
  if (!element) return;
  for (const property of properties) {
    if (props[property] !== undefined) element[property] = props[property];
  }
}

function registerVueAdminElementLifecycle(
  element: { value: AdminElement | null },
  options: ElementOptions,
  props: Record<string, unknown>,
): void {
  const sync = () => syncAdminElement(element.value, options.properties ?? [], props);
  onMounted(() => {
    registerAdminElements();
    sync();
    const bindings = [
      ...(options.event && options.eventProp
        ? [{ name: options.event, prop: options.eventProp }]
        : []),
      ...(options.events ?? []),
    ];
    const cleanups: Array<() => void> = [];
    for (const binding of bindings) {
      const callback = props[binding.prop];
      if (typeof callback !== "function") continue;
      const handler = (event: Event) =>
        (callback as (detail: unknown) => void)((event as CustomEvent).detail);
      element.value?.addEventListener(binding.name, handler);
      cleanups.push(() => element.value?.removeEventListener(binding.name, handler));
    }
    onBeforeUnmount(() => cleanups.forEach((cleanup) => cleanup()));
  });
  onUpdated(sync);
}

function createAdminVNode(
  options: ElementOptions,
  element: { value: AdminElement | null },
  props: Record<string, unknown>,
  slots: Record<string, (() => VNode[] | undefined) | undefined>,
) {
  const attributes: Record<string, unknown> = {
    ref: (node: AdminElement | null) => {
      element.value = node;
    },
  };
  for (const [key, value] of Object.entries(props)) {
    if (
      key !== "children" &&
      !options.properties?.includes(key) &&
      key !== options.eventProp &&
      !(options.events ?? []).some((event) => event.prop === key) &&
      value !== undefined
    ) {
      attributes[key] = value;
    }
  }
  const children: VNode[] = [];
  for (const slotName of options.slots ?? []) {
    const slot = slots[slotName]?.();
    if (slot?.length) children.push(...slot.map((node) => h("span", { slot: slotName }, [node])));
  }
  const defaultSlot = slots.default?.();
  if (defaultSlot?.length) children.push(...defaultSlot);
  return h(options.tag, attributes, children);
}

function setupVueAdminComponent(
  options: ElementOptions,
  props: Record<string, unknown>,
  context: { attrs: Record<string, unknown>; slots: Record<string, unknown> },
  slots: Record<string, (() => VNode[] | undefined) | undefined>,
) {
  const vueContext = context;
  const element = { value: null as AdminElement | null };
  registerVueAdminElementLifecycle(element, options, props);
  return () =>
    createAdminVNode(options, element, { ...props, ...vueContext.attrs }, {
      ...slots,
      ...vueContext.slots,
    } as Record<string, (() => VNode[] | undefined) | undefined>);
}

export const AdminButton = defineComponent({
  name: "AdminButton",
  inheritAttrs: false,
  props: {
    variant: { type: String as PropType<AdminButtonVariant>, default: "secondary" },
    size: { type: String as PropType<AdminButtonSize>, default: "default" },
    loading: Boolean,
    disabled: Boolean,
    type: { type: String as PropType<"button" | "submit" | "reset">, default: "button" },
  },
  setup(props, context) {
    return setupVueAdminComponent(
      { tag: "aui-button", properties: ["variant", "size", "loading", "disabled", "type"] },
      props,
      context,
      {},
    );
  },
});

export const AdminCard = defineComponent({
  name: "AdminCard",
  inheritAttrs: false,
  setup(props, context) {
    return setupVueAdminComponent(
      { tag: "aui-card", slots: ["header", "footer"] },
      props,
      context,
      {},
    );
  },
});

export const AdminInput = defineComponent({
  name: "AdminInput",
  inheritAttrs: false,
  props: {
    value: String,
    type: { type: String, default: "text" },
    name: String,
    placeholder: String,
    disabled: Boolean,
    invalid: Boolean,
  },
  emits: ["update:value", "value-change"],
  setup(props, context) {
    const onValueChange = (detail: { value: string }) => {
      context.emit("update:value", detail.value);
      context.emit("value-change", detail.value);
    };
    return setupVueAdminComponent(
      {
        tag: "aui-input",
        properties: ["value", "type", "name", "placeholder", "disabled", "invalid"],
        event: "aui-input",
        eventProp: "onValueChange",
      },
      { ...props, onValueChange },
      context,
      {},
    );
  },
});

export const AdminSelect = defineComponent({
  name: "AdminSelect",
  inheritAttrs: false,
  props: {
    value: String,
    name: String,
    disabled: Boolean,
    invalid: Boolean,
    options: { type: Array as PropType<AdminSelectOption[]>, default: () => [] },
  },
  emits: ["update:value", "value-change"],
  setup(props, context) {
    const onValueChange = (detail: { value: string }) => {
      context.emit("update:value", detail.value);
      context.emit("value-change", detail.value);
    };
    return setupVueAdminComponent(
      {
        tag: "aui-select",
        properties: ["value", "name", "disabled", "invalid", "options"],
        event: "aui-change",
        eventProp: "onValueChange",
      },
      { ...props, onValueChange },
      context,
      {},
    );
  },
});

export const AdminTextarea = defineComponent({
  name: "AdminTextarea",
  inheritAttrs: false,
  props: {
    value: String,
    name: String,
    placeholder: String,
    rows: { type: Number, default: 4 },
    disabled: Boolean,
    invalid: Boolean,
  },
  emits: ["update:value", "value-change"],
  setup(props, context) {
    const onValueChange = (detail: { value: string }) => {
      context.emit("update:value", detail.value);
      context.emit("value-change", detail.value);
    };
    return setupVueAdminComponent(
      {
        tag: "aui-textarea",
        properties: ["value", "name", "placeholder", "rows", "disabled", "invalid"],
        event: "aui-input",
        eventProp: "onValueChange",
      },
      { ...props, onValueChange },
      context,
      {},
    );
  },
});

function checkableComponent(tag: "aui-checkbox" | "aui-switch", name: string) {
  return defineComponent({
    name,
    inheritAttrs: false,
    props: { checked: Boolean, disabled: Boolean, label: String },
    emits: ["update:checked", "checked-change"],
    setup(props, context) {
      const onCheckedChange = (detail: { checked: boolean }) => {
        context.emit("update:checked", detail.checked);
        context.emit("checked-change", detail.checked);
      };
      return setupVueAdminComponent(
        {
          tag,
          properties: ["checked", "disabled", "label"],
          event: "aui-checked-change",
          eventProp: "onCheckedChange",
        },
        { ...props, onCheckedChange },
        context,
        {},
      );
    },
  });
}

export const AdminCheckbox = checkableComponent("aui-checkbox", "AdminCheckbox");
export const AdminSwitch = checkableComponent("aui-switch", "AdminSwitch");

export const AdminSkeleton = defineComponent({
  name: "AdminSkeleton",
  inheritAttrs: false,
  props: { width: String, height: String },
  setup(props, context) {
    return setupVueAdminComponent(
      { tag: "aui-skeleton", properties: ["width", "height"] },
      props,
      context,
      {},
    );
  },
});

export const AdminSeparator = defineComponent({
  name: "AdminSeparator",
  inheritAttrs: false,
  props: { vertical: Boolean },
  setup(props, context) {
    return setupVueAdminComponent(
      { tag: "aui-separator", properties: ["vertical"] },
      props,
      context,
      {},
    );
  },
});

export const AdminCopyableText = defineComponent({
  name: "AdminCopyableText",
  inheritAttrs: false,
  props: { text: { type: String, required: true }, copyLabel: String, copiedLabel: String },
  emits: ["copy"],
  setup(props, context) {
    const onCopy = (detail: { text: string }) => context.emit("copy", detail.text);
    return setupVueAdminComponent(
      {
        tag: "aui-copyable-text",
        properties: ["text", "copyLabel", "copiedLabel"],
        event: "aui-copy",
        eventProp: "onCopy",
      },
      { ...props, onCopy },
      context,
      {},
    );
  },
});

export const AdminStatusTag = defineComponent({
  name: "AdminStatusTag",
  inheritAttrs: false,
  props: { status: { type: String as PropType<AdminStatus>, default: "default" } },
  setup(props, context) {
    return setupVueAdminComponent(
      { tag: "aui-status-tag", properties: ["status"] },
      props,
      context,
      {},
    );
  },
});

function stateComponent(tag: string, name: string) {
  return defineComponent({
    name,
    inheritAttrs: false,
    props: { title: String, description: String },
    setup(props, context) {
      return setupVueAdminComponent(
        { tag, properties: ["title", "description"] },
        props,
        context,
        {},
      );
    },
  });
}

export const AdminEmptyState = stateComponent("aui-empty-state", "AdminEmptyState");
export const AdminErrorState = stateComponent("aui-error-state", "AdminErrorState");

export const AdminPage = defineComponent({
  name: "AdminPage",
  inheritAttrs: false,
  props: { title: { type: String, required: true }, description: String },
  setup(props, context) {
    return setupVueAdminComponent(
      { tag: "aui-page", properties: ["title", "description"], slots: ["actions"] },
      props,
      context,
      {},
    );
  },
});

export const AdminPageHeader = defineComponent({
  name: "AdminPageHeader",
  inheritAttrs: false,
  props: { title: { type: String, required: true }, description: String },
  setup(props, context) {
    return setupVueAdminComponent(
      { tag: "aui-page-header", properties: ["title", "description"], slots: ["actions"] },
      props,
      context,
      {},
    );
  },
});

export const AdminStat = defineComponent({
  name: "AdminStat",
  inheritAttrs: false,
  props: {
    label: { type: String, required: true },
    value: { type: String, required: true },
    unit: String,
    trend: String,
  },
  setup(props, context) {
    return setupVueAdminComponent(
      { tag: "aui-stat", properties: ["label", "value", "unit", "trend"] },
      props,
      context,
      {},
    );
  },
});

export const AdminFilterBar = defineComponent({
  name: "AdminFilterBar",
  inheritAttrs: false,
  setup(props, context) {
    return setupVueAdminComponent({ tag: "aui-filter-bar" }, props, context, {});
  },
});

export const AdminTable = defineComponent({
  name: "AdminTable",
  inheritAttrs: false,
  props: { loading: Boolean, empty: Boolean, loadingLabel: String, emptyLabel: String },
  setup(props, context) {
    return setupVueAdminComponent(
      { tag: "aui-table", properties: ["loading", "empty", "loadingLabel", "emptyLabel"] },
      props,
      context,
      {},
    );
  },
});

export const AdminPagination = defineComponent({
  name: "AdminPagination",
  inheritAttrs: false,
  props: {
    page: { type: Number, default: 1 },
    totalPages: { type: Number, default: 1 },
    total: { type: Number, default: 0 },
    pageSize: { type: Number, default: 10 },
    previousLabel: { type: String, default: "PREV" },
    nextLabel: { type: String, default: "NEXT" },
  },
  emits: ["page-change"],
  setup(props, context) {
    const onPageChange = (detail: { page: number }) => context.emit("page-change", detail.page);
    return setupVueAdminComponent(
      {
        tag: "aui-pagination",
        properties: ["page", "totalPages", "total", "pageSize", "previousLabel", "nextLabel"],
        event: "aui-page-change",
        eventProp: "onPageChange",
      },
      { ...props, onPageChange },
      context,
      {},
    );
  },
});

export const AdminTabs = defineComponent({
  name: "AdminTabs",
  inheritAttrs: false,
  props: { items: { type: Array as PropType<AdminTabItem[]>, default: () => [] }, active: String },
  emits: ["tab-change"],
  setup(props, context) {
    const onTabChange = (detail: { id: string }) => context.emit("tab-change", detail.id);
    return setupVueAdminComponent(
      {
        tag: "aui-tabs",
        properties: ["items", "active"],
        event: "aui-tab-change",
        eventProp: "onTabChange",
      },
      { ...props, onTabChange },
      context,
      {},
    );
  },
});

export const AdminConfirmDialog = defineComponent({
  name: "AdminConfirmDialog",
  inheritAttrs: false,
  props: {
    open: Boolean,
    title: String,
    description: String,
    confirmLabel: { type: String, default: "Confirm" },
    cancelLabel: { type: String, default: "Cancel" },
    loading: Boolean,
    danger: Boolean,
  },
  emits: ["update:open", "confirm", "cancel", "close"],
  setup(props, context) {
    const onConfirm = () => context.emit("confirm");
    const onCancel = () => {
      context.emit("update:open", false);
      context.emit("cancel");
    };
    const onOpenChange = (detail: { open: boolean }) => {
      context.emit("update:open", detail.open);
      context.emit("close", detail.open);
    };
    return setupVueAdminComponent(
      {
        tag: "aui-confirm-dialog",
        properties: [
          "open",
          "title",
          "description",
          "confirmLabel",
          "cancelLabel",
          "loading",
          "danger",
        ],
        events: [
          { name: "aui-confirm", prop: "onConfirm" },
          { name: "aui-cancel", prop: "onCancel" },
          { name: "aui-close", prop: "onOpenChange" },
        ],
      },
      { ...props, onConfirm, onCancel, onOpenChange },
      context,
      {},
    );
  },
});

export const AdminDialog = defineComponent({
  name: "AdminDialog",
  inheritAttrs: false,
  props: {
    open: Boolean,
    title: String,
    description: String,
    closeLabel: { type: String, default: "Close" },
  },
  emits: ["update:open", "close"],
  setup(props, context) {
    const onOpenChange = (detail: { open: boolean }) => {
      context.emit("update:open", detail.open);
      context.emit("close", detail.open);
    };
    return setupVueAdminComponent(
      {
        tag: "aui-dialog",
        properties: ["open", "title", "description", "closeLabel"],
        event: "aui-close",
        eventProp: "onOpenChange",
        slots: ["footer", "title", "description"],
      },
      { ...props, onOpenChange },
      context,
      {},
    );
  },
});

export const AdminNav = defineComponent({
  name: "AdminNav",
  inheritAttrs: false,
  props: { items: { type: Array as PropType<AdminNavItem[]>, default: () => [] } },
  emits: ["navigate"],
  setup(props, context) {
    const onNavigate = (detail: { id: string }) => context.emit("navigate", detail.id);
    return setupVueAdminComponent(
      { tag: "aui-nav", properties: ["items"], event: "aui-nav-change", eventProp: "onNavigate" },
      { ...props, onNavigate },
      context,
      {},
    );
  },
});

export const AdminBreadcrumb = defineComponent({
  name: "AdminBreadcrumb",
  inheritAttrs: false,
  props: { items: { type: Array as PropType<string[]>, default: () => [] } },
  setup(props, context) {
    return setupVueAdminComponent(
      { tag: "aui-breadcrumb", properties: ["items"] },
      props,
      context,
      {},
    );
  },
});

export const AdminShell = defineComponent({
  name: "AdminShell",
  inheritAttrs: false,
  setup(props, context) {
    return setupVueAdminComponent(
      { tag: "aui-shell", slots: ["sidebar", "header"] },
      props,
      context,
      {},
    );
  },
});

export { registerAdminElements };
export type {
  AdminButtonSize,
  AdminButtonVariant,
  AdminNavItem,
  AdminSelectOption,
  AdminStatus,
  AdminTabItem,
};
