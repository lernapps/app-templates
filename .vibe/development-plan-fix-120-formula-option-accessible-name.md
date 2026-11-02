# Development Plan: app-templates (fix/120-formula-option-accessible-name)

*Generated on 2026-11-02 by Vibe Feature MCP*
*Workflow: [bugfix](https://codemcp.github.io/workflows/workflows/bugfix)*

## Goal
Fix issue #120: a formula (`$…$`) as the text of a choice-question answer option
(also in an option's `info` and in a question's `explanation`)
1. leaves the radio without an accessible name (axe `label`), and
2. makes the runtime's generic no-JS end-to-end test fail (test expects raw `$2^7$`, page shows rendered formula text `2 7`).

Expected: a formula in an option works like one in a table or prose: the radio has an accessible name (text alternative of the formula), and the test compares the same representation the page shows.

## Key Decisions
*Important decisions will be documented here as they are made*

## Notes
- Workflow chosen: bugfix (bug report with reproduction).
- Issue comments: failure also reported for `info` and `explanation`; the 2nd comment ("Optional altText") hints at an optional alt text for formulas.

## Reproduce
### Entrance criteria
- Issue read and understood.
### Tasks
- [x] Add failing test 1 to `test/explainer-formulas.test.ts`: option `$2^7$` has a text alternative in its label
- [x] Add failing test 2: outline's expected answer for a formula option equals the rendered text, not the raw source
- [x] Run both, confirm red (both red for the reasons in the issue: no text alternative in the label; outline answer is raw `$2^7$`), commit
- [ ] (optional) full browser run of `lernapps check` with axe

### Completed
- [x] Created development plan file
- [x] Located the code: `runtime/shared/questions/render.ts:56` (option label), `runtime/explainer/exercises.ts:160-177`, `runtime/explainer/outline.ts:245-248`, `runtime/explainer/e2e.ts:167-219` (generic no-JS test), `runtime/shared/text/formula.ts` (temml)
- [x] Reproduced symptom 1 at HTML level (`renderExercise` with option `$2^7$`):
  `<label class="question-option"><input type="radio" ...> <span><math><msup><mn>2</mn><mn>7</mn></msup></math></span></label>`
  The `<math>` carries no text alternative (no `alttext`/`aria-label`, no annotation), so the label has no text for axe to compute a name.
- [x] Reproduced symptom 2 by reading: `outline.ts:247` takes `option.text` raw (`$2^7$`) as expected answer, while the page shows rendered MathML; `e2e.ts:214` does `toContain(answer)` against `innerText` ("2 7"). Other answer kinds already use `plainText(...)` of rendered output.
- Env note: tests need `npm i --no-save --no-package-lock @lernapps/tooling` (optional peer dep, not installed by `npm ci`).

## Analyze
### Entrance criteria
- Both symptoms reproduced (or reproduction limits documented).
### Tasks
- [ ] To be added when this phase becomes active

### Completed
*None yet*

## Fix
### Entrance criteria
- Root cause identified for both symptoms.
### Tasks
- [ ] To be added when this phase becomes active

### Completed
*None yet*

## Verify
### Entrance criteria
- Fix implemented; regression test added.
### Tasks
- [ ] To be added when this phase becomes active

### Completed
*None yet*

## Finalize
### Entrance criteria
- All tests and `lernapps check` pass.
### Tasks
- [ ] To be added when this phase becomes active

### Completed
*None yet*



---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
