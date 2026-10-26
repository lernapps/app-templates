# Risks and Technical Debt

The explainer's risks, besides the generic ones.

## The Skill Says the Explainer Stores Nothing

The skill `lernapps-explainer` says the explainer stores nothing, while the client module keeps the learner's chosen
way to the tutor on the device through the storage wrapper; an entry written from the skill may declare no storage.

```arc42
:::ignore H007 a sentence to correct in the skill lernapps-explainer, not a matter for an architecture decision
:::
:::risk
id: risk-explainer-storage-doc
title: The skill and the runtime differ on what the explainer stores
severity: low
mitigation: Correct the sentence in the skill (the tutor choice is kept on the device).
:::
```
