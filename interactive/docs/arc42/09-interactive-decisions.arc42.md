# Architecture Decisions

The interactive archetype's decisions, besides the generic ones; decisions the runtime made when it was built
(commit c5e7285, 2026-10-16) are accepted because they are in force. An app adds its own below these (for example
canvas or DOM).

## One Archetype for All Kinds

Typing game, Kniffel trainer and proofreading app run differently (frame loop, turns, tasks) but share frame and
rules. One archetype carries them all, and its skill gives the principles they share. Rejected: one archetype per kind. An
app that needs explanation pages is an explainer with a component instead.

```arc42
:::decision
id: dec-one-archetype
title: One interactive archetype for every kind of app
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

Superseded by `dec-typed-input`. The sketch named `step(state, input)`; the runtime made the input a key as the browser
names it (`KeyboardEvent.key`), pointer input reaching the core as a key the root component emits as `input`, and a
key the core ignores keeping its default (Tab moves the focus).

```arc42
:::decision
id: dec-keys-as-input
title: Keys as the core's only input
status: superseded
date: 2026-10-16
addresses: qg-checkable, qg-accessibility
:::
```

## A Typed Input for the Core

Interactive apps will use more than keys and mouse: touch, gestures and other input later. So the core's
`step(state, input)` takes a typed input (a key, a pointer or touch action, …), extensible by new kinds; playthroughs
record such inputs, and the components translate any device input into inputs, so that the build and the browser play
the same steps. Rejected: keys as the only input, with pointer and touch disguised as keys. Built: a key input and an
action input; a core returns the state unchanged for a kind it does not know.

```arc42
:::decision
id: dec-typed-input
title: The core's input is typed and extensible (key, pointer, touch, …)
status: accepted
date: 2026-10-16
supersedes: dec-keys-as-input
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

A playthrough is a seed, a route and steps of inputs with the state or announcement expected after them, written as
YAML under `src/playthroughs/`. The build plays each against the core twice and the browser plays the same inputs, so
determinism and behaviour are checked without test code per app. A step can let n ticks pass; the build calls `tick`
n times, and the browser steps the shell's tick through the tests' clock (`if-test-clock`) rather than Playwright's
fake clock, which would also freeze the announcement's timer. The core's property tests over fixed seeds are not
built; until then every playthrough played twice checks determinism. Rejected: free test code as the only behaviour
check.

```arc42
:::decision
id: dec-playthroughs-as-data
title: Playthroughs as data, played in the build and in the browser
status: accepted
date: 2026-10-16
addresses: qg-checkable, risk-no-core-property-tests
:::
```

## Libraries in the Dependencies

An interactive app may use libraries: its components and modules may import the packages listed in the dependencies
of its package.json, which the build bundles; their licences are checked by `lernapps check` (`dependency-licence`).
An import from a URL, network APIs, `eval`, `innerHTML` and `v-html` stay forbidden. The explainer's components keep
their narrower scope. Rejected: only Vue, the runtime and the tooling helpers, which would make every app write again
what a library already does well.

```arc42
:::decision
id: dec-libraries
title: An interactive app may import the libraries in its dependencies
status: accepted
date: 2026-10-16
addresses: qg-privacy
:::
```
