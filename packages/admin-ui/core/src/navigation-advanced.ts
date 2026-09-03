/*
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
*/

import { css, html } from "lit";
import { AdminElement } from "./base";

export interface AdminListItem {
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
}
export interface AdminTreeNode {
  id: string;
  label: string;
  children?: AdminTreeNode[];
  disabled?: boolean;
}

export class AdminAccordionElement extends AdminElement {
  static properties = { items: { attribute: false }, multiple: { type: Boolean, reflect: true } };
  static styles = css`
    :host {
      display: block;
    }
    .accordion {
      border-top: 1px solid var(--aui-border);
    }
    details {
      border-bottom: 1px solid var(--aui-border);
    }
    summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 0;
      color: var(--aui-text);
      cursor: pointer;
      list-style: none;
      font: 12px/1.2 var(--aui-font-mono);
      text-transform: uppercase;
    }
    summary::-webkit-details-marker {
      display: none;
    }
    summary::after {
      content: "+";
      color: var(--aui-text-muted);
      font-size: 16px;
    }
    details[open] summary::after {
      content: "−";
      color: var(--aui-text-primary);
    }
    .content {
      padding: 0 0 16px;
      color: var(--aui-text-secondary);
      font: 12px/1.5 var(--aui-font-mono);
    }
  `;
  items: Array<{ id: string; label: string; content: string; disabled?: boolean }> = [];
  multiple = false;
  render() {
    return html`<div class="accordion">
      ${this.items.map(
        (item) =>
          html`<details ?disabled=${item.disabled}>
            <summary>${item.label}</summary>
            <div class="content">${item.content}</div>
          </details>`,
      )}<slot></slot>
    </div>`;
  }
}

export class AdminStepperElement extends AdminElement {
  static properties = {
    items: { attribute: false },
    active: { type: Number },
    orientation: { type: String, reflect: true },
  };
  static styles = css`
    :host {
      display: block;
    }
    .stepper {
      display: flex;
      gap: 0;
    }
    :host([orientation="vertical"]) .stepper {
      flex-direction: column;
    }
    .step {
      min-width: 0;
      flex: 1;
      display: flex;
      align-items: center;
      gap: 9px;
      color: var(--aui-text-muted);
      font: 11px/1.2 var(--aui-font-mono);
    }
    :host([orientation="vertical"]) .step {
      align-items: flex-start;
      min-height: 42px;
    }
    .number {
      width: 24px;
      height: 24px;
      flex: 0 0 24px;
      display: grid;
      place-items: center;
      border: 1px solid var(--aui-border-hover);
      color: var(--aui-text-secondary);
      font-size: 10px;
    }
    .step[data-state="active"] {
      color: var(--aui-text-primary);
    }
    .step[data-state="active"] .number {
      border-color: var(--aui-text-primary);
      background: var(--aui-text-primary);
      color: var(--aui-text-inverse);
    }
    .step[data-state="complete"] {
      color: var(--aui-success);
    }
    .step[data-state="complete"] .number {
      border-color: var(--aui-success);
      color: var(--aui-success);
    }
    .line {
      height: 1px;
      flex: 1;
      margin: 0 12px;
      background: var(--aui-border);
    }
    :host([orientation="vertical"]) .line {
      width: 1px;
      height: 18px;
      flex: 0 0 18px;
      margin: -4px 0 -4px 11px;
    }
  `;
  items: Array<{ label: string; description?: string }> = [];
  active = 0;
  orientation = "horizontal";
  render() {
    return html`<div class="stepper" role="list">
      ${this.items.map((item, index) => {
        const complete = index < this.active;
        const active = index === this.active;
        let state = "pending";
        if (complete) state = "complete";
        else if (active) state = "active";
        const number = complete ? "✓" : String(index + 1);
        return html`<div class="step" data-state=${state} role="listitem">
          <span class="number">${number}</span><span>${item.label}</span>${index <
          this.items.length - 1
            ? html`<span class="line" aria-hidden="true"></span>`
            : null}
        </div>`;
      })}
    </div>`;
  }
}

export class AdminSegmentedElement extends AdminElement {
  static properties = { items: { attribute: false }, value: { type: String } };
  static styles = css`
    :host {
      display: inline-flex;
      max-width: 100%;
    }
    .segments {
      display: flex;
      max-width: 100%;
      overflow: auto;
      border: 1px solid var(--aui-border);
    }
    button {
      min-height: 32px;
      padding: 7px 12px;
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
    button:hover {
      color: var(--aui-text-primary);
    }
    button[aria-pressed="true"] {
      background: var(--aui-text-primary);
      color: var(--aui-text-inverse);
    }
  `;
  items: AdminListItem[] = [];
  value = "";
  private select(value: string): void {
    this.value = value;
    this.dispatchDetail("aui-segment-change", { value });
  }
  render() {
    return html`<div class="segments" role="group">
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

export class AdminListElement extends AdminElement {
  static properties = {
    items: { attribute: false },
    selected: { type: String },
    selectable: { type: Boolean, reflect: true },
  };
  static styles = css`
    :host {
      display: block;
    }
    .list {
      border-top: 1px solid var(--aui-border);
    }
    .item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid var(--aui-border);
      color: var(--aui-text);
      font: 12px/1.3 var(--aui-font-mono);
    }
    :host([selectable]) .item {
      cursor: pointer;
    }
    .item[data-selected="true"] {
      color: var(--aui-text-primary);
    }
    .marker {
      width: 5px;
      height: 5px;
      flex: 0 0 5px;
      background: var(--aui-border-hover);
    }
    .item[data-selected="true"] .marker {
      background: var(--aui-text-primary);
    }
    .description {
      margin-top: 4px;
      color: var(--aui-text-muted);
      font-size: 10px;
    }
  `;
  items: AdminListItem[] = [];
  selected = "";
  selectable = false;
  private select(id: string): void {
    if (!this.selectable) return;
    this.selected = id;
    this.dispatchDetail("aui-list-change", { id });
  }
  render() {
    return html`<div class="list" role=${this.selectable ? "listbox" : "list"}>
      ${this.items.map((item) => {
        const selected = item.id === this.selected;
        const ariaSelected = this.selectable ? String(selected) : undefined;
        return html`<div
          class="item"
          data-selected=${String(selected)}
          aria-selected=${ariaSelected}
          @click=${() => this.select(item.id)}
        >
          <span class="marker" aria-hidden="true"></span>
          <div>
            <div>${item.label}</div>
            ${item.description ? html`<div class="description">${item.description}</div>` : null}
          </div>
        </div>`;
      })}
    </div>`;
  }
}

export class AdminTreeElement extends AdminElement {
  static properties = {
    nodes: { attribute: false },
    selected: { type: String },
    expanded: { attribute: false },
  };
  static styles = css`
    :host {
      display: block;
    }
    .tree {
      color: var(--aui-text);
      font: 12px/1.2 var(--aui-font-mono);
    }
    .node {
      display: flex;
      align-items: center;
      gap: 6px;
      min-height: 30px;
      padding: 5px 8px;
      cursor: pointer;
    }
    .node:hover {
      background: var(--aui-header);
    }
    .node[data-selected="true"] {
      color: var(--aui-text-primary);
      background: rgb(255 255 255 / 5%);
    }
    .toggle {
      width: 15px;
      border: 0;
      background: transparent;
      color: var(--aui-text-muted);
      cursor: pointer;
    }
    .children {
      margin-left: 18px;
      border-left: 1px solid var(--aui-border);
    }
  `;
  nodes: AdminTreeNode[] = [];
  selected = "";
  expanded: string[] = [];
  private isExpanded(id: string): boolean {
    return this.expanded.includes(id);
  }
  private toggle(id: string): void {
    this.expanded = this.isExpanded(id)
      ? this.expanded.filter((item) => item !== id)
      : [...this.expanded, id];
    this.requestUpdate();
  }
  private select(id: string): void {
    this.selected = id;
    this.dispatchDetail("aui-tree-change", { id });
  }
  private renderNodes(nodes: AdminTreeNode[]): unknown {
    return nodes.map(
      (node) =>
        html`<div>
          <div
            class="node"
            data-selected=${node.id === this.selected ? "true" : "false"}
            @click=${() => this.select(node.id)}
          >
            ${node.children?.length
              ? html`<button
                  class="toggle"
                  type="button"
                  aria-label=${this.isExpanded(node.id) ? "Collapse" : "Expand"}
                  @click=${(event: Event) => {
                    event.stopPropagation();
                    this.toggle(node.id);
                  }}
                >
                  ${this.isExpanded(node.id) ? "▾" : "▸"}
                </button>`
              : html`<span class="toggle"></span>`}<span>${node.label}</span>
          </div>
          ${node.children?.length && this.isExpanded(node.id)
            ? html`<div class="children">${this.renderNodes(node.children)}</div>`
            : null}
        </div>`,
    );
  }
  render() {
    return html`<div class="tree" role="tree">${this.renderNodes(this.nodes)}</div>`;
  }
}

export class AdminTimelineElement extends AdminElement {
  static properties = { items: { attribute: false } };
  static styles = css`
    :host {
      display: block;
    }
    .timeline {
      display: flex;
      flex-direction: column;
    }
    .item {
      position: relative;
      display: grid;
      grid-template-columns: 18px 100px 1fr;
      gap: 12px;
      min-height: 58px;
      color: var(--aui-text);
      font: 11px/1.4 var(--aui-font-mono);
    }
    .dot {
      width: 8px;
      height: 8px;
      margin-top: 3px;
      border: 1px solid var(--aui-text-secondary);
      background: var(--aui-bg);
    }
    .item:not(:last-child) .dot::after {
      content: "";
      position: absolute;
      top: 12px;
      bottom: 0;
      left: 3px;
      width: 1px;
      background: var(--aui-border);
    }
    .time {
      color: var(--aui-text-muted);
    }
    .description {
      color: var(--aui-text-secondary);
    }
  `;
  items: Array<{
    title: string;
    time?: string;
    description?: string;
    status?: "success" | "danger" | "warning";
  }> = [];
  render() {
    return html`<div class="timeline">
      ${this.items.map(
        (item) =>
          html`<div class="item">
            <span
              class="dot"
              style=${item.status
                ? `color:var(--aui-${item.status === "danger" ? "danger" : item.status})`
                : ""}
            ></span
            ><span class="time">${item.time ?? "—"}</span>
            <div>
              <strong>${item.title}</strong>${item.description
                ? html`<div class="description">${item.description}</div>`
                : null}
            </div>
          </div>`,
      )}
    </div>`;
  }
}
