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

An app is static files on GitHub Pages at `lernapps.net/<repo>/`. It has no server of its own and shares no code
with other apps at runtime. All logic runs in the learner's browser.

```arc42
:::constraint
id: con-frontend-only
title: Frontend only, static pages
category: organizational
source: ORGANIZATION.md "What every site shares" and "Apps and the app overview"; decided sketch, step 12
:::
```

## No Request Before a Click, No Tracking

No page sets a cookie, tracks, or requests anything from another server before the learner clicks. The privacy
notice of lernapps.net promises this. So the app bundles fonts, libraries and data. `lernapps check` verifies it.

```arc42
:::constraint
id: con-no-request-before-click
title: No request before a click, no tracking
category: organizational
source: ORGANIZATION.md "Every page, in every repo"; lernapps check rules no-request-before-click and no-tracking
:::
```

## TypeScript on vite-plus, Vue for Components

Every app is TypeScript, built with vite-plus and the preset of `@lernapps/tooling`. An app's own components are Vue
single-file components. So one set of component rules holds for every app.

```arc42
:::constraint
id: con-vue-typescript
title: TypeScript on vite-plus, Vue for components
category: technical
source: Decided sketch, step 12, section 2; owner, 2026-10-16, conversation (Vue is fixed); skill lernapps-app rule strict-typescript
:::
```

## Component Rules

The build checks an app's components and what they import: no network, no code from strings, no raw HTML, imports
only from allowed sources. The rules are in the concept "Component rules" (chapter 8).

```arc42
:::constraint
id: con-component-rules
title: Component rules checked at build
category: technical
source: Decided sketch, step 12, section 2; runtime/explainer/components.ts; runtime/interactive/plugin.ts
:::
```

## The Runtime Is Not Changed by the App

The frame and the archetype's runtime come from `@lernapps/app-templates`. The app does not change them. It writes
only what its archetype allows. Runtime changes reach the app as dependency updates.

```arc42
:::constraint
id: con-runtime-unchanged
title: The app does not change the runtime
category: convention
source: Decided sketch, step 12, sections 3 and 4; skill rules quiz-only-data, explainer-only-content, keep-the-preset
:::
```

## State Only on the Device

What an app remembers stays in the learner's browser, under its own prefix, through the tooling's storage wrapper.
There are no accounts and no server state. Settings may be shared by all apps or by all apps of an archetype; an
app's own setting wins. Storage may be blocked or full at any time. Then the app keeps working and remembers nothing.

```arc42
:::constraint
id: con-state-on-device
title: State only on the device, through the storage wrapper
category: technical
source: Decided sketch, step 12, section 4; @lernapps/tooling archetypes/shared/storage.ts; lint rule storage-through-wrapper
:::
```

## Small Storage with a Quota

All apps share the `localStorage` of the one origin lernapps.net. So each app may keep at most 100 kB. The quota is
decided but not built yet.

```arc42
:::constraint
id: con-storage-quota
title: Small storage with a quota of 100 kB per app
category: technical
source: Owner, 2026-10-16, conversation; decided sketch, step 12, section 3
:::
```

## Accessibility: Platform Rule, App Default

WCAG 2.1 AA and use at 360 px are rules for the platform's pages. An app follows them by default. It may deviate where
its idea needs it, for example a typing game against the clock, and then declares its limits in its entry. Pages the
runtime renders from the creator's data always meet both. Low stimulation is advice only. Declared limits are not
built yet: today both checks fail every app.

```arc42
:::constraint
id: con-accessibility-default
title: WCAG 2.1 AA and 360 px by default, deviations declared
category: organizational
source: ORGANIZATION.md "Every page, in every repo"; decided sketch, step 12, section 5; owner, 2026-10-16, conversation
:::
```

## German for Learners, English for Infrastructure

Text for learners, teachers and parents is German; an app may declare further languages. Shared infrastructure,
identifiers, schemas and developer docs are English, and so is this architecture. Inside its own repo, an app's
author chooses the language of names.

```arc42
:::constraint
id: con-language
title: German for learner text, English for infrastructure
category: convention
source: ORGANIZATION.md "Language"; owner, 2026-10-16, conversation (architecture in English)
:::
```

## Bundled Libraries with Accepted Licences

An app bundles its libraries and never loads them from a CDN. Their licences must be on an allowlist (MIT, Apache-2.0,
BSD and similar). The app's own repo is MIT. Third-party content keeps its licence and names it.

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

Every page links to the imprint and the privacy notice of lernapps.net. The runtime puts both links in the footer.

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

The architecture is written in the arc42 DSL: this generic part and one extension per archetype. An app gets both.
Only an interactive app, whose code is free, adds a part of its own. The creator's assistant keeps it current with
every change. The checks for this in an app are decided but not wired yet (`dec-arc42-in-app`).

```arc42
:::constraint
id: con-architecture-current
title: Architecture in docs/arc42, kept current
category: convention
source: Decided sketch, step 12, section 4; owner, 2026-10-16 (generic architecture plus one extension per archetype)
:::
```
