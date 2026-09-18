import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark";
export type Language = "en" | "vi";

interface UIState {
  theme: Theme;
  language: Language;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setLanguage: (language: Language) => void;
}

const prefersDark =
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: prefersDark ? "dark" : "light",
      language: "en",
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === "light" ? "dark" : "light" }),
      setLanguage: (language) => set({ language }),
    }),
    { name: "re-use-me-ui" }
  )
);
