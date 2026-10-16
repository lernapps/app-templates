# Cross-cutting Concepts

The interactive archetype's concepts, besides the generic ones.

## Core and shell

The core is the app's logic in pure TypeScript without DOM, its state plain JSON, exported as `start(seed, route)`,
`step(state, input)` and optionally `tick(state, dt)`. The input is typed and extensible: a key, a pointer or touch
action, and other kinds later; the components translate any device input into such inputs (`dec-typed-input`). The
shell keeps the state, feeds it inputs and ticks and hands it to the components, which only show it, so the same core
runs in Node at build and in the browser. The runtime built today passes only keys (`risk-input-only-keys`).

```arc42
:::concept
id: concept-core-and-shell
title: Core and shell
category: structure
:::
```

## Playthroughs

A playthrough is data: a seed, a route and steps of inputs, each with the state (a part of it) or the announcement
expected after them. The build plays it against the core, the end-to-end tests give the same inputs in the browser,
so behaviour is specified once and checked in both places. Today a step's inputs are keys. A time step that lets n
ticks pass, in the build and in the browser, is decided but not built yet, nor are the core's property tests over
fixed seeds.

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
