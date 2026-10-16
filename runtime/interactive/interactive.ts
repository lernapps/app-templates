// The client module of an interactive app (@lernapps/app-templates/interactive), started by the app's src/main.ts:
//
//   import "@lernapps/app-templates/interactive/style.css";
//   import { startInteractive } from "@lernapps/app-templates/interactive";
//   import * as core from "./core/index.ts";
//   import App from "./ui/App.vue";
//   startInteractive(core, App);
//
// On the app page it keeps the core's state (contract.ts): it starts it with the seed of the address (?seed=<n>, else
// a random one) and the route of the address (#<id>, else the first route), gives every key typed on the page to
// step as a key input (not a key typed on a link, button or form field, which is theirs, nor one with Ctrl, Alt or
// Meta), and calls tick every TICK ms when the core has it (the end-to-end tests step the ticks themselves:
// CLOCK_PROPERTY). A key that changes the state loses its default (the space bar does not scroll). A new route in the
// address starts the core again with it. It mounts the app's root component into the page with the props state (the
// core's state) and lang (the page's language), and steps every input the component emits as input (an action of a
// button or a tap, or a key it stands for). The start page loads no script; the build removes it there.
import { createApp, h, shallowRef, type Component } from "vue";
import { CLOCK_PROPERTY, STATE_PROPERTY, TICK, type Core, type Input } from "./contract.ts";

export {
  TICK,
  type ActionInput,
  type Core,
  type Input,
  type Json,
  type KeyInput,
  type Playthrough,
  type PlaythroughStep,
} from "./contract.ts";

/** Where a key belongs to the page's own controls, not to the app. */
const CONTROLS = "a[href], button, input, select, textarea, summary, [contenteditable]";

/** Starts the app on the app page: its state from `core`, shown by the component `root`. Nothing on another page. */
export function startInteractive<S>(core: Core<S>, root: Component): void {
  const host = document.querySelector<HTMLElement>(".interactive-app");
  if (host === null) return;
  const routes = JSON.parse(host.dataset["routes"] ?? "[]") as string[];
  const seedParam = Number(new URL(location.href).searchParams.get("seed"));
  const seed = Number.isInteger(seedParam) && seedParam > 0 ? seedParam : 1 + Math.floor(Math.random() * 2 ** 31 - 1);
  const routeOf = (): string => {
    const id = decodeURIComponent(location.hash.slice(1));
    return routes.includes(id) ? id : (routes[0] ?? "");
  };
  let route = routeOf();
  const state = shallowRef(core.start(seed, route));
  const set = (next: S): void => {
    state.value = next;
    Object.assign(host, { [STATE_PROPERTY]: next });
  };
  set(state.value);
  const markRoute = (): void => {
    for (const link of document.querySelectorAll<HTMLAnchorElement>(".interactive-routes a")) {
      if (link.hash === `#${route}`) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    }
  };
  markRoute();
  /** Gives `given` to the core; whether it changed the state. */
  const input = (given: Input): boolean => {
    const next = core.step(state.value, given);
    if (next === state.value) return false;
    set(next);
    return true;
  };
  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.altKey || event.metaKey || event.isComposing) return;
    if (event.target instanceof Element && event.target.closest(CONTROLS) !== null) return;
    if (input({ kind: "key", key: event.key })) event.preventDefault();
  });
  addEventListener("hashchange", () => {
    if (routeOf() === route) return;
    route = routeOf();
    set(core.start(seed, route));
    markRoute();
  });
  const tick = (): void => set(core.tick?.(state.value, TICK) ?? state.value);
  const clock: unknown = Reflect.get(globalThis, CLOCK_PROPERTY);
  if (typeof clock === "object" && clock !== null) {
    // the end-to-end tests' clock: no time passes but the ticks they step
    Object.assign(clock, {
      tick: (count: number) => {
        for (let at = 0; at < count; at++) tick();
      },
    });
  } else if (core.tick !== undefined) setInterval(tick, TICK);
  const lang = document.documentElement.lang || "de";
  createApp({ render: () => h(root, { state: state.value, lang, onInput: input }) }).mount(host);
  host.dataset["mounted"] = "";
}
