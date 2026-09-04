/*
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
*/

import { css, html } from "lit";
import { AdminElement } from "@chaos_team/blbui-core";

export interface AdminMetricItem {
  label: string;
  value: string;
  unit?: string;
  trend?: string;
  tone?: "default" | "success" | "danger" | "warning";
}

export class AdminMetricCardElement extends AdminElement {
  static properties = {
    label: { type: String },
    value: { type: String },
    unit: { type: String },
    trend: { type: String },
    tone: { type: String, reflect: true },
  };
  static styles = css`
    :host {
      display: block;
    }
    .card {
      min-height: 126px;
      padding: 15px;
      border: 1px solid var(--aui-border);
      background: var(--aui-surface);
    }
    .label {
      color: var(--aui-text-secondary);
      font: 10px/1 var(--aui-font-mono);
      letter-spacing: 0.13em;
      text-transform: uppercase;
    }
    .value {
      margin-top: 24px;
      color: var(--aui-text-primary);
      font: 300 30px/1 var(--aui-font-mono);
      font-variant-numeric: tabular-nums;
    }
    .unit {
      margin-left: 5px;
      color: var(--aui-text-muted);
      font-size: 11px;
    }
    .trend {
      margin-top: 8px;
      color: var(--aui-text-muted);
      font: 10px/1 var(--aui-font-mono);
    }
    :host([tone="success"]) .trend {
      color: var(--aui-success);
    }
    :host([tone="danger"]) .trend {
      color: var(--aui-danger);
    }
    :host([tone="warning"]) .trend {
      color: var(--aui-warning);
    }
  `;
  label = "";
  value = "";
  unit = "";
  trend = "";
  tone = "default";
  render() {
    return html`<div class="card">
      <div class="label">${this.label}</div>
      <div class="value">${this.value}<span class="unit">${this.unit}</span></div>
      ${this.trend ? html`<div class="trend">${this.trend}</div>` : null}
    </div>`;
  }
}

export class AdminMetricGridElement extends AdminElement {
  static properties = { items: { attribute: false }, columns: { type: Number } };
  static styles = css`
    :host {
      display: block;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(var(--aui-metric-columns, 4), minmax(0, 1fr));
      gap: 12px;
    }
    @media (max-width: 900px) {
      .grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 520px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
  `;
  items: AdminMetricItem[] = [];
  columns = 4;
  connectedCallback(): void {
    super.connectedCallback();
    this.style.setProperty("--aui-metric-columns", String(this.columns));
  }
  render() {
    return html`<div class="grid">
      ${this.items.map(
        (item) =>
          html`<aui-metric-card
            label=${item.label}
            value=${item.value}
            unit=${item.unit ?? ""}
            trend=${item.trend ?? ""}
            tone=${item.tone ?? "default"}
          ></aui-metric-card>`,
      )}
    </div>`;
  }
}

export class AdminBarChartElement extends AdminElement {
  static properties = {
    data: { attribute: false },
    height: { type: String },
    label: { type: String },
  };
  static styles = css`
    :host {
      display: block;
    }
    .chart {
      min-height: var(--aui-bar-height, 220px);
      display: flex;
      align-items: end;
      gap: 8px;
      padding: 16px 12px 24px;
      border: 1px solid var(--aui-border);
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 38px,
        rgb(38 38 38 / 42%) 39px
      );
    }
    .bar-wrap {
      height: 100%;
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: end;
      gap: 7px;
    }
    .bar {
      width: 100%;
      max-width: 38px;
      min-height: 3px;
      background: #3f3f46;
    }
    .bar[data-peak="true"] {
      background: var(--aui-text-primary);
    }
    .label {
      color: var(--aui-text-muted);
      font: 9px/1 var(--aui-font-mono);
    }
    .value {
      color: var(--aui-text-secondary);
      font: 9px/1 var(--aui-font-mono);
    }
  `;
  data: Array<{ label: string; value: number }> = [];
  height = "220px";
  label = "Chart";
  connectedCallback(): void {
    super.connectedCallback();
    this.style.setProperty("--aui-bar-height", this.height);
  }
  render() {
    const max = Math.max(...this.data.map((item) => item.value), 1);
    const peak = max;
    return html`<div class="chart" role="img" aria-label=${this.label}>
      ${this.data.map(
        (item) =>
          html`<div class="bar-wrap">
            <span class="value">${item.value}</span
            ><span
              class="bar"
              data-peak=${item.value === peak ? "true" : "false"}
              style=${`height:${Math.max((item.value / max) * 78, 2)}%`}
            ></span
            ><span class="label">${item.label}</span>
          </div>`,
      )}
    </div>`;
  }
}

export class AdminSparklineElement extends AdminElement {
  static properties = {
    values: { attribute: false },
    label: { type: String },
    color: { type: String },
  };
  static styles = css`
    :host {
      display: block;
    }
    svg {
      display: block;
      width: 100%;
      height: 52px;
      overflow: visible;
    }
    polyline {
      fill: none;
      stroke: var(--aui-sparkline-color, var(--aui-text-primary));
      stroke-width: 2;
      vector-effect: non-scaling-stroke;
    }
    .baseline {
      stroke: var(--aui-border);
      stroke-width: 1;
    }
  `;
  values: number[] = [];
  label = "Trend";
  color = "#ffffff";
  connectedCallback(): void {
    super.connectedCallback();
    this.style.setProperty("--aui-sparkline-color", this.color);
  }
  render() {
    const max = Math.max(...this.values, 1);
    const min = Math.min(...this.values, 0);
    const range = Math.max(max - min, 1);
    const points = this.values
      .map(
        (value, index) =>
          `${this.values.length > 1 ? (index / (this.values.length - 1)) * 100 : 50},${48 - ((value - min) / range) * 42}`,
      )
      .join(" ");
    return html`<svg viewBox="0 0 100 52" role="img" aria-label=${this.label}>
      <line class="baseline" x1="0" y1="49" x2="100" y2="49"></line>
      <polyline points=${points}></polyline>
    </svg>`;
  }
}
