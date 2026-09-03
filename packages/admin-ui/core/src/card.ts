/*
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
*/

import { css, html } from "lit";
import { AdminElement } from "./base";

export class AdminCardElement extends AdminElement {
  static properties = { hasHeader: { state: true }, hasFooter: { state: true } };
  static styles = css`
    :host {
      display: block;
    }
    .card {
      border: 1px solid var(--aui-border);
      background: var(--aui-surface);
    }
    .card:hover {
      border-color: var(--aui-border-hover);
    }
    .header {
      padding: 16px 16px 0;
    }
    .content {
      padding: 16px;
    }
    .footer {
      padding: 12px 16px;
      border-top: 1px solid var(--aui-border);
      background: var(--aui-surface-subtle);
    }
    .title {
      color: var(--aui-text-primary);
      font: 700 12px/1.2 var(--aui-font-mono);
      letter-spacing: 0.2em;
      text-transform: uppercase;
    }
    .description {
      margin-top: 4px;
      color: var(--aui-text-secondary);
      font: 12px/1.45 var(--aui-font-mono);
    }
  `;

  hasHeader = false;
  hasFooter = false;

  private handleSlotChange(event: Event): void {
    const slot = event.target as HTMLSlotElement;
    const assigned = slot.assignedElements({ flatten: true }).length > 0;
    if (slot.name === "header") this.hasHeader = assigned;
    if (slot.name === "footer") this.hasFooter = assigned;
  }

  render() {
    return html`
      <section class="card">
        ${this.hasHeader
          ? html`<header class="header">
              <slot name="header" @slotchange=${this.handleSlotChange}></slot>
            </header>`
          : html`<slot name="header" @slotchange=${this.handleSlotChange}></slot>`}
        <div class="content"><slot></slot></div>
        ${this.hasFooter
          ? html`<footer class="footer">
              <slot name="footer" @slotchange=${this.handleSlotChange}></slot>
            </footer>`
          : html`<slot name="footer" @slotchange=${this.handleSlotChange}></slot>`}
      </section>
    `;
  }
}
