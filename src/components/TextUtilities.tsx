import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { TextUtilsState } from "../types";
import { useI18n } from "../utils/i18n";
import { 
  Copy, 
  Check, 
  Trash2, 
  Search, 
  ArrowUpDown,
  Filter,
  CheckCircle,
  Type,
  Scissors,
  HelpCircle,
  Info
} from "lucide-react";

interface TextUtilitiesProps {
  state: TextUtilsState;
  onChange: (newState: Partial<TextUtilsState>) => void;
}

export default function TextUtilities({ state, onChange }: TextUtilitiesProps) {
  const { t } = useI18n();
  // Sub-tab navigation
  const [activeSubTab, setActiveSubTab] = useState<"case-converter" | "text-utilities" | "string-cutter">("case-converter");

  // State for Case Converter
  const [caseInputText, setCaseInputText] = useState("Vibe Code AIO - Universal Developer Toolset\nHello Google AI Studio!\nJavascript & Typescript React App");
  const [caseOutputText, setCaseOutputText] = useState("");
  const [activeCaseFormat, setActiveCaseFormat] = useState<string>("");
  const [caseCopied, setCaseCopied] = useState(false);

  // State for Line Slicer / Cutter
  const [slicerInputText, setSlicerInputText] = useState("john.doe@company.com\nsarah.smith@organization.org\nalex.developer@techhub.io\nmarketing.team@globalcorp.net");
  const [slicerOutputText, setSlicerOutputText] = useState("");
  const [sliceLength, setSliceLength] = useState<number>(19);
  const [slicePosition, setSlicePosition] = useState<"start" | "end">("start");
  const [slicerFindQuery, setSlicerFindQuery] = useState("@");
  const [slicerReplaceQuery, setSlicerReplaceQuery] = useState(" [at] ");
  const [slicerIsRegex, setSlicerIsRegex] = useState(false);
  const [slicerMatchCase, setSlicerMatchCase] = useState(false);
  const [slicerCopied, setSlicerCopied] = useState(false);

  // Existing Text Utilities output & state
  const [outputText, setOutputText] = useState("");
  const [copied, setCopied] = useState(false);
  const [originalTextBackup, setOriginalTextBackup] = useState("");
  const [lastUnsortedText, setLastUnsortedText] = useState("");
  const [activeFilter, setActiveFilter] = useState<"none" | "remove" | "frequency" | "uniques">("none");
  const [activeSort, setActiveSort] = useState<"none" | "original" | "ascending" | "descending" | "shuffle">("original");

  // Keep a backup of original order lines
  useEffect(() => {
    if (!originalTextBackup && state.inputText) {
      setOriginalTextBackup(state.inputText);
    }
  }, [state.inputText, originalTextBackup]);

  // Synchronize active sub-tab from hash
  useEffect(() => {
    const syncSubTab = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === "#case-converter" || hash === "#case_converter" || hash === "#case") {
        setActiveSubTab("case-converter");
      } else if (hash === "#text-utilities" || hash === "#text_utils" || hash === "#text-utils" || hash === "#text") {
        setActiveSubTab("text-utilities");
      } else if (hash === "#string-cutter" || hash === "#line-slicer" || hash === "#cutter" || hash === "#slicer") {
        setActiveSubTab("string-cutter");
      }
    };

    syncSubTab();

    window.addEventListener("hashchange", syncSubTab);
    return () => window.removeEventListener("hashchange", syncSubTab);
  }, []);

  const handleSubTabChange = (tab: "case-converter" | "text-utilities" | "string-cutter") => {
    setActiveSubTab(tab);
    window.location.hash = tab;
  };

  const showToast = (msg: string, type: "success" | "error" | "info" | "warning" = "info") => {
    toast[type](msg);
  };

  // Helper to copy text to clipboard
  const copyToClipboard = async (text: string, setCopiedState: (val: boolean) => void) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedState(true);
      showToast("Copied to clipboard!");
      setTimeout(() => setCopiedState(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  // 1. Text Counts Calculations (Helper for count panels)
  const getCounts = (text: string, countSpaces: boolean, countEmpty: boolean) => {
    let charCount = 0;
    if (countSpaces) {
      charCount = text.length;
    } else {
      charCount = text.replace(/\s/g, "").length;
    }

    const lines = text.split(/\r?\n/);
    let lineCount = 0;
    if (countEmpty) {
      lineCount = text === "" ? 0 : lines.length;
    } else {
      lineCount = lines.filter(line => line.trim() !== "").length;
    }

    const words = text.trim().split(/\s+/).filter(word => word !== "");
    const wordCount = words.length;

    return { charCount, lineCount, wordCount };
  };

  // 2. Case Conversion Handlers
  const handleCaseConvert = (format: string) => {
    const text = caseInputText || "";
    if (!text) {
      showToast("Please enter text first!");
      return;
    }

    const lines = text.split(/\r?\n/);
    let resultLines = [...lines];

    switch (format) {
      case "UPPERCASE":
        resultLines = lines.map(line => line.toUpperCase());
        break;
      case "lowercase":
        resultLines = lines.map(line => line.toLowerCase());
        break;
      case "Capitalize":
        resultLines = lines.map(line => 
          line.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
        );
        break;
      case "camelCase":
        resultLines = lines.map(line => {
          const cleaned = line.replace(/[^a-zA-Z0-9\s-_]/g, '').trim();
          if (!cleaned) return "";
          return cleaned
            .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
            .replace(/^(.)/, c => c.toLowerCase());
        });
        break;
      case "snake_case":
        resultLines = lines.map(line => {
          return line
            .replace(/([a-z])([A-Z])/g, '$1_$2')
            .replace(/[^a-zA-Z0-9\s-_]/g, '')
            .trim()
            .replace(/[-\s]+/g, '_')
            .toLowerCase();
        });
        break;
      case "PascalCase":
        resultLines = lines.map(line => {
          const cleaned = line.replace(/[^a-zA-Z0-9\s-_]/g, '').trim();
          if (!cleaned) return "";
          return cleaned
            .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
            .replace(/^(.)/, c => c.toUpperCase());
        });
        break;
      case "kebab-case":
        resultLines = lines.map(line => {
          return line
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .replace(/[^a-zA-Z0-9\s-_]/g, '')
            .trim()
            .replace(/[_\s]+/g, '-')
            .toLowerCase();
        });
        break;
      default:
        break;
    }

    setCaseOutputText(resultLines.join("\n"));
    setActiveCaseFormat(format);
    showToast(`Converted to ${format}!`);
  };

  // 3. Slicer / Cutter Handlers
  const handleSliceText = () => {
    const text = slicerInputText || "";
    if (!text) {
      showToast("Please enter text first!");
      return;
    }

    const lines = text.split(/\r?\n/);
    const len = Number(sliceLength) || 0;

    const resultLines = lines.map(line => {
      if (slicePosition === "start") {
        return line.slice(0, len);
      } else {
        if (line.length <= len) return line;
        return line.slice(-len);
      }
    });

    setSlicerOutputText(resultLines.join("\n"));
    showToast(`Sliced lines to ${len} characters from ${slicePosition}!`);
  };

  const handleSlicerSearchReplace = () => {
    const baseText = slicerOutputText || slicerInputText || "";
    if (!baseText) {
      showToast("Please enter text first!", "warning");
      return;
    }
    const find = slicerFindQuery || "";
    const replace = slicerReplaceQuery || "";

    if (!find) {
      showToast("Please enter a search keyword!", "warning");
      return;
    }

    let newText = baseText;
    let matchCount = 0;

    try {
      if (slicerIsRegex) {
        const flags = "g" + (slicerMatchCase ? "" : "i");
        const regex = new RegExp(find, flags);
        const matches = baseText.match(regex);
        matchCount = matches ? matches.length : 0;
        if (matchCount > 0) {
          newText = baseText.replace(regex, replace);
        }
      } else {
        if (slicerMatchCase) {
          const parts = baseText.split(find);
          matchCount = parts.length - 1;
          if (matchCount > 0) {
            newText = parts.join(replace);
          }
        } else {
          const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escaped, "gi");
          const matches = baseText.match(regex);
          matchCount = matches ? matches.length : 0;
          if (matchCount > 0) {
            newText = baseText.replace(regex, replace);
          }
        }
      }

      if (matchCount === 0) {
        showToast(`No matches found for "${find}"!`, "warning");
      } else {
        setSlicerOutputText(newText);
        showToast(`Successfully replaced ${matchCount} occurrence(s) of "${find}"!`, "success");
      }
    } catch (err: any) {
      showToast(`Regex Syntax Error: ${err.message}`, "error");
    }
  };

  // 4. Existing Text Utilities Handlers
  const handleRemoveDuplicates = () => {
    const text = state.inputText || "";
    if (!text) {
      showToast("Please enter text first!");
      return;
    }
    const lines = text.split(/\r?\n/);
    const seen = new Set<string>();
    const uniqueLines: string[] = [];

    for (const line of lines) {
      if (!seen.has(line)) {
        seen.add(line);
        uniqueLines.push(line);
      }
    }
    const result = uniqueLines.join("\n");
    setOutputText(result);
    setLastUnsortedText(result);
    setActiveFilter("remove");
    setActiveSort("original");
    showToast("Duplicate lines removed!");
  };

  const handleRemoveEmptyLines = () => {
    const text = state.inputText || "";
    if (!text) {
      showToast("Please enter text first!");
      return;
    }
    const lines = text.split(/\r?\n/);
    const cleanedLines = lines.filter(line => line.trim() !== "");
    const result = cleanedLines.join("\n");
    setOutputText(result);
    setLastUnsortedText(result);
    showToast("Empty lines removed!");
  };

  const handleCountFrequency = () => {
    const text = state.inputText || "";
    if (!text) {
      showToast("Please enter text first!");
      return;
    }
    const lines = text.split(/\r?\n/);
    const frequencyMap: { [key: string]: number } = {};
    const order: string[] = [];

    for (const line of lines) {
      if (frequencyMap[line] === undefined) {
        frequencyMap[line] = 0;
        order.push(line);
      }
      frequencyMap[line]++;
    }

    const reportLines = order.map(line => `[x${frequencyMap[line]}] ${line}`);
    const result = reportLines.join("\n");
    setOutputText(result);
    setLastUnsortedText(result);
    setActiveFilter("frequency");
    setActiveSort("original");
    showToast("Line frequencies calculated!");
  };

  const handleFilterUniques = () => {
    const text = state.inputText || "";
    if (!text) {
      showToast("Please enter text first!");
      return;
    }
    const lines = text.split(/\r?\n/);
    const frequencyMap: { [key: string]: number } = {};

    for (const line of lines) {
      frequencyMap[line] = (frequencyMap[line] || 0) + 1;
    }

    const strictlyUniques = lines.filter(line => frequencyMap[line] === 1);
    const result = strictlyUniques.join("\n");
    setOutputText(result);
    setLastUnsortedText(result);
    setActiveFilter("uniques");
    setActiveSort("original");
    showToast("Strictly unique lines filtered!");
  };

  const handleSort = (type: "original" | "ascending" | "descending" | "shuffle") => {
    const baseText = outputText || state.inputText || "";
    if (!baseText) {
      showToast("Please enter text first!");
      return;
    }

    if (type === "original") {
      setActiveSort("original");
      const restored = lastUnsortedText || state.inputText || "";
      setOutputText(restored);
      showToast("Restored to original order!");
      return;
    }

    if (activeSort === "original" || activeSort === "none") {
      setLastUnsortedText(baseText);
    }

    const lines = baseText.split(/\r?\n/);
    let sortedLines: string[] = [];

    if (type === "ascending") {
      sortedLines = [...lines].sort((a, b) => a.localeCompare(b));
      setActiveSort("ascending");
      showToast("Sorted ascending (A → Z)!");
    } else if (type === "descending") {
      sortedLines = [...lines].sort((a, b) => b.localeCompare(a));
      setActiveSort("descending");
      showToast("Sorted descending (Z → A)!");
    } else if (type === "shuffle") {
      sortedLines = [...lines];
      for (let i = sortedLines.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sortedLines[i], sortedLines[j]] = [sortedLines[j], sortedLines[i]];
      }
      setActiveSort("shuffle");
      showToast("Shuffled lines randomly!");
    }

    setOutputText(sortedLines.join("\n"));
  };

  const handleSearchReplace = () => {
    const baseText = outputText || state.inputText || "";
    if (!baseText) {
      showToast("Please enter text first!", "warning");
      return;
    }
    const find = state.findQuery || "";
    const replace = state.replaceQuery || "";

    if (!find) {
      showToast("Please enter a search keyword!", "warning");
      return;
    }

    let newText = baseText;
    let matchCount = 0;

    try {
      if (state.isRegex) {
        const flags = "g" + (state.matchCase ? "" : "i");
        const regex = new RegExp(find, flags);
        const matches = baseText.match(regex);
        matchCount = matches ? matches.length : 0;
        if (matchCount > 0) {
          newText = baseText.replace(regex, replace);
        }
      } else {
        if (state.matchCase) {
          const parts = baseText.split(find);
          matchCount = parts.length - 1;
          if (matchCount > 0) {
            newText = parts.join(replace);
          }
        } else {
          const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escaped, "gi");
          const matches = baseText.match(regex);
          matchCount = matches ? matches.length : 0;
          if (matchCount > 0) {
            newText = baseText.replace(regex, replace);
          }
        }
      }

      if (matchCount === 0) {
        showToast(`No matches found for "${find}"!`, "warning");
      } else {
        setOutputText(newText);
        setLastUnsortedText(newText);
        setActiveSort("original");
        showToast(`Successfully replaced ${matchCount} occurrence(s) of "${find}"!`, "success");
      }
    } catch (err: any) {
      showToast(`Regex Syntax Error: ${err.message}`, "error");
    }
  };

  // Pre-calculate count states
  const textCounts = getCounts(state.inputText || "", state.countSpaces, state.countEmptyLines);
  const caseCounts = getCounts(caseInputText, true, false);
  const slicerCounts = getCounts(slicerInputText, true, false);

  return (
    <div className="flex-1 overflow-auto bg-slate-50 dark:bg-[#0B0F1A] p-6 space-y-6">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-5">
        <div>
          <h2 className="text-2xl font-bold font-sans tracking-tight text-slate-800 dark:text-slate-100">
            {t("textUtils.title")}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {t("textUtils.subtitle")}
          </p>
        </div>

        {/* Sub-tabs Navigation */}
        <div className="flex bg-slate-100 dark:bg-[#111827] p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/50 self-start md:self-center">
          <button
            onClick={() => handleSubTabChange("case-converter")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === "case-converter"
                ? "bg-white dark:bg-[#0B0F1A] text-slate-800 dark:text-slate-200 shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Type className="h-3.5 w-3.5" /> {t("textUtils.caseConverterTab")}
          </button>
          <button
            onClick={() => handleSubTabChange("text-utilities")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === "text-utilities"
                ? "bg-white dark:bg-[#0B0F1A] text-slate-800 dark:text-slate-200 shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Filter className="h-3.5 w-3.5" /> {t("textUtils.textUtilitiesTab")}
          </button>
          <button
            onClick={() => handleSubTabChange("string-cutter")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === "string-cutter"
                ? "bg-white dark:bg-[#0B0F1A] text-slate-800 dark:text-slate-200 shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Scissors className="h-3.5 w-3.5" /> {t("textUtils.stringCutterTab")}
          </button>
        </div>
      </div>

      {/* CASE CONVERTER TAB */}
      {activeSubTab === "case-converter" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in animate-duration-150">
          {/* Input Pane - Left */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col flex-1 min-h-[460px]">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-indigo-600 dark:text-indigo-400">
                  {t("textUtils.originalText")}
                </span>
                <button 
                  onClick={() => {
                    setCaseInputText("");
                    setCaseOutputText("");
                    setActiveCaseFormat("");
                    showToast("Cleared case input!");
                  }}
                  className="text-slate-400 hover:text-rose-500 transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  title="Clear input"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              
              <textarea
                className="w-full flex-1 p-4 bg-transparent text-slate-800 dark:text-slate-200 font-mono text-sm leading-relaxed resize-none focus:outline-none"
                placeholder={t("textUtils.placeholderInput")}
                value={caseInputText}
                onChange={(e) => {
                  setCaseInputText(e.target.value);
                  setActiveCaseFormat(""); // Reset highlight on edit
                }}
              />

              <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-[#0B0F1A]/50 rounded-b-2xl">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 p-2 rounded-xl shadow-2xs">
                    <div className="text-[10px] font-medium text-slate-400 mb-0.5">Characters</div>
                    <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono">{caseCounts.charCount}</div>
                  </div>
                  <div className="bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 p-2 rounded-xl shadow-2xs">
                    <div className="text-[10px] font-medium text-slate-400 mb-0.5">Words</div>
                    <div className="text-sm font-bold text-sky-600 dark:text-sky-400 font-mono">{caseCounts.wordCount}</div>
                  </div>
                  <div className="bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 p-2 rounded-xl shadow-2xs">
                    <div className="text-[10px] font-medium text-slate-400 mb-0.5">Lines</div>
                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">{caseCounts.lineCount}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Pane - Middle */}
          <div className="lg:col-span-2 flex flex-col space-y-4 justify-center">
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
              <h3 className="text-xs font-mono font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1.5">
                <Type className="h-3.5 w-3.5" /> {t("textUtils.caseModifiers")}
              </h3>

              <button
                onClick={() => handleCaseConvert("UPPERCASE")}
                className={`w-full text-xs font-semibold py-2.5 px-3 rounded-xl transition-all text-center cursor-pointer ${
                  activeCaseFormat === "UPPERCASE"
                    ? "bg-indigo-600 text-white shadow-xs font-bold border-indigo-600"
                    : "border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                UPPERCASE
              </button>

              <button
                onClick={() => handleCaseConvert("lowercase")}
                className={`w-full text-xs font-semibold py-2.5 px-3 rounded-xl transition-all text-center cursor-pointer ${
                  activeCaseFormat === "lowercase"
                    ? "bg-indigo-600 text-white shadow-xs font-bold border-indigo-600"
                    : "border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                lowercase
              </button>

              <button
                onClick={() => handleCaseConvert("Capitalize")}
                className={`w-full text-xs font-semibold py-2.5 px-3 rounded-xl transition-all text-center cursor-pointer ${
                  activeCaseFormat === "Capitalize"
                    ? "bg-indigo-600 text-white shadow-xs font-bold border-indigo-600"
                    : "border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                Capitalize
              </button>

              <button
                onClick={() => handleCaseConvert("camelCase")}
                className={`w-full text-xs font-semibold py-2.5 px-3 rounded-xl transition-all text-center cursor-pointer ${
                  activeCaseFormat === "camelCase"
                    ? "bg-indigo-600 text-white shadow-xs font-bold border-indigo-600"
                    : "border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                camelCase
              </button>

              <button
                onClick={() => handleCaseConvert("snake_case")}
                className={`w-full text-xs font-semibold py-2.5 px-3 rounded-xl transition-all text-center cursor-pointer ${
                  activeCaseFormat === "snake_case"
                    ? "bg-indigo-600 text-white shadow-xs font-bold border-indigo-600"
                    : "border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                snake_case
              </button>

              <button
                onClick={() => handleCaseConvert("PascalCase")}
                className={`w-full text-xs font-semibold py-2.5 px-3 rounded-xl transition-all text-center cursor-pointer ${
                  activeCaseFormat === "PascalCase"
                    ? "bg-indigo-600 text-white shadow-xs font-bold border-indigo-600"
                    : "border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                PascalCase
              </button>

              <button
                onClick={() => handleCaseConvert("kebab-case")}
                className={`w-full text-xs font-semibold py-2.5 px-3 rounded-xl transition-all text-center cursor-pointer ${
                  activeCaseFormat === "kebab-case"
                    ? "bg-indigo-600 text-white shadow-xs font-bold border-indigo-600"
                    : "border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                kebab-case
              </button>
            </div>
          </div>

          {/* Output Pane - Right */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col flex-1 min-h-[460px]">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400">
                  {t("textUtils.transformedOutput")}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(caseOutputText, setCaseCopied)}
                    disabled={!caseOutputText}
                    className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    title="Copy output"
                  >
                    {caseCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-emerald-500">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <textarea
                readOnly
                className="w-full flex-1 p-4 bg-slate-50/40 dark:bg-[#0B0F1A]/30 text-slate-800 dark:text-slate-300 font-mono text-sm leading-relaxed resize-none focus:outline-none"
                placeholder="Converted words will appear here in the chosen format..."
                value={caseOutputText}
              />

              <div className="p-3 bg-slate-50 dark:bg-[#0B0F1A]/50 rounded-b-2xl border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                <span>Output updates automatically on selection.</span>
                <span>Current lines: {caseOutputText ? caseOutputText.split(/\r?\n/).length : 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEXT & DUPLICATES TAB (ORIGINAL UTILITIES + IMPROVEMENT) */}
      {activeSubTab === "text-utilities" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in animate-duration-150">
          {/* Input Pane - Left */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col flex-1 min-h-[450px]">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-indigo-600 dark:text-indigo-400">
                  {t("textUtils.originalText")}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRemoveEmptyLines}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200/50 dark:border-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                    title="Remove empty lines from input"
                  >
                    {t("textUtils.removeEmptyLines")}
                  </button>
                  <button 
                    onClick={() => {
                      onChange({ inputText: "" });
                      setOriginalTextBackup("");
                      showToast("Cleared input text!");
                    }}
                    className="text-slate-400 hover:text-rose-500 transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    title="Clear input"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <textarea
                className="w-full flex-1 p-4 bg-transparent text-slate-800 dark:text-slate-200 font-mono text-sm leading-relaxed resize-none focus:outline-none"
                placeholder={t("textUtils.placeholderInput")}
                value={state.inputText ?? ""}
                onChange={(e) => {
                  onChange({ inputText: e.target.value });
                  if (!originalTextBackup) {
                    setOriginalTextBackup(e.target.value);
                  }
                }}
              />

              {/* Counts panel integrated */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-[#0B0F1A]/50 rounded-b-2xl">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 p-2.5 rounded-xl shadow-2xs">
                    <div className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-0.5">{t("textUtils.characters")}</div>
                    <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-mono">{textCounts.charCount}</div>
                  </div>
                  <div className="bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 p-2.5 rounded-xl shadow-2xs">
                    <div className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-0.5">{t("textUtils.words")}</div>
                    <div className="text-lg font-bold text-sky-600 dark:text-sky-400 font-mono">{textCounts.wordCount}</div>
                  </div>
                  <div className="bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 p-2.5 rounded-xl shadow-2xs">
                    <div className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-0.5">{t("textUtils.lines")}</div>
                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">{textCounts.lineCount}</div>
                  </div>
                </div>

                {/* Toggles for line and char counting */}
                <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-800/50 flex flex-wrap gap-x-6 gap-y-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={state.countSpaces}
                      onChange={(e) => onChange({ countSpaces: e.target.checked })}
                      className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{t("textUtils.countSpaces")}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={state.countEmptyLines}
                      onChange={(e) => onChange({ countEmptyLines: e.target.checked })}
                      className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{t("textUtils.countEmpty")}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Action Pane - Middle */}
          <div className="lg:col-span-2 flex flex-col space-y-4">
            {/* Duplicate Filters Card */}
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
              <h3 className="text-xs font-mono font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5" /> {t("textUtils.textUtilitiesTab")}
              </h3>
              <button
                onClick={handleRemoveDuplicates}
                title="Remove duplicate lines while preserving first occurrences"
                className={`w-full text-xs font-semibold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeFilter === "remove"
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs font-bold border-indigo-600"
                    : "border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                {t("textUtils.removeDuplicates")}
              </button>
              <button
                onClick={handleCountFrequency}
                title="Count occurrences of each line and prepend [xN] frequency count"
                className={`w-full text-xs font-semibold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeFilter === "frequency"
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs font-bold border-indigo-600"
                    : "border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                {t("textUtils.countFrequency")}
              </button>
              <button
                onClick={handleFilterUniques}
                title="Filter lines that appear strictly once in the dataset, discarding all duplicates"
                className={`w-full text-xs font-semibold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeFilter === "uniques"
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs font-bold border-indigo-600"
                    : "border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                {t("textUtils.filterUniques")}
              </button>
            </div>

            {/* Sorter Card */}
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-2.5">
              <h3 className="text-xs font-mono font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1.5">
                <ArrowUpDown className="h-3.5 w-3.5" /> Sort Options
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSort("ascending")}
                  title="Sort lines alphabetically from A to Z"
                  className={`text-xs font-medium py-2 px-2.5 rounded-lg border transition-colors cursor-pointer ${
                    activeSort === "ascending"
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-xs font-bold"
                      : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {t("textUtils.sortAscending")}
                </button>
                <button
                  onClick={() => handleSort("descending")}
                  title="Sort lines reverse-alphabetically from Z to A"
                  className={`text-xs font-medium py-2 px-2.5 rounded-lg border transition-colors cursor-pointer ${
                    activeSort === "descending"
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-xs font-bold"
                      : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {t("textUtils.sortDescending")}
                </button>
                <button
                  onClick={() => handleSort("shuffle")}
                  title="Randomly shuffle the line order"
                  className={`text-xs font-medium py-2 px-2.5 rounded-lg border transition-colors cursor-pointer ${
                    activeSort === "shuffle"
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-xs font-bold"
                      : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {t("textUtils.shuffleLines")}
                </button>
                <button
                  onClick={() => handleSort("original")}
                  title="Restore input lines back to their original sequence order"
                  className={`text-xs font-medium py-2 px-2.5 rounded-lg border transition-colors cursor-pointer ${
                    activeSort === "original"
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-xs font-bold"
                      : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {t("textUtils.resetOriginal")}
                </button>
              </div>
            </div>

            {/* Search and Replace Card */}
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
              <h3 className="text-xs font-mono font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5" /> {t("textUtils.findAndReplace")}
              </h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-sans font-bold uppercase text-slate-400 block">{t("textUtils.findWhat")}</label>
                  <input
                    type="text"
                    placeholder="Find pattern..."
                    value={state.findQuery ?? ""}
                    onChange={(e) => onChange({ findQuery: e.target.value })}
                    className="w-full p-2 text-xs border border-slate-200 dark:border-slate-800 bg-transparent rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-sans font-bold uppercase text-slate-400 block">{t("textUtils.replaceWith")}</label>
                  <input
                    type="text"
                    placeholder="Replacement text..."
                    value={state.replaceQuery ?? ""}
                    onChange={(e) => onChange({ replaceQuery: e.target.value })}
                    className="w-full p-2 text-xs border border-slate-200 dark:border-slate-800 bg-transparent rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                {/* Checkbox controls for Match Case & Regex Search */}
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                    <input
                      type="checkbox"
                      checked={state.matchCase ?? false}
                      onChange={(e) => onChange({ matchCase: e.target.checked })}
                      className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{t("textUtils.matchCase")}</span>
                  </label>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                      <input
                        type="checkbox"
                        checked={state.isRegex}
                        onChange={(e) => onChange({ isRegex: e.target.checked })}
                        className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{t("textUtils.useRegex")}</span>
                    </label>

                    {/* Info Icon with Tooltip */}
                    <div className="relative group cursor-help">
                      <HelpCircle className="h-4 w-4 text-indigo-500 hover:text-indigo-600 transition-colors" />
                      <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-72 p-3.5 bg-slate-900 text-slate-100 text-[11px] rounded-2xl shadow-2xl z-50 pointer-events-none border border-slate-700 font-sans leading-relaxed">
                        <p className="font-bold text-indigo-300 mb-1 flex items-center gap-1">
                          <Info className="h-3.5 w-3.5" /> What is Regex Search?
                        </p>
                        <p className="text-slate-300 mb-2 text-[10px]">
                          Advanced pattern search using regular expression syntax:
                        </p>
                        <ul className="space-y-1 text-slate-300 font-mono text-[10px]">
                          <li>• <span className="text-amber-300 font-bold">\d+</span> : Matches digit sequences (e.g., 123)</li>
                          <li>• <span className="text-amber-300 font-bold">[a-z]+</span> : Matches lowercase words</li>
                          <li>• <span className="text-amber-300 font-bold">^Line</span> : Lines starting with 'Line'</li>
                          <li>• <span className="text-amber-300 font-bold">End$</span> : Lines ending with 'End'</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleSearchReplace}
                  className="w-full text-xs font-semibold py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-100 transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {t("textUtils.replaceBtn")}
                </button>
              </div>
            </div>
          </div>

          {/* Output Pane - Right */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col flex-1 min-h-[450px]">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400">
                  {t("textUtils.transformedOutput")}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(outputText, setCopied)}
                    disabled={!outputText && !state.inputText}
                    className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    title="Copy output"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-emerald-500">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <textarea
                readOnly
                className="w-full flex-1 p-4 bg-slate-50/40 dark:bg-[#0B0F1A]/30 text-slate-800 dark:text-slate-300 font-mono text-sm leading-relaxed resize-none focus:outline-none"
                placeholder="Processed output will appear here after filtering, sorting, or replacing..."
                value={outputText}
              />

              <div className="p-3 bg-slate-50 dark:bg-[#0B0F1A]/50 rounded-b-2xl border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                <span>Output format maintains processed sequence.</span>
                <span>Current lines: {outputText ? outputText.split(/\r?\n/).length : 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LINE SLICER / CUTTER TAB */}
      {activeSubTab === "string-cutter" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in animate-duration-150">
          {/* Input Pane - Left */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col flex-1 min-h-[460px]">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-indigo-600 dark:text-indigo-400">
                  {t("textUtils.originalText")}
                </span>
                <button 
                  onClick={() => {
                    setSlicerInputText("");
                    setSlicerOutputText("");
                    showToast("Cleared slicer input!");
                  }}
                  className="text-slate-400 hover:text-rose-500 transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  title="Clear input"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              
              <textarea
                className="w-full flex-1 p-4 bg-transparent text-slate-800 dark:text-slate-200 font-mono text-sm leading-relaxed resize-none focus:outline-none"
                placeholder={t("textUtils.placeholderSlicer")}
                value={slicerInputText}
                onChange={(e) => setSlicerInputText(e.target.value)}
              />

              <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-[#0B0F1A]/50 rounded-b-2xl">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 p-2 rounded-xl shadow-2xs">
                    <div className="text-[10px] font-medium text-slate-400 mb-0.5">{t("textUtils.characters")}</div>
                    <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono">{slicerCounts.charCount}</div>
                  </div>
                  <div className="bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 p-2 rounded-xl shadow-2xs">
                    <div className="text-[10px] font-medium text-slate-400 mb-0.5">{t("textUtils.words")}</div>
                    <div className="text-sm font-bold text-sky-600 dark:text-sky-400 font-mono">{slicerCounts.wordCount}</div>
                  </div>
                  <div className="bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 p-2 rounded-xl shadow-2xs">
                    <div className="text-[10px] font-medium text-slate-400 mb-0.5">{t("textUtils.lines")}</div>
                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">{slicerCounts.lineCount}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Pane - Middle */}
          <div className="lg:col-span-2 flex flex-col space-y-4">
            {/* Slice Options Card */}
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
              <h3 className="text-xs font-mono font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1.5">
                <Scissors className="h-3.5 w-3.5" /> {t("textUtils.sliceOptions")}
              </h3>

              <div className="space-y-1">
                <label className="text-[10px] font-sans font-bold uppercase text-slate-400 block">{t("textUtils.sliceLength")}</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Characters count..."
                  value={sliceLength}
                  onChange={(e) => setSliceLength(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full p-2 text-xs border border-slate-200 dark:border-slate-800 bg-transparent rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-sans font-bold uppercase text-slate-400 block">{t("textUtils.position")}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSlicePosition("start")}
                    className={`text-xs py-1.5 px-2.5 rounded-lg border transition-colors cursor-pointer ${
                      slicePosition === "start"
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-xs font-bold"
                        : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    {t("textUtils.start")}
                  </button>
                  <button
                    onClick={() => setSlicePosition("end")}
                    className={`text-xs py-1.5 px-2.5 rounded-lg border transition-colors cursor-pointer ${
                      slicePosition === "end"
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-xs font-bold"
                        : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    {t("textUtils.end")}
                  </button>
                </div>
              </div>

              <button
                onClick={handleSliceText}
                className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center justify-center gap-1.5 cursor-pointer mt-2"
              >
                <Scissors className="h-3.5 w-3.5" /> {t("textUtils.sliceChars")}
              </button>
            </div>

            {/* Slicer Search and Replace Card */}
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
              <h3 className="text-xs font-mono font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5" /> {t("textUtils.findAndReplace")}
              </h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-sans font-bold uppercase text-slate-400 block">{t("textUtils.findWhat")}</label>
                  <input
                    type="text"
                    placeholder="Find pattern..."
                    value={slicerFindQuery}
                    onChange={(e) => setSlicerFindQuery(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-200 dark:border-slate-800 bg-transparent rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-sans font-bold uppercase text-slate-400 block">{t("textUtils.replaceWith")}</label>
                  <input
                    type="text"
                    placeholder="Replacement text..."
                    value={slicerReplaceQuery}
                    onChange={(e) => setSlicerReplaceQuery(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-200 dark:border-slate-800 bg-transparent rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                {/* Checkbox controls for Match Case & Regex Search */}
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                    <input
                      type="checkbox"
                      checked={slicerMatchCase}
                      onChange={(e) => setSlicerMatchCase(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{t("textUtils.matchCase")}</span>
                  </label>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                      <input
                        type="checkbox"
                        checked={slicerIsRegex}
                        onChange={(e) => setSlicerIsRegex(e.target.checked)}
                        className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{t("textUtils.useRegex")}</span>
                    </label>

                    {/* Info Icon with Tooltip */}
                    <div className="relative group cursor-help">
                      <HelpCircle className="h-4 w-4 text-indigo-500 hover:text-indigo-600 transition-colors" />
                      <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-72 p-3.5 bg-slate-900 text-slate-100 text-[11px] rounded-2xl shadow-2xl z-50 pointer-events-none border border-slate-700 font-sans leading-relaxed">
                        <p className="font-bold text-indigo-300 mb-1 flex items-center gap-1">
                          <Info className="h-3.5 w-3.5" /> What is Regex Search?
                        </p>
                        <p className="text-slate-300 mb-2 text-[10px]">
                          Advanced pattern search using regular expression syntax:
                        </p>
                        <ul className="space-y-1 text-slate-300 font-mono text-[10px]">
                          <li>• <span className="text-amber-300 font-bold">\d+</span> : Matches digit sequences</li>
                          <li>• <span className="text-amber-300 font-bold">[a-z]+</span> : Matches lowercase words</li>
                          <li>• <span className="text-amber-300 font-bold">@.*</span> : Matches from @ to end of line</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleSlicerSearchReplace}
                  className="w-full text-xs font-semibold py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-100 transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {t("textUtils.replaceBtn")}
                </button>
              </div>
            </div>
          </div>

          {/* Output Pane - Right */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col flex-1 min-h-[460px]">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400">
                  {t("textUtils.transformedOutput")}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(slicerOutputText, setSlicerCopied)}
                    disabled={!slicerOutputText}
                    className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    title="Copy output"
                  >
                    {slicerCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-emerald-500">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <textarea
                readOnly
                className="w-full flex-1 p-4 bg-slate-50/40 dark:bg-[#0B0F1A]/30 text-slate-800 dark:text-slate-300 font-mono text-sm leading-relaxed resize-none focus:outline-none"
                placeholder="Sliced output lines will appear here..."
                value={slicerOutputText}
              />

              <div className="p-3 bg-slate-50 dark:bg-[#0B0F1A]/50 rounded-b-2xl border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                <span>Output updates automatically on clicking slice lines button.</span>
                <span>Current lines: {slicerOutputText ? slicerOutputText.split(/\r?\n/).length : 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
