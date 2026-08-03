import React, { useState, useEffect } from "react";
import { AppState, ActiveModule } from "./types";
import Sidebar from "./components/Sidebar";
import TextAndCompareSuite from "./components/TextAndCompareSuite";
import DataConverterHtml from "./components/DataConverterHtml";
import ExcelSuite from "./components/ExcelSuite";
import DocScannerPdf from "./components/DocScannerPdf";
import PdfMerge from "./components/PdfMerge";
import PdfSplit from "./components/PdfSplit";
import PdfEdit from "./components/PdfEdit";
import FileManagerSuite from "./components/FileManagerSuite";
import FileConverter from "./components/FileConverter";
import { I18nProvider, useI18n } from "./utils/i18n";
import { parseRoute } from "./utils/navigation";
import { Menu, Sun, Moon, Sliders } from "lucide-react";
import { ToastContainer } from "react-toastify";
import { ScrollToTop } from "./components/ScrollToTop";
import "react-toastify/dist/ReactToastify.css";

const STORAGE_KEY = "vibe_code_aio_state";

const DEFAULT_STATE: AppState = {
  theme: "dark",
  activeModule: ActiveModule.TEXT_SUITE,
  textUtils: {
    inputText: "Line 1: Hello World\nLine 2: Web Developer\nLine 3: Google AI Studio\nLine 1: Hello World\nLine 4: Happy Coding",
    countSpaces: true,
    countEmptyLines: false,
    findQuery: "Line",
    replaceQuery: "Record",
    isRegex: false,
  },
  compareMerge: {
    diffOriginal: "const server = '0.0.0.0';\nconst port = 3000;\n\nconsole.log('Server started on ' + server + ':' + port);",
    diffModified: "const server = '127.0.0.1';\nconst port = 3000;\nconst ssl = true;\n\nconsole.log('Secure server started on ' + server + ':' + port);",
    combineCol1: "admin_user\ntest_developer\nlead_architect",
    combineCol2: "pass_123\npass_developer\npass_arch",
    combineDelimiter: " | ",
    autoIncTemplate: "user_[x]_dev",
    autoIncStart: 1,
    autoIncStep: 1,
    autoIncCount: 10,
  },
  dataConverter: {
    rawJson: JSON.stringify([
      { id: "USR-001", name: "David", role: "Frontend Lead", active: "True" },
      { id: "USR-002", name: "Sarah", role: "UI Designer", active: "True" },
      { id: "USR-003", name: "Kevin", role: "Backend Dev", active: "False" }
    ], null, 2),
    rawCsv: "id,name,role,active\nUSR-001,David,Frontend Lead,True\nUSR-002,Sarah,UI Designer,True\nUSR-003,Kevin,Backend Dev,False",
    labelValueMode: false,
    lockEdit: false,
    activeFormatType: "json",
    formatInput: "{\n  \"title\": \"Vibe Code Workspace\",\n  \"version\": \"2.4.4\",\n  \"features\": [\n    \"Text Processing\",\n    \"Diff Checker\",\n    \"Excel Split & Validate\",\n    \"Document Perspective Scanner\",\n    \"Metadata Timestamp Editor\",\n    \"Universal File Converter\"\n  ]\n}",
    htmlPreviewMode: "split",
    htmlSingleInput: "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <style>\n    body {\n      font-family: system-ui, -apple-system, sans-serif;\n      background: #0f172a;\n      color: #f8fafc;\n      display: flex;\n      justify-content: center;\n      align-items: center;\n      height: 100vh;\n      margin: 0;\n    }\n    .greeting {\n      text-align: center;\n      padding: 2.5rem;\n      background: #1e293b;\n      border: 1px solid #334155;\n      border-radius: 1.5rem;\n      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);\n    }\n    button {\n      background: #6366f1;\n      color: white;\n      border: none;\n      padding: 0.6rem 1.2rem;\n      font-weight: bold;\n      border-radius: 0.5rem;\n      cursor: pointer;\n      margin-top: 1rem;\n      transition: opacity 0.2s;\n    }\n    button:hover {\n      opacity: 0.9;\n    }\n  </style>\n</head>\n<body>\n  <div class=\"greeting\">\n    <h3>Welcome to Live HTML Runner!</h3>\n    <p>Modify HTML, CSS, and JS side-by-side with instant live rendering.</p>\n    <button id=\"action-btn\">Click Interactive Button</button>\n  </div>\n  <script>\n    const btn = document.getElementById(\"action-btn\");\n    if (btn) {\n      btn.addEventListener(\"click\", () => {\n        alert(\"Interactive button executed successfully!\");\n      });\n    }\n  </script>\n</body>\n</html>",
    htmlSplitInput: "<div class='greeting'>\n  <h3>Welcome to Live HTML Runner!</h3>\n  <p>Modify HTML, CSS, and JS side-by-side with instant live rendering.</p>\n  <button id='action-btn'>Click Interactive Button</button>\n</div>",
    cssSplitInput: "body {\n  font-family: system-ui, -apple-system, sans-serif;\n  background: #0f172a;\n  color: #f8fafc;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  height: 100vh;\n  margin: 0;\n}\n.greeting {\n  text-align: center;\n  padding: 2.5rem;\n  background: #1e293b;\n  border: 1px solid #334155;\n  border-radius: 1.5rem;\n  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);\n}\nbutton {\n  background: #6366f1;\n  color: white;\n  border: none;\n  padding: 0.6rem 1.2rem;\n  font-weight: bold;\n  border-radius: 0.5rem;\n  cursor: pointer;\n  margin-top: 1rem;\n  transition: opacity 0.2s;\n}\nbutton:hover {\n  opacity: 0.9;\n}",
    jsSplitInput: "const btn = document.getElementById('action-btn');\nif (btn) {\n  btn.addEventListener('click', () => {\n    alert('Interactive button executed successfully!');\n  });\n}",
  },
  excelSplitter: {
    maxRecordsPerFile: 50,
    showErrorsOnly: false,
    pageSize: 10,
    exportFormat: "zip",
  },
  excelMerger: {
    pageSize: 10,
  },
  fileRenamer: {
    prefix: "",
    suffix: "",
    findStr: "",
    replaceStr: "",
    enableNumbering: false,
    numberingPattern: "[name]_[x]",
    startNumber: 1,
    stepNumber: 1,
    zeroPadding: 2,
    caseMode: "original",
    extensionCase: "original",
  },
  dirAggregator: {
    searchQuery: "",
    diacriticSensitive: false,
    caseSensitive: false,
  },
};

function MainApp() {
  const { lang, setLang } = useI18n();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Initialize Route Parsing
  const initialRoute = parseRoute(window.location.pathname);

  const [currentMainSlug, setCurrentMainSlug] = useState<string>(initialRoute.mainSlug);
  const [currentSubSlug, setCurrentSubSlug] = useState<string>(initialRoute.subSlug);

  const [state, setState] = useState<AppState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_STATE,
          ...parsed,
          activeModule: initialRoute.activeModule,
        };
      }
    } catch (e) {
      console.warn("Could not parse stored app state", e);
    }
    return {
      ...DEFAULT_STATE,
      activeModule: initialRoute.activeModule,
    };
  });

  // Execute initial redirect if needed (e.g. empty hash or /main-slug without sub-slug)
  useEffect(() => {
    const routeInfo = parseRoute(window.location.pathname);
    if (routeInfo.shouldRedirect) {
      window.history.replaceState(null, "", routeInfo.targetPath);
    }
    setCurrentMainSlug(routeInfo.mainSlug);
    setCurrentSubSlug(routeInfo.subSlug);
    setState((prev) => ({ ...prev, activeModule: routeInfo.activeModule }));
  }, []);

  // Listen for path changes
  useEffect(() => {
    const handleLocationChange = () => {
      const routeInfo = parseRoute(window.location.pathname);
      if (routeInfo.shouldRedirect) {
        window.history.replaceState(null, "", routeInfo.targetPath);
      }
      setCurrentMainSlug(routeInfo.mainSlug);
      setCurrentSubSlug(routeInfo.subSlug);
      setState((prev) => (prev.activeModule === routeInfo.activeModule ? prev : { ...prev, activeModule: routeInfo.activeModule }));
    };

    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  // Persist state changes to Local Storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Apply dark mode class to root HTML element
  useEffect(() => {
    const root = document.documentElement;
    if (state.theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [state.theme]);

  const toggleTheme = () => {
    setState((prev) => ({
      ...prev,
      theme: prev.theme === "dark" ? "light" : "dark",
    }));
  };

  const handleModuleStateChange = <K extends keyof AppState>(
    moduleKey: K,
    updatedModuleState: any
  ) => {
    setState((prev) => ({
      ...prev,
      [moduleKey]: {
        ...(prev[moduleKey] as any),
        ...updatedModuleState,
      },
    }));
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden font-sans bg-slate-50 text-slate-800 dark:bg-[#0B0F1A] dark:text-slate-300 transition-colors duration-200">
      {/* Mobile Top Header Bar */}
      <div className="flex md:hidden items-center justify-between px-4 py-3 bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800/80 shadow-xs z-20 flex-shrink-0">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
          title="Open Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <Sliders className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm text-slate-800 dark:text-slate-100 font-sans tracking-tight">
            Vibe Code Workstation
          </span>
          <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded-md font-bold">
            v2.9.0
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === "vi" ? "en" : "vi")}
            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer"
          >
            {lang === "vi" ? "🇻🇳" : "🇺🇸"}
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="Toggle Theme"
          >
            {state.theme === "dark" ? (
              <Sun className="h-4.5 w-4.5 text-amber-400" />
            ) : (
              <Moon className="h-4.5 w-4.5 text-indigo-600" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-xs md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation (Responsive: overlay on mobile, static on desktop) */}
      <div className={`fixed inset-y-0 left-0 z-40 md:relative md:translate-x-0 transform transition-transform duration-300 h-full ${
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <Sidebar
          currentMainSlug={currentMainSlug}
          currentSubSlug={currentSubSlug}
          theme={state.theme}
          toggleTheme={toggleTheme}
          onCloseMobileDrawer={() => setIsMobileMenuOpen(false)}
        />
      </div>

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {state.activeModule === ActiveModule.TEXT_SUITE && (
          <TextAndCompareSuite
            textState={state.textUtils}
            onTextChange={(subState) => handleModuleStateChange("textUtils", subState)}
            compareState={state.compareMerge}
            onCompareChange={(subState) => handleModuleStateChange("compareMerge", subState)}
            subSlug={currentSubSlug}
          />
        )}
        {state.activeModule === ActiveModule.DATA_CONVERTER && (
          <DataConverterHtml
            state={state.dataConverter}
            onChange={(subState) => handleModuleStateChange("dataConverter", subState)}
            subSlug={currentSubSlug}
          />
        )}
        {state.activeModule === ActiveModule.EXCEL_SUITE && (
          <ExcelSuite
            splitterState={state.excelSplitter}
            onSplitterChange={(subState) => handleModuleStateChange("excelSplitter", subState)}
            mergerState={state.excelMerger}
            onMergerChange={(subState) => handleModuleStateChange("excelMerger", subState)}
            dirAggregatorState={state.dirAggregator}
            onDirAggregatorChange={(subState) => handleModuleStateChange("dirAggregator", subState)}
            subSlug={currentSubSlug}
          />
        )}
        {state.activeModule === ActiveModule.DOCUMENT_SCANNER && (
          currentSubSlug === "merge-pdf" ? (
            <PdfMerge />
          ) : currentSubSlug === "split-pdf" ? (
            <PdfSplit />
          ) : currentSubSlug === "edit-pdf" ? (
            <PdfEdit />
          ) : (
            <DocScannerPdf subSlug={currentSubSlug} />
          )
        )}
        {state.activeModule === ActiveModule.FILE_MANAGER && (
          <FileManagerSuite
            renamerState={state.fileRenamer}
            onRenamerChange={(subState) => handleModuleStateChange("fileRenamer", subState)}
            metadataState={state.fileMetadata}
            onMetadataChange={(subState) => handleModuleStateChange("fileMetadata", subState)}
            subSlug={currentSubSlug}
          />
        )}
        {state.activeModule === ActiveModule.FILE_CONVERTER && (
          <FileConverter subSlug={currentSubSlug} />
        )}
      </main>
      
      <ScrollToTop />
      <ToastContainer 
        aria-label="Notifications"
        position="bottom-right" 
        autoClose={3000} 
        hideProgressBar={false} 
        newestOnTop 
        closeOnClick 
        rtl={false} 
        pauseOnFocusLoss 
        draggable 
        pauseOnHover 
        theme={state.theme === "dark" ? "dark" : "light"} 
      />
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider initialLang="vi">
      <MainApp />
    </I18nProvider>
  );
}
