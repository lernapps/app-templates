# Development Plan: app-templates (claude/ecstatic-ritchie-86kfwe branch)

*Generated on 2026-11-12 by Vibe Feature MCP*
*Workflow: [epcc](https://codemcp.github.io/workflows/workflows/epcc)*

## Goal
Sprachliche, akustische Übungen für Fremdsprachen im Explainer, **ausschließlich lokal** (kein Audio verlässt das Gerät,
keine Anfrage an fremde Server vor einem Klick, `qg-privacy`, `con-frontend-only`).

Erster Schritt, zwei Übungstypen:

1. **Diktat / Hörverstehen**: synthetisches Audio abspielen, Antwort tippen, Prüfung wie heute gegen die Antwortliste.
2. **Selbstvergleich bei Aufnahme**: Vorlage hören, selbst aufnehmen (`MediaRecorder`, nur im Arbeitsspeicher), beides
   nacheinander abspielen, Selbsteinschätzung. Keine automatische Aussprachebewertung.

Dazu ein **Skill mit Python-Skript**, der die synthetischen Audiodateien beim Schreiben einer App erzeugt und prüft
(TTS erzeugt, Whisper (STT) transkribiert zurück und vergleicht mit dem Soll-Text).

Sprachen: Englisch und Französisch zuerst, Spanisch und Italienisch später.

## Key Decisions
- Inhalte stehen unter **CC BY-SA** (kommerzielle Nutzung ist erlaubt, daher darf die Lizenz von Modell und Stimme die
  Weitergabe der Ausgabe nicht auf nicht kommerzielle Nutzung beschränken, z. B. Coqui XTTS scheidet aus).
- Erster Schritt: **ausschließlich synthetische Stimmen**. Die Kennzeichnung „KI-generiert“ steht direkt am Player.
- Die Kennzeichnung liegt in den **Metadaten der Audiodatei** (Vorschlag, vom Owner noch zu bestätigen gegenüber YAML
  nach dem Muster der Bilder). Der Build liest sie, bricht bei fehlenden Angaben ab (wie bei Bildern ohne Quelle und
  Lizenz) und schreibt das Label statisch ins HTML (funktioniert ohne JavaScript).
- Audio wird **beim Schreiben der App erzeugt und ins Repo eingecheckt**, der Build braucht kein TTS-Modell.
- **Qualität ist das wichtigste Kriterium.** Modellwahl pro Sprache durch Hörtest des Owners (Testsatz je Sprache),
  Whisper-Rücktranskription nur als untere Schranke (prüft Verständlichkeit, nicht Natürlichkeit).
- Das Skript prüft vor der Arbeit alle Voraussetzungen (`preflight`) und meldet alle fehlenden gesammelt, mit Ursache
  und nächstem Schritt, mit getrennten Exit-Codes.
- **Kein Whisper** (Owner, 2026-11-12): keine Rücktranskription im Skill. Qualität sichert das Hören.
- Der **Owner wählt pro Sprache die Standardstimme** nach einer Hörprobe (Englisch, Französisch, Spanisch, Italienisch);
  der Owner spricht alle vier Sprachen.
- Die **Creator geben die Sätze ihrer App frei**. Fehlende Freigabe bricht den Build **nicht** ab. Dazu nur ein Hinweis
  zum Umgang mit Sprachproben (die prüfende Person soll die Sprache beherrschen), mehr nicht.
- **Anhang „Medienübersicht“** an jedem Explainer: listet alle Medien und Bilder (Quelle, Lizenz, bei Audio
  „KI-generiert“, Modell, Stimme, Freigabe), damit sich die Qualität leicht sichern lässt.

## Notes
- `explainer/README.md:46` sagt heute „No audio: no listening, no dictation, no speaking“. Das ist zu ändern.
- Apps haben keinen Server, sind statisch, 100 kB `localStorage` pro App; Lint-Regeln verbieten Netzwerk-APIs, `lernapps
  check` sieht keine Anfrage vor einem Klick. Mikrofon, `MediaRecorder` und Audio müssen gezielt erlaubt werden;
  `speechSynthesis` des Browsers wird nicht genutzt (Fernstimmen wären eine versteckte Netzwerkanfrage).
- Bilder nennen Quelle und Lizenz schon heute (`runtime/explainer/schema.ts:94`): Muster für Audio.
- Barrierefreiheit: jedes Audio braucht eine Textfassung; beim Diktat erscheint sie erst nach dem Lösen oder auf Wunsch.
- Ohne JavaScript: `<audio controls>` soll auch dann abspielbar sein; Dateien laden erst nach Klick (`preload="none"`).
- Format muss in Safari laufen (MP3/AAC am sichersten, Opus kleiner): prüfen.
- Diktat: Behandlung von Akzenten, Satzzeichen, Großschreibung pro Aufgabe festlegbar (Französisch).
- Hörproben beurteilt der Owner.
- **Befund Prüfung (Diktat):** `runtime/explainer/language.ts` prüft schon deterministisch gegen Antwortlisten und kennt
  Formklassen (`case`, `accents`, `hyphen`, `apostrophe`, `punctuation`), die die Aufgabe pro Klasse mit `form` als
  `ok`/`hint`/`partly`/`wrong` zählt (Standard: falsch, „strict“). Die offene Frage zu Akzenten und Satzzeichen ist damit
  schon beantwortet: Ein Diktat nutzt dieselbe Prüfung und denselben Aufgabenblock (`language-task`, `dec-language-task`),
  nur mit Audio als Ausgangspunkt statt Text.
- **Befund Bilder:** Gebündelte Bilder liegen in `src/images/` (nur `.svg/.png/.jpg/.webp`, Kleinbuchstaben,
  `load.ts:197-202`), `plugin.ts:301` gibt sie als Assets aus, `shared/blocks/image.ts` kennt die Medientypen, und das
  Schema verlangt `source` und `licence` (`schema.ts:93-95`). Für Audio fehlt alles davon: Ordner `src/audio/`, Medientyp,
  Schema-Felder, Build-Prüfung, Auslieferung, Dev-Server (`plugin.ts:430`).
- Im Repo kommt „audio“ im Code sonst nirgends vor (nur Doku/Meldungen).
- Die Lernlandkarte liegt nicht in diesem Repo; Beispiel: `explainer/examples/franzoesisch`.
- `AGENTS.md`: vor dem Feature die Einpassung mit den Skills pdt und arc42-language klären. Beide sind im Repo nicht
  installiert (nur `commit`); in Explore klären, wie sie verfügbar werden.
- Kandidaten für TTS (Lizenz je Modell und Stimme vor Aufnahme in die Positivliste aus den Quellen prüfen, nicht aus dem
  Gedächtnis): Piper, Kokoro, weitere.

## Explore
### Entrance criteria
- Entwicklungsplan angelegt, Feature-Branch aktiv, Ziel mit dem Owner abgestimmt.

### Tasks
- [ ] Skills pdt und arc42-language beschaffen und anwenden: Einpassung in Plattformdesign und Architektur
  - pdt gelesen (`lernapps/docs`, `skills/pdt/SKILL.md`): reiner Leitfaden zum Lesen des Plattformdesigns
    (`lernapps/docs`, Ordner `docs/pdt42/` und `docs/arc42/`, per `npx pdt42` / `npx arc42`). Änderungen am Design nur dort.
    Das Design selbst steht im Repo `lernapps/docs`, das dieser Sitzung nicht zugänglich ist: Owner fragen, ob es
    angehängt werden darf (`add_repo`).
  - arc42-language gelesen (`doctoolchain/arc42-language`, `skills/arc42-language/SKILL.md`): Architekturdoku nur ändern,
    wenn sich Verantwortung oder Zusammenspiel der Teile ändert, sonst bleibt sie. Das trifft hier zu (neue Bausteine
    Audio-Dateien, Build-Prüfung, Aufnahme im Browser; neue Entscheidung; Randbedingung Mikrofon). Arbeitsweise:
    `arc42 guide chapter <n>` lesen, `arc42 explain <type>`, am Ende `arc42 validate`. Der CLI-Leitfaden selbst ist noch nicht
    gelesen (Plan-Phase). Eigene Elemente erhalten `x-`-Attribute nur wenn nötig.
- [ ] Bestehende Aufgabentypen und Sprachaufgaben weiter lesen (`exercises.ts`, `render.ts`, `language-task.ts`; `dec-language-task` und `language.ts` gelesen)
- [x] Wie Bilder Quelle und Lizenz erfassen und prüfen (Befund oben), auf Audio übertragen: noch zu entwerfen im Plan
- [ ] Prüfregeln (Lint, `lernapps check`) für Audio und Mikrofon klären
- [ ] TTS-Kandidaten mit Lizenz (CC BY-SA-verträglich) für alle vier Sprachen: Hörproben liegen beim Owner (2026-11-12)
  - Proben: Kokoro (kokoro-onnx 0.6.1, Modell v1.0) und Piper 1.8.0, ein Satz-Set je Sprache, CPU, 4 Kerne, ohne GPU.
  - Lizenzangaben aus den Model-Cards (HF `rhasspy/piper-voices`): siwis (fr) CC BY 4.0; alba (en_GB) CC BY 4.0;
    davefx (es) CC0; lessac (en_US) eigene Lizenz des Blizzard-2013-Datensatzes, **nicht geprüft**; paola (it) „See URL“,
    **nicht geprüft**. Kokoro: Lizenz des Modells und der Stimmen **noch aus den Quellen zu prüfen**, nicht aus dem Gedächtnis.
  - Download braucht Netz (GitHub Releases, Hugging Face); beide Wege waren in dieser Umgebung erreichbar.
  - Kokoro-Modell ca. 325 MB + Stimmen 28 MB; Piper je Stimme 63 bis 114 MB. Für den Skill: nur beim Erstellen nötig.
- [ ] Testsätze für den Hörtest Englisch und Französisch vorbereiten
- [ ] Format (MP3/AAC/Opus) und Metadatenfelder festlegen
- [ ] Offene Entscheidung klären: Metadaten in der Datei oder YAML
- [ ] Entscheidung klären: Wo liegt der Skill (dieses Repo oder `lernapps/docs`)

### Completed
- [x] Created development plan file
- [x] Ziel, Sprachen, Lizenz und Hörtest-Beurteilung mit dem Owner abgestimmt

## Plan
### Entrance criteria
- Explore abgeschlossen, Einpassung in die Architektur beschrieben, offene Entscheidungen beantwortet.

### Tasks
- [ ] *To be added when this phase becomes active*

### Completed
*None yet*

## Code
### Entrance criteria
- Plan vom Owner freigegeben, Hörtest-Ergebnis liegt vor.

### Tasks
- [ ] *To be added when this phase becomes active*

### Completed
*None yet*

## Commit
### Entrance criteria
- Code fertig, Tests grün, Dokumentation (arc42, README) angepasst.

### Tasks
- [ ] *To be added when this phase becomes active*

### Completed
*None yet*



---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
