# Introduction and Goals

<!--
Arc42 chapter 1. Describes the relevant requirements and the driving forces that
architects and the development team must consider.

This chapter has three subsections:

1.1 Requirements Overview
  Short description of the functional requirements and business goals — not a full
  requirements spec. Write a compact summary or refer to an external requirements
  document. A brief prose paragraph and/or a table of the most important use cases.

1.2 Quality Goals
  The top three to five quality goals for the architecture (highest-importance only).
  Write a single sentence or short paragraph, then link to chapter 10.
  Do NOT repeat the quality-goal blocks here — they live in 10-quality-requirements.arc42.md.

  Example:

  See [10-quality-requirements.arc42.md](10-quality-requirements.arc42.md) for the
  complete quality catalog with priorities and measurable scenarios.

1.3 Stakeholders
  A table of all stakeholders: their role, contact, and expectations from the
  architecture and its documentation. Think broadly — include teams that must
  maintain the system, operators, auditors, and external partners.

See https://docs.arc42.org/section-1/ for further guidance.

Example:

## 1.1 Requirements Overview

Every app of lernapps.net is a small, frontend-only learning app, made by a creator with their AI assistant from one
of three archetypes: a quiz about things to know (a question bank), an explainer (pages of content with an exercise on
every page), or an interactive app in which doing is the content (a typing game, a Kniffel trainer, a proofreading
app). The archetypes stay separate, but they share their quality goals and so one architecture: this generic
architecture, which each archetype extends in its template folder (`quiz/docs/arc42/`, `explainer/docs/arc42/`,
`interactive/docs/arc42/`). Every app has the same frame: static pages rendered at build in every declared language,
the archetype's code in the browser started by a runtime the app does not change, build checks and end-to-end tests
that come with the runtime, the tooling's helpers, and an optional tutor, which hands the current task to the
learner's own AI assistant (no model runs in the browser). The app reaches learners through one entry in the
lernapps.net app overview, which links to it.

| Use case | Who | What the architecture must allow |
| --- | --- | --- |
| Find out what the app does | learner, teacher, parent | static pages in every declared language; what each archetype shows without JavaScript is in its extension |
| Learn and practise | learner | the archetype's code in the browser, its state only on the device |
| Open a part directly | learner, catalog entry | deep links (a question, a page and task, a mode or level), a seed in the address |
| Build and extend the app | creator and their AI assistant | what the archetype lets the creator write, under rules the build and `lernapps check` verify |
| Get help with a task | learner | an optional handoff of the task to the learner's own assistant, after a click |

## 1.2 Quality Goals

The top quality goals, in this order:

- `qg-privacy`: the app sends nothing anywhere and requests nothing from another server before a click; what it
  remembers stays on the learner's device.
- `qg-checkable`: the rules an app keeps are verified by machine, at build and in the browser.
- `qg-accessibility`: the pages meet WCAG 2.1 AA and work at 360 px by default; an app that cannot declares its
  limits in its entry.
- `qg-understandable`: a reviewer or the creator's agent understands an app's structure from its architecture.

The set and the priorities (privacy and checkable high, accessibility and understandable medium) are the owner's
(2026-10-16). The quiz and the explainer, both text-heavy, add readability without JavaScript as a goal of their own
in their extensions.

See [10-quality-requirements.arc42.md](10-quality-requirements.arc42.md) for the complete
quality catalog with priorities and measurable scenarios.

## 1.3 Stakeholders

| Role | Contact | Expectations |
| --- | --- | --- |
| Learner (adults and students, often in German schools) | — | An app that works right away, in the browser, without an account, that keeps no data off the device and does not overwhelm |
| Creator | the app's repo | To build and list an app with almost no effort, and to hear when it helped |
| The creator's AI assistant | the app's repo, the `lernapps-*` skills | A clear frame: which parts are fixed, what the archetype lets it write, which rules the build checks |
| Platform owner | Oliver Jägle (@mrsimpson), lernapps@beimir.net | Every app keeps the platform's rules (privacy, accessibility default, licences) so it can be listed without doubt |
| Teachers and parents | lernapps.net | To see from the pages and the entry what the app teaches and what it does not offer, and that it may be used |
| Reviewers (the review agent before listing, the owner who decides the listing) | `lernapps/apps` | An architecture that says what each part does and why, readable without the code |
| Maintainers of an archetype | `lernapps/app-templates` | One generic architecture and one extension per archetype, so a change to the frame is made once |
