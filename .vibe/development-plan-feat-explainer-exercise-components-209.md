# Development Plan: app-templates (feat/explainer-exercise-components-209 branch)

*Generated on 2026-11-26 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal
Issue #209, dritter PR: Übungskomponenten und Aufgabennummern. Funde B.7, C.8, C.9, C.10, C.11, C.17. Baut auf #214 auf (dieselben Dateien: islands.ts, render.ts, e2e.ts).

Der Mensch hat volle Autonomie freigegeben: keine Stopps an den Phasengrenzen; Entscheidungen stehen hier.

## Key Decisions
- **C.8 + C.17 zusammen:** Die Lösung jeder Aufgabennummer steht schon in `describe` (für die Seite ohne JavaScript und die Tutor-Seite, je Nummer geprüft). Der Build schreibt sie je Nummer in ein `<template>`; die Insel zeigt die der gezeigten Nummer: nach der richtigen Antwort sofort (wie die Erklärung einer Frage), nach einer falschen auf „Lösung zeigen“ (zählt im Ergebnis als nachgesehen, `REVEALED_EVENT`). „Neue Aufgabe“ blendet sie aus. Kein neuer Export: keine Arbeit für bestehende Apps, gilt für alle. Abgelehnt: `reason` auch bei richtiger Antwort aufrufen (bestehende Apps geben dort oft einen Rückfalltext); ein eigener Export für die Begründung.
- **C.10:** Eine Übungskomponente ist eine Karte mit dem Etikett „Aufgabe“, wie jede Übung. Nur per CSS-Selektor `.explainer-component[data-exercise]:not([data-assessment])` und einem Etikett, nicht mit der Klasse `explainer-exercise` (an der hängen Zählungen und Prüfungen der Seite). Sichtbare Änderung für alle Apps mit Komponenten; sie macht die Seite einheitlich.
- **C.9:** Eine gerechnete Beispielaufgabe zeigt ohne JavaScript, was zu wählen, ordnen oder zuzuordnen ist (vorher nur Text, Tipp und Lösung). Verbesserung für alle Apps ohne JavaScript.
- **C.11:** JSDoc-Tag `@verbatim` an einem Prop (auch an einem Feld eines Objekts): seine Strings sind kein Lerntext, sondern in allen Sprachen gleich; geprüft wie ein Name (`TextKind` "name"). Option, keine pauschale Änderung. Abgelehnt: ids nur aus `data/` erkennen (ein Prop im Block kann auch eine id sein).
- **B.7:** Option der App `tasks: { start: first }` in app.yaml: ohne Nummer in der Adresse beginnt jede Übung mit Nummern (generiert, Komponente) bei 1. Standard bleibt zufällig: ein neuer Besuch und die Kinder einer Klasse beginnen mit verschiedenen Aufgaben. Der Sprung 5 → 6 → 1 ist das Weiterzählen am Ende der Liste und bleibt.

## Notes
- C.11 reproduziert: Ohne Tag meldet der Build einen fehlenden Sprachschlüssel für `events[0].id` (Test).
- C.9 reproduziert: Beispielaufgaben der generierten Ordnung in der History-Fixture hatten keine Einträge.

## Explore
### Completed
- [x] Created development plan file
- [x] Jeden Fund im Code geprüft

## Plan
### Completed
- [x] Entscheidungen oben

## Code
### Completed
- [x] tasks.ts `startNumber`, `REVEALED_EVENT`; Schema v1/v2 `tasks`; render.ts `data-task-start`
- [x] render.ts: Etikett, „Lösung zeigen“, Lösungen je Nummer; islands.ts: zeigen/verbergen; explainer.ts: nachgesehen
- [x] exercises.ts `workedEntries`; read.ts/props.ts/check-page.ts `@verbatim`
- [x] CSS: Karte, Lösung, Knopf
- [x] Tests: explainer-build (Karte, Lösungen, Startnummer, Einträge), explainer-components (`@verbatim`); e2e: Etikett, Lösung nach richtig, „Lösung zeigen“ nach falsch
- [x] README (Wurzel, Explainer), arc42 `dec-component-exercise-like-others`

## Commit
### Completed
- [x] `vp check`, `check:vue`, `vp test run` (689), arc42; e2e lokal grün: Vorlage, history, all-blocks, franzoesisch; Bildschirmfoto bei 360 px angesehen
