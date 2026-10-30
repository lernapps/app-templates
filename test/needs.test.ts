// The needs a learner can choose for the tutor (needs.ts, dec-tutor-needs): kept as a setting, named in the query of
// the tutor page that starts a chat (`bedarf=`), and the first language as one sentence in the learner's voice.
import { describe, expect, test } from "vite-plus/test";
import {
  isNeedsChoice,
  languageName,
  languageSentence,
  LANGUAGES,
  needsParameter,
  NEEDS,
  withNeeds,
} from "../runtime/explainer/needs.ts";

describe("needs", () => {
  test("a stored choice is known needs and, if any, a language", () => {
    expect(isNeedsChoice({ needs: ["kurze-schritte", "andere-muttersprache"], language: "tr" })).toBe(true);
    expect(isNeedsChoice({ needs: [] })).toBe(true);
    expect(isNeedsChoice({ needs: ["adhs"] })).toBe(false);
    expect(isNeedsChoice({ needs: "kurze-schritte" })).toBe(false);
    expect(isNeedsChoice({ needs: [], language: 7 })).toBe(false);
    expect(isNeedsChoice(null)).toBe(false);
  });

  test("the query names the needs in a fixed order, after the task numbers; none adds nothing", () => {
    const choice = { needs: [NEEDS[3], NEEDS[0]] };
    expect(needsParameter(choice)).toBe("bedarf=kurze-schritte,andere-muttersprache");
    expect(withNeeds("?zahl=12", choice)).toBe("?zahl=12&bedarf=kurze-schritte,andere-muttersprache");
    expect(withNeeds("", choice)).toBe("?bedarf=kurze-schritte,andere-muttersprache");
    expect(withNeeds("?zahl=12", { needs: [] })).toBe("?zahl=12");
    expect(withNeeds("?zahl=12", undefined)).toBe("?zahl=12");
  });

  test("the first language as one sentence in the learner's voice, only with andere-muttersprache", () => {
    expect(languageSentence({ needs: ["andere-muttersprache"], language: "tr" }, "de")).toBe(
      "Meine Muttersprache ist Türkisch.",
    );
    expect(languageSentence({ needs: ["andere-muttersprache"], language: "gsg" }, "de")).toBe(
      "Meine Muttersprache ist Deutsche Gebärdensprache.",
    );
    expect(languageSentence({ needs: ["andere-muttersprache"], language: "uk" }, "en")).toBe(
      "My first language is Ukrainian.",
    );
    expect(languageSentence({ needs: ["kurze-schritte"], language: "tr" }, "de")).toBe("");
    expect(languageSentence({ needs: ["andere-muttersprache"] }, "de")).toBe("");
  });

  test("every language offered has a name in each language of the explainer", () => {
    for (const lang of ["de", "en"]) {
      for (const tag of LANGUAGES) expect(languageName(tag, lang)).not.toBe(tag);
    }
  });
});
