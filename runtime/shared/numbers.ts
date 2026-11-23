// How a number is written on a page, by the rules of the language: German as in school (a decimal comma, the minus
// sign U+2212, groups of three from five digits on, separated by a narrow no-break space, none with four digits);
// other languages as Intl writes them.

const NARROW_NO_BREAK_SPACE = " ";
const MINUS = "−";

/**
 * `formatted`, a number as Intl.NumberFormat writes it for German with grouping, in school writing: the minus sign
 * U+2212, a narrow no-break space between groups of three (only when the whole part has five digits or more).
 */
export function schoolGerman(formatted: string): string {
  const negative = formatted.startsWith("-");
  const [whole = "", ...rest] = (negative ? formatted.slice(1) : formatted).split(",");
  const digits = whole.replaceAll(".", "");
  const grouped = digits.length >= 5 ? whole.replaceAll(".", NARROW_NO_BREAK_SPACE) : digits;
  return `${negative ? MINUS : ""}${[grouped, ...rest].join(",")}`;
}

/** A formatter for numbers in `lang` (its Intl locale `locale`), up to `maximumFractionDigits` decimals. */
export function numberFormatter(
  lang: string,
  locale: string,
  options: Intl.NumberFormatOptions = {},
): { format: (value: number) => string } {
  const intl = new Intl.NumberFormat(locale, { maximumFractionDigits: 10, ...options });
  return { format: (value) => (lang === "de" ? schoolGerman(intl.format(value)) : intl.format(value)) };
}
