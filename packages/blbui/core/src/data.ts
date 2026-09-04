/*
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
*/

import { css, html } from "lit";
import { AdminElement } from "./base";

export class AdminTableElement extends AdminElement {
  static properties = {
    loading: { type: Boolean, reflect: true },
    empty: { type: Boolean, reflect: true },
    loadingLabel: { type: String, attribute: "loading-label" },
    emptyLabel: { type: String, attribute: "empty-label" },
  };

  static styles = css`
    :host {
      display: block;
      min-width: 0;
    }
    .frame {
      overflow: hidden;
      border: 1px solid var(--aui-border);
      background: var(--aui-bg);
    }
    .scroll {
      overflow-x: auto;
    }
    :host([loading]) .scroll,
    :host([empty]) .scroll {
      min-height: 160px;
    }
    :host([loading]) .scroll,
    :host([empty]) .scroll {
      visibility: hidden;
    }
    .state {
      display: none;
      min-height: 160px;
      align-items: center;
      justify-content: center;
      padding: 48px 16px;
      color: var(--aui-text-muted);
      text-align: center;
      font: 12px/1.45 var(--aui-font-mono);
    }
    :host([loading]) .loading-state,
    :host([empty]) .empty-state {
      display: flex;
    }
    :host([loading][empty]) .empty-state {
      display: none;
    }
    .loading-state {
      gap: 8px;
    }
    .spinner {
      width: 12px;
      height: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 2px;
    }
    .spinner i {
      width: 3px;
      height: 6px;
      display: block;
      background: currentColor;
      animation: pulse 800ms ease-in-out infinite;
    }
    .spinner i:nth-child(2) {
      animation-delay: 100ms;
    }
    .spinner i:nth-child(3) {
      animation-delay: 200ms;
    }
    @keyframes pulse {
      0%,
      100% {
        opacity: 0.35;
        transform: scaleY(0.7);
      }
      50% {
        opacity: 1;
        transform: scaleY(1);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .spinner,
      .spinner::before,
      .spinner::after {
        animation: none;
        opacity: 1;
        transform: none;
      }
    }
  `;

  loading = false;
  empty = false;
  loadingLabel = "Loading...";
  emptyLabel = "No data available.";

  render() {
    return html`<div class="frame">
      <div class="scroll"><slot></slot></div>
      <div class="state loading-state">
        <span class="spinner" aria-hidden="true"><i></i><i></i><i></i></span
        ><span>${this.loadingLabel}</span>
      </div>
      <div class="state empty-state" role="status">${this.emptyLabel}</div>
    </div>`;
  }
}

export class AdminPaginationElement extends AdminElement {
  static properties = {
    page: { type: Number, reflect: true },
    totalPages: { type: Number, attribute: "total-pages" },
    total: { type: Number },
    pageSize: { type: Number, attribute: "page-size" },
    previousLabel: { type: String, attribute: "previous-label" },
    nextLabel: { type: String, attribute: "next-label" },
  };

  static styles = css`
    :host {
      display: block;
    }
    .pagination {
      min-height: 52px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 12px;
      border: 1px solid var(--aui-border);
      border-top: 0;
      background: var(--aui-surface-subtle);
      color: var(--aui-text-secondary);
      font: 12px/1.2 var(--aui-font-mono);
    }
    .summary strong {
      color: var(--aui-text-primary);
      font-weight: 500;
    }
    .actions {
      display: flex;
      gap: 8px;
    }
    button {
      min-height: 32px;
      padding: 4px 10px;
      border: 1px solid var(--aui-border);
      border-radius: 0;
      background: transparent;
      color: var(--aui-text);
      cursor: pointer;
      font: 700 11px/1 var(--aui-font-mono);
      text-transform: uppercase;
    }
    button:hover:not(:disabled) {
      border-color: var(--aui-border-hover);
      color: var(--aui-text-primary);
    }
    button:disabled {
      cursor: not-allowed;
      opacity: 0.3;
    }
    @media (max-width: 480px) {
      .pagination {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `;

  page = 1;
  totalPages = 1;
  total = 0;
  pageSize = 10;
  previousLabel = "PREV";
  nextLabel = "NEXT";

  private changePage(page: number): void {
    const nextPage = Math.min(this.totalPages, Math.max(1, page));
    if (nextPage === this.page) return;
    this.page = nextPage;
    this.dispatchDetail("aui-page-change", { page: nextPage });
  }

  render() {
    return html`<nav class="pagination" aria-label="Pagination">
      <div class="summary">
        PAGE <strong>${this.page}</strong> / <strong>${this.totalPages}</strong>${this.total > 0
          ? html` · ${this.total} TOTAL`
          : null}
      </div>
      <div class="actions">
        <button ?disabled=${this.page <= 1} @click=${() => this.changePage(this.page - 1)}>
          ${this.previousLabel}</button
        ><button
          ?disabled=${this.page >= this.totalPages}
          @click=${() => this.changePage(this.page + 1)}
        >
          ${this.nextLabel}
        </button>
      </div>
    </nav>`;
  }
}

export interface AdminTabItem {
  id: string;
  label: string;
  disabled?: boolean;
}

export class AdminTabsElement extends AdminElement {
  static properties = { items: { attribute: false }, active: { type: String, reflect: true } };
  static styles = css`
    :host {
      display: block;
    }
    .tabs {
      display: flex;
      gap: 24px;
      overflow-x: auto;
      border-bottom: 1px solid var(--aui-border);
    }
    button {
      position: relative;
      min-height: 40px;
      padding: 8px 0;
      border: 0;
      border-bottom: 2px solid transparent;
      background: transparent;
      color: var(--aui-text-secondary);
      cursor: pointer;
      font: 12px/1 var(--aui-font-mono);
      text-transform: uppercase;
    }
    button:hover:not(:disabled) {
      color: var(--aui-text);
    }
    button[aria-selected="true"] {
      border-bottom-color: var(--aui-text-primary);
      color: var(--aui-text-primary);
      font-weight: 700;
    }
    button:disabled {
      cursor: not-allowed;
      opacity: 0.3;
    }
  `;

  items: AdminTabItem[] = [];
  active = "";

  private select(id: string): void {
    if (id === this.active) return;
    this.active = id;
    this.dispatchDetail("aui-tab-change", { id });
  }

  render() {
    return html`<div class="tabs" role="tablist">
      ${this.items.map(
        (item) =>
          html`<button
            role="tab"
            aria-selected=${item.id === this.active ? "true" : "false"}
            ?disabled=${item.disabled}
            @click=${() => this.select(item.id)}
          >
            ${item.label}
          </button>`,
      )}
    </div>`;
  }
}
