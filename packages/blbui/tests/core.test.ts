/*
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
*/

import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { registerAdminElements } from "../core/src/register";
import type { AdminPaginationElement, AdminTabsElement } from "../core/src";

beforeAll(() => {
  registerAdminElements();
});

afterEach(() => {
  document.body.replaceChildren();
});

describe("industrial admin core", () => {
  it("disables a loading button and exposes busy state", async () => {
    const button = document.createElement("aui-button");
    button.setAttribute("variant", "primary");
    button.setAttribute("loading", "true");
    document.body.append(button);

    await (button as unknown as { updateComplete: Promise<boolean> }).updateComplete;
    const innerButton = button.shadowRoot?.querySelector("button");

    expect(innerButton?.disabled).toBe(true);
    expect(innerButton?.getAttribute("aria-busy")).toBe("true");
    expect(innerButton?.querySelector(".spinner")).not.toBeNull();
  });

  it("emits the next page while disabling PREV on the first page", async () => {
    const pagination = document.createElement(
      "aui-pagination",
    ) as unknown as AdminPaginationElement;
    pagination.page = 1;
    pagination.totalPages = 3;
    document.body.append(pagination);
    await pagination.updateComplete;

    let selectedPage = 0;
    pagination.addEventListener("aui-page-change", (event) => {
      selectedPage = (event as CustomEvent<{ page: number }>).detail.page;
    });

    const buttons = pagination.shadowRoot?.querySelectorAll("button");
    expect(buttons?.[0].disabled).toBe(true);
    buttons?.[1].click();
    await pagination.updateComplete;

    expect(selectedPage).toBe(2);
    expect(pagination.page).toBe(2);
  });

  it("keeps tabs accessible and emits the selected tab id", async () => {
    const tabs = document.createElement("aui-tabs") as unknown as AdminTabsElement;
    tabs.items = [
      { id: "overview", label: "Overview" },
      { id: "logs", label: "Logs" },
    ];
    tabs.active = "overview";
    document.body.append(tabs);
    await tabs.updateComplete;

    let selectedTab = "";
    tabs.addEventListener("aui-tab-change", (event) => {
      selectedTab = (event as CustomEvent<{ id: string }>).detail.id;
    });
    const tabButtons = tabs.shadowRoot?.querySelectorAll('[role="tab"]');
    tabButtons?.[1].click();
    await tabs.updateComplete;

    expect(selectedTab).toBe("logs");
    expect(tabButtons?.[1].getAttribute("aria-selected")).toBe("true");
  });

  it("shows an explicit loading state without removing the table structure", async () => {
    const table = document.createElement("aui-table");
    table.setAttribute("loading", "true");
    table.innerHTML = "<table><thead><tr><th>NAME</th></tr></thead><tbody></tbody></table>";
    document.body.append(table);
    await (table as unknown as { updateComplete: Promise<boolean> }).updateComplete;

    expect(table.querySelector("table")).not.toBeNull();
    expect(table.shadowRoot?.querySelector(".loading-state")?.textContent).toContain("Loading");
  });
});

describe("expanded component contracts", () => {
  it("filters combobox options and emits the chosen value", async () => {
    const combobox = document.createElement("aui-combobox") as HTMLElement & {
      options: Array<{ value: string; label: string }>;
      updateComplete: Promise<boolean>;
    };
    combobox.options = [
      { value: "openai", label: "OpenAI" },
      { value: "anthropic", label: "Anthropic" },
    ];
    document.body.append(combobox);
    await combobox.updateComplete;

    let selected = "";
    combobox.addEventListener("aui-change", (event) => {
      selected = (event as CustomEvent<{ value: string }>).detail.value;
    });
    const input = combobox.shadowRoot?.querySelector("input");
    if (!input) throw new Error("Combobox input was not rendered");
    input.value = "anth";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await combobox.updateComplete;
    combobox.shadowRoot?.querySelector<HTMLButtonElement>(".option")?.click();

    expect(selected).toBe("anthropic");
    expect((combobox as unknown as { open: boolean }).open).toBe(false);
  });

  it("keeps a progress value within its accessible range", async () => {
    const progress = document.createElement("aui-progress") as HTMLElement & {
      value: number;
      max: number;
      updateComplete: Promise<boolean>;
    };
    progress.value = 120;
    progress.max = 100;
    document.body.append(progress);
    await progress.updateComplete;
    const bar = progress.shadowRoot?.querySelector('[role="progressbar"]');

    expect(bar?.getAttribute("aria-valuenow")).toBe("120");
    expect(progress.shadowRoot?.querySelector<HTMLElement>(".indicator")?.style.width).toBe("100%");
  });

  it("emits a menu selection from a dropdown item", async () => {
    const dropdown = document.createElement("aui-dropdown") as HTMLElement & {
      items: Array<{ id: string; label: string }>;
      updateComplete: Promise<boolean>;
    };
    dropdown.items = [{ id: "refresh", label: "Refresh" }];
    document.body.append(dropdown);
    await dropdown.updateComplete;

    let selected = "";
    dropdown.addEventListener("aui-menu-select", (event) => {
      selected = (event as CustomEvent<{ id: string }>).detail.id;
    });
    dropdown.shadowRoot?.querySelector<HTMLElement>(".menu button")?.click();

    expect(selected).toBe("refresh");
  });

  it("updates tag list immediately when values property is set dynamically", async () => {
    const tagInput = document.createElement("aui-tag-input") as HTMLElement & {
      values: string[];
      updateComplete: Promise<boolean>;
    };
    document.body.append(tagInput);
    await tagInput.updateComplete;

    expect(tagInput.shadowRoot?.querySelectorAll(".tag").length).toBe(0);

    tagInput.values = ["gpt-4o", "claude-3-5-sonnet"];
    await tagInput.updateComplete;

    const tags = tagInput.shadowRoot?.querySelectorAll(".tag");
    expect(tags?.length).toBe(2);
    expect(tags?.[0].textContent).toContain("gpt-4o");
    expect(tags?.[1].textContent).toContain("claude-3-5-sonnet");
  });

  it("commits pending tag input on blur", async () => {
    const tagInput = document.createElement("aui-tag-input") as HTMLElement & {
      values: string[];
      updateComplete: Promise<boolean>;
    };
    document.body.append(tagInput);
    await tagInput.updateComplete;

    let committedValues: string[] = [];
    tagInput.addEventListener("aui-tags-change", (event) => {
      committedValues = (event as CustomEvent<{ values: string[] }>).detail.values;
    });

    const innerInput = tagInput.shadowRoot?.querySelector("input");
    expect(innerInput).not.toBeNull();
    if (innerInput) {
      innerInput.value = "gemini-1.5-pro";
      innerInput.dispatchEvent(new FocusEvent("blur"));
    }
    await tagInput.updateComplete;

    expect(committedValues).toEqual(["gemini-1.5-pro"]);
    expect(tagInput.values).toEqual(["gemini-1.5-pro"]);
  });
});
