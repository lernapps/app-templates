# Cross-cutting Concepts

The concepts every interactive app implements. The first ten are the ones the runtime and tooling blocks implement;
the last is advice the archetype's skill gives.

## Core and shell

The core is the app's logic in pure TypeScript without DOM, its state plain JSON, exported as `start(seed, route)`,
`step(state, key)` and optionally `tick(state, dt)`. The shell keeps the state, feeds it keys and ticks and hands it to
the components, which only show it, so the same core runs in Node at build and in the browser.

```arc42
:::concept
id: concept-core-and-shell
title: Core and shell
category: structure
:::
```

## Determinism by the seed

The core is deterministic by its seed: the same seed, route and keys give the same states. The seed comes from
`?seed=<n>` (else a random one), so a round can be replayed at its address, and the build plays every playthrough
twice to catch a core that is not deterministic.

```arc42
:::concept
id: concept-determinism
title: Determinism by the seed
category: testing
:::
```

## Playthroughs

A playthrough is data: a seed, a route and steps of keys, each with the state (a part of it) or the announcement
expected after them. The build plays it against the core, the end-to-end tests play the same keys in the browser, so
behaviour is specified once and checked in both places. A time step that lets n ticks pass, in the build and in the
browser, is decided but not built yet, nor are the core's property tests over fixed seeds.

```arc42
:::concept
id: concept-playthroughs
title: Playthroughs as data
category: testing
:::
```

## Readable without JavaScript

The start page is static HTML with no script, and the app page says with a `<noscript>` note and a link back that the
app needs JavaScript; links, routes and the language switch are plain links. The end-to-end tests check both pages
without JavaScript in every language.

```arc42
:::concept
id: concept-readable-without-js
title: Readable without JavaScript
category: accessibility
:::
```

## Languages

Every page exists once per declared language, German at the root and others below `/<language>/`, and an app may
declare only languages the runtime has texts for. Learner texts live in `src/messages` by language and reach the UI
through the translator, never as strings in code.

```arc42
:::concept
id: concept-languages
title: Languages
category: i18n
:::
```

## Accessibility by default

Pages meet WCAG 2.1 AA and work at 360 px by default; an app that cannot declares its limits in its entry, and only
then would its findings become warnings (not built yet: they are errors for every app today). The UI announces changes
through the polite live region and moves focus with the a11y helpers, keys on the page's own controls stay theirs, and
`lernapps check` runs axe and the width check on the built pages.

```arc42
:::concept
id: concept-accessibility
title: Accessibility by default, deviations declared
category: accessibility
:::
```

## Component rules

The app's components and the modules they import are checked on the SFC compiler's output at build and by lint
rules: no network, no `eval`, `new Function`, `innerHTML` or `v-html`, imports only from Vue, the runtime, the
storage, i18n and a11y helpers and `src/`, browser globals only once mounted. Fixing Vue makes these rules hold for
every app.

```arc42
:::concept
id: concept-component-rules
title: Component rules
category: security
:::
```

## Device storage

What an app remembers goes through the storage wrapper into `localStorage`, under the prefix `lernapps:<app>:`,
because all apps share one origin; every access is wrapped, so blocked or full storage means the app remembers
nothing and keeps working. The quota of 100 kB per app is decided, not built.

```arc42
:::concept
id: concept-device-storage
title: Device storage
category: persistence
:::
```

## Hash routes

Modes and levels are routes declared in `src/app.yaml`, reached as `app/#<id>` from anchor links on the start page and
the app page. The shell starts the core with the route of the address (else the first) and again on every new route,
so an entry's topics can point to a route and `entry-links-resolve` can check it.

```arc42
:::concept
id: concept-hash-routes
title: Hash routes
category: navigation
:::
```

## Tutor

Optional and not built for interactive apps yet: no model runs in the browser; the tutor is a handoff of the current
task to the learner's own assistant, after a click, through a prompt and static tutor files, as in the explainer.

```arc42
:::concept
id: concept-tutor
title: Tutor as a handoff to the learner's own assistant
category: learning
:::
```

## Low stimulation (advice)

Advice, not a rule or check: the skill `lernapps-interactive` recommends no flashing, calm motion and sound off by
default, and says why; the creator's assistant follows it. The skill is not written yet, and a settings dialog (less
motion, sound, pause) is not in scope now.

```arc42
:::concept
id: concept-low-stimulation
title: Low stimulation (advice)
category: accessibility
:::
```
