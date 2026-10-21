// Reading the JSON Schemas of the content for the messages about their errors, at build time: which properties a
// definition knows, with those of its allOf, its references (within a schema, or into another by its $id) and its
// branches. A property a definition knows is not "not allowed" when the schema reports an error elsewhere in it.

type Definition = { properties?: Record<string, unknown>; allOf?: unknown[]; $ref?: string; then?: unknown };

/** The schemas by their $id, each with its definitions. */
export type Schemas = Readonly<Record<string, { $defs?: unknown }>>;

/** The schemas the given ones are made of, by their $id. */
export const schemasById = (...schemas: readonly { $id: string; $defs?: unknown }[]): Schemas =>
  Object.fromEntries(schemas.map((schema) => [schema.$id, schema]));

/**
 * The properties of the definition `name` of the schema `id`, and of everything it refers to; with `branches` false
 * not those of the branches of its allOf (the fields that only one type of a question has).
 */
export function knownProperties(
  schemas: Schemas,
  id: string,
  name: string,
  { branches = true }: { branches?: boolean } = {},
): Set<string> {
  const into = new Set<string>();
  const visit = (definition: unknown, scope: string): void => {
    if (typeof definition !== "object" || definition === null) return;
    const def = definition as Definition;
    for (const key of Object.keys(def.properties ?? {})) into.add(key);
    if (typeof def.$ref === "string") {
      const [target = "", fragment = ""] = def.$ref.split("#");
      const there = target === "" ? scope : target;
      const found = (schemas[there]?.$defs as Record<string, unknown> | undefined)?.[fragment.replace("/$defs/", "")];
      visit(found, there);
    }
    for (const part of def.allOf ?? []) {
      const branch = typeof part === "object" && part !== null && "then" in part;
      if (branch && !branches) continue;
      visit(part, scope);
      if (branch) visit((part as Definition).then, scope);
    }
  };
  visit((schemas[id]?.$defs as Record<string, unknown> | undefined)?.[name], id);
  return into;
}
