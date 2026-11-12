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

- **Stimmenauswahl des Owners (2026-11-12), im Skill ausdrücklich zu nennen; der Creator wählt daraus:**
  - Englisch US: `af_sarah`, `af_nova`, `af_sky` (w), `am_eric`, `am_puck` (m)
  - Englisch GB: `bf_emma`, `bf_isabella`, `bf_lily` (w), `bm_george`, `bm_daniel` (m)
  - Französisch: `ff_siwis` (w, Kokoro), `pierre` (m, Piper `fr_FR-upmc`, CC BY-SA 4.0)
  - Spanisch: `ef_dora` (w), `em_alex` (m)
  - Italienisch: `if_sara` (w), `im_nicola` (m)
  Andere Stimmen lässt der Skill nicht zu.
- **Tempo im Player** (`playbackRate`, Tonhöhe bleibt), nicht vom Modell erzeugt (Annahme aus der Aussage des Owners:
  modellseitig langsamere Sprache klingt voraussichtlich nicht besser als lokales Strecken; vom Owner zu bestätigen).
- **Kokoro-Lizenz aus der Model-Card geprüft** (HF `hexgrad/Kokoro-82M`, 2026-11-12): Gewichte Apache 2.0; trainiert
  auf Audio mit permissiver Lizenz, darunter synthetische Sprache geschlossener TTS-Anbieter (deren Bedingungen sind
  von uns nicht geprüft). Zum Training diente auch SIWIS (CC BY 4.0) und Koniwa (CC BY 3.0): **Namensnennung nötig**,
  sicher bei `ff_siwis`, in die Medienübersicht aufnehmen. Qualitätsnoten der Stimmen laut `VOICES.md`: `af_sarah` C+,
  `af_nova` C, `af_sky` C-, `am_eric` D, `am_puck` C+, `bf_emma` B-, `bf_isabella` C, `bf_lily` D, `bm_george` C,
  `bm_daniel` D, `ff_siwis` B-, `if_sara` C, `im_nicola` C (Notenhinweis: Menge und Qualität der Trainingsdaten).
  Die Auswahl des Owners beruht auf dem Hören und gilt vor den Noten.

- **Metadaten in der Audiodatei, alles dort** (Owner, 2026-11-12): KI-generiert, Modell, Stimme, Lizenz, Quelle der
  Daten (Namensnennung), Text, Freigabe. Kein YAML daneben. Der Build liest die Metadaten und schreibt Label und
  Medienübersicht statisch ins HTML.
- **Der Skill liegt in `lernapps/tooling`** unter `skills/<Gruppe>/lernapps-<name>/` (SKILL.md plus `references/`),
  kompakt und instruktiv wie die anderen. Dieses Feature berührt damit **zwei Repos**: `app-templates` (Laufzeit,
  Build-Prüfung, Player, Aufnahme, Medienübersicht) und `tooling` (Skill, Skript). Zum Schreiben im Tooling ist
  `add_repo` mit `access: push` nötig (heute nur lesend geklont: `/home/user/lernapps/{docs,tooling}`).

- **Lizenz der Inhalte: CC BY-SA überall** (Owner, 2026-11-12). Die Plattform nennt in `dec-licences` (`lernapps/docs`)
  „CC BY 4.0 for content“: das ist dort anzupassen, sonst widersprechen sich Plattform und Apps.

## Befunde aus Plattformdesign und Tooling (2026-11-12)
- `lernapps/docs` enthält **nichts zu Audio** (kein pdt42-/arc42-Element dazu). Das Design stellt die Frage nicht; die
  Entscheidung gehört in die Architektur von `app-templates`, bei Änderung der Plattformrandbedingungen nach `lernapps/docs`.
- **Lizenz der Inhalte laut Plattform** (`dec-licences`, `docs/arc42/09-decisions.arc42.md`): „CC BY 4.0 for content,
  MIT or Apache 2.0 for code“; der Owner nannte für die Inhalte **CC BY-SA**. Abweichung, zu klären (BY-SA erlaubt
  die Kopie auch, die Plattform nennt aber nur BY 4.0). Stimmen unter BY-SA oder BY 4.0 passen zu beiden.
- Plattformregeln, die für Audio zählen: keine versteckte Datenerfassung (KD-18), `qg-privacy`, `con-frontend-only`.
- Tooling: Skills liegen in `skills/{archetypes,content,process,tooling}/lernapps-*/`, `scripts/dist-skills.ts` kopiert
  den ganzen Ordner (ein Unterordner `scripts/` im Skill würde also mitgeliefert). **Kein bestehender Skill enthält ein
  Skript** und keiner nutzt Python: neu für das Tooling (Prüfung, Lizenz `MIT` im Frontmatter, Aufnahme in
  `skills-lock.json`, `lernapps update`). Das `lernapps-cli` verlangt Git, Node ≥ 22.18 und registry.npmjs.org; ein
  Python-Skript braucht zusätzlich Python, Pakete und Modell-Downloads von GitHub Releases und Hugging Face: das
  Preflight muss die Hosts nennen, die eine Umgebung freigeben muss.
- Der Skill `lernapps-explainer` verweist auf `references/language-tasks.md`; Audio-Übungen gehören dorthin und in
  einen neuen Skill für die Erzeugung.

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
- [x] Skills pdt und arc42-language beschaffen und anwenden: Einpassung in Plattformdesign und Architektur (gelesen;
  `lernapps/docs` und `lernapps/tooling` lesend geklont, Befunde oben; der arc42-CLI-Leitfaden folgt im Plan)
  - pdt gelesen (`lernapps/docs`, `skills/pdt/SKILL.md`): reiner Leitfaden zum Lesen des Plattformdesigns
    (`lernapps/docs`, Ordner `docs/pdt42/` und `docs/arc42/`, per `npx pdt42` / `npx arc42`). Änderungen am Design nur dort.
  - arc42-language gelesen (`doctoolchain/arc42-language`, `skills/arc42-language/SKILL.md`): Architekturdoku nur ändern,
    wenn sich Verantwortung oder Zusammenspiel der Teile ändert, sonst bleibt sie. Das trifft hier zu (neue Bausteine
    Audio-Dateien, Build-Prüfung, Aufnahme im Browser; neue Entscheidung; Randbedingung Mikrofon). Arbeitsweise:
    `arc42 guide chapter <n>` lesen, `arc42 explain <type>`, am Ende `arc42 validate`. Der CLI-Leitfaden selbst ist noch nicht
    gelesen (Plan-Phase). Eigene Elemente erhalten `x-`-Attribute nur wenn nötig.
- [x] Bestehende Aufgabentypen und Sprachaufgaben gelesen (`dec-language-task`, `language.ts`); `exercises.ts`,
  `render.ts`, `language-task.ts` folgen beim Entwurf im Plan
- [x] Wie Bilder Quelle und Lizenz erfassen und prüfen (Befund oben), auf Audio übertragen: Entwurf im Plan
- [x] Prüfregeln (Lint, `lernapps check`) für Audio und Mikrofon: im Plan zu entwerfen (Aufgabe dort)
- [x] TTS-Kandidaten mit Lizenz (CC BY-SA-verträglich) für alle vier Sprachen: Auswahl des Owners steht oben (2026-11-12)
  - Proben: Kokoro (kokoro-onnx 0.6.1, Modell v1.0) und Piper 1.8.0, ein Satz-Set je Sprache, CPU, 4 Kerne, ohne GPU.
  - Lizenzangaben aus den Model-Cards (HF `rhasspy/piper-voices`): siwis (fr) CC BY 4.0; alba (en_GB) CC BY 4.0;
    davefx (es) CC0; lessac (en_US) eigene Lizenz des Blizzard-2013-Datensatzes, **nicht geprüft**; paola (it) „See URL“,
    **nicht geprüft**. Kokoro: Lizenz des Modells und der Stimmen **noch aus den Quellen zu prüfen**, nicht aus dem Gedächtnis.
  - Owner (2026-11-12): wählt **je Sprache eine weibliche und eine männliche Stimme**; Kokoro klingt durchgängig besser.
    Zweite Runde: Kokoro Englisch US (4 w, 4 m) und GB (4 w, 4 m).
  - **Französisch hat in Kokoro nur eine weibliche Stimme (`ff_siwis`)**, keine männliche. Piper `fr_FR-upmc` (Sprecher
    `pierre`) ist männlich, Lizenz CC BY-SA 4.0 des Datensatzes (passt zu den Inhalten). `fr_FR-tom` ist AGPLv3 und
    scheidet aus. Spanisch (`ef_dora`, `em_alex`) und Italienisch (`if_sara`, `im_nicola`) haben je ein Paar in Kokoro.
  - **Tempo:** Kokoro erzeugt langsamere Sprache über `speed` (Test 0,8: 8,7 s statt 6,7 s); der Player kann sie mit
    `playbackRate` (Tonhöhe bleibt erhalten) strecken (Test: 8,4 s). Hörvergleich beim Owner.
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
Entwurf (Entscheidungen, jede mit dem Owner abzustimmen, dann in `Key Decisions` und arc42):
- [ ] Audioformat festlegen (MP3, AAC oder Opus) mit Test in Safari, Chrome, Firefox; Größenbudget pro App
- [ ] Metadatenschema der Audiodatei: Felder (KI-generiert, Modell + Version, Stimme, Lizenz der Ausgabe, Namensnennung
  der Datenquelle, gesprochener Text, Sprache, Freigabe mit Datum + Prüfsumme), Tag-Format je Containerformat, Bibliothek
  zum Lesen im Build
- [ ] Autor-Schnittstelle im Explainer: wie `language-task` auf Audio verweist (Diktat als Modus oder eigener Block;
  Selbstvergleich), Schema-Erweiterung von Format 2 oder neues Format, Fehlermeldungen im Stil `file:line: place (language): what to do`
- [ ] Build: Ordner `src/audio/`, Medientyp, Auslieferung, Dev-Server, Prüfung der Metadaten (fehlende Freigabe nur
  Warnung; fehlende KI-Kennzeichnung oder Lizenz: Fehler oder Warnung, mit dem Owner klären)
- [ ] Anhang „Medienübersicht“ an jedem Explainer: Adresse, Inhalt (Bilder und Audio, Quelle, Lizenz, KI-Hinweis,
  Namensnennung, Freigabe), Sprachbäume, ohne JavaScript, barrierefrei
- [ ] Browser: Player (Tempo 0,75/1/1,25 per `playbackRate`, Wiederholen, `preload="none"`, Tastatur, Textfassung),
  Aufnahme (`MediaRecorder`, Berechtigung erst nach Klick, nur Arbeitsspeicher, keine Speicherung, Fallback ohne Mikrofon)
- [ ] Prüfregeln: Lint und `lernapps check` erlauben Audio, `getUserMedia` und `MediaRecorder` gezielt, verbieten
  Netzwerk-APIs weiter, prüfen „keine Anfrage vor einem Klick“ auch für Audio (Lehre aus `qg-privacy`)
- [ ] Zustand und Tutor: wie Diktat (richtig/teilweise/falsch) und Selbstvergleich („selbst bewertet“) in Ergebniszeile,
  Selbsteinschätzung und Tutorseite eingehen
- [ ] Skill in `lernapps/tooling` (`skills/…/lernapps-…`), kompakt: Stimmenliste, Aufruf, Preflight mit gesammelten
  Fehlern (Python, Pakete, `ffmpeg`, Modelle + Prüfsumme, Speicher, Hosts), Exit-Codes, Hinweis zum Umgang mit
  Sprachproben, Pfade; Auswirkung auf `skills-lock.json`, `lernapps update`, `lernapps-cli` (Voraussetzungen)
- [ ] Piper-Stimme `pierre` und Kokoro in einem Skript (zwei Engines) oder getrennt? Entscheidung; Metadaten gleich
- [ ] `add_repo` mit Push-Zugriff für `lernapps/tooling` klären (Owner), Branch und Reihenfolge der Repos
- [ ] Anpassung der Plattform `dec-licences` in `lernapps/docs` auf CC BY-SA (Owner: eigener Branch dort)
- [ ] Architektur (arc42 in `explainer/docs/arc42`): Bausteine (Audio, Metadaten-Prüfung, Player, Aufnahme,
  Medienübersicht), Entscheidungen (synthetische Stimmen, Metadaten in der Datei, Tempo im Player, kein Whisper),
  Randbedingung Mikrofon, Qualitätsszenarien; `arc42 guide chapter <n>` und `arc42 validate`
- [ ] Reihenfolge der Inkremente festlegen. Vorschlag: (1) Format, Metadaten, Build-Prüfung, Medienübersicht für Bilder
  und Audio; (2) Diktat mit Player; (3) Selbstvergleich mit Aufnahme; (4) Skill im Tooling; (5) Dokumentation und README
- [ ] Teststrategie: Einheitentests (Metadaten lesen, Prüfregeln), End-to-End mit Playwright ohne Netz, Barrierefreiheit,
  Prüfung ohne JavaScript; Beispiel `explainer/examples/franzoesisch` um Audio erweitern
- [ ] Risiken: Safari/iOS-Audio, Mikrofon verweigert, Größe, Modell-Download blockiert, Lizenz der Trainingsdaten von
  Kokoro (synthetische Daten geschlossener Anbieter, nicht von uns geprüft)

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
