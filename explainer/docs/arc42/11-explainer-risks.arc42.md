# Risks and Technical Debt

The explainer's risks, besides the generic ones.

## Component Size Budget Against No Size Limit

The frame limits no app's size (`dec-no-size-limit`), but the explainer's build fails a component whose own code is
over 20 kB gzip (`vue-component-size`), so a large component cannot be built.

OPEN: Does the decision "no size limit" also cover the explainer's 20 kB budget per component, or does the budget stay?

```arc42
:::risk
id: risk-explainer-component-budget
title: 20 kB budget per explainer component
severity: low
mitigation: Kept until the owner decides; a component that needs more is split or asks for a built-in block.
:::
```

## The Skill Says the Explainer Stores Nothing

The skill `lernapps-explainer` says the explainer stores nothing, while the client module keeps the learner's chosen
way to the tutor on the device through the storage wrapper; an entry written from the skill may declare no storage.

```arc42
:::risk
id: risk-explainer-storage-doc
title: The skill and the runtime differ on what the explainer stores
severity: low
mitigation: Correct the sentence in the skill (the tutor choice is kept on the device).
:::
```
