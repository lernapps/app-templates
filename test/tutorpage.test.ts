// What the tutor button of a page adds to the prompt: the page's tutor file reduced to the tasks its address names.
import { expect, test } from "vite-plus/test";
import { numbersOf, pageTutorText } from "../runtime/explainer/tutorpage.ts";

const FILE = [
  "# Seite – Tutor-Datei",
  "",
  "Seite: [Seite](./)",
  "",
  "## Übungen",
  "",
  "### rechnen (generated, number)",
  "",
  "- Link: [./#rechnen](./#rechnen)",
  "- Aufgaben nach Nummer, 1 bis 3:",
  "  - [Aufgabe Nr. 1](./?rechnen=1#rechnen): 1 + 1 → Lösung: 2",
  "    - ✗ 11: Zusammengeklebt.",
  "  - [Aufgabe Nr. 2](./?rechnen=2#rechnen): 2 + 2 → Lösung: 4",
  "    - ✗ 22: Zusammengeklebt.",
  "  - [Aufgabe Nr. 3](./?rechnen=3#rechnen): 3 + 3 → Lösung: 6",
  "",
  "### stufen (interaktive Übung Stufen)",
  "",
  "- Aufgaben nach Nummer, 1 bis 2:",
  "  - [Aufgabe Nr. 1](./?stufen=1#stufen): oben → Lösung: A",
  "  - [Aufgabe Nr. 2](./?stufen=2#stufen): unten → Lösung: B",
  "",
  "### frage (single-choice)",
  "",
  "- Aufgabe: Eine Frage?",
  "",
].join("\n");

test("the numbers an address holds, by exercise, also in the old form", () => {
  const page = "https://app.example/k/s/";
  expect([...numbersOf(`${page}?rechnen=2&stufen=1&von=tutor`)]).toEqual([
    ["rechnen", 2],
    ["stufen", 1],
  ]);
  expect([...numbersOf(`${page}?seed=3#rechnen`)]).toEqual([["rechnen", 3]]);
  expect([...numbersOf(page)]).toEqual([]);
});

test("the tutor file keeps, of each seeded exercise, only the task the address names, with its mistakes", () => {
  const text = pageTutorText(FILE, "https://app.example/k/s/?rechnen=2&stufen=1&von=tutor#rechnen");
  expect(text).toContain("[Aufgabe Nr. 2](https://app.example/k/s/?rechnen=2#rechnen): 2 + 2 → Lösung: 4");
  expect(text).toContain("    - ✗ 22: Zusammengeklebt.");
  expect(text).not.toContain("1 + 1");
  expect(text).not.toContain("✗ 11");
  expect(text).not.toContain("3 + 3");
  expect(text).toContain("oben → Lösung: A");
  expect(text).not.toContain("unten");
  // what is no numbered task stays, and the page's relative links become absolute
  expect(text).toContain("- Aufgabe: Eine Frage?");
  expect(text).toContain("Seite: [Seite](https://app.example/k/s/)");
  expect(text).toContain("[./#rechnen](https://app.example/k/s/#rechnen)");
});

test("an exercise the address does not name keeps none of its tasks", () => {
  const text = pageTutorText(FILE, "https://app.example/k/s/?rechnen=1");
  expect(text).toContain("1 + 1");
  expect(text).not.toContain("oben");
  expect(text).not.toContain("unten");
});
