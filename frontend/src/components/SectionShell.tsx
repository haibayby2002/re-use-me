import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { useTranslation } from "../i18n/useTranslation";

interface Props {
  id: string;
  title: string;
  subtitle?: string;
  icon: ReactNode;
  locked?: boolean;
  lockedMessage?: string;
  children: ReactNode;
}

export default function SectionShell({ id, title, subtitle, icon, locked, lockedMessage, children }: Props) {
  const t = useTranslation();
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-5 sm:p-8 dark:border-gray-800 dark:bg-gray-900"
      aria-disabled={locked}
    >
      <div className="mb-4 flex items-start gap-2.5">
        <span className={locked ? "text-gray-300 dark:text-gray-700" : "text-brand-600"}>{icon}</span>
        <div>
          <h2
            className={`text-lg font-semibold ${locked ? "text-gray-400 dark:text-gray-600" : "text-gray-900 dark:text-gray-100"}`}
          >
            {title}
          </h2>
          {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </div>
      </div>

      {locked ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-500">
          <Lock size={15} />
          {lockedMessage ?? t("lockedDefault")}
        </div>
      ) : (
        children
      )}
    </section>
  );
}
