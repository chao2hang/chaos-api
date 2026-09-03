/*
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
*/

import { css, html, nothing } from "lit";
import { AdminElement } from "./base";

export class AdminDialogElement extends AdminElement {
  static properties = {
    open: { type: Boolean, reflect: true },
    title: { type: String },
    description: { type: String },
    closeLabel: { type: String, attribute: "close-label" },
  };

  static styles = css`
    :host {
      display: contents;
    }
    dialog {
      width: min(560px, calc(100vw - 32px));
      max-height: 85vh;
      padding: 0;
      border: 1px solid var(--aui-border);
      border-radius: 0;
      background: var(--aui-surface);
      color: var(--aui-text);
      box-shadow: none;
    }
    dialog::backdrop {
      background: rgb(0 0 0 / 78%);
    }
    .panel {
      display: flex;
      max-height: 85vh;
      flex-direction: column;
    }
    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 16px;
      border-bottom: 1px solid var(--aui-border);
    }
    h2 {
      margin: 0;
      color: var(--aui-text-primary);
      font: 700 16px/1.2 var(--aui-font-mono);
      text-transform: uppercase;
    }
    p {
      margin: 6px 0 0;
      color: var(--aui-text-secondary);
      font: 12px/1.45 var(--aui-font-mono);
    }
    .close {
      width: 28px;
      height: 28px;
      flex: 0 0 28px;
      border: 1px solid var(--aui-border);
      border-radius: 0;
      background: transparent;
      color: var(--aui-text-secondary);
      cursor: pointer;
      font: 14px/1 var(--aui-font-mono);
    }
    .close:hover {
      border-color: var(--aui-border-hover);
      color: var(--aui-text-primary);
    }
    .body {
      overflow: auto;
      padding: 16px;
    }
    .footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 16px;
      border-top: 1px solid var(--aui-border);
      background: var(--aui-header);
    }
  `;

  open = false;
  title = "";
  description = "";
  closeLabel = "Close";

  protected firstUpdated(): void {
    this.syncDialog();
  }

  protected updated(changed: Map<string, unknown>): void {
    if (changed.has("open")) this.syncDialog();
  }

  private syncDialog(): void {
    const dialog = this.renderRoot.querySelector("dialog");
    if (!dialog) return;
    if (this.open && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    if (!this.open && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  }

  private close(): void {
    this.open = false;
    this.dispatchDetail("aui-close", { open: false });
  }

  private handleCancel(event: Event): void {
    event.preventDefault();
    this.close();
  }

  private handleClick(event: MouseEvent): void {
    const dialog = event.currentTarget as HTMLDialogElement;
    if (event.target === dialog) this.close();
  }

  render() {
    return html`<dialog
        @cancel=${this.handleCancel}
        @click=${this.handleClick}
        aria-labelledby="dialog-title"
      >
        <div class="panel">
          <header class="header">
            <div>
              <h2 id="dialog-title">${this.title || html`<slot name="title"></slot>`}</h2>
              ${this.description
                ? html`<p>${this.description}</p>`
                : html`<p><slot name="description"></slot></p>`}
            </div>
            <button class="close" type="button" aria-label=${this.closeLabel} @click=${this.close}>
              ×
            </button>
          </header>
          <div class="body"><slot></slot></div>
          <footer class="footer"><slot name="footer"></slot></footer>
        </div>
      </dialog>
      ${nothing}`;
  }
}

export class AdminConfirmDialogElement extends AdminElement {
  static properties = {
    open: { type: Boolean, reflect: true },
    title: { type: String },
    description: { type: String },
    confirmLabel: { type: String, attribute: "confirm-label" },
    cancelLabel: { type: String, attribute: "cancel-label" },
    loading: { type: Boolean, reflect: true },
    danger: { type: Boolean, reflect: true },
  };

  static styles = css`
    :host {
      display: contents;
    }
    dialog {
      width: min(480px, calc(100vw - 32px));
      padding: 0;
      border: 1px solid var(--aui-border);
      border-radius: 0;
      background: var(--aui-surface);
      color: var(--aui-text);
      box-shadow: none;
    }
    dialog::backdrop {
      background: rgb(0 0 0 / 78%);
    }
    .panel {
      display: flex;
      flex-direction: column;
    }
    .header,
    .footer {
      padding: 16px;
    }
    .header {
      border-bottom: 1px solid var(--aui-border);
    }
    .footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      border-top: 1px solid var(--aui-border);
      background: var(--aui-header);
    }
    h2 {
      margin: 0;
      color: var(--aui-text-primary);
      font: 700 16px/1.2 var(--aui-font-mono);
      text-transform: uppercase;
    }
    p {
      margin: 8px 0 0;
      color: var(--aui-text-secondary);
      font: 12px/1.45 var(--aui-font-mono);
    }
    .body {
      padding: 16px;
      font: 12px/1.45 var(--aui-font-mono);
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
    .confirm {
      border-color: var(--aui-text-primary);
      background: var(--aui-text-primary);
      color: var(--aui-text-inverse);
    }
    .confirm.danger {
      border-color: var(--aui-danger);
      background: transparent;
      color: var(--aui-danger);
    }
    .confirm.danger:hover:not(:disabled) {
      background: rgb(239 68 68 / 10%);
    }
    button:disabled {
      cursor: not-allowed;
      opacity: 0.3;
    }
  `;

  open = false;
  title = "";
  description = "";
  confirmLabel = "Confirm";
  cancelLabel = "Cancel";
  loading = false;
  danger = false;

  protected firstUpdated(): void {
    this.syncDialog();
  }
  protected updated(changed: Map<string, unknown>): void {
    if (changed.has("open")) this.syncDialog();
  }
  private syncDialog(): void {
    const dialog = this.renderRoot.querySelector("dialog");
    if (!dialog) return;
    if (this.open && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    if (!this.open && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  }
  private cancel(): void {
    this.open = false;
    this.dispatchDetail("aui-cancel", { open: false });
    this.dispatchDetail("aui-close", { open: false });
  }
  private confirm(): void {
    if (this.loading) return;
    this.dispatchDetail("aui-confirm", { open: true });
  }
  private handleCancel(event: Event): void {
    event.preventDefault();
    this.cancel();
  }

  render() {
    return html`<dialog @cancel=${this.handleCancel} aria-labelledby="confirm-title">
      <div class="panel">
        <header class="header">
          <h2 id="confirm-title">${this.title}<slot name="title"></slot></h2>
          <p>${this.description}<slot name="description"></slot></p>
        </header>
        <div class="body"><slot></slot></div>
        <footer class="footer">
          <button type="button" ?disabled=${this.loading} @click=${this.cancel}>
            ${this.cancelLabel}</button
          ><button
            class="confirm ${this.danger ? "danger" : ""}"
            type="button"
            ?disabled=${this.loading}
            aria-busy=${this.loading ? "true" : "false"}
            @click=${this.confirm}
          >
            ${this.loading ? "..." : this.confirmLabel}
          </button>
        </footer>
      </div>
    </dialog>`;
  }
}
