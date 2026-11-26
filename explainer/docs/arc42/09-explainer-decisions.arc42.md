# Architecture Decisions

The explainer's decisions, besides the generic ones.

## The Creator Writes Only Content

The explainer is a deep scaffold. The runtime brings rendering, navigation, formulas, figures, exercises, accessibility,
languages and the page without JavaScript. The creator writes YAML in `src/`, and a Vue component only where no block
fits. The build fails on any other file in `src/`. So the schema fixes the structure, and an explainer app writes no
architecture of its own. Rejected: free code in an explainer, which nobody could check.

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

Every fact is in a block and rendered at build. An exercise shows its solution folded, a component its `nojs` text. So
the page is complete without JavaScript, and the client only adds to it. `lernapps check` opens every page a second time
with JavaScript off. The optional self-assessment (`dec-self-assessment`) is the one exception: it needs the browser and
holds no content of its own.

Formulas are set at build too; the browser has no formula renderer. So a generated exercise may draw a chemical formula
only from a list, and the page holds it for every value. Rejected: meaning only inside a component or a live exercise;
a formula renderer in the client, which would make every page with an exercise larger.

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

Explainer pages are read like text, so they must load quickly. So each component stays within a fixed size of its own
code, and Vue loads once per page. A component that needs more is split or becomes a built-in block. Rejected: no
limit, which suits interactive apps but not text-heavy pages.

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

A link shared in class, a deep link and the tutor must name the same task. So every seeded exercise numbers its
distinct tasks, and the page's address holds the number of each exercise.

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

A chat assistant fetches only addresses its user wrote into a message, not addresses inside a fetched file. So each
content page has one tutor page that holds everything the tutor needs, and every way to the tutor names just this
address. Its query says where the learner is: the task numbers, and for way B the exercise.

The tutor page is lean HTML with a visible guide, so parents and teachers see what the tutor gets. It says whom the
tutor helps and how it guides, then gives the page's content and its exercises with every task number, all worked out.
So the tutor calculates nothing and can hand out any further task. The guide is the only place with rules: prompts and
lines speak in the learner's voice, and the app writes no `llms.txt`.

Learners come with two needs. Way A, "Mit <name> lernen" beside the page title, asks for help with the page. The tutor
leads through it section by section. Way B, "Hilfe" or "Warum?" in an exercise, names the task, the input and the app's
message. The tutor starts from that message. "Zurück zum Tutor" brings the results back into the running chat. Input and
message leave the page only with the learner's click.

Rejected: one tutor page per chapter (too long); task files or a tutor file beside the page (a second source, not
fetched); a static page per task number (too many); only the values per number (the tutor calculated wrongly); rules
in prompts or in `llms.txt` (they contradicted the tutor page); a prompt that lists every file (unreadable); a Markdown
page alone (browsers download it); hidden instructions (they look like prompt injection).

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

To judge an open answer, a tutor needs the content of the whole learning path: for a test, what the class learnt
counts. The material, such as photos of worksheets, is seen only while building. So the creator's assistant writes the
scope: continuous prose in its own words, beside the content it describes, in each page, optionally each chapter, and
the app. The app's scope also says what does not belong to it. A scope beside its page stays in step with it.

The build writes the scope per page, per chapter and for the app, for no menu and no search engine. Each tutor page
links its page's scope. The tutor reads it before judging an open answer. If it cannot fetch it, it asks the learner to
allow it and does not answer from general knowledge. This revises `dec-tutor-page`: the tutor page is the source of the
task, the scope the source of the content. Rejected: a summary page for the learner (a second page to keep in step); one
file for the whole scope (it drifts from the pages); a list instead of prose (the exact content is missing).

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

An exercise component's values and results live in its code, which the build cannot read as a declaration. As prose,
its tasks did not all fit on the tutor page. So the component's logic module may give the tutor what a `generated`
exercise gives: the task once as a template, the inputs of each task, the answer of each typical mistake, and an answer
as text. The build computes the table from these and checks it against the component's check for every task number. So
the table cannot drift from the code. Without these exports the tutor page keeps the prose, and the build gives a hint.
Rejected: outputs as expressions (terms, trees and sets have none); shorter prose (the tutor would still read values
from text); a task file per number (not fetched, `dec-tutor-page`).

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

Each exercise component drew its own "Prüfen" and reported its own result. Every app built the button anew, the tutor
got the answer only if the component sent it, and a component could report another result than its logic. So a
component is only the input of its task: it reports the learner's answer. The explainer draws "Prüfen" in the row of
the other exercises, checks the answer with the logic module, gives the feedback and passes it on to the tutor. The
old way of reporting a result is an error in the build, with what to do instead. Rejected: the component's own button
with shared CSS (a stopgap); "Prüfen" inside the component, whose DOM Vue owns; two-way binding, since nothing flows
back into the component.

```arc42
:::decision
id: dec-explainer-checks
title: The explainer draws "Prüfen" and checks an exercise component's answer with its logic module
status: accepted
date: 2026-10-26
addresses: qg-checkable, qg-accessibility
:::
```

## Feedback Holds for the Answer It Judged

A child changed a component's answer after "Richtig!" and still saw "Richtig!" beside a wrong answer. And "Prüfen"
without an answer said the same for every kind of exercise. So "Richtig!" goes when the answer changes. A wrong answer's
feedback stays until the next "Prüfen", since its reason helps to correct. Without an answer, the message says what is
missing for that kind of exercise. Rejected: treating an empty list as no answer (it may be right); clearing a wrong
answer's feedback on every change (its reason would go).

```arc42
:::decision
id: dec-feedback-for-checked-answer
title: Feedback holds for the answer it judged, and "Prüfen" without an answer says what is missing
status: accepted
date: 2026-11-26
addresses: qg-understandable, qg-checkable
:::
```

## An Ordering Gives Each Place Once, and Its Wrong Places Are Marked

Every item of an ordering could get "Platz 1", and the feedback did not say which item was wrong. So an ordering that
gives a place twice is incomplete, in a quiz too. In an exercise that may be tried again, a wrong ordering marks the
items in a wrong place and says how many are right. The solution stays hidden. Rejected: showing the right place (it
gives the solution away); controls that forbid a place twice (they hide why).

```arc42
:::decision
id: dec-ordering-places
title: An ordering gives each place once, and a wrong ordering marks the items out of place
status: accepted
date: 2026-11-26
addresses: qg-understandable, qg-checkable
:::
```

## An Exercise Component Is an Exercise Like the Others

An exercise component stood apart: no frame "Aufgabe", no solution after a wrong answer, no explanation after a right
one. So it looks and behaves like every exercise and shows the solution its logic already describes. An app may mark a
prop as no learner text. It may also start its exercises at task number 1, for young learners; a random start stays the
default, so a class does not all get the same task. Rejected: a new contract for explaining a right answer (the solution
is already there); reusing the wrong answer's message (the apps never meant it for that).

```arc42
:::decision
id: dec-component-exercise-like-others
title: An exercise component looks and behaves like every exercise, with its solution
status: accepted
date: 2026-11-26
addresses: qg-understandable, qg-checkable, qg-explainer-readable-without-js
:::
```

## The Learner Switches an Assistant On Once

Not every learner wants a KI tutor; one who does wants it on every page. So the learner chooses once, on the start page
or beside a page title: one of the assistants the runtime offers, or copying the text. The choice stays on the device,
per app, and nothing is sent. While one is on, each content page has the button of way A and each exercise one help
button for way B, marked with the assistant's first letter. While none is on, there is no help button. Both places say
that the learner uses their own account and that the assistant is no offer of lernapps.net.

Some assistants do not load an address that arrives through their own link. For them the click copies the start prompt
and opens the chat with a short message without address; the learner pastes the prompt as their own message.

Rejected: choosing the way anew on every page (a box above every page); help without a tutor (it leads nowhere); the
providers' logos (their marks); assistants per app (a learner should meet the same choice everywhere); one choice for
all apps (each app keeps its data apart); for the paste case, the prompt in the link alone (not fetched) or a plain link
(the learner would write the prompt).

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

Some learners learn better when the tutor talks to them in a particular way. So the learner may choose needs, each named
by what helps, never by a diagnosis: short steps, little to read, more depth, another first language, clear and literal
words, numbers as amounts. The choice holds for every explainer or for one app, and is sent only with a click. Every
address that starts a chat carries the needs in the tutor page's query. The static tutor page holds a short section for
each need, which holds when the query names it. The sections draw on research on teaching and feedback and are checked
by hand tests. Rejected: a page per need (more addresses to fetch); needs as rules in the prompt (they would contradict
the tutor page); free text (nothing to check); diagnoses (health data in an address sent to a provider); learning
styles (no evidence).

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

A video is a link to YouTube until the learner asks for the player. Before the click the page shows the title, the
channel and a note that playing sends data to YouTube/Google. It requests nothing from another host, so it needs no
consent banner. The click is consent for this one video. The player then loads from youtube-nocookie.com, with only the
app's origin as referrer. "Videos immer direkt laden" is a standing consent, kept on the device until unticked. An app
with a video says so in its catalog entry (`fitness.thirdParty: on-click`). Rejected: a direct embed (requests on
opening, a banner); only a link (the learner leaves for YouTube's recommendations); the video in the bundle (rights,
size).

```arc42
:::decision
id: dec-explainer-video-two-click
title: A video is a link until the learner's click loads its player from youtube-nocookie.com
status: accepted
date: 2026-10-26
addresses: qg-privacy, qg-explainer-readable-without-js, con-no-request-before-click, con-state-on-device, risk-explainer-video-after-click
:::
```

## Feedback Is Noted on the Device and Handed Over as One Issue

Teachers and parents who know the subject find what is wrong or unclear. The feedback mode lets them note it where it
is and hand all notes over as one issue in the app's repository, where the creator works. The notes stay on the device,
and the person hands them over with their own GitHub account. A note keeps its place when the content around it
changes. Rejected: a server that collects feedback (accounts, data, cost); an issue template in every repository; the
notes in the issue's address (too long).

```arc42
:::decision
id: dec-explainer-feedback-issue
title: Feedback is noted block by block on the device and handed over as the text of one new issue
status: accepted
date: 2026-11-22
addresses: qg-privacy, qg-explainer-readable-without-js, con-state-on-device, con-no-request-before-click
:::
```

## A Pull Request's Change Is Shown in the Running App, Block by Block

A change to an explainer is hard to check in the YAML diff: it spreads over blocks and pages, and the learner sees the
rendered page. So the build can compare the content with a base and mark the difference in the pages: new, changed,
moved and removed blocks and pages. Blocks are matched by identity, not by place, so one added block does not mark the
rest as changed. The marks use words, never colour alone. It is a build option for previews; a production build never
sets it. The base is a folder, so it also works locally. Rejected: a text report (the reviewer must find each place);
comparing the built HTML (it changes with every hash); a diff of two deployed apps (more requests and runtime); matching
by place (see above).

```arc42
:::decision
id: dec-explainer-diff-mode
title: The build writes a version's pages with its difference to a base marked in them
status: accepted
date: 2026-11-24
addresses: qg-explainer-readable-without-js, con-frontend-only
:::
```

## A Self-Assessment Checked Only as a Whole

A learner may want to know before learning which pages they can skim. So an explainer may offer a self-assessment, per
chapter; the app's covers all chapters. It shows a few exercises of each content page and checks them only all
together. The result is per content page: probably known, look at it again, or read it. One right task alone is too
little for "known". Each run draws new tasks, so a second run asks the question, not the place of the answer. Exercise
components take part too, as they often check a page best. It needs JavaScript; without it the offer stays hidden.

Rejected: feedback after each exercise (it would teach, not assess); a result per chapter (too coarse); a separate list
for the app (two lists to keep in step); exercises of its own (they would duplicate the pages').

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

An open answer may have some, not all, points of a good answer. It counts half in the self-assessment, and its result
names the points it missed, as a wrong one names its mistake. An exercise component may report it too. Rejected:
counting it as wrong (half an answer would count as none) or as right (a page would be "known" with points missing).

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

Some subjects need answers in the learner's own words. An example with a model answer was only read. So an open task
asks for the answer first, typed or written on paper and photographed. Only then it shows two to five points of a good
answer, each with its source in the app. The learner ticks the points the answer has; that gives right, partly right or
wrong. Without JavaScript the page shows the task, the points and the model answer. The tutor page gives the tutor the
points and the model answer. The answer stays on the device while the tab is open; a photo is never stored or sent.
Rejected: grading by a model (none runs in the browser, `dec-tutor-variant`; a server would collect what learners
write); a model answer without the learner's own first (it is only read); a word search (easy to fool).

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

The learner should find their result again, and a tutor should be able to work from it. So the last run's result stays
on the device, one per self-assessment. A new run replaces it, and the learner can delete it. A run a tutor opened keeps
nothing. The result holds only the exercises and how they went, nothing about the learner, and nothing is sent. The
learner takes it to a tutor with a click, as on the content pages. Rejected: keeping every run (a history about the
learner); a result only in memory (lost on the way to the tutor); sending the result anywhere (`qg-privacy`).

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

After a self-assessment the tutor is a guide, not a teacher: explaining and practising happen on the pages. Its tutor
page tells the tutor to go chapter by chapter. It sends the learner to the pages that do not stick, then into a new
round, which draws other tasks. After each round it decides on the next chapter or another round. On pages a tutor
opened, the clipboard is the way back into the running chat. The tutor page holds no address, because a static page
does not know where the app is served; the learner's first message lists every address. Rejected: the tutor explaining
the tasks itself (a second place to teach, solutions in view); a new chat per round (the tutor would lose the course).

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

The catalog's learning map shows which apps practise which competencies. The app owns where it belongs. It names one
strand, or `none`, or for a unit app the subject, never both; each page names the competencies it practises. The build
hands this to the catalog (`if-page-list`), which owns and checks the ids. The fields are required, so this is a new
format; format 1 stays valid, without a place on the map. Rejected: the place in the catalog entry (the pages would be
listed twice); optional fields in format 1 (an app could forget them).

```arc42
:::decision
id: dec-explainer-format-2
title: Explainer format 2 names the app's strand or subject and each page's competencies, and the build lists the pages
status: accepted
date: 2026-11-03
addresses: qg-checkable, con-runtime-unchanged
:::
```

## A Recap Page Repeats Competencies the App Does Not Practise

A competency may require others the app does not practise. A recap page repeats one or several of them at the start of
the chapter that needs them. It is mostly descriptive, with at most two exercises; practising stays with the apps the
map lists. The runtime links each competency on the map, so no link is missing. The author writes what the learner
should already know, and `lernapps check` warns when a competency is not named in it. Rejected: more exercises (the app
would practise what the map does not show; with none, authors built full pages instead); links by the author (missing
or wrong); names taken from the map (the build would depend on it); several competencies per page for one purpose.

```arc42
:::decision
id: dec-explainer-recap-page
title: A recap page repeats one or several competencies of other strands without exercises and links each on the learning map
status: accepted
date: 2026-11-17
addresses: qg-understandable, qg-checkable, con-no-request-before-click
:::
```

## A Language Task Is Written, Then Checked Against the Answers It Lists

Foreign-language learners should write words, forms and sentences, not only choose. Their textbooks differ, so a task
carries what it asks: each item names what the learner starts from and its answer with variants. One block has four
modes: writing, gaps, choice and table. The check is deterministic and the same in browser and build. It ignores what is
no mistake, then finds mistakes of form, then the item's typical mistakes. Rejected: grading by a model
(`dec-tutor-variant`); a class for typing errors (it would hide wrong endings); mistakes of form right by default; the
learner choosing the direction; a textbook's word list (a basic vocabulary guides creators instead).

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

Foreign-language learners must hear the language. So the creator makes each sentence as an MP3 file in `src/audio/` with
the audio skill and commits it. The skill offers a fixed list of voices whose licences allow the content's licence. The
EU AI Act asks to mark generated speech machine-readably. So each file says that a model made it, which model and voice,
the licence, the credit and the text. The build stops when one is missing. MP3 plays in every browser and keeps the
marking. The marking is not signed yet; whether a creator counts as a bound provider is open. Rejected: the browser's
speech synthesis (voices may be remote); a check by speech recognition (the creator listens); a cloud service (text
would leave the device); a model in the browser (too large); the approval in the file (it is the git commit).

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

A dictation is a language task item that starts from audio, so it shares the check and the self-assessment
(`dec-language-task`). The file's text must be a right answer, or the build stops. The browser's own player works
without JavaScript, is accessible and loads nothing before play. The tempo is set in the player with the pitch kept, so
one file serves every pace. Where the player has no tempo menu, the page adds tempo buttons. A synthetic voice is
labelled "KI", with model, voice and licence at hand. The file's text is the task's "Lösung".

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

Speaking is practised by comparing, not by grading. The learner hears a model, records themself, plays both and rates
the pronunciation as right, partly right or wrong, as in the open task (`dec-open-task`). The microphone is asked for
only on "Aufnehmen" and released after it. The recording stays in memory: never stored, never sent. Without a microphone
the learner speaks aloud and still rates. No model judges, since none runs on the device (`dec-tutor-variant`) and
recognition would hide errors. A self-assessment does not ask speaking tasks: a rating of a rating tells nothing.

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

Creators and reviewers check images, audio and videos best when they see all of them. So every explainer with media has
the page "Medienübersicht", linked from the start page. It lists each medium with its credit, licence and the pages that
use it; for an AI voice also model, voice and text. It is readable without JavaScript. Unused audio is listed too, so it
is not forgotten. Approval is not shown: it is the git history.

```arc42
:::decision
id: dec-media-overview
title: Every explainer with media has a media overview page that lists them with their credit and use
status: accepted
date: 2026-11-12
addresses: qg-checkable, qg-understandable
:::
```

## Vocabulary Is a Block of the Page, Shown as Written

Language explainers listed words in tables. A table knows neither the languages of its columns nor what a cell holds: a
screen reader read French with a German voice. So a vocabulary block holds a page's words in both languages, each with
optional forms, gender, example, note and false friend. It shows them like a vocabulary book, every word with its
language. Words are shown as written, a noun with its article, since no rule derives the article in every language.
Practising means covering one column, unchecked; checked writing is a language task (`dec-language-task`). Rejected:
deriving the article from the gender; a part of speech; a table block with a language per column (it knows no forms).

```arc42
:::decision
id: dec-vocabulary
title: Vocabulary is a block of the page that shows each word as written, with its language and optional forms
status: accepted
date: 2026-11-22
addresses: qg-understandable, qg-accessibility, qg-explainer-readable-without-js
:::
```

## An Image May Be Given by Language

An image was one file for every language, so its words stayed German on the English page. So an image may be given per
language, like a text, and then for every language of the app. One file for all stays valid. Rejected: finding the file
by its name (the content would not show it); translating the image at build (fails for photos, breaks drawings).

```arc42
:::decision
id: dec-image-per-language
title: The image of a figure is one path for every language or a map of paths by language, like a text
status: accepted
date: 2026-11-26
addresses: qg-understandable, qg-accessibility, qg-checkable
:::
```
