/*
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
*/

import {
  createElement,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";
import { registerAdminElements } from "@chaos_team/blbui-core/register";
import type {
  AdminAvatarSize,
  AdminBadgeVariant,
  AdminButtonSize,
  AdminButtonVariant,
  AdminStatus,
  AdminSelectOption,
  AdminTabItem,
  AdminNavItem,
} from "@chaos_team/blbui-core";

import "@chaos_team/blbui-core/styles.css";

type ElementProps<T extends HTMLElement = HTMLElement> = Omit<
  ComponentPropsWithoutRef<"div">,
  "children"
> & {
  children?: ReactNode;
  ref?: Ref<T>;
};

type CustomElement = HTMLElement & Record<string, unknown>;

let registered = false;
function ensureRegistered(): void {
  if (!registered && typeof customElements !== "undefined") {
    registerAdminElements();
    registered = true;
  }
}

function useAdminElement<T extends HTMLElement>(
  externalRef: Ref<T> | undefined,
): {
  element: RefObject<T | null>;
  setRef: (node: T | null) => void;
} {
  ensureRegistered();
  useEffect(() => ensureRegistered(), []);
  const element = useRef<T | null>(null);
  const setRef = useCallback(
    (node: T | null) => {
      element.current = node;
      if (typeof externalRef === "function") externalRef(node);
      else if (externalRef) Reflect.set(externalRef, "current", node);
    },
    [externalRef],
  );
  return { element, setRef };
}

function useElementProperties(
  element: RefObject<CustomElement | null>,
  properties: Record<string, unknown>,
): void {
  useEffect(() => {
    const node = element.current;
    if (!node) return;
    for (const [name, value] of Object.entries(properties)) {
      if (value !== undefined) Reflect.set(node, name, value);
    }
  }, [element, properties]);
}

function useCustomEvent<T>(
  element: RefObject<HTMLElement | null>,
  name: string,
  callback: ((detail: T) => void) | undefined,
): void {
  useEffect(() => {
    const node = element.current;
    if (!node || !callback) return;
    const handler = (event: Event) => callback((event as CustomEvent<T>).detail);
    node.addEventListener(name, handler);
    return () => node.removeEventListener(name, handler);
  }, [element, name, callback]);
}

function renderSlot(name: string, content: ReactNode): ReactNode {
  return content ? createElement("span", { slot: name, key: name }, content) : null;
}

export interface AdminBadgeProps extends ElementProps {
  variant?: AdminBadgeVariant;
  dot?: boolean;
}
export function AdminBadge(props: AdminBadgeProps) {
  const { children, className, variant, dot, ...rest } = props;
  const { setRef, element } = useAdminElement(undefined);
  useElementProperties(element as RefObject<CustomElement | null>, { variant, dot });
  return createElement("aui-badge", { ...rest, className, ref: setRef }, children);
}

export interface AdminAvatarProps extends ElementProps {
  src?: string;
  alt?: string;
  initials?: string;
  size?: AdminAvatarSize;
}
export function AdminAvatar(props: AdminAvatarProps) {
  const { children, className, src, alt, initials, size, ...rest } = props;
  const { setRef, element } = useAdminElement(undefined);
  useElementProperties(element as RefObject<CustomElement | null>, { src, alt, initials, size });
  return createElement("aui-avatar", { ...rest, className, ref: setRef }, children);
}

export interface AdminButtonProps extends ElementProps {
  variant?: AdminButtonVariant;
  size?: AdminButtonSize;
  loading?: boolean;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

export const AdminButton = forwardRef<HTMLElement, AdminButtonProps>((props, externalRef) => {
  const { element, setRef } = useAdminElement(externalRef);
  const { children, className, variant, size, loading, disabled, type, ...rest } = props;
  useElementProperties(element as RefObject<CustomElement | null>, {
    variant,
    size,
    loading,
    disabled,
    type,
  });
  return createElement("aui-button", { ...rest, className, ref: setRef }, children);
});
AdminButton.displayName = "AdminButton";

export interface AdminCardProps extends ElementProps {
  header?: ReactNode;
  footer?: ReactNode;
}

export function AdminCard(props: AdminCardProps) {
  const { setRef } = useAdminElement(undefined);
  const { children, className, header, footer, ...rest } = props;
  return createElement("aui-card", { ...rest, className, ref: setRef }, [
    renderSlot("header", header),
    children,
    renderSlot("footer", footer),
  ]);
}

export interface AdminInputProps extends ElementProps {
  value?: string;
  type?: string;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  onValueChange?: (value: string) => void;
}

export const AdminInput = forwardRef<HTMLElement, AdminInputProps>((props, externalRef) => {
  const { element, setRef } = useAdminElement(externalRef);
  const {
    children: _children,
    className,
    onValueChange,
    value,
    type,
    name,
    placeholder,
    disabled,
    invalid,
    ...rest
  } = props;
  useElementProperties(element as RefObject<CustomElement | null>, {
    value,
    type,
    name,
    placeholder,
    disabled,
    invalid,
  });
  useCustomEvent(
    element,
    "aui-input",
    onValueChange ? (detail: { value: string }) => onValueChange(detail.value) : undefined,
  );
  return createElement("aui-input", { ...rest, className, ref: setRef });
});
AdminInput.displayName = "AdminInput";

export interface AdminSelectProps extends ElementProps {
  value?: string;
  name?: string;
  disabled?: boolean;
  invalid?: boolean;
  options?: AdminSelectOption[];
  onValueChange?: (value: string) => void;
}

export const AdminSelect = forwardRef<HTMLElement, AdminSelectProps>((props, externalRef) => {
  const { element, setRef } = useAdminElement(externalRef);
  const { children, className, onValueChange, options, value, name, disabled, invalid, ...rest } =
    props;
  useElementProperties(element as RefObject<CustomElement | null>, {
    value,
    name,
    disabled,
    invalid,
    options,
  });
  useCustomEvent(
    element,
    "aui-change",
    onValueChange ? (detail: { value: string }) => onValueChange(detail.value) : undefined,
  );
  return createElement("aui-select", { ...rest, className, ref: setRef }, children);
});
AdminSelect.displayName = "AdminSelect";

export interface AdminTextareaProps extends ElementProps {
  value?: string;
  name?: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  invalid?: boolean;
  onValueChange?: (value: string) => void;
}

export const AdminTextarea = forwardRef<HTMLElement, AdminTextareaProps>((props, externalRef) => {
  const { element, setRef } = useAdminElement(externalRef);
  const {
    children: _children,
    className,
    onValueChange,
    value,
    name,
    placeholder,
    rows,
    disabled,
    invalid,
    ...rest
  } = props;
  useElementProperties(element as RefObject<CustomElement | null>, {
    value,
    name,
    placeholder,
    rows,
    disabled,
    invalid,
  });
  useCustomEvent(
    element,
    "aui-input",
    onValueChange ? (detail: { value: string }) => onValueChange(detail.value) : undefined,
  );
  return createElement("aui-textarea", { ...rest, className, ref: setRef });
});
AdminTextarea.displayName = "AdminTextarea";

export interface AdminCheckableProps extends ElementProps {
  checked?: boolean;
  disabled?: boolean;
  label?: string;
  onCheckedChange?: (checked: boolean) => void;
}

function AdminCheckable(props: AdminCheckableProps, tag: "aui-checkbox" | "aui-switch") {
  const { element, setRef } = useAdminElement(undefined);
  const { children, className, checked, disabled, label, onCheckedChange, ...rest } = props;
  useElementProperties(element as RefObject<CustomElement | null>, { checked, disabled, label });
  useCustomEvent(
    element,
    "aui-checked-change",
    onCheckedChange ? (detail: { checked: boolean }) => onCheckedChange(detail.checked) : undefined,
  );
  return createElement(tag, { ...rest, className, ref: setRef }, children);
}

export function AdminCheckbox(props: AdminCheckableProps) {
  return AdminCheckable(props, "aui-checkbox");
}
export function AdminSwitch(props: AdminCheckableProps) {
  return AdminCheckable(props, "aui-switch");
}

export interface AdminSkeletonProps extends ElementProps {
  width?: string;
  height?: string;
}

export function AdminSkeleton(props: AdminSkeletonProps) {
  const { element, setRef } = useAdminElement(undefined);
  const { className, width, height, ...rest } = props;
  useElementProperties(element as RefObject<CustomElement | null>, { width, height });
  return createElement("aui-skeleton", { ...rest, className, ref: setRef });
}

export interface AdminSeparatorProps extends ElementProps {
  vertical?: boolean;
}
export function AdminSeparator(props: AdminSeparatorProps) {
  const { element, setRef } = useAdminElement(undefined);
  const { className, vertical, ...rest } = props;
  useElementProperties(element as RefObject<CustomElement | null>, { vertical });
  return createElement("aui-separator", { ...rest, className, ref: setRef });
}

export interface AdminCopyableTextProps extends ElementProps {
  text: string;
  copyLabel?: string;
  copiedLabel?: string;
  onCopyText?: (text: string) => void;
}
export function AdminCopyableText(props: AdminCopyableTextProps) {
  const { element, setRef } = useAdminElement(undefined);
  const { children, className, text, copyLabel, copiedLabel, onCopyText, ...rest } = props;
  useElementProperties(element as RefObject<CustomElement | null>, {
    text,
    copyLabel,
    copiedLabel,
  });
  useCustomEvent(
    element,
    "aui-copy",
    onCopyText ? (detail: { text: string }) => onCopyText(detail.text) : undefined,
  );
  return createElement("aui-copyable-text", { ...rest, className, ref: setRef }, children);
}

export interface AdminStatusTagProps extends ElementProps {
  status?: AdminStatus;
}

export function AdminStatusTag(props: AdminStatusTagProps) {
  const { element, setRef } = useAdminElement(undefined);
  const { children, className, status, ...rest } = props;
  useElementProperties(element as RefObject<CustomElement | null>, { status });
  return createElement("aui-status-tag", { ...rest, className, ref: setRef }, children);
}

export interface AdminEmptyStateProps extends ElementProps {
  title?: string;
  description?: string;
}

export function AdminEmptyState(props: AdminEmptyStateProps) {
  const { element, setRef } = useAdminElement(undefined);
  const { children, className, title, description, ...rest } = props;
  useElementProperties(element as RefObject<CustomElement | null>, { title, description });
  return createElement("aui-empty-state", { ...rest, className, ref: setRef }, children);
}

export interface AdminErrorStateProps extends ElementProps {
  title?: string;
  description?: string;
}

export function AdminErrorState(props: AdminErrorStateProps) {
  const { element, setRef } = useAdminElement(undefined);
  const { children, className, title, description, ...rest } = props;
  useElementProperties(element as RefObject<CustomElement | null>, { title, description });
  return createElement("aui-error-state", { ...rest, className, ref: setRef }, children);
}

export interface AdminPageProps extends ElementProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function AdminPage(props: AdminPageProps) {
  const { element, setRef } = useAdminElement(undefined);
  const { children, className, title, description, actions, ...rest } = props;
  useElementProperties(element as RefObject<CustomElement | null>, { title, description });
  return createElement(
    "aui-page",
    {
      ...rest,
      title,
      description,
      className,
      ref: setRef,
    },
    [renderSlot("actions", actions), children],
  );
}

export interface AdminPageHeaderProps extends ElementProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function AdminPageHeader(props: AdminPageHeaderProps) {
  const { element, setRef } = useAdminElement(undefined);
  const { className, title, description, actions, ...rest } = props;
  useElementProperties(element as RefObject<CustomElement | null>, { title, description });
  return createElement(
    "aui-page-header",
    { ...rest, title, description, className, ref: setRef },
    renderSlot("actions", actions),
  );
}

export interface AdminStatProps extends ElementProps {
  label: string;
  value: string;
  unit?: string;
  trend?: string;
}

export function AdminStat(props: AdminStatProps) {
  const { element, setRef } = useAdminElement(undefined);
  const { className, label, value, unit, trend, ...rest } = props;
  useElementProperties(element as RefObject<CustomElement | null>, { label, value, unit, trend });
  return createElement("aui-stat", { ...rest, className, ref: setRef });
}

export function AdminFilterBar(props: ElementProps) {
  const { setRef } = useAdminElement(undefined);
  const { children, className, ...rest } = props;
  return createElement("aui-filter-bar", { ...rest, className, ref: setRef }, children);
}

export interface AdminTableProps extends ElementProps {
  loading?: boolean;
  empty?: boolean;
  loadingLabel?: string;
  emptyLabel?: string;
}

export function AdminTable(props: AdminTableProps) {
  const { element, setRef } = useAdminElement(undefined);
  const { children, className, loading, empty, loadingLabel, emptyLabel, ...rest } = props;
  useElementProperties(element as RefObject<CustomElement | null>, {
    loading,
    empty,
    loadingLabel,
    emptyLabel,
  });
  return createElement("aui-table", { ...rest, className, ref: setRef }, children);
}

export interface AdminPaginationProps extends ElementProps {
  page?: number;
  totalPages?: number;
  total?: number;
  pageSize?: number;
  previousLabel?: string;
  nextLabel?: string;
  onPageChange?: (page: number) => void;
}

export function AdminPagination(props: AdminPaginationProps) {
  const { element, setRef } = useAdminElement(undefined);
  const {
    className,
    onPageChange,
    page,
    totalPages,
    total,
    pageSize,
    previousLabel,
    nextLabel,
    ...rest
  } = props;
  useElementProperties(element as RefObject<CustomElement | null>, {
    page,
    totalPages,
    total,
    pageSize,
    previousLabel,
    nextLabel,
  });
  useCustomEvent(
    element,
    "aui-page-change",
    onPageChange ? (detail: { page: number }) => onPageChange(detail.page) : undefined,
  );
  return createElement("aui-pagination", { ...rest, className, ref: setRef });
}

export interface AdminTabsProps extends ElementProps {
  items: AdminTabItem[];
  active?: string;
  onTabChange?: (id: string) => void;
}

export function AdminTabs(props: AdminTabsProps) {
  const { element, setRef } = useAdminElement(undefined);
  const { className, onTabChange, items, active, ...rest } = props;
  useElementProperties(element as RefObject<CustomElement | null>, { items, active });
  useCustomEvent(
    element,
    "aui-tab-change",
    onTabChange ? (detail: { id: string }) => onTabChange(detail.id) : undefined,
  );
  return createElement("aui-tabs", { ...rest, className, ref: setRef });
}

export interface AdminConfirmDialogProps extends ElementProps {
  open?: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  danger?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  onOpenChange?: (open: boolean) => void;
}

export function AdminConfirmDialog(props: AdminConfirmDialogProps) {
  const { element, setRef } = useAdminElement(undefined);
  const {
    children,
    className,
    open,
    title,
    description,
    confirmLabel,
    cancelLabel,
    loading,
    danger,
    onConfirm,
    onCancel,
    onOpenChange,
    ...rest
  } = props;
  useElementProperties(element as RefObject<CustomElement | null>, {
    open,
    title,
    description,
    confirmLabel,
    cancelLabel,
    loading,
    danger,
  });
  useCustomEvent(element, "aui-confirm", onConfirm ? () => onConfirm() : undefined);
  useCustomEvent(element, "aui-cancel", onCancel ? () => onCancel() : undefined);
  useCustomEvent(
    element,
    "aui-close",
    onOpenChange ? (detail: { open: boolean }) => onOpenChange(detail.open) : undefined,
  );
  return createElement("aui-confirm-dialog", { ...rest, className, ref: setRef }, children);
}

export interface AdminDialogProps extends ElementProps {
  open?: boolean;
  title?: string;
  description?: string;
  closeLabel?: string;
  onOpenChange?: (open: boolean) => void;
}

export function AdminDialog(props: AdminDialogProps) {
  const { element, setRef } = useAdminElement(undefined);
  const { children, className, onOpenChange, open, title, description, closeLabel, ...rest } =
    props;
  useElementProperties(element as RefObject<CustomElement | null>, {
    open,
    title,
    description,
    closeLabel,
  });
  useCustomEvent(
    element,
    "aui-close",
    onOpenChange ? (detail: { open: boolean }) => onOpenChange(detail.open) : undefined,
  );
  return createElement("aui-dialog", { ...rest, className, ref: setRef }, children);
}

export interface AdminNavProps extends ElementProps {
  items: AdminNavItem[];
  onNavigate?: (id: string) => void;
}

export function AdminNav(props: AdminNavProps) {
  const { element, setRef } = useAdminElement(undefined);
  const { className, onNavigate, items, ...rest } = props;
  useElementProperties(element as RefObject<CustomElement | null>, { items });
  useCustomEvent(
    element,
    "aui-nav-change",
    onNavigate ? (detail: { id: string }) => onNavigate(detail.id) : undefined,
  );
  return createElement("aui-nav", { ...rest, className, ref: setRef });
}

export interface AdminBreadcrumbProps extends ElementProps {
  items: string[];
}

export function AdminBreadcrumb(props: AdminBreadcrumbProps) {
  const { element, setRef } = useAdminElement(undefined);
  const { className, items, ...rest } = props;
  useElementProperties(element as RefObject<CustomElement | null>, { items });
  return createElement("aui-breadcrumb", { ...rest, className, ref: setRef });
}

export interface AdminShellProps extends ElementProps {
  sidebar?: ReactNode;
  header?: ReactNode;
}

export function AdminShell(props: AdminShellProps) {
  const { setRef } = useAdminElement(undefined);
  const { children, className, sidebar, header, ...rest } = props;
  return createElement("aui-shell", { ...rest, className, ref: setRef }, [
    renderSlot("sidebar", sidebar),
    renderSlot("header", header),
    children,
  ]);
}

export {
  AdminAccordion,
  AdminAlert,
  AdminCalendar,
  AdminCalendarGrid,
  AdminChartContainer,
  AdminCombobox,
  AdminCommand,
  AdminDataGrid,
  AdminDataList,
  AdminDateRange,
  AdminDropdown,
  AdminDrawer,
  AdminField,
  AdminFileUpload,
  AdminGrid,
  AdminIconButton,
  AdminInputGroup,
  AdminJsonViewer,
  AdminKanban,
  AdminKbd,
  AdminList,
  AdminLogViewer,
  AdminMultiSelect,
  AdminPasswordInput,
  AdminPopover,
  AdminProgress,
  AdminRadioGroup,
  AdminRating,
  AdminResult,
  AdminSearch,
  AdminSegmented,
  AdminSlider,
  AdminStack,
  AdminStepper,
  AdminTagInput,
  AdminTimeline,
  AdminToast,
  AdminTooltip,
  AdminTree,
} from "./advanced";
export type {
  AdminAccordionProps,
  AdminAlertProps,
  AdminCalendarGridProps,
  AdminCalendarProps,
  AdminChartContainerProps,
  AdminComboboxProps,
  AdminDataGridProps,
  AdminDataListProps,
  AdminDateRangeProps,
  AdminDropdownProps,
  AdminDrawerProps,
  AdminFieldProps,
  AdminFileUploadProps,
  AdminIconButtonProps,
  AdminKanbanProps,
  AdminListProps,
  AdminLogViewerProps,
  AdminMultiSelectProps,
  AdminPasswordInputProps,
  AdminPopoverProps,
  AdminProgressProps,
  AdminRadioGroupProps,
  AdminRatingProps,
  AdminResultProps,
  AdminSearchProps,
  AdminSegmentedProps,
  AdminSliderProps,
  AdminStepperProps,
  AdminTagInputProps,
  AdminTimelineProps,
  AdminToastProps,
  AdminTooltipProps,
  AdminTreeProps,
} from "./advanced";
