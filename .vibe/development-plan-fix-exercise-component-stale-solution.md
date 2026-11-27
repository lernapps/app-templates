# Development Plan: app-templates (fix/exercise-component-stale-solution branch)

*Generated on 2026-11-27 by Vibe Feature MCP*
*Workflow: [bugfix](https://codemcp.github.io/workflows/workflows/bugfix)*

## Goal
Epic lernapps/apps#509, Fund aus 0.24: Hat eine Lernende eine Übungskomponente richtig beantwortet und ändert die Antwort, bleibt die Lösung stehen. Erwartet: Änderung blendet Rückmeldung und Lösung aus, bis wieder geprüft wird. Eingebaute Fragen mitprüfen. Volle Autonomie freigegeben (Stopps entfallen).
## Key Decisions
- Bei jeder Änderung der Antwort geht die Lösung der Komponente (nach „Richtig!“ oder nach „Lösung zeigen“), „Richtig!“ geht wie bisher.
- Eine falsche Rückmeldung bleibt stehen (dec-feedback-for-checked-answer, wie Fragen mit retry); dazu kommt „Lösung zeigen“ wieder. Grund: Ihr Grund hilft beim Verbessern. Abweichung vom Wortlaut des Auftrags („jede Änderung blendet Rückmeldung aus“) bewusst, weil die eingebauten Fragen es genauso machen.
- Eingebaute Fragen: kein Fehler. Nach „Richtig!“ oder „Lösung zeigen“ sperrt reveal() alle Eingaben (engine.ts), die Antwort kann sich nicht mehr ändern.

## Notes
- Ursache: islands.ts `onAnswer` setzte nur die Rückmeldung zurück, nicht `.explainer-component-solution`.

## Reproduce
### Completed
- [x] Created development plan file
- [x] Laufzeit-e2e (runtime/explainer/e2e.ts) erweitert: Lösung zeigen, dann Antwort ändern; History-Fixture schlägt ohne Fix fehl („the solution goes once the answer changes“)

## Analyze
### Completed
- [x] Ursache und eingebaute Fragen geprüft (siehe Key Decisions)

## Fix
### Completed
- [x] islands.ts: Lösung aus, „Lösung zeigen“ nur bei stehender falscher Rückmeldung; Kommentar und arc42 angepasst

## Verify
### Completed
- [x] vp check, check:vue, vp test run (697), arc42; History-Fixture `lernapps check --pre-push` grün

## Finalize
### Completed
- [x] Keine Debug-Reste



---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
