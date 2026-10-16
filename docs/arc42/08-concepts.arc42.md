# Cross-cutting Concepts

The concepts every lernapps app implements, whatever its archetype. The extensions add their archetype's concepts
(the explainer's tutor; the interactive app's core and shell, playthroughs, hash routes).

## Generic architecture and extensions

The archetypes stay separate but share their quality goals, so they share this architecture: the generic part defines
the shared runtime and the tooling helpers and what every app keeps, and each archetype's extension in its template
folder adds its runtime and the parts its creator writes, under ids the generic part names (`bb-archetype-runtime`,
`bb-build`, `bb-render`, `bb-shell`, `bb-e2e`, `if-archetype-content`, …), with its interfaces, decisions, risks and
terms. An app's architecture is the generic part followed by its archetype's extension, chapter by chapter; an
interactive app adds its own blocks below its extension's parts in the same way. The building blocks reach two levels,
roots and their parts, so that every interface can be drawn in a view.

```arc42
:::concept
id: concept-archetype-extension
title: Generic architecture plus one extension per archetype
category: structure
:::
```

## Determinism by the seed in the address

Whatever an app draws at random comes from a seed in the address, so the same address gives the same order, task or
round, and a learner, a teacher, a tutor and the tests can open it again: the quiz's order of questions, the
explainer's tasks by their numbers, an interactive core's states. Each extension says how its archetype uses the seed.

```arc42
:::concept
id: concept-determinism
title: Determinism by the seed in the address
category: testing
:::
```

## Readable without JavaScript

Every app has static pages that describe it without JavaScript: links, the language switch and the footer are plain
links, and what needs JavaScript says so in a `<noscript>` note. How much of an app reads without JavaScript depends on
its archetype: for the quiz and the explainer it is a quality goal of their extensions; an interactive app's start
page reads without JavaScript, its app page does not.

```arc42
:::concept
id: concept-readable-without-js
title: Readable without JavaScript
category: accessibility
:::
```

## Languages

Every page exists once per declared language, German at the root and others below `/<language>/`, and an app may
declare only languages its runtime has texts for. Learner texts are language maps in the creator's data or message
files by language, reached through the translator, never strings in code.

```arc42
:::concept
id: concept-languages
title: Languages
category: i18n
:::
```

## Accessibility by default

Pages meet WCAG 2.1 AA and work at 360 px by default; an app that cannot declares its limits in its entry, and only
then would its findings become warnings (not built yet: they are errors for every app today). Feedback goes through
the polite live region and the focus moves with the a11y helpers, and `lernapps check` runs axe and the width check on
the built pages.

```arc42
:::concept
id: concept-accessibility
title: Accessibility by default, deviations declared
category: accessibility
:::
```

## Component rules

An app's own Vue components (the explainer's components, the interactive UI) and the modules they import are checked
on the SFC compiler's output at build and by lint rules: no network, no `eval`, `new Function`, `innerHTML` or
`v-html`, imports only from Vue, the runtime, the storage, i18n and a11y helpers and the app's own files, browser
globals only once mounted.

```arc42
:::concept
id: concept-component-rules
title: Component rules
category: security
:::
```

## Device storage

What an app remembers goes through the storage wrapper into `localStorage`, under the prefix `lernapps:<app>:`,
because all apps share one origin; every access is wrapped, so blocked or full storage means the app remembers
nothing and keeps working. The quota of 100 kB per app is decided, not built.

```arc42
:::concept
id: concept-device-storage
title: Device storage
category: persistence
:::
```
