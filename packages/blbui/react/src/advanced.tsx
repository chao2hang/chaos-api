/*
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
*/

import {
  createElement,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";
import { registerAdminElements } from "@chaos_team/blbui-core/register";
import type {
  AdminAlertVariant,
  AdminDataGridColumn,
  AdminKanbanColumn,
  AdminListItem,
  AdminLogEntry,
  AdminMenuItem,
  AdminOption,
  AdminStatus,
  AdminTreeNode,
} from "@chaos_team/blbui-core";

import "@chaos_team/blbui-core/styles.css";

type ElementProps = {
  children?: ReactNode;
  className?: string;
  id?: string;
  [key: string]: unknown;
};
type CustomElement = HTMLElement & Record<string, unknown>;

type Binding = {
  element: RefObject<CustomElement | null>;
  setRef: (node: CustomElement | null) => void;
};

let registered = false;
function ensureRegistered(): void {
  if (!registered && typeof customElements !== "undefined") {
    registerAdminElements();
    registered = true;
  }
}

function useBinding(
  externalRef: Ref<HTMLElement> | undefined,
  properties: Record<string, unknown> = {},
  events: Record<string, ((detail: never) => void) | undefined> = {},
): Binding {
  ensureRegistered();
  useEffect(() => ensureRegistered(), []);
  const element = useRef<CustomElement | null>(null);
  const setRef = useCallback(
    (node: CustomElement | null) => {
      element.current = node;
      if (typeof externalRef === "function") externalRef(node);
      else if (externalRef) Reflect.set(externalRef, "current", node);
    },
    [externalRef],
  );
  useEffect(() => {
    const node = element.current;
    if (!node) return;
    for (const [name, value] of Object.entries(properties)) {
      if (value !== undefined) Reflect.set(node, name, value);
    }
  }, [properties, element]);
  useEffect(() => {
    const node = element.current;
    if (!node) return;
    const cleanups: Array<() => void> = [];
    for (const [name, callback] of Object.entries(events)) {
      if (!callback) continue;
      const handler = (event: Event) =>
        (callback as (detail: unknown) => void)((event as CustomEvent).detail);
      node.addEventListener(name, handler);
      cleanups.push(() => node.removeEventListener(name, handler));
    }
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [events, element]);
  return { element, setRef };
}

function elementProps(
  props: ElementProps,
  properties: string[],
  events: string[] = [],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (
      !properties.includes(key) &&
      !events.includes(key) &&
      key !== "children" &&
      value !== undefined
    ) {
      result[key] = value;
    }
  }
  return result;
}

export interface AdminComboboxProps extends ElementProps {
  options?: AdminOption[];
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  open?: boolean;
  onChange?: (value: string) => void;
}
export function AdminCombobox(props: AdminComboboxProps) {
  const { options, value, placeholder, disabled, open, onChange, ...rest } = props;
  const { setRef } = useBinding(
    undefined,
    { options, value, placeholder, disabled, open },
    { "aui-change": onChange ? (detail: { value: string }) => onChange(detail.value) : undefined },
  );
  return createElement("aui-combobox", {
    ...elementProps(props, ["options", "value", "placeholder", "disabled", "open"], ["onChange"]),
    ...rest,
    ref: setRef,
  });
}

export interface AdminMultiSelectProps extends ElementProps {
  options?: AdminOption[];
  values?: string[];
  placeholder?: string;
  disabled?: boolean;
  open?: boolean;
  onChange?: (values: string[]) => void;
}
export function AdminMultiSelect(props: AdminMultiSelectProps) {
  const { options, values, placeholder, disabled, open, onChange, ...rest } = props;
  const { setRef } = useBinding(
    undefined,
    { options, values, placeholder, disabled, open },
    {
      "aui-change": onChange
        ? (detail: { values: string[] }) => onChange(detail.values)
        : undefined,
    },
  );
  return createElement("aui-multi-select", {
    ...elementProps(props, ["options", "values", "placeholder", "disabled", "open"], ["onChange"]),
    ...rest,
    ref: setRef,
  });
}

export interface AdminCommandProps extends ElementProps {
  items?: AdminOption[];
  open?: boolean;
  placeholder?: string;
  onSelect?: (value: string) => void;
}
export function AdminCommand(props: AdminCommandProps) {
  const { items, open, placeholder, onSelect, ...rest } = props;
  const { setRef } = useBinding(
    undefined,
    { items, open, placeholder },
    { "aui-command": onSelect ? (detail: { id: string }) => onSelect(detail.id) : undefined },
  );
  return createElement("aui-command", {
    ...elementProps(props, ["items", "open", "placeholder"], ["onSelect"]),
    ...rest,
    ref: setRef,
  });
}

export interface AdminDateRangeProps extends ElementProps {
  start?: string;
  end?: string;
  startLabel?: string;
  endLabel?: string;
  disabled?: boolean;
  onChange?: (range: { start: string; end: string }) => void;
}
export function AdminDateRange(props: AdminDateRangeProps) {
  const { start, end, startLabel, endLabel, disabled, onChange, ...rest } = props;
  const { setRef } = useBinding(
    undefined,
    { start, end, startLabel, endLabel, disabled },
    {
      "aui-range-change": onChange
        ? (detail: { start: string; end: string }) => onChange(detail)
        : undefined,
    },
  );
  return createElement("aui-date-range", {
    ...elementProps(props, ["start", "end", "startLabel", "endLabel", "disabled"], ["onChange"]),
    ...rest,
    ref: setRef,
  });
}

export interface AdminTagInputProps extends ElementProps {
  values?: string[];
  placeholder?: string;
  disabled?: boolean;
  onChange?: (values: string[]) => void;
}
export function AdminTagInput(props: AdminTagInputProps) {
  const { values, placeholder, disabled, onChange, ...rest } = props;
  const { setRef } = useBinding(
    undefined,
    { values, placeholder, disabled },
    {
      "aui-tags-change": onChange
        ? (detail: { values: string[] }) => onChange(detail.values)
        : undefined,
    },
  );
  return createElement("aui-tag-input", {
    ...elementProps(props, ["values", "placeholder", "disabled"], ["onChange"]),
    ...rest,
    ref: setRef,
  });
}

export interface AdminStackProps extends ElementProps {
  direction?: "vertical" | "horizontal";
  gap?: string;
  align?: string;
  justify?: string;
}
export function AdminStack(props: AdminStackProps) {
  const { direction, gap, align, justify, ...rest } = props;
  const { setRef } = useBinding(undefined, { direction, gap, align, justify });
  return createElement(
    "aui-stack",
    { ...elementProps(props, ["direction", "gap", "align", "justify"]), ...rest, ref: setRef },
    props.children,
  );
}

export interface AdminGridProps extends ElementProps {
  columns?: number;
  gap?: string;
  minWidth?: string;
}
export function AdminGrid(props: AdminGridProps) {
  const { columns, gap, minWidth, ...rest } = props;
  const { setRef } = useBinding(undefined, { columns, gap, minWidth });
  return createElement(
    "aui-grid",
    { ...elementProps(props, ["columns", "gap", "minWidth"]), ...rest, ref: setRef },
    props.children,
  );
}

export interface AdminAlertProps extends ElementProps {
  variant?: AdminAlertVariant;
  title?: string;
  description?: string;
  closable?: boolean;
  onClose?: () => void;
}
export function AdminAlert(props: AdminAlertProps) {
  const { children, variant, title, description, closable, onClose, ...rest } = props;
  const { setRef } = useBinding(
    undefined,
    { variant, title, description, closable },
    { "aui-close": onClose ? () => onClose() : undefined },
  );
  return createElement(
    "aui-alert",
    {
      ...elementProps(props, ["variant", "title", "description", "closable"], ["onClose"]),
      ...rest,
      ref: setRef,
    },
    children,
  );
}

export interface AdminIconButtonProps extends ElementProps {
  label: string;
  icon?: string;
  variant?: "default" | "danger";
  size?: "sm" | "md";
  disabled?: boolean;
  onPress?: () => void;
}
export function AdminIconButton(props: AdminIconButtonProps) {
  const { label, icon, variant, size, disabled, onPress, ...rest } = props;
  const { setRef } = useBinding(
    undefined,
    { label, icon, variant, size, disabled },
    { "aui-press": onPress ? () => onPress() : undefined },
  );
  return createElement("aui-icon-button", {
    ...elementProps(props, ["label", "icon", "variant", "size", "disabled"], ["onPress"]),
    ...rest,
    ref: setRef,
  });
}

export interface AdminProgressProps extends ElementProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
}
export function AdminProgress(props: AdminProgressProps) {
  const { value, max, label, showValue, ...rest } = props;
  const { setRef } = useBinding(undefined, { value, max, label, showValue });
  return createElement("aui-progress", {
    ...elementProps(props, ["value", "max", "label", "showValue"]),
    ...rest,
    ref: setRef,
  });
}

export interface AdminRatingProps extends ElementProps {
  value?: number;
  max?: number;
  readOnly?: boolean;
  onChange?: (value: number) => void;
}
export function AdminRating(props: AdminRatingProps) {
  const { value, max, readOnly, onChange, ...rest } = props;
  const { setRef } = useBinding(
    undefined,
    { value, max, readonly: readOnly },
    {
      "aui-rating-change": onChange
        ? (detail: { value: number }) => onChange(detail.value)
        : undefined,
    },
  );
  return createElement("aui-rating", {
    ...elementProps(props, ["value", "max", "readOnly"], ["onChange"]),
    ...rest,
    ref: setRef,
  });
}

export function AdminKbd(props: ElementProps) {
  const { setRef } = useBinding(undefined);
  return createElement("aui-kbd", { ...elementProps(props, []), ref: setRef }, props.children);
}
export interface AdminResultProps extends ElementProps {
  status?: "info" | "success" | "warning" | "error";
  title: string;
  description?: string;
}
export function AdminResult(props: AdminResultProps) {
  const { status, title, description, ...rest } = props;
  const { setRef } = useBinding(undefined, { status, title, description });
  return createElement(
    "aui-result",
    { ...elementProps(props, ["status", "title", "description"]), ...rest, ref: setRef },
    props.children,
  );
}

export interface AdminFieldProps extends ElementProps {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
}
export function AdminField(props: AdminFieldProps) {
  const { label, description, error, required, ...rest } = props;
  const { setRef } = useBinding(undefined, { label, description, error, required });
  return createElement(
    "aui-field",
    { ...elementProps(props, ["label", "description", "error", "required"]), ...rest, ref: setRef },
    props.children,
  );
}
export function AdminInputGroup(props: ElementProps) {
  const { setRef } = useBinding(undefined);
  return createElement(
    "aui-input-group",
    { ...elementProps(props, []), ref: setRef },
    props.children,
  );
}

export interface AdminRadioGroupProps extends ElementProps {
  options?: AdminOption[];
  value?: string;
  orientation?: "horizontal" | "vertical";
  onChange?: (value: string) => void;
}
export function AdminRadioGroup(props: AdminRadioGroupProps) {
  const { options, value, orientation, onChange, ...rest } = props;
  const { setRef } = useBinding(
    undefined,
    { options, value, orientation },
    {
      "aui-radio-change": onChange
        ? (detail: { value: string }) => onChange(detail.value)
        : undefined,
    },
  );
  return createElement(
    "aui-radio-group",
    {
      ...elementProps(props, ["options", "value", "orientation"], ["onChange"]),
      ...rest,
      ref: setRef,
    },
    props.children,
  );
}
export interface AdminSliderProps extends ElementProps {
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  showValue?: boolean;
  disabled?: boolean;
  onChange?: (value: number) => void;
}
export function AdminSlider(props: AdminSliderProps) {
  const { value, min, max, step, label, showValue, disabled, onChange, ...rest } = props;
  const { setRef } = useBinding(
    undefined,
    { value, min, max, step, label, showValue, disabled },
    {
      "aui-slider-change": onChange
        ? (detail: { value: number }) => onChange(detail.value)
        : undefined,
    },
  );
  return createElement("aui-slider", {
    ...elementProps(
      props,
      ["value", "min", "max", "step", "label", "showValue", "disabled"],
      ["onChange"],
    ),
    ...rest,
    ref: setRef,
  });
}
export interface AdminPasswordInputProps extends ElementProps {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  revealLabel?: string;
  hideLabel?: string;
  onValueChange?: (value: string) => void;
}
export function AdminPasswordInput(props: AdminPasswordInputProps) {
  const { value, placeholder, disabled, revealLabel, hideLabel, onValueChange, ...rest } = props;
  const { setRef } = useBinding(
    undefined,
    { value, placeholder, disabled, revealLabel, hideLabel },
    {
      "aui-input": onValueChange
        ? (detail: { value: string }) => onValueChange(detail.value)
        : undefined,
    },
  );
  return createElement("aui-password-input", {
    ...elementProps(
      props,
      ["value", "placeholder", "disabled", "revealLabel", "hideLabel"],
      ["onValueChange"],
    ),
    ...rest,
    ref: setRef,
  });
}
export interface AdminFileUploadProps extends ElementProps {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  label?: string;
  hint?: string;
  onFilesChange?: (files: File[]) => void;
}
export function AdminFileUpload(props: AdminFileUploadProps) {
  const { accept, multiple, disabled, label, hint, onFilesChange, ...rest } = props;
  const { setRef } = useBinding(
    undefined,
    { accept, multiple, disabled, label, hint },
    {
      "aui-files-change": onFilesChange
        ? (detail: { files: File[] }) => onFilesChange(detail.files)
        : undefined,
    },
  );
  return createElement("aui-file-upload", {
    ...elementProps(props, ["accept", "multiple", "disabled", "label", "hint"], ["onFilesChange"]),
    ...rest,
    ref: setRef,
  });
}

export interface AdminAccordionProps extends ElementProps {
  items?: Array<{ id: string; label: string; content: string; disabled?: boolean }>;
  multiple?: boolean;
}
export function AdminAccordion(props: AdminAccordionProps) {
  const { items, multiple, ...rest } = props;
  const { setRef } = useBinding(undefined, { items, multiple });
  return createElement(
    "aui-accordion",
    { ...elementProps(props, ["items", "multiple"]), ...rest, ref: setRef },
    props.children,
  );
}
export interface AdminStepperProps extends ElementProps {
  items?: Array<{ label: string; description?: string }>;
  active?: number;
  orientation?: "horizontal" | "vertical";
}
export function AdminStepper(props: AdminStepperProps) {
  const { items, active, orientation, ...rest } = props;
  const { setRef } = useBinding(undefined, { items, active, orientation });
  return createElement("aui-stepper", {
    ...elementProps(props, ["items", "active", "orientation"]),
    ...rest,
    ref: setRef,
  });
}
export interface AdminSegmentedProps extends ElementProps {
  items?: AdminListItem[];
  value?: string;
  onChange?: (value: string) => void;
}
export function AdminSegmented(props: AdminSegmentedProps) {
  const { items, value, onChange, ...rest } = props;
  const { setRef } = useBinding(
    undefined,
    { items, value },
    {
      "aui-segment-change": onChange
        ? (detail: { value: string }) => onChange(detail.value)
        : undefined,
    },
  );
  return createElement("aui-segmented", {
    ...elementProps(props, ["items", "value"], ["onChange"]),
    ...rest,
    ref: setRef,
  });
}
export interface AdminListProps extends ElementProps {
  items?: AdminListItem[];
  selected?: string;
  selectable?: boolean;
  onChange?: (id: string) => void;
}
export function AdminList(props: AdminListProps) {
  const { items, selected, selectable, onChange, ...rest } = props;
  const { setRef } = useBinding(
    undefined,
    { items, selected, selectable },
    { "aui-list-change": onChange ? (detail: { id: string }) => onChange(detail.id) : undefined },
  );
  return createElement("aui-list", {
    ...elementProps(props, ["items", "selected", "selectable"], ["onChange"]),
    ...rest,
    ref: setRef,
  });
}
export interface AdminTreeProps extends ElementProps {
  nodes?: AdminTreeNode[];
  selected?: string;
  expanded?: string[];
  onChange?: (id: string) => void;
}
export function AdminTree(props: AdminTreeProps) {
  const { nodes, selected, expanded, onChange, ...rest } = props;
  const { setRef } = useBinding(
    undefined,
    { nodes, selected, expanded },
    { "aui-tree-change": onChange ? (detail: { id: string }) => onChange(detail.id) : undefined },
  );
  return createElement("aui-tree", {
    ...elementProps(props, ["nodes", "selected", "expanded"], ["onChange"]),
    ...rest,
    ref: setRef,
  });
}
export interface AdminTimelineProps extends ElementProps {
  items?: Array<{ title: string; time?: string; description?: string; status?: AdminStatus }>;
}
export function AdminTimeline(props: AdminTimelineProps) {
  const { items, ...rest } = props;
  const { setRef } = useBinding(undefined, { items });
  return createElement("aui-timeline", { ...elementProps(props, ["items"]), ...rest, ref: setRef });
}

export interface AdminTooltipProps extends ElementProps {
  content?: string;
  side?: "top" | "bottom";
}
export function AdminTooltip(props: AdminTooltipProps) {
  const { content, side, ...rest } = props;
  const { setRef } = useBinding(undefined, { content, side });
  return createElement(
    "aui-tooltip",
    { ...elementProps(props, ["content", "side"]), ...rest, ref: setRef },
    props.children,
  );
}
export interface AdminPopoverProps extends ElementProps {
  open?: boolean;
  title?: string;
  onOpenChange?: (open: boolean) => void;
}
export function AdminPopover(props: AdminPopoverProps) {
  const { open, title, onOpenChange, ...rest } = props;
  const { setRef } = useBinding(
    undefined,
    { open, title },
    {
      "aui-open-change": onOpenChange
        ? (detail: { open: boolean }) => onOpenChange(detail.open)
        : undefined,
    },
  );
  return createElement(
    "aui-popover",
    { ...elementProps(props, ["open", "title"], ["onOpenChange"]), ...rest, ref: setRef },
    props.children,
  );
}
export interface AdminDropdownProps extends ElementProps {
  items?: AdminMenuItem[];
  open?: boolean;
  onSelect?: (id: string) => void;
}
export function AdminDropdown(props: AdminDropdownProps) {
  const { items, open, onSelect, ...rest } = props;
  const { setRef } = useBinding(
    undefined,
    { items, open },
    { "aui-menu-select": onSelect ? (detail: { id: string }) => onSelect(detail.id) : undefined },
  );
  return createElement(
    "aui-dropdown",
    { ...elementProps(props, ["items", "open"], ["onSelect"]), ...rest, ref: setRef },
    props.children,
  );
}
export interface AdminDrawerProps extends ElementProps {
  open?: boolean;
  title?: string;
  side?: "left" | "right";
  width?: string;
  onOpenChange?: (open: boolean) => void;
}
export function AdminDrawer(props: AdminDrawerProps) {
  const { open, title, side, width, onOpenChange, ...rest } = props;
  const { setRef } = useBinding(
    undefined,
    { open, title, side, width },
    {
      "aui-close": onOpenChange
        ? (detail: { open: boolean }) => onOpenChange(detail.open)
        : undefined,
    },
  );
  return createElement(
    "aui-drawer",
    {
      ...elementProps(props, ["open", "title", "side", "width"], ["onOpenChange"]),
      ...rest,
      ref: setRef,
    },
    props.children,
  );
}
export interface AdminToastProps extends ElementProps {
  open?: boolean;
  title?: string;
  message?: string;
  variant?: AdminAlertVariant | "default";
  duration?: number;
  onClose?: () => void;
}
export function AdminToast(props: AdminToastProps) {
  const { open, title, message, variant, duration, onClose, ...rest } = props;
  const { setRef } = useBinding(
    undefined,
    { open, title, message, variant, duration },
    { "aui-close": onClose ? () => onClose() : undefined },
  );
  return createElement(
    "aui-toast",
    {
      ...elementProps(props, ["open", "title", "message", "variant", "duration"], ["onClose"]),
      ...rest,
      ref: setRef,
    },
    props.children,
  );
}

export interface AdminDataListProps extends ElementProps {
  items?: Array<{ label: string; value: string }>;
}
export function AdminDataList(props: AdminDataListProps) {
  const { items, ...rest } = props;
  const { setRef } = useBinding(undefined, { items });
  return createElement("aui-data-list", {
    ...elementProps(props, ["items"]),
    ...rest,
    ref: setRef,
  });
}
export interface AdminCalendarProps extends ElementProps {
  value?: string;
  min?: string;
  max?: string;
  label?: string;
  onChange?: (value: string) => void;
}
export function AdminCalendar(props: AdminCalendarProps) {
  const { value, min, max, label, onChange, ...rest } = props;
  const { setRef } = useBinding(
    undefined,
    { value, min, max, label },
    {
      "aui-date-change": onChange
        ? (detail: { value: string }) => onChange(detail.value)
        : undefined,
    },
  );
  return createElement("aui-calendar", {
    ...elementProps(props, ["value", "min", "max", "label"], ["onChange"]),
    ...rest,
    ref: setRef,
  });
}
export interface AdminSearchProps extends ElementProps {
  value?: string;
  placeholder?: string;
  debounce?: number;
  onSearch?: (value: string) => void;
}
export function AdminSearch(props: AdminSearchProps) {
  const { value, placeholder, debounce, onSearch, ...rest } = props;
  const { setRef } = useBinding(
    undefined,
    { value, placeholder, debounce },
    { "aui-search": onSearch ? (detail: { value: string }) => onSearch(detail.value) : undefined },
  );
  return createElement("aui-search", {
    ...elementProps(props, ["value", "placeholder", "debounce"], ["onSearch"]),
    ...rest,
    ref: setRef,
  });
}
export interface AdminCalendarGridProps extends ElementProps {
  month?: number;
  year?: number;
  selected?: string;
  onChange?: (value: string) => void;
}
export function AdminCalendarGrid(props: AdminCalendarGridProps) {
  const { month, year, selected, onChange, ...rest } = props;
  const { setRef } = useBinding(
    undefined,
    { month, year, selected },
    {
      "aui-date-change": onChange
        ? (detail: { value: string }) => onChange(detail.value)
        : undefined,
    },
  );
  return createElement("aui-calendar-grid", {
    ...elementProps(props, ["month", "year", "selected"], ["onChange"]),
    ...rest,
    ref: setRef,
  });
}
export interface AdminChartContainerProps extends ElementProps {
  title?: string;
  description?: string;
  height?: string;
}
export function AdminChartContainer(props: AdminChartContainerProps) {
  const { title, description, height, ...rest } = props;
  const { setRef } = useBinding(undefined, { title, description, height });
  return createElement(
    "aui-chart-container",
    { ...elementProps(props, ["title", "description", "height"]), ...rest, ref: setRef },
    props.children,
  );
}

export interface AdminJsonViewerProps extends ElementProps {
  value: unknown;
  title?: string;
  expanded?: boolean;
}
export function AdminJsonViewer(props: AdminJsonViewerProps) {
  const { value, title, expanded, ...rest } = props;
  const { setRef } = useBinding(undefined, { value, title, expanded });
  return createElement(
    "aui-json-viewer",
    { ...elementProps(props, ["value", "title", "expanded"]), ...rest, ref: setRef },
    props.children,
  );
}
export interface AdminLogViewerProps extends ElementProps {
  entries?: AdminLogEntry[];
  follow?: boolean;
}
export function AdminLogViewer(props: AdminLogViewerProps) {
  const { entries, follow, ...rest } = props;
  const { setRef } = useBinding(undefined, { entries, follow });
  return createElement(
    "aui-log-viewer",
    { ...elementProps(props, ["entries", "follow"]), ...rest, ref: setRef },
    props.children,
  );
}
export interface AdminDataGridProps extends ElementProps {
  columns?: AdminDataGridColumn[];
  rows?: Array<Record<string, unknown>>;
  loading?: boolean;
  emptyLabel?: string;
}
export function AdminDataGrid(props: AdminDataGridProps) {
  const { columns, rows, loading, emptyLabel, ...rest } = props;
  const { setRef } = useBinding(undefined, { columns, rows, loading, emptyLabel });
  return createElement("aui-data-grid", {
    ...elementProps(props, ["columns", "rows", "loading", "emptyLabel"]),
    ...rest,
    ref: setRef,
  });
}
export interface AdminKanbanProps extends ElementProps {
  columns?: AdminKanbanColumn[];
  onChange?: (detail: { itemId: string; columnId: string }) => void;
}
export function AdminKanban(props: AdminKanbanProps) {
  const { columns, onChange, ...rest } = props;
  const { setRef } = useBinding(undefined, { columns }, { "aui-kanban-change": onChange });
  return createElement("aui-kanban", {
    ...elementProps(props, ["columns"], ["onChange"]),
    ...rest,
    ref: setRef,
  });
}
