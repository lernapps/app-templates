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
- Die **Creator geben die Sätze ihrer App frei**. Die Freigabe steht **nicht in der Datei**: sie kommt aus der
  Git-Historie (Owner, 2026-11-12), der Build prüft sie nicht. Dazu nur ein Hinweis zum Umgang mit Sprachproben (die
  prüfende Person soll die Sprache beherrschen), mehr nicht.
- **Anhang „Medienübersicht“** an jedem Explainer: listet alle Medien und Bilder (Quelle, Lizenz, bei Audio
  „KI-generiert“, Modell, Stimme), damit sich die Qualität leicht sichern lässt.

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
  Daten (Namensnennung), Text. Kein YAML daneben. Der Build liest die Metadaten und schreibt Label und
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

## Footprint des Erzeugungs-Skills (gemessen 2026-11-12, Linux x86_64, Python 3.13)
Gemessen in sauberen venvs; „installiert“ in MiB, „Download“ in MB (Wheels bzw. Dateigröße). Nur nötig beim **Erzeugen**
der Dateien, nicht beim Bauen oder im Browser.

| Baustein | Download | installiert | Hinweis |
|---|---|---|---|
| Kokoro-Pakete (`kokoro-onnx`, `soundfile`, `onnxruntime`, `numpy`, `espeakng_loader`) | 51 MB | 184 MiB (venv, davon pip 12) | Python-venv |
| Kokoro-Modell `kokoro-v1.0.onnx` | 325,5 MB | 311 MiB | GitHub Releases, **ein Modell für alle vier Sprachen** |
| Kokoro-Stimmen `voices-v1.0.bin` | 28,2 MB | 27 MiB | alle Stimmen, alle Sprachen |
| Piper-Pakete (`piper-tts`, nur für `pierre`) | 72 MB | 199 MiB (venv) | teilt sich `numpy`/`onnxruntime` mit Kokoro: beide zusammen im selben venv 231 MiB |
| Piper-Stimme `fr_FR-upmc-medium` (`pierre`) | 76,7 MB | 74 MiB | Hugging Face |
| `ffmpeg` (Tags schreiben, MP3 mit 48 kbit/s CBR) | 65 MB als pip-Paket `imageio-ffmpeg` | 178 MiB (venv mit eingebauter Programmdatei, 165 MiB) | oder System-`ffmpeg` (Größe samt Bibliotheken nicht gemessen) |
| `c2pa-python` (später, Option B) | 21 MB | 87 MiB (venv) | |

Summe, wenn alles zusammen genutzt wird (Kokoro + Piper-Stimme + ffmpeg als pip-Paket): **rund 0,6 GB Download und
rund 0,8 GB auf der Platte**, davon etwa 430 MB Modelle. Modelle werden einmal geladen und in einem Cache außerhalb
des Repos gehalten (nicht in die App einchecken). Die Dateien der App: etwa 6 kB je Sekunde Sprache.
Geprüft und **nicht** tauglich: `soundfile` allein schreibt MP3, aber ohne Einfluss auf Bitrate (61 kbit/s statt 48) und
ohne eigene ID3-Felder, ersetzt `ffmpeg` also nicht. Nicht geprüft: kleinere (quantisierte) Kokoro-Modelle; sie
bräuchten einen neuen Hörtest des Owners. Whisper entfällt (kein Footprint).
Hosts, die eine Umgebung freigeben muss: `pypi.org`, `files.pythonhosted.org`, `github.com` (Release-Dateien von Kokoro),
`huggingface.co` (Piper-Stimme) und deren Weiterleitungs-/CDN-Hosts (nicht vollständig ermittelt).

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
- [x] Testsätze für den Hörtest Englisch und Französisch vorbereiten
- [x] Format (MP3/AAC/Opus) und Metadatenfelder festlegen
- [x] Offene Entscheidung klären: Metadaten in der Datei oder YAML
- [x] Entscheidung klären: Wo liegt der Skill (dieses Repo oder `lernapps/docs`)

### Completed
- [x] Created development plan file
- [x] Ziel, Sprachen, Lizenz und Hörtest-Beurteilung mit dem Owner abgestimmt

## Plan
### Entrance criteria
- Explore abgeschlossen, Einpassung in die Architektur beschrieben, offene Entscheidungen beantwortet.

### Tasks
Entwurf (Entscheidungen, jede mit dem Owner abzustimmen, dann in `Key Decisions` und arc42):
- [x] Audioformat festgelegt (Owner, 2026-11-12): **MP3 als einziges Format, mono, 24 kHz, 48 kbit/s CBR, Metadaten als
  ID3v2.4 (`TXXX`-Felder).** 48 kbit/s klingt für den Owner deutlich besser als 24 und 32. Größenbudget pro App noch offen.
  - Browser-Unterstützung (caniuse-Daten): MP3 überall seit Jahren. AAC: Firefox nur teilweise (hängt von den Codecs des
    Betriebssystems ab). Opus: Safari nur teilweise (macOS ab 15.4, iOS ab 18.4, vorher nur in CAF/WebM mit Einschränkungen),
    also fehlt es auf älteren Schulgeräten.
  - Größe (6,7 s Sprache, gleiche Quelle): MP3 24 kHz 24/32/48 kbit/s = 20,8/27,5/41,0 kB; AAC 48 kbit/s = 42 kB;
    Opus 24/32 kbit/s = 20,4/27,1 kB. Bei MP3 48 kbit/s sind es 6 kB je Sekunde: 20 Sätze zu je 4 s etwa 480 kB.
  - Metadaten: `ffmpeg -metadata schlüssel=wert` schreibt beliebige Felder als `TXXX` in MP3 (ID3v2.4) und liest sie wieder.
    Gelesen mit `music-metadata` 11 (MIT): `TXXX:ai_generated`, `model`, `voice`, `licence`, `attribution`, `text` kamen
    unverändert an. Bei AAC/M4A schreibt ffmpeg die eigenen Felder nicht, bei Opus in Ogg liest `ffprobe` sie nicht auf
    Formatebene. Es braucht daher weder `mutagen` (GPL) noch ein weiteres Werkzeug: ffmpeg zum Schreiben, `music-metadata`
    im Build zum Lesen (neue Abhängigkeit von `app-templates`, Lizenz MIT).
  - Offen: Hörtest der Bitraten durch den Owner (24/32/48 kbit/s); MP3 hat am Anfang und Ende eine kurze Lücke
    (Encoder-Verzögerung), für Diktat unkritisch, bei Wiederholung hörbar prüfen.
- [x] Metadatenschema der Audiodatei (festgelegt, Option A): Felder (KI-generiert, Modell + Version, Stimme, Lizenz der Ausgabe, Namensnennung
  der Datenquelle, gesprochener Text, Sprache; keine Freigabe, die kommt aus Git), Bibliothek zum Lesen im Build
  (`music-metadata`, siehe oben). **Entwurf, vom Owner zu bestätigen:**

  | Frame | Inhalt | Pflicht |
  |---|---|---|
  | `TLAN` | Sprache, ISO 639-2 (`fra`, `eng`, `spa`, `ita`) | ja |
  | `TCOP` | Lizenz der Datei, `CC BY-SA 4.0` | ja |
  | `TDRC` | Erzeugungsdatum | ja |
  | `TXXX:lernapps-synthetic` | `true` bei KI-Stimme; `false` bei menschlicher Aufnahme (später) | ja |
  | `TXXX:lernapps-digital-source-type` | IPTC-Wert, bei KI-Stimme `http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia` | ja |
  | `TXXX:lernapps-model` | Modell mit Version, z. B. `kokoro-v1.0` | bei synthetisch |
  | `TXXX:lernapps-voice` | Stimme, z. B. `ff_siwis` | bei synthetisch |
  | `TXXX:lernapps-generator` | Werkzeug und Version, das die Datei erzeugt hat (das „KI-System“ des Codes) | bei synthetisch |
  | `TXXX:lernapps-attribution` | geforderte Namensnennung der Datenquelle, z. B. `SIWIS, CC BY 4.0`; `none`, wenn keine verlangt wird | bei synthetisch |
  | `TXXX:lernapps-text` | gesprochener Text; zugleich die Textfassung für den Player | ja |

  Der Build prüft, dass der Text der Datei mit der ersten Antwortvariante der Aufgabe übereinstimmt (Warnung). 

  **Entschieden (Owner, 2026-11-12):** Es gibt **kein Freigabefeld** in der Datei (`lernapps-review` entfällt): die
  Freigabe kommt aus der Git-Historie. Damit steht auch keine Person in der Datei. Präfix `lernapps-` bleibt. **Audio
  ohne die Kennzeichnung nach Art. 50 in den Metadaten bricht den Build ab.** **Bestätigt (Owner, 2026-11-12): Der Build bricht bei jedem
  fehlenden Pflichtfeld der Tabelle ab** („bei synthetisch“ gilt, wenn `lernapps-synthetic` `true` ist). **Option A
  jetzt** (diese Felder mit IPTC-Wert), **Option B (C2PA-Signatur) später**; Option C (Wasserzeichen) bleibt offen.

  **Recherche Art. 50 KI-VO (2026-11-12)**, Quellen: Verordnung, Art. 50(2); Kommission,
  [FAQ zum Code of Practice](https://digital-strategy.ec.europa.eu/en/faqs/code-practice-transparency-ai-generated-content);
  Text des [Code of Practice on Transparency of AI-Generated Content](https://ec.europa.eu/newsroom/dae/redirection/document/129555)
  (selbst gelesen, Abschnitt 1, Stand der Datei nicht geprüft):
  - Art. 50(2) verpflichtet **Anbieter** von KI-Systemen, die Audio, Bild, Video oder Text erzeugen: Die Ausgaben müssen
    „in einem maschinenlesbaren Format“ gekennzeichnet und als künstlich erzeugt erkennbar sein. Anwendbar seit
    2. August 2026; für vorher in Verkehr gebrachte Systeme Übergangsfrist bis 2. Dezember 2026 (Kommission, FAQ).
    **Ob ein Creator, der Kokoro lokal betreibt und die Ausgabe veröffentlicht, „Anbieter“ ist, beantworten die gelesenen
    Quellen nicht.** Rechtsberatung ist das nicht; wir kennzeichnen vorsorglich.
  - Der Code (freiwillig) verlangt in Maßnahme 1.1 **mindestens zwei Ebenen**, solange keine einzelne Technik die vier
    Anforderungen für Audio erfüllt: (1.1.1) **digital signierte und mit Zeitstempel versehene Metadaten**, die angeben, dass der
    Inhalt KI-erzeugt ist („in a secure and tamper-evident manner“), mit Ausnahme, wo der Schlüssel nicht sicher gehandhabt
    werden kann, „for example in a local deployment scenario“; (1.1.2) ein **nicht wahrnehmbares Wasserzeichen**. Fingerabdruck
    oder Protokoll allein genügen nicht.
  - Metadaten: der Code nennt **keinen** Standard für Felder; Maßnahme 3.4 verlangt, „established standards or best
    practices“ zu übernehmen. Empfohlen (Maßnahme 1.3): Name des KI-Systems, Name des Anbieters, Zeitstempel,
    Modellkennung und Version. Maßnahme 1.2: Metadaten nicht entfernen; bei offenen Modellen genügt ein Hinweis in der
    Dokumentation.
  - **Lücke:** Unsere ID3-Felder sind weder signiert noch ergänzt ein Wasserzeichen sie. Sie erfüllen den Code, falls er für
    uns gälte, nicht vollständig. Optionen für den Owner (Entscheidung offen):
    (A) Felder wie in der Tabelle plus Standardwerte (IPTC `DigitalSourceType` =
    `http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia`); (B) zusätzlich Signatur (z. B. C2PA; MP3-Einbettung
    und Schlüsselverwaltung noch nicht geprüft); (C) zusätzlich ein unhörbares Wasserzeichen (z. B. AudioSeal, Lizenz und
    Aufwand noch nicht geprüft). Vorschlag: A jetzt, B und C als Folgeinkrement, wenn die Rechtslage klärt, wer Anbieter ist.
  - **Option B geprüft (2026-11-12, Versuch mit `c2pa-python` 0.38.1 / c2pa-rs 0.91.3):** Technisch machbar. Ein
    C2PA-Manifest mit `c2pa.created` und `digitalSourceType` = `trainedAlgorithmicMedia` ließ sich in unsere MP3 (`audio/mpeg`)
    einbetten (als ID3-Frame `GEOB`, +3,6 kB auf 41 kB), die Audiodaten und alle `TXXX`-Felder blieben unverändert, `music-metadata`
    liest sie weiter, die Dauer ist gleich. Das Manifest wurde als `Valid` gelesen, aber mit
    `signingCredential.untrusted`, weil ich das Testzertifikat des Projekts benutzt habe. **Ein Zertifikat, dem Prüfer
    vertrauen, habe ich nicht**; wer es ausstellt, was es kostet und ob einzelne Creator es bekommen, ist nicht geprüft.
    **Folgen:** (1) Wer danach ein Tag ändert (Test: `ffmpeg -c copy -metadata …`), verliert das Manifest ganz („no JUMBF
    data found“). Die Signatur muss der **letzte** Schritt der Erzeugung sein; weil es kein Freigabefeld mehr gibt, das
    danach in die Datei geschrieben würde, entfällt dieser Konflikt. (2) Schlüsselverwahrung: einen Schlüssel pro Creator, einen
    der Organisation (z. B. in GitHub Actions) oder unsignierte Manifeste (nur Strukturschutz, kein Vertrauen). Der Code
    erlaubt für lokalen Betrieb eine Ausnahme von der Schlüsselverwahrung. (3) Die Bibliothek ist Python (Skill) und
    Rust/Node (Prüfung im Build), Lizenzen noch nicht geprüft.
  - Felder, die der Entwurf noch ergänzen sollte: `lernapps-digital-source-type` (IPTC-URI), `lernapps-generator`
    (Werkzeug und Version, das erzeugt hat; der „Name des KI-Systems“).
- [x] Autor-Schnittstelle im Explainer (**bestätigt vom Owner, 2026-11-12**: Diktat als Item des `language-task`, Selbstvergleich als eigener Block `speaking-task`, Text der Datei ist keine Antwortvariante: **Fehler**, Format 2 bleibt, `audio` ist optional und abwärtskompatibel; der Modus `write` des `language-task` ist weiter reines Schreiben ohne Audio): wie `language-task` auf Audio verweist (Diktat als Modus oder eigener Block;
  Selbstvergleich), Schema-Erweiterung von Format 2 oder neues Format, Fehlermeldungen im Stil `file:line: place (language): what to do`
  **Entwurf, vom Owner zu bestätigen:**
  - *Diktat und Hören* sind ein `language-task`: ein Item nennt statt `source` (oder `cue`) ein `audio: bonjour.mp3`
    (Datei in `src/audio/`, Kleinbuchstaben, nur `.mp3`). Die Modi `write` (Diktat), `gap` (Lückendiktat) und `choice` bleiben,
    ebenso `form`, `mistakes`, `examples`, `hint`. Der Player steht an der Stelle des Ausgangstextes; der Text der Datei
    (`lernapps-text`) erscheint erst nach dem Lösen oder wenn Lösung oder Hilfe geöffnet werden.
  - Beispiel: `- audio: je-mappelle.mp3` und `target: "Je m'appelle (Marie|Paul)."`
  - *Selbstvergleich* ist ein eigener Block `speaking-task` (kein Vergleich mit Antworten): Items mit `audio` (Vorlage) und
    optional `text`; Ablauf: hören, aufnehmen, beides abspielen, selbst bewerten („passt“, „nochmal“). Der Zustand ist
    „selbst bewertet“ und fließt wie eine Selbsteinschätzung in Ergebniszeile und Tutor ein.
  - Prüfungen im Build, jeweils `file:line: place (language): what to do`: Datei fehlt oder liegt nicht in `src/audio/`;
    Pflichtfeld der Metadaten fehlt (**Abbruch**); die Sprache der Datei (`TLAN`) passt nicht zu `languages.target`;
    der Text der Datei ist keine Variante der Antwort (**vorgeschlagen: Fehler**, Owner entscheidet).
  - Format: `audio` als zusätzliche optionale Eigenschaft ist abwärtskompatibel, **Format 2 bleibt**.
- [x] Build (**bestätigt vom Owner, 2026-11-12**): Ordner `src/audio/`, Medientyp, Auslieferung, Dev-Server, Prüfung der Metadaten (fehlt ein Pflichtfeld,
  vor allem die KI-Kennzeichnung: Build bricht ab; Entscheidung des Owners)
  - `src/audio/` (`load.ts` wie `images`: nur `<name>.mp3`, Kleinbuchstaben, sonst Fehler mit Ort und Abhilfe); `plugin.ts`
    gibt die Dateien als Assets nach `audio/` aus; der Dev-Server liefert sie als `audio/mpeg` **mit Range-Anfragen**
    (sonst springt der Player nicht); `shared/blocks/audio.ts` mit Medientyp, analog zu `image.ts`.
  - Metadaten lesen mit `music-metadata` (MIT, neue Abhängigkeit, nur im Build, nicht im Browser-Bundle). Jede fehlende
    Pflicht (Tabelle oben) ist ein Fehler `src/audio/x.mp3: lernapps-model is missing; run the audio skill again`.
  - Der Text der Datei steht als Textfassung im HTML (für den Player und nach dem Lösen); die Sprache `TLAN` wird gegen
    `languages.target` geprüft.
- [x] Anhang „Medienübersicht“ an jedem Explainer (**bestätigt, Videos (YouTube) mit Titel und Adresse eingeschlossen**): Adresse, Inhalt (Bilder und Audio, Quelle, Lizenz, KI-Hinweis,
  Namensnennung), Sprachbäume, ohne JavaScript, barrierefrei
  - Eigene Seite `medien/` (Route `kind: "media"` neben `glossar/`, Muster: `routes.ts:110`, `render.ts:391`); `medien` kommt
    in die reservierten Kapitel-IDs (`load.ts:44`); verlinkt von der Startseite, wenn die App Medien hat. Beschriftung
    „Medienübersicht“ / „Media overview“ in `messages/de.json` und `en.json`.
  - Inhalt: eine Liste aller Bilder, Audios und Videos der App; je Eintrag: Vorschau (Bild) oder Player (Audio, `preload="none"`),
    die Seiten, auf denen sie vorkommen, Quelle, Lizenz, bei Audio zusätzlich „KI-Stimme“, Modell, Stimme, Namensnennung,
    Sprache und Textfassung. Alles statisch gebaut, ohne JavaScript lesbar; für Bilder aus dem Alternativtext.
  - Sie ersetzt keine Pflichtprüfung: der Build prüft schon vorher; die Seite macht Lücken für Menschen sichtbar.
- [x] Browser (**bestätigt**): Player (Tempo 0,75/1/1,25 per `playbackRate`, Wiederholen, `preload="none"`, Tastatur, Textfassung),
  Aufnahme (`MediaRecorder`, Berechtigung erst nach Klick, nur Arbeitsspeicher, keine Speicherung, Fallback ohne Mikrofon)
  - Player: natives `<audio controls preload="none">` im statischen HTML (spielt ohne JavaScript), daneben mit JavaScript
    Tempo-Schalter 0,75 / 1 / 1,25 (`playbackRate`, `preservesPitch`), am Player ein sichtbares „KI-Stimme“ mit Modell und Stimme
    (aus den Metadaten), Textfassung als `<details>`; beim Diktat erst nach dem Lösen. Eigene Tastenbedienung nicht nötig,
    die Bedienelemente des Browsers sind zugänglich.
  - Aufnahme (`speaking-task`): Mikrofon erst nach dem Klick auf „Aufnehmen“ (`getUserMedia`); `MediaRecorder` mit dem
    Format, das der Browser meldet (`audio/webm` oder `audio/mp4`); die Aufnahme bleibt ein `Blob` im Arbeitsspeicher, wird
    nur über eine Objekt-URL abgespielt, beim Verlassen der Seite verworfen und nirgends gespeichert oder gesendet; die
    Spuren werden nach dem Stoppen beendet, damit die Mikrofon-Anzeige ausgeht. Verweigert oder fehlt das Mikrofon: kurzer
    Hinweis; die Selbstbewertung bleibt möglich („Ich habe laut gesprochen und verglichen“).
  - **Zur Kontrolle (Owner, 2026-11-12) wählen die Lernenden, was sie hören:** „Original“, „Meine Aufnahme“ und „Beide
    nacheinander“ (Original, kurze Pause, Aufnahme). Die Aufnahme lässt sich also auch allein abspielen. Alle drei
    laufen im Tempo, das gerade gewählt ist.
  - Benötigt HTTPS (lernapps.net hat es).
- [x] Prüfregeln (**bestätigt**, keine neue Regel erwartet; Prüfung in der Code-Phase): Lint und `lernapps check` erlauben Audio, `getUserMedia` und `MediaRecorder` gezielt, verbieten
  Netzwerk-APIs weiter, prüfen „keine Anfrage vor einem Klick“ auch für Audio (Lehre aus `qg-privacy`)
  - **Befund `lernapps/tooling`:** Es braucht voraussichtlich **keine neue Regel**. `vue-component-no-network` verbietet in
    Komponenten `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` und `sendBeacon`, nicht `<audio>`, `getUserMedia` oder
    `MediaRecorder`; eine Aufnahme kann also nicht über eine Komponente verschickt werden. `no-request-before-click`
    meldet Anfragen an **andere Hosts** vor einem Klick; Audio liegt auf demselben Host und lädt mit `preload="none"` gar nicht.
    `dependency-licence` lässt `music-metadata` (MIT) zu. Zu prüfen im Code (nicht annehmen): dass die gebaute Seite mit Audio
    und `speaking-task` die Regeln `accessible`, `explainer-readable-without-js`, `usable-at-360px` und `no-tracking` besteht.
  - Dazu ein **Test mit der Beispiel-App**: `lernapps check` über `explainer/examples/franzoesisch` mit Audio ohne Befund.
- [x] Zustand und Tutor (**bestätigt**): wie Diktat (richtig/teilweise/falsch) und Selbstvergleich („selbst bewertet“) in Ergebniszeile,
  Selbsteinschätzung und Tutorseite eingehen
  - **Vorbild ist `dec-open-task`** (Antwort zuerst, dann Vergleich mit Punkten, das Foto „aus dem Arbeitsspeicher, nie gespeichert
    oder gesendet“). Der Selbstvergleich folgt dem: drei Schaltflächen zur **Aussprache** (Owner,
    2026-11-12): **„Klingt gleich“ → richtig, „Erkennbar, aber holprig“ → teilweise, „Nochmal“ → falsch**; die Aufnahme bleibt im Arbeitsspeicher; in der Ergebniszeile steht nur die Bewertung und der
    Hinweis, dass aufgenommen wurde, nie die Aufnahme. Die Bewertung bleibt nur solange der Tab offen ist (wie beim
    offenen Task über `sessionStorage` mit dem Präfix der App).
  - **Diktat:** Zustand aus der bestehenden Prüfung (`language.ts`), unverändert.
  - **Tutorseite:** Für das Diktat steht die Textfassung der Datei (`lernapps-text`) auf der Tutorseite, mit dem Hinweis, dass die
    Lernenden das Audio gehört haben und der Tutor es nicht abspielen kann. Für den Selbstvergleich der Text, die Anleitung und
    wie man hilft (zum Beispiel Laute zu beschreiben); der Tutor hört die Aufnahme nicht.
  - **Selbsteinschätzung eines Kapitels:** `speaking-task` **nicht zulassen** (Owner, 2026-11-12; eine Selbstbewertung zur
    Selbsteinschätzung wäre zirkulär; der Build meldet es mit Ort und Abhilfe); das Diktat ja, wie jede `language-task`.
- [ ] Skill in `lernapps/tooling` (**Auflage des Owners:** kurze Erklärung an den Creator, bevor Audio-Aufgaben erstellt werden: was gebraucht wird, Footprint (Tabelle oben, rund 0,6 GB Download, 0,8 GB Platz, einmalig) und freizugebende Hosts) (`skills/…/lernapps-…`), kompakt: Stimmenliste, Aufruf, Preflight mit gesammelten
  Fehlern (Python, Pakete, `ffmpeg`, Modelle + Prüfsumme, Speicher, Hosts), Exit-Codes, Hinweis zum Umgang mit
  Sprachproben, Pfade; Auswirkung auf `skills-lock.json`, `lernapps update`, `lernapps-cli` (Voraussetzungen)
- [ ] Piper-Stimme `pierre` und Kokoro in einem Skript (zwei Engines) oder getrennt? Entscheidung; Metadaten gleich
- [x] `add_repo` mit Push-Zugriff für `lernapps/tooling`: erteilt und geklont (`/home/user/tooling`, Branch `main`; vor dem Schreiben einen Feature-Branch anlegen)
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

### Entwurf der restlichen Plan-Aufgaben (zu bestätigen)
- **Skill in `lernapps/tooling`:** `skills/content/lernapps-audio/` mit `SKILL.md` (kompakt: wann, Ablauf in wenigen Schritten, die
  erlaubten Stimmen, kurzer Footprint-Hinweis für den Creator, Hinweis zum Umgang mit Sprachproben: die prüfende Person
  soll die Sprache beherrschen, die Freigabe ist der Commit), `references/voices.md` (Stimmen, Sprache, Geschlecht, Lizenz,
  Namensnennung) und `scripts/lernapps_audio.py` **mit zwei Engines (Kokoro, Piper) in einer Datei**: ein Aufruf, ein Preflight,
  ein venv (231 MiB gemessen). Unterbefehle `preflight` und `generate` (Sprache, Stimme, Text, Ausgabedatei in `src/audio/`),
  Modelle und venv im Cache des Nutzers (`~/.cache/lernapps/audio/`), nie in der App. Preflight meldet **alle** fehlenden
  Voraussetzungen gesammelt (Python-Version, Pakete, `ffmpeg`, Modelle samt Prüfsumme, Platz, Hosts) mit Abhilfe in einer
  Zeile; Exit-Codes: 0 gut, 2 Voraussetzung fehlt, 3 Stimme nicht erlaubt, 4 Erzeugung fehlgeschlagen. Schreibt die
  Metadaten der Tabelle (ffmpeg), nur Stimmen der Liste; die Namensnennung stammt aus der Liste. Auswirkung auf
  `lernapps update`, `skills-lock.json` und `lernapps-cli` (Voraussetzungen) im Code zu prüfen.
- **Plattform `dec-licences` in `lernapps/docs`:** eigene kleine Änderung (CC BY-SA statt CC BY 4.0) auf einem eigenen Branch dort,
  nach dem Code, mit Push-Zugriff auf `lernapps/docs` (heute nur lesend). Bis dahin widersprechen sich Plattform und Apps.
- **Architektur (`explainer/docs/arc42`) und README:** `arc42 guide chapter <n>`, dann Bausteine (Audio-Datei und Metadaten-Prüfung,
  Player, Aufnahme, Medienübersicht), Entscheidungen (synthetische Stimmen mit Kennzeichnung, Metadaten in der Datei, Tempo im Player, Diktat als
  `language-task`, Selbstvergleich nach `dec-open-task`, MP3 als einziges Format, Signatur später), Randbedingung Mikrofon (`con-…`)
  und Szenarien; `arc42 validate`; im README „No audio“ ersetzen.
- **Reihenfolge der Inkremente** (je Inkrement eigene Commits auf dem Feature-Branch, vor dem Merge zusammenfassen):
  (1) `app-templates`: Metadaten lesen, `src/audio/`, Auslieferung, Dev-Server, Medienübersicht für Bilder, Audio, Videos;
  (2) `app-templates`: Diktat (`audio` im `language-task`, Player mit Tempo, Textfassung, Prüfungen, Beispiel);
  (3) `app-templates`: `speaking-task` (Aufnahme, Wiedergabe-Auswahl, Bewertungen, Tutor);
  (4) `tooling`: Skill und Skript, abgestimmt auf die Metadaten aus (1) mit einer gemeinsamen Testdatei;
  (5) Architektur, README, `lernapps/docs`.
- **Teststrategie:** Einheitentests (Metadaten lesen: gültige Datei, fehlendes Pflichtfeld, falsche Sprache, Text keine Variante der
  Antwort); Build-Tests (Fehlermeldungen mit Ort und Abhilfe); End-to-End mit Playwright ohne Netz (Diktat: kein Request vor dem Klick,
  richtig/falsch, Textfassung nach dem Lösen; Aufnahme mit Chromium-Testmikrofon `--use-fake-device-for-media-stream`
  `--use-fake-ui-for-media-stream`: keine Anfrage mit der Aufnahme, Bewertung, Wiedergabe-Auswahl); `lernapps check` an
  `explainer/examples/franzoesisch` (Barrierefreiheit, ohne JavaScript, 360 px); kleine Testdateien (wenige kB, mit
  `lernapps-model: test-fixture`). Safari/iOS ist hier nicht testbar (nur Chromium vorhanden): von Hand durch den Owner.
- **Risiken:** (1) Safari/iOS: Wiedergabe nur nach Geste, `MediaRecorder` liefert dort `audio/mp4`: ungetestet; (2) Mikrofon verweigert
  oder fehlt; (3) Modell-Download blockiert (Hosts im Preflight nennen); (4) Aussprachefehler des Modells (Zahlen, Fremdwörter,
  Bindung im Französischen), nur durch Hören zu fangen; (5) Kokoro-Trainingsdaten teils synthetisch von geschlossenen Anbietern, von uns nicht
  geprüft; (6) unsignierte Metadaten erfüllen den Code of Practice nicht vollständig, Rechtslage offen (Optionen B, C);
  (7) neue Abhängigkeit `music-metadata` im Build; (8) Skripte in Skills sind im Tooling neu (Verteilung, Sicherheit der Ausführung).

## Code
### Entrance criteria
- Plan vom Owner freigegeben, Hörtest-Ergebnis liegt vor.

Der Owner hat am 2026-11-12 freigegeben, **ohne Halt an den Phasengrenzen** weiterzuarbeiten (autonomer Betrieb).

### Tasks
- [x] Inkrement 1 (`app-templates`): Metadaten lesen, `src/audio/`, Auslieferung, Dev-Server mit Range,
  Medienübersicht (`medien/`) für Bilder, Audio und Videos, Testdateien, Tests (fertig, 567 Tests grün).
  **Abweichung vom Plan:** Statt `music-metadata` liest `runtime/shared/audio.ts` die ID3-Frames selbst (rund 150 Zeilen,
  v2.3 und v2.4, UTF-8/16/Latin-1, übersprungene unbekannte Frames wie `GEOB` für C2PA). Grund: der Loader ist synchron,
  `music-metadata` ist asynchron; und es entfällt eine Abhängigkeit. Das Schreiben bleibt bei `ffmpeg`.
  Für die Tests in dieser Umgebung wurde `@lernapps/tooling` (optionale Peer-Abhängigkeit) ohne Speichern installiert.
- [x] Inkrement 2 (`app-templates`): Diktat (`audio` im Item des `language-task`), Player mit Tempo, Prüfungen, Beispiel
  (fertig; 578 Tests grün; `lernapps check` an der französischen Beispiel-App mit Audio ohne Befund außer einer alten Warnung).
  **Abweichungen:** (1) Bei `direction: to-source` darf das Item kein `target` haben (es wäre ein zweiter Ausgangspunkt); der Text
  der Datei wird dort nicht gegen eine Antwort geprüft. (2) Die Textfassung beim Diktat ist die „Lösung“ der Aufgabe (ohne
  JavaScript im `<details>`, mit JavaScript über „Lösung“), kein eigener Block; die Medienübersicht zeigt den Text immer.
  (3) Die Beispieldateien stammen aus dem neuen Skill (`lernapps_audio.py generate`), der Vertrag der Felder wurde damit gegen den
  Build geprüft. Für den Test in der Vorlage `explainer/` muss die Kopie des Laufzeitpakets neu installiert werden
  (`install-links`); das Skript dafür liegt nur in der Sitzung.
- [x] Inkrement 3 (`app-templates`): `speaking-task` (Aufnahme, Wiedergabe-Auswahl, Bewertungen, Tutorseite, nicht in der Selbsteinschätzung)
  (fertig; 588 Tests grün; `lernapps check` der Vorlage mit der französischen Beispiel-App samt Aufnahme-Test im Browser ohne Befund).
  **Abweichungen:** (1) Die Bewertungen bleiben nur im Arbeitsspeicher der Seite (kein `sessionStorage`): eine Aufnahme wird nirgends
  gespeichert, und mit ihr die Bewertung zu verlieren, ist die einfachere und datensparsamere Regel. (2) Der Block hat ein „Lösung“ mit den
  Texten der Modelle (verlangt die Regel `explainer-readable-without-js` für jede Übung, und es ist die Textfassung für alle). (3) Der Test im
  Browser nutzt ein Mikrofon der Seite selbst (ein Ton über `AudioContext`), weil `launchOptions` in einem Test nicht gesetzt werden dürfen.
  (4) Die Wiedergabe-Auswahl („Original“, „Meine Aufnahme“, „Beide nacheinander“) und die drei Bewertungen sind die Schaltflächen der
  Lernenden, wie beschlossen.
- [x] Inkrement 4 (`tooling`, Branch `feat/audio-skill`, Commits `1efdab0`, `40d3478`): Skill `lernapps-audio` mit Skript `lernapps_audio.py`
  (`preflight`, `generate`, `voices`; Exit-Codes 0/2/3/4/64), 16 erlaubte Stimmen, Footprint-Hinweis für den Creator; 506 Tests grün. **Abgleich mit
  dem Build bestanden:** die Beispieldateien der französischen App stammen aus dem Skript und werden vom Build gelesen. Die Referenz `language-tasks.md` des
  Explainer-Skills nennt `audio` und `speaking-task`. Nicht geprüft: Windows/macOS, der Weg ohne System-ffmpeg (pip-Paket), ein blockierter Host.
- [x] Inkrement 5: arc42 in `explainer/docs/arc42` (3 Bausteine, 4 Entscheidungen, 2 Szenarien, 2 Begriffe; `node scripts/arc42.ts` ohne Befund),
  README, Schema, `lernapps check` an der Beispiel-App (ohne Befund); `lernapps/docs` Branch `fix/content-licence-cc-by-sa`, Commit `e3e43ec`
  (`dec-licences`: CC BY-SA 4.0 für Inhalte; `arc42 validate` ohne Befund; kein Pull Request, nicht verlangt).

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
