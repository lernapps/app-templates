# Grundwert – Tutor-Datei

> Den Grundwert berechnen: G = W · 100 : p, mit einem Beispiel und dem Hunderterfeld.

App: Prozentrechnung. Seite: [Grundwert](./)

Diese Datei ist für einen KI-Tutor. Sie enthält die Lösungen: Nutze sie, um anzuleiten und Fehler zu erkennen, nicht um vorzusagen. Die Regeln stehen in llms.txt. Kannst du eine Datei der App nicht abrufen, bitte die lernende Person, den Text der Seite oder diese Datei einzufügen oder anzuhängen.

## Abschnitte

### Warum ([./#warum](./#warum))

„Du sparst 30 €, das sind 12 % Rabatt“: Wie teuer war die Sache vorher? Hier ist das Ganze unbekannt, und
genau das verwirrt viele. Wer den Grundwert sicher zurückrechnen kann, löst auch die kniffligen Aufgaben, bei
denen nur der Teil bekannt ist.

### Regel ([./#regel](./#regel))

$G = \frac{W \cdot 100}{p}$

- **Grundwert**: Der Grundwert $G$ ist das Ganze, also 100 %.

Du kennst den **Prozentwert** $W$ (den Teil) und den **Prozentsatz** $p\,\%$. Über 1 % kommst du zum
Ganzen: $W$ geteilt durch $p$ ist 1 %, mal 100 ist das Ganze.

**Merke: Achtung**

Der Grundwert ist bei $p$ unter 100 % immer größer als der Prozentwert. Kommt etwas Kleineres heraus,
hast du die Formel für den Prozentwert benutzt.

### Beispiel ([./#beispiel](./#beispiel))

**Beispiel: Der Preis eines Rollers**

Beim Kauf eines Rollers sparst du 30 €. Das sind 12 % Rabatt. Wie viel hat der Roller vorher gekostet?

Der Grundwert beim Roller:
- Prozentwert $W$ | 30 € (der Teil, der bekannt ist)
- Prozentsatz $p$ | 12 %
- Rechnung | $G = 30 \cdot 100 : 12 = 250$
- Grundwert $G$ | **250 €** war der alte Preis

Bild: Ein Hunderterfeld mit 100 Kästchen, 12 davon sind gefärbt. Bildunterschrift: Die 12 gefärbten Kästchen sind der bekannte Teil, 30 €. Alle 100 Kästchen stehen für den Grundwert, 250 €.

Über 1 %: 30 € : 12 = 2,50 € sind 1 %. Dann 2,50 € · 100 = 250 €.

### Übung ([./#uebung](./#uebung))

- Übung `grundwert-ueben` (unten)

## Übungen

### grundwert-ueben (generated, number)

- Link: [./#grundwert-ueben](./#grundwert-ueben), im Abschnitt „Übung“
- Antwortformat: eine Zahl eintippen (€)
- Tipp, den die App zeigt (Vorlage: {{…}} sind die Werte der Aufgabe): Gesucht ist das Ganze, 100 %. Rechne erst aus, was 1 % ist: {{W}} € geteilt durch {{p}}. Dann mal 100.
- Lösungsweg (Vorlage: {{…}} sind die Werte der Aufgabe):
  - $G = \frac{W \cdot 100}{p}$
  - $G = \frac{{{W}} \cdot 100}{{{p}}} = {{answer}}$, also {{answer}} €.
- Aufgaben nach Nummer, 1 bis 67: jede eine andere (die App zeigt „Aufgabe Nr. …“):
  - [Aufgabe Nr. 1](./?grundwert-ueben=1#grundwert-ueben): Beim Kauf eines Rollers sparst du 15 €. Das sind 12 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 125 €
    - ✗ 1,8: Du hast 12 % von 15 € berechnet. Gesucht ist aber das Ganze, von dem die 15 € ein Teil sind.
    - ✗ 1,25: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 2](./?grundwert-ueben=2#grundwert-ueben): Beim Kauf eines Rollers sparst du 102 €. Das sind 25 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 408 €
    - ✗ 25,5: Du hast 25 % von 102 € berechnet. Gesucht ist aber das Ganze, von dem die 102 € ein Teil sind.
    - ✗ 4,08: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 3](./?grundwert-ueben=3#grundwert-ueben): Beim Kauf eines Rollers sparst du 46 €. Das sind 40 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 115 €
    - ✗ 18,4: Du hast 40 % von 46 € berechnet. Gesucht ist aber das Ganze, von dem die 46 € ein Teil sind.
    - ✗ 1,15: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 4](./?grundwert-ueben=4#grundwert-ueben): Beim Kauf eines Rollers sparst du 78 €. Das sind 25 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 312 €
    - ✗ 19,5: Du hast 25 % von 78 € berechnet. Gesucht ist aber das Ganze, von dem die 78 € ein Teil sind.
    - ✗ 3,12: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 5](./?grundwert-ueben=5#grundwert-ueben): Beim Kauf eines Rollers sparst du 67 €. Das sind 20 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 335 €
    - ✗ 13,4: Du hast 20 % von 67 € berechnet. Gesucht ist aber das Ganze, von dem die 67 € ein Teil sind.
    - ✗ 3,35: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 6](./?grundwert-ueben=6#grundwert-ueben): Beim Kauf eines Rollers sparst du 51 €. Das sind 50 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 102 €
    - ✗ 25,5: Du hast 50 % von 51 € berechnet. Gesucht ist aber das Ganze, von dem die 51 € ein Teil sind.
    - ✗ 1,02: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 7](./?grundwert-ueben=7#grundwert-ueben): Beim Kauf eines Rollers sparst du 35 €. Das sind 20 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 175 €
    - ✗ 7: Du hast 20 % von 35 € berechnet. Gesucht ist aber das Ganze, von dem die 35 € ein Teil sind.
    - ✗ 1,75: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 8](./?grundwert-ueben=8#grundwert-ueben): Beim Kauf eines Rollers sparst du 50 €. Das sind 50 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 100 €
    - ✗ 25: Du hast 50 % von 50 € berechnet. Gesucht ist aber das Ganze, von dem die 50 € ein Teil sind.
    - ✗ 1: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 9](./?grundwert-ueben=9#grundwert-ueben): Beim Kauf eines Rollers sparst du 70 €. Das sind 50 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 140 €
    - ✗ 35: Du hast 50 % von 70 € berechnet. Gesucht ist aber das Ganze, von dem die 70 € ein Teil sind.
    - ✗ 1,4: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 10](./?grundwert-ueben=10#grundwert-ueben): Beim Kauf eines Rollers sparst du 77 €. Das sind 20 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 385 €
    - ✗ 15,4: Du hast 20 % von 77 € berechnet. Gesucht ist aber das Ganze, von dem die 77 € ein Teil sind.
    - ✗ 3,85: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 11](./?grundwert-ueben=11#grundwert-ueben): Beim Kauf eines Rollers sparst du 86 €. Das sind 40 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 215 €
    - ✗ 34,4: Du hast 40 % von 86 € berechnet. Gesucht ist aber das Ganze, von dem die 86 € ein Teil sind.
    - ✗ 2,15: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 12](./?grundwert-ueben=12#grundwert-ueben): Beim Kauf eines Rollers sparst du 34 €. Das sind 50 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 68 €
    - ✗ 17: Du hast 50 % von 34 € berechnet. Gesucht ist aber das Ganze, von dem die 34 € ein Teil sind.
    - ✗ 0,68: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 13](./?grundwert-ueben=13#grundwert-ueben): Beim Kauf eines Rollers sparst du 45 €. Das sind 20 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 225 €
    - ✗ 9: Du hast 20 % von 45 € berechnet. Gesucht ist aber das Ganze, von dem die 45 € ein Teil sind.
    - ✗ 2,25: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 14](./?grundwert-ueben=14#grundwert-ueben): Beim Kauf eines Rollers sparst du 126 €. Das sind 30 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 420 €
    - ✗ 37,8: Du hast 30 % von 126 € berechnet. Gesucht ist aber das Ganze, von dem die 126 € ein Teil sind.
    - ✗ 4,2: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 15](./?grundwert-ueben=15#grundwert-ueben): Beim Kauf eines Rollers sparst du 98 €. Das sind 40 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 245 €
    - ✗ 39,2: Du hast 40 % von 98 € berechnet. Gesucht ist aber das Ganze, von dem die 98 € ein Teil sind.
    - ✗ 2,45: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 16](./?grundwert-ueben=16#grundwert-ueben): Beim Kauf eines Rollers sparst du 6 €. Das sind 5 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 120 €
    - ✗ 0,3: Du hast 5 % von 6 € berechnet. Gesucht ist aber das Ganze, von dem die 6 € ein Teil sind.
    - ✗ 1,2: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 17](./?grundwert-ueben=17#grundwert-ueben): Beim Kauf eines Rollers sparst du 41 €. Das sind 10 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 410 €
    - ✗ 4,1: Du hast 10 % von 41 € berechnet. Gesucht ist aber das Ganze, von dem die 41 € ein Teil sind.
    - ✗ 4,1: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 18](./?grundwert-ueben=18#grundwert-ueben): Beim Kauf eines Rollers sparst du 119 €. Das sind 50 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 238 €
    - ✗ 59,5: Du hast 50 % von 119 € berechnet. Gesucht ist aber das Ganze, von dem die 119 € ein Teil sind.
    - ✗ 2,38: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 19](./?grundwert-ueben=19#grundwert-ueben): Beim Kauf eines Rollers sparst du 39 €. Das sind 12 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 325 €
    - ✗ 4,68: Du hast 12 % von 39 € berechnet. Gesucht ist aber das Ganze, von dem die 39 € ein Teil sind.
    - ✗ 3,25: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 20](./?grundwert-ueben=20#grundwert-ueben): Beim Kauf eines Rollers sparst du 128 €. Das sind 40 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 320 €
    - ✗ 51,2: Du hast 40 % von 128 € berechnet. Gesucht ist aber das Ganze, von dem die 128 € ein Teil sind.
    - ✗ 3,2: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 21](./?grundwert-ueben=21#grundwert-ueben): Beim Kauf eines Rollers sparst du 58 €. Das sind 25 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 232 €
    - ✗ 14,5: Du hast 25 % von 58 € berechnet. Gesucht ist aber das Ganze, von dem die 58 € ein Teil sind.
    - ✗ 2,32: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 22](./?grundwert-ueben=22#grundwert-ueben): Beim Kauf eines Rollers sparst du 80 €. Das sind 25 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 320 €
    - ✗ 20: Du hast 25 % von 80 € berechnet. Gesucht ist aber das Ganze, von dem die 80 € ein Teil sind.
    - ✗ 3,2: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 23](./?grundwert-ueben=23#grundwert-ueben): Beim Kauf eines Rollers sparst du 83 €. Das sind 50 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 166 €
    - ✗ 41,5: Du hast 50 % von 83 € berechnet. Gesucht ist aber das Ganze, von dem die 83 € ein Teil sind.
    - ✗ 1,66: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 24](./?grundwert-ueben=24#grundwert-ueben): Beim Kauf eines Rollers sparst du 73 €. Das sind 50 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 146 €
    - ✗ 36,5: Du hast 50 % von 73 € berechnet. Gesucht ist aber das Ganze, von dem die 73 € ein Teil sind.
    - ✗ 1,46: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 25](./?grundwert-ueben=25#grundwert-ueben): Beim Kauf eines Rollers sparst du 24 €. Das sind 20 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 120 €
    - ✗ 4,8: Du hast 20 % von 24 € berechnet. Gesucht ist aber das Ganze, von dem die 24 € ein Teil sind.
    - ✗ 1,2: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 26](./?grundwert-ueben=26#grundwert-ueben): Beim Kauf eines Rollers sparst du 74 €. Das sind 50 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 148 €
    - ✗ 37: Du hast 50 % von 74 € berechnet. Gesucht ist aber das Ganze, von dem die 74 € ein Teil sind.
    - ✗ 1,48: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 27](./?grundwert-ueben=27#grundwert-ueben): Beim Kauf eines Rollers sparst du 54 €. Das sind 50 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 108 €
    - ✗ 27: Du hast 50 % von 54 € berechnet. Gesucht ist aber das Ganze, von dem die 54 € ein Teil sind.
    - ✗ 1,08: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 28](./?grundwert-ueben=28#grundwert-ueben): Beim Kauf eines Rollers sparst du 98 €. Das sind 50 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 196 €
    - ✗ 49: Du hast 50 % von 98 € berechnet. Gesucht ist aber das Ganze, von dem die 98 € ein Teil sind.
    - ✗ 1,96: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 29](./?grundwert-ueben=29#grundwert-ueben): Beim Kauf eines Rollers sparst du 21 €. Das sind 5 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 420 €
    - ✗ 1,05: Du hast 5 % von 21 € berechnet. Gesucht ist aber das Ganze, von dem die 21 € ein Teil sind.
    - ✗ 4,2: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 30](./?grundwert-ueben=30#grundwert-ueben): Beim Kauf eines Rollers sparst du 96 €. Das sind 30 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 320 €
    - ✗ 28,8: Du hast 30 % von 96 € berechnet. Gesucht ist aber das Ganze, von dem die 96 € ein Teil sind.
    - ✗ 3,2: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 31](./?grundwert-ueben=31#grundwert-ueben): Beim Kauf eines Rollers sparst du 32 €. Das sind 40 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 80 €
    - ✗ 12,8: Du hast 40 % von 32 € berechnet. Gesucht ist aber das Ganze, von dem die 32 € ein Teil sind.
    - ✗ 0,8: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 32](./?grundwert-ueben=32#grundwert-ueben): Beim Kauf eines Rollers sparst du 145 €. Das sind 50 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 290 €
    - ✗ 72,5: Du hast 50 % von 145 € berechnet. Gesucht ist aber das Ganze, von dem die 145 € ein Teil sind.
    - ✗ 2,9: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 33](./?grundwert-ueben=33#grundwert-ueben): Beim Kauf eines Rollers sparst du 39 €. Das sind 20 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 195 €
    - ✗ 7,8: Du hast 20 % von 39 € berechnet. Gesucht ist aber das Ganze, von dem die 39 € ein Teil sind.
    - ✗ 1,95: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 34](./?grundwert-ueben=34#grundwert-ueben): Beim Kauf eines Rollers sparst du 27 €. Das sind 10 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 270 €
    - ✗ 2,7: Du hast 10 % von 27 € berechnet. Gesucht ist aber das Ganze, von dem die 27 € ein Teil sind.
    - ✗ 2,7: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 35](./?grundwert-ueben=35#grundwert-ueben): Beim Kauf eines Rollers sparst du 82 €. Das sind 20 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 410 €
    - ✗ 16,4: Du hast 20 % von 82 € berechnet. Gesucht ist aber das Ganze, von dem die 82 € ein Teil sind.
    - ✗ 4,1: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 36](./?grundwert-ueben=36#grundwert-ueben): Beim Kauf eines Rollers sparst du 38 €. Das sind 40 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 95 €
    - ✗ 15,2: Du hast 40 % von 38 € berechnet. Gesucht ist aber das Ganze, von dem die 38 € ein Teil sind.
    - ✗ 0,95: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 37](./?grundwert-ueben=37#grundwert-ueben): Beim Kauf eines Rollers sparst du 132 €. Das sind 50 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 264 €
    - ✗ 66: Du hast 50 % von 132 € berechnet. Gesucht ist aber das Ganze, von dem die 132 € ein Teil sind.
    - ✗ 2,64: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 38](./?grundwert-ueben=38#grundwert-ueben): Beim Kauf eines Rollers sparst du 60 €. Das sind 12 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 500 €
    - ✗ 7,2: Du hast 12 % von 60 € berechnet. Gesucht ist aber das Ganze, von dem die 60 € ein Teil sind.
    - ✗ 5: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 39](./?grundwert-ueben=39#grundwert-ueben): Beim Kauf eines Rollers sparst du 90 €. Das sind 40 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 225 €
    - ✗ 36: Du hast 40 % von 90 € berechnet. Gesucht ist aber das Ganze, von dem die 90 € ein Teil sind.
    - ✗ 2,25: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 40](./?grundwert-ueben=40#grundwert-ueben): Beim Kauf eines Rollers sparst du 47 €. Das sind 25 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 188 €
    - ✗ 11,75: Du hast 25 % von 47 € berechnet. Gesucht ist aber das Ganze, von dem die 47 € ein Teil sind.
    - ✗ 1,88: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 41](./?grundwert-ueben=41#grundwert-ueben): Beim Kauf eines Rollers sparst du 30 €. Das sind 40 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 75 €
    - ✗ 12: Du hast 40 % von 30 € berechnet. Gesucht ist aber das Ganze, von dem die 30 € ein Teil sind.
    - ✗ 0,75: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 42](./?grundwert-ueben=42#grundwert-ueben): Beim Kauf eines Rollers sparst du 129 €. Das sind 50 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 258 €
    - ✗ 64,5: Du hast 50 % von 129 € berechnet. Gesucht ist aber das Ganze, von dem die 129 € ein Teil sind.
    - ✗ 2,58: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 43](./?grundwert-ueben=43#grundwert-ueben): Beim Kauf eines Rollers sparst du 31 €. Das sind 20 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 155 €
    - ✗ 6,2: Du hast 20 % von 31 € berechnet. Gesucht ist aber das Ganze, von dem die 31 € ein Teil sind.
    - ✗ 1,55: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 44](./?grundwert-ueben=44#grundwert-ueben): Beim Kauf eines Rollers sparst du 63 €. Das sind 15 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 420 €
    - ✗ 9,45: Du hast 15 % von 63 € berechnet. Gesucht ist aber das Ganze, von dem die 63 € ein Teil sind.
    - ✗ 4,2: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 45](./?grundwert-ueben=45#grundwert-ueben): Beim Kauf eines Rollers sparst du 54 €. Das sind 20 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 270 €
    - ✗ 10,8: Du hast 20 % von 54 € berechnet. Gesucht ist aber das Ganze, von dem die 54 € ein Teil sind.
    - ✗ 2,7: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 46](./?grundwert-ueben=46#grundwert-ueben): Beim Kauf eines Rollers sparst du 15 €. Das sind 25 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 60 €
    - ✗ 3,75: Du hast 25 % von 15 € berechnet. Gesucht ist aber das Ganze, von dem die 15 € ein Teil sind.
    - ✗ 0,6: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 47](./?grundwert-ueben=47#grundwert-ueben): Beim Kauf eines Rollers sparst du 130 €. Das sind 50 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 260 €
    - ✗ 65: Du hast 50 % von 130 € berechnet. Gesucht ist aber das Ganze, von dem die 130 € ein Teil sind.
    - ✗ 2,6: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 48](./?grundwert-ueben=48#grundwert-ueben): Beim Kauf eines Rollers sparst du 138 €. Das sind 50 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 276 €
    - ✗ 69: Du hast 50 % von 138 € berechnet. Gesucht ist aber das Ganze, von dem die 138 € ein Teil sind.
    - ✗ 2,76: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 49](./?grundwert-ueben=49#grundwert-ueben): Beim Kauf eines Rollers sparst du 104 €. Das sind 40 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 260 €
    - ✗ 41,6: Du hast 40 % von 104 € berechnet. Gesucht ist aber das Ganze, von dem die 104 € ein Teil sind.
    - ✗ 2,6: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 50](./?grundwert-ueben=50#grundwert-ueben): Beim Kauf eines Rollers sparst du 123 €. Das sind 25 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 492 €
    - ✗ 30,75: Du hast 25 % von 123 € berechnet. Gesucht ist aber das Ganze, von dem die 123 € ein Teil sind.
    - ✗ 4,92: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 51](./?grundwert-ueben=51#grundwert-ueben): Beim Kauf eines Rollers sparst du 66 €. Das sind 40 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 165 €
    - ✗ 26,4: Du hast 40 % von 66 € berechnet. Gesucht ist aber das Ganze, von dem die 66 € ein Teil sind.
    - ✗ 1,65: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 52](./?grundwert-ueben=52#grundwert-ueben): Beim Kauf eines Rollers sparst du 143 €. Das sind 50 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 286 €
    - ✗ 71,5: Du hast 50 % von 143 € berechnet. Gesucht ist aber das Ganze, von dem die 143 € ein Teil sind.
    - ✗ 2,86: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 53](./?grundwert-ueben=53#grundwert-ueben): Beim Kauf eines Rollers sparst du 103 €. Das sind 50 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 206 €
    - ✗ 51,5: Du hast 50 % von 103 € berechnet. Gesucht ist aber das Ganze, von dem die 103 € ein Teil sind.
    - ✗ 2,06: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 54](./?grundwert-ueben=54#grundwert-ueben): Beim Kauf eines Rollers sparst du 82 €. Das sind 25 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 328 €
    - ✗ 20,5: Du hast 25 % von 82 € berechnet. Gesucht ist aber das Ganze, von dem die 82 € ein Teil sind.
    - ✗ 3,28: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 55](./?grundwert-ueben=55#grundwert-ueben): Beim Kauf eines Rollers sparst du 90 €. Das sind 20 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 450 €
    - ✗ 18: Du hast 20 % von 90 € berechnet. Gesucht ist aber das Ganze, von dem die 90 € ein Teil sind.
    - ✗ 4,5: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 56](./?grundwert-ueben=56#grundwert-ueben): Beim Kauf eines Rollers sparst du 84 €. Das sind 40 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 210 €
    - ✗ 33,6: Du hast 40 % von 84 € berechnet. Gesucht ist aber das Ganze, von dem die 84 € ein Teil sind.
    - ✗ 2,1: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 57](./?grundwert-ueben=57#grundwert-ueben): Beim Kauf eines Rollers sparst du 60 €. Das sind 50 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 120 €
    - ✗ 30: Du hast 50 % von 60 € berechnet. Gesucht ist aber das Ganze, von dem die 60 € ein Teil sind.
    - ✗ 1,2: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 58](./?grundwert-ueben=58#grundwert-ueben): Beim Kauf eines Rollers sparst du 111 €. Das sind 30 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 370 €
    - ✗ 33,3: Du hast 30 % von 111 € berechnet. Gesucht ist aber das Ganze, von dem die 111 € ein Teil sind.
    - ✗ 3,7: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 59](./?grundwert-ueben=59#grundwert-ueben): Beim Kauf eines Rollers sparst du 85 €. Das sind 20 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 425 €
    - ✗ 17: Du hast 20 % von 85 € berechnet. Gesucht ist aber das Ganze, von dem die 85 € ein Teil sind.
    - ✗ 4,25: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 60](./?grundwert-ueben=60#grundwert-ueben): Beim Kauf eines Rollers sparst du 54 €. Das sind 12 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 450 €
    - ✗ 6,48: Du hast 12 % von 54 € berechnet. Gesucht ist aber das Ganze, von dem die 54 € ein Teil sind.
    - ✗ 4,5: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 61](./?grundwert-ueben=61#grundwert-ueben): Beim Kauf eines Rollers sparst du 134 €. Das sind 50 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 268 €
    - ✗ 67: Du hast 50 % von 134 € berechnet. Gesucht ist aber das Ganze, von dem die 134 € ein Teil sind.
    - ✗ 2,68: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 62](./?grundwert-ueben=62#grundwert-ueben): Beim Kauf eines Rollers sparst du 20 €. Das sind 10 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 200 €
    - ✗ 2: Du hast 10 % von 20 € berechnet. Gesucht ist aber das Ganze, von dem die 20 € ein Teil sind.
    - ✗ 2: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 63](./?grundwert-ueben=63#grundwert-ueben): Beim Kauf eines Rollers sparst du 113 €. Das sind 50 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 226 €
    - ✗ 56,5: Du hast 50 % von 113 € berechnet. Gesucht ist aber das Ganze, von dem die 113 € ein Teil sind.
    - ✗ 2,26: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 64](./?grundwert-ueben=64#grundwert-ueben): Beim Kauf eines Rollers sparst du 81 €. Das sind 20 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 405 €
    - ✗ 16,2: Du hast 20 % von 81 € berechnet. Gesucht ist aber das Ganze, von dem die 81 € ein Teil sind.
    - ✗ 4,05: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 65](./?grundwert-ueben=65#grundwert-ueben): Beim Kauf eines Rollers sparst du 72 €. Das sind 50 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 144 €
    - ✗ 36: Du hast 50 % von 72 € berechnet. Gesucht ist aber das Ganze, von dem die 72 € ein Teil sind.
    - ✗ 1,44: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 66](./?grundwert-ueben=66#grundwert-ueben): Beim Kauf eines Rollers sparst du 87 €. Das sind 25 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 348 €
    - ✗ 21,75: Du hast 25 % von 87 € berechnet. Gesucht ist aber das Ganze, von dem die 87 € ein Teil sind.
    - ✗ 3,48: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
  - [Aufgabe Nr. 67](./?grundwert-ueben=67#grundwert-ueben): Beim Kauf eines Rollers sparst du 104 €. Das sind 50 % Rabatt. Wie viel hat der Roller vorher gekostet? → Lösung: 208 €
    - ✗ 52: Du hast 50 % von 104 € berechnet. Gesucht ist aber das Ganze, von dem die 104 € ein Teil sind.
    - ✗ 2,08: Das ist erst 1 %. Nimm es noch mal 100, dann hast du das Ganze.
