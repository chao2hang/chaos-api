/*
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
*/

import { css, html } from "lit";
import { AdminElement } from "@chaos_team/blbui-core";

export class AdminCrudPageElement extends AdminElement {
  static properties = {
    title: { type: String },
    description: { type: String },
    loading: { type: Boolean, reflect: true },
  };
  static styles = css`
    :host {
      display: block;
      min-width: 0;
    }
    .page {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 18px;
    }
    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 18px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--aui-border);
    }
    h1 {
      margin: 0;
      color: var(--aui-text-primary);
      font: 700 18px/1.1 var(--aui-font-mono);
      letter-spacing: -0.03em;
      text-transform: uppercase;
    }
    p {
      margin: 6px 0 0;
      color: var(--aui-text-secondary);
      font: 12px/1.45 var(--aui-font-mono);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 8px;
    }
    .body {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 14px;
    }
    @media (max-width: 640px) {
      .header {
        flex-direction: column;
      }
      .actions {
        justify-content: flex-start;
      }
    }
  `;
  title = "";
  description = "";
  loading = false;
  render() {
    return html`<div class="page">
      <header class="header">
        <div>
          <h1>${this.title}<slot name="title"></slot></h1>
          ${this.description ? html`<p>${this.description}</p>` : null}
        </div>
        <div class="actions"><slot name="actions"></slot></div>
      </header>
      <div class="body">
        <slot name="filters"></slot><slot name="toolbar"></slot><slot></slot
        ><slot name="pagination"></slot>
      </div>
    </div>`;
  }
}

export class AdminCrudToolbarElement extends AdminElement {
  static properties = {
    selected: { type: Number },
    searchPlaceholder: { type: String, attribute: "search-placeholder" },
    searchValue: { type: String, attribute: "search-value" },
    loading: { type: Boolean, reflect: true },
  };
  static styles = css`
    :host {
      display: block;
      min-width: 0;
    }
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      padding: 10px 12px;
      border: 1px solid var(--aui-border);
      background: var(--aui-surface);
    }
    .search {
      min-width: 220px;
      flex: 1;
      display: flex;
      align-items: center;
      border: 1px solid var(--aui-border);
      background: var(--aui-bg);
    }
    input {
      min-width: 0;
      flex: 1;
      padding: 8px 9px;
      border: 0;
      outline: 0;
      background: transparent;
      color: var(--aui-text);
      font: 11px/1.2 var(--aui-font-mono);
    }
    input::placeholder {
      color: var(--aui-text-muted);
    }
    .search button {
      width: 28px;
      border: 0;
      background: transparent;
      color: var(--aui-text-muted);
      cursor: pointer;
    }
    .summary {
      color: var(--aui-text-muted);
      font: 10px/1 var(--aui-font-mono);
      white-space: nowrap;
    }
    .summary strong {
      color: var(--aui-text-primary);
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
  `;
  selected = 0;
  searchPlaceholder = "Search";
  searchValue = "";
  loading = false;
  private search(event: Event): void {
    this.searchValue = (event.target as HTMLInputElement).value;
    this.dispatchDetail("aui-search", { value: this.searchValue });
  }
  private clear(): void {
    this.searchValue = "";
    this.dispatchDetail("aui-search", { value: "" });
    this.requestUpdate();
  }
  private refresh(): void {
    if (!this.loading) this.dispatchDetail("aui-refresh", {});
  }
  render() {
    return html`<div class="toolbar">
      <div class="search">
        <input
          type="search"
          .value=${this.searchValue}
          placeholder=${this.searchPlaceholder}
          aria-label=${this.searchPlaceholder}
          @input=${this.search}
        /><button
          type="button"
          aria-label="Clear search"
          ?hidden=${!this.searchValue}
          @click=${this.clear}
        >
          ×
        </button>
      </div>
      <div class="summary"><strong>${this.selected}</strong> SELECTED</div>
      <div class="actions">
        <slot></slot
        ><button
          type="button"
          aria-label="Refresh"
          @click=${this.refresh}
          ?disabled=${this.loading}
        >
          ↻
        </button>
      </div>
    </div>`;
  }
}

export interface AdminBusinessColumn {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "center" | "right";
}

export class AdminAdvancedTableElement extends AdminElement {
  static properties = {
    columns: { attribute: false },
    rows: { attribute: false },
    selectable: { type: Boolean, reflect: true },
    loading: { type: Boolean, reflect: true },
    emptyLabel: { type: String, attribute: "empty-label" },
    selectedKeys: { attribute: false },
    sortKey: { type: String, attribute: "sort-key" },
    sortDirection: { type: String, attribute: "sort-direction" },
  };
  static styles = css`
    :host {
      display: block;
      min-width: 0;
    }
    .frame {
      overflow-x: auto;
      border: 1px solid var(--aui-border);
      background: var(--aui-bg);
    }
    table {
      width: 100%;
      min-width: 720px;
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
    }
    tr:hover td {
      background: rgb(39 39 42 / 50%);
    }
    tr[data-selected="true"] td {
      background: rgb(255 255 255 / 5%);
      color: var(--aui-text-primary);
    }
    .sort {
      border: 0;
      background: transparent;
      color: inherit;
      cursor: pointer;
      font: inherit;
      text-transform: inherit;
    }
    .checkbox {
      width: 15px;
      height: 15px;
      margin: 0;
      accent-color: var(--aui-text-primary);
    }
    .state {
      padding: 48px 16px;
      color: var(--aui-text-muted);
      text-align: center;
      font: 11px/1 var(--aui-font-mono);
    }
  `;
  columns: AdminBusinessColumn[] = [];
  rows: Array<Record<string, unknown> & { id?: string | number }> = [];
  selectable = false;
  loading = false;
  emptyLabel = "NO DATA AVAILABLE";
  selectedKeys: Array<string | number> = [];
  sortKey = "";
  sortDirection: "asc" | "desc" = "asc";
  private key(
    row: Record<string, unknown> & { id?: string | number },
    index: number,
  ): string | number {
    return row.id ?? index;
  }
  private toggleRow(key: string | number): void {
    this.selectedKeys = this.selectedKeys.includes(key)
      ? this.selectedKeys.filter((item) => item !== key)
      : [...this.selectedKeys, key];
    this.dispatchDetail("aui-selection-change", { keys: this.selectedKeys });
    this.requestUpdate();
  }
  private toggleAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedKeys = checked ? this.rows.map((row, index) => this.key(row, index)) : [];
    this.dispatchDetail("aui-selection-change", { keys: this.selectedKeys });
    this.requestUpdate();
  }
  private sort(column: AdminBusinessColumn): void {
    if (!column.sortable) return;
    const direction = this.sortKey === column.key && this.sortDirection === "asc" ? "desc" : "asc";
    this.sortKey = column.key;
    this.sortDirection = direction;
    this.dispatchDetail("aui-sort-change", { key: column.key, direction });
    this.requestUpdate();
  }
  private headerCell(column: AdminBusinessColumn): unknown {
    if (!column.sortable) return column.label;
    let marker = "↕";
    if (this.sortKey === column.key) marker = this.sortDirection === "asc" ? "↑" : "↓";
    return html`<button class="sort" type="button" @click=${() => this.sort(column)}>
      ${column.label} ${marker}
    </button>`;
  }

  private renderTable(allSelected: boolean): unknown {
    return html`<table>
      <thead>
        <tr>
          ${this.selectable
            ? html`<th>
                <input
                  class="checkbox"
                  type="checkbox"
                  aria-label="Select all rows"
                  .checked=${allSelected}
                  @change=${this.toggleAll}
                />
              </th>`
            : null}${this.columns.map(
            (column) =>
              html`<th style=${`text-align:${column.align ?? "left"}`}>
                ${this.headerCell(column)}
              </th>`,
          )}
        </tr>
      </thead>
      <tbody>
        ${this.rows.map((row, index) => {
          const key = this.key(row, index);
          return html`<tr data-selected=${this.selectedKeys.includes(key) ? "true" : "false"}>
            ${this.selectable
              ? html`<td>
                  <input
                    class="checkbox"
                    type="checkbox"
                    aria-label=${`Select row ${key}`}
                    .checked=${this.selectedKeys.includes(key)}
                    @change=${() => this.toggleRow(key)}
                  />
                </td>`
              : null}${this.columns.map(
              (column) =>
                html`<td style=${`text-align:${column.align ?? "left"}`}>
                  ${String(row[column.key] ?? "—")}
                </td>`,
            )}
          </tr>`;
        })}
      </tbody>
    </table>`;
  }

  render() {
    const allSelected = this.rows.length > 0 && this.selectedKeys.length === this.rows.length;
    let content: unknown = this.renderTable(allSelected);
    if (this.loading) content = html`<div class="state">LOADING...</div>`;
    else if (this.rows.length === 0) {
      content = html`<div class="state" role="status">${this.emptyLabel}</div>`;
    }
    return html`<div class="frame">${content}<slot></slot></div>`;
  }
}
