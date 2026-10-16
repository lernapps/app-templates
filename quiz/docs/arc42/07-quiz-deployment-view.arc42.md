# Deployment View

Where the quiz's blocks run, below the generic nodes.

## Quiz build

The quiz's build, validation and end-to-end tests run in CI and, through the same hooks, on the creator's machine;
the bank is built into the page and the bundle there.

```arc42
:::deployment-node
id: dn-quiz-build
title: Quiz build
type: container
parent: dn-ci-runner
hosts: bb-question-types, bb-quiz-bank
:::
```

## Quiz page

The quiz engine with the question types' checker and the quiz's texts runs in the learner's browser on the page the
build rendered.

```arc42
:::deployment-node
id: dn-quiz-page
title: Quiz page
type: container
parent: dn-learner-browser
hosts: bb-shell, bb-question-types, bb-runtime-texts
:::
```
