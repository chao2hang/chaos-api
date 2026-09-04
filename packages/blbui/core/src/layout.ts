/*
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
*/

import { css, html } from "lit";
import { AdminElement } from "./base";

export class AdminPageElement extends AdminElement {
  static properties = { title: { type: String }, description: { type: String } };
  static styles = css`
    :host {
      display: block;
      min-height: 0;
    }
    .page {
      display: flex;
      min-height: 0;
      flex-direction: column;
      gap: 24px;
    }
    .content {
      display: flex;
      min-height: 0;
      flex-direction: column;
      gap: 24px;
    }
    .header {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--aui-border);
    }
    .copy h1 {
      margin: 0;
      color: var(--aui-text-primary);
      font: 700 18px/1.2 var(--aui-font-mono);
      letter-spacing: -0.025em;
      text-transform: uppercase;
    }
    .copy p {
      margin: 4px 0 0;
      color: var(--aui-text-secondary);
      font: 12px/1.45 var(--aui-font-mono);
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    @media (min-width: 640px) {
      .header {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
      .actions {
        justify-content: flex-end;
      }
    }
  `;
  declare title: string;
  declare description: string;
  render() {
    return html`<div class="page">
      <header class="header">
        <div class="copy">
          <h1>${this.title}</h1>
          ${this.description ? html`<p>${this.description}</p>` : null}
        </div>
        <div class="actions"><slot name="actions"></slot></div>
      </header>
      <div class="content"><slot></slot></div>
    </div>`;
  }
}

export class AdminPageHeaderElement extends AdminElement {
  static properties = { title: { type: String }, description: { type: String } };
  static styles = css`
    :host {
      display: block;
    }
    .header {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--aui-border);
    }
    .copy h1 {
      margin: 0;
      color: var(--aui-text-primary);
      font: 700 18px/1.2 var(--aui-font-mono);
      letter-spacing: -0.025em;
      text-transform: uppercase;
    }
    .copy p {
      margin: 4px 0 0;
      color: var(--aui-text-secondary);
      font: 12px/1.45 var(--aui-font-mono);
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    @media (min-width: 640px) {
      .header {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
      .actions {
        justify-content: flex-end;
      }
    }
  `;
  declare title: string;
  declare description: string;
  render() {
    return html`<header class="header">
      <div class="copy">
        <h1>${this.title}</h1>
        ${this.description ? html`<p>${this.description}</p>` : null}
      </div>
      <div class="actions"><slot name="actions"></slot></div>
    </header>`;
  }
}

export class AdminStatElement extends AdminElement {
  static properties = {
    label: { type: String },
    value: { type: String },
    unit: { type: String },
    trend: { type: String },
  };
  static styles = css`
    :host {
      display: block;
    }
    .stat {
      min-width: 0;
      padding: 16px 0;
      border-top: 1px solid var(--aui-border);
    }
    .label {
      color: var(--aui-text-secondary);
      font: 10px/1.2 var(--aui-font-mono);
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .value {
      margin-top: 8px;
      color: var(--aui-text-primary);
      font: 300 32px/1 var(--aui-font-mono);
      font-variant-numeric: tabular-nums;
    }
    .unit {
      margin-left: 6px;
      color: var(--aui-text-muted);
      font-size: 11px;
    }
    .trend {
      margin-top: 8px;
      color: var(--aui-success);
      font: 10px/1.2 var(--aui-font-mono);
    }
  `;
  label = "";
  value = "";
  unit = "";
  trend = "";
  render() {
    return html`<div class="stat">
      <div class="label">${this.label}</div>
      <div class="value">${this.value}<span class="unit">${this.unit}</span></div>
      ${this.trend ? html`<div class="trend">${this.trend}</div>` : null}
    </div>`;
  }
}

export class AdminFilterBarElement extends AdminElement {
  static styles = css`
    :host {
      display: block;
    }
    .filter {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border: 1px solid var(--aui-border);
      background: var(--aui-surface);
    }
  `;
  render() {
    return html`<div class="filter"><slot></slot></div>`;
  }
}

export class AdminShellElement extends AdminElement {
  static properties = {
    sidebarWidth: { type: String, attribute: "sidebar-width" },
    headerHeight: { type: String, attribute: "header-height" },
  };
  static styles = css`
    :host {
      display: block;
      height: 100vh;
      color: var(--aui-text);
      background: var(--aui-bg);
    }
    .shell {
      display: flex;
      height: 100%;
      overflow: hidden;
    }
    .sidebar {
      width: var(--aui-sidebar-width);
      flex: 0 0 var(--aui-sidebar-width);
      overflow: hidden;
      border-right: 1px solid var(--aui-border);
      background: var(--aui-bg);
    }
    .main {
      min-width: 0;
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .header {
      height: var(--aui-header-height);
      flex: 0 0 var(--aui-header-height);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 32px;
      border-bottom: 1px solid var(--aui-border);
      background: var(--aui-bg);
    }
    .content {
      min-height: 0;
      flex: 1;
      overflow: auto;
      padding: var(--aui-page-padding);
    }
    @media (max-width: 767px) {
      .sidebar {
        display: none;
      }
      .header {
        padding: 0 16px;
      }
      .content {
        padding: 16px;
      }
    }
  `;
  sidebarWidth = "";
  headerHeight = "";
  render() {
    return html`<div class="shell">
      <aside class="sidebar"><slot name="sidebar"></slot></aside>
      <div class="main">
        <header class="header"><slot name="header"></slot></header>
        <main class="content"><slot></slot></main>
      </div>
    </div>`;
  }
}
