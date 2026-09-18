import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { Download, Loader2 } from "lucide-react";
import { useResumeStore } from "../store/useResumeStore";
import ResumePdfDocument from "./templates/ResumePdfDocument";
import { useTranslation } from "../i18n/useTranslation";

export default function ExportPanel() {
  const t = useTranslation();
  const sections = useResumeStore((s) => s.sections);
  const template = useResumeStore((s) => s.template);

  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!sections) return null;

  const handleDownload = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const blob = await pdf(<ResumePdfDocument sections={sections} template={template} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `resume-${template}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setError(t("exportError"));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <p className="text-sm text-gray-500 dark:text-gray-400">{t("exportNote")}</p>
      <button
        type="button"
        onClick={handleDownload}
        disabled={isExporting}
        className="flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:bg-gray-300 dark:disabled:bg-gray-700"
      >
        {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        {t("exportDownload")}
      </button>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <p className="text-xs text-gray-400 dark:text-gray-600">{t("exportSafeNote")}</p>
    </div>
  );
}
