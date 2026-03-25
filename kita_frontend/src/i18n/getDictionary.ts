import { Locale } from "./lang";

import de from "@/locales/de.json";
import en from "@/locales/en.json";

const dictionaries = {
  de,
  en,
};

export function getDictionary(locale: Locale) {
  return dictionaries[locale] || dictionaries.de;
}