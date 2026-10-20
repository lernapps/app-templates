// Copies the definitions of a question (runtime/shared/questions/question.v1.schema.json, the source) into the schema
// of the quiz's question bank (runtime/quiz/quiz.v1.schema.json), which carries the same definitions so that its
// published address (.../quiz.v1.schema.json#/$defs/question) keeps working. test/architecture.test.ts fails when the
// two differ.
//
//   node scripts/sync-schemas.ts
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const read = (path: string) => JSON.parse(readFileSync(join(root, path), "utf8")) as { $defs: Record<string, unknown> };

const question = read("runtime/shared/questions/question.v1.schema.json");
const quizPath = "runtime/quiz/quiz.v1.schema.json";
const quiz = read(quizPath);
for (const [name, definition] of Object.entries(question.$defs)) quiz.$defs[name] = definition;
writeFileSync(join(root, quizPath), `${JSON.stringify(quiz, null, 2)}\n`);
