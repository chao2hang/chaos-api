/*
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
*/

import { catalog, categoryLabels, type CatalogItem } from "./catalog";

type SectionId =
  | "overview"
  | "tokens"
  | "components"
  | "button"
  | "form"
  | "feedback"
  | "data"
  | "overlay"
  | "frameworks"
  | "accessibility";

type Section = { id: SectionId; label: string; eyebrow: string };

type Example = { id: SectionId; title: string; description: string; render: () => string };

const sections: Section[] = [
  { id: "overview", label: "Overview", eyebrow: "START HERE" },
  { id: "tokens", label: "Design Tokens", eyebrow: "FOUNDATION" },
  { id: "components", label: "Component Index", eyebrow: "LIBRARY" },
  { id: "button", label: "Button", eyebrow: "PRIMITIVES" },
  { id: "form", label: "Form Controls", eyebrow: "PRIMITIVES" },
  { id: "feedback", label: "Feedback", eyebrow: "PRIMITIVES" },
  { id: "data", label: "Data Display", eyebrow: "COMPOSITION" },
  { id: "overlay", label: "Dialog & Overlay", eyebrow: "COMPOSITION" },
  { id: "frameworks", label: "Framework Adapters", eyebrow: "INTEGRATION" },
  { id: "accessibility", label: "Accessibility", eyebrow: "INTEGRATION" },
];

const examples: Example[] = [
  {
    id: "button",
    title: "Button",
    description:
      "Primary actions are white. Secondary actions stay transparent. Destructive actions are explicit and never rely on color alone.",
    render: buttonExample,
  },
  {
    id: "form",
    title: "Form Controls",
    description:
      "Inputs preserve the terminal rhythm: deep black surface, hard 1px border, monospace data entry, visible focus.",
    render: formExample,
  },
  {
    id: "feedback",
    title: "Feedback States",
    description: "Success, danger, warning and neutral states share one compact status vocabulary.",
    render: feedbackExample,
  },
  {
    id: "data",
    title: "Data Display",
    description:
      "Tables are data-first, horizontally scrollable, and keep loading and empty states structurally stable.",
    render: dataExample,
  },
  {
    id: "overlay",
    title: "Dialog & Overlay",
    description:
      "Native dialog behavior gives keyboard users ESC close, focus semantics and a clear destructive confirmation path.",
    render: overlayExample,
  },
];

const codeSamples: Record<string, string> = {
  react: `import { AdminButton, AdminPage } from '@chaos_team/blbui-react'\n\n<AdminPage title="Channels">\n  <AdminButton variant="primary">Deploy New</AdminButton>\n</AdminPage>`,
  vue: `<script setup lang="ts">\nimport { AdminButton, AdminPage } from '@chaos_team/blbui-vue'\n</script>\n\n<AdminPage title="Channels">\n  <AdminButton variant="primary">Deploy New</AdminButton>\n</AdminPage>`,
  svelte: `<script lang="ts">\nimport { AdminButton, AdminPage } from '@chaos_team/blbui-svelte/components'\n</script>\n\n<AdminPage title="Channels">\n  <AdminButton variant="primary">Deploy New</AdminButton>\n</AdminPage>`,
  web: `import { registerAdminElements } from '@chaos_team/blbui-core/register'\nimport '@chaos_team/blbui-core/styles.css'\n\nregisterAdminElements()\n\n<aui-button variant="primary">Deploy New</aui-button>`,
};

const root = document.createElement("div");
root.className = "docs-app aui-root";
root.innerHTML = `
  <aside class="docs-sidebar">
    <a class="brand" href="#overview" data-nav="overview" aria-label="BLBUI home">
      <span class="brand-mark"><i></i></span>
      <span class="brand-copy"><strong>CHAOS_API</strong><small>BLBUI / DOCS</small></span>
    </a>
    <div class="sidebar-rule"></div>
    <label class="docs-search"><span aria-hidden="true">⌕</span><input id="docs-search" type="search" placeholder="SEARCH COMPONENTS" aria-label="Search components" /></label>
    <nav class="docs-nav" aria-label="Documentation navigation"></nav>
    <div class="sidebar-footer"><span class="pulse"></span><span>CORE STATUS / STABLE</span><span class="version">v0.1.0</span></div>
  </aside>
  <div class="docs-main">
    <header class="docs-header">
      <div class="header-path"><span>DOCS:</span> CHAOS BLBUI <b>/</b> COMPONENT SYSTEM</div>
      <div class="header-tools"><a href="https://github.com/chao2hang/chaos-api" target="_blank" rel="noreferrer">GITHUB ↗</a><button type="button" class="header-menu" aria-label="Open navigation">MENU</button></div>
    </header>
    <main class="docs-content">
      <section class="docs-hero" id="overview">
        <div class="hero-kicker"><span></span> OBSIDIAN INDUSTRIAL CONSOLE / 0.1.0</div>
        <h1>BLBUI<br><em>DOCUMENTATION</em></h1>
        <p class="hero-lede">A sharp, data-first component system for operational interfaces. Built once for the web, React, Vue and Svelte.</p>
        <div class="hero-actions"><aui-button variant="primary" id="hero-explore">EXPLORE COMPONENTS</aui-button><a class="text-link" href="#frameworks">VIEW FRAMEWORKS <span>→</span></a></div>
        <div class="hero-grid" aria-label="Library facts"><div><small>RENDERER</small><strong>WEB COMPONENTS</strong></div><div><small>ADAPTERS</small><strong>REACT · VUE · SVELTE</strong></div><div><small>DESIGN LANGUAGE</small><strong>OBSIDIAN / INDUSTRIAL</strong></div></div><div class="hero-count"><strong>${catalog.length}</strong><span>COMPONENTS CATALOGUED / 8 SYSTEM LAYERS / 3 FRAMEWORK ADAPTERS</span></div>
      </section>
      <section class="content-section" id="tokens"><div class="section-heading"><span class="section-index">01</span><div><p class="eyebrow">FOUNDATION</p><h2>Design tokens</h2></div></div><div class="token-layout"><div class="token-copy"><p>Every component inherits a compact, semantic token layer. Override variables at your application root to create a controlled variant without forking component CSS.</p><code>:root { --aui-bg: #0a0a0a; --aui-border: #262626; }</code></div><div class="token-grid">${tokenCards()}</div></div></section>
      <section class="content-section" id="components"><div class="section-heading"><span class="section-index">02</span><div><p class="eyebrow">LIBRARY INDEX</p><h2>Every building block</h2></div></div><p class="section-intro catalog-intro">A searchable inventory of the real registered Custom Elements. Primitive, framework-neutral and ready to compose across admin, ERP, CRM, analytics and operations products.</p><div class="catalog-toolbar"><div class="catalog-total"><strong id="catalog-visible-count">${catalog.length}</strong><span>VISIBLE / ${catalog.length} TOTAL</span></div><div class="category-filters" role="group" aria-label="Filter component category"><button type="button" class="category-filter is-active" data-category="all">ALL</button>${Object.entries(
        categoryLabels,
      )
        .map(
          ([id, label]) =>
            `<button type="button" class="category-filter" data-category="${id}">${label.toUpperCase()}</button>`,
        )
        .join(
          "",
        )}</div></div><div class="catalog-grid" id="catalog-grid">${catalogMarkup()}</div><div class="showcase-heading"><p class="eyebrow">LIVE SHOWCASE</p><span>INTERACTIVE REFERENCES / REAL CORE ELEMENTS</span></div><div class="component-grid" id="showcase-grid">${examples.map((example) => `<article class="component-card" id="showcase-${example.id}"><div class="component-card-heading"><span class="component-slug">AUI / ${example.id.toUpperCase()}</span><span class="component-status">READY</span></div><h3>${example.title}</h3><p>${example.description}</p><div class="playground">${example.render()}</div><div class="component-card-footer"><button class="code-toggle" type="button" data-code="${example.id}">VIEW USAGE <span>⌄</span></button><a href="#accessibility">A11Y NOTES →</a></div><pre class="code-block" data-code-block="${example.id}" hidden></pre></article>`).join("")}</div><div class="advanced-lab"><div class="showcase-heading"><p class="eyebrow">ADVANCED LAB</p><span>NEW IN CORE / FILTERS, WORKFLOWS, INSPECTORS</span></div>${advancedLabMarkup()}</div></section>
      <section class="content-section framework-section" id="frameworks"><div class="section-heading"><span class="section-index">03</span><div><p class="eyebrow">INTEGRATION</p><h2>One system. Your stack.</h2></div></div><p class="section-intro">The core owns behavior and visual language. Thin adapters make the same components feel native in every supported framework.</p><div class="framework-tabs" role="tablist" aria-label="Framework examples">${["react", "vue", "svelte", "web"].map((framework, index) => `<button type="button" role="tab" aria-selected="${index === 0}" data-framework="${framework}">${framework === "web" ? "WEB COMPONENTS" : framework.toUpperCase()}</button>`).join("")}</div><pre class="framework-code" aria-live="polite"></pre><div class="install-row"><span>INSTALL</span><code>bun add @chaos_team/blbui-react @chaos_team/blbui-core</code><button type="button" class="copy-install">COPY</button></div></section>
      <section class="content-section accessibility-section" id="accessibility"><div class="section-heading"><span class="section-index">04</span><div><p class="eyebrow">QUALITY BAR</p><h2>Accessible by default</h2></div></div><div class="a11y-list"><div><strong>01</strong><span>Native elements first</span><p>Buttons, inputs, select, table and dialog preserve browser semantics.</p></div><div><strong>02</strong><span>State has meaning</span><p>Active, selected, disabled, loading and error states expose ARIA semantics.</p></div><div><strong>03</strong><span>Motion is optional</span><p>Transitions and shimmer respect <code>prefers-reduced-motion</code>.</p></div></div></section>
    </main>
    <footer class="docs-footer"><span>CHAOS BLBUI / DOCUMENTATION</span><span>BUILT FOR OPERATORS, NOT DECORATION.</span></footer>
  </div>
`;

function catalogMarkup(items: CatalogItem[] = catalog): string {
  return items
    .map(
      (entry) =>
        `<article class="catalog-card" data-catalog-id="${entry.id}" data-category="${entry.category}" data-search="${`${entry.name} ${entry.tag} ${entry.description} ${entry.category}`.toLowerCase()}"><div class="catalog-card-top"><span class="component-slug">${entry.tag}</span><span class="catalog-status catalog-status-${entry.status}">${entry.status.toUpperCase()}</span></div><h3>${entry.name}</h3><p>${entry.description}</p><div class="catalog-meta"><span>${categoryLabels[entry.category].toUpperCase()}</span><span>${entry.props.length} PROPS</span></div><div class="catalog-api"><code>${entry.props.length ? entry.props.join(" · ") : "SLOT / NATIVE"}</code>${entry.events?.length ? `<small>${entry.events.join(" · ")}</small>` : ""}</div></article>`,
    )
    .join("");
}

function advancedLabMarkup(): string {
  return `<div class="lab-grid"><article class="lab-card"><span class="component-slug">PRIMITIVES / MIX</span><h3>Operational markers</h3><div class="lab-preview"><aui-badge variant="primary" dot>PRIMARY</aui-badge><aui-badge variant="success" dot>HEALTHY</aui-badge><aui-avatar initials="CA" size="lg"></aui-avatar><aui-progress value="72" max="100" label="CAPACITY" show-value></aui-progress></div></article><article class="lab-card"><span class="component-slug">INPUT / SEARCH</span><h3>Searchable selection</h3><div class="lab-preview"><aui-combobox id="docs-combobox" options='[{"value":"openai","label":"OpenAI","description":"Primary provider route"},{"value":"anthropic","label":"Anthropic","description":"Failover provider route"},{"value":"gemini","label":"Gemini","description":"Edge provider route"}]' placeholder="SEARCH PROVIDER"></aui-combobox><aui-tag-input values='["production","eu-west"]' placeholder="ADD FILTER"></aui-tag-input></div></article><article class="lab-card"><span class="component-slug">LAYOUT / INSPECTOR</span><h3>System composition</h3><div class="lab-preview"><aui-grid columns="3"><aui-stat label="REQUESTS" value="12.8K" unit="RPM"></aui-stat><aui-stat label="LATENCY" value="184" unit="MS"></aui-stat><aui-stat label="ERRORS" value="0.04" unit="%"></aui-stat></aui-grid></div></article><article class="lab-card"><span class="component-slug">DATA / OPERATIONS</span><h3>Queue board</h3><div class="lab-preview"><aui-kanban columns='[{"id":"todo","title":"TODO","items":[{"id":"1","title":"Rotate provider key","meta":"SECURITY"}]},{"id":"doing","title":"IN PROGRESS","items":[{"id":"2","title":"Review latency spike","meta":"OPS"}]},{"id":"done","title":"DONE","items":[{"id":"3","title":"Deploy fallback route","meta":"RELEASE"}]}]'></aui-kanban></div></article></div>`;
}

function tokenCards(): string {
  const tokens = [
    ["CANVAS", "--aui-bg", "#0a0a0a"],
    ["SURFACE", "--aui-surface", "#0f0f0f"],
    ["HEADER", "--aui-header", "#18181b"],
    ["BORDER", "--aui-border", "#262626"],
    ["PRIMARY", "--aui-text-primary", "#ffffff"],
    ["SUCCESS", "--aui-success", "#10b981"],
    ["DANGER", "--aui-danger", "#ef4444"],
    ["INFO", "--aui-info", "#60a5fa"],
  ];
  return tokens
    .map(
      ([label, variable, color]) =>
        `<div class="token-card"><span class="swatch" style="background:${color}"></span><div><small>${label}</small><code>${variable}</code><strong>${color}</strong></div></div>`,
    )
    .join("");
}

function buttonExample(): string {
  return `<div class="demo-stack"><div class="demo-row"><aui-button variant="primary">DEPLOY NEW</aui-button><aui-button variant="secondary">FILTER</aui-button><aui-button variant="danger">DELETE</aui-button></div><div class="demo-row"><aui-button size="compact" variant="secondary">COMPACT ACTION</aui-button><aui-button size="compact" variant="primary" loading>PROCESSING</aui-button><aui-button size="compact" variant="secondary" disabled>DISABLED</aui-button></div></div>`;
}

function formExample(): string {
  return `<div class="demo-form"><label>CHANNEL NAME<aui-input value="openai-primary" placeholder="Enter channel name"></aui-input></label><label>PROVIDER<aui-select options='[{"value":"openai","label":"OpenAI"},{"value":"anthropic","label":"Anthropic"}]'></aui-select></label><label>NOTES<aui-textarea value="Operational route for production traffic." rows="3"></aui-textarea></label><div class="demo-checks"><aui-checkbox label="Enable channel"></aui-checkbox><aui-switch label="Failover route"></aui-switch></div></div>`;
}

function feedbackExample(): string {
  return `<div class="demo-stack"><div class="demo-row demo-statuses"><aui-status-tag status="success">ONLINE</aui-status-tag><aui-status-tag status="danger">FAILED</aui-status-tag><aui-status-tag status="warning">REVIEW</aui-status-tag><aui-status-tag status="info">SYNCING</aui-status-tag><aui-status-tag>DISABLED</aui-status-tag></div><div class="feedback-grid"><aui-empty-state title="No routes" description="Create a route to begin."></aui-empty-state><aui-error-state title="Request failed" description="The upstream did not respond."><aui-button size="compact" variant="secondary">RETRY</aui-button></aui-error-state></div></div>`;
}

function dataExample(): string {
  return `<div class="demo-stack"><aui-table><table><thead><tr><th>CHANNEL</th><th>MODEL</th><th>STATUS</th><th>LATENCY</th></tr></thead><tbody><tr><td>OPENAI / PRIMARY</td><td>GPT-4.1</td><td><aui-status-tag status="success">ONLINE</aui-status-tag></td><td>184 MS</td></tr><tr><td>ANTHROPIC / FAILOVER</td><td>CLAUDE-3-7</td><td><aui-status-tag status="warning">REVIEW</aui-status-tag></td><td>—</td></tr><tr><td>GEMINI / EDGE</td><td>GEMINI-2.5</td><td><aui-status-tag status="danger">FAILED</aui-status-tag></td><td>2.4 S</td></tr></tbody></table></aui-table><aui-pagination page="1" total-pages="3" total="24"></aui-pagination></div>`;
}

function overlayExample(): string {
  return `<div class="demo-row"><aui-button variant="secondary" id="open-dialog">OPEN DIALOG</aui-button><aui-button variant="danger" id="open-confirm">OPEN CONFIRMATION</aui-button><aui-dialog title="Deploy route" description="Changes apply to production traffic."><div class="dialog-placeholder">DIALOG CONTENT / READY FOR FORM FIELDS</div><span slot="footer"><aui-button variant="secondary" id="close-dialog">CANCEL</aui-button><aui-button variant="primary" id="save-dialog">CONFIRM DEPLOY</aui-button></span></aui-dialog><aui-confirm-dialog title="Delete channel?" description="This action permanently removes the channel route." confirm-label="DELETE CHANNEL" cancel-label="CANCEL" danger></aui-confirm-dialog></div>`;
}

function getNavId(): SectionId {
  const hash = window.location.hash.slice(1) as SectionId;
  return sections.some((section) => section.id === hash) ? hash : "overview";
}

function setActiveNav(id: SectionId): void {
  root
    .querySelectorAll<HTMLElement>("[data-nav]")
    .forEach((item) =>
      item.setAttribute("aria-current", item.dataset.nav === id ? "page" : "false"),
    );
}

function updateFrameworkCode(framework: string): void {
  const code = root.querySelector<HTMLElement>(".framework-code");
  if (code) code.textContent = codeSamples[framework] ?? codeSamples.web;
}

const nav = root.querySelector(".docs-nav") as HTMLElement;
let previousEyebrow = "";
for (const section of sections) {
  if (section.eyebrow !== previousEyebrow) {
    const label = document.createElement("p");
    label.className = "nav-eyebrow";
    label.textContent = section.eyebrow;
    nav.append(label);
    previousEyebrow = section.eyebrow;
  }
  const link = document.createElement("a");
  link.href = `#${section.id}`;
  link.dataset.nav = section.id;
  link.textContent = section.label;
  nav.append(link);
}

function setProperty(selector: string, name: string, value: unknown): void {
  const element = root.querySelector(selector) as (HTMLElement & Record<string, unknown>) | null;
  if (element) element[name] = value;
}

setProperty("#showcase-form aui-select", "options", [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
]);
setProperty("#docs-combobox", "options", [
  { value: "openai", label: "OpenAI", description: "Primary provider route" },
  { value: "anthropic", label: "Anthropic", description: "Failover provider route" },
  { value: "gemini", label: "Gemini", description: "Edge provider route" },
]);
setProperty(".advanced-lab aui-tag-input", "values", ["production", "eu-west"]);
setProperty(".advanced-lab aui-kanban", "columns", [
  {
    id: "todo",
    title: "TODO",
    items: [{ id: "1", title: "Rotate provider key", meta: "SECURITY" }],
  },
  {
    id: "doing",
    title: "IN PROGRESS",
    items: [{ id: "2", title: "Review latency spike", meta: "OPS" }],
  },
  {
    id: "done",
    title: "DONE",
    items: [{ id: "3", title: "Deploy fallback route", meta: "RELEASE" }],
  },
]);

root
  .querySelectorAll<HTMLElement>("[data-nav]")
  .forEach((link) =>
    link.addEventListener("click", () => setActiveNav(link.dataset.nav as SectionId)),
  );
root
  .querySelector("#hero-explore")
  ?.addEventListener("click", () =>
    document.querySelector("#components")?.scrollIntoView({ behavior: "smooth" }),
  );
root
  .querySelector(".header-menu")
  ?.addEventListener("click", () =>
    root.querySelector(".docs-sidebar")?.classList.toggle("is-open"),
  );

const catalogCount = root.querySelector<HTMLElement>("#catalog-visible-count");
let selectedCategory = "all";
function filterCatalog(): void {
  const query = (root.querySelector<HTMLInputElement>("#docs-search")?.value ?? "")
    .trim()
    .toLowerCase();
  let visible = 0;
  root.querySelectorAll<HTMLElement>(".catalog-card").forEach((card) => {
    const matchesCategory =
      selectedCategory === "all" || card.dataset.category === selectedCategory;
    const matchesQuery = !query || (card.dataset.search ?? "").includes(query);
    const show = matchesCategory && matchesQuery;
    card.hidden = !show;
    if (show) visible += 1;
  });
  if (catalogCount) catalogCount.textContent = String(visible);
}
root.querySelector("#docs-search")?.addEventListener("input", filterCatalog);
root.querySelectorAll<HTMLButtonElement>(".category-filter").forEach((button) =>
  button.addEventListener("click", () => {
    selectedCategory = button.dataset.category ?? "all";
    root
      .querySelectorAll(".category-filter")
      .forEach((item) => item.classList.toggle("is-active", item === button));
    filterCatalog();
  }),
);

root.querySelectorAll<HTMLButtonElement>(".code-toggle").forEach((button) => {
  button.addEventListener("click", () => {
    const id = button.dataset.code;
    const block = root.querySelector<HTMLElement>(`[data-code-block="${id}"]`);
    if (!block || !id) return;
    if (block.hidden) {
      block.textContent = usageCode(id);
      block.hidden = false;
      button.innerHTML = "HIDE USAGE <span>⌃</span>";
    } else {
      block.hidden = true;
      button.innerHTML = "VIEW USAGE <span>⌄</span>";
    }
  });
});

function usageCode(id: string): string {
  if (id === "button") {
    return `<aui-button variant="primary">Deploy New</aui-button>\n<aui-button variant="secondary">Filter</aui-button>\n<aui-button variant="danger">Delete</aui-button>`;
  }
  if (id === "form") {
    return `<aui-input placeholder="Search channels"></aui-input>\n<aui-select .options={options}></aui-select>\n<aui-textarea rows="4"></aui-textarea>`;
  }
  if (id === "data") {
    return `<aui-table>\n  <table>...</table>\n</aui-table>\n<aui-pagination page="1" total-pages="3" total="24"></aui-pagination>`;
  }
  if (id === "overlay") {
    return `<aui-dialog title="Deploy route">\n  <span slot="footer">...</span>\n</aui-dialog>`;
  }
  return `<aui-status-tag status="success">ONLINE</aui-status-tag>\n<aui-empty-state title="No routes"></aui-empty-state>\n<aui-error-state title="Request failed"></aui-error-state>`;
}

root.querySelectorAll<HTMLButtonElement>("[data-framework]").forEach((button) =>
  button.addEventListener("click", () => {
    root
      .querySelectorAll("[data-framework]")
      .forEach((item) => item.setAttribute("aria-selected", item === button ? "true" : "false"));
    updateFrameworkCode(button.dataset.framework ?? "web");
  }),
);
updateFrameworkCode("react");

root.querySelector(".copy-install")?.addEventListener("click", async (event) => {
  const button = event.currentTarget as HTMLButtonElement;
  await navigator.clipboard?.writeText(
    "bun add @chaos_team/blbui-react @chaos_team/blbui-core",
  );
  button.textContent = "COPIED";
  window.setTimeout(() => {
    button.textContent = "COPY";
  }, 1200);
});

root
  .querySelector("#open-dialog")
  ?.addEventListener("click", () => root.querySelector("aui-dialog")?.setAttribute("open", ""));
root
  .querySelector("#close-dialog")
  ?.addEventListener("click", () => root.querySelector("aui-dialog")?.removeAttribute("open"));
root
  .querySelector("#save-dialog")
  ?.addEventListener("click", () => root.querySelector("aui-dialog")?.removeAttribute("open"));
root
  .querySelector("#open-confirm")
  ?.addEventListener("click", () =>
    root.querySelector("aui-confirm-dialog")?.setAttribute("open", ""),
  );
root
  .querySelector("aui-confirm-dialog")
  ?.addEventListener("aui-confirm", () =>
    root.querySelector("aui-confirm-dialog")?.removeAttribute("open"),
  );
root
  .querySelector("aui-confirm-dialog")
  ?.addEventListener("aui-cancel", () =>
    root.querySelector("aui-confirm-dialog")?.removeAttribute("open"),
  );

const observer = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible?.target.id) setActiveNav(visible.target.id as SectionId);
  },
  { rootMargin: "-15% 0px -70% 0px", threshold: [0, 0.2, 0.8] },
);
root
  .querySelectorAll<HTMLElement>(".docs-content > section")
  .forEach((section) => observer.observe(section));
setActiveNav(getNavId());

export function mountDocsApp(container: HTMLElement): void {
  container.replaceChildren(root);
}
