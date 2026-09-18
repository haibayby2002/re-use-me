export type SkillCategory =
  | "hard_skill"
  | "soft_skill"
  | "tool"
  | "certification"
  | "language"
  | "methodology"
  | "custom";

export interface SourceFile {
  filename: string;
  uploadedAt: string;
}

export type MatchSource = "rule" | "llm";

export interface MatchedSkill {
  term: string;
  category: SkillCategory;
  resumeEvidence: string;
  jdEvidence: string;
  source: MatchSource;
}

export interface MissingSkill {
  term: string;
  category: SkillCategory;
  jdContext: string;
  learnable: boolean;
  source: MatchSource;
}

export interface IrrelevantItem {
  term: string;
  category: SkillCategory;
  reason: string;
  source: MatchSource;
}

export interface ScoreBreakdown {
  overall: number;
  byCategory: Record<string, number>;
}

export interface AnalyzeResponse {
  matched: MatchedSkill[];
  missing: MissingSkill[];
  irrelevant: IrrelevantItem[];
  score: ScoreBreakdown;
  usedLlmGapCheck: boolean;
}

export type UserResponse = "yes" | "no" | "skip";

export type AddedAs = "skill-only" | "bullet";

export interface MissingSkillState extends MissingSkill {
  userResponse: UserResponse | null;
  userDetail?: string;
  generatedBullet?: string;
  usedLLM?: boolean;
  applied: boolean;
  addedAs?: AddedAs;
}

export interface IrrelevantItemState extends IrrelevantItem {
  userDecision: "keep" | "remove" | null;
}

export type ChangeType = "add" | "remove";

export interface AppliedChange {
  id: string;
  type: ChangeType;
  target: string; // e.g. section name or skill term
  content: string;
  timestamp: string;
}

export interface ResumeSections {
  summary: string[];
  experience: ExperienceEntry[];
  education: string[];
  skills: string[];
  projects: string[];
  certifications: string[];
  other: string[];
}

export interface ExperienceEntry {
  heading: string; // title/company/date line, best-effort
  bullets: string[];
}

export type TemplateId = "harvard" | "modern";

export interface ConfigResponse {
  llmEnabled: boolean;
  mode: "hosted-llm" | "rule-based-only";
}

export interface ComposeResponse {
  markdown: string;
  usedLLM: boolean;
}

