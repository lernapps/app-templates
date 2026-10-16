# Architecture evidence

Traceability of the facts in the chapters of this architecture to their sources. Not an arc42 chapter; the
validator does not parse it. Owner decisions count as evidence.

## Sources inventoried

| Source path:line, symbol, or command | Derived fact or relationship | Used in | Confidence | Open question / human decision |
| --- | --- | --- | --- | --- |
| `lernapps/tooling .vibe/development-plan-agentic-app-creation.md`, "Sketch: the interactive archetype (step 12, decided by the owner)" | Scope, the opinionated frame (Vue fixed), shell and app split, arc42 in the app, accessibility default with declared limits, tests | all chapters | high | — |
| owner, 2026-10-16, conversation | Small storage: localStorage through the tooling wrapper, 100 kB per app; IndexedDB wrapper only when an app needs it; no settings, motion, sound or pause now; low stimulation as advice; architecture English and minimal; note all generic components, optional ones too | ch.2, ch.5, ch.8, ch.9 | high | — |
| owner, 2026-10-16, conversation | An optional client-side AI tutor | ch.1, ch.5 | high | OPEN: handoff to the learner's own assistant (as the explainer) or a model running in the browser? |
| `lernapps/.github ORGANIZATION.md`, "Every page, in every repo" | No cookies, no tracking, no requests to other servers before a click; WCAG 2.1 AA and 360 px for platform pages, default for apps | ch.2 | high | — |
| `runtime/interactive/contract.ts` | Core contract start(seed, route), step(state, key), tick(state, dt); TICK = 20; playthrough format | ch.5, ch.6 | high | — |
| `runtime/interactive/interactive.ts` (startInteractive) | Shell: state holder, input routing, clock, hash routes, seed from the address | ch.5, ch.6 | high | — |
| `runtime/interactive/plugin.ts`, `load.ts`, `render.ts` | Build: start page and app page, validation, core and playthrough checks, size budget 100 kB | ch.5, ch.6 | high | — |
| `runtime/interactive/e2e.ts` (interactiveTests) | Browser playthroughs, pages without JavaScript, 360 px | ch.5, ch.10 | high | — |

## Rows from the chapters

### Chapter 1

| Source path:line, symbol, or command | Derived fact or relationship | Used in | Confidence | Open question / human decision |
| --- | --- | --- | --- | --- |
| tooling `.vibe/development-plan-agentic-app-creation.md`, Sketch step 12, section 1 | Scope: apps whose doing is the content (typing game, Kniffel trainer, careful reading) | ch.1 / 1.1 | high | — |
| same, section 3 | Static start page from src/app.yaml readable without JS; app page; hash routes; app writes core, ui, data, playthroughs; runtime not changed by the app | ch.1 / 1.1 | high | — |
| `runtime/interactive/interactive.ts` (startInteractive) | Keys and component-emitted input step the core; tick every TICK; seed from ?seed; route from #id | ch.1 / 1.1 | high | — |
| `ORGANIZATION.md`, "Apps and the app overview" | An app connects to the platform only through its entry in the app overview | ch.1 / 1.1 | high | — |
| owner, 2026-10-16, conversation | Optional client-side AI tutor | ch.1 / 1.1 | high | OPEN: handoff to the learner's own assistant or a model in the browser? |
| agent inference from Sketch step 12 sections 2, 4, 5, 6 and ORGANIZATION.md "Every page" | Proposed quality goals qg-privacy, qg-checkable, qg-accessibility, qg-small, qg-understandable and their order | ch.1 / 1.2 | low | OPEN: owner to confirm set, order, priorities and ids |
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
| owner, 2026-10-16, conversation; Sketch step 12, section 3 | Quota 100 kB per app, save refuses beyond; IndexedDB wrapper only when needed | ch.2 / con-storage-quota | high | — |
| tooling `archetypes/shared/storage.ts` (no limit in save) | Quota not built yet | ch.2 / con-storage-quota | high | — |
| `ORGANIZATION.md` lines 57-58; Sketch step 12, section 5 | WCAG 2.1 AA and 360 px: platform rule, app default, deviations declared in the entry; start page meets both; low stimulation advice only | ch.2 / con-accessibility-default | high | — |
| tooling `check/rules/accessible.ts:8`, `usable-at-360px.ts:10` (severity error) | Warning mode for apps with declared limits not built yet | ch.2 / con-accessibility-default | high | — |
| `ORGANIZATION.md` lines 61-64; owner, 2026-10-16, conversation | German for learner text, English for infrastructure; app author decides names inside the repo; architecture in English | ch.2 / con-language | high | — |
| Sketch step 12, section 2; tooling `check/rules/dependency-licence.ts` (ALLOWED); ORGANIZATION.md lines 70-79 | Libraries bundled, never from a CDN, under allowlisted licences; app repo MIT | ch.2 / con-bundled-licences | high | — |
| `runtime/interactive/plugin.ts:21-22, 41, 217-230` (SIZE_BUDGET) | 100 kB gzip of the app's own src/ code; Vue, runtime and libraries not counted | ch.2 / con-size-budget | high | OPEN: contradicts Sketch step 12 section 2 ("size budget for the whole app") |
| Sketch step 12, section 2 | Libraries inside a size budget for the whole app | ch.2 / con-size-budget | high | OPEN: contradicts runtime/interactive/plugin.ts (own code only) |
| `ORGANIZATION.md` line 59; `runtime/interactive/render.ts:67` | Links to imprint and privacy notice in the shell's footer | ch.2 / con-imprint-privacy | high | — |
| Sketch step 12, section 4 | Architecture in docs/arc42, kept current; arc42 diff before commit, arc42 validate in lernapps check | ch.2 / con-architecture-current | high | — |
| search of tooling for "arc42 diff"/"arc42 validate" outside the plan (only scripts/build.sh, review-summary.ts) | arc42 checks not yet wired into app hooks and check | ch.2 / con-architecture-current | medium | OPEN: confirm the arc42 hook and check for apps are not built yet |

### Chapter 3

| Source path:line, symbol, or command | Derived fact or relationship | Used in | Confidence | Open question / human decision |
| --- | --- | --- | --- | --- |
| ch.5 interfaces (if-*) | Chapter 5 defines only code contracts inside the boundary; no interface for built pages, addresses, build/check commands or the tutor handoff | ch.3 / all actors | high | OPEN: should ch.5 add interfaces for the pages, the addresses, the commands and the tutor handoff? |
| `ORGANIZATION.md` lines 3, 13-21 (stakeholders); ch.1 1.3 | Learners (adults and students, often in German schools), teachers and parents as users | ch.3 / actor-learner, actor-teacher-parent | high | — |
| `runtime/interactive/interactive.ts` (startInteractive); `runtime/interactive/render.ts` | Learner plays the app page with keys and pointer input; start page readable without JavaScript | ch.3 / actor-learner | high | OPEN: no interface in ch.5 for pages and addresses |
| `ORGANIZATION.md` line 58; decided sketch step 12 section 3 | Start page in German, without JavaScript, for teachers and parents | ch.3 / actor-teacher-parent | high | OPEN: no interface in ch.5 for the start page |
| decided sketch step 12 section 3 "What the agent writes" | The creator's assistant writes src/core, src/ui, src/data, src/playthroughs (and src/app.yaml) | ch.3 / actor-creator-assistant | high | — |
| ch.5 if-app-description, if-core-contract, if-root-component, if-playthrough-format | The assistant's `requires` points at the four contracts it writes against | ch.3 / actor-creator-assistant | medium | OPEN: no interface in ch.5 for vp build, vp dev, lernapps check |
| `ORGANIZATION.md` "What every site shares" line 28; con-frontend-only | Static files published from gh-pages to lernapps.net/<repo>/, PR previews | ch.3 / actor-github-pages | high | OPEN: no interface in ch.5 for the built static files |
| `ORGANIZATION.md` line 50; `tooling check/rules/entry-links-resolve.ts` header | App connects to the platform only through its overview entry; entry URL and topic links must resolve | ch.3 / actor-app-overview | high | OPEN: no interface in ch.5 for the start page URL and #route deep links |
| owner, 2026-10-16, conversation; `runtime/explainer/tutor.ts`; ch.5 bb-tutor-handoff | Learner's own assistant exists only if the tutor is a handoff; not built for interactive apps | ch.3 / actor-learner-assistant | low | OPEN: tutor variant (handoff vs. model in the browser); OPEN: interface for the handoff |
| arc42 cli W021/W023/W028 (dist/cli.mjs) | Context diagram: boundary subgraph, edges from actors to the boundary, only actor-facing blocks inside | ch.3 / system-context | high | — |

### Chapter 4

| Source path:line, symbol, or command | Derived fact or relationship | Used in | Confidence | Open question / human decision |
| --- | --- | --- | --- | --- |
| decided sketch step 12, section 2 heading | "Opinionated where it makes the rules checkable, free where the learning happens"; Vue fixed; rendering, logic, decomposition free; libraries bundled | ch.4 / strategy-fixed-frame-free-app | high | — |
| decided sketch step 12, section 3; con-runtime-unchanged | Runtime frame the app does not change; app writes core, UI, data, playthroughs | ch.4 / strategy-fixed-frame-free-app | high | — |
| `runtime/interactive/interactive.ts`; `contract.ts` TICK=20 | Shell holds state, routes keys and pointer input, ticks every 20 ms, route and seed from the address | ch.4 / System decomposition | high | — |
| `runtime/interactive/plugin.ts` (two plays, SIZE_BUDGET, component rules); `e2e.ts` | Build fails on broken description, contract, non-determinism, component rules, size; browser tests via lernapps check --pre-push | ch.4 / Operational approach | high | — |
| `ORGANIZATION.md` "What every site shares" (Renovate) ; con-runtime-unchanged | Runtime and tooling reach the app as dependency updates | ch.4 / Operational approach | high | — |
| ch.1 1.2 proposed goals | Strategy addresses all five proposed goals; goal-to-approach mapping | ch.4 / strategy-fixed-frame-free-app addresses | low | OPEN: goal set needs the owner's confirmation (agent inference) |
| con-storage-quota; owner, 2026-10-16, conversation | Storage quota 100 kB per app, decided, not built | ch.4 / table qg-small | high | — |
| con-architecture-current; decided sketch step 12 section 4 | arc42 diff before commit and validate in check decided, not built | ch.4 / Operational approach | medium | OPEN: confirm not built yet for apps |
| owner, 2026-10-16, conversation | Tutor form open | ch.4 | high | OPEN: handoff vs. model in the browser |
| decided sketch section 2 vs. `plugin.ts` SIZE_BUDGET comment | Size budget scope contradicts: whole app vs. src/ only | ch.4 | high | OPEN: contradicts plugin.ts / sketch; which holds? |

### Chapter 5

| Source path:line, symbol, or command | Derived fact or relationship | Used in | Confidence | Open question / human decision |
| --- | --- | --- | --- | --- |
| tooling `.vibe/development-plan-agentic-app-creation.md`, sketch §3 | Runtime `interactive/` the app does not change; app writes src/core, src/ui, src/data, src/playthroughs | ch.5 / bb-runtime, bb-app, bb-core, bb-ui, bb-data, bb-playthroughs | high | — |
| `runtime/interactive/plugin.ts:1-21`, `interactive()` | Build step: validation, component rules, core and playthrough checks, pages, 404, size budget; app adds it via vite.config.ts | ch.5 / bb-build, if-build-plugin, bb-build-checks, bb-not-found-page | high | — |
| `runtime/interactive/plugin.ts` `SIZE_BUDGET = 100_000`, `generateBundle` | Own code of src/ gzipped within 100 kB; Vue, runtime, libraries not counted | ch.5 / bb-size-budget | high | — |
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
| `runtime/explainer/tutor.ts`, `tutorpage.ts`, `prompt.ts`, `explainer.ts:12,101` | Tutor handoff (prompt, providers, clipboard, tutor.md, llms.txt, Zurück zum Tutor) built for the explainer only | ch.5 / bb-tutor-handoff | high | OPEN: tutor as handoff or model in the browser? |
| owner, 2026-10-16, conversation | Client-side AI tutor form undecided | ch.5 / bb-tutor-handoff, bb-tutor-in-browser | high | OPEN: handoff or in-browser model? |
| `runtime/explainer/tasks.ts:1-7` | Task numbers built for the explainer only | ch.5 / bb-task-numbers | high | — |
| sketch §3 "Optional, for apps with tasks"; `runtime/explainer/components.ts`, `shared/examples.ts` | Exercise contract (seed, describe, about, examples) optional, brings task numbers and tutor; not built for interactive | ch.5 / bb-exercise-contract | high | — |
| owner, 2026-10-16, conversation | No settings dialog, less motion, sound or pause in scope now | ch.5 / bb-settings | high | — |
| brief, "Generic components to cover" | "time limit off" as an example setting | ch.5 / bb-settings | medium | — |
| `tooling archetypes/shared/preset.ts:1-25` | Preset: lint with lernapps rules, type check, format, tests, pre-commit, relative URLs | ch.5 / bb-preset, if-preset, bb-lint-rules | high | — |
| `ls tooling/lint/rules` | Eight lint rules (learner-text-german, no-request-before-click, storage-through-wrapper, suppression-reason, four vue-component rules) | ch.5 / bb-lint-rules | high | — |
| `ls tooling/check/rules`; `check/check.ts:1-4` | lernapps check rules incl. accessible, usable-at-360px, no-request-before-click, no-tracking, links-resolve, entry-links-resolve | ch.5 / bb-lernapps-check | high | — |
| sketch §4, §7 step 2; `grep arc42 tooling/check` (only comments) | `arc42 validate` in lernapps check planned, not built yet | ch.5 / bb-lernapps-check | medium | — |
| `tooling archetypes/shared/playwright.ts:1-6` | e2e against built app, Chromium desktop and 360 px | ch.5 / bb-playwright-config | high | — |
| `tooling archetypes/shared/storage.ts:1-16` | Only storage, localStorage under app prefix, try/catch | ch.5 / bb-small-storage, if-device-storage | high | — |
| owner, 2026-10-16, conversation; `grep -n quota storage.ts` (no match) | Quota 100 kB per app decided, not built yet | ch.5 / bb-small-storage | high | — |
| owner, 2026-10-16, conversation | IndexedDB wrapper only when an app needs it | ch.5 / bb-large-storage | high | — |
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
| `runtime/interactive/plugin.ts:1-21` | Build order: validate, component rules, core in own Vite server, exports, routes start, playthroughs twice without tick, then pages, 404, size budget; one line per problem; vp dev renders per request | ch.6 / scenario-build | high | — |
| `vite.config.ts` | interactive() inside lernapps() preset | ch.6 / scenario-build | high | — |
| `runtime/interactive/e2e.ts:1-16, 56`; `tooling archetypes/shared/playwright.ts:1-7` | lernapps check --pre-push runs e2e on built app via vp preview on free port, Chromium desktop and 360 px, reduced motion; no-JS checks; playthroughs at app/?seed#route with state and polite live region; check adds axe and width | ch.6 / scenario-browser-playthroughs | high | — |
| `tooling archetypes/shared/hooks/pre-push`; `generator/app/.github/workflows/pages.yml:3-5` | pre-push hook and CI run lernapps check | ch.6 / scenario-browser-playthroughs | high | — |
| `runtime/explainer/prompt.ts:1-8`, `tutor.ts:1-11` | Explainer tutor: copy button, provider links, tutor.md, llms.txt, nothing before a click | ch.6 / scenario-tutor | high | — |
| owner, 2026-10-16, conversation | Tutor form for interactive undecided | ch.6 / scenario-tutor | high | OPEN: handoff to the learner's own assistant or a model in the browser? |

### Chapter 7

| Source path:line, symbol, or command | Derived fact or relationship | Used in | Confidence | Open question / human decision |
| --- | --- | --- | --- | --- |
| `ORGANIZATION.md:46` | A repo x with Pages is served at lernapps.net/x/ | ch.7 / dn-github-pages | high | — |
| `tooling actions/app-publish/action.yml:3-5` | Publish to gh-pages branch served from root; only lernapps org repos at lernapps.net/<repo>/, others at <owner>.github.io/<repo>/ | ch.7 / dn-github-pages | high | — |
| `tooling generator/app/.github/workflows/pages.yml:3-18, 33-61` | Jobs app (lernapps check), deploy on main, preview on PRs from the repo at pr-preview/pr-<n>/, not indexed, removed on close; plan/docs-only changes publish nothing | ch.7 / env-ci, dn-ci-runner, dn-pr-preview | high | — |
| `tooling package.json` `appTemplates.archetypes` = explainer, quiz; `grep interactive generator/create.ts` (none) | Tooling has no interactive archetype yet, so no generated workflow for interactive apps | ch.7 / Deployment overview | high | — |
| agent inference from sketch §7 step 2 | Interactive apps will use the same pages.yml once the archetype exists | ch.7 / env-ci, dn-ci-runner, dn-github-pages, dn-pr-preview | low | OPEN: will interactive apps get the same generated Pages workflow? |
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
| sketch §6; `grep -n -i "property" plugin.ts` (only an unrelated comment) | Core property tests over fixed seeds not built yet | ch.8 / concept-playthroughs | medium | — |
| `render.ts:1-9`; `e2e.ts:7-11` | Start page without script; app page noscript note with link back; plain links; e2e checks without JS per language | ch.8 / concept-readable-without-js | high | — |
| `pages.ts:1-4`; `load.ts:106`; `i18n.ts:1-6` | German at root, others below /<lang>/; only runtime-supported languages; texts via translator | ch.8 / concept-languages | high | — |
| `ORGANIZATION.md:57`; sketch §5; owner, 2026-10-16, conversation | WCAG 2.1 AA and 360 px default, limits declared in entry, warnings then | ch.8 / concept-accessibility | high | — |
| ch.2 con-accessibility-default (wave 1) | Warnings for declared limits not built yet | ch.8 / concept-accessibility | medium | — |
| `a11y.ts:21,31,37`; `interactive.ts:22,58`; `check/rules/accessible.ts`, `usable-at-360px.ts` | announce, moveFocus; keys on controls stay theirs; check runs axe and width | ch.8 / concept-accessibility | high | — |
| `plugin.ts:9-12`; `runtime/explainer/components.ts`; sketch §2 | Component rules on SFC output and lint rules; Vue fixed so they hold for every app | ch.8 / concept-component-rules | high | — |
| `storage.ts:1-3, 16-17`; owner, 2026-10-16, conversation | localStorage via wrapper, prefix lernapps:<app>:, wrapped access; quota 100 kB decided not built; IndexedDB only when needed | ch.8 / concept-device-storage | high | — |
| `interactive.ts:31-34, 61-66`; `render.ts` route anchors; sketch §3 | Routes in app.yaml as app/#id, restart on new route; entry topics and entry-links-resolve | ch.8 / concept-hash-routes | high | — |
| `plugin.ts` `SIZE_BUDGET`, l.18-20 | Own code of src/ gzipped ≤ 100 kB; libraries not counted | ch.8 / concept-size-budget | high | OPEN: contradicts sketch §2 ("a size budget for the whole app") |
| sketch §2 | Libraries inside a size budget for the whole app | ch.8 / concept-size-budget | high | OPEN: contradicts plugin.ts SIZE_BUDGET scope |
| `runtime/explainer/prompt.ts:1-8`; owner, 2026-10-16, conversation | Tutor optional, not built for interactive; nothing before a click; form open | ch.8 / concept-tutor | high | OPEN: handoff or model in the browser? |
| sketch §5; owner, 2026-10-16, conversation; `ls tooling/skills` (no lernapps-interactive) | Low stimulation only advice of the skill; skill not written yet; no settings now | ch.8 / concept-low-stimulation | high | — |

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
| `lernapps/tooling .vibe/development-plan-agentic-app-creation.md:378-380`; owner, 2026-10-16, conversation | localStorage through the wrapper, 100 kB quota per app, shared 5 MiB, save refuses beyond; IndexedDB wrapper only on need (YAGNI) | ch.9 / dec-small-storage | high | — |
| `tooling archetypes/shared/storage.ts:36-45` | save has no quota today | ch.9 / dec-small-storage | high | — |
| `lernapps/tooling .vibe/development-plan-agentic-app-creation.md:412-420`; `dotgithub ORGANIZATION.md:57-58`; owner, 2026-10-16, conversation | WCAG 2.1 AA and 360 px platform rules, app default, deviations declared in the entry, warnings then; start page meets both; low stimulation advice only | ch.9 / dec-accessibility-default | high | — |
| owner, 2026-10-16, conversation | No settings dialog, less motion, sound or pause in scope now | ch.9 / dec-no-settings | high | — |
| `lernapps/tooling .vibe/development-plan-agentic-app-creation.md:393-408` | arc42 in docs/arc42, English and minimal; frame from tooling, app adds own part; checked only by arc42 diff --staged --strict and arc42 validate; responsibilities not checked | ch.9 / dec-arc42-in-app | high | — |
| owner, 2026-10-16, conversation; `lernapps/tooling .vibe/development-plan-agentic-app-creation.md:390-391` | Optional client-side AI tutor; sketch lets the exercise contract bring "the tutor"; variant open | ch.9 / dec-tutor-variant | high | OPEN: handoff to the learner's own assistant (as in the explainer) or a model running in the browser? |

### Chapter 10

| Source path:line, symbol, or command | Derived fact or relationship | Used in | Confidence | Open question / human decision |
| --- | --- | --- | --- | --- |
| ch.1 1.2; ev-ch1 agent inference row | The five goals and ids qg-privacy, qg-checkable, qg-accessibility, qg-small, qg-understandable | ch.10 / all quality goals | low | OPEN: owner to confirm set, order, ids |
| no source | Priorities of the five goals | ch.10 / all quality goals | — | OPEN: priority of each goal (left out) |
| `tooling check/rules/no-request-before-click.ts`; `check/visit.ts` | Requests to other hosts during page load are blocked, recorded, errors | ch.10 / qs-no-request-before-click | high | — |
| `tooling lint/rules/storage-through-wrapper.ts`, `vue-component-no-network.ts`; `archetypes/shared/storage.ts` prefix lernapps:<app>: | Direct storage, cookies and network calls reported; storage through createStorage under the app prefix | ch.10 / qs-state-on-device | high | — |
| `runtime/interactive/plugin.ts` lines 16, 145-152 | Playthroughs played twice; differing states fail the build | ch.10 / qs-deterministic-core | high | — |
| `runtime/interactive/e2e.ts` header | Playthroughs at app/?seed=<seed>#<route>, state and polite announcement after each step, no console error, desktop and 360 px, run by lernapps check --pre-push | ch.10 / qs-playthrough-in-browser | high | — |
| `tooling check/rules/accessible.ts` | axe-core WCAG 2.1 A and AA, severity error | ch.10 / qs-axe-clean | high | — |
| `tooling check/rules/usable-at-360px.ts` | No page wider than 360 px, severity error | ch.10 / qs-usable-at-360px | high | — |
| decided sketch step 12 section 5; con-accessibility-default | Warnings for apps with declared limits decided, not built | ch.10 / qs-axe-clean | high | — |
| `runtime/interactive/plugin.ts` lines 21, 41, 225-228 | SIZE_BUDGET 100 kB gzip of src/ modules; build fails with a message | ch.10 / qs-size-budget | high | OPEN: size budget scope (sketch: whole app) |
| owner, 2026-10-16, conversation; `archetypes/shared/storage.ts` (no limit) | Quota 100 kB per app, save refuses beyond; not built | ch.10 / qs-storage-quota | high | — |
| decided sketch step 12 section 4 | arc42 diff --staged --strict before commit, ~0.2 s, unclaimed code and blocks without prose fail; not built for apps | ch.10 / qs-architecture-current | medium | OPEN: confirm not built yet for apps |

### Chapter 11

| Source path:line, symbol, or command | Derived fact or relationship | Used in | Confidence | Open question / human decision |
| --- | --- | --- | --- | --- |
| `runtime/interactive/plugin.ts:17`; `contract.ts:28-38` (PlaythroughStep has only keys, state, announce) | Build never calls tick; playthroughs cannot express time | ch.11 / risk-time-not-replayed | high | — |
| `runtime/interactive/interactive.ts:67`; `e2e.ts:127-148`; `interactive/src/core/index.ts:89-94`; `src/data/lessons.json:2-3` | In the browser the clock runs between key presses; the template's core counts a letter as a miss after 5 s, so browser playthroughs depend on typing speed | ch.11 / risk-time-not-replayed | high | — |
| `lernapps/tooling .vibe/development-plan-agentic-app-creation.md:436-437` | The pilot is the real-time typing game, which puts the most pressure on real time | ch.11 / risk-time-not-replayed | high | — |
| agent inference | Mitigation idea: a playthrough step that lets time pass | ch.11 / risk-time-not-replayed | low | OPEN: whether playthroughs get a step that lets time pass, played as ticks in build and browser |
| `lernapps/tooling .vibe/development-plan-agentic-app-creation.md:416-417,431-435`; ch.2 con-accessibility-default | Entry field for limits and warnings planned, not built; accessible and usable-at-360px are errors for every app today | ch.11 / risk-accessibility-limits-not-built | high | — |
| `tooling archetypes/shared/storage.ts:36-45`; owner, 2026-10-16, conversation | Quota of 100 kB decided, wrapper has no limit | ch.11 / risk-storage-quota-not-built | high | — |
| `tooling archetypes/shared/storage.ts:1-3,15-17`; `lernapps/tooling .vibe/development-plan-agentic-app-creation.md:378-379` | All apps share one origin and its 5 MiB localStorage; separation only by the prefix lernapps:<app>: from a name the app chooses | ch.11 / risk-shared-origin-storage | high | — |
| agent inference | Clearing site data or browser eviction loses every app's values; a duplicate storage name collides | ch.11 / risk-shared-origin-storage | low | OPEN: confirm severity medium and that loss of stored data is acceptable |
| owner, 2026-10-16, conversation; ch.5 bb-tutor-handoff, bb-tutor-in-browser | Tutor undecided and built only for the explainer | ch.11 / risk-tutor-not-built | high | OPEN: tutor variant |
| `lernapps/tooling .vibe/development-plan-agentic-app-creation.md:403-405,431-432`; ch.2 con-architecture-current | arc42 diff in pre-commit and arc42 validate in lernapps check planned, not wired | ch.11 / risk-arc42-checks-not-wired | medium | OPEN: confirm not built yet (from ch.2) |
| `lernapps/tooling .vibe/development-plan-agentic-app-creation.md:370` vs `runtime/interactive/plugin.ts:20-22,41,217-228` | Sketch: budget for the whole app incl. libraries; build: only src/ modules, 100 kB gzip | ch.11 / risk-size-budget-scope | high | OPEN: contradicts plugin.ts; which scope holds? |
| `lernapps/tooling .vibe/development-plan-agentic-app-creation.md:423` vs `runtime/interactive/plugin.ts` (no property tests; grep "propert" finds none) | Core property tests over fixed seeds planned, not built; build plays only playthroughs twice | ch.11 / risk-no-core-property-tests | medium | — |
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
| owner, 2026-10-16, conversation | Optional client-side AI tutor, variant open | ch.12 / term-tutor | high | OPEN: tutor variant |
