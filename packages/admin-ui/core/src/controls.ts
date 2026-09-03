/*
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
*/

import { css, html } from "lit";
import { AdminElement } from "./base";

export type AdminAlertVariant = "info" | "success" | "warning" | "danger";

export class AdminAlertElement extends AdminElement {
  static properties = {
    variant: { type: String, reflect: true },
    title: { type: String },
    description: { type: String },
    closable: { type: Boolean, reflect: true },
  };
  static styles = css`
    :host {
      display: block;
    }
    .alert {
      display: grid;
      grid-template-columns: 24px minmax(0, 1fr) auto;
      gap: 12px;
      padding: 13px 14px;
      border: 1px solid var(--aui-border);
      background: var(--aui-surface);
      color: var(--aui-text);
    }
    :host([variant="info"]) .alert {
      border-color: rgb(96 165 250 / 45%);
    }
    :host([variant="success"]) .alert {
      border-color: rgb(16 185 129 / 45%);
    }
    :host([variant="warning"]) .alert {
      border-color: rgb(245 158 11 / 45%);
    }
    :host([variant="danger"]) .alert {
      border-color: rgb(239 68 68 / 45%);
    }
    .icon {
      width: 22px;
      height: 22px;
      display: grid;
      place-items: center;
      border: 1px solid currentColor;
      color: var(--aui-text-secondary);
      font: 700 11px/1 var(--aui-font-mono);
    }
    :host([variant="info"]) .icon {
      color: var(--aui-info);
    }
    :host([variant="success"]) .icon {
      color: var(--aui-success);
    }
    :host([variant="warning"]) .icon {
      color: var(--aui-warning);
    }
    :host([variant="danger"]) .icon {
      color: var(--aui-danger);
    }
    h3 {
      margin: 0;
      color: var(--aui-text-primary);
      font: 700 11px/1.2 var(--aui-font-mono);
      text-transform: uppercase;
    }
    p {
      margin: 5px 0 0;
      color: var(--aui-text-secondary);
      font: 12px/1.45 var(--aui-font-mono);
    }
    .close {
      width: 24px;
      height: 24px;
      border: 0;
      background: transparent;
      color: var(--aui-text-muted);
      cursor: pointer;
      font: 16px/1 var(--aui-font-mono);
    }
    .close:hover {
      color: var(--aui-text-primary);
    }
  `;
  variant: AdminAlertVariant = "info";
  title = "";
  description = "";
  closable = false;
  private icon(): string {
    if (this.variant === "success") return "✓";
    if (this.variant === "danger") return "×";
    if (this.variant === "warning") return "!";
    return "i";
  }
  private close(): void {
    this.dispatchDetail("aui-close", { open: false });
    this.remove();
  }
  render() {
    return html`<div class="alert" role="alert">
      <span class="icon" aria-hidden="true">${this.icon()}</span>
      <div>
        <h3>${this.title}<slot name="title"></slot></h3>
        <p>${this.description}<slot></slot></p>
      </div>
      ${this.closable
        ? html`<button class="close" type="button" aria-label="Close" @click=${this.close}>
            ×
          </button>`
        : null}
    </div>`;
  }
}

export class AdminIconButtonElement extends AdminElement {
  static properties = {
    label: { type: String },
    icon: { type: String },
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
  };
  static styles = css`
    :host {
      display: inline-flex;
    }
    button {
      width: 32px;
      height: 32px;
      display: inline-grid;
      place-items: center;
      padding: 0;
      border: 1px solid transparent;
      border-radius: 0;
      background: transparent;
      color: var(--aui-text-secondary);
      cursor: pointer;
      font: 14px/1 var(--aui-font-mono);
    }
    :host([size="sm"]) button {
      width: 28px;
      height: 28px;
      font-size: 12px;
    }
    :host([variant="danger"]) button {
      color: var(--aui-danger);
    }
    button:hover:not(:disabled) {
      border-color: var(--aui-border-hover);
      background: var(--aui-header);
      color: var(--aui-text-primary);
    }
    :host([variant="danger"]) button:hover:not(:disabled) {
      border-color: var(--aui-danger);
      background: rgb(239 68 68 / 10%);
      color: var(--aui-danger-hover);
    }
    button:disabled {
      cursor: not-allowed;
      opacity: 0.3;
    }
  `;
  label = "";
  icon = "•";
  variant = "default";
  size = "md";
  disabled = false;
  private activate(): void {
    this.dispatchDetail("aui-press", { label: this.label });
  }
  render() {
    return html`<button
      type="button"
      aria-label=${this.label}
      title=${this.label}
      ?disabled=${this.disabled}
      @click=${this.activate}
    >
      ${this.icon}<slot></slot>
    </button>`;
  }
}

export interface AdminOption {
  value: string;
  label: string;
  disabled?: boolean;
  description?: string;
}

export class AdminComboboxElement extends AdminElement {
  static properties = {
    options: { attribute: false },
    value: { type: String },
    placeholder: { type: String },
    disabled: { type: Boolean, reflect: true },
    open: { type: Boolean, reflect: true },
  };
  static styles = css`
    :host {
      position: relative;
      display: block;
    }
    .control {
      min-height: var(--aui-control-height);
      display: flex;
      border: 1px solid var(--aui-border);
      background: var(--aui-bg);
    }
    .control:focus-within {
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
    input::placeholder {
      color: var(--aui-text-muted);
    }
    .chevron {
      width: 32px;
      border: 0;
      border-left: 1px solid var(--aui-border);
      background: var(--aui-header);
      color: var(--aui-text-muted);
      cursor: pointer;
    }
    .list {
      position: absolute;
      z-index: 50;
      top: calc(100% + 4px);
      right: 0;
      left: 0;
      max-height: 240px;
      overflow: auto;
      padding: 4px;
      border: 1px solid var(--aui-border);
      background: var(--aui-surface);
      box-shadow: 8px 8px 0 rgb(0 0 0 / 22%);
    }
    :host(:not([open])) .list {
      display: none;
    }
    .option {
      width: 100%;
      display: block;
      padding: 9px 8px;
      border: 0;
      background: transparent;
      color: var(--aui-text-secondary);
      cursor: pointer;
      text-align: left;
      font: 11px/1.2 var(--aui-font-mono);
    }
    .option:hover,
    .option[data-active="true"] {
      background: var(--aui-header);
      color: var(--aui-text-primary);
    }
    .option:disabled {
      cursor: not-allowed;
      opacity: 0.3;
    }
    .description {
      margin-top: 4px;
      color: var(--aui-text-muted);
      font-size: 10px;
    }
    .empty {
      padding: 12px 8px;
      color: var(--aui-text-muted);
      font: 11px/1.2 var(--aui-font-mono);
    }
  `;
  options: AdminOption[] = [];
  value = "";
  placeholder = "Search or select";
  disabled = false;
  open = false;
  private query = "";
  private activeIndex = 0;
  private filtered(): AdminOption[] {
    const query = this.query.toLowerCase();
    return this.options.filter(
      (option) =>
        option.label.toLowerCase().includes(query) || option.value.toLowerCase().includes(query),
    );
  }
  private choose(option: AdminOption): void {
    if (option.disabled) return;
    this.value = option.value;
    this.query = option.label;
    this.open = false;
    this.dispatchDetail("aui-change", { value: option.value, option });
    this.requestUpdate();
  }
  private input(event: Event): void {
    this.query = (event.target as HTMLInputElement).value;
    this.open = true;
    this.activeIndex = 0;
    this.requestUpdate();
  }
  private keydown(event: KeyboardEvent): void {
    const options = this.filtered();
    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.open = true;
      this.activeIndex = Math.min(this.activeIndex + 1, Math.max(options.length - 1, 0));
      this.requestUpdate();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      this.activeIndex = Math.max(this.activeIndex - 1, 0);
      this.requestUpdate();
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = options[this.activeIndex];
      if (option) this.choose(option);
    } else if (event.key === "Escape") {
      this.open = false;
      this.requestUpdate();
    }
  }
  render() {
    const selected = this.options.find((option) => option.value === this.value);
    const options = this.filtered();
    return html`<div class="control">
        <input
          .value=${this.query || selected?.label || ""}
          placeholder=${this.placeholder}
          ?disabled=${this.disabled}
          role="combobox"
          aria-expanded=${this.open ? "true" : "false"}
          aria-controls="combobox-list"
          @focus=${() => {
            this.open = true;
            this.requestUpdate();
          }}
          @input=${this.input}
          @keydown=${this.keydown}
        /><button
          class="chevron"
          type="button"
          tabindex="-1"
          aria-hidden="true"
          @click=${() => {
            this.open = !this.open;
            this.requestUpdate();
          }}
        >
          ⌄
        </button>
      </div>
      <div class="list" id="combobox-list" role="listbox">
        ${options.length
          ? options.map(
              (option, index) =>
                html`<button
                  class="option"
                  type="button"
                  role="option"
                  aria-selected=${option.value === this.value ? "true" : "false"}
                  data-active=${index === this.activeIndex ? "true" : "false"}
                  ?disabled=${option.disabled}
                  @click=${() => this.choose(option)}
                >
                  ${option.label}${option.description
                    ? html`<div class="description">${option.description}</div>`
                    : null}
                </button>`,
            )
          : html`<div class="empty">NO MATCHES</div>`}
      </div>`;
  }
}

export class AdminMultiSelectElement extends AdminElement {
  static properties = {
    options: { attribute: false },
    values: { attribute: false },
    placeholder: { type: String },
    disabled: { type: Boolean, reflect: true },
    open: { type: Boolean, reflect: true },
  };
  static styles = css`
    :host {
      position: relative;
      display: block;
    }
    .control {
      min-height: var(--aui-control-height);
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 4px 6px;
      border: 1px solid var(--aui-border);
      background: var(--aui-bg);
      cursor: text;
    }
    .control:focus-within {
      border-color: var(--aui-focus);
      box-shadow: 0 0 0 1px var(--aui-focus);
    }
    .chips {
      min-width: 0;
      display: flex;
      flex: 1;
      flex-wrap: wrap;
      gap: 4px;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 5px;
      border: 1px solid var(--aui-border-hover);
      color: var(--aui-text);
      font: 10px/1 var(--aui-font-mono);
    }
    .chip button {
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--aui-text-muted);
      cursor: pointer;
    }
    input {
      min-width: 80px;
      flex: 1;
      padding: 5px 4px;
      border: 0;
      outline: 0;
      background: transparent;
      color: var(--aui-text);
      font: 11px/1.2 var(--aui-font-mono);
    }
    input::placeholder {
      color: var(--aui-text-muted);
    }
    .list {
      position: absolute;
      z-index: 50;
      top: calc(100% + 4px);
      right: 0;
      left: 0;
      max-height: 240px;
      overflow: auto;
      padding: 4px;
      border: 1px solid var(--aui-border);
      background: var(--aui-surface);
      box-shadow: 8px 8px 0 rgb(0 0 0 / 22%);
    }
    :host(:not([open])) .list {
      display: none;
    }
    .option {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 8px;
      border: 0;
      background: transparent;
      color: var(--aui-text-secondary);
      cursor: pointer;
      text-align: left;
      font: 11px/1.2 var(--aui-font-mono);
    }
    .option:hover {
      background: var(--aui-header);
      color: var(--aui-text-primary);
    }
    .check {
      width: 13px;
      height: 13px;
      display: grid;
      place-items: center;
      border: 1px solid var(--aui-border-hover);
      color: var(--aui-text-inverse);
      font-size: 9px;
    }
    .option[data-selected="true"] .check {
      background: var(--aui-text-primary);
    }
  `;
  options: AdminOption[] = [];
  values: string[] = [];
  placeholder = "Select items";
  disabled = false;
  open = false;
  private query = "";
  private toggle(value: string): void {
    this.values = this.values.includes(value)
      ? this.values.filter((item) => item !== value)
      : [...this.values, value];
    this.dispatchDetail("aui-change", { values: this.values });
    this.requestUpdate();
  }
  private removeValue(value: string): void {
    this.values = this.values.filter((item) => item !== value);
    this.dispatchDetail("aui-change", { values: this.values });
    this.requestUpdate();
  }
  render() {
    const query = this.query.toLowerCase();
    const filtered = this.options.filter((option) => option.label.toLowerCase().includes(query));
    return html`<div
        class="control"
        @click=${() => {
          this.open = true;
        }}
      >
        <div class="chips">
          ${this.values.map((value) => {
            const option = this.options.find((item) => item.value === value);
            return html`<span class="chip"
              >${option?.label ?? value}<button
                type="button"
                aria-label=${`Remove ${option?.label ?? value}`}
                @click=${(event: Event) => {
                  event.stopPropagation();
                  this.removeValue(value);
                }}
              >
                ×
              </button></span
            >`;
          })}<input
            .value=${this.query}
            placeholder=${this.values.length ? "" : this.placeholder}
            ?disabled=${this.disabled}
            @input=${(event: Event) => {
              this.query = (event.target as HTMLInputElement).value;
              this.requestUpdate();
            }}
          />
        </div>
        <span aria-hidden="true">⌄</span>
      </div>
      <div class="list" role="listbox" aria-multiselectable="true">
        ${filtered.map(
          (option) =>
            html`<button
              class="option"
              type="button"
              role="option"
              aria-selected=${this.values.includes(option.value) ? "true" : "false"}
              data-selected=${this.values.includes(option.value) ? "true" : "false"}
              @click=${() => this.toggle(option.value)}
            >
              <span class="check">${this.values.includes(option.value) ? "✓" : ""}</span
              >${option.label}
            </button>`,
        )}
      </div>`;
  }
}

export class AdminCommandElement extends AdminElement {
  static properties = {
    items: { attribute: false },
    open: { type: Boolean, reflect: true },
    placeholder: { type: String },
  };
  static styles = css`
    :host {
      display: block;
    }
    .command {
      border: 1px solid var(--aui-border);
      background: var(--aui-surface);
    }
    .search {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px;
      border-bottom: 1px solid var(--aui-border);
    }
    .search span {
      color: var(--aui-text-muted);
    }
    input {
      min-width: 0;
      flex: 1;
      border: 0;
      outline: 0;
      background: transparent;
      color: var(--aui-text);
      font: 12px/1.2 var(--aui-font-mono);
    }
    .items {
      max-height: 260px;
      overflow: auto;
      padding: 4px;
    }
    .item {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 9px 8px;
      border: 0;
      background: transparent;
      color: var(--aui-text-secondary);
      cursor: pointer;
      text-align: left;
      font: 11px/1.2 var(--aui-font-mono);
    }
    .item:hover,
    .item[data-active="true"] {
      background: var(--aui-header);
      color: var(--aui-text-primary);
    }
    kbd {
      color: var(--aui-text-muted);
      font: 10px/1 var(--aui-font-mono);
    }
    .empty {
      padding: 12px 8px;
      color: var(--aui-text-muted);
      font: 11px/1 var(--aui-font-mono);
    }
  `;
  items: Array<AdminOption & { shortcut?: string }> = [];
  open = true;
  placeholder = "Type a command";
  private query = "";
  private activeIndex = 0;
  private select(item: AdminOption): void {
    if (item.disabled) return;
    this.dispatchDetail("aui-command", { id: item.value, item });
  }
  private keydown(event: KeyboardEvent): void {
    const items = this.items.filter((item) =>
      item.label.toLowerCase().includes(this.query.toLowerCase()),
    );
    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.activeIndex = Math.min(this.activeIndex + 1, Math.max(items.length - 1, 0));
      this.requestUpdate();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      this.activeIndex = Math.max(this.activeIndex - 1, 0);
      this.requestUpdate();
    } else if (event.key === "Enter") {
      const item = items[this.activeIndex];
      if (item) this.select(item);
    }
  }
  render() {
    const items = this.items.filter((item) =>
      item.label.toLowerCase().includes(this.query.toLowerCase()),
    );
    return html`<div class="command" role="dialog">
      <div class="search">
        <span aria-hidden="true">⌕</span
        ><input
          placeholder=${this.placeholder}
          .value=${this.query}
          @input=${(event: Event) => {
            this.query = (event.target as HTMLInputElement).value;
            this.activeIndex = 0;
            this.requestUpdate();
          }}
          @keydown=${this.keydown}
        />
      </div>
      <div class="items" role="listbox">
        ${items.length
          ? items.map(
              (item, index) =>
                html`<button
                  class="item"
                  type="button"
                  role="option"
                  data-active=${index === this.activeIndex ? "true" : "false"}
                  ?disabled=${item.disabled}
                  @click=${() => this.select(item)}
                >
                  <span>${item.label}</span>${item.shortcut
                    ? html`<kbd>${item.shortcut}</kbd>`
                    : null}
                </button>`,
            )
          : html`<div class="empty">NO COMMANDS</div>`}
      </div>
    </div>`;
  }
}

export class AdminColorPickerElement extends AdminElement {
  static properties = {
    value: { type: String },
    label: { type: String },
    disabled: { type: Boolean, reflect: true },
  };
  static styles = css`
    :host {
      display: inline-flex;
    }
    .picker {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    input[type="color"] {
      width: 36px;
      height: 36px;
      padding: 2px;
      border: 1px solid var(--aui-border);
      border-radius: 0;
      background: var(--aui-bg);
    }
    label {
      color: var(--aui-text-secondary);
      font: 10px/1 var(--aui-font-mono);
      text-transform: uppercase;
    }
    code {
      color: var(--aui-text);
      font: 11px/1 var(--aui-font-mono);
    }
  `;
  value = "#ffffff";
  label = "Color";
  disabled = false;
  private change(event: Event): void {
    this.value = (event.target as HTMLInputElement).value;
    this.dispatchDetail("aui-color-change", { value: this.value });
  }
  render() {
    return html`<div class="picker">
      <input
        type="color"
        .value=${this.value}
        ?disabled=${this.disabled}
        aria-label=${this.label}
        @input=${this.change}
      /><label>${this.label}</label><code>${this.value}</code>
    </div>`;
  }
}

export class AdminDateRangeElement extends AdminElement {
  static properties = {
    start: { type: String },
    end: { type: String },
    startLabel: { type: String, attribute: "start-label" },
    endLabel: { type: String, attribute: "end-label" },
    disabled: { type: Boolean, reflect: true },
  };
  static styles = css`
    :host {
      display: block;
    }
    .range {
      display: flex;
      flex-wrap: wrap;
      align-items: end;
      gap: 10px;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 6px;
      color: var(--aui-text-secondary);
      font: 10px/1 var(--aui-font-mono);
      text-transform: uppercase;
    }
    input {
      min-height: 36px;
      padding: 8px;
      border: 1px solid var(--aui-border);
      border-radius: 0;
      background: var(--aui-bg);
      color: var(--aui-text);
      color-scheme: dark;
      font: 12px/1 var(--aui-font-mono);
    }
    input:focus {
      outline: 1px solid var(--aui-focus);
      outline-offset: 2px;
    }
  `;
  start = "";
  end = "";
  startLabel = "From";
  endLabel = "To";
  disabled = false;
  private change(kind: "start" | "end", event: Event): void {
    this[kind] = (event.target as HTMLInputElement).value;
    this.dispatchDetail("aui-range-change", { start: this.start, end: this.end });
  }
  render() {
    return html`<div class="range">
      <label
        >${this.startLabel}<input
          type="date"
          .value=${this.start}
          ?disabled=${this.disabled}
          @change=${(event: Event) => this.change("start", event)} /></label
      ><label
        >${this.endLabel}<input
          type="date"
          .value=${this.end}
          ?disabled=${this.disabled}
          @change=${(event: Event) => this.change("end", event)}
      /></label>
    </div>`;
  }
}

export class AdminTagInputElement extends AdminElement {
  static properties = {
    values: { attribute: false },
    placeholder: { type: String },
    disabled: { type: Boolean, reflect: true },
  };
  static styles = css`
    :host {
      display: block;
    }
    .input {
      min-height: var(--aui-control-height);
      display: flex;
      align-items: center;
      gap: 5px;
      flex-wrap: wrap;
      padding: 4px 7px;
      border: 1px solid var(--aui-border);
      background: var(--aui-bg);
    }
    .input:focus-within {
      border-color: var(--aui-focus);
      box-shadow: 0 0 0 1px var(--aui-focus);
    }
    .tag {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 6px;
      border: 1px solid var(--aui-border-hover);
      color: var(--aui-text);
      font: 10px/1 var(--aui-font-mono);
    }
    .tag button {
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--aui-text-muted);
      cursor: pointer;
    }
    input {
      min-width: 90px;
      flex: 1;
      padding: 5px 2px;
      border: 0;
      outline: 0;
      background: transparent;
      color: var(--aui-text);
      font: 11px/1.2 var(--aui-font-mono);
    }
    input::placeholder {
      color: var(--aui-text-muted);
    }
  `;
  values: string[] = [];
  placeholder = "Add tag and press Enter";
  disabled = false;
  private add(event: KeyboardEvent): void {
    if (event.key !== "Enter" && event.key !== ",") return;
    event.preventDefault();
    const input = event.target as HTMLInputElement;
    const value = input.value.trim().replace(/,$/, "");
    if (!value || this.values.includes(value)) return;
    this.values = [...this.values, value];
    input.value = "";
    this.dispatchDetail("aui-tags-change", { values: this.values });
    this.requestUpdate();
  }
  private removeValue(value: string): void {
    this.values = this.values.filter((item) => item !== value);
    this.dispatchDetail("aui-tags-change", { values: this.values });
    this.requestUpdate();
  }
  render() {
    return html`<div class="input">
      ${this.values.map(
        (value) =>
          html`<span class="tag"
            >${value}<button
              type="button"
              aria-label=${`Remove ${value}`}
              @click=${() => this.removeValue(value)}
            >
              ×
            </button></span
          >`,
      )}<input placeholder=${this.placeholder} ?disabled=${this.disabled} @keydown=${this.add} />
    </div>`;
  }
}
