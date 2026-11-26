# Archetype interactive

One app page where the learner's doing is the content: a game, a trainer, a simulation. A static start page says what
it is and works without JavaScript.

## What it can do

- Any interaction in one page: keys, buttons, touch.
- Timers and moving parts: the runtime's clock ticks the app's core.
- Its own look and colours, images, and libraries with an open licence, bundled.
- Routes for modes or levels, which a link can open.
- Data in the address, which another app can link with: `app/?c=…#<route>`. See [Parameters of the address](#parameters-of-the-address).
- The learning state on the learner's device, at most 100 kB.
- German, plus English: texts in message files.
- Playthroughs prove its behaviour: the build plays them against the core, the browser on desktop and at 360 px.

## What it cannot do yet

- No full-screen app page: the runtime always shows its frame; an overlay inside it works.
- No storage beyond 100 kB.
- No property tests of the core over fixed seeds.
- A time limit or a required keyboard deviates from accessibility or from 360 px: the catalog entry says so.

## What the app supplies

- `src/app.yaml` ([schema](../runtime/interactive/interactive.v1.schema.json)), the core
  `src/core/index.ts`, its Vue components in `src/ui/`, data in `src/data/`, texts in `src/messages/`, playthroughs in
  `src/playthroughs/` ([schema](../runtime/interactive/playthrough.v1.schema.json)), and its part of the
  architecture in `docs/arc42/`.

## Parameters of the address

The runtime starts the core with `start(seed, route, params)`. `params` holds every search parameter of the address
except `seed`, as text: `app/?c=eJyr…&level=2` gives `{ c: "eJyr…", level: "2" }`. If a name occurs more than once,
the first value counts.

- The parameters are data, not routes. Routes are the hash (`#<route>`), from `src/app.yaml`.
- The runtime only passes them through. It does not check, shorten, log or store them, whatever their length.
- The core checks them itself. If a parameter does not fit, the core starts as it would without it.
- They stay the same for the whole visit. A new route starts the core again with the same parameters. If the core
  calls its own `start` (for a new round), it passes the parameters on itself.
- A core that needs no parameters keeps `start(seed, route)`.
- A playthrough names them in `params`. The build calls `start(seed, route, params)` with them; the browser tests open
  `app/?seed=<seed>&<params>#<route>`.
