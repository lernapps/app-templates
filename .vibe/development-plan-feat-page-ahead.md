# Development Plan: app-templates (feat/page-ahead branch)

*Generated on 2026-11-11 by Vibe Feature MCP*
*Workflow: [minor](https://codemcp.github.io/workflows/workflows/minor)*

## Goal
Eine Seite eines Erklärers (Format 2) darf bewusst vor einer ihrer Voraussetzungen stehen: Sie nennt sie in
`ahead`, die App übt sie auf einer anderen Seite (Owner, 2026-11-11; lernapps/apps#261, Vertrag Abschnitt 3).
Beispiel: Begrüßen als feste Wendungen vor der Grammatik dahinter.

## Key Decisions
- `ahead`: Ids der Voraussetzungen, nur zusammen mit `competencies` (Schema: dependentRequired).
- `lernapps-pages.json` trägt `ahead` unverändert; die Prüfung (ob die App sie übt) machen der Katalog
  (lernapps/apps checkPages, Art `ahead`) und `lernapps check` (lernapps/tooling, `prerequisites-in-order`).
- Einordnung: keine Änderung an Plattform-Design oder Architektur; ein Feld im Vertrag des Erklärers.

## Explore
### Completed
- [x] Seitenliste entsteht in runtime/explainer/page-list.ts; Seiten werden aus YAML übernommen (content.ts Page)

## Implement
### Completed
- [x] Schema explainer.v2: `ahead` (Ids), nur mit `competencies`
- [x] content.ts: Feld `ahead`; page-list.ts: schreibt `ahead`
- [x] Test: Seitenliste mit `ahead` (test/explainer-format.test.ts), 38 Tests grün

## Finalize
### Tasks
- [ ] PR; Merge durch den Owner
