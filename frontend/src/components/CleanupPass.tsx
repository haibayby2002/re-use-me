import { Trash2 } from "lucide-react";
import { useResumeStore } from "../store/useResumeStore";
import { useTranslation } from "../i18n/useTranslation";

export default function CleanupPass() {
  const t = useTranslation();
  const irrelevantItems = useResumeStore((s) => s.irrelevantItems);
  const decideIrrelevant = useResumeStore((s) => s.decideIrrelevant);

  const pending = irrelevantItems.filter((i) => i.userDecision === null);
  const decided = irrelevantItems.filter((i) => i.userDecision !== null);

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500 dark:text-gray-400">{t("cleanupIntro")}</p>

      {irrelevantItems.length === 0 && (
        <p className="text-sm text-gray-400 dark:text-gray-500">{t("cleanupEmpty")}</p>
      )}

      {pending.length > 0 && (
        <ul className="space-y-2">
          {pending.map((item) => (
            <li
              key={item.term}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
            >
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.term}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{item.reason}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => decideIrrelevant(item.term, "remove")}
                  className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                >
                  <Trash2 size={13} /> {t("cleanupRemove")}
                </button>
                <button
                  type="button"
                  onClick={() => decideIrrelevant(item.term, "keep")}
                  className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  {t("cleanupKeep")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {decided.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">{t("cleanupReviewed")}</h3>
          <ul className="space-y-1.5">
            {decided.map((item) => (
              <li
                key={item.term}
                className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-800/50"
              >
                <span className="text-gray-600 dark:text-gray-400">{item.term}</span>
                <span className={item.userDecision === "remove" ? "text-red-500 dark:text-red-400" : "text-gray-400 dark:text-gray-500"}>
                  {item.userDecision === "remove" ? t("cleanupRemovedNote") : t("cleanupKeptNote")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
