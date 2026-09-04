/*
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
*/

import { css, html } from "lit";
import { AdminElement } from "./base";

export type AdminBadgeVariant = "default" | "primary" | "success" | "warning" | "danger" | "info";

export class AdminBadgeElement extends AdminElement {
  static properties = {
    variant: { type: String, reflect: true },
    dot: { type: Boolean, reflect: true },
  };
  static styles = css`
    :host {
      display: inline-flex;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 20px;
      padding: 3px 7px;
      border: 1px solid var(--aui-border);
      border-radius: 0;
      color: var(--aui-text-secondary);
      background: transparent;
      font: 10px/1.2 var(--aui-font-mono);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    :host([variant="primary"]) .badge {
      border-color: var(--aui-text-primary);
      color: var(--aui-text-primary);
    }
    :host([variant="success"]) .badge {
      border-color: rgb(16 185 129 / 45%);
      color: var(--aui-success);
    }
    :host([variant="warning"]) .badge {
      border-color: rgb(245 158 11 / 45%);
      color: var(--aui-warning);
    }
    :host([variant="danger"]) .badge {
      border-color: rgb(239 68 68 / 45%);
      color: var(--aui-danger);
    }
    :host([variant="info"]) .badge {
      border-color: rgb(96 165 250 / 45%);
      color: var(--aui-info);
    }
    .dot {
      width: 5px;
      height: 5px;
      background: currentColor;
    }
  `;
  variant: AdminBadgeVariant = "default";
  dot = false;
  render() {
    return html`<span class="badge"
      ><span class="dot" ?hidden=${!this.dot} aria-hidden="true"></span><slot></slot
    ></span>`;
  }
}

export type AdminAvatarSize = "sm" | "md" | "lg";

export class AdminAvatarElement extends AdminElement {
  static properties = {
    src: { type: String },
    alt: { type: String },
    initials: { type: String },
    size: { type: String, reflect: true },
  };
  static styles = css`
    :host {
      display: inline-flex;
    }
    .avatar {
      width: 32px;
      height: 32px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border: 1px solid var(--aui-border);
      background: var(--aui-header);
      color: var(--aui-text-primary);
      font: 700 11px/1 var(--aui-font-mono);
    }
    :host([size="sm"]) .avatar {
      width: 24px;
      height: 24px;
      font-size: 9px;
    }
    :host([size="lg"]) .avatar {
      width: 44px;
      height: 44px;
      font-size: 14px;
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `;
  src = "";
  alt = "";
  initials = "";
  size: AdminAvatarSize = "md";
  render() {
    return html`<span class="avatar"
      ><slot
        >${this.src ? html`<img src=${this.src} alt=${this.alt} />` : this.initials}</slot
      ></span
    >`;
  }
}

export class AdminProgressElement extends AdminElement {
  static properties = {
    value: { type: Number },
    max: { type: Number },
    label: { type: String },
    showValue: { type: Boolean, attribute: "show-value" },
  };
  static styles = css`
    :host {
      display: block;
    }
    .header {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 7px;
      color: var(--aui-text-secondary);
      font: 10px/1 var(--aui-font-mono);
      text-transform: uppercase;
    }
    .value {
      color: var(--aui-text-primary);
    }
    .track {
      height: 6px;
      overflow: hidden;
      border: 1px solid var(--aui-border);
      background: var(--aui-bg);
    }
    .indicator {
      height: 100%;
      background: var(--aui-text-primary);
      transition: width var(--aui-transition);
    }
    @media (prefers-reduced-motion: reduce) {
      .indicator {
        transition: none;
      }
    }
  `;
  value = 0;
  max = 100;
  label = "Progress";
  showValue = false;
  get percentage(): number {
    return Math.min(100, Math.max(0, this.max > 0 ? (this.value / this.max) * 100 : 0));
  }
  render() {
    return html`<div class="header">
        <span>${this.label}</span>${this.showValue
          ? html`<span class="value">${Math.round(this.percentage)}%</span>`
          : null}
      </div>
      <div
        class="track"
        role="progressbar"
        aria-label=${this.label}
        aria-valuemin="0"
        aria-valuemax=${this.max}
        aria-valuenow=${this.value}
      >
        <div class="indicator" style=${`width:${this.percentage}%`}></div>
      </div>`;
  }
}

export class AdminRatingElement extends AdminElement {
  static properties = {
    value: { type: Number },
    max: { type: Number },
    readonly: { type: Boolean, reflect: true },
  };
  static styles = css`
    :host {
      display: inline-flex;
    }
    .rating {
      display: inline-flex;
      gap: 3px;
    }
    button {
      width: 24px;
      height: 24px;
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--aui-border-hover);
      cursor: pointer;
      font-size: 17px;
      line-height: 1;
    }
    button[data-active="true"] {
      color: var(--aui-warning);
    }
    button:disabled {
      cursor: default;
      opacity: 1;
    }
  `;
  value = 0;
  max = 5;
  readonly = false;
  private select(value: number): void {
    if (this.readonly) return;
    this.value = value;
    this.dispatchDetail("aui-rating-change", { value });
  }
  render() {
    return html`<div class="rating" role="radiogroup" aria-label="Rating">
      ${Array.from({ length: this.max }, (_, index) => {
        const value = index + 1;
        return html`<button
          type="button"
          role="radio"
          aria-label=${`${value} of ${this.max}`}
          aria-checked=${value === this.value ? "true" : "false"}
          data-active=${value <= this.value ? "true" : "false"}
          ?disabled=${this.readonly}
          @click=${() => this.select(value)}
        >
          ★
        </button>`;
      })}
    </div>`;
  }
}

export class AdminKbdElement extends AdminElement {
  static styles = css`
    :host {
      display: inline-flex;
    }
    kbd {
      min-width: 20px;
      padding: 3px 5px;
      border: 1px solid var(--aui-border-hover);
      background: var(--aui-header);
      color: var(--aui-text-secondary);
      font: 10px/1 var(--aui-font-mono);
      text-align: center;
    }
  `;
  render() {
    return html`<kbd><slot></slot></kbd>`;
  }
}

export class AdminResultElement extends AdminElement {
  static properties = {
    status: { type: String },
    title: { type: String },
    description: { type: String },
  };
  static styles = css`
    :host {
      display: block;
    }
    .result {
      padding: 32px 16px;
      border: 1px solid var(--aui-border);
      text-align: center;
    }
    .icon {
      width: 36px;
      height: 36px;
      margin: 0 auto 14px;
      display: grid;
      place-items: center;
      border: 1px solid currentColor;
      color: var(--aui-text-primary);
      font: 700 18px/1 var(--aui-font-mono);
    }
    :host([status="success"]) .icon {
      color: var(--aui-success);
    }
    :host([status="error"]) .icon {
      color: var(--aui-danger);
    }
    :host([status="warning"]) .icon {
      color: var(--aui-warning);
    }
    h2 {
      margin: 0;
      color: var(--aui-text-primary);
      font: 700 14px/1.2 var(--aui-font-mono);
      text-transform: uppercase;
    }
    p {
      margin: 8px auto 0;
      max-width: 480px;
      color: var(--aui-text-secondary);
      font: 12px/1.5 var(--aui-font-mono);
    }
    .actions {
      margin-top: 18px;
    }
  `;
  status = "info";
  title = "";
  description = "";
  private icon(): string {
    if (this.status === "success") return "✓";
    if (this.status === "error") return "×";
    if (this.status === "warning") return "!";
    return "i";
  }
  render() {
    return html`<div class="result" role="status">
      <div class="icon" aria-hidden="true">${this.icon()}</div>
      <h2>${this.title}</h2>
      <p>${this.description}</p>
      <div class="actions"><slot></slot></div>
    </div>`;
  }
}
