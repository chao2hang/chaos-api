/*
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
*/

import { defineOnce } from "@chaos_team/blbui-core";
import { AdminApprovalTimelineElement, AdminFormBuilderElement } from "./workflow";
import { AdminAdvancedTableElement, AdminCrudPageElement, AdminCrudToolbarElement } from "./crud";
import {
  AdminBarChartElement,
  AdminMetricCardElement,
  AdminMetricGridElement,
  AdminSparklineElement,
} from "./analytics";

export function registerBusinessElements(): void {
  if (typeof customElements === "undefined") return;
  defineOnce("aui-crud-page", AdminCrudPageElement);
  defineOnce("aui-crud-toolbar", AdminCrudToolbarElement);
  defineOnce("aui-advanced-table", AdminAdvancedTableElement);
  defineOnce("aui-form-builder", AdminFormBuilderElement);
  defineOnce("aui-approval-timeline", AdminApprovalTimelineElement);
  defineOnce("aui-metric-card", AdminMetricCardElement);
  defineOnce("aui-metric-grid", AdminMetricGridElement);
  defineOnce("aui-bar-chart", AdminBarChartElement);
  defineOnce("aui-sparkline", AdminSparklineElement);
}
