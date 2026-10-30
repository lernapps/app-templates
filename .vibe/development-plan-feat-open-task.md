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

- [ ] Clarify the photo: stays in the browser, never sent by the app; what the page shows, how it reaches the tutor
- [ ] Clarify the learning-path summary against `dec-tutor-page` (rejected: one tutor page per chapter, `llms.txt`,
      a second source): what it is, who writes it, where it lies, how the tutor page points to it
- [ ] Clarify the result of a self-judged task: does `teilweise` exist, how it counts in self-assessment
- [ ] Clarify scope: explainer only, or also quiz; which changes in lernapps/tooling (checks, review) and
      lernapps/practice (guidance)
- [ ] Ask the owner the open questions; record the answers as Key Decisions

### Completed

- [x] Created development plan file
- [x] Placed the feature in the platform design (lernapps/docs, pdt42): see Notes, "Platform fit"
- [x] Read the explainer's architecture where it is touched: see Notes, "Architecture today"

## Plan

### Tasks

### Completed

## Code

### Tasks

### Completed

## Commit

### Tasks

### Completed

## Key Decisions

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

1. **Result**: is a third state `teilweise` added (all exercise types see it in self-assessment and tutor query), or
   does the open task map ticked points to `richtig` (all) / `falsch` (some missing, the missing points as mistakes)?
2. **Photo**: the page shows it only (kept in memory, never stored, never sent); for the tutor, the learner attaches
   it in their own chat. Is that enough, or should the photo be kept on the device, too?
3. **Learning-path summary**: a short Markdown page per app (or chapter), written by the creator's assistant from the
   material, linked from every tutor page as background, not as a task. `dec-tutor-page` rejected a long page per
   chapter as *the* tutor page; as background it is a second source. Acceptable?
4. **Scope**: explainer only (the quiz has no tutor), with the guidance in lernapps/practice and the checks in
   lernapps/tooling in the same increment, or the runtime first?

- The `workflows` MCP server (`.mcp.json`) is not loaded in this session, because the session started in `/home/user`,
  not in a repository. This plan follows the EPCC template by hand until a session loads the server.
