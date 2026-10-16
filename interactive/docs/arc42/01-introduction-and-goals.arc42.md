# Introduction and Goals

An interactive app of lernapps.net is a frontend-only learning app in which doing is the content: a typing game, a
dice trainer, a text to proofread. It consists of a static description of the app, readable without JavaScript, and
one app page that runs in the learner's browser. An optional tutor helps the learner with the task at hand.

This architecture is shared by every interactive app. An app adds its own building blocks below `bb-core` and
`bb-ui`, and its own decisions; it does not change the rest.

The goals, in order (chapter 10): nothing leaves the device without a click (`qg-privacy`); every behaviour can be
replayed from a seed and keys (`qg-replayable`); accessible by default, limits declared (`qg-accessible-or-declared`).
