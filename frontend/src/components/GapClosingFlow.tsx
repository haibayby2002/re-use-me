import { useMemo, useState } from "react";
import { Check, ListPlus, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { useResumeStore } from "../store/useResumeStore";
import { draftBullet } from "../api/client";
import { useTranslation } from "../i18n/useTranslation";
import type { MissingSkillState } from "../types";

function isResolved(item: MissingSkillState): boolean {
  if (item.userResponse === "skip") return true;
  if (item.userResponse === "yes" && item.applied) return true;
  return false;
}

export default function GapClosingFlow() {
  const t = useTranslation();
  const missingItems = useResumeStore((s) => s.missingItems);

  const pendingIndex = missingItems.findIndex((m) => !isResolved(m));
  const current = pendingIndex === -1 ? null : missingItems[pendingIndex];

  const decided = useMemo(() => missingItems.filter((m) => isResolved(m)), [missingItems]);

  if (missingItems.length === 0) {
    return <p className="text-sm text-gray-400 dark:text-gray-500">{t("gapNoneToReview")}</p>;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {current ? t("gapItemOf", { index: pendingIndex + 1, total: missingItems.length }) : t("gapAllDone")}
      </p>

      {current && <MissingItemCard key={current.term} item={current} />}

      {!current && (
        <div className="rounded-lg border border-brand-100 bg-brand-50 p-4 text-sm text-brand-800 dark:border-brand-900 dark:bg-brand-900/20 dark:text-brand-300">
          {t("gapAllDoneNote")}
        </div>
      )}

      {decided.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">{t("gapReviewed")}</h3>
          <ul className="space-y-1.5">
            {decided.map((item) => (
              <li
                key={item.term}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <span className="font-medium text-gray-700 dark:text-gray-300">{item.term}</span>
                <span className={item.applied ? "text-brand-600 dark:text-brand-400" : "text-gray-400 dark:text-gray-600"}>
                  {item.addedAs === "bullet"
                    ? t("gapAddedExperience")
                    : item.addedAs === "skill-only"
                      ? t("gapAddedSkills")
                      : t("gapSkipped")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MissingItemCard({ item }: { item: MissingSkillState }) {
  const t = useTranslation();
  const answerMissing = useResumeStore((s) => s.answerMissing);
  const setGeneratedBullet = useResumeStore((s) => s.setGeneratedBullet);
  const applyMissingBullet = useResumeStore((s) => s.applyMissingBullet);
  const addMissingSkillOnly = useResumeStore((s) => s.addMissingSkillOnly);

  const [detail, setDetail] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const hasDetail = detail.trim().length > 0;

  const handleAddSubmit = async () => {
    if (!detail.trim()) return;
    setIsGenerating(true);
    setGenError(null);
    try {
      const { bullet, usedLLM } = await draftBullet(item.term, item.jdContext, detail.trim());
      answerMissing(item.term, "yes", detail.trim());
      setGeneratedBullet(item.term, bullet, usedLLM);
    } catch {
      setGenError(t("gapDraftError"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddSkillOnly = () => {
    addMissingSkillOnly(item.term);
  };

  const handleRegenerate = async () => {
    setIsGenerating(true);
    setGenError(null);
    try {
      const { bullet, usedLLM } = await draftBullet(item.term, item.jdContext, item.userDetail || detail);
      setGeneratedBullet(item.term, bullet, usedLLM);
    } catch {
      setGenError(t("gapRegenerateError"));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-1 flex items-center gap-2">
        <Sparkles className="text-brand-500" size={16} />
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{item.term}</h3>
      </div>
      <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
        {t("analyzeFromJD")} "{item.jdContext}"
        {item.learnable && (
          <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
            {t("gapLearnable")}
          </span>
        )}
      </p>

      {!item.generatedBullet && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t("gapPrompt")}</label>
          <textarea
            rows={3}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder={t("gapDetailPlaceholder")}
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-600"
          />
          <div className="flex flex-wrap gap-2">
            {hasDetail ? (
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleAddSubmit}
                className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:bg-gray-300 dark:disabled:bg-gray-700"
              >
                {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {t("gapDraftButton")}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAddSkillOnly}
                className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                <ListPlus size={14} />
                {t("gapSkillOnlyButton")}
              </button>
            )}
            <button
              type="button"
              onClick={() => answerMissing(item.term, "skip")}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 hover:bg-gray-50 dark:text-gray-500 dark:hover:bg-gray-800"
            >
              {t("gapSkipButton")}
            </button>
          </div>
          {genError && <p className="text-xs text-red-600 dark:text-red-400">{genError}</p>}
        </div>
      )}

      {item.generatedBullet && (
        <div className="space-y-3">
          <div className="rounded-lg border border-brand-100 bg-brand-50 p-3 text-sm text-brand-900 dark:border-brand-900 dark:bg-brand-900/20 dark:text-brand-200">
            "{item.generatedBullet}"
            <div className="mt-1 text-[11px] text-brand-600 dark:text-brand-400">
              {item.usedLLM ? t("gapDraftedByLLM") : t("gapDraftedByTemplate")}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={item.applied}
              onClick={() => applyMissingBullet(item.term)}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:bg-gray-300 dark:disabled:bg-gray-700"
            >
              <Check size={14} /> {item.applied ? t("gapAdded") : t("gapAddToResume")}
            </button>
            {!item.applied && (
              <>
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <RotateCcw size={14} /> {t("gapRegenerate")}
                </button>
                <button
                  type="button"
                  onClick={() => answerMissing(item.term, "skip")}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 hover:bg-gray-50 dark:text-gray-500 dark:hover:bg-gray-800"
                >
                  {t("gapSkipInstead")}
                </button>
              </>
            )}
          </div>
          {genError && <p className="text-xs text-red-600 dark:text-red-400">{genError}</p>}
        </div>
      )}
    </div>
  );
}
