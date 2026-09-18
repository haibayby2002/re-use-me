import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { FileText, Loader2, UploadCloud } from "lucide-react";
import { useResumeStore } from "../store/useResumeStore";
import { extractPdfText } from "../api/client";
import { useTranslation } from "../i18n/useTranslation";

export default function ResumeInput() {
  const t = useTranslation();
  const resumeText = useResumeStore((s) => s.resumeText);
  const sourceFiles = useResumeStore((s) => s.sourceFiles);
  const setResumeText = useResumeStore((s) => s.setResumeText);
  const appendResumeText = useResumeStore((s) => s.appendResumeText);

  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (files: File[]) => {
      setError(null);
      setIsExtracting(true);
      try {
        for (const file of files) {
          const result = await extractPdfText(file);
          appendResumeText(result.text, result.filename);
        }
      } catch {
        setError(t("resumeDropError"));
      } finally {
        setIsExtracting(false);
      }
    },
    [appendResumeText, t]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: true,
  });

  return (
    <div className="space-y-4">
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
          {isDragActive ? t("resumeDropActive") : t("resumeDropIdle")}
        </p>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {sourceFiles.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {sourceFiles.map((f, i) => (
            <li
              key={`${f.filename}-${i}`}
              className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300"
            >
              <FileText size={12} /> {f.filename}
            </li>
          ))}
        </ul>
      )}

      <div>
        <label htmlFor="resume-text" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("resumePoolLabel")}
        </label>
        <textarea
          id="resume-text"
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          rows={14}
          placeholder={t("resumePoolPlaceholder")}
          className="w-full rounded-lg border border-gray-300 bg-white p-3 font-mono text-sm text-gray-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:placeholder:text-gray-600"
        />
      </div>
    </div>
  );
}
