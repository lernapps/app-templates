# Risks and Technical Debt

The interactive archetype's risks, besides the generic ones, highest first.

## Core Property Tests Not Built

The sketch has the build run the core's property tests over fixed seeds; the build plays only the playthroughs, so a
core is checked for the seeds its playthroughs name and no others.

```arc42
:::risk
id: risk-no-core-property-tests
title: Core property tests over fixed seeds not built
severity: low
mitigation: Planned; until then the build checks determinism with every playthrough played twice.
:::
```

<!-- app: begin -->
<!-- app: end -->
