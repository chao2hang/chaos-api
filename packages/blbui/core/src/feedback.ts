/*
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
*/

import { css, html } from "lit";
import { AdminElement } from "./base";

export type AdminStatus = "success" | "danger" | "warning" | "info" | "default";

export class AdminStatusTagElement extends AdminElement {
  static properties = { status: { type: String, reflect: true } };
  static styles = css`
    :host {
      display: inline-flex;
    }
    .tag {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 1px 4px;
      border: 1px solid currentColor;
      color: var(--aui-text-muted);
      font: 10px/1.2 var(--aui-font-mono);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    :host([status="success"]) .tag {
      color: var(--aui-success);
    }
    :host([status="danger"]) .tag {
      color: var(--aui-danger);
    }
    :host([status="warning"]) .tag {
      color: var(--aui-warning);
    }
    :host([status="info"]) .tag {
      color: var(--aui-info);
    }
  `;
  status: AdminStatus = "default";
  render() {
    return html`<span class="tag" role="status"><slot></slot></span>`;
  }
}

export class AdminSpinnerElement extends AdminElement {
  static styles = css`
    :host {
      display: inline-flex;
    }
    .spinner {
      width: 16px;
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
  render() {
    return html`<span class="spinner" role="status" aria-label="loading"
      ><i></i><i></i><i></i
    ></span>`;
  }
}

export class AdminEmptyStateElement extends AdminElement {
  static properties = { title: { type: String }, description: { type: String } };
  static styles = css`
    :host {
      display: block;
    }
    .state {
      min-height: 160px;
      padding: 48px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      color: var(--aui-text-muted);
      border: 1px dashed var(--aui-border);
      font-family: var(--aui-font-mono);
    }
    .title {
      color: var(--aui-text-secondary);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .description {
      max-width: 480px;
      margin-top: 6px;
      font-size: 12px;
    }
    .actions {
      margin-top: 16px;
    }
  `;
  title = "";
  description = "";
  render() {
    return html`<div class="state" role="status">
      <div class="title">${this.title || html`<slot name="title"></slot>`}</div>
      <div class="description">${this.description || html`<slot name="description"></slot>`}</div>
      <div class="actions"><slot></slot></div>
    </div>`;
  }
}

export class AdminErrorStateElement extends AdminElement {
  static properties = { title: { type: String }, description: { type: String } };
  static styles = css`
    :host {
      display: block;
    }
    .state {
      padding: 16px;
      border: 1px solid rgb(239 68 68 / 40%);
      background: rgb(239 68 68 / 5%);
      color: var(--aui-danger);
      font-family: var(--aui-font-mono);
    }
    .title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .description {
      margin-top: 6px;
      color: #fca5a5;
      font-size: 12px;
    }
    .actions {
      margin-top: 12px;
    }
  `;
  title = "";
  description = "";
  render() {
    return html`<div class="state" role="alert">
      <div class="title">${this.title || html`<slot name="title"></slot>`}</div>
      <div class="description">${this.description || html`<slot name="description"></slot>`}</div>
      <div class="actions"><slot></slot></div>
    </div>`;
  }
}

export class AdminSkeletonElement extends AdminElement {
  static properties = { width: { type: String }, height: { type: String } };
  static styles = css`
    :host {
      display: block;
    }
    .skeleton {
      width: var(--aui-skeleton-width, 100%);
      height: var(--aui-skeleton-height, 16px);
      background: linear-gradient(90deg, var(--aui-header), #27272a, var(--aui-header));
      background-size: 300% 100%;
      animation: shimmer 1.8s ease-in-out infinite;
    }
    @keyframes shimmer {
      0% {
        background-position: 100% 50%;
      }
      100% {
        background-position: -100% 50%;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .skeleton {
        animation: none;
        background: var(--aui-header);
      }
    }
  `;
  width = "100%";
  height = "16px";
  render() {
    return html`<span
      class="skeleton"
      role="progressbar"
      aria-label="Loading"
      style=${`--aui-skeleton-width:${this.width};--aui-skeleton-height:${this.height}`}
    ></span>`;
  }
}

export class AdminSeparatorElement extends AdminElement {
  static properties = { vertical: { type: Boolean, reflect: true } };
  static styles = css`
    :host {
      display: block;
      height: 1px;
      background: var(--aui-border);
    }
    :host([vertical]) {
      width: 1px;
      height: auto;
      align-self: stretch;
    }
  `;
  vertical = false;
  render() {
    return html`<span
      role="separator"
      aria-orientation=${this.vertical ? "vertical" : "horizontal"}
    ></span>`;
  }
}

export class AdminCopyableTextElement extends AdminElement {
  static properties = {
    text: { type: String },
    copiedLabel: { type: String, attribute: "copied-label" },
    copyLabel: { type: String, attribute: "copy-label" },
  };
  static styles = css`
    :host {
      display: inline-flex;
      max-width: 100%;
      align-items: center;
      gap: 8px;
    }
    .text {
      min-width: 0;
      overflow: hidden;
      color: var(--aui-text);
      text-overflow: ellipsis;
      white-space: nowrap;
      font: 11px/1.2 var(--aui-font-mono);
    }
    button {
      width: 28px;
      height: 28px;
      flex: 0 0 28px;
      border: 1px solid var(--aui-border);
      border-radius: 0;
      background: transparent;
      color: var(--aui-text-secondary);
      cursor: pointer;
      font: 11px/1 var(--aui-font-mono);
    }
    button:hover {
      border-color: var(--aui-border-hover);
      color: var(--aui-text-primary);
    }
  `;
  text = "";
  copiedLabel = "COPIED";
  copyLabel = "COPY";
  private copied = false;

  private async copy(): Promise<void> {
    if (!this.text) return;
    await navigator.clipboard?.writeText(this.text);
    this.copied = true;
    this.dispatchDetail("aui-copy", { text: this.text });
    this.requestUpdate();
    window.setTimeout(() => {
      this.copied = false;
      this.requestUpdate();
    }, 1500);
  }

  render() {
    return html`<span class="text" title=${this.text}><slot>${this.text}</slot></span
      ><button
        type="button"
        aria-label=${this.copied ? this.copiedLabel : this.copyLabel}
        @click=${this.copy}
      >
        ${this.copied ? "✓" : "⧉"}
      </button>`;
  }
}
