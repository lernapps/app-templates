# Architecture Decisions

The explainer's decisions, besides the generic ones.

## The Creator Writes Only Content

The explainer is a deep scaffold: rendering, navigation, formulas, figures, exercises with feedback, accessibility,
languages and the page without JavaScript come from the runtime; the creator writes YAML in `src/` and code only as a
Vue component where no block can say what the page needs. The build fails on any other file in `src/`. So the schema
fixes the explainer's structure, and an explainer app writes no architecture of its own. Rejected: free code in an
explainer.

```arc42
:::decision
id: dec-explainer-only-content
title: An explainer is its content, components only where no block fits
status: accepted
date: 2026-10-16
addresses: qg-checkable, qg-understandable, con-runtime-unchanged, con-component-rules
:::
```

## Every Page Complete Without JavaScript

Every fact is in a block, rendered at build; an exercise shows its solution folded, a component its `nojs` text (an
exercise component's written from its `describe`), so the page is complete without JavaScript and the client module
only adds. `lernapps check` opens every explainer page a second time with JavaScript off. Rejected: meaning only
inside a component or a live exercise. The one exception is the optional self-assessment (`dec-self-assessment`),
which needs a run in the browser and is no content of its own.

```arc42
:::decision
id: dec-explainer-complete-without-js
title: Every explainer page is complete without JavaScript
status: accepted
date: 2026-10-16
addresses: qg-explainer-readable-without-js, qg-accessibility
:::
```

## A Fixed Size per Component

A component stays within a fixed size of its own code, with Vue loaded once per page, so that a text-heavy page stays
quick to load; a component that needs more is split or becomes a built-in block. The figure is an implementation
detail of the runtime's build check. Rejected: no limit, which suits interactive apps but not pages read like text.

```arc42
:::decision
id: dec-explainer-component-size
title: A fixed size per component
status: accepted
date: 2026-10-16
addresses: con-component-rules, qg-explainer-readable-without-js
:::
```

## Task Numbers in the Address

Every seeded exercise numbers its distinct tasks, and the address holds the number of each exercise of the page, so a
link shared in class, a deep link and the tutor name the same task; the build ships each exercise's table of seeds.

```arc42
:::decision
id: dec-explainer-task-numbers
title: The task number in the address is the one identifier of a task
status: accepted
date: 2026-10-16
addresses: qg-checkable
:::
```

## One Tutor Page per Page, the One Source, Two Ways to It

A chat assistant such as claude.ai fetches only addresses that stand word for word in a message of its user; an
address in a fetched file does not count, absolute or relative. A static host serves the same file for any query.
So the tutor page of a content page `<chapter>/<page>/tutor/` holds everything the tutor needs, and every way to the
tutor names just this address, with where the learner is in its query: the page's task numbers as the page's own
address has them (`?rr-strom=16&rr-teilspannung=7`), and for way B the exercise (`uebung`) and its section
(`abschnitt`). The tutor reads the query from the message and looks the numbers up on the page. The tutor page is lean HTML with its
guide visible, so that parents and teachers see what the tutor gets: who the tutor helps (a child at an exercise of
this page), a few rules for guiding (short answers, the page's own tasks, nothing worked out by itself, explaining in
the chat and solving in the app), how to start each way, where the child is, then the page's content as
context and its exercises with every task number. A `generated` exercise is there once as its template, with hint,
steps and its typical mistakes as F1, F2 … with the app's messages, and below one line per task number with its
inputs and outputs, all worked out: the values of the placeholders, the solution, what each mistake gives. So the
tutor fills in and calculates nothing, can give any further task with its link, and never asks the learner to copy
one. An exercise component has its `about` and the same table from its exercise logic (`dec-component-table`), or
without one each number's task and solution from its `describe`, as many as fit into 64 kB. The guide stands on the tutor page alone: the prompt of way A, the lines
of way B and the result line speak in the learner's voice and carry no rule, and the app writes no `llms.txt`, so that
no two texts can tell the tutor different things. Learners come with one of two needs, and each gets its own way. A, "Mit
<name> lernen", a bar beside the title of every content page, where the learner is at work, once an assistant is on
(`dec-tutor-assistant`; a chapter page starts none): one sentence that asks for help with the page, with the page's
task numbers alone; the tutor asks what the child knows, leads through the page section by section, checks each with
a question on its content, and only then sends the child to its task. With the exercise in the query of way A, the
tutor went straight for the task (hand test on claude.ai, 2026-10-26). B, "Hilfe" in
every exercise, before the first input too, "Warum?" after a wrong one: one sentence that names the task, then the
input with its tries and the app's message word for word, so the tutor starts from what the learner was told: the
tutor page tells it to go first, briefly, into exactly that input and the task, which mistake of the table it is;
without a chat they open a new one, and on a page a tutor opened (`von=tutor`) they are copied for the running chat,
which a new chat would lose. "Zurück zum Tutor" copies a result line with the tutor page and the task. Copying
instead of an assistant adds the tutor page's Markdown, which lies beside it. Input and message leave the page only
with the learner's click. Measured on lernapps/elektrizitaet and Mathe-Karte (2026-10-26): with every number, a
page with two `generated` exercises and a component has 39 kB, the most with `generated` ones alone 54 kB; two
pages whose components describe each task at length would have 80 kB.
Rejected: one tutor page per chapter (long, and the tutor answered at length); a task file per task number, which the
tutor may fetch only from a line the learner pastes, and a tutor file per page beside the tutor page (each a second
source; the task files were not fetched from a link on the tutor page); a static page per task number (the numbers
of several exercises on one page multiply); the template with only the values per number (the tutor calculated the
solution itself); rules in the prompt, the lines, `llms.txt` or a whole-app prompt (they contradicted the tutor
page); an `llms.txt` with the pages alone (the tutor page and the pages take its part); a prompt that lists every file (one address per page, unreadable as a first message); absolute links in a
fetched file (not fetched); a Markdown tutor page alone (many browsers download `text/markdown`); hidden instructions
(look like prompt injection).

```arc42
:::decision
id: dec-tutor-page
title: One short tutor page per page, the one source of what the tutor gets, two ways to it
status: accepted
date: 2026-10-26
addresses: qg-privacy, qg-understandable, con-no-request-before-click
:::
```

## An Exercise Component Computes Its Table of Tasks

An exercise component's values and results are in its code (`generate`, `check`, `solution`), not in a declaration
the build could read, and its `describe` gives each number's task as text of about 1 kB on Mathe-Karte, so two pages
showed only 49 to 54 of 67 numbers within 64 kB. So the component gives the tutor what a `generated` exercise gives:
its logic module exports `template(props, lang)`, the task once with `{name}` for each input; `params(task, props,
lang)`, the inputs of each task; `mistakes(task, props)`, the answer of each typical mistake of `about.mistakes`; and
`show(answer, task, props, lang)`, an answer as text. The build computes the outputs itself, the solution as
`show(solution(task))` and each mistake as `show` of its answer, and checks them for every task number: `check`
accepts the solution and rejects each mistake's answer, the inputs have the same names for every task, and each
placeholder is one of them. So the table cannot drift from the code. The four exports are optional, all or none; a
component without them keeps the lines from `describe` within the budget, and the build gives a hint
(`vue-component-tutor-table`), to become a warning once the apps have them. Measured on Mathe-Karte (`feat/explainer`,
2026-10-26) with example declarations of `ProzentGrundbegriffe`, `ZufallPfade` and `ZufallTerm`: `grundbegriffe`
23 kB instead of 64 kB, `pfadregel-2` 35 kB instead of 63 kB, every number on the page. Rejected: the outputs as
expressions in the language of `generated` (`about.formula`, the first proposal of #80; terms, trees, sets and
choices have no such expression); shorter texts from `describe` (still one text per number, and the tutor would
read the values out of prose); a task file per number (fetched only from a line the learner pastes,
`dec-tutor-page`).

```arc42
:::decision
id: dec-component-table
title: An exercise component computes its table of tasks for the tutor, checked against check
status: accepted
date: 2026-10-26
addresses: qg-checkable, qg-understandable
:::
```

## The Explainer Checks an Exercise Component's Answer

An exercise component drew its own "Prüfen", called `check` and reported the result with `answered`: every app built
the same button and its style anew (the questions style only buttons inside `.question`, so it was small and plain),
the answer reached the tutor as text only when the component sent it, and a component could report a result other
than its logic's. So a component is the input of its task and nothing more: it emits `answer` with the learner's
answer each time it changes, and may declare `checked: boolean`, true once its answer is checked. The explainer
renders its island in a form with "Prüfen" in the row of the questions (Enter in a field checks), enabled while there
is an answer not checked yet; it calls `check(task, answer)`, `reason(task, answer, props, lang)` for the app's message
of a wrong answer and, when there, `show` for the answer as text, gives the feedback and passes all three on to "Hilfe"
and "Zurück". Its logic module gets one export more, `reason`, which the property test calls on the wrong answer.
`answered` is gone, without a transition: the build names it as an error, with what to do instead. Kept out, until an
app needs them: texts of the task and the messages in the block (the props hold them, so the component and `reason`
fill them in), the explainer's own "Lösung" and "Zurücksetzen" for a component, and finding the mistake by comparing
answers (most components' mistakes are kinds of answers, "Amperemeter parallel", not single values, so `reason` stays
code). Tried on all exercise components of elektrizitaet, anorganische-chemie, mechanik-explainer and Mathe-Karte
(2026-10-26). Rejected: the component's own button with shared CSS (#85, a stopgap); "Prüfen" inside the island,
whose DOM Vue owns (#83); `v-model`, as nothing flows back into the component while there is no "Lösung".

```arc42
:::decision
id: dec-explainer-checks
title: The explainer draws "Prüfen" and checks an exercise component's answer with its logic module
status: accepted
date: 2026-10-26
addresses: qg-checkable, qg-accessibility
:::
```

## The Learner Switches an Assistant On Once

Not every learner wants a KI tutor, and one who does wants it at hand on every page. So the learner chooses once:
on the start page ("Dein KI-Assistent", "Keiner" first) or beside the title of a content page, where "Mit einem
KI-Tutor lernen" stays folded while none is on. The choice is one of the KI assistants the runtime offers, the same for every app,
or copying the text, and it is kept on the device, per app, as the
only thing the app keeps; nothing is sent. Once an assistant is on, each content page shows a small bar beside its
title with one button, "Mit <name> lernen" (way A; changed or switched off on the start page, as it is seldom changed) and one help button in the row of "Prüfen" and "Lösung" of every exercise (way B), with the assistant's
first letter as its symbol, so that the learner sees where a click leads: "Hilfe", "Warum?" after a wrong answer,
and "Zurück" on a page a tutor opened once the task is done; one button that changes its text, not two. While none
is on, an exercise has no help button. Both places say that the learner uses an account of their own and that the
assistant is no offer of lernapps.net, which only provides the content and the exercises. Rejected: the way chosen
anew on every page (a box above every page's content); a help button for learners without a tutor (it leads
nowhere); the providers' logos (their marks; a letter says enough); assistants named per app (`tutor.providers`; no
app named others, and a learner meets the same choice in every app); one choice for all apps of lernapps.net (each
app keeps what it stores apart).

Mistral Vibe loads no address from a message that arrives through its own address (`?q=`): it counts as not written by the
learner. So an assistant can carry `paste`: the click copies the start prompt, the one sentence with the address of the
tutor page, at once, and opens the chat with a short placeholder message ("Ich brauche Hilfe bei einer Lern-Einheit.
Ich schreibe Dir gleich, worum es geht."), which holds no address. The learner pastes the sentence; it is now their own
message, and the tutor loads the tutor page from it. The copy starts in the click, as a browser refuses it once the new
window has the focus (Edge did, after a fetch of the tutor page's Markdown). Choosing such an assistant shows a short
note on how it works. Rejected: the prompt alone in the address (Mistral Vibe fetches nothing from it); a plain link to Le
Chat (the learner would write the prompt by hand); copying the Markdown as well (a fetch first, and the copy came too
late).

```arc42
:::decision
id: dec-tutor-assistant
title: The learner switches an assistant on once, kept on the device; help only while one is on
status: accepted
date: 2026-10-26
addresses: qg-privacy, qg-understandable, con-no-request-before-click
:::
```

## A Video Loads Only After a Click

A video block is a link to YouTube until the learner asks for the player. Before the click the page shows the title,
the channel and a note that playing sends data, among them the IP address, to YouTube/Google, and it requests nothing
from another host: `con-no-request-before-click` holds, and the page needs no consent banner. The click on "Video
abspielen" is the learner's consent for this one video, given with the note in view; only then does the player load,
from YouTube's privacy-enhanced host youtube-nocookie.com, with the app's origin as its only referrer, so YouTube never
sees the task numbers or `von=tutor` in the address. "Videos immer direkt laden" is a standing consent: kept on the
device under the app's prefix (`con-state-on-device`), shown ticked on every video, and withdrawn by unticking it. No
thumbnail, as YouTube's image would load before the click and an own one needs the rights to it. An app with a video
loads from another server after a click, so its catalog entry says `fitness.thirdParty: on-click`. Rejected: a direct
embed (requests to Google on opening the page, a consent banner); only a link (the learner leaves the page for
YouTube's recommendations); the video in the bundle (rights, size).

```arc42
:::decision
id: dec-explainer-video-two-click
title: A video is a link until the learner's click loads its player from youtube-nocookie.com
status: accepted
date: 2026-10-26
addresses: qg-privacy, qg-explainer-readable-without-js, con-no-request-before-click, con-state-on-device, risk-explainer-video-after-click
:::
```

## A Self-Assessment Checked Only as a Whole

A learner may want to know before learning which pages they can skim. So an explainer may offer a self-assessment: the
app's for the whole app, a chapter's for that chapter. It shows exercises of the content pages without the page around
them, a few on each of its pages (best two to five), and checks no single one: only "Auswerten" checks them all
together, and the result is per content page, the level at which the learner goes on: probably known (all right),
look at it again (at least half), read it (less); a page none of whose exercises is asked is "not asked", as some
content, an open activity for one, cannot be checked. A generated exercise is preferred, as each run draws a new
task. It is optional for the learner and for the app: the content declares it, and an agent adds it when the content
and its forms of teaching are known, at the end (tooling skill `lernapps-explainer-self-assessment`). It needs
JavaScript; without it the offer stays hidden and its page says so in one line. Rejected: feedback after each
exercise (it would teach, not assess); a result per chapter (too coarse to say where to start); exercises of its own
(they would duplicate the pages' and miss the tutor's tables); exercise components (their answers come from islands
that a page of several exercises does not load yet).

```arc42
:::decision
id: dec-self-assessment
title: An optional self-assessment checks its exercises only as a whole and says per content page where to start
status: accepted
date: 2026-10-28
addresses: qg-understandable, qg-explainer-readable-without-js
:::
```

## The Last Result of a Self-Assessment Stays on the Device

The learner should find their result again, and a tutor should be able to accompany them from it. So the result of
the last run stays on the device, under the app's prefix (`con-state-on-device`), one per self-assessment, so the app's
and a chapter's do not mix; a new run replaces it, and "Ergebnis löschen" removes it. It holds per exercise its
reference, its task number, right, wrong or not answered, and the input and typical mistake of a wrong one: nothing
about the learner, and nothing is sent. The learner takes it to a tutor with a click: the tutor page of the
self-assessment, its address holding the result (`?a1=17-falsch-F1`), in one sentence with a line per exercise, in the
address of the assistant chosen or copied with the tutor page's Markdown, as on the content pages
(`dec-tutor-assistant`). The tutor page holds each exercise with its table of task numbers, solutions and mistakes,
and the links to the content pages and their tutor pages, so the tutor can look up and send the learner to the pages
to learn. Rejected: keeping every run (a history about the learner); a result only in memory (lost on the way to the
tutor); the result sent anywhere (`qg-privacy`).

```arc42
:::decision
id: dec-self-assessment-result
title: The last result of a self-assessment stays on the device and goes to a tutor only with a click
status: accepted
date: 2026-10-28
addresses: qg-privacy, con-state-on-device, con-no-request-before-click
:::
```
