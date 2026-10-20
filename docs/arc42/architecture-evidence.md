# Architecture evidence

Traceability of the facts of the generic architecture (`docs/arc42/`) and its three extensions
(`quiz/docs/arc42/`, `explainer/docs/arc42/`, `interactive/docs/arc42/`) to their sources. Not an arc42 chapter; the
validator does not parse it. Owner decisions count as evidence. An app's workspace is the generic files plus its
archetype's extension; `scripts/arc42.ts` validates each combination with `arc42 validate --strict` and `--root` at the
repo root (see "Strict validation, paths and input" below).

## Strict validation, paths and input (owner, 2026-10-16)

| Source path:line, symbol, or command | Derived fact or relationship | Used in | Confidence | Open question / human decision |
| --- | --- | --- | --- | --- |
| owner, 2026-10-16, decision 1 (relayed by the coordinator) | Input is more than keys and mouse: the core's `step(state, input)` takes a typed, extensible input (a key, a pointer or touch action, …); playthroughs record inputs; components translate any device input into inputs | interactive dec-typed-input (supersedes dec-keys-as-input), concept-core-and-shell, concept-playthroughs, if-core-contract, if-root-component, bb-shell, scenario-play, scenario-browser-playthroughs, qs-deterministic-core, term-core, term-playthrough, term-input; ch.3 actor-learner | high | — |
| `runtime/interactive/contract.ts:15-18,26-31` (`step(state: S, key: string)`, `PlaythroughStep.keys`); `runtime/interactive/interactive.ts:49-59,69` (keydown, `onInput: input` with a key) | The runtime passes only keys today: technical debt against dec-typed-input | interactive risk-input-only-keys | high | — |
| owner, 2026-10-16, decisions 2 and 3, corrected twice (relayed by the coordinator) | Paths are static and relative to the repo root: runtime blocks at `runtime/...`; blocks and interfaces in a template folder get no path, with an ignore directive ("the template is copied into each app; this block's path is the app's own and is set in the app's architecture"); tooling helpers at their installed location; no placeholders | all ch.5 files | high | Resolved 2026-10-17, see below |
| `arc42 validate` E011 (`pathIsKnown` over `git ls-files`); `.gitignore` (node_modules/) | A path under `node_modules/@lernapps/tooling` is an error: the validator knows only tracked files. So the tooling helpers carry no path; an ignore directive per element names the location | ch.5 bb-tooling and its six interfaces | high | OPEN: reported to the owner instead of a workaround |
| owner, 2026-10-16, decision 3 | Strict: 0 errors, 0 warnings, 0 hints per combination; ignore directives only for documented exceptions (table below) | all chapters | high | — |
| `@doctc/arc42` 0.36.1 rules W026, W027 (a part and an interface in their parent's or provider's file), H017, H018 (one parent with its parts per diagram) | Extension blocks cannot be parts of generic blocks without an ignore each, and a third level cannot be drawn without a hint; so the generic roots are `bb-runtime` and `bb-tooling`, each extension defines `bb-archetype-runtime` with its parts and the creator's parts as roots, and interfaces that cross a root are provided or required by a root or a sibling | ch.5, ch.4 System decomposition, ch.8 concept-archetype-extension | high | — (agent design under the owner's strict rule) |
| `@doctc/arc42` 0.36.1 rules H015, H016, W019 (per chapter-5 file: at least one diagram, covering every block and interface of the workspace) | The generic chapter-5 file cannot name an extension's blocks; `scripts/arc42.ts` therefore appends each extension's chapter file to the generic one of the same chapter (as an app's single architecture would hold them) and reports findings at their original place | scripts/arc42.ts; ch.5 | high | OPEN: whether apps get the combined files the same way (tooling step) |
| `git ls-files runtime/` ; `arc42 validate` H021 (coverage of sibling paths) | `runtime/quiz`, `runtime/explainer`, `runtime/interactive` are left out in `.arc42ignore`: each is claimed in its own combination, the others are siblings of `runtime/shared` there | .arc42ignore | high | — |
| `runtime/*/` imports (`grep from runtime/*/*.ts`) | The interactive build imports the explainer's component rules (`../explainer/components.ts`); the explainer imports the quiz's question types, rendering, engine and checker (`../quiz/quiz.ts`, `render.ts`, `engine.ts`, `validate.ts`); the plugins import `@lernapps/tooling/preset` | interactive bb-component-rules; explainer bb-question-types; bb-archetype-runtime requires if-preset | high | — |
| `runtime/interactive/contract.ts:20-24` (TICK, STATE_PROPERTY) | The state property is defined next to the core contract | interactive if-state-property, ignore H020 | high | — |
| owner, 2026-10-16, decision 4 | The architecture check runs in this repo's pre-commit hook when `*.arc42.md` or `.arc42ignore` files are staged, and in CI; `@doctc/arc42` pinned as a devDependency (0.38.0 since 2026-10-20, the tooling's version) | vite.config.ts staged, .github/workflows/check.yml job architecture, package.json; ch.2 con-architecture-current, ch.9 dec-arc42-in-app, ch.11 risk-arc42-checks-not-wired | high | — |
| agent inference | Removed as blocks: the main.ts glue (thin, kept as generated; named in if-start), the loading indicator and settings (not built, kept in dec-no-size-limit and dec-no-settings), the skills per archetype (one interface if-skills of bb-tooling), low stimulation as a concept (no block implements it; now in risk-interactive-skill-missing) | ch.5, ch.8, interactive ch.11 | medium | — |

### Ignore directives

| Rule | Element | Reason |
| --- | --- | --- |
| H014 | bb-tooling, if-preset, if-lernapps-check, if-device-storage, if-a11y, if-translator | @lernapps/tooling is installed in the untracked node_modules; a path there is E011 |
| H014 | explainer bb-explainer-data, bb-explainer-components, if-data-files, if-vue-component, if-exercise-logic | optional and not in the template; an app that adds them sets their paths in its own architecture |
| H014 | interactive if-root-component | no file of its own: its props are set in runtime/interactive/interactive.ts, which carries if-start |
| H020 | interactive if-core-contract | it and if-state-property are both defined in runtime/interactive/contract.ts |
| H006 | con-bundled-licences, con-imprint-privacy | organisation rules verified by lernapps check or met by the runtime's footer; no decision responds to them |
| H001 | dec-no-settings | a scoping decision of the owner; serves no quality goal |
| H007 | quiz risk-quiz-no-js-not-in-check | accepted without a decision; the quiz's own end-to-end tests check the worksheet |
| H007 | explainer risk-explainer-storage-doc | a sentence to correct in the skill, not an architecture decision |
| H014 | bb-skills, if-skills | the skills are committed in each app under .agents/skills; this repository has none (owner, 2026-10-16) |
| W006 | qg-privacy, from the interactive extension (moved to the top of chapter 10 by `scripts/arc42.ts`) | two high-priority goals in the interactive combination is the owner's decision (2026-10-16); quiz and explainer have three, so the directive would be stale there |
| W014 | quiz qg-quiz-readable-without-js, explainer qg-explainer-readable-without-js | the extension's high goal follows the generic medium goals in the combined chapter 10 |
| H010 | quiz qg-quiz-readable-without-js, explainer qg-explainer-readable-without-js | the generic solution strategy cannot name an archetype's goal (an error in the other combinations); the archetype's decisions address it |
| H021 | `.arc42ignore`: runtime/quiz, runtime/explainer, runtime/interactive | another archetype's runtime, claimed in its own combination |

### Ids moved or removed in this step

| Before | After |
| --- | --- |
| bb-archetype (abstract), if-quiz-bank, if-explainer-content, if-interactive-description | removed; each extension's content block provides `if-archetype-content` |
| bb-static-description, bb-page-tree, bb-not-found-page, bb-build-checks, bb-examples-check, bb-loading-indicator, bb-settings | `bb-render` (each extension), `bb-runtime` (shared runtime: page trees, 404 page, examples check); loading indicator and settings not modelled |
| bb-quiz-rendering, bb-quiz-validation, bb-quiz-engine, bb-quiz-tests; bb-explainer-rendering, -validation, -client, -tests; bb-interactive-start-page, -app-page, -validation, bb-core-check, bb-build-playthroughs, bb-browser-playthroughs | `bb-render`, `bb-validation`, `bb-shell`, `bb-e2e`, `bb-build` in each extension, parts of `bb-archetype-runtime` |
| bb-state-holder, bb-input-router, bb-clock, bb-hash-router, bb-seed | interactive `bb-shell` (one file, runtime/interactive/interactive.ts) |
| bb-preset, bb-lint-rules, bb-lernapps-check, bb-playwright-config, bb-small-storage, bb-a11y, bb-i18n, bb-skill-app, bb-skill-quiz, bb-skill-explainer, bb-skill-interactive; if-lint-plugin, if-playwright-config, if-skill-* | `bb-tooling` with if-preset, if-lernapps-check, if-skills, if-device-storage, if-a11y, if-translator |
| bb-quiz-main, bb-explainer-main, bb-interactive-main; if-static-files | removed (main.ts named in if-start; GitHub Pages requires if-pages) |
| bb-exercise-contract, if-exercise-description, if-question-exports (explainer) | explainer if-exercise-logic (exercise contract), bb-question-types with if-question-types |
| concept-tutor, actor-learner-assistant, scenario-tutor | explainer extension (08, 03, 06) |
| risk-size-budget-left (interactive), risk-explainer-component-budget | generic risk-size-budget-left |
| dec-keys-as-input | superseded by interactive dec-typed-input |

## Skills as a building block (owner, 2026-10-16)

| Source path:line, symbol, or command | Derived fact or relationship | Used in | Confidence | Open question / human decision |
| --- | --- | --- | --- | --- |
| owner, 2026-10-16, decision (relayed by the coordinator) | The skills are a building block of their own behind `if-skills`: in an app they are committed under `.agents/skills/`, one folder per skill (lernapps-app, the archetype's skill, the content skills, lernapps-listing, the app's own app-content), installed and replaced by `lernapps update`; the tooling's source is its `skills/` folder | ch.5 bb-skills, if-skills (provider moved from bb-tooling); ch.3 actor-creator-assistant; ch.4; ch.6 scenario-skills; ch.7 dn-creator-machine; ch.9 dec-skill-interface | high | — |
| `git ls-files .agents` in this repository (empty) | This repository has no `.agents/skills`, so `bb-skills` and `if-skills` carry no path; an ignore directive names the reason | ch.5 bb-skills, if-skills (H014) | high | — |
| tooling `generator/update.ts:12-14,72-76`; tooling `skills/` (`lernapps-app`, `-quiz`, `-explainer`, `-listing`, `-content-research`, `-exercise-patterns`, `-content-growth`) | `lernapps update` replaces the app's `lernapps-*` skills with the tooling's and keeps the app's own (app-content) | ch.5 bb-skills; ch.6 scenario-skills | high | — |
| `@doctc/arc42` 0.36.1 W026, W027 (a part and an interface in their parent's or provider's file) | `bb-skills` is a third generic root rather than a part of `bb-tooling`, so that no extra diagram is needed; it and `if-skills` are in the same file | ch.5 | medium | — |
| owner, 2026-10-16, decision; [lernapps/tooling#90](https://github.com/lernapps/tooling/pull/90) | Low stimulation is advice of the skills (no flashing, calm motion, sound off by default, and why); the skill `lernapps-interactive` gives it, provided in tooling#90; the risk of the missing skill stays until it merges | ch.8 concept-low-stimulation (implemented by bb-skills); interactive risk-interactive-skill-missing | high | — |
| owner, 2026-10-16, correction | The skill keeps only the general principles: no recipes per kind of app | interactive dec-one-archetype (no longer "kinds as recipes"), risk-interactive-skill-missing | high | — |
| owner, 2026-10-16, decision | `qg-quiz-readable-without-js` and `qg-explainer-readable-without-js` have priority high (both archetypes are text-heavy) | quiz and explainer ch.10 | high | — (resolved) |
| owner, 2026-10-16, decision | No creator checkpoint for the architecture: the agent keeps the app's architecture current and validated with every change | ch.2 con-architecture-current | high | — |

## Generic architecture and extensions (owner, 2026-10-16)

The architecture was first written for the interactive archetype (rows from "Sources inventoried" on). By the owner's
decision of 2026-10-16 it became the generic architecture of every lernapps app, at the repo root, with one extension
per archetype. Rows below this section name ids as they were before the split; the table of moved ids maps them.

| Source path:line, symbol, or command | Derived fact or relationship | Used in | Confidence | Open question / human decision |
| --- | --- | --- | --- | --- |
| owner, 2026-10-16, decision (relayed by the coordinator) | One architecture for every archetype; quiz, explainer and interactive stay separate archetypes and follow it because they share its quality goals; generic part at `docs/arc42/`, one extension per archetype in its template folder that adds only its own blocks (below the generic ones via `parent`), interfaces, decisions, risks and terms, and defines no generic id again | all chapters; dec-generic-plus-extensions; concept-archetype-extension | high | — |
| owner, 2026-10-16, decision | Only interactive apps write an architecture part of their own; the quiz's and the explainer's notation fixes their structure | ch.2 con-architecture-current; ch.9 dec-arc42-in-app; quiz dec-quiz-only-bank; explainer dec-explainer-only-content | high | — |
| owner, 2026-10-16, decision | Quality goal priorities confirmed: privacy and checkable high, accessibility and understandable medium | ch.1, ch.10 | high | — (resolved) |
| owner, 2026-10-16, decision | Readable without JavaScript is a quality goal of the quiz and the explainer (text-heavy), not of the generic architecture and not of interactive apps (only their start page reads without JavaScript) | quiz qg-quiz-readable-without-js, explainer qg-explainer-readable-without-js; ch.8 concept-readable-without-js; ch.6 scenario-pages | high | — (resolved: owner, 2026-10-16, priority high for both, because both archetypes are text-heavy) |
| owner, 2026-10-16, earlier review (kept in force) | No model in the browser; no IndexedDB; no size limit, the size in the entry and an optional loading indicator; the skill as an interface used by the creator's assistant | ch.5 bb-tutor-handoff, bb-small-storage, bb-loading-indicator, bb-skill-app; ch.9 dec-tutor-variant, dec-small-storage, dec-no-size-limit, dec-skill-interface | high | — |
| `runtime/shared/pages.ts` header | Page trees per language and 404.html are shared by the archetypes' build steps | ch.5 bb-page-tree, bb-not-found-page | high | — |
| `runtime/shared/examples.ts` header; `runtime/quiz/validate.ts` header | The examples check runs for the quiz's questions and the explainer's exercises; interactive apps have none | ch.5 bb-examples-check | high | — |
| `runtime/explainer/components.ts` header ("The interactive archetype runs the same code checks"); `runtime/interactive/plugin.ts` lines 10-13 | Component rules shared by explainer components and the interactive UI; the quiz has no components | ch.5 bb-component-rules; ch.2 con-vue-typescript | high | — |
| `runtime/quiz/question.ts`, `quiz.ts` headers; `runtime/explainer/exercises.ts` header | The six question types and checker are used by the quiz and by the explainer's quiz-type exercises | ch.5 bb-question-types | high | — |
| `runtime/explainer/tutor.ts`, `tutorpage.ts`, `prompt.ts`, `tasks.ts`, `components.ts`, `generated.ts` headers; no tutor code in `runtime/quiz/`, `runtime/interactive/` | Tutor handoff, task numbers and exercise contract built for the explainer, not for the quiz and interactive apps | ch.5 bb-tutor-handoff, bb-task-numbers, bb-exercise-contract; ch.3, ch.6, ch.11 | high | — |
| `runtime/quiz/engine.ts` lines 1-17, 244 | The quiz engine: one question at a time in the seed's order, deep link, stores only the last result when the bank asks | quiz bb-quiz-engine, scenario-quiz-answer | high | — |
| `runtime/quiz/render.ts` header; skill `lernapps-quiz` "How the quiz works" | Without JavaScript the quiz page is a worksheet with its answer key | quiz bb-quiz-rendering, dec-quiz-worksheet, qg-quiz-readable-without-js | high | — |
| `runtime/quiz/e2e.ts` header | quizTests check the page without JavaScript in every language | quiz qs-quiz-without-js | high | — |
| tooling `check/rules/explainer-readable-without-js.ts` header; skill `lernapps-explainer` rule explainer-readable-without-js | lernapps check verifies only explainer pages without JavaScript; the quiz's is checked by its own tests | explainer qs-explainer-without-js; quiz risk-quiz-no-js-not-in-check; ch.5 bb-lernapps-check | high | — |
| skill `lernapps-quiz` rule quiz-only-data | The quiz's creator writes only src/quiz.json | quiz bb-quiz-bank, dec-quiz-only-bank; ch.2 con-runtime-unchanged | high | — |
| skill `lernapps-explainer` rules explainer-only-content, prefer-built-in-block, vue-component-*; "Data files"; "Components" | The explainer's creator writes YAML content, data files and Vue components only where no block fits, each within 20 kB gzip | explainer bb-explainer-content, bb-explainer-data, bb-explainer-components, dec-explainer-only-content | high | — |
| `runtime/explainer/plugin.ts`, `render.ts`, `load.ts`, `explainer.ts`, `islands.ts`, `generated.ts`, `e2e.ts`, `outline.ts` headers | The explainer's rendering (pages, blocks, islands at build), validation, client, islands, generated exercises and tests | explainer ch.5, ch.6 | high | — |
| `runtime/explainer/components.ts:57` (SIZE_BUDGET = 20_000); `plugin.ts:293-309` | The explainer's build fails a component over 20 kB gzip | explainer ch.9 / dec-explainer-component-size | high | — (resolved: owner, 2026-10-16, a fixed size per component; the figure is an implementation detail) |
| skill `lernapps-explainer` line 38 ("The explainer stores nothing"); `runtime/explainer/explainer.ts:17,184` | The skill and the runtime differ: the client keeps the chosen way to the tutor on the device | explainer risk-explainer-storage-doc; ch.5 bb-small-storage | high | — (a fix of the skill, not an owner question) |
| `explainer/src/`, `quiz/src/`, `interactive/src/` (template folders) | Superseded (owner, 2026-10-16): template blocks carry no path | extensions ch.5 | high | — |
| owner, 2026-10-17 (relayed by the coordinator) | Supersedes the 2026-10-16 rule for template blocks: they carry their path with the template prefix (`interactive/src/core`, `quiz/src/quiz.json`, `explainer/src/app.yaml`), which exists in this repo and validates without an ignore; the tooling copies the generic part and the interactive extension into an interactive app, strips the prefix and turns `runtime/...` paths into ignore directives (E011, docToolchain/arc42-language#128). The templates' entries, type declarations and the explainer's example chapter are left out in `.arc42ignore` | extensions ch.5, ch.5 intro, .arc42ignore | high | — |
| owner, 2026-10-17, second decision (relayed by the coordinator); `@doctc/arc42` 0.36.1 W026 (a part in its parent's section), H015 (every block in a diagram of its chapter-5 file), W012 (every leaf on a deployment node) | An app's own architecture goes into its copy of these chapters, between the markers `<!-- app: begin … -->` and `<!-- app: end … -->`, which the tooling keeps when it replaces the rest: in chapter 5 inside the sections of the core, the UI and the data (named `core`, `ui`, `data`) and at the end of every interactive chapter; not in files of its own, where those rules cannot be met | interactive ch.5 to ch.12 | high | — |
| agent inference | Extension deployment nodes (`dn-<archetype>-build` below the CI runner, `dn-<archetype>-page` below the learner's browser) host the extension's blocks; the build node also stands for the creator's machine | extensions ch.7 | medium | — |
| agent inference | `if-archetype-content`, defined by each extension on its content block, stands for what the creator writes | ch.5, ch.3 | medium | — |
| agent inference | `if-lernapps-check` as an interface the creator's assistant requires | ch.3 actor-creator-assistant, ch.5 | medium | OPEN (narrowed): an interface for `vp build` and `vp dev` |

Earlier ignore directives (W002 for bb-not-found-page, bb-loading-indicator, bb-settings; W026 for every extension block with a generic parent) were removed with the restructuring above.

### Moved and renamed ids (from the interactive architecture)

| Before | After |
| --- | --- |
| bb-app | bb-archetype (abstract, generic) |
| bb-description, bb-main, bb-core, bb-ui, bb-data, bb-messages, bb-playthroughs | bb-interactive-description, -main, -core, -ui, -data, -messages, -playthroughs (interactive extension) |
| bb-start-page, bb-app-page | bb-interactive-start-page, bb-interactive-app-page below bb-static-description (interactive extension) |
| bb-app-validation | bb-interactive-validation (interactive extension) |
| bb-core-check, bb-build-playthroughs, bb-input-router, bb-clock, bb-hash-router, bb-seed, bb-browser-playthroughs | interactive extension; the shell's mount and state became bb-state-holder |
| if-start-page, if-app-description, if-app-data, if-start-interactive, if-interactive-tests | if-pages (generic), if-interactive-description, if-interactive-data, if-start (generic), if-e2e-tests (generic) |
| concept-core-and-shell, concept-playthroughs, concept-hash-routes, concept-low-stimulation | interactive extension |
| dec-one-archetype, dec-runtime-owns-state, dec-keys-as-input, dec-start-seed-route, dec-playthroughs-as-data | interactive extension |
| qs-deterministic-core, qs-playthrough-in-browser | interactive extension |
| risk-time-not-replayed, risk-size-budget-left, risk-no-core-property-tests | interactive extension |
| term-core, term-app-page, term-route, term-tick, term-playthrough | interactive extension |

## Sources inventoried (the interactive architecture before the split)

| Source path:line, symbol, or command | Derived fact or relationship | Used in | Confidence | Open question / human decision |
| --- | --- | --- | --- | --- |
| `lernapps/tooling .vibe/development-plan-agentic-app-creation.md`, "Sketch: the interactive archetype (step 12, decided by the owner)" | Scope, the opinionated frame (Vue fixed), shell and app split, arc42 in the app, accessibility default with declared limits, tests | all chapters | high | — |
| owner, 2026-10-16, conversation | Small storage: localStorage through the tooling wrapper, 100 kB per app; no settings, motion, sound or pause now; low stimulation as advice; architecture English and minimal; note all generic components, optional ones too | ch.2, ch.5, ch.8, ch.9 | high | — |
| owner, 2026-10-16, review | Tutor: no model in the browser; the tutor is the handoff to the learner's own assistant as in the explainer (bb-tutor-handoff, optional, not built for interactive apps); dec-tutor-variant accepted; bb-tutor-handoff provides the tutor prompt and files that actor-learner-assistant requires | ch.1, ch.3, ch.4, ch.5, ch.6, ch.8, ch.9, ch.11, ch.12 | high | — (resolves OPEN: handoff or model in the browser) |
| owner, 2026-10-16, review | IndexedDB left out entirely (bb-large-storage and its mentions removed) | ch.2, ch.5, ch.8, ch.9 | high | — |
| owner, 2026-10-16, review | No size limit: bb-size-budget, con-size-budget, concept-size-budget, qg-small and their scenarios and risks removed; the app's size goes into its catalog entry (fact sheet); optional loading indicator (progress bar at start, not built) in the shell; SIZE_BUDGET in runtime/interactive/plugin.ts is technical debt | ch.1, ch.2, ch.4, ch.5, ch.6, ch.7, ch.8, ch.10, ch.11, ch.12 | high | — (resolves OPEN: size budget scope) |
| owner, 2026-10-16, review | Low stimulation: the skill lernapps-interactive (not built) is a tooling block providing the skill text that actor-creator-assistant requires; it implements concept-low-stimulation | ch.3, ch.5, ch.8 | high | — |
| owner, 2026-10-16, review | Quality goals qg-privacy, qg-checkable, qg-accessibility (default with declared limits), qg-understandable (a reviewer or the creator's agent understands an app's structure from its architecture); qg-small dropped | ch.1, ch.4, ch.10 | high | — |
| owner, 2026-10-16, review | Playthrough time steps (n ticks, build and browser, not built); actor interfaces if-start-page, if-app-address (bb-app-page), if-static-files (bb-build); shared-origin storage risk medium and accepted; core property tests stay planned; interactive apps get the same Pages workflow (check, publish, preview) in step 2 of the plan | ch.3, ch.5, ch.7, ch.8, ch.9, ch.11 | high | — (resolves OPENs on actor interfaces, time steps, storage risk, Pages workflow) |
| owner, 2026-10-16, review | Exercise contract: the optional exports with which an app describes its tasks (describe(state, lang) gives task and solution text for the tutor and task numbers; examples of accepted and rejected answers checked at build), from the explainer's exercise components | ch.5, ch.6 | high | — |
| `lernapps/.github ORGANIZATION.md`, "Every page, in every repo" | No cookies, no tracking, no requests to other servers before a click; WCAG 2.1 AA and 360 px for platform pages, default for apps | ch.2 | high | — |
| `runtime/interactive/contract.ts` | Core contract start(seed, route), step(state, key), tick(state, dt); TICK = 20; playthrough format | ch.5, ch.6 | high | — |
| `runtime/interactive/interactive.ts` (startInteractive) | Shell: state holder, input routing, clock, hash routes, seed from the address | ch.5, ch.6 | high | — |
| `runtime/interactive/plugin.ts`, `load.ts`, `render.ts` | Build: start page and app page, validation, core and playthrough checks; SIZE_BUDGET 100 kB still in plugin.ts (debt) | ch.5, ch.6, ch.11 | high | — |
| `runtime/interactive/e2e.ts` (interactiveTests) | Browser playthroughs, pages without JavaScript, 360 px | ch.5, ch.10 | high | — |

## Rows from the chapters

### Chapter 1

| Source path:line, symbol, or command | Derived fact or relationship | Used in | Confidence | Open question / human decision |
| --- | --- | --- | --- | --- |
| tooling `.vibe/development-plan-agentic-app-creation.md`, Sketch step 12, section 1 | Scope: apps whose doing is the content (typing game, Kniffel trainer, careful reading) | ch.1 / 1.1 | high | — |
| same, section 3 | Static start page from src/app.yaml readable without JS; app page; hash routes; app writes core, ui, data, playthroughs; runtime not changed by the app | ch.1 / 1.1 | high | — |
| `runtime/interactive/interactive.ts` (startInteractive) | Keys and component-emitted input step the core; tick every TICK; seed from ?seed; route from #id | ch.1 / 1.1 | high | — |
| `ORGANIZATION.md`, "Apps and the app overview" | An app connects to the platform only through its entry in the app overview | ch.1 / 1.1 | high | — |
| owner, 2026-10-16, review | Optional tutor as a handoff to the learner's own assistant, no model in the browser | ch.1 / 1.1 | high | — |
| owner, 2026-10-16, review | Quality goals qg-privacy, qg-checkable, qg-accessibility, qg-understandable and their order | ch.1 / 1.2 | high | — |
| coordinator's proposal; owner, 2026-10-16, confirmed | Priorities: qg-privacy high, qg-checkable high, qg-accessibility medium, qg-understandable medium | ch.1 / 1.2, ch.10 | high | — (resolved: confirmed by the owner, 2026-10-16) |
| `ORGANIZATION.md` lines 3, 13-21, 35-40 | Stakeholders: learners, creators (and their AI assistant), owner Oliver Jägle, teachers and parents; listing decided by the owner | ch.1 / 1.3 | high | — |
| tooling `scripts/verdict.ts` header; ORGANIZATION.md line 51 | Reviewers: a review agent before listing; the owner decides the listing | ch.1 / 1.3 | medium | — |

### Chapter 2

| Source path:line, symbol, or command | Derived fact or relationship | Used in | Confidence | Open question / human decision |
| --- | --- | --- | --- | --- |
| `ORGANIZATION.md` lines 25-28, 46, 50 | Static sites on GitHub Pages at lernapps.net/<repo>/; one repo per app; apps share no code at runtime | ch.2 / con-frontend-only | high | — |
| `ORGANIZATION.md` line 56; tooling `check/rules/no-request-before-click.ts`, `no-tracking.ts` | No cookies, tracking or requests to other servers before a click, checked on the built app | ch.2 / con-no-request-before-click | high | — |
| Sketch step 12, section 2; `interactive/package.json` (vite-plus 1.0.0); `vite.config.ts` (tooling preset) | Vue with TypeScript on vite-plus is fixed | ch.2 / con-vue-typescript | high | — |
| owner, 2026-10-16, conversation | Vue is fixed | ch.2 / con-vue-typescript | high | — |
| `runtime/explainer/components.ts` header; `runtime/interactive/plugin.ts` lines 9-13 | Component rules on SFC compiler output: no network, eval, new Function, innerHTML, v-html; restricted imports; browser globals only in onMounted | ch.2 / con-component-rules | high | — |
| Sketch step 12, sections 3-4 | Runtime interactive/ is not changed by the app; the app writes in the template's folders | ch.2 / con-runtime-unchanged | high | — |
| tooling `archetypes/shared/storage.ts` header; test `app-check-failing.e2e.test.ts` (storage-through-wrapper) | Storage only through the wrapper, localStorage under prefix lernapps:<app>:, failures tolerated | ch.2 / con-state-on-device | high | — |
| owner, 2026-10-16, conversation; Sketch step 12, section 3 | Quota 100 kB per app, save refuses beyond | ch.2 / con-storage-quota | high | — |
| tooling `archetypes/shared/storage.ts` (no limit in save) | Quota not built yet | ch.2 / con-storage-quota | high | — |
| `ORGANIZATION.md` lines 57-58; Sketch step 12, section 5 | WCAG 2.1 AA and 360 px: platform rule, app default, deviations declared in the entry; start page meets both; low stimulation advice only | ch.2 / con-accessibility-default | high | — |
| tooling `check/rules/accessible.ts:8`, `usable-at-360px.ts:10` (severity error) | Warning mode for apps with declared limits not built yet | ch.2 / con-accessibility-default | high | — |
| `ORGANIZATION.md` lines 61-64; owner, 2026-10-16, conversation | German for learner text, English for infrastructure; app author decides names inside the repo; architecture in English | ch.2 / con-language | high | — |
| Sketch step 12, section 2; tooling `check/rules/dependency-licence.ts` (ALLOWED); ORGANIZATION.md lines 70-79 | Libraries bundled, never from a CDN, under allowlisted licences; app repo MIT | ch.2 / con-bundled-licences | high | — |
| owner, 2026-10-16, review; `runtime/interactive/plugin.ts:41` (SIZE_BUDGET) | No size limit; con-size-budget removed; the build's SIZE_BUDGET is debt (ch.11) | ch.2 | high | — (resolves OPEN: size budget scope) |
| `ORGANIZATION.md` line 59; `runtime/interactive/render.ts:67` | Links to imprint and privacy notice in the shell's footer | ch.2 / con-imprint-privacy | high | — |
| Sketch step 12, section 4 | Architecture in docs/arc42, kept current; arc42 diff before commit, arc42 validate in lernapps check | ch.2 / con-architecture-current | high | — |
| search of tooling for "arc42 diff"/"arc42 validate" outside the plan (only scripts/build.sh, review-summary.ts) | arc42 checks not yet wired into app hooks and check | ch.2 / con-architecture-current | medium | OPEN: confirm the arc42 hook and check for apps are not built yet |

### Chapter 3

| Source path:line, symbol, or command | Derived fact or relationship | Used in | Confidence | Open question / human decision |
| --- | --- | --- | --- | --- |
| owner, 2026-10-16, review; ch.5 if-start-page, if-app-address, if-static-files, if-tutor-files, if-skill-interactive | Every actor requires an interface of chapter 5 | ch.3 / all actors | high | — (resolves OPEN: interfaces for pages, addresses, static files, tutor handoff); the commands stay open, see below |
| `ORGANIZATION.md` lines 3, 13-21 (stakeholders); ch.1 1.3 | Learners (adults and students, often in German schools), teachers and parents as users | ch.3 / actor-learner, actor-teacher-parent | high | — |
| `runtime/interactive/interactive.ts` (startInteractive); `runtime/interactive/render.ts`; owner, 2026-10-16, review | Learner plays the app page with keys and pointer input; start page readable without JavaScript; requires if-start-page, if-app-address | ch.3 / actor-learner | high | — |
| `ORGANIZATION.md` line 58; decided sketch step 12 section 3; owner, 2026-10-16, review | Start page in German, without JavaScript, for teachers and parents; requires if-start-page | ch.3 / actor-teacher-parent | high | — |
| decided sketch step 12 section 3 "What the agent writes" | The creator's assistant writes src/core, src/ui, src/data, src/playthroughs (and src/app.yaml) | ch.3 / actor-creator-assistant | high | — |
| ch.5 if-app-description, if-core-contract, if-root-component, if-playthrough-format, if-skill-interactive; owner, 2026-10-16, review | The assistant's `requires` points at the four contracts it writes against and the skill text | ch.3 / actor-creator-assistant | medium | OPEN: no interface in ch.5 for vp build, vp dev, lernapps check |
| `ORGANIZATION.md` "What every site shares" line 28; con-frontend-only; owner, 2026-10-16, review | Static files published from gh-pages to lernapps.net/<repo>/, PR previews; requires if-static-files | ch.3 / actor-github-pages | high | — |
| `ORGANIZATION.md` line 50; `tooling check/rules/entry-links-resolve.ts` header; owner, 2026-10-16, review | App connects to the platform only through its overview entry; entry URL and topic links must resolve; requires if-start-page, if-app-address | ch.3 / actor-app-overview | high | — |
| tooling `.vibe/development-plan-agentic-app-creation.md` KD-13 (fact sheet, later); `apps/schemas/entry.v1.schema.json` (no size field); owner, 2026-10-16, review | The entry's fact sheet states the app's size; not built yet | ch.3 / actor-app-overview, ch.4, ch.5 / bb-build-checks, ch.12 / term-entry | high | — |
| owner, 2026-10-16, review; `runtime/explainer/tutor.ts:1-12`, `tutorpage.ts:1-5` | The tutor is the learner's own assistant, receiving the tutor prompt and files after a click; not built for interactive apps | ch.3 / actor-learner-assistant | high | — |
| arc42 cli W021/W023/W028 (dist/cli.mjs) | Context diagram: boundary subgraph, edges from actors to the boundary, only actor-facing blocks inside | ch.3 / system-context | high | — |

### Chapter 4

| Source path:line, symbol, or command | Derived fact or relationship | Used in | Confidence | Open question / human decision |
| --- | --- | --- | --- | --- |
| decided sketch step 12, section 2 heading | "Opinionated where it makes the rules checkable, free where the learning happens"; Vue fixed; rendering, logic, decomposition free; libraries bundled | ch.4 / strategy-fixed-frame-free-app | high | — |
| decided sketch step 12, section 3; con-runtime-unchanged | Runtime frame the app does not change; app writes core, UI, data, playthroughs | ch.4 / strategy-fixed-frame-free-app | high | — |
| `runtime/interactive/interactive.ts`; `contract.ts` TICK=20 | Shell holds state, routes keys and pointer input, ticks every 20 ms, route and seed from the address | ch.4 / System decomposition | high | — |
| `runtime/interactive/plugin.ts` (two plays, SIZE_BUDGET, component rules); `e2e.ts` | Build fails on broken description, contract, non-determinism, component rules, size; browser tests via lernapps check --pre-push | ch.4 / Operational approach | high | — |
| `ORGANIZATION.md` "What every site shares" (Renovate) ; con-runtime-unchanged | Runtime and tooling reach the app as dependency updates | ch.4 / Operational approach | high | — |
| owner, 2026-10-16, review | Strategy addresses the four goals; goal-to-approach mapping | ch.4 / strategy-fixed-frame-free-app addresses | high | — |
| con-architecture-current; decided sketch step 12 section 4 | arc42 diff before commit and validate in check decided, not built | ch.4 / Operational approach | medium | OPEN: confirm not built yet for apps |
| owner, 2026-10-16, review | Tutor as handoff, no model in the browser | ch.4 | high | — |
| owner, 2026-10-16, review | No size limit; size stated in the catalog entry | ch.4 / Operational approach | high | — |

### Chapter 5

| Source path:line, symbol, or command | Derived fact or relationship | Used in | Confidence | Open question / human decision |
| --- | --- | --- | --- | --- |
| tooling `.vibe/development-plan-agentic-app-creation.md`, sketch §3 | Runtime `interactive/` the app does not change; app writes src/core, src/ui, src/data, src/playthroughs | ch.5 / bb-runtime, bb-app, bb-core, bb-ui, bb-data, bb-playthroughs | high | — |
| `runtime/interactive/plugin.ts:1-21`, `interactive()` | Build step: validation, component rules, core and playthrough checks, pages, 404; app adds it via vite.config.ts | ch.5 / bb-build, if-build-plugin, bb-build-checks, bb-not-found-page | high | — |
| `tooling archetypes/shared/preset.ts:9` (relative URLs); `generator/app/.github/workflows/pages.yml`; owner, 2026-10-16, review | The build's static files, served by GitHub Pages | ch.5 / if-static-files | high | — |
| `runtime/interactive/render.ts`; `runtime/interactive/interactive.ts` (seedParam, routeOf); owner, 2026-10-16, review | Start page at lernapps.net/<repo>/ and app address app/?seed=<n>#<route> as interfaces for the actors (provider bb-app-page chosen) | ch.5 / if-start-page, if-app-address | high | — |
| owner, 2026-10-16, review | Size not limited; the build check is removed from the model; optional loading indicator (progress bar at start, not built) | ch.5 / bb-build-checks, bb-loading-indicator | high | — |
| `runtime/interactive/plugin.ts` `coreProblems`, `play` | Exports checked, every route starts, each playthrough played twice without tick, states compared | ch.5 / bb-core-check, bb-build-playthroughs | high | — |
| `runtime/interactive/load.ts:1-6`, `loadInteractive` | app.yaml and playthroughs validated against schemas plus German first, languages, unique ids, ≥1 playthrough, known routes | ch.5 / bb-app-validation, if-app-description, if-playthrough-format | high | — |
| `runtime/interactive/load.ts:106` `languageListProblems(app.languages, Object.keys(MESSAGES))` | An app may declare only languages the runtime has texts for (de, en) | ch.5 / bb-page-tree | high | — |
| `runtime/interactive/render.ts:1-9, 86, 109-111` | Start page static with noscript and no script; app page with noscript, route anchors, `.interactive-app` with data-routes | ch.5 / bb-start-page, bb-app-page | high | — |
| `runtime/shared/pages.ts:1-4`, `notFoundPage` (l.67) | Page tree per language, German at root, switch of plain links, relative URLs; 404 page | ch.5 / bb-page-tree, bb-not-found-page | high | — |
| `runtime/explainer/components.ts:1-15, 17-19`, `codeProblems` (l.407), `sourceScope` | Component rules on SFC compiler output, reused by interactive with scope src/ | ch.5 / bb-component-rules | high | — |
| `runtime/interactive/interactive.ts`, `startInteractive` | Shell mounts root with props state, lang, onInput; holds state; mirrors STATE_PROPERTY on host | ch.5 / bb-shell, if-start-interactive, if-state-property, if-root-component | high | — |
| `runtime/interactive/interactive.ts` keydown handler, `CONTROLS`, `input` | Keys to step except on controls or with modifiers; emitted input keys stepped; changed state prevents default | ch.5 / bb-input-router | high | — |
| `runtime/interactive/contract.ts` `TICK = 20`; `interactive.ts` setInterval | Clock calls tick every 20 ms when the core has it | ch.5 / bb-clock | high | — |
| `runtime/interactive/interactive.ts` `routeOf`, hashchange | Route from #id else first route; restart on new route | ch.5 / bb-hash-router | high | — |
| `runtime/interactive/interactive.ts` seedParam | Seed from ?seed=n else random | ch.5 / bb-seed | high | — |
| `runtime/interactive/contract.ts` `Core`, `Playthrough` | Core contract start(seed, route), step(state, key), tick?(state, dt); playthrough seed, route, steps of keys with state/announce | ch.5 / if-core-contract, if-playthrough-format | high | — |
| `runtime/interactive/e2e.ts:1-15`, `interactiveTests` | Pages without JS in every language, playthroughs in the browser with state and polite live region; desktop and 360 px | ch.5 / bb-browser-playthroughs, if-interactive-tests | high | — |
| `runtime/explainer/tutor.ts:1-12`, `tutorpage.ts:1-5`, `prompt.ts`, `explainer.ts:12,101` | Tutor handoff (prompt, providers, clipboard, tutor.md, llms.txt, Zurück zum Tutor) built for the explainer only; tutor prompt and files as interface | ch.5 / bb-tutor-handoff, if-tutor-files | high | — |
| owner, 2026-10-16, review | No model in the browser; bb-tutor-in-browser removed | ch.5 | high | — (resolves OPEN: tutor variant) |
| `runtime/explainer/tasks.ts:1-7` | Task numbers built for the explainer only | ch.5 / bb-task-numbers | high | — |
| sketch §3 "Optional, for apps with tasks"; `runtime/explainer/components.ts:9-14`, `shared/examples.ts:1-5`; owner, 2026-10-16, review | Exercise contract: optional exports, describe(state, lang) for task and solution text (tutor, task numbers), examples of accepted and rejected answers checked at build; not built for interactive | ch.5 / bb-exercise-contract | high | — |
| owner, 2026-10-16, conversation | No settings dialog, less motion, sound or pause in scope now | ch.5 / bb-settings | high | — |
| brief, "Generic components to cover" | "time limit off" as an example setting | ch.5 / bb-settings | medium | — |
| `tooling archetypes/shared/preset.ts:1-25` | Preset: lint with lernapps rules, type check, format, tests, pre-commit, relative URLs | ch.5 / bb-preset, if-preset, bb-lint-rules | high | — |
| `ls tooling/lint/rules` | Eight lint rules (learner-text-german, no-request-before-click, storage-through-wrapper, suppression-reason, four vue-component rules) | ch.5 / bb-lint-rules | high | — |
| `ls tooling/check/rules`; `check/check.ts:1-4` | lernapps check rules incl. accessible, usable-at-360px, no-request-before-click, no-tracking, links-resolve, entry-links-resolve | ch.5 / bb-lernapps-check | high | — |
| sketch §4, §7 step 2; `grep arc42 tooling/check` (only comments) | `arc42 validate` in lernapps check planned, not built yet | ch.5 / bb-lernapps-check | medium | — |
| `tooling archetypes/shared/playwright.ts:1-6` | e2e against built app, Chromium desktop and 360 px | ch.5 / bb-playwright-config | high | — |
| `tooling archetypes/shared/storage.ts:1-16` | Only storage, localStorage under app prefix, try/catch | ch.5 / bb-small-storage, if-device-storage | high | — |
| owner, 2026-10-16, conversation; `grep -n quota storage.ts` (no match) | Quota 100 kB per app decided, not built yet | ch.5 / bb-small-storage | high | — |
| owner, 2026-10-16, review | IndexedDB left out; bb-large-storage removed | ch.5 | high | — |
| `ls tooling/skills` (no lernapps-interactive); `tooling/guidance` (plan-template.md, increment-template.md); `tooling/skills/lernapps-app/SKILL.md`; owner, 2026-10-16, review | Skill lernapps-interactive not built; the plan template and lernapps-app exist for every archetype, no other guidance for this archetype yet | ch.5 / bb-skill-interactive, if-skill-interactive | high | — |
| `src/core/index.ts:4`; `src/ui/App.vue:9` | Core imports src/data JSON; UI imports src/messages JSON for the translator | ch.5 / if-app-data, if-messages | high | — |
| `tooling archetypes/shared/a11y.ts:21,31,37` | announce, moveFocus, prefersReducedMotion | ch.5 / bb-a11y, if-a11y | high | — |
| `tooling archetypes/shared/i18n.ts:1-6` | translator over src/messages | ch.5 / bb-i18n, if-translator, bb-messages | high | — |
| `src/ui/App.vue:5-7` | UI imports announce and translator; props state, lang; emits input | ch.5 / bb-ui, if-root-component | high | — |
| `src/main.ts` | Glue calls startInteractive(core, App) | ch.5 / bb-main | high | — |
| `src/core/index.ts:1-4` | Core pure, imports data/lessons.json | ch.5 / bb-core, bb-data | high | — |
| `vite.config.ts`, `e2e/interactive.e2e.ts`, `.arc42ignore` | App bound by thin root files; root files excluded from arc42 claims | ch.5 / bb-app | high | — |
| `src/ui/App.vue`, grep storage in src/ (none) | Template app does not use the storage | ch.5 / if-device-storage | high | — |

### Chapter 6

| Source path:line, symbol, or command | Derived fact or relationship | Used in | Confidence | Open question / human decision |
| --- | --- | --- | --- | --- |
| `runtime/interactive/render.ts:1-9`; `runtime/interactive/e2e.ts:7-11` | Start page static from app.yaml, no script, noscript note, link into app, route links, how to play, competencies, background | ch.6 / scenario-start-page | high | — |
| `runtime/shared/pages.ts:1-4`, `notFoundPage` | Language trees with plain-link switch and alternates; 404 leads to start page | ch.6 / scenario-start-page | high | — |
| `runtime/interactive/interactive.ts:9-15, 25-70` (`startInteractive`) | Seed from ?seed else random, route from hash else first; keys to step except controls and modifiers; changed state prevents default; emitted input stepped; tick every TICK ms; hashchange restarts core with same seed, marks aria-current | ch.6 / scenario-play | high | — |
| `src/main.ts`; `src/ui/App.vue:5-7` | Glue calls startInteractive; UI uses translator and announce | ch.6 / scenario-play | high | — |
| `runtime/interactive/contract.ts` `TICK = 20` | Clock period 20 ms | ch.6 / scenario-play | high | — |
| `tooling archetypes/shared/storage.ts:1-16` | load/save/remove under prefix; blocked or full storage: save false, app keeps working | ch.6 / scenario-device-storage | high | — |
| owner, 2026-10-16, conversation; `grep -n quota storage.ts` (no match) | Quota 100 kB decided, not built | ch.6 / scenario-device-storage | high | — |
| `grep -rn storage src/` (none) | Template app does not use the storage | ch.6 / scenario-device-storage | high | — |
| `runtime/interactive/plugin.ts:1-21` | Build order: validate, component rules, core in own Vite server, exports, routes start, playthroughs twice without tick, then pages, 404; one line per problem; vp dev renders per request | ch.6 / scenario-build | high | — |
| `vite.config.ts` | interactive() inside lernapps() preset | ch.6 / scenario-build | high | — |
| `runtime/interactive/e2e.ts:1-16, 56`; `tooling archetypes/shared/playwright.ts:1-7` | lernapps check --pre-push runs e2e on built app via vp preview on free port, Chromium desktop and 360 px, reduced motion; no-JS checks; playthroughs at app/?seed#route with state and polite live region; check adds axe and width | ch.6 / scenario-browser-playthroughs | high | — |
| `tooling archetypes/shared/hooks/pre-push`; `generator/app/.github/workflows/pages.yml:3-5` | pre-push hook and CI run lernapps check | ch.6 / scenario-browser-playthroughs | high | — |
| `runtime/explainer/prompt.ts:1-8`, `tutor.ts:1-11` | Explainer tutor: copy button, provider links, tutor.md, llms.txt, nothing before a click | ch.6 / scenario-tutor | high | — |
| owner, 2026-10-16, review | Tutor for interactive apps works as in the explainer, no model in the browser | ch.6 / scenario-tutor | high | — |

### Chapter 7

| Source path:line, symbol, or command | Derived fact or relationship | Used in | Confidence | Open question / human decision |
| --- | --- | --- | --- | --- |
| `ORGANIZATION.md:46` | A repo x with Pages is served at lernapps.net/x/ | ch.7 / dn-github-pages | high | — |
| `tooling actions/app-publish/action.yml:3-5` | Publish to gh-pages branch served from root; only lernapps org repos at lernapps.net/<repo>/, others at <owner>.github.io/<repo>/ | ch.7 / dn-github-pages | high | — |
| `tooling generator/app/.github/workflows/pages.yml:3-18, 33-61` | Jobs app (lernapps check), deploy on main, preview on PRs from the repo at pr-preview/pr-<n>/, not indexed, removed on close; plan/docs-only changes publish nothing | ch.7 / env-ci, dn-ci-runner, dn-pr-preview | high | — |
| `tooling package.json` `appTemplates.archetypes` = explainer, quiz; `grep interactive generator/create.ts` (none) | Tooling has no interactive archetype yet, so no generated workflow for interactive apps | ch.7 / Deployment overview | high | — |
| owner, 2026-10-16, review | Interactive apps get the same Pages workflow (check, publish, preview) in step 2 of the plan | ch.7 / env-ci, dn-ci-runner, dn-github-pages, dn-pr-preview | high | — (resolves OPEN: same Pages workflow) |
| `app-templates .github/workflows/check.yml:1-12` | Template folders are checked by app-templates' CI with lernapps check | ch.7 / Deployment overview | high | — |
| `tooling archetypes/shared/hooks/pre-commit`, `pre-push`; `install-hooks.ts:1-4` | Pre-commit fast checks, pre-push heavy checks; hooks not installed in a folder inside another repo | ch.7 / dn-creator-machine | high | — |
| `runtime/interactive/plugin.ts:20-21` | vp dev serves the pages rendered per request | ch.7 / dn-creator-machine | high | — |
| `tooling archetypes/shared/preset.ts:9` | Build with relative URLs, works under any path | ch.7 / dn-github-pages | high | — |
| `runtime/interactive/interactive.ts:1-15`; `storage.ts:1-3` | Client module runs shell, core, UI in browser; localStorage under app prefix in shared origin | ch.7 / dn-learner-browser | high | — |
| `runtime/interactive/plugin.ts:13-17` | The core also runs at build in Node (core check, playthroughs) | ch.7 / dn-creator-machine, dn-ci-runner | high | — |

### Chapter 8

| Source path:line, symbol, or command | Derived fact or relationship | Used in | Confidence | Open question / human decision |
| --- | --- | --- | --- | --- |
| `runtime/interactive/contract.ts:1-7, Core` | Core pure TS without DOM, state plain JSON; runtime keeps state; components only show it; runs in Node and browser | ch.8 / concept-core-and-shell | high | — |
| `contract.ts:1-3`; `interactive.ts:29-30`; `plugin.ts:13-17` | Deterministic by seed; seed from ?seed else random; build plays twice | ch.8 / concept-determinism | high | — |
| `contract.ts:5-7, PlaythroughStep`; `e2e.ts:12-15` | Playthrough = seed, route, steps of keys with state/announcement; build without ticks, browser same keys | ch.8 / concept-playthroughs | high | — |
| sketch §6; `grep -n -i "property" plugin.ts` (only an unrelated comment); owner, 2026-10-16, review | Core property tests over fixed seeds stay planned; time steps decided, not built | ch.8 / concept-playthroughs | high | — |
| `render.ts:1-9`; `e2e.ts:7-11` | Start page without script; app page noscript note with link back; plain links; e2e checks without JS per language | ch.8 / concept-readable-without-js | high | — |
| `pages.ts:1-4`; `load.ts:106`; `i18n.ts:1-6` | German at root, others below /<lang>/; only runtime-supported languages; texts via translator | ch.8 / concept-languages | high | — |
| `ORGANIZATION.md:57`; sketch §5; owner, 2026-10-16, conversation | WCAG 2.1 AA and 360 px default, limits declared in entry, warnings then | ch.8 / concept-accessibility | high | — |
| ch.2 con-accessibility-default (wave 1) | Warnings for declared limits not built yet | ch.8 / concept-accessibility | medium | — |
| `a11y.ts:21,31,37`; `interactive.ts:22,58`; `check/rules/accessible.ts`, `usable-at-360px.ts` | announce, moveFocus; keys on controls stay theirs; check runs axe and width | ch.8 / concept-accessibility | high | — |
| `plugin.ts:9-12`; `runtime/explainer/components.ts`; sketch §2 | Component rules on SFC output and lint rules; Vue fixed so they hold for every app | ch.8 / concept-component-rules | high | — |
| `storage.ts:1-3, 16-17`; owner, 2026-10-16, conversation | localStorage via wrapper, prefix lernapps:<app>:, wrapped access; quota 100 kB decided not built | ch.8 / concept-device-storage | high | — |
| `interactive.ts:31-34, 61-66`; `render.ts` route anchors; sketch §3 | Routes in app.yaml as app/#id, restart on new route; entry topics and entry-links-resolve | ch.8 / concept-hash-routes | high | — |
| owner, 2026-10-16, review | concept-size-budget removed | ch.8 | high | — (resolves OPEN: size budget scope) |
| `runtime/explainer/prompt.ts:1-8`; owner, 2026-10-16, review | Tutor optional, not built for interactive; handoff to the learner's own assistant after a click | ch.8 / concept-tutor | high | — |
| sketch §5; owner, 2026-10-16, conversation; owner, 2026-10-16, review; `ls tooling/skills` (no lernapps-interactive) | Low stimulation only advice of the skill lernapps-interactive (bb-skill-interactive implements it); skill not written yet; no settings now | ch.8 / concept-low-stimulation | high | — |

### Chapter 9

| Source path:line, symbol, or command | Derived fact or relationship | Used in | Confidence | Open question / human decision |
| --- | --- | --- | --- | --- |
| `lernapps/tooling .vibe/development-plan-agentic-app-creation.md:363-368` | Vue with TypeScript fixed so one set of component rules, lint rules and vue-tsc hold; decomposition, data, logic, rendering free | ch.9 / dec-vue-fixed | high | — |
| owner, 2026-10-16, conversation | Vue is fixed | ch.9 / dec-vue-fixed | high | — |
| `lernapps/tooling .vibe/development-plan-agentic-app-creation.md:357-360` | One archetype, not one per kind; kinds become recipes in the skill; apps needing explanation pages are explainers | ch.9 / dec-one-archetype | high | — |
| `runtime/interactive/contract.ts:1-22`, `interactive.ts:36,67` | The runtime keeps the state; components only show it; tick(state, TICK) every TICK = 20 ms when the core has tick | ch.9 / dec-runtime-owns-state | high | — |
| `lernapps/tooling .vibe/development-plan-agentic-app-creation.md:384-386` vs `contract.ts:15-18` | Sketch names start(seed), step(state, input), tick(state, dt); the runtime refined them to start(seed, route), step(state, key) and a fixed 20 ms tick | ch.9 / dec-runtime-owns-state, dec-keys-as-input, dec-start-seed-route | medium | refinements made by the runtime (commit c5e7285, 2026-10-16), not separately decided by the owner; status accepted because built and in force |
| `runtime/interactive/contract.ts:9-14`, `interactive.ts:50-59,69`, `interactive/src/ui/App.vue:12,38` | key = KeyboardEvent.key; ignored key keeps its default (Tab); pointer input as a key emitted as input by the root component | ch.9 / dec-keys-as-input | high | — |
| agent inference | Keys as input supports qg-accessibility (keyboard operation, Tab keeps focus movement) | ch.9 / dec-keys-as-input addresses | low | OPEN: confirm that dec-keys-as-input should address qg-accessibility |
| `runtime/interactive/interactive.ts:29-36,61-64`; `lernapps/tooling .vibe/development-plan-agentic-app-creation.md:381` | Seed from ?seed=<n> else random; route of the address passed to start and on hashchange; routes so entry topics point somewhere | ch.9 / dec-start-seed-route | high | — |
| `lernapps/tooling .vibe/development-plan-agentic-app-creation.md:388,423-424`; `runtime/interactive/plugin.ts:14-17`; `e2e.ts:12-15` | Playthroughs as data (keys, expected state/announcement), played twice by the build and with the keyboard in the browser | ch.9 / dec-playthroughs-as-data | high | — |
| `lernapps/tooling .vibe/development-plan-agentic-app-creation.md:378-380`; owner, 2026-10-16, conversation; owner, 2026-10-16, review | localStorage through the wrapper, 100 kB quota per app, shared 5 MiB, save refuses beyond; IndexedDB left out; shared origin accepted | ch.9 / dec-small-storage | high | — |
| `tooling archetypes/shared/storage.ts:36-45` | save has no quota today | ch.9 / dec-small-storage | high | — |
| `lernapps/tooling .vibe/development-plan-agentic-app-creation.md:412-420`; `dotgithub ORGANIZATION.md:57-58`; owner, 2026-10-16, conversation | WCAG 2.1 AA and 360 px platform rules, app default, deviations declared in the entry, warnings then; start page meets both; low stimulation advice only | ch.9 / dec-accessibility-default | high | — |
| owner, 2026-10-16, conversation | No settings dialog, less motion, sound or pause in scope now | ch.9 / dec-no-settings | high | — |
| `lernapps/tooling .vibe/development-plan-agentic-app-creation.md:393-408` | arc42 in docs/arc42, English and minimal; frame from tooling, app adds own part; checked only by arc42 diff --staged --strict and arc42 validate; responsibilities not checked | ch.9 / dec-arc42-in-app | high | — |
| owner, 2026-10-16, review | Tutor as handoff to the learner's own assistant, accepted; a model in the browser rejected | ch.9 / dec-tutor-variant | high | — (resolves OPEN: tutor variant) |
| owner, 2026-10-16, review | Playthrough time steps accepted, not built | ch.9 / dec-playthroughs-as-data | high | — |

### Chapter 10

| Source path:line, symbol, or command | Derived fact or relationship | Used in | Confidence | Open question / human decision |
| --- | --- | --- | --- | --- |
| owner, 2026-10-16, review | The four goals qg-privacy, qg-checkable, qg-accessibility, qg-understandable; qg-small dropped with qs-size-budget and qs-storage-quota | ch.10 / all quality goals | high | — |
| coordinator's proposal; owner, 2026-10-16, confirmed | Priorities high, high, medium, medium | ch.10 / all quality goals | high | — (resolved: confirmed by the owner, 2026-10-16) |
| `tooling check/rules/no-request-before-click.ts`; `check/visit.ts` | Requests to other hosts during page load are blocked, recorded, errors | ch.10 / qs-no-request-before-click | high | — |
| `tooling lint/rules/storage-through-wrapper.ts`, `vue-component-no-network.ts`; `archetypes/shared/storage.ts` prefix lernapps:<app>: | Direct storage, cookies and network calls reported; storage through createStorage under the app prefix | ch.10 / qs-state-on-device | high | — |
| `runtime/interactive/plugin.ts` lines 16, 145-152 | Playthroughs played twice; differing states fail the build | ch.10 / qs-deterministic-core | high | — |
| `runtime/interactive/e2e.ts` header | Playthroughs at app/?seed=<seed>#<route>, state and polite announcement after each step, no console error, desktop and 360 px, run by lernapps check --pre-push | ch.10 / qs-playthrough-in-browser | high | — |
| `tooling check/rules/accessible.ts` | axe-core WCAG 2.1 A and AA, severity error | ch.10 / qs-axe-clean | high | — |
| `tooling check/rules/usable-at-360px.ts` | No page wider than 360 px, severity error | ch.10 / qs-usable-at-360px | high | — |
| decided sketch step 12 section 5; con-accessibility-default | Warnings for apps with declared limits decided, not built | ch.10 / qs-axe-clean | high | — |
| decided sketch step 12 section 4 | arc42 diff --staged --strict before commit, ~0.2 s, unclaimed code and blocks without prose fail; not built for apps | ch.10 / qs-architecture-current | medium | OPEN: confirm not built yet for apps |

### Chapter 11

| Source path:line, symbol, or command | Derived fact or relationship | Used in | Confidence | Open question / human decision |
| --- | --- | --- | --- | --- |
| `runtime/interactive/plugin.ts:17`; `contract.ts:28-38` (PlaythroughStep has only keys, state, announce) | Build never calls tick; playthroughs cannot express time | ch.11 / risk-time-not-replayed | high | — |
| `runtime/interactive/interactive.ts:67`; `e2e.ts:127-148`; `interactive/src/core/index.ts:89-94`; `src/data/lessons.json:2-3` | In the browser the clock runs between key presses; the template's core counts a letter as a miss after 5 s, so browser playthroughs depend on typing speed | ch.11 / risk-time-not-replayed | high | — |
| `lernapps/tooling .vibe/development-plan-agentic-app-creation.md:436-437` | The pilot is the real-time typing game, which puts the most pressure on real time | ch.11 / risk-time-not-replayed | high | — |
| owner, 2026-10-16, review | Mitigation: a playthrough step that lets n ticks pass, in the build and in the browser; not built yet | ch.11 / risk-time-not-replayed | high | — (resolves OPEN: time step) |
| `lernapps/tooling .vibe/development-plan-agentic-app-creation.md:416-417,431-435`; ch.2 con-accessibility-default | Entry field for limits and warnings planned, not built; accessible and usable-at-360px are errors for every app today | ch.11 / risk-accessibility-limits-not-built | high | — |
| `tooling archetypes/shared/storage.ts:36-45`; owner, 2026-10-16, conversation | Quota of 100 kB decided, wrapper has no limit | ch.11 / risk-storage-quota-not-built | high | — |
| `tooling archetypes/shared/storage.ts:1-3,15-17`; `lernapps/tooling .vibe/development-plan-agentic-app-creation.md:378-379` | All apps share one origin and its 5 MiB localStorage; separation only by the prefix lernapps:<app>: from a name the app chooses | ch.11 / risk-shared-origin-storage | high | — |
| agent inference; owner, 2026-10-16, review | Clearing site data or browser eviction loses every app's values; a duplicate storage name collides; severity medium, accepted | ch.11 / risk-shared-origin-storage | high | — (resolves OPEN: severity and acceptance) |
| owner, 2026-10-16, review; ch.5 bb-tutor-handoff | Tutor decided as handoff, built only for the explainer | ch.11 / risk-tutor-not-built | high | — |
| `lernapps/tooling .vibe/development-plan-agentic-app-creation.md:403-405,431-432`; ch.2 con-architecture-current | arc42 diff in pre-commit and arc42 validate in lernapps check planned, not wired | ch.11 / risk-arc42-checks-not-wired | medium | OPEN: confirm not built yet (from ch.2) |
| owner, 2026-10-16, review; `runtime/interactive/plugin.ts:21-22,41,217-230` | No size limit decided, but SIZE_BUDGET = 100 kB still fails the build; technical debt, to be removed | ch.11 / risk-size-budget-left | high | — |
| `lernapps/tooling .vibe/development-plan-agentic-app-creation.md:423` vs `runtime/interactive/plugin.ts`; owner, 2026-10-16, review | Core property tests over fixed seeds stay planned, not built | ch.11 / risk-no-core-property-tests | high | — |
| agent inference | Severities and priority order of all risks | ch.11 / all risks | low | OPEN: confirm severities and order |

### Chapter 12

| Source path:line, symbol, or command | Derived fact or relationship | Used in | Confidence | Open question / human decision |
| --- | --- | --- | --- | --- |
| `runtime/interactive/contract.ts:1-22` | Core: pure TypeScript, no DOM, deterministic by seed, plain JSON state, start/step/tick; TICK = 20 | ch.12 / term-core, term-tick | high | — |
| `runtime/interactive/interactive.ts:9-15,29-69` | Shell mounts root, holds state, routes keys, ticks, takes route and seed (positive integer, else random) | ch.12 / term-shell, term-seed, term-route | high | — |
| `lernapps/tooling .vibe/development-plan-agentic-app-creation.md:373`; ch.2 con-runtime-unchanged | Runtime interactive/ of app-templates, not changed by the app | ch.12 / term-runtime | high | — |
| `dotgithub ORGANIZATION.md:3,14,50-51` | Creators list apps; one entry per app in apps/entries/, schema-checked, the only link to an app; app overview provides the catalog; owner decides listing | ch.12 / term-creator, term-entry, term-catalog | high | — |
| `runtime/interactive/plugin.ts:18-20`; `e2e.ts:7-11` | Start page without script from app.yaml; app page loads the client module, noscript note links back | ch.12 / term-start-page, term-app-page | high | — |
| `runtime/interactive/contract.ts:5-7,26-38` | Playthrough: seed, route, steps of keys with expected state or announcement | ch.12 / term-playthrough | high | — |
| owner, 2026-10-16, review | Tutor: the learner's own assistant, handed the task after a click | ch.12 / term-tutor | high | — |

## Owner, 2026-10-16, size per component

| Source path:line, symbol, or command | Derived fact or relationship | Used in | Confidence | Open question / human decision |
| --- | --- | --- | --- | --- |
| owner, 2026-10-16, conversation | The explainer keeps a fixed size per component; the figure (20 kB) is an implementation detail and stays out of the architecture | explainer ch.9 / dec-explainer-component-size; ch.11 / risk-size-budget-left | high | — |

## Typed inputs, time steps, libraries, no size limit built (owner decisions, 2026-10-16)

| Source path:line, symbol, or command | Derived fact or relationship | Used in | Confidence | Open question / human decision |
| --- | --- | --- | --- | --- |
| `runtime/interactive/contract.ts` (`Input`, `KeyInput`, `ActionInput`, `Core.step(state, input)`, `PlaythroughStep` with `keys`, `inputs`, `ticks`, `CLOCK_PROPERTY`) | The core takes a typed input (key or action, extensible); a playthrough step has keys or inputs, then ticks; the tests' clock is the global `lernappsClock` | interactive bb-shell, if-core-contract, if-root-component, if-test-clock, bb-interactive-playthroughs, dec-typed-input, term-input, term-playthrough; risk-input-only-keys removed | high | — |
| `runtime/interactive/plugin.ts` (`play`), `runtime/interactive/e2e.ts` (`stepTicks`, `emitInput`) | The build calls tick n times per step; the browser presses keys, emits actions through the root component and steps ticks on the tests' clock | interactive bb-build, bb-e2e, scenario-interactive-build, concept-playthroughs, dec-playthroughs-as-data, qs-*, term-tick; risk-time-not-replayed removed | high | — |
| `runtime/interactive/plugin.ts` (no `SIZE_BUDGET`) | The interactive build limits no size | generic dec-no-size-limit; risk-size-budget-left removed | high | — |
| owner, 2026-10-16 (relayed by the coordinator); `runtime/explainer/components.ts` (`sourceScope`, `packages`) | An interactive app's components may import the libraries in the dependencies of its package.json; URL imports stay forbidden | interactive dec-libraries, bb-component-rules; generic con-component-rules, concept component rules | high | — |
| lernapps/tooling#90 merged | The skill lernapps-interactive exists | generic bb-skills, interactive building blocks intro; risk-interactive-skill-missing removed | high | — |
