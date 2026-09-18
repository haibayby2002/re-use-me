import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { FileText, Loader2, UploadCloud } from "lucide-react";
import { useResumeStore } from "../store/useResumeStore";
import { extractPdfText } from "../api/client";
import { useTranslation } from "../i18n/useTranslation";

export default function JDInput() {
  const t = useTranslation();
  const jdText = useResumeStore((s) => s.jdText);
  const jdFilename = useResumeStore((s) => s.jdFilename);
  const setJdText = useResumeStore((s) => s.setJdText);

  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      setError(null);
      setIsExtracting(true);
      try {
        if (file.type === "application/pdf") {
          const result = await extractPdfText(file);
          setJdText(result.text, result.filename);
        } else {
          const text = await file.text();
          setJdText(text, file.name);
        }
      } catch {
        setError(t("jdDropError"));
      } finally {
        setIsExtracting(false);
      }
    },
    [setJdText, t]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "text/plain": [".txt"] },
    multiple: false,
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">{t("jdOneActive")}</p>

      <div
        {...getRootProps()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          isDragActive
            ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30"
            : "border-gray-300 bg-white hover:border-brand-400 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-brand-500"
        }`}
      >
        <input {...getInputProps()} />
        {isExtracting ? (
          <Loader2 className="mb-2 animate-spin text-brand-600" />
        ) : (
          <UploadCloud className="mb-2 text-gray-400 dark:text-gray-600" />
        )}
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {isDragActive ? t("jdDropActive") : t("jdDropIdle")}
        </p>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {jdFilename && (
        <div className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 w-fit dark:bg-gray-800 dark:text-gray-300">
          <FileText size={12} /> {jdFilename}
        </div>
      )}

      <div>
        <label htmlFor="jd-text" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("jdTextLabel")}
        </label>
        <textarea
          id="jd-text"
          value={jdText}
          onChange={(e) => setJdText(e.target.value, jdFilename)}
          rows={14}
          placeholder={t("jdTextPlaceholder")}
          className="w-full rounded-lg border border-gray-300 bg-white p-3 font-mono text-sm text-gray-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:placeholder:text-gray-600"
        />
      </div>
    </div>
  );
}
