# Development Plan: Fremdsprachen im Explainer (claude/pensive-cray-nb2mwh branch)

*Begonnen am 2026-11-08, Workflow [epcc](https://codemcp.github.io/workflows/workflows/epcc) (Explore, Plan, Code, Commit)*

## Goal

Der Explainer soll Fremdsprachen tragen, die jetzt auf der Lernlandkarte stehen (Englisch, Französisch, Spanisch,
Latein). Dafür:

1. **Schreibende Sprachaufgaben**: Übersetzen und Lückentexte, in beide Richtungen (Deutsch → Zielsprache und
   Zielsprache → Deutsch). Lernende schreiben selbst, auch ganze Sätze; kein Auswählen aus einem Drop-down.
   Die Aufgabe enthält statisch Ausgangstext und Übersetzung(en).
2. **Deterministische Fehlererkennung** typischer Fehler: Groß-/Kleinschreibung, fehlender Bindestrich oder
   Apostroph, fehlende oder falsche Akzente, Leerzeichen und Satzzeichen.
3. **Grundwortschätze pro Sprache**, unabhängig von Lehrwerken, als Orientierung für Creator beim Erstellen. Kein
   Wörterbuch: keine Beispielsätze, keine Prüfung gegen die Liste in der App.

## Key Decisions

- KD-01 (Owner, 2026-11-08): Es geht um den Archetyp explainer.
- KD-02 (Owner, 2026-11-08): Grundwortschätze ja, aber nur als Orientierung für Creator; ohne Beispiele, kein
  Wörterbuch.
- KD-03 (Owner, 2026-11-08): Sprachaufgaben enthalten Ausgangstext und Übersetzung statisch; Übersetzung und
  Lückentext sind je nach Übung in beide Richtungen möglich.
- KD-04 (Owner, 2026-11-08): Lernende schreiben selbst (Sätze oder mehr), nicht nur Auswahl. Typische Fehler werden
  deterministisch erkannt.
- KD-05 (Owner, 2026-11-08): Die Grundwortschätze liegen in lernapps/apps neben der Karte.
- KD-06 (Owner, 2026-11-08): Nur im Explainer, nicht im Quiz. Owner fragt, ob ein abstraktes Modell „Übersetzung“
  in mehreren Darstellungen (Auswahl, Lückentext, freie Übersetzung) sinnvoll ist; Vorschlag dazu siehe Notes.
- KD-07 (Owner, 2026-11-08): Wie Formfehler zählen, legt der Creator bei der Verwendung der Aufgabe fest.
- KD-08 (Owner, 2026-11-08): Wir beginnen mit Französisch (Beispiel und erste Wortliste).
- KD-09 (Owner, 2026-11-08): Modell bestätigt: Vorgabe → Antwort, Einheit Wort bis Satz, Übersetzung oder Umformung,
  Darstellungen `write`, `gap`, `choice`, `table`; `material` wie bei Fragen; Marker einer `labelled-figure` als
  Vorgabe.
- KD-10 (Owner, 2026-11-08): Ein Bild in der Lösung ist ein eigenes Feature: lernapps/app-templates#142, an eine
  eigene Session übergeben.
- KD-11 (Owner, 2026-11-08, O4): Ein eigenes Beispiel für einen Sprachen-Explainer, getrennt vom
  Mathematik-Beispiel. Vorschlag zur Form: `explainer/examples/franzoesisch/` als vollständige App (Format 2,
  Strang `franzoesisch/wortschatz`), im Paket enthalten, im CI gebaut und per e2e getestet; das Scaffold bleibt
  unverändert, die README verweist darauf.
- KD-12 (Owner, 2026-11-08, O2): Die Richtung ist Teil der Aufgabe; Lernende wählen sie nicht. `direction` kennt
  nur `to-target` und `to-source`, kein `both`, kein Umschalter. Beide Richtungen = zwei Aufgaben.
- KD-15 (Owner, 2026-11-09, Feedback zum Beispiel): Die Sonderzeichen-Leiste ist nur ein Fallback (jede Tastatur
  kann die Zeichen eingeben): eingeklappt hinter „Sonderzeichen“. Keine Leiste, wenn die Lernenden in der Sprache der
  Seite schreiben.
- Owner-Feedback 2026-11-09: „Prüfen“ und die Hilfe des Tutors standen in zwei Zeilen. Ursache: Die Sprachaufgabe
  meldete ihre Zeile mit „Prüfen“ nicht (`SHOWN_EVENT`), der Hilfe-Knopf bekam eine eigene Zeile. Behoben.
- KD-17 (Owner, 2026-11-09): Die Markdown-Dateien (README, arc42, Skills, Vertrag) bleiben abstrakt. Beispiele,
  ausdrücklich als solche gekennzeichnet, stehen nur in der Referenz für Fremdsprachen
  (lernapps/tooling, `foreign-languages.md`, Abschnitt „Examples (French)“). Auch die Feldbeschreibungen im
  JSON-Schema sind allgemein (Owner, 2026-11-09).
- KD-16 (Owner, 2026-11-09, offen): „Eine App, ein Strang“ ist bei Sprachen hinderlich (viele Querbezüge);
  gleichzeitig hilft eine einheitliche Methodik je Strang, etwa eine gemeinsame App für Wortschatz. Wie beides
  zusammengeht, wird noch diskutiert (Optionen in der Antwort an den Owner vom 2026-11-09). Owner: als eigenes
  Feature in einer neuen Session: lernapps/apps#226.
- KD-14 (Owner, 2026-11-08): Quelle des Grundwortschatzes Französisch ist FLELex, mit Zitat (François, Gala, Watrin &
  Fairon 2014, LREC; für FLELex/Beacco: Pintard & François 2020, READI). Die Seite lädt zur Nutzung ein; die Lizenz
  ist nicht ganz klar, der Owner nimmt das in Kauf. Umsetzung in lernapps/apps in dieser Session.
- KD-13 (Owner, 2026-11-08, O1, O3): Keine Klasse für Tippfehler. Korrektur des Owners zu O1: „alles strikt“:
  Standardwert jeder Formfehler-Klasse ist `wrong` (mit Hinweis auf die Klasse); der Creator lockert je Aufgabe.
  Entwurf D1 bis D8 bestätigt.

## Notes

### Plattform-Einordnung

- Die Lernlandkarte (lernapps/apps, `map/<subject>.yaml`) hat für Englisch und Französisch einen Strang `wortschatz`
  mit Themen-Bausteinen (z. B. `englisch/essen-trinken`, `englisch/schule`) mit Richtstufe. Ein Grundwortschatz kann
  sich an diese Bausteine hängen: Wörter je Baustein und Richtstufe.
- Creator-Anleitungen (Skills) liegen in lernapps/tooling (`skills/`) und lernapps/practice; beide Repos sind nicht in
  dieser Session. Der Katalog (lernapps/apps) veröffentlicht die Karte unter lernapps.net/apps; ein Skill kann auf eine
  veröffentlichte Wortliste verlinken.
- Die Skills pdt und arc42-language sind in dieser Session nicht installiert; die Einordnung stützt sich auf die
  arc42-Dokumente im Repo.

### Architektur heute (app-templates)

- Aufgaben im Explainer: die sechs geteilten Fragetypen (`runtime/shared/questions/question.v1.schema.json`:
  single-choice, multiple-choice, true-false, number, ordering, matching), `generated`, Übungs-Komponenten (Vue) und
  der Explainer-eigene Block `open-task` (`runtime/explainer/open-task.ts`, `dec-open-task`).
- Keine Texteingabe mit automatischer Prüfung. `open-task` hat eine Texteingabe, wird aber von Lernenden selbst mit
  Punkten verglichen (keine automatische Prüfung).
- Vorbilder, die passen:
  - `open-task` als Explainer-eigener Block (nicht im Quiz), mit Ergebnis `teilweise` (`dec-self-assessment-partly`).
  - `examples.accepted` / `examples.rejected` der Fragen: Testfälle, die der Build durch dieselbe Prüfung schickt
    wie die Seite. Das passt gut für erlaubte Übersetzungen und typische Fehler.
  - `mistakes` bei `number`: typische falsche Antworten mit eigener Meldung.
- Ohne JavaScript muss jede Seite vollständig sein (`dec-explainer-complete-without-js`): Aufgabe plus Lösung unter
  „Lösung“.
- Tutorseite und Ergebniszeile müssen die neue Aufgabe kennen (`tutorpage.ts`, `result.ts`), ebenso die
  Selbsteinschätzung (`assessment-client.ts`).
- Sprachauszeichnung: Texte sind Strings oder Maps nach App-Sprache (de/en). Fremdsprachige Teile innerhalb einer
  deutschen Seite haben heute kein `lang`-Attribut (wichtig für Screenreader und Rechtschreibhilfe).

### Vorschlag zu KD-06: ein Modell, mehrere Darstellungen

Ein Block (Arbeitsname `translation`) hält Satzpaare: Ausgangstext und Übersetzung, jeweils mit Sprache, dazu
erlaubte Varianten. Die Darstellung (`mode`) wählt der Creator: `write` (ganzer Satz frei), `gap` (Lücken im Satz,
markiert im Text), `choice` (Lücken mit Auswahl, als leichter Einstieg). `direction` legt fest, in welche Richtung
geübt wird. Eine Prüfung für alle Darstellungen: normalisierter Vergleich gegen die erlaubten Antworten, Formfehler
nach Einstellung der Aufgabe (KD-07). Bestätigung durch den Owner offen.

### Owner-Frage 2026-11-08: Konjugation, Deklination, einzelne Wörter

Nicht jede Einheit ist ein Satz: auch Wort, Ausdruck, Konstruktion; Konjugation und Deklination sind keine
Übersetzung, sondern Umformung. Vorschlag: das Modell verallgemeinern zu „Vorgabe → erwartete Antwort(en)“.
Die Einheit ist beliebig groß (Wort bis Satz). Die Vorgabe ist entweder ein Text in der anderen Sprache
(Übersetzung) oder ein Stichwort zur Umformung (`aller` + `nous` + `présent` → `allons`). Neue Darstellung `table`
für Paradigmen (Konjugations-/Deklinationstabelle mit Lücken). Prüfung und Formfehler-Einstellung bleiben gleich.
Später möglich: Paradigmen aus einer Datendatei ziehen wie `generated`. Bestätigung durch den Owner offen.

### Owner-Frage 2026-11-08: Wiederverwendung von Abbildungen und Beschriften

Heute: Fragen haben `material` (geteilte Blöcke aus `runtime/shared/blocks/blocks.v1.schema.json`: text, formula,
figure, labelled-figure, table, quote, code). Eine `labelled-figure` mit `legend: false` zeigt nur Marker (A, B, 1a);
Beschriften ist heute eine `matching`-Frage (Marker ↔ Begriff, also Auswahl). Ein Bild in der Lösung gibt es nicht:
`explanation` ist nur Text.
Vorschlag:
1. Die Sprachaufgabe bekommt dasselbe `material` wie die Fragen (kein neuer Bildmechanismus): Bild als Vorgabe,
   Text für einen Lückentext zum Leseverstehen.
2. Vorgabe kann ein Marker einer `labelled-figure` sein (`cue: { marker: A }`): Beschriften durch Schreiben des
   französischen Worts. Der Build prüft, dass der Marker existiert.
3. Darstellung `table` lehnt sich an den geteilten Block `table` an.
4. Bild in der Lösung: eigenes, allgemeines Thema für alle Aufgaben, nicht Teil dieses Features (Owner-Bestätigung
   offen).

### Offene Fragen an den Owner (beantwortet: KD-05 bis KD-08)

1. Wo liegen die Grundwortschätze? (Vorschlag: lernapps/apps neben der Karte.)
2. Neuer Block nur im Explainer (wie `open-task`) oder neuer geteilter Fragetyp (auch im Quiz)?
3. Wie zählen erkannte Formfehler (Großschreibung, Akzent …): richtig mit Hinweis, `teilweise` oder falsch?
4. Mit welcher Sprache beginnen wir (Beispiel-App, erste Wortliste)?

## Explore

### Tasks


### Completed

- [x] Antworten des Owners festgehalten (KD-05 bis KD-10)
- [x] Issue #142 (Bild in der Lösung) angelegt und an eine eigene Session übergeben
- [x] Created development plan file
- [x] Aufgabentypen, `open-task`, Prüfmechanik (`examples`, `mistakes`) und Entscheidungen des Explainers gelesen
- [x] Lernlandkarte Englisch/Französisch angesehen: Strang `wortschatz` mit Themen-Bausteinen

## Plan

### Phase Entrance Criteria

- Die offenen Fragen sind beantwortet und als Key Decisions festgehalten.
- Es ist klar, welche Repos betroffen sind (app-templates; ggf. apps für die Wortlisten).

### Tasks


### Completed

- [x] Verdrahtung von `open-task` als Vorbild gelesen (`content.ts`, `exercises.ts`, `explainer.ts`,
      `check-page.ts`, `assessment-*.ts`, `result.ts`, `tutorpage.ts`, `e2e.ts`)
- [x] Wortschatz-Bausteine Französisch gelesen (`apps/map/franzoesisch.yaml`, Strang `wortschatz`, 35 Bausteine)
- [x] Entwurf D1 bis D8 geschrieben (unten)
- [x] Owner hat Entwurf und offene Punkte bestätigt (KD-11 bis KD-13)

### Design (Entwurf, 2026-11-08)

**D1. Block `language-task`, nur im Explainer** (wie `open-task`, KD-06, KD-09)

Ein Eintrag (`items[]`) ist ein Paar, geschlüsselt nach Sprache. Beide Seiten dürfen Lücken `[…]` tragen; die
Richtung wählt, welche Seite die Antwort ist. Die Vorgabe ist die andere Seite (Übersetzung), ein Stichwort `cue`
(Umformung) oder ein Marker `marker` einer `labelled-figure` im `material`.

```yaml
- type: language-task
  id: se-presenter
  task: Übersetze.                    # optional; sonst ein Standardtext je mode und Richtung
  languages: [de, fr]                 # Quellsprache, Zielsprache (BCP 47, frei; nicht nur de/en der App)
  direction: to-target                # to-target | to-source (KD-12)
  mode: write                         # write | gap | choice | table
  form: { case: hint, accents: partly }   # Formfehler, KD-07; Standardwerte siehe D2
  material: [...]                     # wie bei Fragen (blocks.v1 materialBlock), optional
  items:
    - de: "Ich heiße Marie."
      fr: "Je (m'appelle|suis) Marie."     # (a|b): Varianten im Text
      accepted: { fr: ["Moi, je m'appelle Marie."] }
      mistakes:
        - fr: "Je appelle Marie."
          message: "Vor einem Vokal wird aus je: j'."
    - cue: "aller · nous · présent"   # Umformung: nur die Zielseite
      fr: "allons"
    - marker: A                       # Beschriften: Marker der labelled-figure
      fr: "le frigo"
      accepted: { fr: ["le réfrigérateur"] }
  hint: …
  explanation: …
  examples: { accepted: [...], rejected: [...] }   # Testfälle für den Build, wie bei Fragen
```

- `mode: gap`: Lücken `[…]` in der Antwortseite werden zu Eingabefeldern, der Rest steht da. Ohne Lücke ist ein
  Eintrag im Lückenmodus ein Fehler im Build.
- `mode: choice`: wie `gap`, aber je Lücke eine Auswahl; falsche Optionen je Lücke in `distractors` (1 bis 4).
- `mode: table`: statt `items` eine Tabelle (Paradigma), angelehnt an den geteilten Block `table`:
  `table: { caption, columns, rows: [[...]] }`, Zellen mit `[…]` sind Lücken.
- Die Richtung legt die Aufgabe fest (KD-12); wer beide Richtungen üben lassen will, schreibt zwei Aufgaben.

**D2. Prüfung: ein reines Modul `language-check.ts`** (Browser und Build, ohne Node)

1. Normalisieren (immer, kein Fehler): Unicode NFC, Leerzeichen am Rand und doppelte weg, typografische Zeichen
   gleichsetzen (’ → ', « » “ ” → "), schmales Leerzeichen vor ; : ! ? im Französischen egal.
2. Vergleich mit jeder erlaubten Antwort (Antwortseite mit ausgeklappten Varianten `(a|b)` plus `accepted`;
   höchstens 64 Fassungen, sonst Fehler im Build). Gleich → richtig.
3. Sonst Formfehler-Klassen nacheinander ausgleichen, bis es passt: `case` (Groß/klein), `accents` (Diakritika),
   `hyphen` (Bindestrich), `apostrophe` (j'ai / je ai / jai), `punctuation` (Satzzeichen am Ende/fehlend). Die
   gefundenen Klassen bestimmen das Ergebnis nach `form`: `ok` (richtig, still), `hint` (richtig mit Hinweis),
   `partly` (teilweise), `wrong` (falsch, mit Hinweis). Standard: alles `wrong` (KD-13, strikt).
4. Sonst `mistakes` des Eintrags (nach Normalisierung) → falsch mit dessen Meldung.
5. Sonst falsch. Bei `write` mit ganzem Satz zusätzlich: „Deine Fassung kann auch richtig sein – frag deinen Tutor."
- Der Hinweis nennt Klasse und Wort: „Achte auf den Akzent: *élève*."
- Ergebnis der Aufgabe: alle Einträge richtig → `richtig`; einige → `teilweise` (`dec-self-assessment-partly`);
  keiner → `falsch`.

**D3. Darstellung**

- Ohne JavaScript: Auftrag, `material`, je Eintrag die Vorgabe, unter „Lösung“ (`<details>`) die Antworten mit
  Varianten (`dec-explainer-complete-without-js`).
- Mit JavaScript: Eingabefelder (`write`: ein Feld je Eintrag, mehrzeilig ab langer Antwort; `gap`: Felder im
  Text, Breite nach Lösung; `choice`: `<select>` je Lücke; `table`: Felder in Zellen), „Prüfen“ und „Lösung“ wie
  jede Übung, Rückmeldung je Eintrag.
- Zielsprache ausgezeichnet: `lang="fr"` auf Texten und Feldern, `spellcheck="false"`, `autocapitalize="off"`,
  `autocomplete="off"` (Screenreader liest Französisch, das Gerät korrigiert nicht vor).
- Sonderzeichen-Leiste je Zielsprache unter dem Feld mit Fokus (fr: é è ê ë à â ç î ï ô û ù œ «»), Taste fügt an
  der Schreibmarke ein. Begründung: deutsche Tastaturen.

**D4. Tutor, Ergebniszeile, Selbsteinschätzung**

- Tutorseite: je Eintrag Vorgabe, Lösung mit Varianten, typische Fehler, Einstellung der Formfehler, und wie
  helfen: nicht vorsagen, auf Klasse des Fehlers lenken; eigene Fassungen der Lernenden prüfen.
- Ergebniszeile: je Eintrag die Eingabe und das Ergebnis mit Klasse (z. B. „teilweise: Akzent“).
- Selbsteinschätzung: kann die Aufgabe zeigen, ohne „Prüfen“; ausgewertet mit dem Ganzen, `teilweise` zählt halb.

**D5. Prüfungen im Build** (`load.ts`, `check-page.ts`)

- Sprachen gültig (BCP 47), Antwortseite in jedem Eintrag vorhanden; bei Übersetzung auch die Vorgabeseite.
- Lücken: Klammern paarig, in `gap`/`choice` mindestens eine; `distractors` nicht gleich der Lösung.
- `marker` existiert in einer `labelled-figure` des `material`, die `legend: false` hat.
- `mistakes` und `examples.rejected` werden nicht als richtig angenommen; `examples.accepted` schon (gleiche
  Prüfung wie die Seite).
- Höchstens 64 ausgeklappte Fassungen je Eintrag.

**D6. Grundwortschatz neben der Karte** (lernapps/apps, KD-02, KD-05)

- Datei `map/franzoesisch/vocabulary.yaml`, Schema `schemas/vocabulary.v1.schema.json`: je Baustein-Id eine Liste
  von Einträgen `{ fr, de, gender? }` (gender nur bei Nomen: m/f). Keine Beispiele, keine Wortart-Pflicht.
- Richtstufe kommt vom Baustein; Build im Katalog prüft, dass jede Id ein Baustein des Fachs ist.
- Veröffentlicht als Seite und JSON unter der Karte (wie `map-json.njk`), damit Creator-Anleitungen darauf
  verlinken können. Quelle und Lizenz je Liste im Kopf der Datei; Lehrwerkslisten sind ausgeschlossen.
- Erste Liste: Bausteine 5-6 des Strangs `wortschatz` (17 Bausteine), Quellen nach der Methode von `map-research`.

**D7. Beispiel und Tests**

- Eigenes Beispiel `explainer/examples/franzoesisch/` (KD-11) mit allen vier `mode` und einer `labelled-figure`
  mit Marker; Einheitstests
  für `language-check.ts` (Tabellen von Eingaben je Klasse und Einstellung), e2e für Eingabe, Leiste, Prüfen,
  Lösung, ohne JavaScript.
- README des Explainers („What it can do“), Entscheidung `dec-language-task` in
  `explainer/docs/arc42/09-explainer-decisions.arc42.md`, Glossar.

**D8. Reihenfolge der Pull Requests**

1. app-templates: Block, Prüfung, Darstellung, Tutor, Tests, Doku (dieser Branch).
2. apps: Schema und Seite des Grundwortschatzes, erste französische Liste (Branch gleichen Namens).
3. tooling (nicht in dieser Session): Creator-Anleitung verlinkt Grundwortschatz und erklärt `language-task`.

### Skizze: Content-Skill für Fremdsprachen (Owner, 2026-11-08: vor dem Grundwortschatz skizzieren)

Ort: lernapps/tooling, `skills/`. Vorhandene Struktur: je Fach eine Referenz in
`content/lernapps-exercise-patterns/references/<fach>.md`, die Notation in `archetypes/lernapps-explainer/references/`.
Vorschlag: kein eigener Skill, sondern
1. `content/lernapps-exercise-patterns/references/foreign-languages.md`: Grundsätze, Muster je Art von Baustein,
   Aufbau einer Seite, Prüfen;
2. `archetypes/lernapps-explainer/references/language-tasks.md`: die Notation von `language-task`;
3. Verweise in den beiden SKILL.md (Tabelle der Fächer, „Read when“).
Inhalt der Skizze: siehe Antwort an den Owner vom 2026-11-08 (Grundsätze, Mustertabelle, Seitenaufbau, Prüfen,
Lücken). Owner: Ort passt, Dateien schreiben (2026-11-08). Umgesetzt in lernapps/tooling, Branch
`claude/pensive-cray-nb2mwh` (eigener Plan dort).

### Offene Punkte an den Owner

- O1: beantwortet (KD-13).
- O2: beantwortet (KD-12).
- O3: beantwortet (KD-13): keine Klasse `typo`.
- O4: beantwortet (KD-11).

## Code

### Notes from the code phase

- Tabelle: Kopfzeile heißt `header` wie beim geteilten Block `table` (statt `columns` im Entwurf).
- Zeilen einer Tabelle ohne Lücke fragen nichts: sie zählen nicht mit (`combined([])` ist richtig).
- Alle Felder einer Aufgabe sind gleich breit (die längste Antwort): die Breite verrät nichts.
- Rückmeldung zur Tabelle steht unter der Tabelle (360 px).
- Bei `choice` zählt die Schreibung genau: „le“ ist ein gültiger falscher Vorschlag neben „Le“.
- `lernapps check` (Build, Unit, e2e mit und ohne JavaScript, a11y, 360 px) am Beispiel grün; 525 Unit-Tests grün.
- C6 offen: Quelle und Lizenz des Grundwortschatzes Französisch sind Entscheidung des Owners. Gefunden (2026-11-08):
  FLELex (UCLouvain, nach GER A1–C2 gestuft, aus FLE-Lehrwerken gezählt; Lizenz auf der Downloadseite nicht genannt,
  Repositorium nennt CC BY-NC 3.0 US); Eduscol „Liste de fréquence lexicale“ (ca. 1500 häufigste Wörter, Brunet;
  für Muttersprachler, Lizenz zu prüfen); Français fondamental (1950er, Status unklar).

### Phase Entrance Criteria

- Der Entwurf (Schema des Blocks, Prüfregeln, Rendering mit und ohne JavaScript, Tutor, Selbsteinschätzung,
  Ablage der Wortlisten) ist vom Owner bestätigt.

### Tasks

- [x] C1 Prüfmodul `runtime/explainer/language.ts` (rein, ohne Node): Normalisieren, Varianten `(a|b)` ausklappen,
      Lücken `[…]` lesen, Formfehler-Klassen, `mistakes`, Ergebnis je Eintrag und Aufgabe; Einheitstests
- [x] C2 Schema (`explainer.v1.schema.json` `$defs/languageTask`, im Format 2 mit), Typen (`content.ts`),
      `isExercise`, `schema.ts`; Prüfungen im Build (D5) und `examples` durch dieselbe Prüfung
- [x] C3 Darstellung ohne JavaScript (`exercises.ts`) und im Browser (`language-task.ts`, `explainer.ts`): Felder,
      Lücken, Auswahl, Tabelle, Sonderzeichen-Leiste, `lang`-Auszeichnung, Prüfen/Lösung/Hinweis; CSS; Meldungen de/en
- [x] C4 Tutor (`tutor.ts`, `tutorpage.ts`), Gliederung (`outline.ts`), Ergebniszeile (`result.ts`),
      Selbsteinschätzung (`assessment-*.ts`), e2e-Helfer (`e2e.ts`)
- [x] C5 Beispiel `explainer/examples/franzoesisch/` (KD-11), CI-Job, README, arc42-Entscheidung `dec-language-task`,
      Glossar
- [x] C6 (umgesetzt in lernapps/apps, Branch claude/pensive-cray-nb2mwh, eigener Plan dort; ohne Auswahl je Baustein, KD-09 dort) lernapps/apps: Schema `vocabulary.v1`, `map/franzoesisch/vocabulary.yaml` (Bausteine 5-6), Seite/JSON,
      Prüfung im Katalog-Build
- [ ] C7 `vp check`, `vp test run`, `check:vue`, `lernapps check --pre-push` am Beispiel und an den Fixtures

### Completed

*None yet*

## Commit

### Completed

- [x] Aufräumen geprüft: keine Debug-Ausgaben, keine TODO/FIXME (die Ausgabe eines Skripts ist gewollt)
- [x] Doku aktuell (README, arc42, Vertrag bzw. Skills)
- [x] Owner (2026-11-08): das französische Beispiel wurde nicht veröffentlicht; jetzt baut die Vorschau es als
      `explainer-franzoesisch/` und verlinkt es auf der Übersichtsseite (auch auf main)
- [x] Pull Request angelegt (Owner, 2026-11-08); Zusammenfassen beim Merge mit „Squash and merge“ (Force-Push war in
      der Session nicht erlaubt)

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
