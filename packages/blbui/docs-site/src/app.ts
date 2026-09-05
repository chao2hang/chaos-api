/*
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
*/

import { categoryLabels, type CatalogCategory } from "./catalog";
import {
  components,
  initComponentDemo,
  type ComponentItem,
  type FrameworkType,
} from "./components-data";

type SectionId =
  | "overview"
  | "tokens"
  | "components"
  | "cat-primitives"
  | "cat-forms"
  | "cat-navigation"
  | "cat-feedback"
  | "cat-overlay"
  | "cat-data"
  | "cat-layout"
  | "cat-business"
  | "frameworks"
  | "accessibility";

type Section = { id: SectionId; label: string; eyebrow: string; category?: CatalogCategory };

const sections: Section[] = [
  { id: "overview", label: "Overview", eyebrow: "START HERE" },
  { id: "tokens", label: "Design Tokens", eyebrow: "FOUNDATION" },
  { id: "components", label: "All Components (87)", eyebrow: "LIBRARY" },
  { id: "cat-primitives", label: "Primitives (9)", eyebrow: "CATEGORIES", category: "primitives" },
  { id: "cat-forms", label: "Form Controls (17)", eyebrow: "CATEGORIES", category: "forms" },
  { id: "cat-navigation", label: "Navigation (13)", eyebrow: "CATEGORIES", category: "navigation" },
  { id: "cat-feedback", label: "Feedback & Status (9)", eyebrow: "CATEGORIES", category: "feedback" },
  { id: "cat-overlay", label: "Overlays & Dialogs (7)", eyebrow: "CATEGORIES", category: "overlay" },
  { id: "cat-data", label: "Data & Tables (11)", eyebrow: "CATEGORIES", category: "data" },
  { id: "cat-layout", label: "Layout & Surfaces (12)", eyebrow: "CATEGORIES", category: "layout" },
  { id: "cat-business", label: "Business Suite (9)", eyebrow: "CATEGORIES", category: "business" },
  { id: "frameworks", label: "Framework Adapters", eyebrow: "INTEGRATION" },
  { id: "accessibility", label: "Accessibility", eyebrow: "INTEGRATION" },
];

const codeSamples: Record<string, string> = {
  react: `import { AdminButton, AdminPage } from '@chaos_team/blbui-react'\n\n<AdminPage title="Channels">\n  <AdminButton variant="primary">Deploy New</AdminButton>\n</AdminPage>`,
  vue: `<script setup lang="ts">\nimport { AdminButton, AdminPage } from '@chaos_team/blbui-vue'\n</script>\n\n<AdminPage title="Channels">\n  <AdminButton variant="primary">Deploy New</AdminButton>\n</AdminPage>`,
  svelte: `<script lang="ts">\nimport { registerAdminElements } from '@chaos_team/blbui-svelte'\nimport '@chaos_team/blbui-core/styles.css'\n\nregisterAdminElements()\n</script>\n\n<aui-page title="Channels">\n  <aui-button variant="primary">Deploy New</aui-button>\n</aui-page>`,
  web: `import { registerAdminElements } from '@chaos_team/blbui-core/register'\nimport '@chaos_team/blbui-core/styles.css'\n\nregisterAdminElements()\n\n<aui-button variant="primary">Deploy New</aui-button>`,
};

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

let globalFramework: FrameworkType = "wc";
const cardFrameworkMap = new Map<string, FrameworkType>();

function renderComponentCard(comp: ComponentItem, fw: FrameworkType = globalFramework): string {
  const code = comp.usage[fw] ?? comp.usage.wc;
  return `
    <article class="catalog-card" data-catalog-id="${comp.id}" data-category="${comp.category}" data-search="${`${comp.name} ${comp.tag} ${comp.description} ${comp.category} ${comp.props.join(" ")}`.toLowerCase()}">
      <div class="catalog-card-top">
        <div class="card-tags">
          <span class="component-slug">${comp.tag}</span>
          <span class="component-react-slug">&lt;${comp.name}&gt;</span>
        </div>
        <div class="card-badges">
          <span class="component-cat-badge">${categoryLabels[comp.category].toUpperCase()}</span>
          <span class="catalog-status catalog-status-${comp.status}">${comp.status.toUpperCase()}</span>
        </div>
      </div>
      <h3>${comp.name}</h3>
      <p>${comp.description}</p>
      
      <div class="playground" data-playground-id="${comp.id}">
        ${comp.previewHtml}
      </div>

      <div class="catalog-api">
        <div class="api-row">
          <span class="api-label">PROPS:</span>
          <code>${comp.props.length ? comp.props.join(" · ") : "SLOT / NATIVE"}</code>
        </div>
        ${
          comp.events.length
            ? `<div class="api-row">
          <span class="api-label">EVENTS:</span>
          <small>${comp.events.join(" · ")}</small>
        </div>`
            : ""
        }
      </div>

      <div class="card-usage-panel">
        <div class="usage-bar">
          <div class="usage-tabs" role="tablist">
            <button type="button" class="usage-tab ${fw === "wc" ? "is-active" : ""}" data-card-fw="wc" data-id="${comp.id}">WC</button>
            <button type="button" class="usage-tab ${fw === "react" ? "is-active" : ""}" data-card-fw="react" data-id="${comp.id}">REACT</button>
            <button type="button" class="usage-tab ${fw === "vue" ? "is-active" : ""}" data-card-fw="vue" data-id="${comp.id}">VUE</button>
            <button type="button" class="usage-tab ${fw === "svelte" ? "is-active" : ""}" data-card-fw="svelte" data-id="${comp.id}">SVELTE</button>
          </div>
          <div class="usage-actions">
            <button type="button" class="card-copy-btn" data-id="${comp.id}" title="Copy usage snippet">COPY</button>
            <button type="button" class="card-toggle-btn" data-id="${comp.id}" title="Toggle usage code">HIDE ⌃</button>
          </div>
        </div>
        <pre class="card-code-block" data-code-id="${comp.id}"><code>${escapeHtml(code)}</code></pre>
      </div>
    </article>
  `;
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

const root = document.createElement("div");
root.className = "docs-app aui-root";
root.innerHTML = `
  <aside class="docs-sidebar">
    <a class="brand" href="#overview" data-nav="overview" aria-label="BLBUI home">
      <span class="brand-mark"><i></i></span>
      <span class="brand-copy"><strong>BLBUI</strong><small>UI LIBRARY / DOCS</small></span>
    </a>
    <div class="sidebar-rule"></div>
    <label class="docs-search"><span aria-hidden="true">⌕</span><input id="docs-search" type="search" placeholder="SEARCH 87 COMPONENTS..." aria-label="Search components" /></label>
    <nav class="docs-nav" aria-label="Documentation navigation"></nav>
    <div class="sidebar-footer"><span class="pulse"></span><span>CORE STATUS / STABLE</span><span class="version">v0.0.2</span></div>
  </aside>
  <div class="docs-main">
    <header class="docs-header">
      <div class="header-path"><span>DOCS:</span> BLBUI <b>/</b> COMPONENT SYSTEM</div>
      <div class="header-tools"><a href="https://github.com/chao2hang/blbui" target="_blank" rel="noreferrer">GITHUB ↗</a><button type="button" class="header-menu" aria-label="Open navigation">MENU</button></div>
    </header>
    <main class="docs-content">
      <section class="docs-hero" id="overview">
        <div class="hero-kicker"><span></span> OBSIDIAN INDUSTRIAL CONSOLE / 0.0.2</div>
        <h1>BLBUI<br><em>DOCUMENTATION</em></h1>
        <p class="hero-lede">A sharp, data-first cross-framework component system for enterprise operational consoles. All 87 components with interactive previews, live properties, and usage across Web Components, React, Vue, and Svelte.</p>
        <div class="hero-actions"><aui-button variant="primary" id="hero-explore">EXPLORE 87 COMPONENTS</aui-button><a class="text-link" href="#frameworks">VIEW FRAMEWORKS <span>→</span></a></div>
        <div class="hero-grid" aria-label="Library facts"><div><small>RENDERER</small><strong>WEB COMPONENTS</strong></div><div><small>ADAPTERS</small><strong>REACT · VUE · SVELTE</strong></div><div><small>DESIGN LANGUAGE</small><strong>OBSIDIAN / INDUSTRIAL</strong></div></div><div class="hero-count"><strong>${components.length}</strong><span>REGISTERED COMPONENTS / 8 CATEGORIES / ZERO RUNTIME OVERHEAD</span></div>
      </section>

      <section class="content-section" id="tokens">
        <div class="section-heading"><span class="section-index">01</span><div><p class="eyebrow">FOUNDATION</p><h2>Design tokens</h2></div></div>
        <div class="token-layout"><div class="token-copy"><p>Every component inherits a compact, semantic token layer. Override variables at your application root to create a controlled variant without forking component CSS.</p><code>:root { --aui-bg: #0a0a0a; --aui-border: #262626; }</code></div><div class="token-grid">${tokenCards()}</div></div>
      </section>

      <section class="content-section" id="components">
        <div class="section-heading"><span class="section-index">02</span><div><p class="eyebrow">LIBRARY INDEX &amp; PLAYGROUND</p><h2>All 87 components &amp; usage</h2></div></div>
        <p class="section-intro catalog-intro">Every custom element is rendered live with interactive controls, schema props, and instant code snippets for Web Components, React, Vue and Svelte.</p>
        
        <div class="catalog-toolbar">
          <div class="catalog-total"><strong id="catalog-visible-count">${components.length}</strong><span>VISIBLE / ${components.length} TOTAL</span></div>
          <div class="category-filters" role="group" aria-label="Filter component category">
            <button type="button" class="category-filter is-active" data-category="all">ALL (87)</button>
            <button type="button" class="category-filter" data-category="primitives">PRIMITIVES (9)</button>
            <button type="button" class="category-filter" data-category="forms">FORMS (17)</button>
            <button type="button" class="category-filter" data-category="navigation">NAVIGATION (13)</button>
            <button type="button" class="category-filter" data-category="feedback">FEEDBACK (9)</button>
            <button type="button" class="category-filter" data-category="overlay">OVERLAYS (7)</button>
            <button type="button" class="category-filter" data-category="data">DATA (11)</button>
            <button type="button" class="category-filter" data-category="layout">LAYOUT (12)</button>
            <button type="button" class="category-filter" data-category="business">BUSINESS (9)</button>
          </div>
        </div>

        <div class="global-fw-bar">
          <span class="global-fw-label">USAGE CODE FRAMEWORK:</span>
          <div class="global-fw-actions">
            <button type="button" class="global-fw-btn is-active" data-global-fw="wc">WEB COMPONENTS</button>
            <button type="button" class="global-fw-btn" data-global-fw="react">REACT</button>
            <button type="button" class="global-fw-btn" data-global-fw="vue">VUE</button>
            <button type="button" class="global-fw-btn" data-global-fw="svelte">SVELTE</button>
            <button type="button" class="global-toggle-all-btn" id="global-toggle-usage">TOGGLE ALL USAGE</button>
          </div>
        </div>

        <div class="catalog-grid" id="catalog-grid">
          ${components.map((c) => renderComponentCard(c, globalFramework)).join("")}
        </div>
      </section>

      <section class="content-section framework-section" id="frameworks">
        <div class="section-heading"><span class="section-index">03</span><div><p class="eyebrow">INTEGRATION</p><h2>One system. Your stack.</h2></div></div>
        <p class="section-intro">The core owns behavior and visual language. Thin adapters make the same components feel native in every supported framework.</p>
        <div class="framework-tabs" role="tablist" aria-label="Framework examples">${["react", "vue", "svelte", "web"].map((framework, index) => `<button type="button" role="tab" aria-selected="${index === 0}" data-framework="${framework}">${framework === "web" ? "WEB COMPONENTS" : framework.toUpperCase()}</button>`).join("")}</div>
        <pre class="framework-code" aria-live="polite"></pre>
        <div class="install-row"><span>INSTALL</span><code>bun add @chaos_team/blbui-react @chaos_team/blbui-core</code><button type="button" class="copy-install">COPY</button></div>
      </section>

      <section class="content-section accessibility-section" id="accessibility">
        <div class="section-heading"><span class="section-index">04</span><div><p class="eyebrow">QUALITY BAR</p><h2>Accessible by default</h2></div></div>
        <div class="a11y-list">
          <div><strong>01</strong><span>Native elements first</span><p>Buttons, inputs, select, table and dialog preserve browser semantics.</p></div>
          <div><strong>02</strong><span>State has meaning</span><p>Active, selected, disabled, loading and error states expose ARIA semantics.</p></div>
          <div><strong>03</strong><span>Motion is optional</span><p>Transitions and shimmer respect <code>prefers-reduced-motion</code>.</p></div>
        </div>
      </section>
    </main>
    <footer class="docs-footer"><span>BLBUI / DOCUMENTATION</span><span>BUILT FOR OPERATORS, NOT DECORATION.</span></footer>
  </div>
`;

// Build sidebar navigation
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
  link.href = section.category ? "#components" : `#${section.id}`;
  link.dataset.nav = section.id;
  if (section.category) link.dataset.targetCategory = section.category;
  link.textContent = section.label;
  nav.append(link);
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

// Wire up filtering
const catalogCount = root.querySelector<HTMLElement>("#catalog-visible-count");
let selectedCategory: string = "all";

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

function applyCategoryFilter(cat: string): void {
  selectedCategory = cat;
  root.querySelectorAll<HTMLButtonElement>(".category-filter").forEach((item) => {
    item.classList.toggle("is-active", (item.dataset.category ?? "all") === cat);
  });
  filterCatalog();
}

root.querySelectorAll<HTMLButtonElement>(".category-filter").forEach((button) =>
  button.addEventListener("click", () => {
    applyCategoryFilter(button.dataset.category ?? "all");
  }),
);

// Sidebar category clicks
root.querySelectorAll<HTMLAnchorElement>("[data-target-category]").forEach((link) => {
  link.addEventListener("click", () => {
    const cat = link.dataset.targetCategory;
    if (cat) {
      applyCategoryFilter(cat);
      document.querySelector("#components")?.scrollIntoView({ behavior: "smooth" });
    }
  });
});

// Update card code
function updateCardCode(cardId: string, fw: FrameworkType): void {
  const comp = components.find((c) => c.id === cardId);
  if (!comp) return;
  const pre = root.querySelector<HTMLElement>(`pre[data-code-id="${cardId}"]`);
  if (pre) {
    const codeEl = pre.querySelector("code");
    const code = comp.usage[fw] ?? comp.usage.wc;
    if (codeEl) codeEl.textContent = code;
  }
}

// Card tabs
root.querySelectorAll<HTMLButtonElement>(".usage-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    const cardId = btn.dataset.id;
    const fw = (btn.dataset.cardFw ?? "wc") as FrameworkType;
    if (!cardId) return;
    cardFrameworkMap.set(cardId, fw);

    const parentBar = btn.closest(".usage-bar");
    parentBar
      ?.querySelectorAll(".usage-tab")
      .forEach((t) => t.classList.toggle("is-active", t === btn));

    updateCardCode(cardId, fw);
  });
});

// Card copy button
root.querySelectorAll<HTMLButtonElement>(".card-copy-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const cardId = btn.dataset.id;
    if (!cardId) return;
    const pre = root.querySelector<HTMLElement>(`pre[data-code-id="${cardId}"]`);
    const code = pre?.querySelector("code")?.textContent ?? "";
    await navigator.clipboard?.writeText(code);
    const original = btn.textContent;
    btn.textContent = "COPIED!";
    window.setTimeout(() => {
      btn.textContent = original ?? "COPY";
    }, 1200);
  });
});

// Card toggle button
root.querySelectorAll<HTMLButtonElement>(".card-toggle-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const cardId = btn.dataset.id;
    if (!cardId) return;
    const pre = root.querySelector<HTMLElement>(`pre[data-code-id="${cardId}"]`);
    if (!pre) return;
    const isHidden = pre.hidden;
    pre.hidden = !isHidden;
    btn.textContent = isHidden ? "HIDE ⌃" : "SHOW ⌄";
  });
});

// Global framework switcher
root.querySelectorAll<HTMLButtonElement>(".global-fw-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const fw = (btn.dataset.globalFw ?? "wc") as FrameworkType;
    globalFramework = fw;

    root.querySelectorAll(".global-fw-btn").forEach((b) => b.classList.toggle("is-active", b === btn));

    components.forEach((c) => {
      cardFrameworkMap.set(c.id, fw);
      updateCardCode(c.id, fw);
      const card = root.querySelector(`[data-catalog-id="${c.id}"]`);
      card?.querySelectorAll<HTMLButtonElement>(".usage-tab").forEach((t) => {
        t.classList.toggle("is-active", t.dataset.cardFw === fw);
      });
    });
  });
});

// Global toggle all usage
let allExpanded = true;
root.querySelector("#global-toggle-usage")?.addEventListener("click", () => {
  allExpanded = !allExpanded;
  root.querySelectorAll<HTMLElement>(".card-code-block").forEach((pre) => {
    pre.hidden = !allExpanded;
  });
  root.querySelectorAll<HTMLButtonElement>(".card-toggle-btn").forEach((btn) => {
    btn.textContent = allExpanded ? "HIDE ⌃" : "SHOW ⌄";
  });
  const btn = root.querySelector<HTMLButtonElement>("#global-toggle-usage");
  if (btn) btn.textContent = allExpanded ? "COLLAPSE ALL USAGE" : "EXPAND ALL USAGE";
});

// Hero explore button
root.querySelector("#hero-explore")?.addEventListener("click", () => {
  document.querySelector("#components")?.scrollIntoView({ behavior: "smooth" });
});

// Header menu toggle
root.querySelector(".header-menu")?.addEventListener("click", () => {
  root.querySelector(".docs-sidebar")?.classList.toggle("is-open");
});

// Framework tabs in section 03
root.querySelectorAll<HTMLButtonElement>("[data-framework]").forEach((button) =>
  button.addEventListener("click", () => {
    root
      .querySelectorAll("[data-framework]")
      .forEach((item) => item.setAttribute("aria-selected", item === button ? "true" : "false"));
    updateFrameworkCode(button.dataset.framework ?? "web");
  }),
);
updateFrameworkCode("react");

// Install snippet copy
root.querySelector(".copy-install")?.addEventListener("click", async (event) => {
  const button = event.currentTarget as HTMLButtonElement;
  await navigator.clipboard?.writeText("bun add @chaos_team/blbui-react @chaos_team/blbui-core");
  button.textContent = "COPIED";
  window.setTimeout(() => {
    button.textContent = "COPY";
  }, 1200);
});

// Intersection observer for sidebar navigation
const observer = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible?.target.id) setActiveNav(visible.target.id as SectionId);
  },
  { rootMargin: "-15% 0px -70% 0px", threshold: [0, 0.2, 0.8] },
);
root.querySelectorAll<HTMLElement>(".docs-content > section").forEach((section) => observer.observe(section));

// Initialize rich data for custom elements
initComponentDemo(root);

export function mountDocsApp(container: HTMLElement): void {
  container.replaceChildren(root);
}
