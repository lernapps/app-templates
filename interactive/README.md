# Archetype interactive

One app page where the learner's doing is the content: a game, a trainer, a simulation. A static start page says what
it is and works without JavaScript.

## What it can do

- Any interaction in one page: keys, buttons, touch.
- Timers and moving parts: the runtime's clock ticks the app's core.
- Its own look and colours, images, and libraries with an open licence, bundled.
- Routes for modes or levels, which a link can open.
- The learning state on the learner's device, at most 100 kB.
- German, plus English: texts in message files.
- Playthroughs prove its behaviour: the build plays them against the core, the browser on desktop and at 360 px.

## What it cannot do yet

- No full-screen app page: the runtime always shows its frame; an overlay inside it works.
- No storage beyond 100 kB.
- No property tests of the core over fixed seeds.
- A time limit or a required keyboard deviates from accessibility or from 360 px: the catalog entry says so.

## What the app supplies

- `src/app.yaml` ([schema](https://lernapps.net/tooling/schemas/interactive.v1.schema.json)), the core
  `src/core/index.ts`, its Vue components in `src/ui/`, data in `src/data/`, texts in `src/messages/`, playthroughs in
  `src/playthroughs/` ([schema](https://lernapps.net/tooling/schemas/playthrough.v1.schema.json)), and its part of the
  architecture in `docs/arc42/`.
