// The start prompt of a content page and the assistants that take it, way A to the tutor ("Mit <name> lernen"; way B,
// "Hilfe" at one task, is stuck.ts). The learner switches an assistant on once (Claude, ChatGPT or Le Chat, the same
// for every app), or copying the text; then every content page has a bar beside its title. Its
// button opens the assistant with the start prompt in its address: one sentence in the learner's voice that names
// the page's tutor page (tutorpage.ts) with where the learner is in its query (position.ts). A chat assistant
// fetches only addresses its user wrote into the conversation, so the prompt names the one address the tutor needs,
// and the tutor page holds all the rest, its guide among it: the prompt itself gives the tutor no rules. Le Chat
// treats a message from its address as not written by the user and loads nothing from it (`paste`): there the click
// copies the start prompt and opens the chat with a short placeholder message; the learner pastes, and the prompt,
// now the learner's own message, lets the tutor load its tutor page. For copying,
// the client module adds the tutor page's Markdown after the prompt, nothing going over the network but the app's
// own static file. Without JavaScript the provider links are plain links to the assistant, and the tutor page is a
// page to read and copy from. Nothing loads before a click.
import { type Route } from "./routes.ts";
import { tutorPageOf } from "./tutor.ts";

/** Where the start prompt's address starts: replaced by the address of the language tree when the page uses it. */
export const BASE = "⟦base⟧";

/** Where the start prompt of a content page has the learner's position: replaced by the query the page builds. */
export const QUERY = "⟦query⟧";

/**
 * An assistant the start page offers: its name, and its address with {prompt} where the prompt goes. An assistant that
 * fetches no address from a message it got through its own address (Le Chat) has `paste`: the address carries only a
 * short placeholder message, and the learner pastes the copied start prompt, which then counts as written by them.
 */
export interface Provider {
  name: string;
  url: string;
  paste?: boolean;
}

/** The assistants a learner can switch on, the same for every app: each takes the prompt in its address. */
export const PROVIDERS: readonly Provider[] = [
  { name: "Claude", url: "https://claude.ai/new?q={prompt}" },
  { name: "ChatGPT", url: "https://chatgpt.com/?q={prompt}" },
  { name: "Le Chat", url: "https://chat.mistral.ai/chat?q={prompt}", paste: true },
];

const MARK = "lernapps-prompt";
/** A provider's address without the prompt, for the link without JavaScript: its parameter with {prompt} left out. */
export function plainAddress(url: string): string {
  const parsed = new URL(url.replace(/\{prompt\}/g, MARK));
  const keys = Array.from(parsed.searchParams.entries()).flatMap(([key, value]) => (value.includes(MARK) ? [key] : []));
  for (const key of keys) parsed.searchParams.delete(key);
  return parsed.href.replace(/\?$/, "");
}

const LOAD: Readonly<Record<string, string>> = {
  de: "Lade {url} und hilf mir, diese Seite zu verstehen.",
  en: "Load {url} and help me understand this page.",
};

const PLACEHOLDER: Readonly<Record<string, string>> = {
  de: "Ich brauche Hilfe bei einer Lern-Einheit. Ich schreibe Dir gleich, worum es geht.",
  en: "I need help with a learning unit. I will tell you in a moment what it is about.",
};

/** The short message a `paste` assistant gets in its address, in `lang`: it holds no address to fetch. */
export const placeholderPrompt = (lang: string): string => PLACEHOLDER[lang] ?? PLACEHOLDER["de"] ?? "";

/**
 * The start prompt a provider link carries from a content page, the one kind of page that starts a tutor, in its
 * language: "Lade <chapter>/<page>/tutor/<QUERY> und hilf mir, diese Seite zu verstehen.", the page's tutor page with
 * where the learner is in its query, which the client module fills in (position.ts, pageQuery). Its address starts
 * with BASE.
 */
export function startPrompt(route: Pick<Route, "lang" | "page">): string {
  const page = { chapter: route.page?.chapter ?? "", id: route.page?.id ?? "" };
  return (LOAD[route.lang] ?? LOAD["de"] ?? "").replace("{url}", `${BASE}${tutorPageOf(page)}${QUERY}`);
}

/** The prompt with its address from `base`, the language tree's address. */
export const withBase = (prompt: string, base: string): string => prompt.split(BASE).join(base);
