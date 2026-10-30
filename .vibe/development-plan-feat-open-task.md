# Development Plan: open task for the explainer (feat/open-task branch)

*Started on 2026-10-30, following the EPCC workflow (Explore, Plan, Code, Commit) of [codemcp/workflows](https://github.com/mrsimpson/responsible-vibe-mcp)*

## Goal

A learner answers an open question ("Beschreibe …", "Erkläre …", "Vergleiche …", a short text in German or a foreign
language) in their own words, compares the answer with what a good answer contains, and gets a result that the
self-assessment, the result line and the tutor can use.

Today there is no open exercise type. The guidance in lernapps/practice
(`skills/content/lernapps-practice-photos/references/aufgabentypen.md:12`) builds one from an `example` "Offene
Aufgabe: …" and a `note` "Musterlösung", which is visible at once. Seen on lernapps/practice#19 (Religion, Judentum,
class 6):
- the learner only reads, writes nothing;
- nothing ties the model answer to the material;
- the page knows no result, so self-assessment, result line and tutor cannot use the task.

For German and foreign languages, open tasks are essential.

### Proposal (owner and agent, 2026-10-30)

1. **Write first, then compare.** The learner answers in a text field, or **alternatively takes a photo of the
   handwritten sheet**. Only then is "Vergleichen" possible.
2. **Checklist of expected points.** 2 to 5 points a good answer contains (e.g. "nennt den Sabbat als Ruhetag").
   The learner ticks the points the answer contains; this gives `richtig`, `teilweise` or `falsch`.
3. **Each point names its source**: a section of the explainer's content. A check can tell whether it exists, a
   review whether the point is in the material.
4. **Points about form**, too, for German and foreign languages ("schreibt mit logischem Faden", "verwendet
   mindestens drei der Vokabeln", "schreibt im Perfekt"). A word search is at most a hint, never the grade.
5. **Model answer as a property of the task**, collapsed by default and opened only after the learner's own answer.
6. **Self-assessment**: unticked points name the sections to look at again.
7. **Tutor**: the result line carries the learner's text (a photo the learner attaches in their own chat), the
   checklist and the ticked points; the tutor page carries the points and the model answer, so that the learner's
   assistant can lead and give feedback, also on form.
8. **The tutor knows the whole learning path.** To judge an answer, the tutor needs more than the current page: a
   summary of the learning path in the app's own words, written when the app is created, reachable from each tutor
   page.

Rejected for now: grading by a model on a server or in the browser (against `dec-tutor-variant`, the app stores
nothing about learners, running costs).

---

## Explore

### Tasks

### Completed

- [x] Created development plan file
- [x] Placed the feature in the platform design (lernapps/docs, pdt42): see Notes, "Platform fit"
- [x] Read the explainer's architecture where it is touched: see Notes, "Architecture today"
- [x] Asked the owner the open questions; answers recorded as KD-01 to KD-04 (2026-10-30)
- [x] Photo handoff: out of scope (owner, 2026-10-30); the fallback of KD-02 is enough

## Plan

### Tasks


### Completed

- [x] Order of the pull requests: D8
- [x] Mapped where the feature touches app-templates, tooling and practice (two read-only searches, 2026-10-30)
- [x] Measured lernapps/practice#19: its content pages show about 35 kB of text, exercises included; a learning-path
      text of 10 to 25 kB is expected
- [x] Drafted the design (below)
- [x] Owner answered the open points of the design (below)
- [x] Mock-up of the open task, with and without tutor, without JavaScript, the tutor page and the learning-path
      text: https://claude.ai/artifact/M1nuBu6eNZjzCNiEMHdVCn (2026-10-30, private to the owner)

### Design (draft, 2026-10-30)

**D1. Block `open-task`, explainer only** (like `generated`, not a shared question type; KD-04)

```yaml
- type: open-task
  id: sabbat
  task: Erkläre, warum der Sabbat für Juden wichtig ist.
  answer: [text, photo]          # optional, default both
  points:                        # 2 to 5
    - text: nennt den Sabbat als Ruhetag
      source: /feste/jahreskreis/#sabbat
    - text: begründet mit der Schöpfung
      source: /altes-testament/von-abraham-zum-land/#schoepfung
    - text: schreibt mit logischem Faden
      kind: form                 # a point about form has no source
  solution: Der Sabbat ist …     # the model answer
  hint: …                        # optional
```

- Touches: `explainer.v1.schema.json`, `schema.ts`, `content.ts` (`isExercise`), `check-page.ts`, `exercises.ts`
  (render without JS), `explainer.ts` (client), `outline.ts`, `e2e.ts`, `result.ts`, `tutor.ts`, `tutorpage.ts`,
  `assessment-client.ts`, `assessment-page.ts`, messages `de.json`/`en.json`, tests and fixtures.
- **Validation in the build** (`load.ts`, beside `checkAssessment` and the link check against `anchors`): each
  content point's `source` names an existing page and section. `parseRef` learns nested anchors (`#a/b`).
- **Without JavaScript**: task, points and the model answer in a `<details>` "Lösung", as every exercise has; this
  satisfies tooling's `explainer-readable-without-js`. No gate without JavaScript.
- **With JavaScript**: first the learner chooses how to answer, two equal options "Hier tippen" and "Auf Papier,
  dann Foto" (owner, 2026-10-30: the photo is an alternative to typing, not an extra; the choice is headed "Deine Lösung"). Then a text field, or "Foto aufnehmen" (`<input type="file" accept="image/*" capture>`, shown as an
  object URL, kept in memory only). "Vergleichen" opens once there is text or a photo; then the checklist (tick
  boxes) and "Lösung" (the model answer). Nothing is stored (KD-02); a reload loses the answer.

**D2. Result `teilweise`** (KD-01)

- All points ticked: `richtig`; some: `teilweise`; none: `falsch`; not compared: `offen`. Unticked points are named
  like typical mistakes: `P<n>`, query `?a3=teilweise-P2P3`.
- Touches `assessment.ts` (`ItemResult.state`, `STATES`, `resultValue`, `assessmentPrompt`), `assessment-client.ts`
  (`evaluate`, score), `bandOf`/`pageResults`, the component contract `AssessmentAnswer` (optional `partly`),
  `result.ts` (`TaskState`, `statusOf`), messages, tutor wording. Stored results stay version 1 plus a state; an old
  stored result stays valid.
- Weight in the self-assessment: `teilweise` counts half a right answer.

**D3. Result line and tutor**

- Result line ("Zurück", "Zurück zum Tutor"): task, ticked and unticked points, the text as written (one line,
  capped at 2 000 characters in the line, the copy carries it whole), or "Antwort als Foto". Only on the learner's
  click.
- Tutor page, per open task: task, points with their kind and source, the model answer, and the guide: check point
  by point, give feedback on content and form, never give the model answer before the learner tried; when the text
  or photo is missing, ask the learner for it (KD-02).

**D4. Learning-path text** (KD-03)

- Source: `src/lerngang.md` (Markdown, allowed in practice's zip). One `##` part per chapter, one `###` per page,
  each heading with the page's path, e.g. `### Der Jahreskreis (/feste/jahreskreis/)`; at the end `## Gehört dazu` and
  `## Gehört nicht dazu`.
- Built only when the tutor is on: `/lerngang/` as HTML and `index.md`, like the tutor pages (`tutorAssets`, the
  `files` set, the dev server). Every tutor page links it in its head as background; it is reachable from the tutor
  pages, so tooling's `pages-reachable` passes.
- Validation in the build: each part names an existing page; each content page has a part; a warning beyond 64 kB.
- **When the tutor cannot fetch it** (owner, 2026-10-30): an assistant's security settings may block the address; the
  assistant notices this itself. The tutor page tells it: if you could not fetch the learning-path text, ask the
  learner to allow this address explicitly, naming it in full (`https://…/lerngang/`), and fetch it again; until then,
  judge no open answer and answer nothing about the content from general knowledge. So the tutor page names the
  absolute address, not only the relative link. Note `dec-tutor-page`: links in a fetched file were not always
  followed; this guide covers that case, too.
- Optional in the explainer; required in practice (D6).

**D5. tooling**

- Content checks live in the app-templates build, not in tooling (tooling checks the built app and has no content
  rules). tooling's part: move the `appTemplates` pin; skills `lernapps-explainer` (`references/exercises.md`,
  `runtime.md`), `lernapps-content-questions` (`question-types.md`); review rubric `review/archetypes/explainer.md`:
  "points cover what a good answer needs and are in the material", "the learning-path text matches the pages and is in
  own words"; rule page via `scripts/rules.ts`.

**D6. practice**

- `lernapps-practice-photos/references/aufgabentypen.md`: open task becomes `open-task` instead of `example` + `note`
  (line 12); the self-test line (20) points to the self-assessment.
- `lernapps-practice-plan/SKILL.md`: open task among the rich forms (55-64); remove the outdated self-assessment box
  (42-43).
- `guidance/plan-template.md`: a Code task after the pages (between 163 and 166): write `src/lerngang.md` from the
  material, in own words; scope in and out drafted in Plan.
- `lernapps-practice-submit/SKILL.md`: the creator checks the points and the learning-path text.
- Required: `actions/validate` fails a submission without `src/lerngang.md` (every made-to-measure app).
- `test/guide.test.ts` as the skills change.

**D7. Architecture docs** (with each pull request)

- explainer arc42: `bb-render`, `bb-validation`, `bb-islands`, `bb-tutor-handoff`/`if-tutor-files`,
  `bb-self-assessment`, `concept-tutor`; revise `dec-tutor-page` (KD-03); new decision for `open-task` and for
  `teilweise`; scenarios `scenario-tutor`, `scenario-explainer-self-assessment`; glossary: open task, point,
  learning-path text.
- app-templates arc42: `concept-device-storage` (photo in memory only), `architecture-evidence.md`.

**D8. Order of the pull requests**

1. app-templates: result `teilweise` (D2 without the open task).
2. app-templates: block `open-task` (D1, D3).
3. app-templates: learning-path text (D4).
4. tooling: pin, skills, rubric (D5).
5. practice: skills, plan template, validation (D6); takes effect once tooling's pin has moved.

### Design: the owner's answers (2026-10-30)

1. Checks: everything runs through `lernapps check` (tooling), in three layers (proposed 2026-10-30; the owner moved
   on to Code without objection):
   - **Content validation in the runtime's build**, which `lernapps check` runs as its `build` step (`src/cli.ts`
     ~503) in the creator's repo, and which practice's build runs too: schema of `open-task`; each point's `source`
     names an existing page and section (beside the link check in `load.ts`); each part of `src/lerngang.md` names an
     existing page and each content page has a part. Errors point to the YAML path.
   - **Rules of tooling on the built app** (`check/rules/`), which also run on a bundle or URL without a repo (listing,
     practice): `explainer-readable-without-js` also covers an open task (points and "Lösung" visible); a new rule:
     with tutor pages there is `/lerngang/`, and each tutor page names its absolute address.
   - **Review rubric** (`review/archetypes/explainer.md`): the points are in the material and cover a good answer; the
     learning-path text matches the pages and is in own words.
2. `teilweise` counts half in the self-assessment.
3. The answer is kept, but not in `localStorage`: in `sessionStorage` through `createStorage` ("new day, new
   exercise"); it is gone when the tab closes. The photo stays in memory (too large to store).
4. practice suggests open tasks where the question fits (describe, explain, compare, write), with or without a tutor.
   practice requires the learning-path text for every made-to-measure app (owner, 2026-10-30).
5. Next: a mock-up of the open task with and without tutor.

## Code

### Tasks

Step 1, app-templates: result `teilweise` (D2), on this branch
- [ ] `assessment.ts`: state `teilweise`, `P<n>` for missed points, query, prompt, old stored results stay valid
- [ ] `assessment-client.ts`: evaluate and score; `pageResults`/`bandOf`: `teilweise` counts half
- [ ] `tasks.ts`: `AssessmentAnswer` may say `partly`
- [ ] `result.ts`: state and status line for a partly right task
- [ ] messages `de.json`/`en.json`, tutor wording (`assessment-page.ts`, `tutorpage.ts`)
- [ ] tests; arc42 (`dec-self-assessment-result`, glossary)

Step 2, app-templates: block `open-task` (D1, D3)
Step 3, app-templates: learning-path text (D4)
Step 4, tooling: pin, rules, skills, rubric (D5)
Step 5, practice: skills, plan template, validation (D6)

### Completed

## Commit

### Tasks

### Completed

## Key Decisions

### KD-01: A third result, `teilweise`
- **Decision** (owner, 2026-10-30): an exercise's result is `richtig`, `teilweise`, `falsch` or `offen`. An open task
  gives `teilweise` when some, not all, points of its checklist are ticked; the unticked points are named like a
  typical mistake. Self-assessment, result line and tutor query know the new state for every exercise type.

### KD-02: The answer stays on the device
- **Decision** (owner, 2026-10-30): the learner's text and photo stay local. The photo is only shown, kept in memory,
  never stored or sent by the app. The text goes with the result line, as inputs do today, only on the learner's
  click; the text and the ticks are kept in `sessionStorage` until the tab closes (owner, 2026-10-30). The tutor page tells the tutor to ask the learner for the photo or text of an open task when it lacks it.
- **Out of scope** (owner, 2026-10-30): a direct handoff of the photo to the learner's chat (Web Share API, chat
  APIs). A first search found no documented link or API to open a chat with an image attached.

### KD-03: A learning-path text for the tutor, at an address of its own
- **Decision** (owner, 2026-10-30): the creator's assistant writes the whole learning path as long, continuous prose
  in its own words, from the material: the exact content (facts, terms, reasons, examples), because for a test the
  exact content matters. It is structured by the app's chapters and pages (each part names its page) and ends with
  what belongs to the scope and what explicitly does not.
- No new visible page or content type: chapters and pages stay as they are. The build publishes the text at an
  address of its own, not linked in the navigation, like the tutor pages; every tutor page links it as background.
- This revises `dec-tutor-page` (one source of what the tutor gets): the tutor page stays the source for the task,
  the learning-path text is the source for the content.
- lernapps/practice requires it for made-to-measure apps (the material is seen only while building); lernapps/tooling
  checks that each part names an existing page and each content page has its part.

### KD-04: Scope: explainer, practice guidance, tooling checks
- **Decision** (owner, 2026-10-30): the open task is built for the explainer, not for the quiz. The same increment
  promotes it in the practice skills (instead of `example` + `note` "Musterlösung") and checks its consistency in
  lernapps/tooling (each point's source exists, the model answer is present, the summary exists).

## Notes

### Platform fit (pdt42, lernapps/docs, read 2026-10-30)

- Transaction `t-learn-with-app` (creators give students "a learning session on one topic", `r-creators-students`,
  a core relationship). The open task makes that session better; it adds no new transaction or role.
- Experience `x-tailor-made-app` ("Practise a given scope, made to measure"): lernapps/practice#19 is one. Its steps
  `s-building-guidance` and `t-build-with-assistant` are where the creator's assistant writes the checklist, the
  sources, the model answer and the learning-path summary. So the guidance in lernapps/practice and the checks in
  lernapps/tooling are part of the feature, not only the runtime.
- KD-18, no hidden data collection: the apps collect nothing. The learner's text and photo must stay on the device;
  they leave it only with the learner's click, to the learner's own assistant (as input and message do today).
- No change to the platform design is needed.

### Architecture today (app-templates, explainer, read 2026-10-30)

- Block types (`explainer.v1.schema.json`): exercises are `single-choice`, `multiple-choice`, `true-false`,
  `number`, `ordering`, `matching`, `generated`, `vue-component`. No open type.
- Result of an exercise (`runtime/explainer/assessment.ts`, `ItemResult`): `richtig`, `falsch` or `offen`
  (= not answered), the input as text for a wrong answer, a typical mistake `F<n>`. The self-assessment keeps the
  last run in `localStorage`; the tutor page gets it in its query, e.g. `?a1=17-falsch-F1&a2=richtig`.
- Tutor (`concept-tutor`, `dec-tutor-variant`, `dec-tutor-page`): no model in the browser; a handoff to the
  learner's own assistant through one static tutor page per content page, the one source of what the tutor gets.
  Rejected there: one tutor page per chapter (long, the tutor answered at length), `llms.txt`, a second file beside
  the tutor page, rules in the prompt. The learning-path summary (proposal 8) must fit into this or revise it.
- Quality goals: `qg-privacy` and `qg-checkable` high.

### Open questions for the owner

Answered 2026-10-30, see KD-01 to KD-04.
