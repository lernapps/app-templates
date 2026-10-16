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

The system provides an online bookstore backend with catalog search, order placement,
and customer account management. The key business goal is to maximise conversion by
keeping search fast and the checkout flow frictionless.

## 1.2 Quality Goals

See 10-quality-requirements.arc42.md for the full catalog with measurable scenarios.

## 1.3 Stakeholders

| Role              | Contact       | Expectations                                            |
|-------------------|---------------|---------------------------------------------------------|
| Product Owner     | …             | Functional coverage, no surprises in scope              |
| Lead Developer    | …             | Clear component boundaries, up-to-date decision records |
| Security Officer  | …             | Documented auth and encryption decisions                |
| CI Pipeline       | —             | Stable JSON output, reliable exit codes                 |
-->

## 1.1 Requirements Overview

An interactive app of lernapps.net is a small learning app in which doing is the content: a typing game whose letter
groups burst when typed, a Kniffel trainer that teaches probability, a proofreading app in which the learner marks the
mistakes. Every such app has the same frame: a static start page from `src/app.yaml` (what the app does, how to play,
its competencies, optional background sections), readable without JavaScript; one app page in the browser, which runs
the app's deterministic core and shows its state with Vue; hash routes for modes and levels; and, optionally, a tutor
(how it works is open, see below). The runtime in `@lernapps/app-templates` provides the frame and the app does not
change it; the creator's assistant writes the core, the UI, the data and the playthroughs. The app reaches learners
through one entry in the lernapps.net app overview, which links to it.

| Use case | Who | What the architecture must allow |
| --- | --- | --- |
| Find out what the app does | learner, teacher, parent | the start page, without JavaScript, in every declared language |
| Play and practise | learner | the app page: keys and pointer input step the core, a clock ticks it, state stays on the device |
| Open a mode or level directly | learner, catalog entry | a hash route per mode or level, a seed in the address |
| Build and extend the app | creator and their AI assistant | free code under fixed rules that the build and `lernapps check` verify |
| Get help with a task | learner | an optional tutor |

OPEN: Is the "client-side AI tutor" a handoff to the learner's own assistant (as in the explainer) or a model running
in the browser?

## 1.2 Quality Goals

The proposed top quality goals, in this order:

- `qg-privacy`: the app sends nothing anywhere and requests nothing from another server before a click; what it
  remembers stays on the learner's device.
- `qg-checkable`: the rules an app keeps are verified by machine, at build and in the browser: the core is
  deterministic by its seed, and every playthrough plays the same in the build and in the browser.
- `qg-accessibility`: start page and app page meet WCAG 2.1 AA and work at 360 px by default; an app that cannot
  declares its limits in its entry.
- `qg-small`: an app loads fast and takes little: its own code stays within a size budget and its storage within a
  quota.
- `qg-understandable`: an AI assistant that did not write the app can extend it, because its architecture is written
  down early, in English and minimal, and kept current with the code.

OPEN: The quality goals above are agent inference from the decided sketch and the organisation rules; the owner has
not ranked them or chosen their ids. Confirm the set, the order and the priorities for chapter 10.

See [10-quality-requirements.arc42.md](10-quality-requirements.arc42.md) for the complete
quality catalog with priorities and measurable scenarios.

## 1.3 Stakeholders

| Role | Contact | Expectations |
| --- | --- | --- |
| Learner (adults and students, often in German schools) | — | An app that works right away, in the browser, without an account, that keeps no data off the device and does not overwhelm |
| Creator | the app's repo | To build and list an app with almost no effort, and to hear when it helped |
| The creator's AI assistant | the app's repo, the `lernapps-*` skills | A clear frame: which parts are fixed, where the app's own building blocks go, which rules the build checks |
| Platform owner | Oliver Jägle (@mrsimpson), lernapps@beimir.net | Every app keeps the platform's rules (privacy, accessibility default, licences) so it can be listed without doubt |
| Teachers and parents | lernapps.net | To see from the start page and the entry what the app teaches and what it does not offer, and that it may be used |
| Reviewers (the review agent before listing, the owner who decides the listing) | `lernapps/apps` | An architecture that says what each part does and why, readable without the code |
