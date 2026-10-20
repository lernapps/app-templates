// The question bank of a quiz about things to know (src/quiz.json, schema quiz.v1.schema.json): the quiz around its
// questions, and the score. The questions themselves, and what counts as a right answer, are in
// ../shared/questions/question.ts; this module passes them on, so that the quiz's own modules and the path
// @lernapps/app-templates/quiz/question keep working. A quiz or page in several languages writes each learner text
// as a map of texts by language, { de: …, en: … } (Quiz<Text>); quizIn gives it in the page's language.
import { inLanguage, type Text } from "../shared/languages.ts";
import { isCorrect, questionIn, type Answer, type Question } from "../shared/questions/question.ts";

export * from "../shared/questions/question.ts";

export interface Quiz<T extends Text = string> {
  /** The quiz's languages, German first; German only when it has none. */
  languages?: string[];
  title: T;
  intro: T;
  rememberLastResult?: boolean;
  questions: Question<T>[];
  /** Where the facts come from. */
  sources?: { title: T; url?: string }[];
}

/** The quiz's languages, German first. */
export const quizLanguages = (quiz: Pick<Quiz<Text>, "languages">): readonly string[] => quiz.languages ?? ["de"];

/** The quiz in `lang`: each text from its map, a plain string as it is; everything else as it is. */
export function quizIn(quiz: Quiz<Text>, lang: string): Quiz {
  const { sources } = quiz;
  // the keys in their order, so a quiz in German only is as it was
  return {
    ...(quiz as Omit<Quiz<Text>, "sources">),
    title: inLanguage(quiz.title, lang),
    intro: inLanguage(quiz.intro, lang),
    questions: quiz.questions.map((question) => questionIn(question, lang)),
    ...(sources === undefined
      ? {}
      : { sources: sources.map((source) => ({ ...source, title: inLanguage(source.title, lang) })) }),
  };
}

/** The number of questions answered right; questions without an answer count as wrong. */
export function score(questions: readonly Question[], answers: ReadonlyMap<string, Answer>): number {
  return questions.filter((question) => {
    const answer = answers.get(question.id);
    return answer !== undefined && isCorrect(question, answer);
  }).length;
}
