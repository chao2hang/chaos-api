/*
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
*/

import { LitElement } from "lit";

export class AdminElement extends LitElement {
  connectedCallback(): void {
    super.connectedCallback();
    if (!this.classList.contains("aui-root")) this.classList.add("aui-root");
  }

  protected dispatchDetail<T>(name: string, detail: T): void {
    this.dispatchEvent(
      new CustomEvent(name, {
        bubbles: true,
        composed: true,
        detail,
      }),
    );
  }
}

export function defineOnce(name: string, constructor: CustomElementConstructor): void {
  if (!customElements.get(name)) {
    customElements.define(name, constructor);
  }
}
