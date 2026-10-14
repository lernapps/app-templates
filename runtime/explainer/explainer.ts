// The client module of an explainer (@lernapps/app-templates/explainer), loaded by every page from the app's
// src/main.ts. Every page is complete without JavaScript; this module only adds. For now it marks the page as
// running with JavaScript (class explainer-js on <html>); the exercises bring their behaviour here.

/** Starts the explainer on the page. */
export function startExplainer(): void {
  document.documentElement.classList.add("explainer-js");
}
