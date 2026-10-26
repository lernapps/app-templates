# app-templates

The archetypes of [lernapps.net](https://lernapps.net/) apps: one template folder per archetype, and at the root the
package `@lernapps/app-templates` with the runtime of each archetype that apps depend on. It is part of the tooling
with which a creator and their AI assistant build a learning app.

## Who it is for

- **Creators and their assistants** never open this repo: the generator of
  [lernapps/tooling](https://github.com/lernapps/tooling) copies a template folder into a new app. Start at
  [lernapps.net/apps/eintragen/](https://lernapps.net/apps/eintragen/), or, as an assistant, at
  [lernapps.net/tooling/llms.txt](https://lernapps.net/tooling/llms.txt).
- **Maintainers of an archetype** change its template and its runtime here.

## What is in it

What each archetype can and cannot do is in the README of its folder: [quiz](quiz/README.md),
[explainer](explainer/README.md), [interactive](interactive/README.md). Change it in the same pull request as the
feature: assistants read it before they choose an archetype.

| Folder | Archetype | What the app supplies |
|---|---|---|
| [`quiz/`](quiz/) | a quiz about things to know: questions with options, feedback on every option, score and solutions, in one or more languages (a page per language) | the question bank `src/quiz.json` ([schema](runtime/quiz/quiz.v1.schema.json)) |
| [`explainer/`](explainer/) | an explainer: chapters of pages with sections, formulas, figures, tables, timelines, definitions with a glossary, quotes and code, and an exercise on every page (the quiz's question types, and `generated` exercises drawn from a seed and property-tested at build), readable without JavaScript, in one or more languages; Vue components for what no block can express | the content as YAML in `src/`: `app.yaml`, a folder per chapter with `chapter.yaml` and its pages, `data/` and `images/`, and `components/` ([schema](runtime/explainer/explainer.v1.schema.json)) |
| [`interactive/`](interactive/) | an interactive app whose doing is the content (a game, a trainer): a static start page, readable without JavaScript, and an app page with the app's own Vue components, its routes as `app/#<id>`; the build plays its playthroughs against its core | `src/app.yaml` ([schema](runtime/interactive/interactive.v1.schema.json)), the core `src/core/index.ts` (`start(seed, route)`, `step(state, input)` with a key or an action of its root component, optional `tick(state, dt)`), its components in `src/ui/`, data in `src/data/`, and `src/playthroughs/*.yaml` ([schema](runtime/interactive/playthrough.v1.schema.json)) |

- [`runtime/`](runtime/): the runtime of each archetype, published from git as `@lernapps/app-templates`; its exports
  are in [`package.json`](package.json), what each does in the comments of its source. The quiz's questions also work
  one by one, for other archetypes that embed them as exercises: `@lernapps/app-templates/quiz/question` (schema,
  validation, rendering, checker, messages; a question's texts may be maps by language), `startQuestion` of `@lernapps/app-templates/quiz` and the helpers of
  `@lernapps/app-templates/quiz/e2e`; [`test/fixtures/question-page/`](test/fixtures/question-page/) is a page built so.
- The placeholders of the explainer's `generated` exercises are always two braces around a declared name or its
  field, nothing else inside: `{{G}}`, `{{e.name}}`, `{{answer}}`, in prose and in formulas alike
  (`$\frac{{{W}}}{{{G}}} \cdot 100 = {{answer}}$`). One brace is never a placeholder, so in a formula `G`, `{G}` and
  `\frac{W}{G}` are letters; the only LaTeX form this reserves, a double group around a lone name, means the same as
  the name alone. The build fails on a placeholder whose name `given` does not declare, on one brace or spaces where a
  placeholder was meant in prose (`{G}`, `{{ G }}`), on a variable of `given` that nothing uses (no placeholder, and
  no expression of the figure, answer or mistakes; `where` does not count), and on a placeholder left after filling in
  ([`generated.ts`](runtime/explainer/generated.ts)).
- An explainer's components are Vue single-file components in `src/components/<Name>.vue`, each with
  `<script setup lang="ts">`, typed props and its test `<Name>.test.ts`, used by a `vue-component` block with its
  `props` and a `nojs` text. The build renders each with Vue's server renderer into its island, `hidden` until it
  hydrates; only a page with a component loads Vue. It checks each block's props against the component's prop types,
  and on the SFC compiler's output: no network, no `eval`, `new Function`, `innerHTML` or `v-html`, imports only from
  `vue`, this runtime, `@lernapps/tooling/storage`, `i18n` and `a11y` and the folder itself, browser globals only in
  `onMounted`, and 20 kB gzip of the component's own code. Once it runs, it replaces its `nojs` text, or keeps it
  folded as a text description under it with `defineOptions({ nojs: "caption" })`. A component that emits
  `answered { correct, reason?, answer?, message? }` is an exercise (`reason`: what went wrong in a wrong answer,
  shown with the feedback; `answer`: what the learner gave, as text, for the result line of "Zurück zum Tutor";
  `message`: the text the component showed for the answer, word for word, for the lines of "Hilfe",
  which take `reason` without it and leave the line out without both): it declares the prop `seed: number`, the seed of its task number, which the explainer gives it with "Aufgabe Nr."
  and "Neue Aufgabe" and keeps in the address (`?<id>=<n>`, the id of its block or its name in kebab case), and
  its logic module `<Name>.ts` exports `generate(seed, props)`, `check(task, answer)`, `solution(task)` and
  `wrong(task)`, which the build tests over 50 fixed seeds per block, `describe(task, props, lang)`, the task and its
  solution as a learner reads them (`{ task, solution }`, restricted Markdown), and `about`, what the exercise is for a
  tutor (`{ task, answer, correct, mistakes }`). The build checks `describe` for every task number in every
  language and writes the no-JS text of an exercise component from it: the task of number 1 with its solution folded,
  so it needs no `nojs` ([`components.ts`](runtime/explainer/components.ts)). For its table of tasks on the tutor
  page it also exports, all four or none, `template(props, lang)`, the task once with `{name}` for each input,
  `params(task, props, lang)`, the inputs of a task by name (`{ G: 1260, p: 15 }`, the same names for every task),
  `mistakes(task, props)`, the answer each typical mistake of `about.mistakes` gives (`undefined` for one without a
  single answer), and `show(answer, task, props, lang)`, an answer as text. The build checks them for every task
  number: `check` accepts the solution and rejects each mistake's answer, and each placeholder is an input. Without
  them the build gives a hint (`vue-component-tutor-table`).
- Every seeded exercise (generated, exercise component) numbers its distinct tasks: the build walks the seeds 1, 2,
  3, … through its generator, keeps each seed whose task differs from all before, up to 67, and the page shows
  "Aufgabe Nr. <n>" for them ([`tasks.ts`](runtime/explainer/tasks.ts)). The number is the one identifier of a task:
  `?<id>=<n>` opens task number n of the exercise `<id>` (a number above N wraps around). The address holds one
  parameter per exercise (`?a=3&b=12`), written on load and at every "Neue Aufgabe", so it is the page's state: a link
  to share in class, a deep link, and what a tutor reads; `seed`, `von`, `uebung` and `abschnitt` are no exercise id, and `?seed=<n>#<id>`
  still opens that exercise's task. The build ships each exercise's table of seeds. An exercise with fewer than 67 distinct tasks is
  noted in the build output.
- For a KI tutor, an assistant the learner brings and controls, the explainer writes static files only (a chat
  assistant that fetches a URL runs no JavaScript, and fetches only addresses its user wrote into the conversation,
  not those it finds in a fetched file). Per language tree and content page it writes the page's tutor page
  (`<chapter>/<page>/tutor/`, [`tutorpage.ts`](runtime/explainer/tutorpage.ts)), the one source of what a tutor gets:
  short, lean HTML without script or menu, which parents and teachers can open too, and its Markdown beside it
  (`index.md`). It tells the tutor that it helps a child who is at an exercise on this page of a lernapps.net app; how
  to guide (short answers without headings or lists, the page's own examples and tasks, nothing worked out by
  itself, explaining in the chat and solving in the app, no solution, never asking to copy a task); how to start: to
  learn the page, ask what the child knows, then lead through the page section by section, check each with a question
  on its content, and only then send the child to its task; with "Hilfe", start at the task, and after a wrong input
  with the app's message first go briefly into exactly that input and the task (which mistake it is); where the child is (the
  task numbers in its address, with "Hilfe" also `uebung` and `abschnitt`, the app's message) and how to give a
  further task; the app's own rules from `tutor.rules` in `app.yaml`. Then the page's content as context (texts,
  formulas as `$…$`, examples, definitions, notes, figures by alt text and caption) and its exercises with every task
  number. A `generated` one is there once as its template (`{G}`), with answer format, hint, steps, its typical
  mistakes as F1, F2 … with the app's messages and the link pattern `../?<id>=n&von=tutor#<id>`, and below a table of
  each task number's inputs and outputs, all worked out: `Nr. | p | G | Lösung | F1`, `27 | 15 | 1260 | 189 | 18900`.
  An exercise component has its `about`, and with its table of tasks its task once as its template, its typical
  mistakes as F1, F2 … and the same table as a generated one, `Lösung` and `F1` as `show` gives them, with every
  task number. Without the table it has each task number's task and solution from its `describe`; where these would
  make the page larger than 64 kB, the components show as many numbers as fit, the page says so, and the build warns. A question is there in
  full. There is no `llms.txt`: the tutor page and the pages themselves are what an assistant reads. The build checks
  every link and anchor of the tutor pages. Two ways lead to the tutor. The learner switches an assistant on once: on the
  start page ("Dein KI-Assistent", "Keiner" first) or beside the title of a content page ("Mit einem KI-Tutor
  lernen", folded while none is on: a select and "Einschalten"). The choice is one of the KI assistants the runtime
  offers, the same for every app, or "Ein anderer: Text kopieren"; it is kept on the
  device, per app (`@lernapps/tooling/storage`), and both places say that the learner uses an account of their own
  and that the assistant is no offer of lernapps.net, which only provides the content and the exercises. A chapter
  page starts no tutor. Way A: once an assistant is on, a bar beside the title of every content page with one button,
  "Mit <name> lernen", with the assistant's first letter as its symbol; the start page changes the assistant or
  switches it off. An assistant opens with the start prompt, one sentence in the learner's voice: "Lade <tutor
  page>?<id>=<n>&… und hilf mir, diese Seite zu verstehen.", with the page's task numbers alone, so that the tutor
  leads through the page before it comes to a task. ([`prompt.ts`](runtime/explainer/prompt.ts),
  [`position.ts`](runtime/explainer/position.ts)). Copying the text instead adds the tutor page's Markdown, for an
  assistant that fetches nothing. Without JavaScript the section has a plain link per assistant. Way B: while an
  assistant is on, every exercise (generated, question, exercise component) has one help button with its symbol, in
  the row of "Prüfen" and "Lösung" (below an exercise component): "Hilfe" before an answer and after the right one,
  "Warum?", standing out, after a wrong one. It gives the lines of that task ([`stuck.ts`](runtime/explainer/stuck.ts)),
  in the learner's voice too: without a chat (B1) "Lade <tutor page>?… und hilf mir bei Übung <id>, Nr. <n>. Ich komme
  nicht weiter.", then `Ich habe <input> eingegeben (<n> Versuche).`, `Die App sagt: „<message>“` (word for word
  what the feedback said: a generated exercise's message of its mistake or the general one, a question's reasons, an
  exercise component's `message`, else its `reason`) and the hint or solution opened; on a page opened with
  `von=tutor` (B2), where the button is there without an assistant switched on, it copies `Übung <id>, Nr. <n>:`,
  the same lines and `Tutor-Seite: <tutor page>?…` and closes the tab, as "Zurück zum Tutor" does, and once the task
  is right or its solution shown it is "Zurück", which copies the result line. No prompt and no line carries a rule
  for the tutor: the tutor page has them. After a wrong answer a sentence under the row says that input and message
  leave the page only with the click. "Neue Aufgabe" is a circular arrow beside the task number. A page opened with
  `von=tutor` shows "Zurück zum Tutor": it copies a result line (the exercise, its task number, "richtig im 2.
  Versuch", "Lösung angesehen" or "noch nicht gelöst (1 Versuch, Eingabe …)", the count of the session on this page,
  and the absolute address of the page's tutor page with where the learner is), waits 100 ms and closes the tab; when
  copying fails the tab stays open with the line selected in a field. The line goes to the clipboard only
  ([`result.ts`](runtime/explainer/result.ts)).
- Every exercise may carry `examples: { accepted, rejected }`, test cases that learners never see: the other correct
  answers its text allows, and typical wrong ones. The build runs each through the same check the page uses (the
  quiz's checker, a generated exercise's comparator for every seed, an exercise component's `check`) and fails on an
  accepted example the check rejects or a rejected one it accepts. An exercise component's block must have at least
  one of each, as its check is the app's own code; for every other exercise they are optional
  ([`examples.ts`](runtime/shared/examples.ts)).
- Both archetypes write `404.html` at the bundle's root: GitHub Pages serves it for any address the app does not
  have, and its script finds the app's root (the nearest folder upwards with a `404.html`, so a preview below
  `pr-preview/pr-<n>/` finds its own) and moves on to its start page
  ([`pages.ts`](runtime/shared/pages.ts)).
- Which commit of this repo a new app gets and what the generator adds to the template:
  `npx --yes github:lernapps/tooling#main create --help`.
- What an archetype is and how the parts fit: the [architecture of the tooling](https://lernapps.net/tooling/architecture/).
- A template has no `prepare` script of its own, so `npm install` in its folder leaves this repo's git hooks alone;
  the generator gives the app the one that installs them.

## Architecture

Every archetype follows one architecture, because they share its quality goals: the generic part in
[`docs/arc42/`](docs/arc42/) (the shared runtime with page trees, 404 page and examples check, and the tooling
helpers), and one extension per archetype in its folder, which adds the archetype's runtime (build step, validation,
rendering, shell, end-to-end tests) and the parts its creator writes. An app's architecture is both together.

- **Quiz** ([`quiz/docs/arc42/`](quiz/docs/arc42/)): the quiz rendering writes the bank into a worksheet page, the
  bank validation checks `src/quiz.json`, the quiz engine checks answers with the question types' checker and keeps
  only the last result on the device when the bank asks; no tutor.
- **Explainer** ([`explainer/docs/arc42/`](explainer/docs/arc42/)): the page rendering writes the YAML pages and the
  component islands at build, the content validation guards the content, the client module and the islands check
  answers in the browser and keep only the chosen way to the tutor; the tutor handoff and task numbers are built for
  it.
- **Interactive** ([`interactive/docs/arc42/`](interactive/docs/arc42/)): the start page and app page render from
  `src/app.yaml`, the build checks the core and plays the playthroughs, the shell mounts the root component and feeds
  the core inputs (today keys), ticks, route and seed; no tutor yet. Only an interactive app adds an architecture part
  of its own.

`node scripts/arc42.ts` validates the generic part with each extension (`arc42 validate --strict`, `--root` at the
repo root) and fails on any finding; the pre-commit hook runs it when an `*.arc42.md` or `.arc42ignore` file is staged,
and CI on every change.

## Contributing

`npm ci`, then the steps of the workflow [`check.yml`](.github/workflows/check.yml): the runtime's checks at the root
(with `npm run check:vue`, the type check of the fixtures' `.vue` files) and `lernapps check` in every template folder
and in `test/fixtures/question-page/`. `npm ci` also installs this repo's git hooks ([`.vite-hooks/`](.vite-hooks/)):
the pre-commit hook formats and fixes the staged files and checks a staged architecture (`vp staged`); the pre-push hook
([`scripts/pre-push.ts`](scripts/pre-push.ts)) checks nothing for a push of only the plan (`.vibe/**`) or only docs
(`docs/**/*.md`, the change scope of `lernapps changes`, whose classifier the hook fetches once at the commit check.yml
uses), and otherwise runs the root checks and `lernapps check --pre-push` in each template folder the push affects.
Install a template's folder (`npm install` in it) to push a change to it. Which paths affect which template is a
positive list, `TEMPLATE_PATHS`: a path on no list runs the root checks only, and CI, which gates every job on the
change scope and runs all of them for any code change, catches the rest; when it catches what the hook let through, add
the path to the list. The fixture jobs run only in CI. The job `check` reports the overall result and is the check to
require. A change reaches new apps once the pin in lernapps/tooling moves to its commit on `main`; Renovate moves
existing apps.

## License

[MIT](LICENSE). Apps created from these templates start with MIT as well.
