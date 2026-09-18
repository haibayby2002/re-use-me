import type { ExperienceEntry, ResumeSections } from "../types";

const SECTION_KEYWORDS: Record<keyof Omit<ResumeSections, "other">, RegExp> = {
  summary: /^(summary|profile|objective|about me)\b/i,
  experience: /^(experience|work experience|employment( history)?|professional experience)\b/i,
  education: /^education\b/i,
  skills: /^(skills|technical skills|core competencies)\b/i,
  projects: /^projects?\b/i,
  certifications: /^(certifications?|licenses?)\b/i,
};

// A lone "-"/"*"/unicode bullet starts a list item, but "*" must not be
// followed by another "*" — that's the start of a **bold** line, not a bullet.
const BULLET_PREFIX = /^[\s]*(?:[-•●▪◦‣]|\*(?!\*))\s*/;
const MD_HEADER_PREFIX = /^#{1,6}\s*/;
const MD_BOLD = /\*\*(.+?)\*\*/g;
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.-]+/;

function stripMarkdownEmphasis(text: string): string {
  return text.replace(MD_BOLD, "$1").trim();
}

function isLikelyHeader(line: string): keyof typeof SECTION_KEYWORDS | null {
  const trimmed = line.trim().replace(MD_HEADER_PREFIX, "");
  if (trimmed.length === 0 || trimmed.length > 40) return null;
  for (const [key, pattern] of Object.entries(SECTION_KEYWORDS)) {
    if (pattern.test(trimmed)) return key as keyof typeof SECTION_KEYWORDS;
  }
  return null;
}

function looksLikeNameLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 60) return false;
  if (EMAIL_PATTERN.test(trimmed)) return false;
  if (/\d/.test(trimmed)) return false;
  if (BULLET_PREFIX.test(trimmed) || isLikelyHeader(trimmed)) return false;
  const words = trimmed.split(/\s+/);
  return words.length >= 2 && words.length <= 5;
}

/**
 * Finds the candidate's name + contact line (the one with the email address)
 * wherever they sit in the raw text — not just at the top — so a resume whose
 * header got extracted or pasted out of order still renders with the name up
 * front instead of getting silently absorbed into whatever section follows it.
 */
function extractHeaderBlock(lines: string[]): { header: string[]; rest: string[] } {
  const emailIdx = lines.findIndex((l) => EMAIL_PATTERN.test(l));
  if (emailIdx === -1) return { header: [], rest: lines };

  const headerIdxs = new Set<number>([emailIdx]);
  for (let i = emailIdx - 1; i >= 0 && i >= emailIdx - 3; i--) {
    if (lines[i].trim() === "") continue;
    if (looksLikeNameLine(lines[i])) headerIdxs.add(i);
    break;
  }

  const header = [...headerIdxs].sort((a, b) => a - b).map((i) => lines[i]);
  const rest = lines.filter((_, i) => !headerIdxs.has(i));
  return { header, rest };
}

export function parseResumeSections(rawText: string): ResumeSections {
  const { header, rest } = extractHeaderBlock(rawText.split(/\r?\n/));
  const lines = rest;

  const sections: ResumeSections = {
    summary: [],
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    other: [...header],
  };

  let current: keyof ResumeSections = "other";
  let currentExperience: ExperienceEntry | null = null;

  const flushExperience = () => {
    if (currentExperience && (currentExperience.heading || currentExperience.bullets.length)) {
      sections.experience.push(currentExperience);
    }
    currentExperience = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const header = isLikelyHeader(line);
    if (header) {
      if (current === "experience") flushExperience();
      current = header;
      continue;
    }

    if (current === "experience") {
      if (BULLET_PREFIX.test(line)) {
        const bulletText = stripMarkdownEmphasis(line.replace(BULLET_PREFIX, ""));
        if (!currentExperience) currentExperience = { heading: "", bullets: [] };
        currentExperience.bullets.push(bulletText);
      } else {
        flushExperience();
        currentExperience = { heading: stripMarkdownEmphasis(line), bullets: [] };
      }
      continue;
    }

    if (current === "skills") {
      const items = stripMarkdownEmphasis(line.replace(BULLET_PREFIX, ""))
        .split(/[,;|]/)
        .map((s) => s.trim())
        .filter(Boolean);
      sections.skills.push(...items);
      continue;
    }

    const cleaned = stripMarkdownEmphasis(line.replace(BULLET_PREFIX, ""));
    if (cleaned) sections[current].push(cleaned as never);
  }

  if (current === "experience") flushExperience();

  return sections;
}

export function sectionsToPlainText(sections: ResumeSections): string {
  const parts: string[] = [];
  // Name + contact line(s) go first, with no header above them — this is what
  // parseResumeSections() expects back (content before the first recognized
  // section header defaults to "other"), so editing and re-saving round-trips
  // correctly instead of the header sliding into whatever section came last.
  if (sections.other.length) parts.push(...sections.other, "");
  if (sections.summary.length) parts.push("SUMMARY", ...sections.summary, "");
  if (sections.experience.length) {
    parts.push("EXPERIENCE");
    for (const entry of sections.experience) {
      if (entry.heading) parts.push(entry.heading);
      parts.push(...entry.bullets.map((b) => `- ${b}`));
    }
    parts.push("");
  }
  if (sections.projects.length) parts.push("PROJECTS", ...sections.projects, "");
  if (sections.skills.length) parts.push("SKILLS", sections.skills.join(", "), "");
  if (sections.education.length) parts.push("EDUCATION", ...sections.education, "");
  if (sections.certifications.length) parts.push("CERTIFICATIONS", ...sections.certifications, "");
  return parts.join("\n");
}
