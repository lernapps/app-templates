// A page of another archetype, as the explainer will be: it embeds one question of each type of the quiz
// (src/questions.json) as an exercise, through the per-question exports of the quiz runtime only. The build
// validates each question and fails with the quiz's messages at the question's path; it renders each one's controls
// and, in a <details>, its solution, so the page reads without JavaScript. src/main.ts makes each question live.
import { readFileSync } from "node:fs";
import { lernapps } from "@lernapps/tooling/preset";
import {
  messages,
  renderQuestion,
  renderSolution,
  validateQuestion,
  type Question,
} from "@lernapps/app-templates/quiz/question";
import type { Plugin } from "vite-plus";

const FILE = "src/questions.json";

function questions(): Question[] {
  const value: unknown = JSON.parse(readFileSync(FILE, "utf8"));
  const list: unknown[] = Array.isArray(value) ? value : [];
  const found = list.flatMap((question, index) => validateQuestion(question, `${FILE}[${index}]`));
  if (found.length > 0)
    throw new Error([`${FILE} is not valid:`, ...found.map((problem) => `  - ${problem}`)].join("\n"));
  return list as Question[];
}

function exercise(question: Question, index: number): string {
  return [
    `<section class="aufgabe" aria-labelledby="aufgabe-${index + 1}">`,
    `<h2 id="aufgabe-${index + 1}">Aufgabe ${index + 1}</h2>`,
    renderQuestion(question),
    `<details class="loesung"><summary>${messages.solution}</summary>`,
    renderSolution(question),
    `</details>`,
    `</section>`,
  ].join("\n");
}

const page: Plugin = {
  name: "question-page",
  transformIndexHtml(html) {
    const all = questions();
    const json = JSON.stringify(all).replace(/</g, "\\u003c");
    const body = [
      `<main class="quiz" id="aufgaben">`,
      `<h1>Naturwunder: sechs Aufgaben</h1>`,
      `<p>Zu jedem Naturwunder eine Aufgabe, von jeder Art eine. Unter jeder Aufgabe steht ihre Lösung.</p>`,
      ...all.map(exercise),
      `</main>`,
      `<script type="application/json" id="questions-data">${json}</script>`,
    ].join("\n");
    return html.replace("<!-- questions -->", () => body);
  },
};

export default lernapps({ plugins: [page] });
