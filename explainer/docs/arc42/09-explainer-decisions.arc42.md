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

## Self-assessment in the Runtime, Not in an App

The learner needs to see where they stand, and so does a tutor; before the explainer, apps built their own checklist
(the old Mathe-Karte). The runtime asks once per page, at the end of its last section, where the learner has just
practised, and shows the levels on the start and chapter pages, so that every explainer has it without code of its
own and the content contract stays YAML (an optional sentence `canDo` per page). The levels go through the tooling's
storage wrapper, never over the network; a tutor gets them only as the parameter `stand` of the address the learner
opens. Rejected: a component per app (code an explainer should not need), a checklist of all pages on the start page
only (far from the practice it rates), and a per-page key (one map keeps the overview to one read).

```arc42
:::decision
id: dec-explainer-self-assessment
title: The self-assessment is part of the runtime, on by default, its levels only on the device
status: accepted
date: 2026-10-25
addresses: qg-privacy, qg-explainer-readable-without-js, con-state-on-device, dec-explainer-only-content
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
