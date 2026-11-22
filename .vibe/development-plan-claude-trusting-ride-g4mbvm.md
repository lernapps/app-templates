# Development Plan: app-templates (claude/trusting-ride-g4mbvm branch)

*Generated on 2026-11-22 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal
Bei offenen Aufgaben (`open-task`, Erklärer) soll beim Vergleichen die eigene Antwort der Lernenden sichtbar sein
(eingegebener Text oder hochgeladenes Foto), damit sie ihre Antwort mit den erwarteten Punkten und der Musterlösung
vergleichen können.

Ist-Zustand (`runtime/explainer/open-task.ts`): Beim Klick auf „Vergleichen“ wird der Schreibbereich
(`.explainer-open-write`) ausgeblendet; es bleiben nur Checkliste und Musterlösung. Die eigene Antwort ist dann nicht
mehr zu sehen.

## Key Decisions
- Vorgehen: Workflow epcc; Entwicklung auf dem vorgegebenen Branch `claude/trusting-ride-g4mbvm`.

## Notes
- Betroffen vermutlich: `runtime/explainer/open-task.ts` (`show`, Markup), Styles, Meldungen de/en
  (`messages`), e2e-/Unit-Tests, ggf. arc42 `bb-open-tasks`.
- Das Foto bleibt nur im Speicher (Object-URL), siehe KD-02 in `development-plan-feat-open-task.md`.
- Nach Reload ist ein Foto weg (`compared` wird zurückgesetzt); der Text bleibt in sessionStorage.

## Explore
### Tasks

### Completed
- [x] Created development plan file
- [x] `open-task.ts` gelesen; Ursache gefunden: `write` wird beim Vergleichen versteckt
- [x] Fundstellen: Styles `runtime/explainer/explainer.css` (~1305–1440), Meldungen
      `runtime/explainer/messages/{de,en}.json` (`openTask*`), e2e `runtime/explainer/e2e.ts` (`checkOpenTask`,
      ~l. 780–830)
- [x] Annahmen (keine Rückfrage nötig): Anzeige in beiden Fällen (Inhaltsseite und Selbsteinschätzung), da beide
      denselben Vergleichsschritt haben; Text als Klartext mit Zeilenumbrüchen (kein HTML); Foto aus der
      vorhandenen Object-URL, weiterhin nur im Speicher

## Design (Entwurf)
- Neuer Block `.explainer-open-yours` im Vergleichsschritt, über der Checkliste, Überschrift „Deine Antwort“
  (vorhandene Meldung `openTaskAnswer`), nur sichtbar, wenn `compared`.
- Text: per `textContent` in einen Absatz mit `white-space: pre-wrap` (kein XSS). Foto: `<img>` mit der Object-URL
  und Alt-Text `openTaskPhotoAlt`.
- Einfachere Alternative: Schreibbereich beim Vergleichen sichtbar lassen (schreibgeschützt). Verworfen: Textarea
  und Foto-Knopf wirken bedienbar und verwirren.

## Plan
### Tasks

### Completed
- [x] Aufgaben für Code festgelegt (siehe unten); Nutzer: „zieh durch bis zum PR“ (autonom, PR ausdrücklich gewünscht)

## Code
### Tasks
- [x] `open-task.ts`: Block `.explainer-open-yours` (Überschrift `openTaskAnswer`, Text per `textContent`, Foto per
      Object-URL), sichtbar nur beim Vergleichen; Foto beim Neuaufnehmen aktualisieren
- [x] `explainer.css`: Stil `.explainer-open-yours` (pre-wrap, Rahmen, Foto-Größe)
- [x] `e2e.ts` (`checkOpenTask`): Eigene Antwort ist beim Vergleichen sichtbar
- [x] arc42 `bb-open-tasks`: ein Satz
- [x] Tests laufen lassen (`vp test`, soweit möglich)



Hinweis: `vp test` hat im Container dieselben 27 Dateien / 3 Tests rot wie ohne Änderung (Peer-Abhängigkeiten
`@lernapps/tooling` und `playwright` fehlen); die e2e-Prüfung konnte hier nicht laufen.

## Commit
### Tasks
- [ ] *To be added when this phase becomes active*

### Completed
*None yet*



---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
