import { quizRuntimeTests } from "@lernapps/app-templates/quiz/e2e";

// The tests of the quiz runtime, which this repo runs on the template and its fixtures. Not part of the scaffold
// (lernapps.scaffold in the package.json of @lernapps/app-templates): a new app runs only quizTests(), on its content.
quizRuntimeTests();
