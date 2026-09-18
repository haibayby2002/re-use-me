import { Check, Lock } from "lucide-react";
import clsx from "clsx";

export interface NavItem {
  id: string;
  label: string;
  unlocked: boolean;
  done: boolean;
}

export default function SectionNav({ items }: { items: NavItem[] }) {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav aria-label="Sections" className="w-full overflow-x-auto">
      <ol className="flex min-w-max items-center gap-1 sm:gap-2 px-1">
        {items.map((item, idx) => (
          <li key={item.id} className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              disabled={!item.unlocked}
              onClick={() => scrollTo(item.id)}
              className={clsx(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                item.done && "bg-brand-100 text-brand-800 hover:bg-brand-200 dark:bg-brand-900 dark:text-brand-200 dark:hover:bg-brand-800",
                !item.done && item.unlocked && "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700",
                !item.unlocked && "bg-gray-50 text-gray-400 cursor-not-allowed dark:bg-gray-900 dark:text-gray-600"
              )}
            >
              <span
                className={clsx(
                  "flex h-5 w-5 items-center justify-center rounded-full text-xs",
                  item.done && "bg-brand-600 text-white",
                  !item.done && item.unlocked && "bg-white text-gray-500 border border-gray-300 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-600",
                  !item.unlocked && "text-gray-300 dark:text-gray-700"
                )}
              >
                {item.done ? <Check size={12} /> : item.unlocked ? idx + 1 : <Lock size={10} />}
              </span>
              {item.label}
            </button>
            {idx < items.length - 1 && <div className="h-px w-3 sm:w-5 bg-gray-300 dark:bg-gray-700" />}
          </li>
        ))}
      </ol>
    </nav>
  );
}
