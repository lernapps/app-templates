# Runtime View

## Playing

The learner opens `app/#<route>`. The shell starts the core with the seed of the address or a random one, gives every
typed key to `step` and every 20 ms to `tick`, and renders the new state through the root component.

```arc42
:::runtime-scenario
id: rs-play
title: Playing
involves: bb-shell, bb-core, bb-ui
trigger: The learner opens the app page
:::
```

## Building

The build checks play every playthrough twice against the core; a different or unexpected state fails the build. The
end-to-end tests play the same keys in the browser.

```arc42
:::runtime-scenario
id: rs-build
title: Building
involves: bb-build-checks, bb-core, bb-playthroughs
trigger: A build or a commit
:::
```

## Asking the tutor

The learner clicks the tutor button. The bridge asks the core to describe the current state and builds a prompt from
it and the static description; the learner hands it to the assistant they choose.

```arc42
:::runtime-scenario
id: rs-tutor
title: Asking the tutor
involves: bb-tutor-bridge, bb-core
trigger: The learner clicks the tutor button
:::
```
