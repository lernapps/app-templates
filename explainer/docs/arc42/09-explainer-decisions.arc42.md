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
date: 2026-10-25
addresses: qg-privacy, qg-explainer-readable-without-js, con-no-request-before-click, con-state-on-device, risk-explainer-video-after-click
:::
```
