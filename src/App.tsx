import React, { useState, useEffect } from "react";
import { AppState, ActiveModule } from "./types";
import Sidebar from "./components/Sidebar";
import TextUtilities from "./components/TextUtilities";
import CompareMerge from "./components/CompareMerge";
import DataConverterHtml from "./components/DataConverterHtml";

const STORAGE_KEY = "vibe_code_aio_state";

const HASH_MAP: Record<string, ActiveModule> = {
  // Text Utilities hashes
  "#text-utilities": ActiveModule.TEXT_UTILS,
  "#text_utils": ActiveModule.TEXT_UTILS,
  "#text-utils": ActiveModule.TEXT_UTILS,
  "#text": ActiveModule.TEXT_UTILS,
  "#tien-ich-text": ActiveModule.TEXT_UTILS,
  "#tien-ich-van-ban": ActiveModule.TEXT_UTILS,

  // Compare & Merge hashes
  "#compare-merge": ActiveModule.COMPARE_MERGE,
  "#compare_merge": ActiveModule.COMPARE_MERGE,
  "#compare": ActiveModule.COMPARE_MERGE,
  "#merge": ActiveModule.COMPARE_MERGE,
  "#so-sanh-gop": ActiveModule.COMPARE_MERGE,
  "#so-sanh": ActiveModule.COMPARE_MERGE,

  // Data Converter hashes
  "#data-converter": ActiveModule.DATA_CONVERTER,
  "#data_converter": ActiveModule.DATA_CONVERTER,
  "#converter": ActiveModule.DATA_CONVERTER,
  "#sandbox": ActiveModule.DATA_CONVERTER,
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
    htmlSingleInput: "<!-- Single Mode HTML -->\n<div class='card'>\n  <h2>Dynamic Preview Card</h2>\n  <p>Pasted as single fully bundled code block.</p>\n</div>",
    htmlSplitInput: "<div class='greeting'>\n  <h3>Welcome to Vibe Code Sandbox!</h3>\n  <p>Modify HTML, CSS, and JS side-by-side to see immediate updates.</p>\n  <button id='action-btn'>Click Me</button>\n</div>",
    cssSplitInput: "body {\n  font-family: system-ui, -apple-system, sans-serif;\n  background: #0f172a;\n  color: #f8fafc;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  height: 100vh;\n  margin: 0;\n}\n.greeting {\n  text-align: center;\n  padding: 2.5rem;\n  background: #1e293b;\n  border: 1px solid #334155;\n  border-radius: 1.5rem;\n  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);\n}\nbutton {\n  background: #6366f1;\n  color: white;\n  border: none;\n  padding: 0.6rem 1.2rem;\n  font-weight: bold;\n  border-radius: 0.5rem;\n  cursor: pointer;\n  margin-top: 1rem;\n  transition: opacity 0.2s;\n}\nbutton:hover {\n  opacity: 0.9;\n}",
    jsSplitInput: "const btn = document.getElementById('action-btn');\nif (btn) {\n  btn.addEventListener('click', () => {\n    console.log('Button interactive click action!');\n  });\n}",
  }
};

export default function App() {
  const [state, setState] = useState<AppState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
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

  // Sync state.activeModule back to URL hash
  useEffect(() => {
    const canonicalHash =
      state.activeModule === ActiveModule.TEXT_UTILS
        ? "tien-ich-text"
        : state.activeModule === ActiveModule.COMPARE_MERGE
        ? "so-sanh-gop"
        : "chuyen-doi-du-lieu";

    if (window.location.hash !== `#${canonicalHash}`) {
      window.location.hash = canonicalHash;
    }
  }, [state.activeModule]);

  const handleModuleStateChange = <K extends keyof AppState>(
    moduleKey: K,
    updatedModuleState: any
  ) => {
    setState((prev) => ({
      ...prev,
      [moduleKey]: {
        ...prev[moduleKey],
        ...updatedModuleState,
      },
    }));
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans bg-slate-50 text-slate-800 dark:bg-[#0B0F1A] dark:text-slate-300 transition-colors duration-200">
      {/* Sidebar Navigation */}
      <Sidebar
        activeModule={state.activeModule}
        setActiveModule={(mod) => {
          const canonicalHash =
            mod === ActiveModule.TEXT_UTILS
              ? "tien-ich-text"
              : mod === ActiveModule.COMPARE_MERGE
              ? "so-sanh-gop"
              : "chuyen-doi-du-lieu";
          window.location.hash = canonicalHash;
        }}
        theme={state.theme}
        toggleTheme={toggleTheme}
      />

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
    </div>
  );
}
