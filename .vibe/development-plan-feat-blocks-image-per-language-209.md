# Development Plan: Bild einer Abbildung je Sprache (feat/blocks-image-per-language-209)

*Generated on 2026-11-26 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal
Befund D.10 aus Issue #209: Das `image` einer Abbildung (`figure`) und einer beschrifteten Abbildung
(`labelled-figure`) ist ein Pfad für alle Sprachen. Text in einem SVG lässt sich so nicht übersetzen.
`image` darf künftig auch eine Zuordnung nach Sprache sein (`{ de: images/a-de.svg, en: images/a-en.svg }`),
wie die Texte. Ein einfacher Pfad bleibt gültig und ändert nichts. Jede Sprachseite zeigt die Datei ihrer Sprache.
Gilt für alle Archetypen mit diesen Blöcken (Erklär-App und Quiz).

## Key Decisions
- `image` hat im Typ denselben Parameter wie die Texte (`T extends Text`): `Figure<Text>` hat `image: Text`,
  nach `materialIn` ist es ein Pfad. Grund: Dieselbe Form wie Texte, `materialIn` und `inLanguage` lösen es
  ohne neuen Code auf; Rendern, Quiz und Tests in einer Sprache bleiben unverändert.
- Ein einfacher Pfad gilt in jeder Sprache (wie eine Formel, `textLanguages(..., neutral = true)`), auch in einer
  App mit mehreren Sprachen. Grund: Bestehende Apps dürfen sich nicht ändern; ein Bild ohne Text ist sprachneutral.
- Eine Zuordnung muss jede Sprache der App nennen und keine andere; geprüft mit `textLanguages`, wie bei Texten.
  Grund: dieselben Meldungen wie bei Texten, eine fehlende Datei fiele sonst still auf Deutsch zurück.
- Jede genannte Datei muss existieren; die Fundstelle ist `image.<lang>`. Die Medienübersicht listet jede Datei
  einzeln (mit derselben Quelle, Lizenz und alt).
- Quelle, Lizenz und alt bleiben wie sie sind (alt ist schon ein Text).
- Schema: `$defs/image` der Blöcke wird `anyOf` aus Pfad und Zuordnung `{ <lang>: Pfad }`. Die Erklär-App
  verweist schon auf diese Definition.
- Ein falscher Pfad (`images/Bild.svg`, `bilder/x.svg`) bekommt eine eigene Meldung (`imageProblem`, neben
  `addressProblem`), im Quiz und in der Erklär-App. Grund: Mit `anyOf` hätten die allgemeinen Meldungen für Texte
  gegriffen („must not be empty“, „does not match the schema“), die nicht sagen, was falsch ist.

## Notes
- Betroffen: `runtime/shared/blocks/block.ts` (Typen, `materialIn`, `materialImages`), `validate.ts`
  (Sprachen, Dateien), `render.ts` (Pfad der Seite), `runtime/explainer/media.ts` (Übersicht),
  `runtime/shared/blocks/blocks.v1.schema.json`.
- `render.ts` der Erklär-App (`sizeless`) und das Quiz (`plugin.ts`, `render.ts`) bekommen über `materialIn`
  bzw. `inLanguage` schon den Pfad einer Sprache; `materialImages` liefert alle Dateien zum Ausliefern.
- `check-page.ts` sammelt die Bilder über `imageExists`: jede Datei einer Zuordnung wird so gesammelt und gebaut.

## Explore
### Tasks
- [x] Blöcke, Prüfungen, Rendern, Medienübersicht, Quiz und Schemas lesen

### Completed
- [x] Created development plan file

## Plan
### Tasks
- [x] Entwurf: `image: T`, Prüfung mit `textLanguages(neutral)`, Übersicht je Datei

### Completed
- [x] Entscheidungen oben festgehalten

## Code
### Tasks
- [x] Typen und `materialIn`, `materialImages`
- [x] Prüfung: Sprachen der Zuordnung, jede Datei vorhanden
- [x] Rendern mit dem Pfad der Sprache
- [x] Medienübersicht: jede Datei
- [x] Schema `$defs/image`
- [x] Tests (Erklär-App: Bau, Prüfung, Übersicht; Quiz: Prüfung)
- [x] README und arc42-Entscheidung `dec-image-per-language`

### Completed
- [x] Umsetzung

## Commit
### Tasks
- [x] Prüfungen grün, ein Commit, Push, Pull Request

### Completed
- [x] Commit



---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
