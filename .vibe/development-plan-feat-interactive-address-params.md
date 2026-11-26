# Development Plan: app-templates (feat/interactive-address-params branch)

*Generated on 2026-11-26 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal

lernapps/app-templates#201: the interactive runtime gives the core the parameters of the address,
`start(seed, route, params)`, keeps them over a new route (`hashchange`), and playthroughs can name them (`params`),
in the build and in the browser. Contract and README say: passed through only, the app checks them, data not routes.
Not part: a back channel between apps, a block `werkstatt-link`. Backwards compatible.

Working autonomously (owner's release in the task): no stop at phase boundaries; decisions recorded here.

## Key Decisions

- KD-01 `params` are all search parameters of the address but `seed`, as a frozen `Record<string, string>`, read once
  at the start of the page; a new route starts the core again with the same object. Reason: the issue; one read
  keeps them across `hashchange` without storing them anywhere.
- KD-02 A name given more than once: the first value counts (as `searchParams.get`, the same as for `seed`). Smallest
  rule, matches the seed. Platform-wide choice, named in the PR.
- KD-03 The runtime never shortens, logs or stores the params: no length limit in the schema or the runtime; build
  messages name `params` but not their values (a 2000-character value would flood the line).
- KD-04 Playthrough `params`: an object of string values, names non-empty and not `seed` (the seed has its own
  field). The build passes `params ?? {}`; the e2e opens `app/?seed=<seed>&<params>#<route>` (URLSearchParams
  encoding). The build's start of every route passes `{}`.
- KD-05 `Core.start(seed, route, params)` in the type; a core with `start(seed, route)` still type-checks (fewer
  parameters are assignable) and ignores the third argument at run time.
- KD-06 Proof in the browser: a fixture `test/fixtures/interactive-params` (the template's src with a core that keeps
  the params in its state, a playthrough with a long `c`, and its own e2e test that changes the hash and expects the
  params kept), run in CI like the explainer fixtures. The template itself stays unchanged.
- KD-07 Docs: arc42 of the interactive extension (if-pages, shell, core contract, playthrough, runtime view, a new
  decision dec-address-params, glossary) and interactive/README.md.

- KD-08 `seed` in a playthrough's `params` is checked in load.ts, not in the schema: the schema's `not` gave two
  unclear lines, load.ts gives one that says what to do.
- KD-09 The fixture's core imports `./typing.ts`, which exists only once it is laid over interactive/; so the root
  check ignores the fixture (as test/fixtures/question-page) and `lernapps check` in interactive/ checks it in CI.
- KD-10 Found on the way: a core that calls its own `start` (the template's next round) must pass the params on
  itself; README and the fixture say so. The template does not use params and stays unchanged.

## Notes

- Today: `interactive.ts` `startInteractive` reads `seed` and the hash only; `plugin.ts` `play` and the route check
  call `start(seed, route)`; `e2e.ts` opens `app/?seed=<seed>#<route>`.
- CI: the template job runs `lernapps check`; the explainer fixtures job is the pattern for a fixture job.

## Explore
### Tasks

### Completed
- [x] Created development plan file
- [x] Placed in the platform design: an interface of the interactive runtime to apps (if-core-contract, if-pages,
  if-playthrough-format); the producer is another app (lernapps/coding, apps#869) that links with `?c=`
- [x] Read runtime, build, e2e, schemas, CI and arc42 where touched (Notes)

## Plan
### Tasks

### Completed
- [x] Broke the work into the Code tasks below (from KD-01 to KD-07)

## Code
### Tasks

### Completed
- [x] contract.ts: `Params`, `paramsOf` (null prototype, frozen), `addressOf`, `Core.start(seed, route, params)`,
  `Playthrough.params`, header comment
- [x] interactive.ts: params read once, passed on start and on hashchange
- [x] playthrough.v1.schema.json: optional `params`; load.ts: `params.seed` is one clear problem line (KD-08)
- [x] plugin.ts: `play` passes params; the start message names `params` without values (KD-03); route check `{}`
- [x] e2e.ts: address via `addressOf`
- [x] tests: test/interactive-params.test.ts (paramsOf, addressOf), build test with a 2100-character param, broken
  cases (params naming seed, a core throwing on its params); two expected lines updated for the new wording
- [x] fixture test/fixtures/interactive-params with its own e2e test; CI job interactive-params; root vp check
  ignores it as question-page (KD-09); pre-push.ts comment lists it
- [x] arc42 (interactive extension, dec-address-params, term-address-params), evidence, interactive/README.md
- [x] vp check, check:vue, vp test run, arc42: green; fixture `lernapps check --pre-push` locally: green; with the
  runtime broken (hashchange passes {}) its e2e test fails, with its test broken the check fails

## Commit
### Tasks

### Completed
- [x] No debug output, TODO or commented-out code in the diff
- [x] Docs match the final state (arc42, README, contract comments)
- [x] One squashed commit on feat/interactive-address-params, PR to main with "Closes #201"

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
