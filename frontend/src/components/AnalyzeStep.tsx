import { useState } from "react";
import { CheckCircle2, Loader2, MinusCircle, RefreshCw, Sparkles, XCircle } from "lucide-react";
import { useResumeStore } from "../store/useResumeStore";
import { analyzeResumeAgainstJD } from "../api/client";
import { useTranslation } from "../i18n/useTranslation";
import type { TranslationKey } from "../i18n/translations";

function SourceBadge({ source }: { source: "rule" | "llm" }) {
  if (source !== "llm") return null;
  return (
    <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
      <Sparkles size={9} /> AI
    </span>
  );
}

const CATEGORY_KEYS: Record<string, TranslationKey> = {
  hard_skill: "catHardSkill",
  soft_skill: "catSoftSkill",
  tool: "catTool",
  certification: "catCertification",
  language: "catLanguage",
  methodology: "catMethodology",
  custom: "catCustom",
};

export default function AnalyzeStep() {
  const t = useTranslation();
  const categoryLabel = (cat: string) => (CATEGORY_KEYS[cat] ? t(CATEGORY_KEYS[cat]) : cat);

  const resumeText = useResumeStore((s) => s.resumeText);
  const jdText = useResumeStore((s) => s.jdText);
  const matchResult = useResumeStore((s) => s.matchResult);
  const setMatchResult = useResumeStore((s) => s.setMatchResult);
  const llmEnabled = useResumeStore((s) => s.llmEnabled);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useLlmGapCheck, setUseLlmGapCheck] = useState(false);

  const runAnalysis = () => {
    setIsLoading(true);
    setError(null);
    analyzeResumeAgainstJD(resumeText, jdText, llmEnabled && useLlmGapCheck)
      .then((result) => setMatchResult(result))
      .catch(() => setError(t("analyzeError")))
      .finally(() => setIsLoading(false));
  };

  const llmToggle = llmEnabled && (
    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
      <input
        type="checkbox"
        checked={useLlmGapCheck}
        onChange={(e) => setUseLlmGapCheck(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800"
      />
      {t("analyzeLlmToggle")}
    </label>
  );

  if (!matchResult) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">{t("analyzeIntro")}</p>
        {llmToggle}
        <button
          type="button"
          onClick={runAnalysis}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:bg-gray-300 dark:disabled:bg-gray-700"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {t("analyzeButton")}
        </button>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  const { matched, missing, irrelevant, score, usedLlmGapCheck } = matchResult;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("analyzeRuleBasedNote")}</p>
          {usedLlmGapCheck && (
            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-violet-700 dark:text-violet-400">
              <Sparkles size={12} /> {t("analyzeUsedLlmNote")}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {llmToggle}
          <button
            type="button"
            onClick={runAnalysis}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {isLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            {t("analyzeReanalyze")}
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{t("analyzeOverallScore")}</span>
          <span className="text-2xl font-bold text-brand-700 dark:text-brand-400">{score.overall}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div className="h-full bg-brand-500" style={{ width: `${score.overall}%` }} />
        </div>
        {Object.keys(score.byCategory).length > 0 && (
          <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Object.entries(score.byCategory).map(([cat, pct]) => (
              <div key={cat} className="rounded-lg bg-gray-50 p-2 text-center dark:bg-gray-800">
                <dt className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  {categoryLabel(cat)}
                </dt>
                <dd className="text-sm font-semibold text-gray-700 dark:text-gray-300">{pct}%</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <Bucket
        icon={<CheckCircle2 className="text-brand-600" size={18} />}
        title={t("analyzeMatched", { count: matched.length })}
        emptyText={t("analyzeEmptyMatched")}
      >
        {matched.map((m) => (
          <div
            key={m.term}
            className="rounded-lg border border-brand-100 bg-brand-50 p-3 text-sm dark:border-brand-900 dark:bg-brand-900/20"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-brand-900 dark:text-brand-200">
                {m.term}
                <SourceBadge source={m.source} />
              </span>
              <span className="text-[11px] text-brand-600 dark:text-brand-400">{categoryLabel(m.category)}</span>
            </div>
            <p className="mt-1 text-xs text-brand-800/80 dark:text-brand-300/80">
              <span className="font-medium">{t("analyzeInResume")}</span> "{m.resumeEvidence}"
            </p>
          </div>
        ))}
      </Bucket>

      <Bucket
        icon={<XCircle className="text-amber-500" size={18} />}
        title={t("analyzeMissing", { count: missing.length })}
        emptyText={t("analyzeEmptyMissing")}
      >
        {missing.map((m) => (
          <div
            key={m.term}
            className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-900/20"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-amber-900 dark:text-amber-200">
                {m.term}
                <SourceBadge source={m.source} />
              </span>
              <span className="text-[11px] text-amber-600 dark:text-amber-400">{categoryLabel(m.category)}</span>
            </div>
            <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-300/80">
              <span className="font-medium">{t("analyzeFromJD")}</span> "{m.jdContext}"
            </p>
          </div>
        ))}
      </Bucket>

      <Bucket
        icon={<MinusCircle className="text-gray-400" size={18} />}
        title={t("analyzeIrrelevant", { count: irrelevant.length })}
        emptyText={t("analyzeEmptyIrrelevant")}
      >
        {irrelevant.map((i) => (
          <div
            key={i.term}
            className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-800 dark:bg-gray-800/50"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {i.term}
                <SourceBadge source={i.source} />
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-500">{categoryLabel(i.category)}</span>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{i.reason}</p>
          </div>
        ))}
      </Bucket>
    </div>
  );
}

function Bucket({
  icon,
  title,
  emptyText,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  emptyText: string;
  children: React.ReactNode;
}) {
  const isEmpty = Array.isArray(children) ? children.length === 0 : !children;
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
        {icon} {title}
      </h3>
      {isEmpty ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">{emptyText}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">{children}</div>
      )}
    </section>
  );
}
