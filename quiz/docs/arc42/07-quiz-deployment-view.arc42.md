# Deployment View

Where the quiz's blocks run, below the generic nodes.

## Quiz build

The quiz's build, validation and end-to-end tests run in CI and, through the same hooks, on the creator's machine;
the bank and the glue are built into the bundle there, and the assistant loads the skill there.

```arc42
:::deployment-node
id: dn-quiz-build
title: Quiz build
type: container
parent: dn-ci-runner
hosts: bb-quiz-rendering, bb-quiz-validation, bb-quiz-tests, bb-quiz-bank, bb-quiz-main, bb-skill-quiz
:::
```

## Quiz page

The quiz engine runs in the learner's browser on the page the build rendered.

```arc42
:::deployment-node
id: dn-quiz-page
title: Quiz page
type: container
parent: dn-learner-browser
hosts: bb-quiz-engine, bb-quiz-bank, bb-quiz-main
:::
```
