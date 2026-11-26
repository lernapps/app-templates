# Development Plan: app-templates (docs/concise-readme-arc42 branch)

*Generated on 2026-11-26 by Vibe Feature MCP*
*Workflow: [minor](https://codemcp.github.io/workflows/workflows/minor)*

## Goal
Der Mensch: „Die Readme und die Architektur enthalten viel zu viele Implementierungs-Details.“ Auf Rückfrage: beides. Erst die Ergänzungen in #213–#216 kürzen (erledigt, je PR ein Folgecommit), dann dieser eigene PR für README und arc42 insgesamt.

Betroffen: `README.md`, `quiz/README.md`, `explainer/README.md`, `interactive/README.md`, `docs/arc42/*.arc42.md`, `quiz/docs/arc42/`, `explainer/docs/arc42/`, `interactive/docs/arc42/`. Nicht betroffen: `docs/arc42/architecture-evidence.md` (Rückverfolgung auf Quellstellen ist dort der Zweck), Code-Kommentare, Schemas, Skills.

Der Branch baut auf #216 und #215 auf, damit die neuen Entscheidungen aus #209 gleich mit gekürzt werden und keine Konflikte entstehen.

## Key Decisions

### Die Regel: was bleibt, was geht
**Bleibt** (das ist Vertrag oder Architektur):
- Was eine App schreibt und wählen kann: Blöcke, Felder, Optionen, ihr Sinn; der Vertrag einer Komponente (Namen der Exporte mit je einem Halbsatz Sinn).
- Was Lernende sehen und tun können; was ohne JavaScript geht.
- Entscheidungen: Anlass, Entscheidung, Folge, verworfene Alternativen (kurz, je ein Halbsatz Grund).
- Bausteine: Verantwortung und Schnittstellen, nicht ihr Innenleben.
- Qualitätsziele, Randbedingungen, Risiken, Begriffe.
- Alle `arc42`-Direktiven (```arc42 … :::…:::```) unverändert in ids, Pfaden, `requires`/`provides`/`addresses` und Diagrammen. Der Validator braucht sie. Prosa daneben darf kürzer werden.

**Geht** (Implementierung, steht im Code oder seinen Kommentaren):
- Namen interner Funktionen, Module, Klassen, CSS-Klassen, data-Attribute, Events, Nachrichtenschlüssel, Dateipfade der Runtime im Fließtext (außer Pfaden, die eine App selbst anlegt, z. B. `src/images/`).
- Schritt-für-Schritt-Abläufe des Builds oder Browsers, Algorithmen (Seeds durchlaufen, LCS, Hashes), Zahlen, die nur der Code braucht.
- Wiederholungen: Was schon in Schema-Beschreibungen, Code-Kommentaren oder einem anderen Kapitel steht, wird ein Verweis oder fällt weg.
- Verlaufsnotizen („since #151“, „tried on …“), außer der Anlass einer Entscheidung.

**Form:** Englisch wie bisher, einfache Sprache (ISO 24495): kurze Sätze, aktiv, ein Gedanke je Satz. Absätze statt Aufzählungsketten in einem Satz. Zeilen bis 120 Zeichen wie bisher.

### Aufteilung
Vier Agenten mit getrennten Dateien, je ein lokaler Branch im eigenen Worktree, ohne Push; ich führe sie zusammen und prüfe.
1. READMEs (Wurzel, quiz, explainer, interactive).
2. `docs/arc42/*.arc42.md` (generisch).
3. `explainer/docs/arc42/`.
4. `quiz/docs/arc42/` und `interactive/docs/arc42/`.

## Notes
- Ausgang: ca. 48 000 Wörter in README und arc42 (davon 9 900 in architecture-evidence.md, das bleibt).

## Explore
### Completed
- [x] Created development plan file
- [x] Umfang gemessen, Regel festgelegt

## Implement
### Tasks
- [ ] Vier Teile kürzen (Agenten)
- [ ] Zusammenführen, `node scripts/arc42.ts` 0/0/0, Stichproben lesen
- [ ] PR

## Finalize
### Tasks
- [ ] Wortzahl vorher/nachher im PR
