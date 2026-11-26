# Development Plan: app-templates (feat/language-switch-keeps-address branch)

*Generated on 2026-11-26 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal

lernapps/app-templates#210: on the app page of an interactive app the language switch keeps the search (seed included)
and the hash of the address. The owner approved it in the session (2026-11-26: "yes. We should properly parse url
parameters"); the orchestrator decided: seed goes along, the route bar stays as it is. Working autonomously as for #201.

## Key Decisions

- KD-01 "Properly parse": the runtime reads the address and each link with `URL`/`URLSearchParams`, keeps the link's
  own parameters, adds every parameter of the address with `append` (a name given twice stays twice, a parameter of
  the address replaces the link's own of the same name), and sets the hash the same way; no string concatenation.
- KD-02 The function lives in contract.ts beside paramsOf (`languageHref(href, address)`), pure, tested in Node; the
  shell applies it to `.page-languages a` at the start and on every hashchange.
- KD-03 Only the app page with JavaScript: the build's links stay plain (concept readable without JS); the start
  page, the alternates in <head> and the other archetypes stay unchanged.
- KD-05 Not done, named in the PR: an address without `?seed=` gives the switch no seed, so the other language
  draws a new random round; adding the drawn seed is left to the owner.
- KD-04 Proof in the browser: the generic e2e of every bilingual interactive app follows the switch from a
  playthrough's address and expects the same start state on the other language's page. The fixture
  interactive-params becomes bilingual (its own app.yaml), so CI runs it.

## Explore
### Tasks

### Completed
- [x] Created development plan file
- [x] Issue #210 created (owner's approval in the session)
- [x] Read pages.ts (static switch links), interactive.ts, e2e.ts expectFrame, the fixture

## Plan
### Tasks
- [ ] *To be added when this phase becomes active*

### Completed
*None yet*

## Code
### Tasks

### Completed
- [x] contract.ts `languageHref(href, address)`; interactive.ts applies it to `.page-languages a` at the start and on
  hashchange, from the links as the build wrote them
- [x] unit tests (test/interactive-params.test.ts): search with seed, repeated names, encoding, the link's own params,
  hash
- [x] generic e2e: each playthrough of a bilingual app follows the switch and expects the same start state
- [x] fixture interactive-params bilingual (its own app.yaml); CI comment
- [x] arc42 (bb-shell, scenario-play, browser playthroughs, dec-address-params, generic ch.6), evidence, README
- [x] vp check, check:vue, vp test run, arc42, template and fixture `lernapps check --pre-push`: green; with the
  links left unchanged the 10 new e2e tests fail

## Commit
### Tasks

### Completed
- [x] One commit, PR to main with "Closes #210"

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
