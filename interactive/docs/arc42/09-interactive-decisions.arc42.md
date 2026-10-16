# Architecture Decisions

The interactive archetype's decisions, besides the generic ones; decisions the runtime made when it was built
(commit c5e7285, 2026-10-16) are accepted because they are in force. An app adds its own below these (for example
canvas or DOM).

## One Archetype for All Kinds

Typing game, Kniffel trainer and proofreading app run differently (frame loop, turns, tasks) but share frame and
rules. One archetype carries them all and the kinds become recipes in its skill. Rejected: one archetype per kind. An
app that needs explanation pages is an explainer with a component instead.

```arc42
:::decision
id: dec-one-archetype
title: One interactive archetype, the kinds as recipes
status: accepted
date: 2026-10-16
addresses: con-runtime-unchanged, qg-understandable
:::
```

## The Runtime Owns the State and the Clock

The core is pure TypeScript without DOM; the shell holds its state, starts it, steps it and calls `tick(state, 20)`
every 20 ms when the core has `tick`, and the components only show the state. So the core plays the same in Node and
in the browser, and a real-time app needs no loop of its own in the core. Rejected: state kept in components, a
variable frame time. The fixed tick is the runtime's choice; the sketch names only `tick(state, dt)`.

```arc42
:::decision
id: dec-runtime-owns-state
title: The runtime holds the core's state and ticks it every 20 ms
status: accepted
date: 2026-10-16
addresses: qg-checkable, con-runtime-unchanged
:::
```

## Keys Are the Core's Input

The sketch names `step(state, input)`; the runtime made the input a key as the browser names it (`KeyboardEvent.key`).
Pointer input reaches the core as a key the root component emits as `input`, and a key the core ignores keeps its
default (Tab moves the focus). One input type makes a playthrough a list of keys, playable by the build and by the
browser's keyboard alike.

```arc42
:::decision
id: dec-keys-as-input
title: Keys as the core's only input
status: accepted
date: 2026-10-16
addresses: qg-checkable, qg-accessibility
:::
```

## start(seed, route)

The sketch names `start(seed)`; the runtime also passes the route of the address, so that each mode or level has an
address an entry's topics can point to and the core starts there. The seed comes from `?seed=<n>`, else at random, so
a round can be replayed and tested at its address.

```arc42
:::decision
id: dec-start-seed-route
title: The core starts from a seed and a route of the address
status: accepted
date: 2026-10-16
addresses: qg-checkable
:::
```

## Playthroughs as Data

A playthrough is a seed, a route and steps of keys with the state or announcement expected after them, written as
YAML under `src/playthroughs/`. The build plays each against the core twice and the browser plays the same keys, so
determinism and behaviour are checked without test code per app. A step that lets n ticks pass, in the build and in
the browser, is accepted (owner) but not built yet. Rejected: free test code as the only behaviour check.

```arc42
:::decision
id: dec-playthroughs-as-data
title: Playthroughs as data, played in the build and in the browser
status: accepted
date: 2026-10-16
addresses: qg-checkable, risk-time-not-replayed
:::
```
