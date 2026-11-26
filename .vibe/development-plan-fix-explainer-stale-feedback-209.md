# Development Plan: app-templates (fix/explainer-stale-feedback-209 branch)

*Generated on 2026-11-26 by Vibe Feature MCP*
*Workflow: [bugfix](https://codemcp.github.io/workflows/workflows/bugfix)*

## Goal
Issue #209, erster PR: die Funde, bei denen ein Kind Falsches sieht.
- A.5: Bei einer Übungskomponente bleibt „Richtig!“ stehen, wenn das Kind die Antwort danach ändert.
- A.1: Ohne Antwort sagt „Prüfen“ bei jeder Frageart und jeder Komponente „Antworte zuerst: Wähle, tippe oder ordne alles zu.“ Eine Komponente kann keine eigene Meldung dafür geben.

Der Mensch hat volle Autonomie freigegeben: keine Stopps an den Phasengrenzen; Entscheidungen stehen hier.

## Key Decisions
- **A.5, Komponente:** Ändert das Kind die Antwort nach „Richtig!“, verschwindet die Rückmeldung. Grund: Eine Komponente sperrt sich nach der richtigen Antwort nicht; die Rückmeldung gälte sonst für eine Antwort, die es nicht mehr gibt.
- **A.5, nach „Leider nicht richtig“ bleibt die Rückmeldung stehen**, bei Komponenten wie bei Fragen mit `retry`. Grund: Sie nennt den Grund des Fehlers; das Kind braucht ihn, während es die Antwort verbessert (bei mehreren Optionen über mehrere Klicks). Eine richtige Frage sperrt sich (reveal), dort kann „Richtig!“ nie neben einer geänderten Antwort stehen. So verhalten sich Fragen und Komponenten gleich: Ein falsches Urteil bleibt als Hinweis bis zum nächsten „Prüfen“, ein richtiges gilt nur für die geprüfte Antwort.
- **A.1, Fragen:** eine Meldung je Frageart (single-choice, multiple-choice, true-false, ordering, matching; number hatte schon eine). Gilt für Quiz, Explainer und interaktive Apps; die Texte sagen genauer, was fehlt, und sind für alle Altersstufen verständlich. Der Schlüssel `incomplete` entfällt (nur in diesem Repo genutzt).
- **A.1, Komponenten:** Standardmeldung der Runtime „Bearbeite zuerst die Aufgabe.“ statt des Textes über Wählen/Tippen/Zuordnen. Zusätzlich darf die Logik der Komponente `unanswered(props, lang)` exportieren: ihre eigene Meldung, wenn sie noch keine Antwort gesendet hat. Der Build ruft sie je Sprache auf (keine Abhängigkeit von der Aufgabe, damit sie im HTML steht); fehlt sie, gilt die Standardmeldung. Option statt Pflicht: bestehende Apps bleiben gültig.
- **A.1, „leere Liste“:** Die Runtime wertet eine gesendete leere Liste nicht als „keine Antwort“; sie prüft sie mit `check`. Eine Komponente, deren leerer Zustand keine Antwort ist, sendet `undefined` (emit("answer", undefined)); dann kommt die Meldung für „keine Antwort“. Das steht jetzt in README und arc42. Eine Pauschalregel „[] = keine Antwort“ würde Komponenten schaden, bei denen eine leere Liste eine gültige Antwort ist (z. B. „keine der Dateien gehört in den Ordner“).

## Notes
- Reproduziert im Code (runtime/explainer/islands.ts): `onAnswer` setzt `checked` zurück, lässt aber die Rückmeldung stehen. Das Laufzeit-e2e (runtime/explainer/e2e.ts) prüft das jetzt: nach „Richtig!“ eine neue Antwort, dann ist die Rückmeldung leer.
- „Leere Liste = keine Antwort“ nicht reproduziert: islands.ts prüft nur auf `undefined`. Gemeint war vermutlich: Vor der ersten Änderung sendet die Komponente nichts, also kommt die allgemeine Meldung; eine Antwort beim Laden zu senden verbietet das e2e.

## Reproduce
### Completed
- [x] Created development plan file
- [x] A.5 im Code gefunden (islands.ts `onAnswer`) und im e2e reproduziert: mit dem neuen Schritt schlägt die History-Fixture ohne Fix fehl („"Richtig!" goes once the answer changes“), mit Fix grün
- [x] A.1: Text und Ursache gefunden (engine.ts, render.ts `data-incomplete`)

## Analyze
### Completed
- [x] Entscheidungen siehe Key Decisions; geprüft, was für alle Apps gilt

## Fix
### Completed
- [x] islands.ts: „Richtig!“ geht bei neuer Antwort
- [x] Fragen: Meldung je Art (`INCOMPLETE_MESSAGE`, exportiert)
- [x] Komponenten: Standardtext `componentUnanswered`, optional `unanswered(props, lang)` (exercise.ts `unansweredProblems`, render.ts)
- [x] README, arc42 `dec-feedback-for-checked-answer`

## Verify
### Completed
- [x] `vp check`, `check:vue`, `vp test run` (681), `node scripts/arc42.ts` grün
- [x] Vorlage: `lernapps check --pre-push`; History-Fixture: Playwright 55 passed (Chromium, lokal)

## Finalize
### Completed
- [x] Keine Debug-Reste; Kommentare angepasst



---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
