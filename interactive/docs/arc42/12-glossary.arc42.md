# Glossary

<!--
Arc42 chapter 12. Define the domain and technical terms used in the architecture documentation.
A shared glossary reduces misunderstanding by ensuring all stakeholders use the same language.
If you work in multi-language teams, it also serves as a translation reference.

For each term, write a ## section with a prose paragraph providing context, etymology, or
extended explanation where useful, followed by a DSL block with a concise definition.

Keep the `definition` field to one or two sentences that unambiguously identify the concept.
Extended explanation belongs in the prose above the block.

If a short form is important, include it in the prose; the typed glossary block has no
`abbreviation` field.

Note synonyms the team has agreed NOT to use, and why, in the prose paragraph.

See https://docs.arc42.org/section-12/ for further guidance.

Example:

## Bounded Context

A bounded context is a logical boundary within which a domain model is consistent and
unambiguous. Inside a bounded context, terms have precise, agreed meanings. The same word
may mean something different in another bounded context.

```arc42
:::glossary-term
id: term-bounded-context
title: Bounded Context
definition: A logical boundary within which a domain model, its language, and its rules are internally consistent. Defined in Domain-Driven Design (Evans, 2003).
:::
```
-->

Terms with a meaning specific to interactive lernapps apps. Learner-facing text is German; these terms are the
English names used in code, schemas and this architecture.

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

## Shell

The part of the runtime that runs on the app page, started by `startInteractive(core, root)` in `src/main.ts`.

```arc42
:::glossary-term
id: term-shell
title: Shell
definition: The runtime's code on the app page that mounts the root component, holds the core's state and feeds it keys, ticks, the route and the seed.
:::
```

## Runtime

The runtime `interactive/` of `@lernapps/app-templates`; together with the tooling helpers it forms the frame an app
does not change.

```arc42
:::glossary-term
id: term-runtime
title: Runtime
definition: The shared code of every interactive app that builds its pages, checks it at build time and runs it in the browser; the app never edits it.
:::
```

## Creator

The person who makes and lists an app on lernapps.net, usually working through an AI assistant that writes core, UI,
data and playthroughs.

```arc42
:::glossary-term
id: term-creator
title: Creator
definition: The person who builds an app and lists it in the app overview.
:::
```

## Start Page

`index.html` of each language. Not to be confused with the home page of lernapps.net.

```arc42
:::glossary-term
id: term-start-page
title: Start page
definition: The static page the build renders from src/app.yaml (what the app does, how to play, competencies, routes, background sections), readable without JavaScript and loading no script.
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

## Seed

Taken from `?seed=<n>` in the address, else drawn at random; a playthrough names its own.

```arc42
:::glossary-term
id: term-seed
title: Seed
definition: A positive integer from which the core draws everything random, so that the same seed, route and keys always give the same states.
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

## Entry

The only way an app connects to the platform: its entry links to it. Its topics may point to the app's routes, and an
app that deviates from the accessibility default says so there.

```arc42
:::glossary-term
id: term-entry
title: Entry
definition: The one YAML file per app in lernapps/apps entries/, checked against the entry schema, that lists the app in the app overview.
:::
```

## Catalog

Shown at lernapps.net/apps/; the owner decides whether an app is listed.

```arc42
:::glossary-term
id: term-catalog
title: Catalog
definition: The apps the app overview of lernapps.net provides, one entry per app.
:::
```

## Tutor

Optional and not built for interactive apps; whether it is a handoff to the learner's own assistant or a model in the
browser is open (see `dec-tutor-variant`).

```arc42
:::glossary-term
id: term-tutor
title: Tutor
definition: An optional client-side AI helper for the learner's current task in the app.
:::
```
