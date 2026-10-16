# Architecture Decisions

## The runtime owns the state and the clock

So that the end-to-end tests can read the state and compare it with a playthrough, and time advances in fixed 20 ms
ticks that a test can count.

```arc42
:::decision
id: dec-runtime-owns-state
title: The runtime owns the state and a fixed 20 ms tick
status: accepted
date: 2026-10-16
addresses: qg-replayable
:::
```

## Keys are the core's input

Playthroughs are keys, so the core takes keys as the browser names them; components turn pointer input into keys.

```arc42
:::decision
id: dec-keys-as-input
title: Keys are the core's input
status: accepted
date: 2026-10-16
addresses: qg-replayable, qg-accessible-or-declared
:::
```

## The tutor is the learner's own assistant

The app bundles no model and calls no service. The bridge builds a prompt on the client and hands it over after a
click, as the explainer does; an assistant in the browser itself is an alternative still open.

```arc42
:::decision
id: dec-tutor-handoff
title: The tutor is the learner's own assistant
status: proposed
date: 2026-10-16
addresses: qg-privacy, con-frontend-only
:::
```
