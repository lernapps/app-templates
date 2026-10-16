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

The decisions every lernapps app shares. Owner decisions are accepted with their date; decisions the runtime made
when it was built are accepted because they are in force. Each extension adds its archetype's decisions, and an
interactive app adds its own below these.

## Generic Architecture with One Extension per Archetype

Quiz, explainer and interactive app stay separate archetypes, but they share their quality goals, so they follow one
architecture: this generic part with the frame and an abstract archetype part, and one extension per archetype in its
template folder that adds only its own blocks and decisions and references the generic ids. An app's architecture is
both together. Rejected: one architecture per archetype, which would repeat the frame three times; one architecture
with every archetype's detail in it, which no app could take as its own.

```arc42
:::decision
id: dec-generic-plus-extensions
title: A generic architecture plus one extension per archetype
status: accepted
date: 2026-10-16
addresses: qg-understandable, con-architecture-current
:::
```

## Vue Is Fixed for Components

Where an app has components of its own (an explainer's components, an interactive app's UI), they are Vue with
TypeScript, so that one set of component rules, their build checks on the SFC compiler's output, the lint rules and
`vue-tsc` hold for every app, with no rules per framework; what a component draws and how stays free. Rejected: a free
choice of framework.

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

All apps share the origin's 5 MiB of `localStorage`. The only storage is the tooling's `localStorage` wrapper under the
app's prefix with a quota of 100 kB per app, and `save` refuses beyond it; the shared origin is accepted as a risk. The
quota is decided, not built. A second storage (IndexedDB) is left out.

```arc42
:::decision
id: dec-small-storage
title: localStorage through the wrapper with a 100 kB quota
status: accepted
date: 2026-10-16
addresses: con-state-on-device, con-storage-quota, qg-privacy, risk-shared-origin-storage
:::
```

## No Size Limit, the Size in the Entry

The app's size is not limited by the frame; it is stated in the app's catalog entry (its fact sheet), and a page may
show an optional loading indicator while it loads. Rejected: a size budget for every app, which would keep large
interactive apps out.

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

WCAG 2.1 AA and 360 px are platform rules; an app follows them by default and may deviate where its idea needs it (a
game against the clock), saying in its entry what it does not offer; then `accessible` and `usable-at-360px`
become warnings for it. Pages the runtime renders from the creator's data meet both in any case. Low stimulation is
advice in a skill, not a check. Rejected: the rules as errors for every app, which would exclude real-time games.

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

## arc42 in the App, Only for Interactive Apps

Every app gets the generic architecture and its archetype's extension. Only an interactive app, whose code is free,
writes an architecture part of its own, below its extension's blocks, English and minimal; a quiz or explainer app
writes none, because its archetype's notation (the question bank, the content schema) fixes its structure. Checked
is only what arc42 checks itself (`arc42 diff --staged --strict` before a commit, `arc42 validate` in
`lernapps check`); whether the code keeps to the responsibilities is not checked. Rejected: framework-specific
conformance checks. Both checks are not wired yet.

```arc42
:::decision
id: dec-arc42-in-app
title: arc42 in the app; only interactive apps add their own part
status: accepted
date: 2026-10-16
addresses: con-architecture-current, qg-understandable
:::
```

## The Skill as the Interface to the Creator's Assistant

The guidance for the creator's assistant is a skill per archetype plus `lernapps-app` for every app: Markdown the
assistant loads and follows, modelled as an interface of a tooling block. Advice that no check can make (how to write
a good question, low stimulation) lives there, not in the runtime.

```arc42
:::decision
id: dec-skill-interface
title: Skills as the interface used by the creator's assistant
status: accepted
date: 2026-10-16
addresses: qg-understandable
:::
```

## Tutor Variant

The optional tutor is a handoff to the learner's own assistant: after a click, a prompt (copied or passed to a chosen
provider) and static `tutor.md` and `llms.txt` files give it the task on the learner's screen. Rejected: a model
running in the browser. Built for the explainer; not built for the quiz and interactive apps.

```arc42
:::decision
id: dec-tutor-variant
title: Tutor as a handoff to the learner's own assistant
status: accepted
date: 2026-10-16
addresses: risk-tutor-not-built, con-no-request-before-click, qg-privacy
:::
```
