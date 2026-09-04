/*
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
*/

import { css, html } from "lit";
import { AdminElement } from "./base";

export type AdminButtonVariant = "primary" | "secondary" | "danger";
export type AdminButtonSize = "default" | "compact";

export class AdminButtonElement extends AdminElement {
  static properties = {
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    loading: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    type: { type: String, reflect: true },
  };

  static styles = css`
    :host {
      display: inline-flex;
    }
    button {
      min-height: var(--aui-control-height);
      padding: 4px 12px;
      border: 1px solid var(--aui-border);
      border-radius: 0;
      background: transparent;
      color: var(--aui-text);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font: 700 12px/1.2 var(--aui-font-mono);
      letter-spacing: -0.025em;
      text-transform: uppercase;
      transition:
        background-color var(--aui-transition),
        border-color var(--aui-transition),
        color var(--aui-transition);
    }
    :host([size="compact"]) button {
      min-height: var(--aui-control-height-compact);
      padding: 3px 10px;
    }
    button:hover:not(:disabled) {
      border-color: var(--aui-border-hover);
      color: var(--aui-text-primary);
    }
    button:active:not(:disabled) {
      transform: scale(0.98);
    }
    button:disabled {
      cursor: not-allowed;
      opacity: 0.3;
    }
    :host([variant="primary"]) button {
      border-color: var(--aui-text-primary);
      background: var(--aui-text-primary);
      color: var(--aui-text-inverse);
    }
    :host([variant="primary"]) button:hover:not(:disabled) {
      border-color: #e4e4e7;
      background: #e4e4e7;
      color: var(--aui-text-inverse);
    }
    :host([variant="danger"]) button {
      border-color: rgb(239 68 68 / 40%);
      color: var(--aui-danger);
    }
    :host([variant="danger"]) button:hover:not(:disabled) {
      border-color: var(--aui-danger);
      background: rgb(239 68 68 / 10%);
      color: var(--aui-danger-hover);
    }
    .spinner {
      width: 11px;
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
      button:active:not(:disabled) {
        transform: none;
      }
    }
  `;

  variant: AdminButtonVariant = "secondary";
  size: AdminButtonSize = "default";
  loading = false;
  disabled = false;
  type: "button" | "submit" | "reset" = "button";

  render() {
    return html`
      <button
        type=${this.type}
        ?disabled=${this.disabled || this.loading}
        aria-busy=${this.loading ? "true" : "false"}
      >
        ${this.loading
          ? html`<span class="spinner" aria-hidden="true"><i></i><i></i><i></i></span>`
          : null}
        <slot></slot>
      </button>
    `;
  }
}
