# Risks and Technical Debt

The quiz's risks, besides the generic ones.

## Readability Without JavaScript Checked Only by Its Own Tests

`lernapps check` checks pages without JavaScript only for the explainer.
Only the quiz's end-to-end tests check the worksheet. Nothing checks it again on a deployed quiz.

```arc42
:::ignore H007 accepted without a decision of its own: the quiz's own end-to-end tests check the worksheet before every push and in CI
:::
:::risk
id: risk-quiz-no-js-not-in-check
title: The quiz's page without JavaScript is not checked by lernapps check
severity: low
mitigation: Accepted for now; the quiz's end-to-end tests run before every push and in CI.
:::
```
