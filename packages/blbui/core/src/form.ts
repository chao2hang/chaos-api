/*
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
*/

import { css, html } from "lit";
import { AdminElement } from "./base";

export class AdminInputElement extends AdminElement {
  static properties = {
    value: { type: String },
    type: { type: String },
    name: { type: String, reflect: true },
    placeholder: { type: String },
    disabled: { type: Boolean, reflect: true },
    invalid: { type: Boolean, reflect: true },
  };

  static styles = css`
    :host {
      display: block;
    }
    input {
      width: 100%;
      min-height: var(--aui-control-height);
      padding: 8px 10px;
      border: 1px solid var(--aui-border);
      border-radius: 0;
      background: var(--aui-bg);
      color: var(--aui-text);
      font: 12px/1.2 var(--aui-font-mono);
      transition:
        border-color var(--aui-transition),
        box-shadow var(--aui-transition);
    }
    input::placeholder {
      color: var(--aui-text-muted);
    }
    input:hover:not(:disabled) {
      border-color: var(--aui-border-hover);
    }
    input:focus {
      outline: none;
      border-color: var(--aui-focus);
      box-shadow: 0 0 0 1px var(--aui-focus);
    }
    input:disabled {
      cursor: not-allowed;
      opacity: 0.3;
    }
    :host([invalid]) input {
      border-color: var(--aui-danger);
    }
  `;

  value = "";
  type = "text";
  name = "";
  placeholder = "";
  disabled = false;
  invalid = false;

  private handleInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.dispatchDetail("aui-input", { value: this.value });
  }

  private handleChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.dispatchDetail("aui-change", { value: this.value });
  }

  render() {
    return html`<input
      .value=${this.value}
      type=${this.type}
      name=${this.name}
      placeholder=${this.placeholder}
      ?disabled=${this.disabled}
      aria-invalid=${this.invalid ? "true" : "false"}
      @input=${this.handleInput}
      @change=${this.handleChange}
    />`;
  }
}

export interface AdminSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export class AdminSelectElement extends AdminElement {
  static properties = {
    value: { type: String },
    name: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
    invalid: { type: Boolean, reflect: true },
    options: { attribute: false },
  };

  static styles = css`
    :host {
      display: block;
    }
    select {
      width: 100%;
      min-height: var(--aui-control-height);
      padding: 8px 30px 8px 10px;
      border: 1px solid var(--aui-border);
      border-radius: 0;
      background: var(--aui-bg);
      color: var(--aui-text);
      font: 12px/1.2 var(--aui-font-mono);
    }
    select:hover:not(:disabled) {
      border-color: var(--aui-border-hover);
    }
    select:focus {
      outline: none;
      border-color: var(--aui-focus);
      box-shadow: 0 0 0 1px var(--aui-focus);
    }
    select:disabled {
      cursor: not-allowed;
      opacity: 0.3;
    }
    :host([invalid]) select {
      border-color: var(--aui-danger);
    }
  `;

  value = "";
  name = "";
  disabled = false;
  invalid = false;
  options: AdminSelectOption[] = [];

  private handleChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.value = target.value;
    this.dispatchDetail("aui-change", { value: this.value });
  }

  render() {
    return html`<select
      .value=${this.value}
      name=${this.name}
      ?disabled=${this.disabled}
      aria-invalid=${this.invalid ? "true" : "false"}
      @change=${this.handleChange}
    >
      <slot></slot>
      ${this.options.map(
        (option) =>
          html`<option value=${option.value} ?disabled=${option.disabled}>${option.label}</option>`,
      )}
    </select>`;
  }
}

export class AdminTextareaElement extends AdminElement {
  static properties = {
    value: { type: String },
    name: { type: String, reflect: true },
    placeholder: { type: String },
    rows: { type: Number },
    disabled: { type: Boolean, reflect: true },
    invalid: { type: Boolean, reflect: true },
  };

  static styles = css`
    :host {
      display: block;
    }
    textarea {
      width: 100%;
      min-height: 96px;
      padding: 10px;
      border: 1px solid var(--aui-border);
      border-radius: 0;
      background: var(--aui-bg);
      color: var(--aui-text);
      resize: vertical;
      font: 12px/1.45 var(--aui-font-mono);
      transition:
        border-color var(--aui-transition),
        box-shadow var(--aui-transition);
    }
    textarea::placeholder {
      color: var(--aui-text-muted);
    }
    textarea:hover:not(:disabled) {
      border-color: var(--aui-border-hover);
    }
    textarea:focus {
      outline: none;
      border-color: var(--aui-focus);
      box-shadow: 0 0 0 1px var(--aui-focus);
    }
    textarea:disabled {
      cursor: not-allowed;
      opacity: 0.3;
    }
    :host([invalid]) textarea {
      border-color: var(--aui-danger);
    }
  `;

  value = "";
  name = "";
  placeholder = "";
  rows = 4;
  disabled = false;
  invalid = false;

  private handleInput(event: Event): void {
    this.value = (event.target as HTMLTextAreaElement).value;
    this.dispatchDetail("aui-input", { value: this.value });
  }

  render() {
    return html`<textarea
      .value=${this.value}
      name=${this.name}
      placeholder=${this.placeholder}
      rows=${this.rows}
      ?disabled=${this.disabled}
      aria-invalid=${this.invalid ? "true" : "false"}
      @input=${this.handleInput}
    ></textarea>`;
  }
}

export class AdminCheckboxElement extends AdminElement {
  static properties = {
    checked: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    label: { type: String },
  };

  static styles = css`
    :host {
      display: inline-flex;
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
      width: 16px;
      height: 16px;
      margin: 0;
      accent-color: var(--aui-text-primary);
      border-radius: 0;
    }
    label:has(input:disabled) {
      cursor: not-allowed;
      opacity: 0.3;
    }
  `;

  checked = false;
  disabled = false;
  label = "";

  private handleChange(event: Event): void {
    this.checked = (event.target as HTMLInputElement).checked;
    this.dispatchDetail("aui-checked-change", { checked: this.checked });
  }

  render() {
    return html`<label
      ><input
        type="checkbox"
        .checked=${this.checked}
        ?disabled=${this.disabled}
        @change=${this.handleChange} /><span>${this.label}<slot></slot></span
    ></label>`;
  }
}

export class AdminSwitchElement extends AdminElement {
  static properties = {
    checked: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    label: { type: String },
  };

  static styles = css`
    :host {
      display: inline-flex;
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
      position: absolute;
      width: 1px;
      height: 1px;
      opacity: 0;
    }
    .track {
      width: 30px;
      height: 16px;
      position: relative;
      border: 1px solid var(--aui-border-hover);
      background: var(--aui-bg);
    }
    .thumb {
      width: 10px;
      height: 10px;
      position: absolute;
      top: 2px;
      left: 2px;
      background: var(--aui-text-muted);
      transition:
        transform var(--aui-transition),
        background-color var(--aui-transition);
    }
    input:checked + .track {
      border-color: var(--aui-text-primary);
    }
    input:checked + .track .thumb {
      transform: translateX(14px);
      background: var(--aui-text-primary);
    }
    input:focus-visible + .track {
      outline: 1px solid var(--aui-focus);
      outline-offset: 2px;
    }
    label:has(input:disabled) {
      cursor: not-allowed;
      opacity: 0.3;
    }
  `;

  checked = false;
  disabled = false;
  label = "";

  private handleChange(event: Event): void {
    this.checked = (event.target as HTMLInputElement).checked;
    this.dispatchDetail("aui-checked-change", { checked: this.checked });
  }

  render() {
    return html`<label
      ><input
        type="checkbox"
        .checked=${this.checked}
        ?disabled=${this.disabled}
        @change=${this.handleChange} /><span class="track"><span class="thumb"></span></span
      ><span>${this.label}<slot></slot></span
    ></label>`;
  }
}
