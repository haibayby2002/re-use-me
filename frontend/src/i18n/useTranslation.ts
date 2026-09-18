import { useUIStore } from "../store/useUIStore";
import { translations, type TranslationKey } from "./translations";

export function useTranslation() {
  const language = useUIStore((s) => s.language);

  return (key: TranslationKey, vars?: Record<string, string | number>): string => {
    let text: string = translations[language][key] ?? translations.en[key];
    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        text = text.replace(`{{${name}}}`, String(value));
      }
    }
    return text;
  };
}
