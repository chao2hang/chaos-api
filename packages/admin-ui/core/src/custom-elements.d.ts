/*
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
*/

declare global {
  interface HTMLElementTagNameMap {
    "aui-button": import("./button").AdminButtonElement;
    "aui-card": import("./card").AdminCardElement;
    "aui-table": import("./data").AdminTableElement;
    "aui-pagination": import("./data").AdminPaginationElement;
    "aui-tabs": import("./data").AdminTabsElement;
    "aui-dialog": import("./dialog").AdminDialogElement;
    "aui-confirm-dialog": import("./dialog").AdminConfirmDialogElement;
    "aui-status-tag": import("./feedback").AdminStatusTagElement;
    "aui-spinner": import("./feedback").AdminSpinnerElement;
    "aui-empty-state": import("./feedback").AdminEmptyStateElement;
    "aui-error-state": import("./feedback").AdminErrorStateElement;
    "aui-skeleton": import("./feedback").AdminSkeletonElement;
    "aui-separator": import("./feedback").AdminSeparatorElement;
    "aui-copyable-text": import("./feedback").AdminCopyableTextElement;
    "aui-input": import("./form").AdminInputElement;
    "aui-select": import("./form").AdminSelectElement;
    "aui-textarea": import("./form").AdminTextareaElement;
    "aui-checkbox": import("./form").AdminCheckboxElement;
    "aui-switch": import("./form").AdminSwitchElement;
    "aui-page": import("./layout").AdminPageElement;
    "aui-page-header": import("./layout").AdminPageHeaderElement;
    "aui-stat": import("./layout").AdminStatElement;
    "aui-filter-bar": import("./layout").AdminFilterBarElement;
    "aui-shell": import("./layout").AdminShellElement;
    "aui-nav": import("./navigation").AdminNavElement;
    "aui-breadcrumb": import("./navigation").AdminBreadcrumbElement;
    "aui-badge": import("./primitives").AdminBadgeElement;
    "aui-avatar": import("./primitives").AdminAvatarElement;
    "aui-progress": import("./primitives").AdminProgressElement;
    "aui-rating": import("./primitives").AdminRatingElement;
    "aui-kbd": import("./primitives").AdminKbdElement;
    "aui-result": import("./primitives").AdminResultElement;
    "aui-field": import("./forms-advanced").AdminFieldElement;
    "aui-input-group": import("./forms-advanced").AdminInputGroupElement;
    "aui-radio-group": import("./forms-advanced").AdminRadioGroupElement;
    "aui-slider": import("./forms-advanced").AdminSliderElement;
    "aui-password-input": import("./forms-advanced").AdminPasswordInputElement;
    "aui-file-upload": import("./forms-advanced").AdminFileUploadElement;
    "aui-accordion": import("./navigation-advanced").AdminAccordionElement;
    "aui-stepper": import("./navigation-advanced").AdminStepperElement;
    "aui-segmented": import("./navigation-advanced").AdminSegmentedElement;
    "aui-list": import("./navigation-advanced").AdminListElement;
    "aui-tree": import("./navigation-advanced").AdminTreeElement;
    "aui-timeline": import("./navigation-advanced").AdminTimelineElement;
    "aui-tooltip": import("./overlays-advanced").AdminTooltipElement;
    "aui-popover": import("./overlays-advanced").AdminPopoverElement;
    "aui-dropdown": import("./overlays-advanced").AdminDropdownElement;
    "aui-drawer": import("./overlays-advanced").AdminDrawerElement;
    "aui-toast": import("./overlays-advanced").AdminToastElement;
    "aui-data-list": import("./data-advanced").AdminDataListElement;
    "aui-calendar": import("./data-advanced").AdminCalendarElement;
    "aui-search": import("./data-advanced").AdminSearchElement;
    "aui-calendar-grid": import("./data-advanced").AdminCalendarGridElement;
    "aui-chart-container": import("./data-advanced").AdminChartContainerElement;
    "aui-alert": import("./controls").AdminAlertElement;
    "aui-icon-button": import("./controls").AdminIconButtonElement;
    "aui-combobox": import("./controls").AdminComboboxElement;
    "aui-multi-select": import("./controls").AdminMultiSelectElement;
    "aui-command": import("./controls").AdminCommandElement;
    "aui-color-picker": import("./controls").AdminColorPickerElement;
    "aui-date-range": import("./controls").AdminDateRangeElement;
    "aui-tag-input": import("./controls").AdminTagInputElement;
    "aui-container": import("./system").AdminContainerElement;
    "aui-stack": import("./system").AdminStackElement;
    "aui-grid": import("./system").AdminGridElement;
    "aui-splitter": import("./system").AdminSplitterElement;
    "aui-json-viewer": import("./system").AdminJsonViewerElement;
    "aui-log-viewer": import("./system").AdminLogViewerElement;
    "aui-data-grid": import("./system").AdminDataGridElement;
    "aui-kanban": import("./system").AdminKanbanElement;
    "aui-toggle": import("./common").AdminToggleElement;
    "aui-toggle-group": import("./common").AdminToggleGroupElement;
    "aui-collapsible": import("./common").AdminCollapsibleElement;
    "aui-aspect-ratio": import("./common").AdminAspectRatioElement;
    "aui-scroll-area": import("./common").AdminScrollAreaElement;
    "aui-number-input": import("./common").AdminNumberInputElement;
    "aui-code-block": import("./common").AdminCodeBlockElement;
    "aui-color-tag": import("./common").AdminColorTagElement;
  }
}

export {};
