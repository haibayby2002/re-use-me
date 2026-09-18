import { useState } from "react";
import { Eye, Loader2, Pencil, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useResumeStore } from "../store/useResumeStore";
import HarvardTemplate from "./templates/HarvardTemplate";
import ModernTemplate from "./templates/ModernTemplate";
import { parseResumeSections, sectionsToPlainText } from "../utils/parseResumeSections";
import { analyzeResumeAgainstJD, composeResume } from "../api/client";
import { useTranslation } from "../i18n/useTranslation";
import type { TranslationKey } from "../i18n/translations";
import type { AnalyzeResponse, TemplateId } from "../types";

const CATEGORY_KEYS: Record<string, TranslationKey> = {
  hard_skill: "catHardSkill",
  soft_skill: "catSoftSkill",
  tool: "catTool",
  certification: "catCertification",
  language: "catLanguage",
  methodology: "catMethodology",
  custom: "catCustom",
};

const TEMPLATES: { id: TemplateId; labelKey: TranslationKey }[] = [
  { id: "harvard", labelKey: "previewTemplateHarvard" },
  { id: "modern", labelKey: "previewTemplateModern" },
];

export default function TemplatePreview() {
  const t = useTranslation();
  const sections = useResumeStore((s) => s.sections);
  const jdText = useResumeStore((s) => s.jdText);
  const template = useResumeStore((s) => s.template);
  const setTemplate = useResumeStore((s) => s.setTemplate);
  const editSections = useResumeStore((s) => s.editSections);
  const llmEnabled = useResumeStore((s) => s.llmEnabled);

  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [editorTab, setEditorTab] = useState<"edit" | "preview">("edit");

  const [isComposing, setIsComposing] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [composedWithAI, setComposedWithAI] = useState(false);

  const [matchScore, setMatchScore] = useState<AnalyzeResponse | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);

  if (!sections) return null;

  const categoryLabel = (cat: string) => (CATEGORY_KEYS[cat] ? t(CATEGORY_KEYS[cat]) : cat);

  const startEditing = () => {
    setDraftText(sectionsToPlainText(sections));
    setComposedWithAI(false);
    setMatchScore(null);
    setScoreError(null);
    setEditorTab("edit");
    setIsEditing(true);
  };

  const generateFinalResume = () => {
    setIsComposing(true);
    setComposeError(null);
    setMatchScore(null);
    setScoreError(null);
    composeResume(sections, jdText)
      .then((result) => {
        setDraftText(result.markdown);
        setComposedWithAI(result.usedLLM);
        setEditorTab("preview");
        setIsEditing(true);

        setIsScoring(true);
        return analyzeResumeAgainstJD(result.markdown, jdText)
          .then((score) => setMatchScore(score))
          .catch(() => setScoreError(t("previewMatchScoreError")))
          .finally(() => setIsScoring(false));
      })
      .catch(() => setComposeError(t("previewComposeError")))
      .finally(() => setIsComposing(false));
  };

  const saveEditing = () => {
    editSections(parseResumeSections(draftText));
    setIsEditing(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">{t("previewSwitchNote")}</p>
        <div className="flex gap-2">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => setTemplate(tpl.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                template === tpl.id
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              {t(tpl.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {composeError && <p className="text-sm text-red-600 dark:text-red-400">{composeError}</p>}

      {isEditing ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">{t("previewEditHelp")}</p>
            {composedWithAI && (
              <span className="flex items-center gap-1 rounded-full bg-violet-100 px-2 py-1 text-[11px] font-semibold text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                <Sparkles size={11} /> {t("previewDraftedByAI")}
              </span>
            )}
          </div>

          {composedWithAI && (isScoring || matchScore || scoreError) && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              {isScoring ? (
                <p className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Loader2 size={14} className="animate-spin" /> {t("previewMatchScoreLoading")}
                </p>
              ) : scoreError ? (
                <p className="text-sm text-red-600 dark:text-red-400">{scoreError}</p>
              ) : matchScore ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      {t("previewMatchScoreTitle")}
                    </span>
                    <span className="text-2xl font-bold text-brand-700 dark:text-brand-400">
                      {matchScore.score.overall}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div className="h-full bg-brand-500" style={{ width: `${matchScore.score.overall}%` }} />
                  </div>
                  {Object.keys(matchScore.score.byCategory).length > 0 && (
                    <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {Object.entries(matchScore.score.byCategory).map(([cat, pct]) => (
                        <div key={cat} className="rounded-lg bg-gray-50 p-2 text-center dark:bg-gray-800">
                          <dt className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                            {categoryLabel(cat)}
                          </dt>
                          <dd className="text-sm font-semibold text-gray-700 dark:text-gray-300">{pct}%</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </>
              ) : null}
            </div>
          )}

          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setEditorTab("edit")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                editorTab === "edit"
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              <Pencil size={12} /> {t("previewEditTab")}
            </button>
            <button
              type="button"
              onClick={() => setEditorTab("preview")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                editorTab === "preview"
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              <Eye size={12} /> {t("previewFormattedTab")}
            </button>
          </div>

          {/* The resume text itself stays on a light "paper" surface regardless of
              app theme — it should look like what will actually get exported. */}
          {editorTab === "edit" ? (
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              rows={20}
              className="w-full rounded-lg border border-gray-300 p-3 font-mono text-xs text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          ) : (
            <div className="md-preview rounded-lg border border-gray-200 bg-white p-4">
              <ReactMarkdown>{draftText || t("previewNothingToPreview")}</ReactMarkdown>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveEditing}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              {t("previewSave")}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {t("previewCancel")}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap justify-end gap-2">
            {llmEnabled && (
              <button
                type="button"
                onClick={generateFinalResume}
                disabled={isComposing}
                className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {isComposing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                {t("previewGenerateAI")}
              </button>
            )}
            <button
              type="button"
              onClick={startEditing}
              className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <Pencil size={13} /> {t("previewEditAsText")}
            </button>
          </div>
          <div
            id="resume-preview-root"
            className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-6"
          >
            {template === "modern" ? <ModernTemplate sections={sections} /> : <HarvardTemplate sections={sections} />}
          </div>
        </>
      )}
    </div>
  );
}
