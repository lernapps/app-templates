# Architecture Decisions

The interactive archetype's decisions, besides the generic ones. The decisions the runtime made when it was built
are accepted because they are in force. An app adds its own below these, for example canvas or DOM.

## One Archetype for All Kinds

Typing game, Kniffel trainer and proofreading app run differently: frame loop, turns, tasks.
But they share the frame and the rules. So one archetype carries them all, and its skill gives the shared principles.
Rejected: one archetype per kind, because each would repeat the same frame.
An app that needs explanation pages is an explainer with a component instead.

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

The core should play the same in Node and in the browser.
So the core is pure TypeScript without DOM. The shell holds its state, starts it, passes it inputs and lets time pass
in fixed ticks. The components only show the state. A real-time app needs no loop of its own.
Rejected: state kept in components, because the build could not play it; a variable frame time, because it is not
deterministic.

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

Superseded by `dec-typed-input`. The first runtime took only keys as the core's input.
Pointer input reached the core disguised as a key.

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

Interactive apps will use more than keys and mouse: touch, gestures and more later.
So the core takes a typed input, such as a key or a pointer or touch action, and new kinds can be added.
Playthroughs record such inputs, and the components turn any device input into them.
So the build and the browser play the same steps. A core ignores a kind it does not know.
Rejected: keys as the only input, because pointer and touch would have to pose as keys.

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

Each mode or level needs an address that a catalog entry can point to.
So the core starts from a seed and the route of the address. The seed comes from the address, else at random.
So a round can be replayed and tested at its address.

```arc42
:::decision
id: dec-start-seed-route
title: The core starts from a seed and a route of the address
status: accepted
date: 2026-10-16
addresses: qg-checkable
:::
```

## Parameters of the Address as Data for the Core

Another app links to an interactive app with data the app starts from, such as a challenge for the coding workshop
(lernapps/coding).
So the core gets every parameter of the address except the seed as data when it starts, and again on a new route.
The runtime only passes them through. It does not check, log or store them. The core checks them and ignores what does
not fit. They are data, not routes: the routes stay in the hash.
A playthrough can name them, so they are tested like any start.
A core that needs no parameters stays as it is.

The language switch keeps the parameters, the seed and the route, so the other language opens the same round
(lernapps/app-templates#210). The links in the page without JavaScript stay plain.

Rejected: the root component reads the address and sends an action, because the core would start without the data and
lose it on every new route. Rejected: a fixed list of parameter names in the runtime, because each app has its own.
A back channel between apps is not part of this.

```arc42
:::decision
id: dec-address-params
title: The core gets the parameters of the address as data
status: accepted
date: 2026-11-26
addresses: qg-checkable
:::
```

## Playthroughs as Data

Every app needs its behaviour and its determinism checked, without writing test code.
So a playthrough is data: a seed, a route and steps of inputs with the state or announcement expected after them.
The build plays each against the core twice, and the browser plays the same inputs.
A step can let ticks pass. In the browser the tests' own clock counts them, because the browser's fake clock would also
stop the announcements. Property tests of the core are not built; until then the double play checks determinism.
Rejected: free test code as the only behaviour check, because each app would write and maintain its own.

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

An interactive app may use libraries. Its code may import the packages in its dependencies, and the build bundles
them. `lernapps check` checks their licences. Imports from a URL, network APIs and unsafe HTML stay forbidden.
The explainer's components keep their narrower scope.
Rejected: only Vue, the runtime and the tooling helpers, because every app would then rewrite what a library does well.

```arc42
:::decision
id: dec-libraries
title: An interactive app may import the libraries in its dependencies
status: accepted
date: 2026-10-16
addresses: qg-privacy
:::
```

<!-- app: begin -->
<!-- app: end -->
