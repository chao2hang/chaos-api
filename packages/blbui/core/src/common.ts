/*
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
*/

import { css, html } from "lit";
import { AdminElement } from "./base";

export class AdminToggleElement extends AdminElement {
  static properties = {
    pressed: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    label: { type: String },
  };
  static styles = css`
    :host {
      display: inline-flex;
    }
    button {
      min-height: 32px;
      padding: 7px 10px;
      border: 1px solid var(--aui-border);
      border-radius: 0;
      background: transparent;
      color: var(--aui-text-secondary);
      cursor: pointer;
      font: 11px/1 var(--aui-font-mono);
      text-transform: uppercase;
    }
    button:hover:not(:disabled) {
      border-color: var(--aui-border-hover);
      color: var(--aui-text-primary);
    }
    button[aria-pressed="true"] {
      border-color: var(--aui-text-primary);
      background: var(--aui-text-primary);
      color: var(--aui-text-inverse);
    }
    button:disabled {
      cursor: not-allowed;
      opacity: 0.3;
    }
  `;
  pressed = false;
  disabled = false;
  label = "Toggle";
  private toggle(): void {
    if (this.disabled) return;
    this.pressed = !this.pressed;
    this.dispatchDetail("aui-toggle-change", { pressed: this.pressed });
  }
  render() {
    return html`<button
      type="button"
      aria-label=${this.label}
      aria-pressed=${this.pressed ? "true" : "false"}
      ?disabled=${this.disabled}
      @click=${this.toggle}
    >
      <slot>${this.label}</slot>
    </button>`;
  }
}

export class AdminToggleGroupElement extends AdminElement {
  static properties = {
    items: { attribute: false },
    value: { type: String },
    multiple: { type: Boolean, reflect: true },
  };
  static styles = css`
    :host {
      display: inline-flex;
      max-width: 100%;
    }
    .group {
      display: flex;
      max-width: 100%;
      overflow: auto;
      border: 1px solid var(--aui-border);
    }
    button {
      min-height: 32px;
      padding: 7px 11px;
      border: 0;
      border-right: 1px solid var(--aui-border);
      background: transparent;
      color: var(--aui-text-secondary);
      cursor: pointer;
      font: 10px/1 var(--aui-font-mono);
      text-transform: uppercase;
      white-space: nowrap;
    }
    button:last-child {
      border-right: 0;
    }
    button:hover:not(:disabled) {
      color: var(--aui-text-primary);
    }
    button[aria-pressed="true"] {
      background: var(--aui-text-primary);
      color: var(--aui-text-inverse);
    }
    button:disabled {
      cursor: not-allowed;
      opacity: 0.3;
    }
  `;
  items: Array<{ id: string; label: string; disabled?: boolean }> = [];
  value = "";
  multiple = false;
  private select(id: string): void {
    if (this.multiple) return;
    this.value = id;
    this.dispatchDetail("aui-toggle-group-change", { value: id });
  }
  render() {
    return html`<div class="group" role="group">
      ${this.items.map(
        (item) =>
          html`<button
            type="button"
            aria-pressed=${item.id === this.value ? "true" : "false"}
            ?disabled=${item.disabled}
            @click=${() => this.select(item.id)}
          >
            ${item.label}
          </button>`,
      )}
    </div>`;
  }
}

export class AdminCollapsibleElement extends AdminElement {
  static properties = {
    open: { type: Boolean, reflect: true },
    title: { type: String },
    disabled: { type: Boolean, reflect: true },
  };
  static styles = css`
    :host {
      display: block;
    }
    details {
      border-top: 1px solid var(--aui-border);
      border-bottom: 1px solid var(--aui-border);
    }
    summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 13px 0;
      color: var(--aui-text);
      cursor: pointer;
      list-style: none;
      font: 11px/1.2 var(--aui-font-mono);
      text-transform: uppercase;
    }
    summary::-webkit-details-marker {
      display: none;
    }
    summary::after {
      content: "+";
      color: var(--aui-text-muted);
      font-size: 15px;
    }
    details[open] summary::after {
      content: "−";
      color: var(--aui-text-primary);
    }
    .content {
      padding: 0 0 15px;
      color: var(--aui-text-secondary);
      font: 12px/1.5 var(--aui-font-mono);
    }
  `;
  open = false;
  title = "Details";
  disabled = false;
  private change(event: Event): void {
    this.open = (event.target as HTMLDetailsElement).open;
    this.dispatchDetail("aui-open-change", { open: this.open });
  }
  render() {
    return html`<details .open=${this.open} ?inert=${this.disabled} @toggle=${this.change}>
      <summary>${this.title}<slot name="title"></slot></summary>
      <div class="content"><slot></slot></div>
    </details>`;
  }
}

export class AdminAspectRatioElement extends AdminElement {
  static properties = { ratio: { type: String } };
  static styles = css`
    :host {
      display: block;
    }
    .frame {
      position: relative;
      width: 100%;
      aspect-ratio: var(--aui-aspect-ratio, 16 / 9);
      overflow: hidden;
      border: 1px solid var(--aui-border);
      background: var(--aui-bg);
    }
    .content {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
    }
  `;
  ratio = "16 / 9";
  connectedCallback(): void {
    super.connectedCallback();
    this.style.setProperty("--aui-aspect-ratio", this.ratio);
  }
  render() {
    return html`<div class="frame">
      <div class="content"><slot></slot></div>
    </div>`;
  }
}

export class AdminScrollAreaElement extends AdminElement {
  static properties = {
    orientation: { type: String, reflect: true },
    maxHeight: { type: String, attribute: "max-height" },
  };
  static styles = css`
    :host {
      display: block;
      min-width: 0;
    }
    .scroll {
      max-height: var(--aui-scroll-max-height, 320px);
      overflow: auto;
    }
    :host([orientation="horizontal"]) .scroll {
      overflow-x: auto;
      overflow-y: hidden;
    }
    :host([orientation="both"]) .scroll {
      overflow: auto;
    }
  `;
  orientation = "vertical";
  maxHeight = "320px";
  connectedCallback(): void {
    super.connectedCallback();
    this.style.setProperty("--aui-scroll-max-height", this.maxHeight);
  }
  render() {
    return html`<div class="scroll"><slot></slot></div>`;
  }
}

export class AdminNumberInputElement extends AdminElement {
  static properties = {
    value: { type: Number },
    min: { type: Number },
    max: { type: Number },
    step: { type: Number },
    label: { type: String },
    disabled: { type: Boolean, reflect: true },
  };
  static styles = css`
    :host {
      display: block;
    }
    .number {
      display: flex;
      min-height: var(--aui-control-height);
      border: 1px solid var(--aui-border);
      background: var(--aui-bg);
    }
    .number:focus-within {
      border-color: var(--aui-focus);
      box-shadow: 0 0 0 1px var(--aui-focus);
    }
    input {
      min-width: 0;
      flex: 1;
      padding: 8px 10px;
      border: 0;
      outline: 0;
      background: transparent;
      color: var(--aui-text);
      font: 12px/1.2 var(--aui-font-mono);
    }
    button {
      width: 30px;
      border: 0;
      border-left: 1px solid var(--aui-border);
      background: var(--aui-header);
      color: var(--aui-text-secondary);
      cursor: pointer;
      font: 13px/1 var(--aui-font-mono);
    }
    button:first-child {
      border-right: 1px solid var(--aui-border);
      border-left: 0;
    }
    button:hover:not(:disabled) {
      color: var(--aui-text-primary);
    }
    button:disabled,
    input:disabled {
      cursor: not-allowed;
      opacity: 0.3;
    }
  `;
  value = 0;
  min = -Infinity;
  max = Infinity;
  step = 1;
  label = "Number";
  disabled = false;
  private updateValue(value: number): void {
    this.value = Math.min(this.max, Math.max(this.min, value));
    this.dispatchDetail("aui-number-change", { value: this.value });
    this.requestUpdate();
  }
  private input(event: Event): void {
    this.updateValue(Number((event.target as HTMLInputElement).value));
  }
  render() {
    return html`<div class="number">
      <button
        type="button"
        aria-label="Decrease"
        ?disabled=${this.disabled}
        @click=${() => this.updateValue(this.value - this.step)}
      >
        −</button
      ><input
        type="number"
        .value=${String(this.value)}
        min=${this.min}
        max=${this.max}
        step=${this.step}
        ?disabled=${this.disabled}
        aria-label=${this.label}
        @input=${this.input}
      /><button
        type="button"
        aria-label="Increase"
        ?disabled=${this.disabled}
        @click=${() => this.updateValue(this.value + this.step)}
      >
        +
      </button>
    </div>`;
  }
}

export class AdminCodeBlockElement extends AdminElement {
  static properties = {
    code: { type: String },
    language: { type: String },
    copyLabel: { type: String, attribute: "copy-label" },
  };
  static styles = css`
    :host {
      display: block;
    }
    .block {
      border: 1px solid var(--aui-border);
      background: var(--aui-bg);
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      border-bottom: 1px solid var(--aui-border);
      color: var(--aui-text-muted);
      font: 10px/1 var(--aui-font-mono);
      text-transform: uppercase;
    }
    button {
      border: 0;
      background: transparent;
      color: var(--aui-text-secondary);
      cursor: pointer;
      font: 10px/1 var(--aui-font-mono);
    }
    button:hover {
      color: var(--aui-text-primary);
    }
    pre {
      max-height: 380px;
      overflow: auto;
      margin: 0;
      padding: 13px;
      color: #d4d4d8;
      font: 11px/1.55 var(--aui-font-mono);
      white-space: pre-wrap;
      tab-size: 2;
    }
  `;
  code = "";
  language = "text";
  copyLabel = "COPY";
  private async copy(): Promise<void> {
    await navigator.clipboard?.writeText(this.code);
    this.dispatchDetail("aui-copy", { text: this.code });
  }
  render() {
    return html`<section class="block">
      <header class="header">
        <span>${this.language}</span
        ><button type="button" @click=${this.copy}>${this.copyLabel}</button>
      </header>
      <pre><code><slot>${this.code}</slot></code></pre>
    </section>`;
  }
}

export class AdminColorTagElement extends AdminElement {
  static properties = { color: { type: String }, label: { type: String } };
  static styles = css`
    :host {
      display: inline-flex;
    }
    .tag {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      color: var(--aui-text);
      font: 11px/1.2 var(--aui-font-mono);
    }
    .swatch {
      width: 13px;
      height: 13px;
      border: 1px solid rgb(255 255 255 / 20%);
      background: var(--aui-tag-color, var(--aui-text-primary));
    }
  `;
  color = "#ffffff";
  label = "";
  connectedCallback(): void {
    super.connectedCallback();
    this.style.setProperty("--aui-tag-color", this.color);
  }
  render() {
    return html`<span class="tag"
      ><span class="swatch" aria-hidden="true"></span><span>${this.label}<slot></slot></span
    ></span>`;
  }
}
