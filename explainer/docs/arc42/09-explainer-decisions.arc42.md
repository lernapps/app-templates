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
inside a component or a live exercise.

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
one. An exercise component has its `about` and each number's task and solution from its `describe`, as many as fit
into 64 kB (`risk-tutor-component-numbers`). The guide stands on the tutor page alone: the prompt of way A, the lines
of way B and the result line speak in the learner's voice and carry no rule, and the app writes no `llms.txt`, so that
no two texts can tell the tutor different things. Learners come with one of two needs, and each gets its own way. A, "Mit
<name> lernen", a bar beside the title of every content page, where the learner is at work, once an assistant is on
(`dec-tutor-assistant`; a chapter page starts none): one sentence that asks for help with the page, with the page's
task numbers alone; the tutor asks what the child knows, leads through the page section by section, checks each with
a question on its content, and only then sends the child to its task. With the exercise in the query of way A, the
tutor went straight for the task (hand test on claude.ai, 2026-10-26). B, "Hilfe" in
every exercise, before the first input too, "Warum?" after a wrong one: one sentence that names the task, then the
input with its tries and the app's message word for word, so the tutor starts from what the learner was told;
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
addresses: qg-privacy, qg-understandable, con-no-request-before-click, risk-tutor-component-numbers
:::
```

## The Learner Switches an Assistant On Once

Not every learner wants a KI tutor, and one who does wants it at hand on every page. So the learner chooses once:
on the start page ("Dein KI-Assistent", "Keiner" first) or beside the title of a content page, where "Mit einem
KI-Tutor lernen" stays folded while none is on. The choice is one of the app's assistants (Claude, ChatGPT and Le
Chat when the app names none in `tutor.providers`) or copying the text, and it is kept on the device, per app, as the
only thing the app keeps; nothing is sent. Once an assistant is on, each content page shows a small bar beside its
title with one button, "Mit <name> lernen" (way A; changed or switched off on the start page, as it is seldom changed) and one help button in the row of "Prüfen" and "Lösung" of every exercise (way B), with the assistant's
first letter as its symbol, so that the learner sees where a click leads: "Hilfe", "Warum?" after a wrong answer,
and "Zurück" on a page a tutor opened once the task is done; one button that changes its text, not two. While none
is on, an exercise has no help button. Both places say that the learner uses an account of their own and that the
assistant is no offer of lernapps.net, which only provides the content and the exercises. Rejected: the way chosen
anew on every page (a box above every page's content); a help button for learners without a tutor (it leads
nowhere); the providers' logos (their marks; a letter says enough); one choice for all apps of lernapps.net (apps
offer different assistants).

```arc42
:::decision
id: dec-tutor-assistant
title: The learner switches an assistant on once, kept on the device; help only while one is on
status: accepted
date: 2026-10-26
addresses: qg-privacy, qg-understandable, con-no-request-before-click
:::
```
