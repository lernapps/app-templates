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
- [x] Trace both symptoms to root cause (see Analysis)
- [ ] Decide the text alternative with the user

### Completed
*None yet*

### Analysis (root causes)
Only the explainer renders formulas in question texts (`format: renderWithFormulas`, `exercises.ts:168`); the quiz archetype uses the escaping default, so it is unaffected.

**A. Accessible name** (`runtime/shared/questions/render.ts:56`). The label is `<input> <span>${format(option.text)}</span>`. For a formula-only option the span holds only `<math>` (temml emits no `alttext`, no `aria-label`; `annotate: true` would add a TeX `<annotation>`, which is not rendered text and is not used by axe). axe's name computation finds no text, hence rule `label`.
Fix space:
1. `aria-label` on the `<math>` produced by `renderFormula` (inline) from a text alternative; applies to every formula, but replaces MathML navigation for screen-reader users.
2. `aria-label` on the `<input>` only when the option text has no text outside its formulas; keeps MathML untouched; must contain the visible text (WCAG 2.5.3 label in name).
3. Source of the alternative: (a) TeX source (cheap, poor speech: "2^7"), (b) a small TeX-to-words conversion per language (`^` hoch/to the power, `\frac` …; real feature, needs messages and a command-list-wide converter), (c) author-supplied optional `altText` (the last issue comment, "Optional altText"), with (a) or (b) as fallback.

**B. Generic no-JS test** — several places compare the raw `$…$` source with rendered text:
- `outline.ts:247` expected answers of choice questions = `option.text` raw → `e2e.ts:214` `toContain` on `innerText` (the reported failure). Other answer kinds already go through `plainText`.
- `e2e.ts:172` expected question text = `question.text` raw vs `legend` text: same defect for a formula in the question text.
- `e2e.ts:487-499` `reasonFor` quotes the raw `info`/`explanation` (`wrongReasons`) vs rendered `.question-diagnosis` text: the `info`/`explanation` report of the 2nd comment. Likewise `e2e.ts:1072` (to check when fixing).
- `shared/questions/e2e.ts:53,57` `expectBackground` uses raw `info`/`explanation` (used by quiz e2e only, where formulas are not rendered; explainer unaffected).
Comparison problem: stripping tags from the rendered formula gives "27" (`plainText`), the browser's `innerText` gives "2 7" (issue). A plain substring match fails either way; compare with all whitespace removed on both sides, or compare against `textContent`.

## Key Decisions (open)
- Which text alternative (1/2 × a/b/c above): needs the user's decision.
- Scope of the test fix: option text (reported), plus question text, `info`, `explanation` (same defect, same helper).

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
