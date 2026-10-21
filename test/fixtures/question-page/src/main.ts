import "@lernapps/app-templates/quiz/style.css";
import { questionId, startQuestion, type Question } from "@lernapps/app-templates/questions/engine";

const questions = JSON.parse(document.getElementById("questions-data")?.textContent ?? "[]") as Question[];
for (const question of questions) {
  const item = document.getElementById(questionId(question));
  if (item) startQuestion(item, question);
}
