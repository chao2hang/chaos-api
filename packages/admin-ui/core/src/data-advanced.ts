/*
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
*/

import { css, html } from "lit";
import { AdminElement } from "./base";

export class AdminDataListElement extends AdminElement {
  static properties = { items: { attribute: false }, columns: { attribute: false } };
  static styles = css`
    :host {
      display: block;
    }
    .list {
      border-top: 1px solid var(--aui-border);
    }
    .row {
      display: grid;
      grid-template-columns: minmax(120px, 0.8fr) 1.5fr;
      gap: 20px;
      padding: 12px 0;
      border-bottom: 1px solid var(--aui-border);
      font: 12px/1.3 var(--aui-font-mono);
    }
    dt {
      color: var(--aui-text-secondary);
      text-transform: uppercase;
    }
    dd {
      margin: 0;
      color: var(--aui-text);
    }
    @media (max-width: 560px) {
      .row {
        grid-template-columns: 1fr;
        gap: 5px;
      }
    }
  `;
  items: Array<{ label: string; value: string }> = [];
  columns = 2;
  render() {
    return html`<dl class="list">
      ${this.items.map(
        (item) =>
          html`<div class="row">
            <dt>${item.label}</dt>
            <dd>${item.value}</dd>
          </div>`,
      )}<slot></slot>
    </dl>`;
  }
}

export class AdminCalendarElement extends AdminElement {
  static properties = {
    value: { type: String },
    min: { type: String },
    max: { type: String },
    label: { type: String },
  };
  static styles = css`
    :host {
      display: inline-flex;
    }
    .calendar {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 14px;
      border: 1px solid var(--aui-border);
      background: var(--aui-surface);
    }
    label {
      color: var(--aui-text-secondary);
      font: 10px/1 var(--aui-font-mono);
      text-transform: uppercase;
    }
    input {
      min-height: 36px;
      padding: 8px;
      border: 1px solid var(--aui-border);
      border-radius: 0;
      background: var(--aui-bg);
      color: var(--aui-text);
      font: 12px/1 var(--aui-font-mono);
      color-scheme: dark;
    }
    input:focus {
      outline: 1px solid var(--aui-focus);
      outline-offset: 2px;
    }
  `;
  value = "";
  min = "";
  max = "";
  label = "Date";
  private change(event: Event): void {
    this.value = (event.target as HTMLInputElement).value;
    this.dispatchDetail("aui-date-change", { value: this.value });
  }
  render() {
    return html`<div class="calendar">
      <label>${this.label}</label
      ><input
        type="date"
        .value=${this.value}
        min=${this.min}
        max=${this.max}
        aria-label=${this.label}
        @change=${this.change}
      />
    </div>`;
  }
}

export class AdminSearchElement extends AdminElement {
  static properties = {
    value: { type: String },
    placeholder: { type: String },
    debounce: { type: Number },
  };
  static styles = css`
    :host {
      display: block;
    }
    .search {
      display: flex;
      align-items: center;
      min-height: var(--aui-control-height);
      border: 1px solid var(--aui-border);
      background: var(--aui-bg);
    }
    .icon {
      padding: 0 9px;
      color: var(--aui-text-muted);
      font: 13px/1 var(--aui-font-mono);
    }
    input {
      min-width: 0;
      flex: 1;
      padding: 8px 8px 8px 0;
      border: 0;
      outline: 0;
      background: transparent;
      color: var(--aui-text);
      font: 12px/1.2 var(--aui-font-mono);
    }
    input::placeholder {
      color: var(--aui-text-muted);
    }
    button {
      width: 32px;
      border: 0;
      background: transparent;
      color: var(--aui-text-muted);
      cursor: pointer;
    }
  `;
  value = "";
  placeholder = "Search";
  debounce = 180;
  private timer = 0;
  private change(event: Event): void {
    this.value = (event.target as HTMLInputElement).value;
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(
      () => this.dispatchDetail("aui-search", { value: this.value }),
      this.debounce,
    );
  }
  render() {
    return html`<div class="search">
      <span class="icon" aria-hidden="true">⌕</span
      ><input
        .value=${this.value}
        placeholder=${this.placeholder}
        type="search"
        aria-label=${this.placeholder}
        @input=${this.change}
      /><button
        type="button"
        aria-label="Clear"
        ?hidden=${!this.value}
        @click=${() => {
          this.value = "";
          this.dispatchDetail("aui-search", { value: "" });
          this.requestUpdate();
        }}
      >
        ×
      </button>
    </div>`;
  }
}

export class AdminCalendarGridElement extends AdminElement {
  static properties = {
    month: { type: Number },
    year: { type: Number },
    selected: { type: String },
  };
  static styles = css`
    :host {
      display: block;
    }
    .calendar {
      padding: 14px;
      border: 1px solid var(--aui-border);
      background: var(--aui-surface);
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }
    .header strong {
      color: var(--aui-text-primary);
      font: 700 11px/1 var(--aui-font-mono);
      text-transform: uppercase;
    }
    .header button {
      border: 1px solid var(--aui-border);
      background: transparent;
      color: var(--aui-text-secondary);
      cursor: pointer;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 3px;
    }
    .weekday {
      padding: 4px;
      color: var(--aui-text-muted);
      text-align: center;
      font: 9px/1 var(--aui-font-mono);
    }
    .day {
      min-height: 28px;
      border: 0;
      background: transparent;
      color: var(--aui-text-secondary);
      cursor: pointer;
      font: 10px/1 var(--aui-font-mono);
    }
    .day:hover {
      background: var(--aui-header);
      color: var(--aui-text-primary);
    }
    .day[data-selected="true"] {
      background: var(--aui-text-primary);
      color: var(--aui-text-inverse);
    }
    .day[data-muted="true"] {
      color: var(--aui-text-muted);
    }
  `;
  month = new Date().getMonth();
  year = new Date().getFullYear();
  selected = "";
  private move(delta: number): void {
    const date = new Date(this.year, this.month + delta, 1);
    this.month = date.getMonth();
    this.year = date.getFullYear();
    this.requestUpdate();
  }
  private choose(day: number): void {
    const value = `${this.year}-${String(this.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    this.selected = value;
    this.dispatchDetail("aui-date-change", { value });
  }
  render() {
    const first = new Date(this.year, this.month, 1).getDay();
    const total = new Date(this.year, this.month + 1, 0).getDate();
    const previous = new Date(this.year, this.month, 0).getDate();
    const days = Array.from({ length: first + total }, (_, index) =>
      index < first
        ? { day: previous - first + index + 1, muted: true }
        : { day: index - first + 1, muted: false },
    );
    return html`<div class="calendar">
      <div class="header">
        <button type="button" aria-label="Previous month" @click=${() => this.move(-1)}>‹</button
        ><strong>${this.year} / ${String(this.month + 1).padStart(2, "0")}</strong
        ><button type="button" aria-label="Next month" @click=${() => this.move(1)}>›</button>
      </div>
      <div class="grid">
        ${["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map(
          (day) => html`<span class="weekday">${day}</span>`,
        )}${days.map(
          (item) =>
            html`<button
              class="day"
              type="button"
              data-muted=${item.muted ? "true" : "false"}
              data-selected=${!item.muted &&
              this.selected.endsWith(`-${String(item.day).padStart(2, "0")}`)
                ? "true"
                : "false"}
              ?disabled=${item.muted}
              @click=${() => this.choose(item.day)}
            >
              ${item.day}
            </button>`,
        )}
      </div>
    </div>`;
  }
}

export class AdminChartContainerElement extends AdminElement {
  static properties = {
    title: { type: String },
    description: { type: String },
    height: { type: String },
  };
  static styles = css`
    :host {
      display: block;
    }
    .chart {
      min-height: var(--aui-chart-height, 240px);
      border-top: 1px solid var(--aui-border);
    }
    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 14px 0;
    }
    h3 {
      margin: 0;
      color: var(--aui-text-primary);
      font: 700 12px/1.2 var(--aui-font-mono);
      text-transform: uppercase;
    }
    p {
      margin: 4px 0 0;
      color: var(--aui-text-muted);
      font: 11px/1.3 var(--aui-font-mono);
    }
    .body {
      min-height: calc(var(--aui-chart-height, 240px) - 60px);
      display: grid;
      place-items: center;
      border: 1px solid var(--aui-border);
      background:
        repeating-linear-gradient(0deg, transparent, transparent 39px, rgb(38 38 38 / 45%) 40px),
        repeating-linear-gradient(90deg, transparent, transparent 79px, rgb(38 38 38 / 25%) 80px);
    }
  `;
  title = "";
  description = "";
  height = "240px";
  connectedCallback(): void {
    super.connectedCallback();
    this.style.setProperty("--aui-chart-height", this.height);
  }
  render() {
    return html`<section class="chart">
      <header class="header">
        <div>
          <h3>${this.title}</h3>
          <p>${this.description}</p>
        </div>
        <slot name="actions"></slot>
      </header>
      <div class="body"><slot>CHART CONTENT / PROVIDE A RENDERER</slot></div>
    </section>`;
  }
}
