import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AnalyzeResponse,
  AppliedChange,
  IrrelevantItemState,
  MissingSkillState,
  ResumeSections,
  SourceFile,
  TemplateId,
  UserResponse,
} from "../types";
import { parseResumeSections } from "../utils/parseResumeSections";

interface HistoryEntry {
  change: AppliedChange;
  sectionsBefore: ResumeSections;
}

interface ResumeState {
  resumeText: string;
  sourceFiles: SourceFile[];
  jdText: string;
  jdFilename: string | null;
  matchResult: AnalyzeResponse | null;
  missingItems: MissingSkillState[];
  irrelevantItems: IrrelevantItemState[];
  sections: ResumeSections | null;
  history: HistoryEntry[];
  template: TemplateId;
  llmEnabled: boolean;

  setResumeText: (text: string) => void;
  appendResumeText: (text: string, filename: string) => void;
  setJdText: (text: string, filename?: string | null) => void;
  setMatchResult: (result: AnalyzeResponse) => void;
  setLlmEnabled: (enabled: boolean) => void;

  answerMissing: (term: string, response: UserResponse, detail?: string) => void;
  setGeneratedBullet: (term: string, bullet: string, usedLLM: boolean) => void;
  applyMissingBullet: (term: string) => void;
  addMissingSkillOnly: (term: string) => void;

  decideIrrelevant: (term: string, decision: "keep" | "remove") => void;

  undoChange: (id: string) => void;
  setTemplate: (template: TemplateId) => void;
  editSections: (sections: ResumeSections) => void;
  startOver: () => void;
}

const emptySections: ResumeSections = {
  summary: [],
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  other: [],
};

function cloneSections(sections: ResumeSections): ResumeSections {
  return JSON.parse(JSON.stringify(sections));
}

function pushChange(
  state: ResumeState,
  type: AppliedChange["type"],
  target: string,
  content: string,
  nextSections: ResumeSections
): Partial<ResumeState> {
  const change: AppliedChange = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    target,
    content,
    timestamp: new Date().toISOString(),
  };
  const sectionsBefore = cloneSections(state.sections ?? emptySections);
  return {
    sections: nextSections,
    history: [...state.history, { change, sectionsBefore }],
  };
}

export const useResumeStore = create<ResumeState>()(
  persist(
    (set, get) => ({
      resumeText: "",
      sourceFiles: [],
      jdText: "",
      jdFilename: null,
      matchResult: null,
      missingItems: [],
      irrelevantItems: [],
      sections: null,
      history: [],
      template: "harvard",
      llmEnabled: false,

      setResumeText: (text) => set({ resumeText: text }),

      appendResumeText: (text, filename) =>
        set((state) => ({
          resumeText: state.resumeText ? `${state.resumeText}\n\n${text}` : text,
          sourceFiles: [...state.sourceFiles, { filename, uploadedAt: new Date().toISOString() }],
        })),

      setJdText: (text, filename = null) => set({ jdText: text, jdFilename: filename }),

      setMatchResult: (result) =>
        set((state) => ({
          matchResult: result,
          missingItems: result.missing.map((m) => ({ ...m, userResponse: null, applied: false })),
          irrelevantItems: result.irrelevant.map((i) => ({ ...i, userDecision: null })),
          sections: parseResumeSections(state.resumeText),
          history: [],
        })),

      setLlmEnabled: (enabled) => set({ llmEnabled: enabled }),

      answerMissing: (term, response, detail) =>
        set((state) => ({
          missingItems: state.missingItems.map((item) =>
            item.term === term ? { ...item, userResponse: response, userDetail: detail } : item
          ),
        })),

      setGeneratedBullet: (term, bullet, usedLLM) =>
        set((state) => ({
          missingItems: state.missingItems.map((item) =>
            item.term === term ? { ...item, generatedBullet: bullet, usedLLM } : item
          ),
        })),

      applyMissingBullet: (term) => {
        const state = get();
        const item = state.missingItems.find((m) => m.term === term);
        if (!item || !item.generatedBullet || item.applied) return;

        const sections = cloneSections(state.sections ?? emptySections);
        if (!sections.skills.some((s) => s.toLowerCase() === term.toLowerCase())) {
          sections.skills.push(term);
        }
        let highlights = sections.experience.find((e) => e.heading === "Additional Highlights");
        if (!highlights) {
          highlights = { heading: "Additional Highlights", bullets: [] };
          sections.experience.push(highlights);
        }
        highlights.bullets.push(item.generatedBullet);

        set((s) => ({
          ...pushChange(s, "add", term, item.generatedBullet as string, sections),
          missingItems: s.missingItems.map((m) =>
            m.term === term ? { ...m, applied: true, addedAs: "bullet" } : m
          ),
        }));
      },

      addMissingSkillOnly: (term) => {
        const state = get();
        const item = state.missingItems.find((m) => m.term === term);
        if (!item || item.applied) return;

        const sections = cloneSections(state.sections ?? emptySections);
        if (!sections.skills.some((s) => s.toLowerCase() === term.toLowerCase())) {
          sections.skills.push(term);
        }

        set((s) => ({
          ...pushChange(s, "add", term, `Added "${term}" to Skills (no description given)`, sections),
          missingItems: s.missingItems.map((m) =>
            m.term === term ? { ...m, userResponse: "yes", applied: true, addedAs: "skill-only" } : m
          ),
        }));
      },

      decideIrrelevant: (term, decision) => {
        const state = get();
        set((s) => ({
          irrelevantItems: s.irrelevantItems.map((i) =>
            i.term === term ? { ...i, userDecision: decision } : i
          ),
        }));
        if (decision !== "remove") return;

        const sections = cloneSections(state.sections ?? emptySections);
        const termLower = term.toLowerCase();
        const containsTerm = (text: string) => text.toLowerCase().includes(termLower);

        sections.skills = sections.skills.filter((s) => !containsTerm(s));
        sections.projects = sections.projects.filter((p) => !containsTerm(p));
        sections.other = sections.other.filter((o) => !containsTerm(o));
        sections.experience = sections.experience
          .map((entry) => ({
            ...entry,
            bullets: entry.bullets.filter((b) => !containsTerm(b)),
          }))
          .filter((entry) => entry.bullets.length > 0 || entry.heading);

        set((s) => pushChange(s, "remove", term, `Removed content mentioning "${term}"`, sections));
      },

      undoChange: (id) => {
        const state = get();
        const index = state.history.findIndex((h) => h.change.id === id);
        if (index === -1) return;
        const target = state.history[index];
        set({
          sections: target.sectionsBefore,
          history: state.history.slice(0, index),
        });
      },

      setTemplate: (template) => set({ template }),

      editSections: (sections) => set({ sections }),

      startOver: () =>
        set({
          resumeText: "",
          sourceFiles: [],
          jdText: "",
          jdFilename: null,
          matchResult: null,
          missingItems: [],
          irrelevantItems: [],
          sections: null,
          history: [],
        }),
    }),
    {
      name: "re-use-me-session",
    }
  )
);
