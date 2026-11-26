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

The decisions every lernapps app shares. Owner decisions carry their date. Decisions made while building the runtime
are accepted because they are in force. Each extension adds its archetype's decisions; an interactive app adds its
own below these.

## Generic Architecture with One Extension per Archetype

Quiz, explainer and interactive app stay separate archetypes but share their quality goals. So they follow one
architecture: this generic part, plus one extension per archetype that adds only its own blocks and decisions. An
app's architecture is both together.

Rejected: one architecture per archetype, because it repeats the frame three times; one architecture with every
archetype's detail, because no app could take it as its own.

```arc42
:::decision
id: dec-generic-plus-extensions
title: A generic architecture plus one extension per archetype
status: accepted
date: 2026-10-16
addresses: qg-understandable, con-architecture-current
:::
```

## What Archetypes Share Lives in the Shared Runtime

The archetypes use some things alike, above all the questions: the quiz asks them, and the explainer's exercises use
the same types. Such shared things live in the shared runtime. The archetypes build on it, never on each other, and
the shared runtime depends on no archetype. The package's public paths stay stable when code moves, so generated apps
keep building. A test enforces both rules.

Rejected: archetypes importing each other, because that makes two archetypes one; copying the questions into
each archetype.

```arc42
:::decision
id: dec-shared-runtime-direction
title: Archetypes build on the shared runtime and never on each other
status: accepted
date: 2026-10-20
addresses: qg-understandable, con-runtime-unchanged
:::
```

## Vue Is Fixed for Components

An app's own components are Vue with TypeScript. So one set of component rules and checks holds for every app. What a
component draws stays free.

Rejected: a free choice of framework, because each framework would need rules of its own.

```arc42
:::decision
id: dec-vue-fixed
title: Vue with TypeScript is fixed for an app's components
status: accepted
date: 2026-10-16
addresses: con-vue-typescript, con-component-rules, qg-checkable
:::
```

## Small Storage with a Quota

All apps share the origin's `localStorage`. The only storage is the tooling's wrapper, under the app's prefix, with a
quota of 100 kB per app. The shared origin is accepted as a risk. The quota is not built yet.

Left out: a second, larger storage (IndexedDB).

```arc42
:::decision
id: dec-small-storage
title: localStorage through the wrapper with a 100 kB quota
status: accepted
date: 2026-10-16
addresses: con-state-on-device, con-storage-quota, con-frontend-only, qg-privacy, risk-shared-origin-storage, risk-storage-quota-not-built
:::
```

## No Size Limit, the Size in the Entry

The frame does not limit an app's size. The app's catalog entry states it. A page may show a loading indicator (not
built). An archetype may still limit the size of its own parts.

Rejected: a size budget for every app, because it would keep large interactive apps out.

```arc42
:::decision
id: dec-no-size-limit
title: No size limit; the size in the entry, an optional loading indicator
status: accepted
date: 2026-10-16
addresses: qg-accessibility
:::
```

## Accessibility by Default, Limits Declared

WCAG 2.1 AA and 360 px are platform rules. An app follows them by default. It may deviate where its idea needs it,
such as a game against the clock, and says so in its entry. Then the two checks only warn for it. Pages the runtime
renders from the creator's data always meet both. Low stimulation is advice in a skill, not a check.

Rejected: the rules as errors for every app, because that would exclude real-time games.

```arc42
:::decision
id: dec-accessibility-default
title: Accessibility as default with declared limits
status: accepted
date: 2026-10-16
addresses: con-accessibility-default, qg-accessibility, risk-accessibility-limits-not-built
:::
```

## No Settings Now

A settings dialog (time limit off, less motion, sound, pause) is out of scope for now. An app that needs one later
adds it to the frame, not on its own.

```arc42
:::ignore H001 a scoping decision of the owner (2026-10-16): it leaves something out and serves no quality goal of its own
:::
:::decision
id: dec-no-settings
title: No settings dialog for now
status: accepted
date: 2026-10-16
:::
```

## arc42 in the App, Only for Interactive Apps

Every app gets the generic architecture and its archetype's extension. Only an interactive app, whose code is free,
writes a part of its own. A quiz or explainer app writes none, because its archetype's data format fixes its
structure. Only what arc42 checks itself is checked: the architecture against the staged code before a commit, and
its validity in `lernapps check`. Neither is wired into apps yet. This repository already validates the generic part
with each extension, in its pre-commit hook and in CI.

Rejected: framework-specific conformance checks.

```arc42
:::decision
id: dec-arc42-in-app
title: arc42 in the app; only interactive apps add their own part
status: accepted
date: 2026-10-16
addresses: con-architecture-current, con-language, qg-understandable, risk-arc42-checks-not-wired
:::
```

## The Skill as the Interface to the Creator's Assistant

The guidance for the creator's assistant is a set of skills: one for every app and one per archetype. The assistant
loads and follows them. Advice that no check can give, such as how to write a good question, lives there, not in the
runtime.

```arc42
:::decision
id: dec-skill-interface
title: Skills as the interface used by the creator's assistant
status: accepted
date: 2026-10-16
addresses: qg-understandable
:::
```

## A New App Gets the Scaffold, Not the Example

Occasion: a new app used to copy the whole example app. The example's structure, topic and tone stayed long after the
plan said otherwise.

Decision: `lernapps create` copies only the archetype's scaffold: configuration, entry points and a placeholder as
start content. The template folder stays a complete example that the assistant can look up in the installed package.
This package lists the scaffold's files, because only it knows what is configuration and what is example. CI checks
the scaffold as an app, so a new app passes `lernapps check` from its first commit. `lernapps update` never writes
the scaffold again.

Rejected: a scaffold function exported by the package, because a clone of the templates would need the built package;
start content inside the template folder, because the template's checks would read it as part of the example.

```arc42
:::decision
id: dec-scaffold
title: A new app gets the scaffold and a placeholder, not the example app
status: accepted
date: 2026-11-02
addresses: qg-understandable
:::
```

## Tutor Variant

The optional tutor hands the task to the learner's own assistant after a click. A prompt and a static tutor page per
content page give it the task. It is built for the explainer only; its extension models it.

Rejected: a model running in the browser.

```arc42
:::decision
id: dec-tutor-variant
title: Tutor as a handoff to the learner's own assistant
status: accepted
date: 2026-10-16
addresses: risk-tutor-not-built, con-no-request-before-click, qg-privacy
:::
```
