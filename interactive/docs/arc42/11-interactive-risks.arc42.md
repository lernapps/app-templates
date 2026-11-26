# Risks and Technical Debt

The interactive archetype's risks, besides the generic ones, highest first.

## Core Property Tests Not Built

The build should also run property tests of the core over fixed seeds. It plays only the playthroughs.
So a core is checked only for the seeds its playthroughs name.

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
