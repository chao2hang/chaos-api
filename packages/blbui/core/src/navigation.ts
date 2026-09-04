/*
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
*/

import { css, html } from "lit";
import { AdminElement } from "./base";

export interface AdminNavItem {
  id: string;
  label: string;
  href?: string;
  active?: boolean;
  disabled?: boolean;
}

export class AdminNavElement extends AdminElement {
  static properties = { items: { attribute: false } };
  static styles = css`
    :host {
      display: block;
    }
    nav {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    a,
    button {
      display: block;
      width: 100%;
      padding: 8px 12px;
      border: 0;
      border-left: 2px solid transparent;
      border-radius: 0;
      background: transparent;
      color: var(--aui-text-secondary);
      cursor: pointer;
      text-align: left;
      text-decoration: none;
      font: 12px/1.2 var(--aui-font-mono);
    }
    a:hover,
    button:hover:not(:disabled) {
      color: var(--aui-text-primary);
    }
    [aria-current="page"] {
      border-left-color: var(--aui-text-primary);
      background: linear-gradient(90deg, rgb(255 255 255 / 3%), transparent);
      color: var(--aui-text-primary);
      font-weight: 500;
    }
    button:disabled {
      cursor: not-allowed;
      opacity: 0.3;
    }
  `;
  items: AdminNavItem[] = [];
  render() {
    return html`<nav aria-label="Primary navigation">
      ${this.items.map((item) =>
        item.href
          ? html`<a
              href=${item.href}
              aria-current=${item.active ? "page" : "false"}
              aria-disabled=${item.disabled ? "true" : "false"}
              >${item.label}</a
            >`
          : html`<button
              type="button"
              ?disabled=${item.disabled}
              aria-current=${item.active ? "page" : "false"}
              @click=${() => this.dispatchDetail("aui-nav-change", { id: item.id })}
            >
              ${item.label}
            </button>`,
      )}
    </nav>`;
  }
}

export class AdminBreadcrumbElement extends AdminElement {
  static properties = { items: { attribute: false } };
  static styles = css`
    :host {
      display: block;
    }
    nav {
      color: var(--aui-text-secondary);
      font: 12px/1.2 var(--aui-font-mono);
      text-transform: uppercase;
    }
    ol {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li:not(:last-child)::after {
      content: "/";
      margin-left: 8px;
      color: var(--aui-text-muted);
    }
    li:last-child {
      color: var(--aui-text);
    }
  `;
  items: string[] = [];
  render() {
    return html`<nav aria-label="Breadcrumb">
      <ol>
        ${this.items.map((item) => html`<li>${item}</li>`)}
      </ol>
    </nav>`;
  }
}
