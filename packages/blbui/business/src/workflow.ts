/*
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
*/

import { css, html } from "lit";
import { AdminElement } from "@chaos_team/blbui-core";

export interface AdminFormField {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "textarea" | "select" | "checkbox";
  value?: string | number | boolean;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
}

export class AdminFormBuilderElement extends AdminElement {
  static properties = {
    fields: { attribute: false },
    submitLabel: { type: String, attribute: "submit-label" },
    loading: { type: Boolean, reflect: true },
  };
  static styles = css`
    :host {
      display: block;
    }
    form {
      display: grid;
      gap: 15px;
    }
    .field {
      display: grid;
      gap: 6px;
    }
    label {
      color: var(--aui-text-secondary);
      font: 11px/1.2 var(--aui-font-mono);
      text-transform: uppercase;
    }
    .required {
      color: var(--aui-danger);
    }
    input,
    textarea,
    select {
      width: 100%;
      min-height: 36px;
      padding: 8px 10px;
      border: 1px solid var(--aui-border);
      border-radius: 0;
      background: var(--aui-bg);
      color: var(--aui-text);
      outline: 0;
      font: 12px/1.3 var(--aui-font-mono);
    }
    textarea {
      min-height: 92px;
      resize: vertical;
    }
    input:focus,
    textarea:focus,
    select:focus {
      border-color: var(--aui-focus);
      box-shadow: 0 0 0 1px var(--aui-focus);
    }
    .checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .checkbox input {
      width: 16px;
      min-height: 16px;
    }
    .footer {
      display: flex;
      justify-content: flex-end;
      padding-top: 4px;
    }
    button {
      min-height: 36px;
      padding: 8px 13px;
      border: 1px solid var(--aui-text-primary);
      background: var(--aui-text-primary);
      color: var(--aui-text-inverse);
      cursor: pointer;
      font: 700 11px/1 var(--aui-font-mono);
      text-transform: uppercase;
    }
    button:disabled {
      cursor: not-allowed;
      opacity: 0.3;
    }
  `;
  fields: AdminFormField[] = [];
  submitLabel = "Submit";
  loading = false;
  private values: Record<string, string | number | boolean> = {};
  protected willUpdate(changed: Map<string, unknown>): void {
    if (changed.has("fields")) {
      this.values = Object.fromEntries(
        this.fields.map((field) => [
          field.name,
          field.value ?? (field.type === "checkbox" ? false : ""),
        ]),
      );
    }
  }
  private change(field: AdminFormField, event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    let value: string | number | boolean = target.value;
    if (field.type === "checkbox") value = (target as HTMLInputElement).checked;
    else if (field.type === "number") value = Number(target.value);
    this.values = { ...this.values, [field.name]: value };
    this.dispatchDetail("aui-form-change", { name: field.name, value, values: this.values });
  }
  private submit(event: Event): void {
    event.preventDefault();
    this.dispatchDetail("aui-form-submit", { values: this.values });
  }
  private control(field: AdminFormField): unknown {
    const value = this.values[field.name] ?? field.value ?? "";
    if (field.type === "textarea") {
      return html`<textarea
        name=${field.name}
        .value=${String(value)}
        ?required=${field.required}
        @input=${(event: Event) => this.change(field, event)}
      ></textarea>`;
    }
    if (field.type === "select") {
      return html`<select
        name=${field.name}
        .value=${String(value)}
        ?required=${field.required}
        @change=${(event: Event) => this.change(field, event)}
      >
        ${field.options?.map(
          (option) => html`<option value=${option.value}>${option.label}</option>`,
        )}
      </select>`;
    }
    return html`<input
      name=${field.name}
      type=${field.type ?? "text"}
      .value=${field.type === "checkbox" ? undefined : String(value)}
      .checked=${field.type === "checkbox" ? Boolean(value) : undefined}
      ?required=${field.required}
      @input=${(event: Event) => this.change(field, event)}
    />`;
  }
  render() {
    return html`<form @submit=${this.submit}>
      ${this.fields.map((field) =>
        field.type === "checkbox"
          ? html`<label class="checkbox"
              ><input
                type="checkbox"
                .checked=${Boolean(this.values[field.name] ?? field.value)}
                @change=${(event: Event) => this.change(field, event)}
              /><span>${field.label}</span></label
            >`
          : html`<div class="field">
              <label for=${field.name}
                >${field.label}<span class="required" ?hidden=${!field.required}> *</span></label
              >${this.control(field)}
            </div>`,
      )}
      <div class="footer">
        <button
          type="submit"
          ?disabled=${this.loading}
          aria-busy=${this.loading ? "true" : "false"}
        >
          ${this.loading ? "..." : this.submitLabel}
        </button>
      </div>
    </form>`;
  }
}

export class AdminApprovalTimelineElement extends AdminElement {
  static properties = { items: { attribute: false }, active: { type: Number } };
  static styles = css`
    :host {
      display: block;
    }
    .timeline {
      display: grid;
      gap: 0;
    }
    .item {
      position: relative;
      display: grid;
      grid-template-columns: 24px minmax(0, 1fr);
      gap: 10px;
      min-height: 58px;
    }
    .marker {
      width: 18px;
      height: 18px;
      display: grid;
      place-items: center;
      border: 1px solid var(--aui-border-hover);
      background: var(--aui-bg);
      color: var(--aui-text-muted);
      font: 10px/1 var(--aui-font-mono);
    }
    .item[data-state="approved"] .marker {
      border-color: var(--aui-success);
      color: var(--aui-success);
    }
    .item[data-state="rejected"] .marker {
      border-color: var(--aui-danger);
      color: var(--aui-danger);
    }
    .item[data-state="active"] .marker {
      border-color: var(--aui-text-primary);
      background: var(--aui-text-primary);
      color: var(--aui-text-inverse);
    }
    .item:not(:last-child) .marker::after {
      content: "";
      position: absolute;
      top: 18px;
      bottom: 0;
      left: 8px;
      width: 1px;
      background: var(--aui-border);
    }
    strong {
      color: var(--aui-text);
      font: 700 11px/1.2 var(--aui-font-mono);
      text-transform: uppercase;
    }
    p {
      margin: 5px 0 0;
      color: var(--aui-text-secondary);
      font: 11px/1.45 var(--aui-font-mono);
    }
    time {
      display: block;
      margin-top: 4px;
      color: var(--aui-text-muted);
      font: 10px/1 var(--aui-font-mono);
    }
  `;
  items: Array<{
    title: string;
    description?: string;
    status?: "pending" | "active" | "approved" | "rejected";
    time?: string;
  }> = [];
  active = 0;
  render() {
    return html`<div class="timeline" role="list">
      ${this.items.map((item, index) => {
        let status = item.status;
        if (!status) {
          if (index < this.active) status = "approved";
          else if (index === this.active) status = "active";
          else status = "pending";
        }
        let icon = String(index + 1);
        if (status === "approved") icon = "✓";
        else if (status === "rejected") icon = "×";
        return html`<div class="item" data-state=${status} role="listitem">
          <span class="marker">${icon}</span>
          <div>
            <strong>${item.title}</strong>${item.description
              ? html`<p>${item.description}</p>`
              : null}${item.time ? html`<time>${item.time}</time>` : null}
          </div>
        </div>`;
      })}
    </div>`;
  }
}
