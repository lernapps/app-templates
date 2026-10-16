# Architecture Decisions

<!--
Arc42 chapter 9. Document the significant architecture decisions as Architecture Decision
Records (ADRs). Capture any choice that was expensive, risky, or that future maintainers
will wonder about.

Avoid redundancy with section 4 (solution strategy) — refer to it for the highest-level
choices and use this chapter for detail and rationale.

For each decision, write a ## section with a prose paragraph explaining the context,
the alternatives considered, and the rationale for the chosen option, followed by a DSL block.
Document rejected alternatives so future readers understand what was considered.

Status values:
  proposed   — under discussion, not yet in force
  accepted   — in force
  deprecated — no longer recommended but not yet replaced
  superseded — replaced by another decision

When a new decision replaces an old one, set status: superseded on the old decision
and add supersedes: <old-id> on the new decision.

The `date` field should be ISO 8601 (YYYY-MM-DD).
The `addresses` field links to quality goals and constraints this decision responds to.

See https://docs.arc42.org/section-9/ for further guidance.

Example:

## Stateless Token Authentication

The team evaluated session-based (server-side store) and token-based (stateless) authentication.
Stateless tokens were chosen to avoid a shared session store that would introduce a single point
of failure and complicate horizontal scaling.

```arc42
:::decision
id: dec-auth-stateless
title: Stateless Token Authentication
status: accepted
date: 2025-07-01
addresses: qg-security, qg-performance
:::
```

To supersede a decision, mark the old one and point to it from the new one:

```arc42
:::decision
id: dec-auth-old
title: Session-based Authentication
status: superseded
date: 2024-01-15
:::
```

```arc42
:::decision
id: dec-auth-new
title: OAuth2 Token Authentication
status: accepted
date: 2025-09-01
supersedes: dec-auth-old
:::
```
-->

The decisions every interactive app shares. Owner decisions are accepted with their date; decisions the runtime made
when it was built (commit c5e7285, 2026-10-16) are accepted because they are in force; open ones are proposed. An app
adds its own decisions below these (for example canvas or DOM).

## Vue Is Fixed

The archetype could have left the framework free. Fixing Vue with TypeScript lets one set of component rules, their
build checks on the SFC compiler's output, the lint rules and `vue-tsc` hold for every app, with no rules per
framework; decomposition, data format, game logic and rendering stay free. Rejected: a free choice of framework.

```arc42
:::decision
id: dec-vue-fixed
title: Vue with TypeScript is fixed, everything else is free
status: accepted
date: 2026-10-16
addresses: con-vue-typescript, con-component-rules, qg-checkable
:::
```

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
determinism and behaviour are checked without test code per app. Rejected: free test code as the only behaviour
check.

```arc42
:::decision
id: dec-playthroughs-as-data
title: Playthroughs as data, played in the build and in the browser
status: accepted
date: 2026-10-16
addresses: qg-checkable
:::
```

## Small Storage Now, Large Storage on Need

All apps share the origin's 5 MiB of `localStorage`. The only storage is the tooling's `localStorage` wrapper under the
app's prefix with a quota of 100 kB per app, and `save` refuses beyond it. An IndexedDB wrapper is built only when an
app needs more and is then added to the architecture (YAGNI). The quota is decided, not built.

```arc42
:::decision
id: dec-small-storage
title: localStorage with a 100 kB quota, IndexedDB only on need
status: accepted
date: 2026-10-16
addresses: con-state-on-device, con-storage-quota, qg-privacy, qg-small, risk-shared-origin-storage
:::
```

## Accessibility by Default, Limits Declared

WCAG 2.1 AA and 360 px are platform rules; an app follows them by default and may deviate where its idea needs it (a
shooting game against the clock), saying in its entry what it does not offer; then `accessible` and `usable-at-360px`
become warnings for it. The start page meets both in any case. Low stimulation is advice in the skill, not a check.
Rejected: the rules as errors for every app, which would exclude real-time games.

```arc42
:::decision
id: dec-accessibility-default
title: Accessibility as default with declared limits
status: accepted
date: 2026-10-16
addresses: con-accessibility-default, qg-accessibility
:::
```

## No Settings Now

A settings dialog (time limit off, less motion, sound, pause) is not in scope now; an app that needs one later adds it
to the frame (`bb-settings`) rather than on its own.

```arc42
:::decision
id: dec-no-settings
title: No settings dialog for now
status: accepted
date: 2026-10-16
:::
```

## arc42 in the App, Checked Only by arc42

An interactive app is free code, so its architecture lives in `docs/arc42/`, English and minimal; the frame comes from
the tooling and the app adds its own blocks and decisions. Checked is only what arc42 checks itself (`arc42 diff
--staged --strict` before a commit, `arc42 validate` in `lernapps check`); whether the code keeps to the
responsibilities is not checked. Rejected: framework-specific conformance checks. Both checks are not wired yet.

```arc42
:::decision
id: dec-arc42-in-app
title: arc42 in the app, checked only by what arc42 checks
status: accepted
date: 2026-10-16
addresses: con-architecture-current, qg-understandable
:::
```

## Tutor Variant

The optional client-side AI tutor is either a handoff to the learner's own assistant, as the explainer has (prompt,
provider choice, clipboard fallback, `tutor.md`, `llms.txt`), or a model running in the browser. The sketch lets the
exercise contract bring "the tutor", which suggests the handoff, but the owner keeps the choice open.

OPEN: Is the "client-side AI tutor" a handoff to the learner's own assistant (as in the explainer) or a model running
in the browser?

```arc42
:::decision
id: dec-tutor-variant
title: Tutor as handoff or as a model in the browser
status: proposed
addresses: risk-tutor-not-built, con-no-request-before-click, qg-privacy
:::
```
