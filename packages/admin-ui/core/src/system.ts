/*
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
*/

import { css, html } from "lit";
import { AdminElement } from "./base";

export class AdminContainerElement extends AdminElement {
  static properties = {
    maxWidth: { type: String, attribute: "max-width" },
    centered: { type: Boolean, reflect: true },
  };
  static styles = css`
    :host {
      display: block;
    }
    .container {
      width: 100%;
      max-width: var(--aui-container-width, 1280px);
      margin-inline: auto;
    }
    :host(:not([centered])) .container {
      max-width: none;
    }
  `;
  maxWidth = "1280px";
  centered = true;
  connectedCallback(): void {
    super.connectedCallback();
    this.style.setProperty("--aui-container-width", this.maxWidth);
  }
  render() {
    return html`<div class="container"><slot></slot></div>`;
  }
}

export class AdminStackElement extends AdminElement {
  static properties = {
    direction: { type: String, reflect: true },
    gap: { type: String },
    align: { type: String },
    justify: { type: String },
  };
  static styles = css`
    :host {
      display: block;
    }
    .stack {
      display: flex;
      gap: var(--aui-stack-gap, 16px);
      align-items: var(--aui-stack-align, stretch);
      justify-content: var(--aui-stack-justify, flex-start);
    }
    :host([direction="vertical"]) .stack {
      flex-direction: column;
    }
    :host([direction="horizontal"]) .stack {
      flex-direction: row;
      flex-wrap: wrap;
    }
  `;
  direction = "vertical";
  gap = "16px";
  align = "stretch";
  justify = "flex-start";
  connectedCallback(): void {
    super.connectedCallback();
    this.style.setProperty("--aui-stack-gap", this.gap);
    this.style.setProperty("--aui-stack-align", this.align);
    this.style.setProperty("--aui-stack-justify", this.justify);
  }
  render() {
    return html`<div class="stack"><slot></slot></div>`;
  }
}

export class AdminGridElement extends AdminElement {
  static properties = {
    columns: { type: Number },
    gap: { type: String },
    minWidth: { type: String, attribute: "min-width" },
  };
  static styles = css`
    :host {
      display: block;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(var(--aui-grid-columns, 2), minmax(0, 1fr));
      gap: var(--aui-grid-gap, 16px);
    }
    @media (max-width: 640px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
  `;
  columns = 2;
  gap = "16px";
  minWidth = "220px";
  connectedCallback(): void {
    super.connectedCallback();
    this.style.setProperty("--aui-grid-columns", String(this.columns));
    this.style.setProperty("--aui-grid-gap", this.gap);
  }
  render() {
    return html`<div class="grid"><slot></slot></div>`;
  }
}

export class AdminSplitterElement extends AdminElement {
  static properties = {
    direction: { type: String, reflect: true },
    initial: { type: Number },
    min: { type: Number },
  };
  static styles = css`
    :host {
      display: block;
      min-height: 100px;
    }
    .splitter {
      height: 100%;
      min-height: inherit;
      display: flex;
    }
    :host([direction="vertical"]) .splitter {
      flex-direction: column;
    }
    .panel {
      min-width: 0;
      min-height: 0;
      overflow: auto;
      flex: 1;
    }
    .handle {
      flex: 0 0 1px;
      background: var(--aui-border);
    }
    :host([direction="horizontal"]) .handle {
      width: 1px;
      cursor: col-resize;
    }
    :host([direction="vertical"]) .handle {
      height: 1px;
      cursor: row-resize;
    }
  `;
  direction = "horizontal";
  initial = 50;
  min = 20;
  render() {
    return html`<div class="splitter">
      <div class="panel"><slot name="before"></slot></div>
      <div
        class="handle"
        role="separator"
        aria-orientation=${this.direction === "vertical" ? "horizontal" : "vertical"}
      ></div>
      <div class="panel"><slot name="after"></slot></div>
    </div>`;
  }
}

export class AdminJsonViewerElement extends AdminElement {
  static properties = {
    value: { attribute: false },
    expanded: { type: Boolean, reflect: true },
    title: { type: String },
  };
  static styles = css`
    :host {
      display: block;
    }
    .viewer {
      border: 1px solid var(--aui-border);
      background: var(--aui-bg);
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 9px 11px;
      border-bottom: 1px solid var(--aui-border);
      color: var(--aui-text-secondary);
      font: 10px/1 var(--aui-font-mono);
      text-transform: uppercase;
    }
    button {
      border: 0;
      background: transparent;
      color: var(--aui-text-muted);
      cursor: pointer;
      font: 10px/1 var(--aui-font-mono);
    }
    pre {
      max-height: 360px;
      overflow: auto;
      margin: 0;
      padding: 13px;
      color: #a5f3fc;
      font: 11px/1.55 var(--aui-font-mono);
      white-space: pre-wrap;
    }
    :host(:not([expanded])) pre {
      max-height: 110px;
      overflow: hidden;
    }
  `;
  value: unknown = {};
  expanded = false;
  title = "JSON";
  private text(): string {
    if (typeof this.value === "string") return this.value;
    try {
      return JSON.stringify(this.value, null, 2);
    } catch {
      return "[UNSERIALIZABLE]";
    }
  }
  render() {
    return html`<section class="viewer">
      <header class="header">
        <span>${this.title}</span
        ><button
          type="button"
          @click=${() => {
            this.expanded = !this.expanded;
          }}
        >
          ${this.expanded ? "COLLAPSE" : "EXPAND"}
        </button>
      </header>
      <pre><slot>${this.text()}</slot></pre>
    </section>`;
  }
}

export interface AdminLogEntry {
  time?: string;
  level?: string;
  message: string;
  meta?: string;
}

export class AdminLogViewerElement extends AdminElement {
  static properties = { entries: { attribute: false }, follow: { type: Boolean, reflect: true } };
  static styles = css`
    :host {
      display: block;
    }
    .logs {
      max-height: 360px;
      overflow: auto;
      padding: 10px;
      border: 1px solid var(--aui-border);
      background: var(--aui-bg);
      font: 11px/1.5 var(--aui-font-mono);
    }
    .entry {
      display: grid;
      grid-template-columns: 90px 60px minmax(0, 1fr);
      gap: 10px;
      padding: 4px 0;
      border-bottom: 1px solid rgb(38 38 38 / 45%);
    }
    .time {
      color: var(--aui-text-muted);
    }
    .level {
      color: var(--aui-info);
      text-transform: uppercase;
    }
    .entry[data-level="error"] .level {
      color: var(--aui-danger);
    }
    .entry[data-level="warn"] .level {
      color: var(--aui-warning);
    }
    .message {
      min-width: 0;
      overflow-wrap: anywhere;
      color: var(--aui-text-secondary);
    }
    .meta {
      color: var(--aui-text-muted);
    }
    @media (max-width: 640px) {
      .entry {
        grid-template-columns: 70px 45px minmax(0, 1fr);
        gap: 5px;
      }
    }
  `;
  entries: AdminLogEntry[] = [];
  follow = false;
  render() {
    return html`<div class="logs" role="log" aria-live="polite">
      ${this.entries.map(
        (entry) =>
          html`<div class="entry" data-level=${entry.level ?? "info"}>
            <span class="time">${entry.time ?? "—"}</span
            ><span class="level">${entry.level ?? "INFO"}</span
            ><span class="message"
              >${entry.message}${entry.meta
                ? html` <span class="meta">${entry.meta}</span>`
                : null}</span
            >
          </div>`,
      )}<slot></slot>
    </div>`;
  }
}

export interface AdminDataGridColumn {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
}

export class AdminDataGridElement extends AdminElement {
  static properties = {
    columns: { attribute: false },
    rows: { attribute: false },
    loading: { type: Boolean, reflect: true },
    emptyLabel: { type: String, attribute: "empty-label" },
  };
  static styles = css`
    :host {
      display: block;
      min-width: 0;
    }
    .grid {
      overflow-x: auto;
      border: 1px solid var(--aui-border);
      background: var(--aui-bg);
    }
    table {
      width: 100%;
      min-width: 640px;
      border-collapse: collapse;
      color: var(--aui-text);
      font: 12px/1.4 var(--aui-font-mono);
      white-space: nowrap;
    }
    th {
      padding: 11px 14px;
      border-bottom: 1px solid var(--aui-border);
      background: var(--aui-header);
      color: var(--aui-text-secondary);
      font-weight: 500;
      text-align: left;
      text-transform: uppercase;
    }
    td {
      padding: 13px 14px;
      border-bottom: 1px solid #18181b;
      color: var(--aui-text);
    }
    tr:hover td {
      background: rgb(39 39 42 / 50%);
    }
    .state {
      padding: 42px 16px;
      color: var(--aui-text-muted);
      text-align: center;
      font: 11px/1 var(--aui-font-mono);
    }
    :host([loading]) .table,
    :host([loading]) .empty {
      display: none;
    }
    :host(:not([loading])) .loading {
      display: none;
    }
  `;
  columns: AdminDataGridColumn[] = [];
  rows: Array<Record<string, unknown>> = [];
  loading = false;
  emptyLabel = "NO DATA AVAILABLE";
  render() {
    return html`<div class="grid">
      <div class="state loading">LOADING...</div>
      <div
        class="state empty"
        ?hidden=${(this.loading && this.rows.length > 0) || this.rows.length > 0}
      >
        ${this.emptyLabel}
      </div>
      <table class="table" ?hidden=${this.loading || this.rows.length === 0}>
        <thead>
          <tr>
            ${this.columns.map(
              (column) =>
                html`<th style=${`text-align:${column.align ?? "left"}`}>${column.label}</th>`,
            )}
          </tr>
        </thead>
        <tbody>
          ${this.rows.map(
            (row) =>
              html`<tr>
                ${this.columns.map(
                  (column) =>
                    html`<td style=${`text-align:${column.align ?? "left"}`}>
                      ${String(row[column.key] ?? "—")}
                    </td>`,
                )}
              </tr>`,
          )}
        </tbody>
      </table>
      <slot></slot>
    </div>`;
  }
}

export interface AdminKanbanColumn {
  id: string;
  title: string;
  items: Array<{ id: string; title: string; meta?: string }>;
}

export class AdminKanbanElement extends AdminElement {
  static properties = { columns: { attribute: false } };
  static styles = css`
    :host {
      display: block;
      min-width: 0;
    }
    .board {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      gap: 12px;
      overflow-x: auto;
    }
    .column {
      min-height: 280px;
      padding: 10px;
      border: 1px solid var(--aui-border);
      background: var(--aui-surface);
    }
    .column-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 5px 2px 11px;
      border-bottom: 1px solid var(--aui-border);
      color: var(--aui-text-primary);
      font: 700 11px/1 var(--aui-font-mono);
      text-transform: uppercase;
    }
    .count {
      color: var(--aui-text-muted);
      font-weight: 400;
    }
    .card {
      margin-top: 9px;
      padding: 11px;
      border: 1px solid var(--aui-border);
      background: var(--aui-bg);
      cursor: grab;
    }
    .card:hover {
      border-color: var(--aui-border-hover);
    }
    .card-title {
      color: var(--aui-text);
      font: 11px/1.35 var(--aui-font-mono);
    }
    .meta {
      margin-top: 6px;
      color: var(--aui-text-muted);
      font: 10px/1.2 var(--aui-font-mono);
    }
  `;
  columns: AdminKanbanColumn[] = [];
  private move(itemId: string, columnId: string): void {
    this.dispatchDetail("aui-kanban-change", { itemId, columnId });
  }
  render() {
    return html`<div class="board">
      ${this.columns.map(
        (column) =>
          html`<section
            class="column"
            data-column=${column.id}
            @dragover=${(event: DragEvent) => event.preventDefault()}
            @drop=${(event: DragEvent) => {
              const id = event.dataTransfer?.getData("text/plain");
              if (id) this.move(id, column.id);
            }}
          >
            <header class="column-header">
              <span>${column.title}</span><span class="count">${column.items.length}</span>
            </header>
            ${column.items.map(
              (item) =>
                html`<article
                  class="card"
                  draggable="true"
                  @dragstart=${(event: DragEvent) =>
                    event.dataTransfer?.setData("text/plain", item.id)}
                >
                  <div class="card-title">${item.title}</div>
                  ${item.meta ? html`<div class="meta">${item.meta}</div>` : null}
                </article>`,
            )}
          </section>`,
      )}
    </div>`;
  }
}
