# Glossary

The interactive archetype's terms, besides the generic ones.

## Core

The app's logic in `src/core/index.ts`. Called "core" rather than "engine" or "model" because it holds no state of its
own: the shell keeps it.

```arc42
:::glossary-term
id: term-core
title: Core
definition: The app's logic, pure TypeScript without DOM, exporting start(seed, route), step(state, key) and optionally tick(state, dt); deterministic by its seed, its state plain JSON.
:::
```

## App Page

The one page on which the app runs; without JavaScript it shows only a note and a link back to the start page.

```arc42
:::glossary-term
id: term-app-page
title: App page
definition: The page that loads the app's client module, into whose element the shell mounts the app.
:::
```

## Route

A mode or level of the app, declared in `src/app.yaml`. The core receives the route's id in `start`.

```arc42
:::glossary-term
id: term-route
title: Route
definition: A mode or level of the app with its own address on the app page (app/#<id>); the first route when the address names none.
:::
```

## Tick

The runtime's constant `TICK` is 20; the build never ticks, the browser ticks in real time.

```arc42
:::glossary-term
id: term-tick
title: Tick
definition: A call of tick(state, 20) that the shell makes every 20 ms when the core has tick, so the state moves with time.
:::
```

## Playthrough

A YAML file in `src/playthroughs/`. Not a free-form test: it holds only data the runtime plays.

```arc42
:::glossary-term
id: term-playthrough
title: Playthrough
definition: A seed, a route and a list of steps, each a list of keys followed by the state (a part of it) or the announcement expected after them; played by the build against the core and by the browser test.
:::
```
