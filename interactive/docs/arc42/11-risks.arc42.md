# Risks and Technical Debt

## Time is not replayed yet

Playthroughs have no time steps, so behaviour driven by `tick` is untested.

```arc42
:::risk
id: risk-time-untested
title: Behaviour over time is not replayed
severity: medium
mitigation: Add time steps to playthroughs with the first game that depends on time (the typing pilot)
:::
```

## The tutor bridge is not built yet

The runtime has no tutor bridge and the core contract no `describe` yet.

```arc42
:::risk
id: risk-tutor-not-built
title: The tutor bridge is not built yet
severity: low
mitigation: Build it with describe in the core contract when the first interactive app wants a tutor
:::
```
