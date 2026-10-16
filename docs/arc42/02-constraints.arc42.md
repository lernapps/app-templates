# Architecture Constraints

<!--
Arc42 chapter 2. Document every requirement that limits your freedom of design and
implementation decisions. Constraints must always be dealt with — though some may be
negotiable. Architects need to know exactly where they have freedom and where they must adhere.

Constraints come from three sources:
- technical       — technology standards, infrastructure mandates, platform restrictions
- organizational  — legal requirements, compliance rules, budget limits, governance policies
- convention      — agreed coding standards, naming rules, documentation or versioning guidelines

For each constraint, write a ## section with a prose paragraph explaining the constraint,
its origin, and its architectural impact, followed by a DSL block.

The `source` field names the origin — a legal document, client contract, governance policy,
or internal standard. Omit it if the origin is an internal assumption.

See https://docs.arc42.org/section-2/ for further guidance.

Example:

## Personal Data Must Remain in the EU

All personally identifiable information must be stored and processed within the EU.
This limits which cloud regions, caching layers, and third-party SaaS tools are usable.
Origin: GDPR Art. 44, confirmed by legal review 2025-03-01.

```arc42
:::constraint
id: con-data-residency
title: Personal Data Must Remain in the EU
category: organizational
source: GDPR Art. 44 / Legal review 2025-03-01
:::
```
-->

## Frontend Only, Static Pages

An app is static files served from its repo's GitHub Pages at `lernapps.net/<repo>/`; it has no server of its own
and shares no code at runtime with other apps. All logic runs in the learner's browser, and the build renders every
page ahead of time.

```arc42
:::constraint
id: con-frontend-only
title: Frontend only, static pages
category: organizational
source: ORGANIZATION.md "What every site shares" and "Apps and the app overview"; decided sketch, step 12
:::
```

## No Request Before a Click, No Tracking

No page sets a cookie, tracks, or requests anything from another server before the learner clicks; the privacy
notice of lernapps.net states this for every app. So fonts, libraries and data are bundled, and anything that leaves
the device (a tutor handoff, a link) waits for a click. `lernapps check` verifies it on the built app.

```arc42
:::constraint
id: con-no-request-before-click
title: No request before a click, no tracking
category: organizational
source: ORGANIZATION.md "Every page, in every repo"; lernapps check rules no-request-before-click and no-tracking
:::
```

## TypeScript on vite-plus, Vue for Components

Every app is TypeScript built with vite-plus and the shared preset of `@lernapps/tooling`. Where an app has
components of its own (an explainer's components, an interactive app's UI), they are Vue single-file components, so
one set of component rules, lint rules and `vue-tsc` holds for every app; the quiz has none.

```arc42
:::constraint
id: con-vue-typescript
title: TypeScript on vite-plus, Vue for components
category: technical
source: Decided sketch, step 12, section 2; owner, 2026-10-16, conversation (Vue is fixed); skill lernapps-app rule strict-typescript
:::
```

## Component Rules

The app's components and the modules they import are checked on the SFC compiler's output at build: no network
APIs, no `eval`, `new Function`, `innerHTML` or `v-html`, imports only from Vue, the runtime, the tooling's storage,
i18n and a11y helpers and the app's own files, and browser globals only once mounted, because the build renders
without a browser.

```arc42
:::constraint
id: con-component-rules
title: Component rules checked at build
category: technical
source: Decided sketch, step 12, section 2; runtime/explainer/components.ts; runtime/interactive/plugin.ts
:::
```

## The Runtime Is Not Changed by the App

The frame and the archetype's runtime come from `@lernapps/app-templates`, and the app does not change them; the app
writes only what its archetype allows (the quiz its question bank, the explainer its content, the interactive app its
core, UI, data, playthroughs, messages and description). Changes to the runtime reach the app as dependency updates.

```arc42
:::constraint
id: con-runtime-unchanged
title: The app does not change the runtime
category: convention
source: Decided sketch, step 12, sections 3 and 4; skill rules quiz-only-data, explainer-only-content, keep-the-preset
:::
```

## State Only on the Device

What an app remembers stays in the learner's browser, under its own key prefix, through the tooling's storage
wrapper; there are no accounts and no server state. Storage may be blocked or full at any time, so the app must keep
working and simply remember nothing.

```arc42
:::constraint
id: con-state-on-device
title: State only on the device, through the storage wrapper
category: technical
source: Decided sketch, step 12, section 4; @lernapps/tooling archetypes/shared/storage.ts; lint rule storage-through-wrapper
:::
```

## Small Storage with a Quota

All apps share the 5 MiB of `localStorage` of the one origin lernapps.net, so each app may keep at most 100 kB and
`save` refuses beyond it. The quota is decided but not built yet: the wrapper has no limit today.

```arc42
:::constraint
id: con-storage-quota
title: Small storage with a quota of 100 kB per app
category: technical
source: Owner, 2026-10-16, conversation; decided sketch, step 12, section 3
:::
```

## Accessibility: Platform Rule, App Default

WCAG 2.1 AA and use at 360 px are rules for the platform's own pages; an app follows them by default and may
deviate where its idea needs it, for example a typing game against the clock, declaring what it does not offer in its
entry. Pages the runtime renders from the creator's data meet both in any case. Low stimulation is advice only. The
warnings for an app with declared limits are not built yet: `accessible` and `usable-at-360px` are errors for every
app today.

```arc42
:::constraint
id: con-accessibility-default
title: WCAG 2.1 AA and 360 px by default, deviations declared
category: organizational
source: ORGANIZATION.md "Every page, in every repo"; decided sketch, step 12, section 5; owner, 2026-10-16, conversation
:::
```

## German for Learners, English for Infrastructure

Text for learners, teachers and parents is German (further languages may be declared); shared infrastructure,
identifiers, schemas and developer docs are English, and so is this architecture. Inside its own repo, an app's author
decides the language of names.

```arc42
:::constraint
id: con-language
title: German for learner text, English for infrastructure
category: convention
source: ORGANIZATION.md "Language"; owner, 2026-10-16, conversation (architecture in English)
:::
```

## Bundled Libraries with Accepted Licences

A library an app uses is bundled, never loaded from a CDN, and its licence and those of its dependencies must be on
the allowlist of the `dependency-licence` check (MIT, Apache-2.0, BSD and similar). The app's own repo is MIT;
third-party content keeps its licence and is named next to it.

```arc42
:::ignore H006 an organisation rule that lernapps check verifies (dependency-licence); no architecture decision responds to it
:::
:::constraint
id: con-bundled-licences
title: Bundled libraries under accepted licences
category: organizational
source: Decided sketch, step 12, section 2; ORGANIZATION.md "License"; lernapps check rule dependency-licence
:::
```

## Imprint and Privacy Notice

Every page links to the imprint and the privacy notice of lernapps.net; the runtime renders both links in the footer
of its pages.

```arc42
:::ignore H006 an organisation rule the runtime meets in the footer of its pages; no architecture decision responds to it
:::
:::constraint
id: con-imprint-privacy
title: Links to imprint and privacy notice
category: organizational
source: ORGANIZATION.md "Every page, in every repo"; decided sketch, step 12, section 3
:::
```

## Architecture Kept Current

The architecture lives in the arc42 DSL: this generic part at the root of `lernapps/app-templates` and one extension
per archetype in its template folder. An app gets both in its `docs/arc42/`; only an interactive app, whose code is
free, adds a part of its own and keeps it current with each increment. `arc42 diff --staged --strict` before a commit
and `arc42 validate` in `lernapps check` are decided but not wired into the app's hooks and check yet; the copying of
the architecture into an app is not built yet either. In `lernapps/app-templates` itself, `scripts/arc42.ts` validates
the generic part with each extension strictly, in the pre-commit hook and in CI.

```arc42
:::constraint
id: con-architecture-current
title: Architecture in docs/arc42, kept current
category: convention
source: Decided sketch, step 12, section 4; owner, 2026-10-16 (generic architecture plus one extension per archetype)
:::
```
