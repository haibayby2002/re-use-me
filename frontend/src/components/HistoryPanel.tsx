import { History, Plus, RotateCcw, Trash } from "lucide-react";
import { useResumeStore } from "../store/useResumeStore";
import { useTranslation } from "../i18n/useTranslation";

export default function HistoryPanel() {
  const t = useTranslation();
  const history = useResumeStore((s) => s.history);
  const undoChange = useResumeStore((s) => s.undoChange);

  if (history.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-500">
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-600 dark:text-gray-400">
          <History size={15} /> {t("historyTitle")}
        </h3>
        {t("historyEmpty")}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-600 dark:text-gray-400">
        <History size={15} /> {t("historyTitle")}
      </h3>
      <ul className="space-y-1.5">
        {history
          .slice()
          .reverse()
          .map(({ change }) => (
            <li
              key={change.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs dark:bg-gray-800/50"
            >
              <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                {change.type === "add" ? (
                  <Plus size={12} className="text-brand-600" />
                ) : (
                  <Trash size={12} className="text-red-500" />
                )}
                <span className="font-medium">{change.target}</span>
              </span>
              <button
                type="button"
                onClick={() => undoChange(change.id)}
                title={t("historyUndoTitle")}
                className="flex items-center gap-1 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200"
              >
                <RotateCcw size={12} /> {t("historyUndo")}
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
}
