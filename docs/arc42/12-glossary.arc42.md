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

Terms with a meaning specific to lernapps apps of every archetype. Learner-facing text is German; these terms are the
English names used in code, schemas and this architecture. Each extension adds its archetype's terms.

## Archetype

One of the kinds of app the generator can make, each a template folder of `lernapps/app-templates` with its runtime:
`quiz`, `explainer`, `interactive`.

```arc42
:::glossary-term
id: term-archetype
title: Archetype
definition: A kind of lernapps app (quiz, explainer, interactive) with its template and its runtime, which fixes what the creator writes.
:::
```

## Extension

Lives in the template folder's `docs/arc42/`; it references the generic ids and defines none of them again.

```arc42
:::glossary-term
id: term-extension
title: Extension
definition: The part of the architecture one archetype adds to the generic architecture, its blocks placed below the generic ones.
:::
```

## Runtime

The runtime of `@lernapps/app-templates`; together with the tooling helpers it forms the frame an app does not change.

```arc42
:::glossary-term
id: term-runtime
title: Runtime
definition: The shared code of every app of an archetype that builds its pages, checks it at build time and runs it in the browser; the app never edits it.
:::
```

## Shell

Started by the archetype's start function in `src/main.ts`: `startQuiz`, `startExplainer` or `startInteractive`.

```arc42
:::glossary-term
id: term-shell
title: Shell
definition: The runtime's code in the browser that turns the static pages into the live app.
:::
```

## Creator

The person who makes and lists an app on lernapps.net, usually working through an AI assistant.

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
definition: The page at the app's address, rendered at build from what the creator wrote, from which every other page of the app is reached.
:::
```

## Seed

Taken from the address where the archetype uses one, else drawn at random.

```arc42
:::glossary-term
id: term-seed
title: Seed
definition: A positive integer from which the app draws everything random, so that the same address gives the same order, task or states.
:::
```

## Entry

The only way an app connects to the platform: its entry links to it. Its topics may point to the app's deep links, an
app that deviates from the accessibility default says so there, and its fact sheet states the app's size (not built
yet).

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

Optional; built for the explainer only; no model runs in the browser (see `dec-tutor-variant`).

```arc42
:::glossary-term
id: term-tutor
title: Tutor
definition: The learner's own AI assistant, to which the app hands the current task after a click, through a prompt and static tutor files.
:::
```
