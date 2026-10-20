// One question of the quiz, for another archetype that embeds the quiz's questions as exercises
// (@lernapps/app-templates/quiz/question). The questions are not the quiz's: their types, checker, schema, validation,
// rendering, engine and messages are in shared/questions (@lernapps/app-templates/questions), which the quiz and the
// explainer build on alike. This module is the path an app or another archetype already imports, and passes them on
// with the quiz's own, so that it keeps working; new code imports @lernapps/app-templates/questions. A page embeds
// a question as
//
//   renderQuestion(question) +
//   `<details><summary>${messages.solution}</summary>${renderSolution(question)}</details>`
//
// and fails its build when validateQuestion(question, "<where it is>") finds problems.
import { QUIZ_MESSAGES } from "./render.ts";

export * from "./quiz.ts";
export {
  answerText,
  messagesIn,
  QUIZ_MESSAGES,
  renderQuestion,
  renderSolution,
  type QuizMessages,
  type RenderQuestionOptions,
  type RenderSolutionOptions,
} from "./render.ts";
export {
  QUESTION_SCHEMA_URL,
  questionDetails,
  questionSchemaProblems,
  quizSchema,
  RULE_URL,
  SCHEMA_URL,
  validateQuestion,
  type QuestionProblem,
} from "./validate.ts";

/** The quiz's texts for learners in German, by their key; messagesIn(lang) for another language. */
export const messages = QUIZ_MESSAGES["de"]!;
