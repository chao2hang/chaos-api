/*
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
*/

import { defineOnce } from "./base";
import { AdminButtonElement } from "./button";
import { AdminCardElement } from "./card";
import { AdminTableElement, AdminPaginationElement, AdminTabsElement } from "./data";
import { AdminDialogElement, AdminConfirmDialogElement } from "./dialog";
import {
  AdminStatusTagElement,
  AdminSpinnerElement,
  AdminEmptyStateElement,
  AdminErrorStateElement,
  AdminSkeletonElement,
  AdminSeparatorElement,
  AdminCopyableTextElement,
} from "./feedback";
import {
  AdminInputElement,
  AdminSelectElement,
  AdminTextareaElement,
  AdminCheckboxElement,
  AdminSwitchElement,
} from "./form";
import {
  AdminPageElement,
  AdminPageHeaderElement,
  AdminStatElement,
  AdminFilterBarElement,
  AdminShellElement,
} from "./layout";
import { AdminNavElement, AdminBreadcrumbElement } from "./navigation";
import {
  AdminBadgeElement,
  AdminAvatarElement,
  AdminProgressElement,
  AdminRatingElement,
  AdminKbdElement,
  AdminResultElement,
} from "./primitives";
import {
  AdminFieldElement,
  AdminInputGroupElement,
  AdminRadioGroupElement,
  AdminSliderElement,
  AdminPasswordInputElement,
  AdminFileUploadElement,
} from "./forms-advanced";
import {
  AdminAccordionElement,
  AdminStepperElement,
  AdminSegmentedElement,
  AdminListElement,
  AdminTreeElement,
  AdminTimelineElement,
} from "./navigation-advanced";
import {
  AdminTooltipElement,
  AdminPopoverElement,
  AdminDropdownElement,
  AdminDrawerElement,
  AdminToastElement,
} from "./overlays-advanced";
import {
  AdminToggleElement,
  AdminToggleGroupElement,
  AdminCollapsibleElement,
  AdminAspectRatioElement,
  AdminScrollAreaElement,
  AdminNumberInputElement,
  AdminCodeBlockElement,
  AdminColorTagElement,
} from "./common";
import {
  AdminContainerElement,
  AdminStackElement,
  AdminGridElement,
  AdminSplitterElement,
  AdminJsonViewerElement,
  AdminLogViewerElement,
  AdminDataGridElement,
  AdminKanbanElement,
} from "./system";
import {
  AdminAlertElement,
  AdminIconButtonElement,
  AdminComboboxElement,
  AdminMultiSelectElement,
  AdminCommandElement,
  AdminColorPickerElement,
  AdminDateRangeElement,
  AdminTagInputElement,
} from "./controls";
import {
  AdminDataListElement,
  AdminCalendarElement,
  AdminSearchElement,
  AdminCalendarGridElement,
  AdminChartContainerElement,
} from "./data-advanced";

export function registerAdminElements(): void {
  if (typeof customElements === "undefined") return;
  defineOnce("aui-button", AdminButtonElement);
  defineOnce("aui-card", AdminCardElement);
  defineOnce("aui-table", AdminTableElement);
  defineOnce("aui-pagination", AdminPaginationElement);
  defineOnce("aui-tabs", AdminTabsElement);
  defineOnce("aui-dialog", AdminDialogElement);
  defineOnce("aui-confirm-dialog", AdminConfirmDialogElement);
  defineOnce("aui-status-tag", AdminStatusTagElement);
  defineOnce("aui-spinner", AdminSpinnerElement);
  defineOnce("aui-empty-state", AdminEmptyStateElement);
  defineOnce("aui-error-state", AdminErrorStateElement);
  defineOnce("aui-skeleton", AdminSkeletonElement);
  defineOnce("aui-separator", AdminSeparatorElement);
  defineOnce("aui-copyable-text", AdminCopyableTextElement);
  defineOnce("aui-input", AdminInputElement);
  defineOnce("aui-select", AdminSelectElement);
  defineOnce("aui-textarea", AdminTextareaElement);
  defineOnce("aui-checkbox", AdminCheckboxElement);
  defineOnce("aui-switch", AdminSwitchElement);
  defineOnce("aui-page", AdminPageElement);
  defineOnce("aui-page-header", AdminPageHeaderElement);
  defineOnce("aui-stat", AdminStatElement);
  defineOnce("aui-filter-bar", AdminFilterBarElement);
  defineOnce("aui-shell", AdminShellElement);
  defineOnce("aui-nav", AdminNavElement);
  defineOnce("aui-breadcrumb", AdminBreadcrumbElement);
  defineOnce("aui-badge", AdminBadgeElement);
  defineOnce("aui-avatar", AdminAvatarElement);
  defineOnce("aui-progress", AdminProgressElement);
  defineOnce("aui-rating", AdminRatingElement);
  defineOnce("aui-kbd", AdminKbdElement);
  defineOnce("aui-result", AdminResultElement);
  defineOnce("aui-field", AdminFieldElement);
  defineOnce("aui-input-group", AdminInputGroupElement);
  defineOnce("aui-radio-group", AdminRadioGroupElement);
  defineOnce("aui-slider", AdminSliderElement);
  defineOnce("aui-password-input", AdminPasswordInputElement);
  defineOnce("aui-file-upload", AdminFileUploadElement);
  defineOnce("aui-accordion", AdminAccordionElement);
  defineOnce("aui-stepper", AdminStepperElement);
  defineOnce("aui-segmented", AdminSegmentedElement);
  defineOnce("aui-list", AdminListElement);
  defineOnce("aui-tree", AdminTreeElement);
  defineOnce("aui-timeline", AdminTimelineElement);
  defineOnce("aui-tooltip", AdminTooltipElement);
  defineOnce("aui-popover", AdminPopoverElement);
  defineOnce("aui-dropdown", AdminDropdownElement);
  defineOnce("aui-drawer", AdminDrawerElement);
  defineOnce("aui-toast", AdminToastElement);
  defineOnce("aui-data-list", AdminDataListElement);
  defineOnce("aui-calendar", AdminCalendarElement);
  defineOnce("aui-search", AdminSearchElement);
  defineOnce("aui-calendar-grid", AdminCalendarGridElement);
  defineOnce("aui-chart-container", AdminChartContainerElement);
  defineOnce("aui-alert", AdminAlertElement);
  defineOnce("aui-icon-button", AdminIconButtonElement);
  defineOnce("aui-combobox", AdminComboboxElement);
  defineOnce("aui-multi-select", AdminMultiSelectElement);
  defineOnce("aui-command", AdminCommandElement);
  defineOnce("aui-color-picker", AdminColorPickerElement);
  defineOnce("aui-date-range", AdminDateRangeElement);
  defineOnce("aui-tag-input", AdminTagInputElement);
  defineOnce("aui-container", AdminContainerElement);
  defineOnce("aui-stack", AdminStackElement);
  defineOnce("aui-grid", AdminGridElement);
  defineOnce("aui-splitter", AdminSplitterElement);
  defineOnce("aui-json-viewer", AdminJsonViewerElement);
  defineOnce("aui-log-viewer", AdminLogViewerElement);
  defineOnce("aui-data-grid", AdminDataGridElement);
  defineOnce("aui-kanban", AdminKanbanElement);
  defineOnce("aui-toggle", AdminToggleElement);
  defineOnce("aui-toggle-group", AdminToggleGroupElement);
  defineOnce("aui-collapsible", AdminCollapsibleElement);
  defineOnce("aui-aspect-ratio", AdminAspectRatioElement);
  defineOnce("aui-scroll-area", AdminScrollAreaElement);
  defineOnce("aui-number-input", AdminNumberInputElement);
  defineOnce("aui-code-block", AdminCodeBlockElement);
  defineOnce("aui-color-tag", AdminColorTagElement);
}
