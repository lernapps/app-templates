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

## An Exercise Component's Numbers on Its Tutor Page

An exercise component without its table of tasks (`dec-component-table`) has only `describe` with the text of each
task: its numbers can make the tutor page larger than 64 kB (Mathe-Karte: two pages at about 80 kB). The page then
shows as many numbers as fit, and the tutor knows a number beyond them only from the learner's lines.

```arc42
:::risk
id: risk-tutor-component-numbers
title: An exercise component's numbers do not all fit on its tutor page
severity: medium
mitigation: A component exports template, params, mistakes and show for a table of all its numbers (dec-component-table); the build gives a hint for a component without them, warns for one with numbers left out, and the page says which numbers it shows.
:::
```
