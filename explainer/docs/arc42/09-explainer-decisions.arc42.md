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

Formulas, too, are set at build; the browser has no formula renderer. Trade-off for a generated exercise: the build
sets a chemical formula of a drawn value (`\ce{{{r.gl}}}`) once for every value of its list. That makes the page
larger and allows only values from a list, and only as the whole formula. Rejected: Temml in the client, which would
make every page with an exercise larger.

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
without a chat they open a new one, and on a page a tutor opened (`via=tutor`) they are copied for the running chat,
which a new chat would lose. "Zurück zum Tutor", at the top and the end of the page, copies the page's tutor page with
the page's task numbers and a line for each task of the session (how far the learner got, a wrong one with its input
and the app's message), so that the tutor loads the tutor page and coaches on exactly these tasks; "Zurück" at one
task copies that task's result line. Copying
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

## The Scope Gives the Tutor the Whole Learning Path

To judge an open answer, a tutor needs the exact content of the whole learning path, not only of the page at hand: for
a test, what the class learnt and what it did not is what counts (lernapps/practice#19). The material, photos of
worksheets for a made-to-measure app, is seen only while building. So the creator's assistant writes the scope: long
continuous prose in its own words, beside the content it describes: `scope` in each page's YAML, optionally in a
chapter's, and in `src/app.yaml` what the app is about and what does not belong to it (what belongs to it is what the pages
say); with the app's, every
page has its own, which the build checks. A scope beside its page is kept in step with it and needs no paths that
could go wrong (owner, 2026-10-30; first built as one file `src/scope.md`). It is no page for the learner: the build writes a scope beside each page
(`<chapter>/<page>/scope/`, the page's part with what does not belong to the scope), combines all of a
chapter beside the chapter and the whole beside the app, each linking one level up, for no menu and no search engine;
each tutor page links its page's scope (`scope/` in place of `tutor/`) with a guide: read it before judging an open
answer, go up when a point's source is on another page;
if it cannot be fetched (security settings may block it, which an assistant notices itself), give the learner its full
address and ask them to allow it, and until then judge no open answer and answer nothing about the content from
general knowledge. This revises `dec-tutor-page`: the tutor page stays the one source of the task, the scope is the
source of the content. Rejected: a summary page for the learner (a second content page to keep in step); one file for
the whole scope (it drifts from the pages, and each part has to name its page by a path); a list instead of prose (the
exact content is missing).

```arc42
:::decision
id: dec-scope
title: The scope, prose of the whole learning path in the creator's own words, gives the tutor the content
status: accepted
date: 2026-10-30
addresses: qg-understandable
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

## The Learner Names What Helps; the Tutor Page Holds a Short Section for Each

Some learners learn better when the tutor talks to them in a particular way: in short steps, with
little to read, with deeper questions, in simple German for another first language, literally, or with numbers as
amounts. So beside the assistant the learner chooses none, one or several of six needs, each named by what helps,
never by a diagnosis: `kurze-schritte`, `wenig-lesen`, `mehr-tiefe`, `andere-muttersprache`, `klar-und-woertlich`,
`rechnen-anschaulich`; with `andere-muttersprache` also the first language, from a list. Beside each need one or two
sentences say what it does. Unlike the assistant, which each app keeps apart (`dec-tutor-assistant`), the needs are
the learner's own and the same in every explainer: the choice holds for every explainer of lernapps.net
(`lernapps:settings:explainer:`) or for this app only (`lernapps:<id>:`, which wins); nothing is sent before a click. Every address the learner hands to a
tutor that starts a chat, the start prompt of way A, the lines of way B1 and the prompt of a self-assessment, carries the needs in the tutor page's
query (`bedarf=kurze-schritte,andere-muttersprache`); with `andere-muttersprache` the prompt adds one sentence in the
learner's voice, "Meine Muttersprache ist Türkisch." A running chat (B2, "Zurück zum Tutor") has them already. The
tutor page is static, so it holds the section of every need, after its guide under "Besondere Anforderungen": they
hold when the query names them and go before the guide; each says where it departs from it ("Im Gegensatz zu oben
…") and has at most two sentences, about 200 characters, so that the six together do not drown the guide. Of two needs that differ, the stricter one holds. The tutor reads the
query as it reads the task numbers. The sections draw on research on teaching, support and feedback; none of it is
on tutoring in a chat, so each section is checked by a hand test like the guide.
Rejected: a page per need or a central page of all needs on the GitHub Pages of lernapps/app-templates (a second
address to fetch, untested; several needs multiply the addresses); the needs as rules in the prompt (they would
contradict the tutor page); free text (the same, and nothing to check); names of diagnoses (health data about a child
in an address sent to the assistant's provider, and a label); learning styles (no evidence); a need for
encouragement and one for learners who cannot see the figures, not now.

```arc42
:::decision
id: dec-tutor-needs
title: The learner chooses needs named by what helps; the tutor page holds a short section for each, chosen by its query
status: accepted
date: 2026-10-30
addresses: qg-privacy, qg-understandable, qg-accessibility, con-no-request-before-click, con-state-on-device
:::
```

## A Video Loads Only After a Click

A video block is a link to YouTube until the learner asks for the player. Before the click the page shows the title,
the channel and a note that playing sends data, among them the IP address, to YouTube/Google, and it requests nothing
from another host: `con-no-request-before-click` holds, and the page needs no consent banner. The click on "Video
abspielen" is the learner's consent for this one video, given with the note in view; only then does the player load,
from YouTube's privacy-enhanced host youtube-nocookie.com, with the app's origin as its only referrer, so YouTube never
sees the task numbers or `via=tutor` in the address. "Videos immer direkt laden" is a standing consent: kept on the
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

A learner may want to know before learning which pages they can skim. So an explainer may offer a self-assessment. A
chapter declares its own, the unit a learner works through; the app's is every chapter's together, so that one run
covers all and a tutor can go on chapter by chapter with the same exercises. It shows exercises of the content pages without the page around
them, a few on each of its pages (best two to five), and checks no single one: only "Auswerten" checks them all
together, and the result is per content page, the level at which the learner goes on: probably known (all right),
look at it again (at least half), read it (less); a page none of whose exercises is asked is "not asked", as some
content, an open activity for one, cannot be checked. One task alone is too little to call a page known: right, it is
"look at it again". A generated exercise is preferred, as each run draws a new task, and it may be listed twice for
two tasks of its own; the options of a choice are mixed anew for each run, so that a second run asks the question,
not the place of its answer. It is optional for the learner and for the app: the content declares it, and an agent adds it when the content
and its forms of teaching are known, at the end (tooling skill `lernapps-explainer-self-assessment`). It needs
JavaScript; without it the offer stays hidden and its page says so in one line. Rejected: feedback after each
exercise (it would teach, not assess); a result per chapter (too coarse to say where to start); a self-assessment of
the app declared apart from the chapters' (two lists of the same exercises to keep in step); exercises of its own
(they would duplicate the pages' and miss the tutor's tables). An exercise component may be in it as well, and may be
listed twice like a generated exercise: its island shows the task the run draws, without "Prüfen", and judges each
answer silently for "Auswerten"; its typical mistake comes from its logic's mistakes. Its tasks often check a page
best, so leaving components out left whole chapters unasked.

```arc42
:::decision
id: dec-self-assessment
title: An optional self-assessment checks its exercises only as a whole and says per content page where to start
status: accepted
date: 2026-10-28
addresses: qg-understandable, qg-explainer-readable-without-js
:::
```

## A Partly Right Answer Counts Half

An answer may be partly right: an open answer has some, not all, points of a good answer (lernapps/practice#19). It
counts half, so that a page with one right and one partly right of three is "look at it again", and its result
`teilweise` names the points it missed (`P2`) as a wrong one names its mistake (`F1`). An exercise component may say so
as well (`partly`, `missed`). Rejected: counting it as wrong (writing half an answer would count as writing none) or
as right (a page would be "known" with points missing).

```arc42
:::decision
id: dec-self-assessment-partly
title: A partly right answer counts half and names the points it missed
status: accepted
date: 2026-10-30
addresses: qg-understandable
:::
```

## An Open Task Is Answered First, Then Compared With Points

Some subjects need answers in the learner's own words: German, foreign languages, religion (lernapps/practice#19). An
example with a model answer beside it was only read, tied to nothing in the material, and gave the self-assessment and
the tutor nothing to work with. So an open task asks for the answer first, typed or written on paper and photographed
(the choice "Deine Lösung"), and only then shows the points of a good answer, 2 to 5, each about the content with its
source in the app, linked to read up, or about the form; the learner ticks those the answer has, which makes them read
each point; the ticks give right, partly right (`dec-self-assessment-partly`) or wrong at once, without a step of
their own, and comparing opens the model answer.
Without JavaScript the page shows the task, the points and the model answer under "Lösung", as every exercise has one.
The tutor page gives the tutor the points as P1, P2 … with their sources, the model answer and how to help; the result
line carries the ticked points and the answer, a photo only as a note that the learner attaches it. The answer stays on
the device: the text, the way chosen and the ticks are kept while the tab is open (sessionStorage through the tooling's
storage, under the app's prefix), so that a reload loses nothing and a new day starts afresh; the photo is shown from
memory and never stored or sent; a self-assessment keeps nothing of its own. Rejected: grading by a model (no model runs in
the browser, `dec-tutor-variant`; a server would collect what learners write); a model answer without the learner's own
answer first (it is only read); a word search over the answer (easy to fool; at most a hint).

```arc42
:::decision
id: dec-open-task
title: An open task is answered first, then compared with points that name their sources
status: accepted
date: 2026-10-30
addresses: qg-understandable, qg-privacy, qg-explainer-readable-without-js
:::
```

## The Last Result of a Self-Assessment Stays on the Device

The learner should find their result again, and a tutor should be able to accompany them from it. So the result of
the last run stays on the device, under the app's prefix (`con-state-on-device`), one per self-assessment, so the app's
and a chapter's do not mix; a new run replaces it, and "Ergebnis löschen" removes it. A run a tutor opened
(`via=tutor`) is no self-assessment of the learner's: it keeps nothing. It holds per exercise its
reference, its task number, right, wrong or not answered, and the input and typical mistake of a wrong one: nothing
about the learner, and nothing is sent. The learner takes it to a tutor with a click: the tutor page of the
self-assessment, its address holding the result (`?a1=17-falsch-F1`), in one sentence with a line per exercise, in the
address of the assistant chosen or copied with the tutor page's Markdown, as on the content pages
(`dec-tutor-assistant`). Rejected: keeping every run (a history about the learner); a result only in memory (lost on the way to the
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

## The Tutor Guides Through Chapters and Rounds

After a self-assessment the tutor is a guide, not a teacher: explaining and practising happen on the pages, with their
"Hilfe" and their own tutor pages. The self-assessment's tutor page tells the tutor to go chapter by chapter: the pages
that do not stick, each opened with `via=tutor` and ending in "Zurück zum Tutor", then a new round of the chapter's
self-assessment, also with `via=tutor`, which draws new tasks; after each round the tutor decides on the next chapter
or another round, and sends a page that does not stick after two rounds to "Mit einem KI-Tutor lernen" on the page.
When the learner comes back from a page with a wrong task, the guide loads the page's tutor page and coaches on exactly
those tasks, then guides on. Each round's "Zurück zum Tutor" ends with the link of the next round, which names the task
numbers of this one (`vorher=a1.28`): the next round draws others where it can. On
a page a tutor opened, the clipboard is always the way back: the self-assessment's "Zurück zum Tutor" copies the result
per page, a line per exercise and the tutor page with the result in its address, as the result
line of a content page does. The tutor page holds every chapter with its pages and the link to its self-assessment, and
the exercise behind each key; no tables of solutions, which the pages' tutor pages hold. It holds no address: a static
page does not know where the app is served, and an assistant resolving relative links led the learner to tutor pages
(ChatGPT, 2026-10-28). The message the learner sends, written by the browser, ends with the full address of every
page and every self-assessment of the app with `via=tutor`, and the guide takes links only from there. The
parameter is `via=tutor`, without the old `von=tutor`. A copy for the running chat keeps the tab open: closing it let the browser show
some other tab, and the learner did not see that something was copied. The button says "✓ Kopiert" for a while, as the tutor
bar does after copying, and a line below it where to paste. Rejected: the tutor explaining
the tasks of the self-assessment itself (a second place to teach, and solutions in view); a new chat per round (the
tutor would lose the course of the learner).

```arc42
:::decision
id: dec-self-assessment-tutor
title: After a self-assessment the tutor guides chapter by chapter, with rounds whose result comes back through the clipboard
status: accepted
date: 2026-10-28
addresses: qg-understandable, qg-privacy, con-no-request-before-click
:::
```

## Format 2 Places the App on the Learning Map

The catalog's learning map shows which apps practise which competencies. The app owns where it belongs: it names one
strand (or `none`, so that none forgets), or the subject of a unit app that practises competencies of several strands
of a subject whose map allows it (`explainerFocus: competency`, lernapps/apps#226); never both. Each page names the
competencies it practises. The build hands this to the
catalog (`if-page-list`); the catalog owns the subjects' ids and checks them. The fields are required, so this is a
new format; format 1 stays valid for apps that do not move, and they are not on the map. Rejected: strand and
competencies in the catalog entry (the pages would be listed twice); optional fields in format 1 (an app could forget
them).

```arc42
:::decision
id: dec-explainer-format-2
title: Explainer format 2 names the app's strand or subject and each page's competencies, and the build lists the pages
status: accepted
date: 2026-11-03
addresses: qg-checkable, con-runtime-unchanged
:::
```

## A Recap Page Repeats a Competency the App Does Not Practise

A competency may require one the app does not practise; its learners may need it again. A recap page repeats it with
descriptive blocks only: practising stays the job of the apps the map lists for it. The runtime, not the author, links
the competency on the map, so the link cannot be missing; the catalog checks that the competency exists. Rejected:
exercises on a recap page (the app would practise a competency the map does not show for it); a link the author writes
(it could be missing or wrong).

```arc42
:::decision
id: dec-explainer-recap-page
title: A recap page repeats a competency of another strand without exercises and links it on the learning map
status: accepted
date: 2026-11-03
addresses: qg-understandable, qg-checkable, con-no-request-before-click
:::
```

## A Language Task Is Written, Then Checked Against the Answers It Lists

The learning map has foreign languages: learners should write words, forms and sentences, not only choose. Their
textbooks differ, so a task carries what it asks: each item names what the learner starts from (the other language,
a cue, or a marker of a labelled figure) and its answer with its variants. One block, `language-task`, has four
modes (`write`, `gap`, `choice`, `table`); the direction is part of the task. The check is deterministic and the same
in browser and build: it evens out what is no mistake, then finds mistakes of form, wrong unless the task loosens
them, then the item's typical mistakes. Several items give right, partly right (`dec-self-assessment-partly`) or
wrong. Fields are marked with their language. Rejected: grading by a model (`dec-tutor-variant`); a class for typing
errors (it would hide wrong endings); mistakes of form right by default; the learner choosing the direction; a
textbook's word list (a basic vocabulary beside the learning map guides creators instead).

```arc42
:::decision
id: dec-language-task
title: A language task is written by the learner and checked deterministically against the answers it lists
status: accepted
date: 2026-11-08
addresses: qg-understandable, qg-checkable, qg-accessibility, qg-privacy, qg-explainer-readable-without-js
:::
```

## Audio Is Synthetic, Marked in Its File, and Made While the App Is Written

Foreign-language learners must hear the language. Every sentence of a dictation is an MP3 file in `src/audio/` that the
creator makes while writing the app with the audio skill (`lernapps-audio` in lernapps/tooling) and commits with it. The skill
offers a fixed list of voices that the owner chose by listening (Kokoro, and Piper for one French voice), under licences that
allow the CC BY-SA content to be copied. The file carries what it is: the EU AI Act asks providers of generated speech to mark
it machine-readably (Article 50(2)), so the file has, as ID3 frames, that a model made it, which model and voice, the licence
and the credit its data source asks for, and the text; the build stops when one is missing, because a file without them
would be published unmarked. MP3 is the only format, because it plays in every browser (AAC only partly in Firefox, Opus
not in older Safari) and the frames survive. The marking is not signed and has no watermark: the Code of Practice on
Transparency asks for both for a provider who is bound by it, and whether a creator who runs an open model counts as one
is open; signing with C2PA was shown to work and comes later. Rejected: the browser's speech synthesis (its voices may be
remote, a hidden request), speech recognition or a check of the files with a model (Whisper: the owner decided against it, the
creator listens), a cloud service (audio and text would leave the device), a model in the browser (tens of megabytes
per voice), and the approval in the file (it is the git commit).

```arc42
:::decision
id: dec-audio-marking
title: Audio is synthetic speech made while the app is written, and its file carries the marking the build requires
status: accepted
date: 2026-11-12
addresses: qg-privacy, qg-checkable, qg-accessibility
:::
```

## A Dictation Is a Language Task That Starts From Audio, Played by the Browser's Own Player

A dictation, a gap dictation and a listening task with a translation are items of the language task that start from `audio`
instead of the other side, so the check, the rules of form, the typical mistakes and the self-assessment are the ones of every
language task (`dec-language-task`). The text of the file must be a right answer, or nobody could solve the task: the build
stops otherwise. The player is the browser's own, so it works without JavaScript, is as accessible as the browser, and loads
nothing before the learner presses play; the tempo is set in the player, with the pitch kept, because one file then serves every
pace and the creator has one file to listen to (a model that speaks slower was not better in the owner's listening test). The
player's own control has a tempo menu in Chromium and none in Safari and Firefox, so the page shows its three buttons (0.75, 1,
1.25) only where there is none, and a tempo chosen in a control becomes the page's tempo: one control for one thing. A voice a model
made is labelled "KI", small, with the model, the voice and the licence on hover and for a screen reader. The text of the file is the "Lösung" of the task, and the media overview lists it for review.

```arc42
:::decision
id: dec-audio-player
title: A dictation is a language task item that starts from an audio file, played by the browser's player with the tempo set in the player
status: accepted
date: 2026-11-12
addresses: qg-understandable, qg-accessibility, qg-privacy, qg-explainer-readable-without-js
:::
```

## A Speaking Task Records in Memory and the Learner Rates It

Speaking is practised by comparing, not by grading: the learner hears a model, records themself, plays the original, their
own recording or both one after the other, and rates how their pronunciation sounds, "Klingt gleich" (right), "Erkennbar, aber
holprig" (partly right) or "Nochmal" (wrong), after the model of the open task (`dec-open-task`), whose photo is also kept in memory only.
The microphone is asked for only when the learner presses "Aufnehmen" and released when the recording stops. The recording is a
Blob played through an object URL: it is never stored, never sent, and dropped when the learner records again or leaves the page. When
the microphone is missing or refused the learner says it aloud and still rates. A model never judges the pronunciation, since
no model runs on the device (`dec-tutor-variant`) and one that recognised words would hide the errors it should show. A speaking
task is not asked in a chapter's self-assessment, since a rating of a rating would tell nothing; the build says so.

```arc42
:::decision
id: dec-speaking-task
title: A speaking task records in the browser's memory, plays the recording against the original, and the learner rates it
status: accepted
date: 2026-11-12
addresses: qg-privacy, qg-understandable, qg-accessibility, qg-explainer-readable-without-js
:::
```

## The Media Overview Lists Every Medium of the App

Quality of images, audio and videos is checked where a creator or a reviewer can see all of them: the page "Medienübersicht"
at `medien/` of every explainer with media, linked from the start page, in each language. It lists each medium once with its credit and
licence, the pages that use it and, for an AI voice, the label, the model, the voice, the credit and the text with a player that
loads on press. It is built at build time and readable without JavaScript. An audio file that no page uses is listed too, so that
it is not forgotten. The approval of a file is not shown: it is the git history.

```arc42
:::decision
id: dec-media-overview
title: Every explainer with media has a media overview page that lists them with their credit and use
status: accepted
date: 2026-11-12
addresses: qg-checkable, qg-understandable
:::
```
