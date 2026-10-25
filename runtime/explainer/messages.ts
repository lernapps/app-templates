// The explainer's own texts for learners, in each language it has them: an app may declare only these languages.
import de from "./messages/de.json" with { type: "json" };
import en from "./messages/en.json" with { type: "json" };
import { textsIn, type Language } from "../shared/languages.ts";

export type Messages = typeof de;
export const MESSAGES: Readonly<Record<Language, Messages>> = { de, en };

/** The text of `key` in `lang`, with its placeholders filled. */
export function message(lang: string, key: keyof Messages, params: Readonly<Record<string, string>> = {}): string {
  const text = textsIn(MESSAGES, lang)[key];
  return text.replace(/\{(\w+)\}/g, (placeholder, name: string) => params[name] ?? placeholder);
}
