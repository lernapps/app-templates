# Quality Requirements

The explainer's goal and scenarios, besides the generic ones.

## Readable without JavaScript (explainer)

An explainer is text-heavy, so every page is complete without JavaScript: text, formulas, figures, the navigation,
every exercise with its solution and every component's `nojs` text (`dec-explainer-complete-without-js`); realised by
the page rendering and checked by `lernapps check` and the explainer's end-to-end tests.

High priority, because the archetype is text-heavy (owner, 2026-10-16).

```arc42
:::ignore W014 the extension's goal follows the generic goals in the combined chapter; the generic part cannot hold it
:::
:::ignore H010 the generic solution strategy cannot name an archetype's goal; the explainer's rendering realises it, see the decisions that address it
:::
:::quality-goal
id: qg-explainer-readable-without-js
title: Readable without JavaScript (explainer)
priority: high
:::
```

## Every page complete without JavaScript

`lernapps check` opens every page the runtime marks as an explainer page a second time with JavaScript off, on the
bundle and on the deployed app (rule `explainer-readable-without-js`).

```arc42
:::quality-scenario
id: qs-explainer-without-js
title: Every explainer page is complete without JavaScript
quality: qg-explainer-readable-without-js
stimulus: lernapps check visits every explainer page of the built or deployed app with JavaScript off
response: A page without its h1, a hidden heading, formula or figure, an empty "Lösung" or an empty nojs text is an error
metric: 0 findings of explainer-readable-without-js on every page, in every language
:::
```

## Generated exercises are sound

The build runs each generated exercise and each exercise component's logic over fixed seeds.

```arc42
:::quality-scenario
id: qs-explainer-property-test
title: A generated exercise passes its property test
quality: qg-checkable
stimulus: The build draws the tasks of fixed seeds of each generated exercise and exercise component
response: A task that differs for the same seed, a solution the check rejects, a wrong answer it accepts or a throw fails the build
metric: 50 fixed seeds per exercise component block, every one passes
:::
```

## A Recording Stays on the Device

A learner who speaks into a speaking task must be sure that nothing of the recording leaves the browser.

```arc42
:::quality-scenario
id: qs-recording-stays-on-device
title: A recording is kept in memory and sent nowhere
quality: qg-privacy
stimulus: A learner records a sentence in a speaking task, compares and rates it
response: The microphone is asked for after the click and released when recording stops; the recording is played from memory and dropped when the learner records again or leaves the page
metric: 0 requests that send something, 0 requests to another host, 0 keys in localStorage or sessionStorage after a recording (the explainer's end-to-end test)
:::
```

## Every Audio File Is Marked

An audio file of an explainer is synthetic speech and must say so in its own metadata (`dec-audio-marking`), so the build refuses
a file that lacks any frame of the marking; the audio skill writes them and reads them back.

```arc42
:::quality-scenario
id: qs-audio-is-marked
title: An audio file without its marking stops the build
quality: qg-checkable
stimulus: A creator puts an MP3 file into src/audio/ that lacks a frame of the marking, or has none
response: The build stops with the file, the missing frame and what to do (make the file again with the audio skill)
metric: 0 audio files without all required frames in a built app
:::
```
