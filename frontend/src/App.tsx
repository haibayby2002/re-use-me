import { useEffect } from "react";
import {
  FileEdit,
  FileText,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Trash2,
  Download,
  LayoutTemplate,
  RefreshCw,
  Moon,
  Sun,
  Languages,
} from "lucide-react";
import { useResumeStore } from "./store/useResumeStore";
import { useUIStore } from "./store/useUIStore";
import { useTranslation } from "./i18n/useTranslation";
import { getConfig } from "./api/client";
import haicogihayLogo from "./assets/haicogihay-logo.png";
import haicogihayBanner from "./assets/haicogihay-banner.png";

const HAICOGIHAY_URL = "https://haicogihay.com";
import SectionNav, { type NavItem } from "./components/SectionNav";
import SectionShell from "./components/SectionShell";
import ResumeInput from "./components/ResumeInput";
import JDInput from "./components/JDInput";
import AnalyzeStep from "./components/AnalyzeStep";
import GapClosingFlow from "./components/GapClosingFlow";
import CleanupPass from "./components/CleanupPass";
import TemplatePreview from "./components/TemplatePreview";
import ExportPanel from "./components/ExportPanel";
import HistoryPanel from "./components/HistoryPanel";

function App() {
  const t = useTranslation();
  const resumeText = useResumeStore((s) => s.resumeText);
  const jdText = useResumeStore((s) => s.jdText);
  const matchResult = useResumeStore((s) => s.matchResult);
  const missingItems = useResumeStore((s) => s.missingItems);
  const irrelevantItems = useResumeStore((s) => s.irrelevantItems);
  const sections = useResumeStore((s) => s.sections);
  const llmEnabled = useResumeStore((s) => s.llmEnabled);
  const setLlmEnabled = useResumeStore((s) => s.setLlmEnabled);
  const startOver = useResumeStore((s) => s.startOver);

  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const language = useUIStore((s) => s.language);
  const setLanguage = useUIStore((s) => s.setLanguage);

  useEffect(() => {
    getConfig()
      .then((c) => setLlmEnabled(c.llmEnabled))
      .catch(() => setLlmEnabled(false));
  }, [setLlmEnabled]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const resumeReady = resumeText.trim().length > 0;
  const jdReady = jdText.trim().length > 0;
  const analyzed = matchResult !== null;
  const gapsReviewed = missingItems.length === 0 || missingItems.every((m) => m.userResponse !== null);
  const cleanupReviewed = irrelevantItems.length === 0 || irrelevantItems.every((i) => i.userDecision !== null);
  const hasSections = sections !== null;

  const jdUnlocked = resumeReady;
  const analyzeUnlocked = jdReady;
  const gapUnlocked = analyzed;
  const cleanupUnlocked = analyzed;
  const previewUnlocked = hasSections;
  const exportUnlocked = hasSections;

  const navItems: NavItem[] = [
    { id: "resume", label: t("navResume"), unlocked: true, done: resumeReady },
    { id: "jd", label: t("navJD"), unlocked: jdUnlocked, done: jdReady },
    { id: "analyze", label: t("navAnalyze"), unlocked: analyzeUnlocked, done: analyzed },
    { id: "gap-closing", label: t("navGapClosing"), unlocked: gapUnlocked, done: analyzed && gapsReviewed },
    { id: "cleanup", label: t("navCleanup"), unlocked: cleanupUnlocked, done: analyzed && cleanupReviewed },
    { id: "preview", label: t("navPreview"), unlocked: previewUnlocked, done: false },
    { id: "export", label: t("navExport"), unlocked: exportUnlocked, done: false },
  ];

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <a
              href={HAICOGIHAY_URL}
              target="_blank"
              rel="noopener noreferrer"
              title={t("brandLogoAlt")}
              className="shrink-0 rounded-full ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <img src={haicogihayLogo} alt={t("brandLogoAlt")} className="h-8 w-8 rounded-full object-cover" />
            </a>
            <span className="text-base font-bold text-gray-900 dark:text-gray-100">re-use-me</span>
            <span className="hidden text-sm text-gray-400 sm:inline dark:text-gray-500">{t("appTagline")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
              title={llmEnabled ? t("llmModeTitle") : t("ruleModeTitle")}
            >
              <ShieldCheck size={13} className={llmEnabled ? "text-brand-600" : "text-gray-400"} />
              <span className="hidden sm:inline">{llmEnabled ? t("llmAssistedMode") : t("ruleBasedMode")}</span>
            </div>
            <button
              type="button"
              onClick={() => setLanguage(language === "en" ? "vi" : "en")}
              title={t("languageToggle")}
              className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <Languages size={13} />
              {language === "en" ? "EN" : "VI"}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === "dark" ? t("themeToggleToLight") : t("themeToggleToDark")}
              className="flex items-center justify-center rounded-full bg-gray-100 p-1.5 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(t("startOverConfirm"))) {
                  startOver();
                }
              }}
              className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <RefreshCw size={12} /> <span className="hidden sm:inline">{t("startOver")}</span>
            </button>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-3 sm:px-6">
          <SectionNav items={navItems} />
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_260px]">
        <div className="space-y-6">
          <SectionShell id="resume" title={t("sectionResumeTitle")} icon={<FileEdit size={20} />}>
            <ResumeInput />
          </SectionShell>

          <SectionShell
            id="jd"
            title={t("sectionJDTitle")}
            icon={<FileText size={20} />}
            locked={!jdUnlocked}
            lockedMessage={t("lockedNeedResume")}
          >
            <JDInput />
          </SectionShell>

          <SectionShell
            id="analyze"
            title={t("sectionAnalysisTitle")}
            icon={<ScanSearch size={20} />}
            locked={!analyzeUnlocked}
            lockedMessage={t("lockedNeedJD")}
          >
            <AnalyzeStep />
          </SectionShell>

          <SectionShell
            id="gap-closing"
            title={t("sectionGapTitle")}
            icon={<Sparkles size={20} />}
            locked={!gapUnlocked}
            lockedMessage={t("lockedNeedAnalysis")}
          >
            <GapClosingFlow />
          </SectionShell>

          <SectionShell
            id="cleanup"
            title={t("sectionCleanupTitle")}
            icon={<Trash2 size={20} />}
            locked={!cleanupUnlocked}
            lockedMessage={t("lockedNeedAnalysis")}
          >
            <CleanupPass />
          </SectionShell>

          <SectionShell
            id="preview"
            title={t("sectionPreviewTitle")}
            icon={<LayoutTemplate size={20} />}
            locked={!previewUnlocked}
            lockedMessage={t("lockedNeedAnalysis")}
          >
            <TemplatePreview />
          </SectionShell>

          <SectionShell
            id="export"
            title={t("sectionExportTitle")}
            icon={<Download size={20} />}
            locked={!exportUnlocked}
            lockedMessage={t("lockedNeedAnalysis")}
          >
            <ExportPanel />
          </SectionShell>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <HistoryPanel />
        </aside>
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-6 text-center sm:px-6">
        <a
          href={HAICOGIHAY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-2 inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400"
        >
          <span>{t("footerBuiltBy")}</span>
          <img src={haicogihayBanner} alt={t("brandBannerAlt")} className="h-5 w-auto" />
        </a>
        <p className="text-xs text-gray-400 dark:text-gray-600">{t("footer")}</p>
      </footer>
    </div>
  );
}

export default App;
