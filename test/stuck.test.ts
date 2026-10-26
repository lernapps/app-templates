// "Hilfe" (stuck.ts, way B to the tutor): without a chat yet (B1) the button opens an assistant with one sentence that
// names the page's tutor page and the task, and the learner's lines; on a page a tutor opened (von=tutor, B2) it copies
// the lines alone, the task first and the tutor page last. The lines say the learner's input with the tries, the app's
// message word for word and the hint or solution opened, all in the learner's voice: the tutor page has the guide.
import { describe, expect, test } from "vite-plus/test";
import { Progress } from "../runtime/explainer/result.ts";
import { answeredMessage, stuckLines, stuckPrompt } from "../runtime/explainer/stuck.ts";

const TASK = "Übung prozentwert-ueben, Nr. 27:";
const CHAPTER =
  "https://lernapps.net/mathe-karte/prozent/prozentwert/tutor/?prozentwert-ueben=27&uebung=prozentwert-ueben";
const STUCK = { exercise: "prozentwert-ueben", number: 27, tutor: CHAPTER };
const MESSAGE = "Das ist der neue Preis, nicht der Rabatt. Gefragt ist, wie viel du sparst.";

/** The lines of task 27 of prozentwert-ueben after `steps` on the progress. */
function lines(steps: (progress: Progress) => void, lang = "de"): string {
  const progress = new Progress();
  steps(progress);
  return stuckLines({ ...STUCK, state: progress.state("prozentwert-ueben", 27) }, lang);
}

describe("the lines of „Hilfe“", () => {
  test("B1: the tutor page and the task, the input with the tries, the app's message word for word", () => {
    const progress = new Progress();
    progress.answered("prozentwert-ueben", 27, false, "1000", "Rechne noch einmal nach.");
    progress.answered("prozentwert-ueben", 27, false, "1071", MESSAGE);
    expect(stuckPrompt({ ...STUCK, state: progress.state("prozentwert-ueben", 27) }, "de")).toBe(
      [
        `Lade ${CHAPTER} und hilf mir bei Übung prozentwert-ueben, Nr. 27. Ich komme nicht weiter.`,
        "Ich habe 1071 eingegeben (2 Versuche).",
        `Die App sagt: „${MESSAGE}“`,
      ].join("\n"),
    );
  });

  test("B1 before the first input: the sentence alone; an exercise without numbers", () => {
    const progress = new Progress();
    expect(stuckPrompt({ ...STUCK, state: progress.state("prozentwert-ueben", 27) }, "de")).toBe(
      `Lade ${CHAPTER} und hilf mir bei Übung prozentwert-ueben, Nr. 27. Ich komme nicht weiter.`,
    );
    expect(stuckPrompt({ exercise: "frage", tutor: CHAPTER, state: progress.state("frage", undefined) }, "de")).toBe(
      `Lade ${CHAPTER} und hilf mir bei Übung frage. Ich komme nicht weiter.`,
    );
  });

  test("B2: the task, the lines and the tutor page", () => {
    expect(lines((progress) => progress.answered("prozentwert-ueben", 27, false, "1071", MESSAGE))).toBe(
      [TASK, "Ich habe 1071 eingegeben (1 Versuch).", `Die App sagt: „${MESSAGE}“`, `Tutor-Seite: ${CHAPTER}`].join(
        "\n",
      ),
    );
    expect(lines(() => undefined)).toBe([TASK, `Tutor-Seite: ${CHAPTER}`].join("\n"));
  });

  test("an answer without a message or without an input: only what is known", () => {
    // an exercise component that sends no message: no line "Die App sagt"
    expect(lines((progress) => progress.answered("prozentwert-ueben", 27, false, "1071"))).toBe(
      [TASK, "Ich habe 1071 eingegeben (1 Versuch).", `Tutor-Seite: ${CHAPTER}`].join("\n"),
    );
    // nor an input: the tries alone
    expect(lines((progress) => progress.answered("prozentwert-ueben", 27, false))).toBe(
      [TASK, "Bisher 1 Versuch.", `Tutor-Seite: ${CHAPTER}`].join("\n"),
    );
    // the message belongs to the last input: a later answer without one drops it
    expect(
      lines((progress) => {
        progress.answered("prozentwert-ueben", 27, false, "1071", MESSAGE);
        progress.answered("prozentwert-ueben", 27, false, "1000");
      }),
    ).not.toContain("Die App sagt");
  });

  test("the hint and the solution opened; a task already right", () => {
    expect(
      lines((progress) => {
        progress.hinted("prozentwert-ueben", 27);
        progress.answered("prozentwert-ueben", 27, false, "1071", MESSAGE);
        progress.revealed("prozentwert-ueben", 27);
      }),
    ).toBe(
      [
        TASK,
        "Ich habe 1071 eingegeben (1 Versuch).",
        `Die App sagt: „${MESSAGE}“`,
        "Ich habe den Tipp geöffnet.",
        "Ich habe mir die Lösung angesehen.",
        `Tutor-Seite: ${CHAPTER}`,
      ].join("\n"),
    );
    expect(
      lines((progress) => {
        progress.answered("prozentwert-ueben", 27, false, "1071", MESSAGE);
        progress.answered("prozentwert-ueben", 27, true, "129");
      }),
    ).toBe([TASK, "Ich habe sie im 2. Versuch richtig gelöst.", `Tutor-Seite: ${CHAPTER}`].join("\n"));
  });

  test("in English", () => {
    const progress = new Progress();
    progress.answered("prozentwert-ueben", 27, false, "1071", "That is the new price.");
    expect(stuckPrompt({ ...STUCK, state: progress.state("prozentwert-ueben", 27) }, "en")).toBe(
      [
        `Load ${CHAPTER} and help me with exercise prozentwert-ueben, no. 27. I am stuck.`,
        "I entered 1071 (1 try).",
        "The app says: “That is the new price.”",
      ].join("\n"),
    );
  });
});

describe("the app's message of an exercise component", () => {
  test("its message word for word, else its reason, else none", () => {
    expect(answeredMessage({ message: " Das ist der neue Preis. ", reason: "Falsch." })).toBe(
      "Das ist der neue Preis.",
    );
    expect(answeredMessage({ reason: "Eine Beschriftung zweimal gewählt." })).toBe(
      "Eine Beschriftung zweimal gewählt.",
    );
    expect(answeredMessage({ message: "  ", reason: "Grund" })).toBe("Grund");
    expect(answeredMessage({ reason: 3 })).toBeUndefined();
    expect(answeredMessage({})).toBeUndefined();
  });
});
