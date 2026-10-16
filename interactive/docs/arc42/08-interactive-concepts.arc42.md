# Cross-cutting Concepts

The interactive archetype's concepts, besides the generic ones.

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
