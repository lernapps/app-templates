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
-->

## 1.1 Requirements Overview

Every app of lernapps.net is a small learning app that runs only in the browser. A creator makes it with their AI
assistant from one of three archetypes:

- a quiz: a question bank about things to know;
- an explainer: pages of content with an exercise on every page;
- an interactive app: doing is the content, for example a typing game.

The archetypes stay separate. They share their quality goals and so one architecture: this generic part. Each
archetype extends it in its template folder.

Every app has the same frame. The build renders static pages in every declared language. A runtime the app does not
change starts the archetype's code in the browser. Build checks and end-to-end tests come with the runtime. An
optional tutor hands the current task to the learner's own AI assistant. The app reaches learners through its entry
in the lernapps.net app overview.

| Use case | Who | What the architecture must allow |
| --- | --- | --- |
| Find out what the app does | learner, teacher, parent | static pages in every declared language |
| Learn and practise | learner | the archetype's code in the browser, its state only on the device |
| Open a part directly | learner, catalog entry | deep links and a seed in the address |
| Build and extend the app | creator and their AI assistant | what the archetype lets the creator write, checked by machine |
| Get help with a task | learner | an optional handoff of the task to the learner's own assistant, after a click |

## 1.2 Quality Goals

The top quality goals, in this order:

- `qg-privacy`: the app sends nothing before a click and keeps what it remembers on the device.
- `qg-checkable`: machines verify the app's rules, at build and in the browser.
- `qg-accessibility`: WCAG 2.1 AA and 360 px by default; an app that cannot meet them declares its limits.
- `qg-understandable`: a reviewer or the creator's agent understands an app's structure from its architecture.

The owner set the goals and their priorities on 2026-10-16. The quiz and the explainer add readability without
JavaScript in their extensions.

See [10-quality-requirements.arc42.md](10-quality-requirements.arc42.md) for the complete
quality catalog with priorities and measurable scenarios.

## 1.3 Stakeholders

| Role | Contact | Expectations |
| --- | --- | --- |
| Learner (adults and students, often in German schools) | — | An app that works at once in the browser, without an account, keeps no data off the device and does not overwhelm |
| Creator | the app's repo | To build and list an app with little effort, and to hear when it helped |
| The creator's AI assistant | the app's repo, the `lernapps-*` skills | A clear frame: what is fixed, what it may write, what the build checks |
| Platform owner | Oliver Jägle (@mrsimpson), lernapps@beimir.net | Every app keeps the platform's rules (privacy, accessibility, licences), so it can be listed without doubt |
| Teachers and parents | lernapps.net | To see from the pages and the entry what the app teaches, what it lacks, and that it may be used |
| Reviewers (review agent, owner who decides the listing) | `lernapps/apps` | An architecture that says what each part does and why, readable without the code |
| Maintainers of an archetype | `lernapps/app-templates` | One generic architecture and one extension per archetype, so a change to the frame is made once |
