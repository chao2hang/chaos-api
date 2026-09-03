/*
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
*/

import { css, html } from "lit";
import { AdminElement } from "./base";

export interface AdminMenuItem {
  id: string;
  label: string;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
}

export class AdminTooltipElement extends AdminElement {
  static properties = { content: { type: String }, side: { type: String, reflect: true } };
  static styles = css`
    :host {
      position: relative;
      display: inline-flex;
    }
    .tooltip {
      position: absolute;
      z-index: 50;
      left: 50%;
      bottom: calc(100% + 8px);
      width: max-content;
      max-width: 240px;
      transform: translateX(-50%) translateY(3px);
      padding: 6px 8px;
      border: 1px solid var(--aui-border-hover);
      background: var(--aui-header);
      color: var(--aui-text);
      opacity: 0;
      pointer-events: none;
      transition:
        opacity var(--aui-transition),
        transform var(--aui-transition);
      font: 10px/1.3 var(--aui-font-mono);
    }
    :host([side="bottom"]) .tooltip {
      top: calc(100% + 8px);
      bottom: auto;
    }
    :host(:hover) .tooltip,
    :host(:focus-within) .tooltip {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    @media (prefers-reduced-motion: reduce) {
      .tooltip {
        transition: none;
      }
    }
  `;
  content = "";
  side = "top";
  render() {
    return html`<slot></slot
      ><span class="tooltip" role="tooltip"
        >${this.content || html`<slot name="content"></slot>`}</span
      >`;
  }
}

export class AdminPopoverElement extends AdminElement {
  static properties = { open: { type: Boolean, reflect: true }, title: { type: String } };
  static styles = css`
    :host {
      position: relative;
      display: inline-flex;
    }
    .content {
      position: absolute;
      z-index: 40;
      top: calc(100% + 8px);
      left: 0;
      min-width: 220px;
      padding: 14px;
      border: 1px solid var(--aui-border);
      background: var(--aui-surface);
      box-shadow: 8px 8px 0 rgb(0 0 0 / 22%);
    }
    :host(:not([open])) .content {
      display: none;
    }
    .title {
      margin-bottom: 9px;
      color: var(--aui-text-primary);
      font: 700 11px/1 var(--aui-font-mono);
      text-transform: uppercase;
    }
  `;
  open = false;
  title = "";
  private toggle(event: Event): void {
    if ((event.target as HTMLElement).closest("[slot='content']")) return;
    this.open = !this.open;
    this.dispatchDetail("aui-open-change", { open: this.open });
  }
  render() {
    return html`<span @click=${this.toggle}><slot name="trigger"></slot><slot></slot></span>
      <div class="content" role="dialog">
        ${this.title ? html`<div class="title">${this.title}</div>` : null}<slot
          name="content"
        ></slot>
      </div>`;
  }
}

export class AdminDropdownElement extends AdminElement {
  static properties = { items: { attribute: false }, open: { type: Boolean, reflect: true } };
  static styles = css`
    :host {
      position: relative;
      display: inline-flex;
    }
    .menu {
      position: absolute;
      z-index: 50;
      top: calc(100% + 5px);
      right: 0;
      min-width: 180px;
      padding: 4px;
      border: 1px solid var(--aui-border);
      background: var(--aui-surface);
      box-shadow: 8px 8px 0 rgb(0 0 0 / 22%);
    }
    :host(:not([open])) .menu {
      display: none;
    }
    button {
      width: 100%;
      display: flex;
      justify-content: space-between;
      gap: 15px;
      padding: 8px;
      border: 0;
      background: transparent;
      color: var(--aui-text-secondary);
      cursor: pointer;
      text-align: left;
      font: 11px/1.2 var(--aui-font-mono);
    }
    button:hover:not(:disabled) {
      background: var(--aui-header);
      color: var(--aui-text-primary);
    }
    button.danger {
      color: var(--aui-danger);
    }
    button.separator {
      margin-top: 4px;
      border-top: 1px solid var(--aui-border);
    }
    kbd {
      color: var(--aui-text-muted);
      font: 10px/1 var(--aui-font-mono);
    }
  `;
  items: AdminMenuItem[] = [];
  open = false;
  private select(item: AdminMenuItem): void {
    if (item.disabled || item.separator) return;
    this.dispatchDetail("aui-menu-select", { id: item.id });
    this.open = false;
  }
  render() {
    return html`<span
        @click=${() => {
          this.open = !this.open;
          this.dispatchDetail("aui-open-change", { open: this.open });
        }}
        ><slot name="trigger"><slot></slot></slot
      ></span>
      <div class="menu" role="menu">
        ${this.items.map(
          (item) =>
            html`<button
              type="button"
              role="menuitem"
              class=${`${item.danger ? "danger" : ""} ${item.separator ? "separator" : ""}`}
              ?disabled=${item.disabled}
              @click=${() => this.select(item)}
            >
              ${item.label}${item.shortcut ? html`<kbd>${item.shortcut}</kbd>` : null}
            </button>`,
        )}
      </div>`;
  }
}

export class AdminDrawerElement extends AdminElement {
  static properties = {
    open: { type: Boolean, reflect: true },
    title: { type: String },
    side: { type: String, reflect: true },
    width: { type: String },
  };
  static styles = css`
    :host {
      display: contents;
    }
    .backdrop {
      position: fixed;
      z-index: 60;
      inset: 0;
      background: rgb(0 0 0 / 72%);
    }
    .panel {
      position: fixed;
      z-index: 61;
      top: 0;
      bottom: 0;
      right: 0;
      width: min(var(--aui-drawer-width, 420px), 100vw);
      display: flex;
      flex-direction: column;
      border-left: 1px solid var(--aui-border);
      background: var(--aui-surface);
    }
    :host([side="left"]) .panel {
      right: auto;
      left: 0;
      border-right: 1px solid var(--aui-border);
      border-left: 0;
    }
    :host(:not([open])) .backdrop,
    :host(:not([open])) .panel {
      display: none;
    }
    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 18px;
      border-bottom: 1px solid var(--aui-border);
    }
    h2 {
      margin: 0;
      color: var(--aui-text-primary);
      font: 700 14px/1.2 var(--aui-font-mono);
      text-transform: uppercase;
    }
    .close {
      width: 28px;
      height: 28px;
      border: 1px solid var(--aui-border);
      background: transparent;
      color: var(--aui-text-secondary);
      cursor: pointer;
    }
    .body {
      min-height: 0;
      flex: 1;
      overflow: auto;
      padding: 18px;
    }
    .footer {
      padding: 14px 18px;
      border-top: 1px solid var(--aui-border);
      background: var(--aui-header);
    }
  `;
  open = false;
  title = "";
  side = "right";
  width = "420px";
  connectedCallback(): void {
    super.connectedCallback();
    this.style.setProperty("--aui-drawer-width", this.width);
  }
  private close(): void {
    this.open = false;
    this.dispatchDetail("aui-close", { open: false });
  }
  private cancel(event: Event): void {
    event.preventDefault();
    this.close();
  }
  render() {
    return html`<div class="backdrop" @click=${this.close}></div>
      <aside
        class="panel"
        role="dialog"
        aria-modal="true"
        aria-label=${this.title}
        @keydown=${(event: KeyboardEvent) => {
          if (event.key === "Escape") this.close();
        }}
      >
        <header class="header">
          <h2>${this.title}<slot name="title"></slot></h2>
          <button class="close" type="button" aria-label="Close" @click=${this.close}>×</button>
        </header>
        <div class="body"><slot></slot></div>
        <footer class="footer"><slot name="footer"></slot></footer>
      </aside>
      <div @click=${this.cancel}><slot name="trigger"></slot></div>`;
  }
}

export class AdminToastElement extends AdminElement {
  static properties = {
    open: { type: Boolean, reflect: true },
    title: { type: String },
    message: { type: String },
    variant: { type: String, reflect: true },
    duration: { type: Number },
  };
  static styles = css`
    :host {
      position: fixed;
      z-index: 100;
      right: 20px;
      bottom: 20px;
      display: block;
    }
    :host(:not([open])) {
      display: none;
    }
    .toast {
      min-width: 280px;
      max-width: 420px;
      padding: 14px 16px;
      border: 1px solid var(--aui-border-hover);
      background: var(--aui-surface);
      box-shadow: 8px 8px 0 rgb(0 0 0 / 25%);
    }
    :host([variant="success"]) .toast {
      border-color: var(--aui-success);
    }
    :host([variant="danger"]) .toast {
      border-color: var(--aui-danger);
    }
    .row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }
    strong {
      color: var(--aui-text-primary);
      font: 700 11px/1.2 var(--aui-font-mono);
      text-transform: uppercase;
    }
    p {
      margin: 7px 0 0;
      color: var(--aui-text-secondary);
      font: 12px/1.4 var(--aui-font-mono);
    }
    button {
      border: 0;
      background: transparent;
      color: var(--aui-text-muted);
      cursor: pointer;
    }
  `;
  open = false;
  title = "Notification";
  message = "";
  variant = "default";
  duration = 4000;
  protected updated(changed: Map<string, unknown>): void {
    if (changed.has("open") && this.open && this.duration > 0) {
      window.setTimeout(() => {
        this.open = false;
        this.dispatchDetail("aui-close", { open: false });
      }, this.duration);
    }
  }
  render() {
    return html`<div class="toast" role="status">
      <div class="row">
        <strong>${this.title}</strong
        ><button
          type="button"
          aria-label="Close"
          @click=${() => {
            this.open = false;
          }}
        >
          ×
        </button>
      </div>
      <p>${this.message}<slot></slot></p>
    </div>`;
  }
}
