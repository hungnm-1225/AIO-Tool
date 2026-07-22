import React, { useState, useEffect } from "react";
import { AppState, ActiveModule } from "./types";
import Sidebar from "./components/Sidebar";
import TextUtilities from "./components/TextUtilities";
import CompareMerge from "./components/CompareMerge";
import DataConverterHtml from "./components/DataConverterHtml";
import { Menu, Sun, Moon, Sliders } from "lucide-react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const STORAGE_KEY = "vibe_code_aio_state";

const HASH_MAP: Record<string, ActiveModule> = {
  "#case-converter": ActiveModule.TEXT_UTILS,
  "#text-utilities": ActiveModule.TEXT_UTILS,
  "#string-cutter": ActiveModule.TEXT_UTILS,
  "#compare-text": ActiveModule.COMPARE_MERGE,
  "#merge-columns": ActiveModule.COMPARE_MERGE,
  "#auto-increment": ActiveModule.COMPARE_MERGE,
  "#formatter": ActiveModule.DATA_CONVERTER,
  "#data-converter": ActiveModule.DATA_CONVERTER,
  "#data_converter": ActiveModule.DATA_CONVERTER,
  "#chuyen-doi-du-lieu": ActiveModule.DATA_CONVERTER,
  "#chuyen-doi": ActiveModule.DATA_CONVERTER,
};

const DEFAULT_STATE: AppState = {
  theme: "dark",
  activeModule: ActiveModule.TEXT_UTILS,
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
    formatInput: "{\n  \"title\": \"Vibe Code AIO\",\n  \"version\": 1.0,\n  \"features\": [\n    \"Text processing\",\n    \"Diff checker\",\n    \"Grid table\",\n    \"HTML runner\"\n  ]\n}",
    htmlPreviewMode: "split",
    htmlSingleInput: "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <style>\n    body {\n      font-family: system-ui, -apple-system, sans-serif;\n      background: #0f172a;\n      color: #f8fafc;\n      display: flex;\n      justify-content: center;\n      align-items: center;\n      height: 100vh;\n      margin: 0;\n    }\n    .greeting {\n      text-align: center;\n      padding: 2.5rem;\n      background: #1e293b;\n      border: 1px solid #334155;\n      border-radius: 1.5rem;\n      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);\n    }\n    button {\n      background: #6366f1;\n      color: white;\n      border: none;\n      padding: 0.6rem 1.2rem;\n      font-weight: bold;\n      border-radius: 0.5rem;\n      cursor: pointer;\n      margin-top: 1rem;\n      transition: opacity 0.2s;\n    }\n    button:hover {\n      opacity: 0.9;\n    }\n  </style>\n</head>\n<body>\n  <div class=\"greeting\">\n    <h3>Welcome to Vibe Code Sandbox!</h3>\n    <p>Modify HTML, CSS, and JS side-by-side to see immediate updates.</p>\n    <button id=\"action-btn\">Click Me</button>\n  </div>\n  <script>\n    const btn = document.getElementById(\"action-btn\");\n    if (btn) {\n      btn.addEventListener(\"click\", () => {\n        console.log(\"Button interactive click action!\");\n      });\n    }\n  </script>\n</body>\n</html>",
    htmlSplitInput: "<div class='greeting'>\n  <h3>Welcome to Vibe Code Sandbox!</h3>\n  <p>Modify HTML, CSS, and JS side-by-side to see immediate updates.</p>\n  <button id='action-btn'>Click Me</button>\n</div>",
    cssSplitInput: "body {\n  font-family: system-ui, -apple-system, sans-serif;\n  background: #0f172a;\n  color: #f8fafc;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  height: 100vh;\n  margin: 0;\n}\n.greeting {\n  text-align: center;\n  padding: 2.5rem;\n  background: #1e293b;\n  border: 1px solid #334155;\n  border-radius: 1.5rem;\n  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);\n}\nbutton {\n  background: #6366f1;\n  color: white;\n  border: none;\n  padding: 0.6rem 1.2rem;\n  font-weight: bold;\n  border-radius: 0.5rem;\n  cursor: pointer;\n  margin-top: 1rem;\n  transition: opacity 0.2s;\n}\nbutton:hover {\n  opacity: 0.9;\n}",
    jsSplitInput: "const btn = document.getElementById('action-btn');\nif (btn) {\n  btn.addEventListener('click', () => {\n    console.log('Button interactive click action!');\n  });\n}",
  },
};

export default function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [state, setState] = useState<AppState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_STATE,
          ...parsed,
        };
      }
    } catch (e) {
      console.warn("Could not parse stored app state", e);
    }
    return DEFAULT_STATE;
  });

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

  // Sync state.activeModule based on URL Hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash) {
        const matchedModule = HASH_MAP[hash];
        if (matchedModule && matchedModule !== state.activeModule) {
          setState((prev) => ({ ...prev, activeModule: matchedModule }));
        }
      }
    };

    // Run on initial load to support direct deep-linking
    handleHashChange();

    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [state.activeModule]);

  // Sync state.activeModule back to URL hash safely without triggering events
  useEffect(() => {
    const canonicalHash =
      state.activeModule === ActiveModule.TEXT_UTILS
        ? "case-converter"
        : state.activeModule === ActiveModule.COMPARE_MERGE
        ? "compare-text"
        : "formatter";

    const currentHash = window.location.hash.toLowerCase();
    const matchedModule = HASH_MAP[currentHash];
    
    // Only overwrite if current hash is empty or doesn't map to the active module at all
    if (!currentHash || matchedModule !== state.activeModule) {
      window.history.replaceState(null, "", `#${canonicalHash}`);
    }
  }, [state.activeModule]);

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
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <Sliders className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm text-slate-800 dark:text-slate-100 font-sans tracking-tight">Vibe Code AIO</span>
        </div>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          {state.theme === "dark" ? (
            <Sun className="h-4.5 w-4.5 text-amber-400" />
          ) : (
            <Moon className="h-4.5 w-4.5 text-indigo-600" />
          )}
        </button>
      </div>

      {/* Mobile Drawer Overlay Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-xs md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation (Responsive: overlay on mobile, static on desktop) */}
      <div className={`fixed inset-y-0 left-0 z-40 md:relative md:translate-x-0 transform transition-transform duration-200 h-full ${
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <Sidebar
          activeModule={state.activeModule}
          setActiveModule={(mod) => {
            const canonicalHash =
              mod === ActiveModule.TEXT_UTILS
                ? "case-converter"
                : mod === ActiveModule.COMPARE_MERGE
                ? "compare-text"
                : "formatter";
            window.location.hash = canonicalHash;
            setIsMobileMenuOpen(false); // Auto-close drawer on selection!
          }}
          theme={state.theme}
          toggleTheme={toggleTheme}
          onCloseMobileDrawer={() => setIsMobileMenuOpen(false)}
        />
      </div>

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {state.activeModule === ActiveModule.TEXT_UTILS && (
          <TextUtilities
            state={state.textUtils}
            onChange={(subState) => handleModuleStateChange("textUtils", subState)}
          />
        )}
        {state.activeModule === ActiveModule.COMPARE_MERGE && (
          <CompareMerge
            state={state.compareMerge}
            onChange={(subState) => handleModuleStateChange("compareMerge", subState)}
          />
        )}
        {state.activeModule === ActiveModule.DATA_CONVERTER && (
          <DataConverterHtml
            state={state.dataConverter}
            onChange={(subState) => handleModuleStateChange("dataConverter", subState)}
          />
        )}
      </main>
      
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
