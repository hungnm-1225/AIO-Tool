import React, { useState, useEffect } from "react";
import { TextUtilsState } from "../types";
import { 
  Copy, 
  Check, 
  Trash2, 
  Search, 
  ArrowUpDown,
  Filter,
  CheckCircle
} from "lucide-react";

interface TextUtilitiesProps {
  state: TextUtilsState;
  onChange: (newState: Partial<TextUtilsState>) => void;
}

export default function TextUtilities({ state, onChange }: TextUtilitiesProps) {
  const [outputText, setOutputText] = useState("");
  const [copied, setCopied] = useState(false);
  const [originalTextBackup, setOriginalTextBackup] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"none" | "remove" | "frequency" | "uniques">("none");
  const [activeSort, setActiveSort] = useState<"none" | "original" | "ascending" | "descending" | "shuffle">("original");

  // Keep a backup of original order lines
  useEffect(() => {
    if (!originalTextBackup && state.inputText) {
      setOriginalTextBackup(state.inputText);
    }
  }, [state.inputText, originalTextBackup]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleCopy = async () => {
    const textToCopy = outputText || state.inputText;
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      showToast("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  // 1. Text Counts Calculations
  const calculateCounts = () => {
    const text = state.inputText || "";
    
    // Character count
    let charCount = 0;
    if (state.countSpaces) {
      charCount = text.length;
    } else {
      charCount = text.replace(/\s/g, "").length;
    }

    // Line count
    const lines = text.split(/\r?\n/);
    let lineCount = 0;
    if (state.countEmptyLines) {
      lineCount = text === "" ? 0 : lines.length;
    } else {
      lineCount = lines.filter(line => line.trim() !== "").length;
    }

    // Word count
    const words = text.trim().split(/\s+/).filter(word => word !== "");
    const wordCount = words.length;

    return { charCount, lineCount, wordCount };
  };

  const { charCount, lineCount, wordCount } = calculateCounts();

  // 2. Duplicate Finder & Remover
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
    setActiveFilter("remove");
    showToast("Duplicate lines removed!");
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
    setOutputText(reportLines.join("\n"));
    setActiveFilter("frequency");
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
    setOutputText(strictlyUniques.join("\n"));
    setActiveFilter("uniques");
    showToast("Strictly unique lines filtered!");
  };

  // 3. Sorting & Shuffling
  const handleSort = (type: "original" | "ascending" | "descending" | "shuffle") => {
    const text = state.inputText || "";
    if (!text) {
      showToast("Please enter text first!");
      return;
    }
    const lines = text.split(/\r?\n/);

    let sortedLines: string[] = [];
    if (type === "original") {
      setActiveSort("original");
      if (originalTextBackup) {
        onChange({ inputText: originalTextBackup });
        setOutputText(originalTextBackup);
        showToast("Restored to original order!");
        return;
      } else {
        sortedLines = [...lines];
      }
    } else if (type === "ascending") {
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

  // 4. Search & Replace
  const handleSearchReplace = () => {
    const text = state.inputText || "";
    if (!text) {
      showToast("Please enter text first!");
      return;
    }
    const find = state.findQuery || "";
    const replace = state.replaceQuery || "";

    let newText = text;
    try {
      if (state.isRegex) {
        const regex = new RegExp(find, "g");
        newText = text.replace(regex, replace);
      } else {
        newText = text.split(find).join(replace);
      }
      setOutputText(newText);
      showToast("Find and replace completed!");
    } catch (err: any) {
      showToast(`Regex Error: ${err.message}`);
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50 dark:bg-[#0B0F1A] p-6 space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-3 rounded-xl shadow-xl font-medium border border-slate-700/30 dark:border-slate-200 text-sm animate-fade-in animate-duration-200">
          <CheckCircle className="h-4 w-4 text-emerald-500" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-4">
        <div>
          <h2 className="text-2xl font-bold font-sans tracking-tight text-slate-800 dark:text-slate-100">
            Text & Duplicate Utilities
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            All-in-one text companion: Remove duplicates, line frequency analysis, progressive sorting, and search-replace regex tools.
          </p>
        </div>
      </div>

      {/* Grid containing Input, Output, and Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Pane - Left */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col flex-1 min-h-[450px]">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-indigo-600 dark:text-indigo-400">
                Input Dataset
              </span>
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
            
            <textarea
              className="w-full flex-1 p-4 bg-transparent text-slate-800 dark:text-slate-200 font-mono text-sm leading-relaxed resize-none focus:outline-none"
              placeholder="Paste or type your lines of data here..."
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
                <div className="bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 p-2.5 rounded-xl shadow-xs">
                  <div className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-0.5">Characters</div>
                  <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-mono">{charCount}</div>
                </div>
                <div className="bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 p-2.5 rounded-xl shadow-xs">
                  <div className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-0.5">Words</div>
                  <div className="text-lg font-bold text-sky-600 dark:text-sky-400 font-mono">{wordCount}</div>
                </div>
                <div className="bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 p-2.5 rounded-xl shadow-xs">
                  <div className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-0.5">Lines</div>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">{lineCount}</div>
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
                  <span>Count whitespace</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={state.countEmptyLines}
                    onChange={(e) => onChange({ countEmptyLines: e.target.checked })}
                    className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Count empty lines</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Action Pane - Middle */}
        <div className="lg:col-span-2 flex flex-col space-y-4">
          {/* Duplicate Filters Card */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-mono font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5" /> Duplicate Filters
            </h3>
            <button
              onClick={handleRemoveDuplicates}
              className={`w-full text-xs font-semibold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeFilter === "remove"
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-bold border-indigo-600"
                  : "border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              Remove Duplicates
            </button>
            <button
              onClick={handleCountFrequency}
              className={`w-full text-xs font-semibold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeFilter === "frequency"
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-bold border-indigo-600"
                  : "border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              Line Frequency
            </button>
            <button
              onClick={handleFilterUniques}
              className={`w-full text-xs font-semibold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeFilter === "uniques"
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-bold border-indigo-600"
                  : "border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              Strictly Unique
            </button>
          </div>

          {/* Sorter Card */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-2.5">
            <h3 className="text-xs font-mono font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5" /> Sort Options
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSort("ascending")}
                className={`text-xs font-medium py-2 px-2.5 rounded-lg border transition-colors cursor-pointer ${
                  activeSort === "ascending"
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-sm font-bold"
                    : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                A → Z
              </button>
              <button
                onClick={() => handleSort("descending")}
                className={`text-xs font-medium py-2 px-2.5 rounded-lg border transition-colors cursor-pointer ${
                  activeSort === "descending"
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-sm font-bold"
                    : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                Z → A
              </button>
              <button
                onClick={() => handleSort("shuffle")}
                className={`text-xs font-medium py-2 px-2.5 rounded-lg border transition-colors cursor-pointer ${
                  activeSort === "shuffle"
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-sm font-bold"
                    : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                Shuffle
              </button>
              <button
                onClick={() => handleSort("original")}
                className={`text-xs font-medium py-2 px-2.5 rounded-lg border transition-colors cursor-pointer ${
                  activeSort === "original"
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-sm font-bold"
                    : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                Original
              </button>
            </div>
          </div>

          {/* Search and Replace Card */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-mono font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5" /> Find & Replace
            </h3>
            <div className="space-y-3">
              <div className="space-y-1 border-b border-transparent">
                <label className="text-[10px] font-sans font-bold uppercase text-slate-400 dark:text-slate-500 block">Find Keyword / Pattern</label>
                <input
                  type="text"
                  placeholder="Find pattern..."
                  value={state.findQuery ?? ""}
                  onChange={(e) => onChange({ findQuery: e.target.value })}
                  className="w-full p-2 text-xs border border-slate-200 dark:border-slate-800 bg-transparent rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-sans font-bold uppercase text-slate-400 dark:text-slate-500 block">Replace with</label>
                <input
                  type="text"
                  placeholder="Replacement text..."
                  value={state.replaceQuery ?? ""}
                  onChange={(e) => onChange({ replaceQuery: e.target.value })}
                  className="w-full p-2 text-xs border border-slate-200 dark:border-slate-800 bg-transparent rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-500 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={state.isRegex}
                  onChange={(e) => onChange({ isRegex: e.target.checked })}
                  className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Regex Search</span>
              </label>
              <button
                onClick={handleSearchReplace}
                className="w-full text-xs font-semibold py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-100 transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Replace All
              </button>
            </div>
          </div>
        </div>

        {/* Output Pane - Right */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col flex-1 min-h-[450px]">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400">
                Processed Output
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  disabled={!outputText && !state.inputText}
                  className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  title="Copy processed output"
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
    </div>
  );
}
