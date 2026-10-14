// One question of the quiz, for another archetype that embeds the quiz's questions as exercises
// (@lernapps/app-templates/quiz/question), at build time and in Node: the six types of question and their checker,
// the schema of a question for a `$ref` from another schema, the validation of one question with the quiz's
// messages, the rendering of its controls and of its solution without JavaScript, and the messages. The quiz is
// built from the same. In the browser, the engine's startQuestion (@lernapps/app-templates/quiz) makes a rendered
// question live; the end-to-end helpers are in @lernapps/app-templates/quiz/e2e. A page embeds a question as
//
//   renderQuestion(question) +
//   `<details><summary>${messages.solution}</summary>${renderSolution(question)}</details>`
//
// and fails its build when validateQuestion(question, "<where it is>") finds problems.
import de from "./messages/de.json" with { type: "json" };

export * from "./quiz.ts";
export { renderQuestion, renderSolution, type RenderQuestionOptions } from "./render.ts";
export { QUESTION_SCHEMA_URL, quizSchema, RULE_URL, SCHEMA_URL, validateQuestion } from "./validate.ts";

/** The quiz's texts for learners, by their key (messages/de.json). */
export const messages = de;
