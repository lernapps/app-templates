// The questions of a lernapps app, for every archetype that has them (@lernapps/app-templates/questions), at build
// time and in Node: the six types of question and their checker, the schema of a question for a `$ref` from another
// schema, the validation of one question, the rendering of its controls and of its solution without JavaScript, and
// the messages. In the browser, startQuestion (@lernapps/app-templates/questions/engine) makes a rendered question
// live; the end-to-end helpers are in @lernapps/app-templates/questions/e2e. A page embeds a question as
//
//   renderQuestion(question) +
//   `<details><summary>${messages.solution}</summary>${renderSolution(question)}</details>`
//
// and fails its build when validateQuestion(question, "<where it is>") finds problems. A page in several languages
// writes each learner text of a question as a map, { de: …, en: … }: validateQuestion(question, at, languages) checks
// that each declared language is there (German always), questionIn(question, lang) gives the question in the page's
// language for the checker, and renderQuestion and renderSolution take the page's `lang` for their own texts.
import de from "./messages/de.json" with { type: "json" };

export * from "./question.ts";
export {
  answerText,
  QUESTION_MESSAGES,
  questionMessagesIn,
  renderQuestion,
  renderSolution,
  type QuestionMessages,
  type RenderQuestionOptions,
  type RenderSolutionOptions,
} from "./render.ts";
export {
  QUESTION_REF,
  QUESTION_SCHEMA_ID,
  questionDetails,
  questionSchema,
  questionSchemas,
  questionSchemaProblems,
  validateQuestion,
  type QuestionProblem,
} from "./validate.ts";

/** The texts of a question for learners in German, by their key (messages/de.json); questionMessagesIn(lang) for another. */
export const messages = de;
