/*
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
*/

import { css, html } from "lit";
import { AdminElement } from "./base";

export class AdminFieldElement extends AdminElement {
  static properties = {
    label: { type: String },
    description: { type: String },
    error: { type: String },
    required: { type: Boolean, reflect: true },
  };
  static styles = css`
    :host {
      display: block;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    label {
      color: var(--aui-text-secondary);
      font: 11px/1.2 var(--aui-font-mono);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .required {
      color: var(--aui-danger);
    }
    .description {
      color: var(--aui-text-muted);
      font: 11px/1.4 var(--aui-font-mono);
    }
    .error {
      color: var(--aui-danger);
      font: 11px/1.4 var(--aui-font-mono);
    }
    .control {
      min-width: 0;
    }
  `;
  label = "";
  description = "";
  error = "";
  required = false;
  render() {
    return html`<div class="field">
      <label>${this.label}<span class="required" ?hidden=${!this.required}> *</span></label
      >${this.description ? html`<div class="description">${this.description}</div>` : null}
      <div class="control"><slot></slot></div>
      ${this.error ? html`<div class="error" role="alert">${this.error}</div>` : null}
    </div>`;
  }
}

export class AdminInputGroupElement extends AdminElement {
  static styles = css`
    :host {
      display: block;
    }
    .group {
      min-height: var(--aui-control-height);
      display: flex;
      align-items: stretch;
      border: 1px solid var(--aui-border);
      background: var(--aui-bg);
    }
    .group:focus-within {
      border-color: var(--aui-focus);
      box-shadow: 0 0 0 1px var(--aui-focus);
    }
    .prefix,
    .suffix {
      display: inline-flex;
      align-items: center;
      padding: 0 10px;
      color: var(--aui-text-muted);
      background: var(--aui-header);
      font: 11px/1 var(--aui-font-mono);
    }
    .prefix {
      border-right: 1px solid var(--aui-border);
    }
    .suffix {
      border-left: 1px solid var(--aui-border);
    }
    .control {
      min-width: 0;
      flex: 1;
      display: flex;
      align-items: center;
    }
    ::slotted(input),
    ::slotted(textarea) {
      width: 100%;
      min-height: 34px;
      padding: 8px 10px;
      border: 0;
      outline: 0;
      background: transparent;
      color: var(--aui-text);
      font: 12px/1.2 var(--aui-font-mono);
    }
  `;
  render() {
    return html`<div class="group">
      <span class="prefix"><slot name="prefix"></slot></span>
      <div class="control"><slot></slot></div>
      <span class="suffix"><slot name="suffix"></slot></span>
    </div>`;
  }
}

export class AdminRadioGroupElement extends AdminElement {
  static properties = {
    options: { attribute: false },
    value: { type: String },
    orientation: { type: String, reflect: true },
  };
  static styles = css`
    :host {
      display: block;
    }
    .group {
      display: flex;
      gap: 16px;
    }
    :host([orientation="vertical"]) .group {
      flex-direction: column;
      gap: 10px;
    }
    label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--aui-text);
      cursor: pointer;
      font: 12px/1.2 var(--aui-font-mono);
    }
    input {
      width: 15px;
      height: 15px;
      margin: 0;
      accent-color: var(--aui-text-primary);
    }
    label:has(input:disabled) {
      cursor: not-allowed;
      opacity: 0.3;
    }
  `;
  options: Array<{ value: string; label: string; disabled?: boolean }> = [];
  value = "";
  orientation = "horizontal";
  private change(value: string): void {
    this.value = value;
    this.dispatchDetail("aui-radio-change", { value });
  }
  render() {
    return html`<div class="group" role="radiogroup">
      <slot></slot>${this.options.map(
        (option) =>
          html`<label
            ><input
              type="radio"
              name=${this.id || "aui-radio"}
              value=${option.value}
              .checked=${option.value === this.value}
              ?disabled=${option.disabled}
              @change=${() => this.change(option.value)}
            /><span>${option.label}</span></label
          >`,
      )}
    </div>`;
  }
}

export class AdminSliderElement extends AdminElement {
  static properties = {
    value: { type: Number },
    min: { type: Number },
    max: { type: Number },
    step: { type: Number },
    label: { type: String },
    showValue: { type: Boolean, attribute: "show-value" },
    disabled: { type: Boolean, reflect: true },
  };
  static styles = css`
    :host {
      display: block;
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      color: var(--aui-text-secondary);
      font: 10px/1 var(--aui-font-mono);
      text-transform: uppercase;
    }
    .value {
      color: var(--aui-text-primary);
    }
    input {
      width: 100%;
      accent-color: var(--aui-text-primary);
    }
  `;
  value = 0;
  min = 0;
  max = 100;
  step = 1;
  label = "Value";
  showValue = true;
  disabled = false;
  private change(event: Event): void {
    this.value = Number((event.target as HTMLInputElement).value);
    this.dispatchDetail("aui-slider-change", { value: this.value });
  }
  render() {
    return html`<div class="header">
        <span>${this.label}</span>${this.showValue
          ? html`<span class="value">${this.value}</span>`
          : null}
      </div>
      <input
        type="range"
        .valueAsNumber=${this.value}
        min=${this.min}
        max=${this.max}
        step=${this.step}
        ?disabled=${this.disabled}
        aria-label=${this.label}
        @input=${this.change}
      />`;
  }
}

export class AdminPasswordInputElement extends AdminElement {
  static properties = {
    value: { type: String },
    placeholder: { type: String },
    disabled: { type: Boolean, reflect: true },
    revealLabel: { type: String, attribute: "reveal-label" },
    hideLabel: { type: String, attribute: "hide-label" },
  };
  static styles = css`
    :host {
      display: block;
    }
    .wrap {
      min-height: var(--aui-control-height);
      display: flex;
      border: 1px solid var(--aui-border);
      background: var(--aui-bg);
    }
    .wrap:focus-within {
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
      width: 42px;
      border: 0;
      border-left: 1px solid var(--aui-border);
      background: var(--aui-header);
      color: var(--aui-text-secondary);
      cursor: pointer;
      font: 10px/1 var(--aui-font-mono);
    }
    button:hover {
      color: var(--aui-text-primary);
    }
  `;
  value = "";
  placeholder = "";
  disabled = false;
  revealLabel = "SHOW";
  hideLabel = "HIDE";
  private revealed = false;
  private change(event: Event): void {
    this.value = (event.target as HTMLInputElement).value;
    this.dispatchDetail("aui-input", { value: this.value });
  }
  render() {
    return html`<div class="wrap">
      <input
        .value=${this.value}
        type=${this.revealed ? "text" : "password"}
        placeholder=${this.placeholder}
        ?disabled=${this.disabled}
        @input=${this.change}
      /><button
        type="button"
        ?disabled=${this.disabled}
        aria-label=${this.revealed ? this.hideLabel : this.revealLabel}
        @click=${() => {
          this.revealed = !this.revealed;
          this.requestUpdate();
        }}
      >
        ${this.revealed ? this.hideLabel : this.revealLabel}
      </button>
    </div>`;
  }
}

export class AdminFileUploadElement extends AdminElement {
  static properties = {
    accept: { type: String },
    multiple: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    label: { type: String },
    hint: { type: String },
  };
  static styles = css`
    :host {
      display: block;
    }
    .dropzone {
      min-height: 110px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 18px;
      border: 1px dashed var(--aui-border-hover);
      background: var(--aui-bg);
      color: var(--aui-text-secondary);
      text-align: center;
      cursor: pointer;
      font: 12px/1.3 var(--aui-font-mono);
    }
    .dropzone:hover,
    .dropzone[data-dragging="true"] {
      border-color: var(--aui-text-primary);
      color: var(--aui-text-primary);
    }
    .hint {
      color: var(--aui-text-muted);
      font-size: 10px;
    }
    input {
      display: none;
    }
  `;
  accept = "";
  multiple = false;
  disabled = false;
  label = "DROP FILES OR BROWSE";
  hint = "Files remain in your browser until submitted.";
  private dragging = false;
  private files(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) this.dispatchDetail("aui-files-change", { files: [...input.files] });
  }
  private drop(event: DragEvent): void {
    event.preventDefault();
    this.dragging = false;
    if (event.dataTransfer?.files) {
      this.dispatchDetail("aui-files-change", { files: [...event.dataTransfer.files] });
    }
    this.requestUpdate();
  }
  render() {
    return html`<label
      class="dropzone"
      data-dragging=${this.dragging ? "true" : "false"}
      @dragover=${(event: DragEvent) => {
        event.preventDefault();
        this.dragging = true;
        this.requestUpdate();
      }}
      @dragleave=${() => {
        this.dragging = false;
        this.requestUpdate();
      }}
      @drop=${this.drop}
      ><input
        type="file"
        accept=${this.accept}
        ?multiple=${this.multiple}
        ?disabled=${this.disabled}
        @change=${this.files}
      /><strong>${this.label}</strong><span class="hint">${this.hint}</span></label
    >`;
  }
}
