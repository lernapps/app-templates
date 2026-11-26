# Cross-cutting Concepts

The interactive archetype's concepts, besides the generic ones.

## Core and shell

The core is the app's logic in pure TypeScript without DOM, and its state is plain JSON.
It starts a round, takes one input at a time and, if it moves on its own, lets time pass (see the core contract).
Inputs are typed and extensible; the components turn any device input into them (`dec-typed-input`).
The shell keeps the state and hands it to the components, which only show it.
So the same core runs in Node at build and in the browser.

```arc42
:::concept
id: concept-core-and-shell
title: Core and shell
category: structure
:::
```

## Playthroughs

A playthrough is data: a seed, a route, the parameters of the address if any, and steps of inputs.
Each step names the state, or a part of it, or the announcement it expects.
The build plays it against the core, and the end-to-end tests play the same inputs in the browser.
So behaviour is specified once and checked in both places.
A step can let time pass in ticks. No other time passes, so a real-time core is checked deterministically.
Property tests of the core over fixed seeds are not built yet.

```arc42
:::concept
id: concept-playthroughs
title: Playthroughs as data
category: testing
:::
```

## Hash routes

Modes and levels are routes declared in `src/app.yaml`. Each has an address `app/#<id>`.
The start page and the app page link to them. The core starts with the route of the address, else the first route.
So a catalog entry's topics can point to a route, and `entry-links-resolve` can check it.

```arc42
:::concept
id: concept-hash-routes
title: Hash routes
category: navigation
:::
```

<!-- app: begin -->
<!-- app: end -->
