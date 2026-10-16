# Quality Requirements

## Nothing leaves the device without a click

No account, no server, no request to another server, until the learner clicks for it.

```arc42
:::quality-goal
id: qg-privacy
title: Nothing leaves the device without a click
priority: high
:::
```

### Opening the app sends nothing

`lernapps check` records every request while it opens the start page and the app page.

```arc42
:::quality-scenario
id: qs-no-request
title: Opening the app sends nothing
quality: qg-privacy
stimulus: The learner opens the start page and the app page
response: Only the app's own files are loaded; nothing is stored before the app's first save
metric: 0 requests to other servers
:::
```

## Every behaviour can be replayed

The logic is deterministic by a seed, so a playthrough written once proves the app at build and in the browser.

```arc42
:::quality-goal
id: qg-replayable
title: Every behaviour can be replayed from a seed and keys
priority: high
:::
```

### A playthrough proves a change

A change to the core is proven by the playthroughs, without a browser.

```arc42
:::quality-scenario
id: qs-playthrough
title: A playthrough proves a change
quality: qg-replayable
stimulus: The core changes
response: The build plays every playthrough twice and fails with a line on a different or unexpected state
metric: every playthrough passes at build and in the browser
:::
```

## Accessible by default, limits declared

The app meets WCAG 2.1 AA and works at 360 px unless its idea needs otherwise; then its entry says what it does not
offer.

```arc42
:::quality-goal
id: qg-accessible-or-declared
title: Accessible by default, limits declared
priority: high
:::
```

### The start page is always accessible

Whatever the app page offers, its description reaches everyone.

```arc42
:::quality-scenario
id: qs-start-page-accessible
title: The start page is always accessible
quality: qg-accessible-or-declared
stimulus: A learner with a screen reader or a phone opens the start page
response: The start page reads in full; the entry names what the app page does not offer
metric: no axe finding for WCAG 2.1 AA, no overflow at 360 px on the start page
:::
```
