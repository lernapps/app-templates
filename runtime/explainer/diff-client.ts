// The diff mode in the page (diff.ts has what differs, diff-render.ts the markup the build writes). Every page of a
// version built against a base (EXPLAINER_BASE) is complete without JavaScript: the marks, the earlier versions folded
// in their blocks, the list of the page's changes with a link to each. With JavaScript this module adds: the buttons that
// step from change to change, the filters (hide the unchanged blocks, open every earlier version), the menu of a narrow
// screen (the list of the app's pages as a sheet under the bar), the earlier versions open on a wide screen and folded
// on a narrow one (until the reader folds one themselves), and "Ohne Markierung ansehen". It stores nothing.
const OFF = "explainer-diff-off";
const ONLY = "explainer-diff-only";
const MENU = "explainer-diff-menu-open";
const CURRENT = "explainer-diff-current";
const WIDE = "(min-width: 48rem)";

/** The marked blocks of the page, in the order of the page. */
const marked = (root: Document): HTMLElement[] =>
  [...root.querySelectorAll<HTMLElement>("main [data-diff][id^='aenderung-']")].filter(
    (element) => !element.parentElement?.closest("[data-diff][id^='aenderung-']"),
  );

export function startDiff(root: Document): void {
  if (root.querySelector(".explainer-diff-banner") === null) return;
  const html = root.documentElement;
  for (const hidden of root.querySelectorAll<HTMLElement>(
    ".explainer-diff-step, .explainer-diff-filters, .explainer-diff-toggle",
  )) {
    hidden.hidden = false;
  }
  html.classList.add("explainer-diff-js");

  // the earlier versions: open beside the block on a wide screen, folded on a narrow one, unless the reader chose
  const olds = [...root.querySelectorAll<HTMLDetailsElement>(".explainer-diff-old")].filter((details) =>
    details.closest("main > *, .explainer-block"),
  );
  const touched = new WeakSet<HTMLDetailsElement>();
  let setting = false;
  const openAll = root.querySelector<HTMLInputElement>(".explainer-diff-open-all");
  const fit = (): void => {
    setting = true;
    const wide = root.defaultView?.matchMedia(WIDE).matches ?? true;
    for (const details of olds)
      if (!touched.has(details) || openAll?.checked) details.open = wide || openAll?.checked === true;
    setting = false;
  };
  for (const details of olds) {
    details.addEventListener("toggle", () => {
      if (!setting) touched.add(details);
    });
  }
  root.defaultView?.matchMedia(WIDE).addEventListener("change", fit);
  fit();
  openAll?.addEventListener("change", fit);

  // stepping from change to change
  let index = -1;
  const go = (to: number): void => {
    const marks = marked(root);
    if (marks.length === 0) return;
    index = (to + marks.length) % marks.length;
    for (const [i, element] of marks.entries()) element.classList.toggle(CURRENT, i === index);
    const target = marks[index];
    if (target === undefined) return;
    for (const link of root.querySelectorAll<HTMLAnchorElement>(".explainer-diff-list a")) {
      if (link.getAttribute("href") === `#${target.id}`) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    }
    const calm = root.defaultView?.matchMedia("(prefers-reduced-motion: reduce)").matches ?? false;
    target.scrollIntoView({ block: "center", behavior: calm ? "auto" : "smooth" });
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  };
  root.querySelector(".explainer-diff-next")?.addEventListener("click", () => go(index + 1));
  root.querySelector(".explainer-diff-prev")?.addEventListener("click", () => go(index < 0 ? -1 : index - 1));
  root.querySelector(".explainer-diff-list")?.addEventListener("click", (event) => {
    const link = (event.target as Element).closest<HTMLAnchorElement>("a");
    const id = link?.getAttribute("href")?.slice(1);
    const at = marked(root).findIndex((element) => element.id === id);
    if (at >= 0) {
      event.preventDefault();
      go(at);
    }
  });

  // the filters
  root.querySelector<HTMLInputElement>(".explainer-diff-only")?.addEventListener("change", (event) => {
    html.classList.toggle(ONLY, (event.target as HTMLInputElement).checked);
  });

  // the menu of a narrow screen: the app's pages, a sheet under the bar
  const menu = root.querySelector<HTMLButtonElement>(".explainer-diff-menu");
  const close = (): void => {
    html.classList.remove(MENU);
    menu?.setAttribute("aria-expanded", "false");
  };
  const bar = root.querySelector<HTMLElement>(".explainer-diff-bar");
  menu?.addEventListener("click", () => {
    const open = html.classList.toggle(MENU);
    if (bar !== null) html.style.setProperty("--diff-bar-height", `${Math.ceil(bar.getBoundingClientRect().bottom)}px`);
    menu.setAttribute("aria-expanded", String(open));
  });
  root.querySelector(".explainer-diff-nav")?.addEventListener("click", (event) => {
    if ((event.target as Element).closest("a")) close();
  });
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && html.classList.contains(MENU)) {
      close();
      menu?.focus();
    }
  });

  // the marks off, and on again
  const toggle = root.querySelector<HTMLButtonElement>(".explainer-diff-toggle");
  toggle?.addEventListener("click", () => {
    const off = html.classList.toggle(OFF);
    toggle.textContent = (off ? toggle.dataset["on"] : toggle.dataset["off"]) ?? "";
  });
}
