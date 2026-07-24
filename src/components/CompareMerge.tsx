import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { CompareMergeState } from "../types";
import { useI18n } from "../utils/i18n";
import { diffLines, LineDiff, DiffToken } from "../utils/diff";
import { 
  GitCompare, 
  Columns, 
  PlusCircle, 
  Copy, 
  Check, 
  CheckCircle, 
  AlertTriangle,
  RotateCcw,
  Sparkles
} from "lucide-react";

interface CompareMergeProps {
  state: CompareMergeState;
  onChange: (newState: Partial<CompareMergeState>) => void;
}

export default function CompareMerge({ state, onChange }: CompareMergeProps) {
  const { t } = useI18n();
  const [activeSubTab, setActiveSubTab] = useState<"diff" | "combine" | "autoinc">("diff");

  // Synchronize sub-tab from hash
  useEffect(() => {
    const syncSubTab = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === "#compare-text" || hash === "#diff") {
        setActiveSubTab("diff");
      } else if (hash === "#merge-columns" || hash === "#combine") {
        setActiveSubTab("combine");
      } else if (hash === "#auto-increment" || hash === "#autoinc") {
        setActiveSubTab("autoinc");
      }
    };

    syncSubTab();

    window.addEventListener("hashchange", syncSubTab);
    return () => window.removeEventListener("hashchange", syncSubTab);
  }, []);

  const handleTabChange = (tab: "diff" | "combine" | "autoinc") => {
    setActiveSubTab(tab);
    const hash =
      tab === "diff"
        ? "compare-text"
        : tab === "combine"
        ? "merge-columns"
        : "auto-increment";
    window.location.hash = hash;
  };
  const [diffResults, setDiffResults] = useState<LineDiff[] | null>(null);
  const [diffViewMode, setDiffViewMode] = useState<"unified" | "side-by-side">("unified");
  const [isIdentical, setIsIdentical] = useState<boolean | null>(null);
  const [combineOutput, setCombineOutput] = useState("");
  const [autoIncOutput, setAutoIncOutput] = useState("");
  const [paddingWidth, setPaddingWidth] = useState<number>(1);
  
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const showToast = (msg: string, isError = false) => {
    if (isError) {
      toast.error(msg);
    } else {
      toast.success(msg);
    }
  };

  const handleCopy = async (text: string, identifier: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(identifier);
      showToast(t("common.copied"));
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  // --- SUB-FEATURE 1: TEXT DIFF ---
  const handleCompare = () => {
    const orig = state.diffOriginal || "";
    const mod = state.diffModified || "";
    
    if (!orig && !mod) {
      showToast("Please enter both original and modified texts to compare!", true);
      return;
    }

    const isSame = state.ignoreCase ? orig.toLowerCase() === mod.toLowerCase() : orig === mod;

    if (isSame) {
      setIsIdentical(true);
      setDiffResults([]);
      showToast("The files are completely identical!");
    } else {
      setIsIdentical(false);
      const results = diffLines(orig, mod, { ignoreCase: !!state.ignoreCase });
      setDiffResults(results);
      showToast("Differences detected!");
    }
  };

  const renderCharDiff = (charDiff: DiffToken[] | undefined, filterType: "added" | "removed") => {
    if (!charDiff) return null;
    return (
      <span className="break-all whitespace-pre-wrap">
        {charDiff.map((token, idx) => {
          if (token.type === "equal") {
            return <span key={idx}>{token.value}</span>;
          }
          if (token.type === filterType) {
            return (
              <span 
                key={idx} 
                className={`px-0.5 rounded font-bold ${
                  filterType === "removed" 
                    ? "bg-rose-500/25 dark:bg-rose-500/35 text-rose-900 dark:text-rose-200 line-through decoration-rose-600" 
                    : "bg-emerald-500/25 dark:bg-emerald-500/35 text-emerald-900 dark:text-emerald-200"
                }`}
              >
                {token.value}
              </span>
            );
          }
          return null;
        })}
      </span>
    );
  };

  // --- SUB-FEATURE 2: COLUMN COMBINER ---
  const handleCombine = () => {
    const col1 = state.combineCol1 || "";
    const col2 = state.combineCol2 || "";

    if (!col1.trim() && !col2.trim()) {
      showToast("Please enter data for both columns!", true);
      return;
    }

    const lines1 = col1.split(/\r?\n/);
    const lines2 = col2.split(/\r?\n/);

    const len1 = col1.trim() === "" ? 0 : lines1.length;
    const len2 = col2.trim() === "" ? 0 : lines2.length;

    if (len1 > 1 && len2 > 1 && len1 !== len2) {
      showToast(
        `Cannot merge columns! Line count mismatch: Column 1 has ${len1} lines, Column 2 has ${len2} lines. Please adjust or combine with a column containing exactly 1 line.`, 
        true
      );
      return;
    }

    const maxLines = Math.max(len1, len2);
    const merged: string[] = [];

    for (let idx = 0; idx < maxLines; idx++) {
      const val1 = len1 === 1 ? lines1[0] : (lines1[idx] !== undefined ? lines1[idx] : "");
      const val2 = len2 === 1 ? lines2[0] : (lines2[idx] !== undefined ? lines2[idx] : "");
      
      merged.push(`${val1}${state.combineDelimiter}${val2}`);
    }

    setCombineOutput(merged.join("\n"));
    showToast("Columns merged successfully!");
  };

  // --- SUB-FEATURE 3: AUTO-INCREMENT GENERATOR ---
  const handleGenerateAutoInc = () => {
    const template = state.autoIncTemplate || "";
    if (!template) {
      showToast("Please enter a template string (containing [x])!", true);
      return;
    }
    if (!template.includes("[x]")) {
      showToast("Template string must contain the [x] placeholder for auto-increment sequential replacement!", true);
      return;
    }

    const start = state.autoIncStart ?? 1;
    const step = state.autoIncStep ?? 1;
    const count = state.autoIncCount ?? 10;

    const list: string[] = [];
    for (let i = 0; i < count; i++) {
      const currentNumber = start + i * step;
      const formattedNum = String(currentNumber).padStart(paddingWidth, "0");
      list.push(template.replace("[x]", formattedNum));
    }

    setAutoIncOutput(list.join("\n"));
    showToast(`Successfully generated ${count} progressive records!`);
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50 dark:bg-[#0B0F1A] p-6 space-y-6">

      {/* Header Info with Sub-navigation tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800/80 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="h-9 w-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-600/20">
                <GitCompare className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>{t("compareMerge.title")}</span>
                <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                  Compare & Merge
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("compareMerge.subtitle")}
            </p>
          </div>

          {/* Sub tabs */}
          <div className="flex bg-slate-100 dark:bg-[#111827] p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
            <button
              onClick={() => handleTabChange("diff")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === "diff"
                  ? "bg-white dark:bg-[#0B0F1A] text-slate-800 dark:text-slate-200 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              <GitCompare className="h-3.5 w-3.5" /> {t("compareMerge.diffTab")}
            </button>
            <button
              onClick={() => handleTabChange("combine")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === "combine"
                  ? "bg-white dark:bg-[#0B0F1A] text-slate-800 dark:text-slate-200 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              <Columns className="h-3.5 w-3.5" /> {t("compareMerge.mergeTab")}
            </button>
            <button
              onClick={() => handleTabChange("autoinc")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === "autoinc"
                  ? "bg-white dark:bg-[#0B0F1A] text-slate-800 dark:text-slate-200 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              <PlusCircle className="h-3.5 w-3.5" /> {t("compareMerge.autoIncTab")}
            </button>
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: TEXT DIFF CHECKER */}
      {activeSubTab === "diff" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Original Input */}
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col h-[280px]">
              <div className="p-3 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/50 dark:bg-[#0B0F1A]/50 rounded-t-2xl">
                <span className="text-xs font-mono font-bold uppercase text-slate-500 dark:text-slate-400">
                  {t("compareMerge.originalText")}
                </span>
                <button
                  onClick={() => onChange({ diffOriginal: "" })}
                  className="text-xs font-mono text-rose-500 hover:underline cursor-pointer"
                >
                  {t("common.clear")}
                </button>
              </div>
              <textarea
                className="w-full flex-1 p-4 bg-transparent text-slate-800 dark:text-slate-200 font-mono text-sm leading-relaxed resize-none focus:outline-none"
                placeholder="Paste original data here..."
                value={state.diffOriginal ?? ""}
                onChange={(e) => onChange({ diffOriginal: e.target.value })}
              />
            </div>

            {/* Modified Input */}
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col h-[280px]">
              <div className="p-3 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/50 dark:bg-[#0B0F1A]/50 rounded-t-2xl">
                <span className="text-xs font-mono font-bold uppercase text-indigo-600 dark:text-indigo-400">
                   {t("compareMerge.modifiedText")}
                </span>
                <button
                  onClick={() => onChange({ diffModified: "" })}
                  className="text-xs font-mono text-rose-500 hover:underline cursor-pointer"
                >
                  {t("common.clear")}
                </button>
              </div>
              <textarea
                className="w-full flex-1 p-4 bg-transparent text-slate-800 dark:text-slate-200 font-mono text-sm leading-relaxed resize-none focus:outline-none"
                placeholder="Paste modified or updated data here..."
                value={state.diffModified ?? ""}
                onChange={(e) => onChange({ diffModified: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={handleCompare}
              title="Compare text lines and highlight additions, deletions, or modifications"
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/10 flex items-center gap-2 cursor-pointer"
            >
              <GitCompare className="h-4 w-4" /> {t("compareMerge.compareBtn")}
            </button>

            <label 
              title="When checked, letters like 'A' and 'a' will be treated as identical during comparison"
              className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer bg-white dark:bg-[#111827] px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-all select-none"
            >
              <input
                type="checkbox"
                checked={!!state.ignoreCase}
                onChange={(e) => onChange({ ignoreCase: e.target.checked })}
                className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <span>{t("compareMerge.ignoreCase")}</span>
            </label>
          </div>

          {/* Diff Output Panel */}
          {isIdentical !== null && (
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3 gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {t("compareMerge.detailedResult")}
                  </h3>
                  {/* View Mode Toggle */}
                  {!isIdentical && (
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50 text-[11px]">
                      <button
                        onClick={() => setDiffViewMode("unified")}
                        className={`px-2 py-1 rounded-md font-medium transition-all cursor-pointer ${
                          diffViewMode === "unified"
                            ? "bg-white dark:bg-[#0B0F1A] text-slate-800 dark:text-slate-200 shadow-xs font-semibold"
                            : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                        }`}
                      >
                        Unified
                      </button>
                      <button
                        onClick={() => setDiffViewMode("side-by-side")}
                        className={`px-2 py-1 rounded-md font-medium transition-all cursor-pointer ${
                          diffViewMode === "side-by-side"
                            ? "bg-white dark:bg-[#0B0F1A] text-slate-800 dark:text-slate-200 shadow-xs font-semibold"
                            : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                        }`}
                      >
                        Side by Side
                      </button>
                    </div>
                  )}
                </div>
                {isIdentical ? (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-bold">
                    {t("compareMerge.identicalResult")}
                  </span>
                ) : (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-bold">
                    {t("compareMerge.differencesFound")}
                  </span>
                )}
              </div>

              {isIdentical ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-emerald-700 dark:text-emerald-400 font-medium text-sm flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  <span>{t("compareMerge.identicalMessage")}</span>
                </div>
              ) : diffViewMode === "side-by-side" ? (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-[#0B0F1A]/50">
                  {/* Side by side Headers */}
                  <div className="grid grid-cols-2 border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/40 text-xs font-semibold text-slate-500 dark:text-slate-400 font-sans">
                    <div className="p-2.5 px-4 border-r border-slate-200 dark:border-slate-800">Original</div>
                    <div className="p-2.5 px-4">Modified</div>
                  </div>
                  
                  {/* Side by side Content */}
                  <div className="max-h-[450px] overflow-auto divide-y divide-slate-100/80 dark:divide-slate-800/50">
                    {diffResults?.map((line, idx) => {
                      if (line.type === "equal") {
                        return (
                          <div key={idx} className="grid grid-cols-2 font-mono text-sm leading-relaxed min-h-[28px]">
                            <div className="p-2 px-4 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800/80 select-text whitespace-pre-wrap break-all">
                              {line.value}
                            </div>
                            <div className="p-2 px-4 text-slate-600 dark:text-slate-400 select-text whitespace-pre-wrap break-all">
                              {line.value}
                            </div>
                          </div>
                        );
                      }
                      if (line.type === "removed") {
                        return (
                          <div key={idx} className="grid grid-cols-2 font-mono text-sm leading-relaxed min-h-[28px]">
                            <div className="p-2 px-4 bg-rose-500/10 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 border-l-4 border-rose-500 border-r border-slate-200 dark:border-slate-800/80 select-text whitespace-pre-wrap break-all">
                              <span className="text-rose-400/80 mr-2 inline select-none font-bold">-</span>
                              {line.value}
                            </div>
                            <div className="p-2 px-4 bg-slate-100/20 dark:bg-slate-900/10 text-transparent select-none whitespace-pre-wrap">
                              &nbsp;
                            </div>
                          </div>
                        );
                      }
                      if (line.type === "added") {
                        return (
                          <div key={idx} className="grid grid-cols-2 font-mono text-sm leading-relaxed min-h-[28px]">
                            <div className="p-2 px-4 bg-slate-100/20 dark:bg-slate-900/10 text-transparent select-none border-r border-slate-200 dark:border-slate-800/80 whitespace-pre-wrap">
                              &nbsp;
                            </div>
                            <div className="p-2 px-4 bg-emerald-500/10 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border-l-4 border-emerald-500 select-text whitespace-pre-wrap break-all">
                              <span className="text-emerald-400/80 mr-2 inline select-none font-bold">+</span>
                              {line.value}
                            </div>
                          </div>
                        );
                      }
                      if (line.type === "modified") {
                        return (
                          <div key={idx} className="grid grid-cols-2 font-mono text-sm leading-relaxed min-h-[28px]">
                            <div className="p-2 px-4 bg-rose-500/10 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 border-l-4 border-amber-500 border-r border-slate-200 dark:border-slate-800/80 select-text whitespace-pre-wrap break-all">
                              <span className="text-rose-400/80 mr-2 inline select-none font-bold">-</span>
                              {renderCharDiff(line.charDiff, "removed")}
                            </div>
                            <div className="p-2 px-4 bg-emerald-500/10 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border-l-4 border-amber-500 select-text whitespace-pre-wrap break-all">
                              <span className="text-emerald-400/80 mr-2 inline select-none font-bold">+</span>
                              {renderCharDiff(line.charDiff, "added")}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              ) : (
                <div className="font-mono text-sm space-y-1.5 border border-slate-100 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-[#0B0F1A]/50 max-h-[400px] overflow-auto">
                  {diffResults?.map((line, idx) => {
                    if (line.type === "equal") {
                      return (
                        <div key={idx} className="text-slate-500 dark:text-slate-400 pl-6 select-none opacity-85">
                          {line.value}
                        </div>
                      );
                    }
                    if (line.type === "removed") {
                      return (
                        <div key={idx} className="bg-rose-500/10 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 border-l-4 border-rose-500 pl-2 py-0.5">
                          <span className="text-rose-400/80 mr-2 inline-block w-3 select-none font-bold">-</span>
                          {line.value}
                        </div>
                      );
                    }
                    if (line.type === "added") {
                      return (
                        <div key={idx} className="bg-emerald-500/10 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border-l-4 border-emerald-500 pl-2 py-0.5">
                          <span className="text-emerald-400/80 mr-2 inline-block w-3 select-none font-bold">+</span>
                          {line.value}
                        </div>
                      );
                    }
                    if (line.type === "modified") {
                      return (
                        <div key={idx} className="space-y-0.5 border-l-4 border-amber-500 bg-amber-500/5 dark:bg-amber-950/10 py-1 pl-2">
                          {/* Top: Deleted Character highlighting */}
                          <div className="text-rose-800 dark:text-rose-300">
                            <span className="text-rose-400/80 mr-2 inline-block w-3 select-none font-bold">-</span>
                            {renderCharDiff(line.charDiff, "removed")}
                          </div>
                          {/* Bottom: Added Character highlighting */}
                          <div className="text-emerald-800 dark:text-emerald-300">
                            <span className="text-emerald-400/80 mr-2 inline-block w-3 select-none font-bold">+</span>
                            {renderCharDiff(line.charDiff, "added")}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: COLUMN COMBINER */}
      {activeSubTab === "combine" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column 1 Input */}
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col h-[280px]">
              <div className="p-3 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/50 dark:bg-[#0B0F1A]/50 rounded-t-2xl">
                <span className="text-xs font-mono font-bold uppercase text-slate-500 dark:text-slate-400">
                  {t("compareMerge.mergeCol1")}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {state.combineCol1 ? state.combineCol1.split(/\r?\n/).length : 0} lines
                </span>
              </div>
              <textarea
                className="w-full flex-1 p-4 bg-transparent text-slate-800 dark:text-slate-200 font-mono text-sm leading-relaxed resize-none focus:outline-none"
                placeholder="Enter Column 1 data (one item per line)..."
                value={state.combineCol1 ?? ""}
                onChange={(e) => onChange({ combineCol1: e.target.value })}
              />
            </div>

            {/* Column 2 Input */}
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col h-[280px]">
              <div className="p-3 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/50 dark:bg-[#0B0F1A]/50 rounded-t-2xl">
                <span className="text-xs font-mono font-bold uppercase text-slate-500 dark:text-slate-400">
                  {t("compareMerge.mergeCol2")}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {state.combineCol2 ? state.combineCol2.split(/\r?\n/).length : 0} lines
                </span>
              </div>
              <textarea
                className="w-full flex-1 p-4 bg-transparent text-slate-800 dark:text-slate-200 font-mono text-sm leading-relaxed resize-none focus:outline-none"
                placeholder="Enter Column 2 data (one item per line)..."
                value={state.combineCol2 ?? ""}
                onChange={(e) => onChange({ combineCol2: e.target.value })}
              />
            </div>
          </div>

          {/* Delimiter & Actions */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1 max-w-sm">
              <label className="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-2">
                {t("compareMerge.delimiter")}
              </label>
              <input
                type="text"
                placeholder="Enter delimiter (e.g., |, comma, hyphen, space...)"
                value={state.combineDelimiter ?? ""}
                onChange={(e) => onChange({ combineDelimiter: e.target.value })}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-800 bg-transparent rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  onChange({ combineCol1: "", combineCol2: "", combineDelimiter: "" });
                  setCombineOutput("");
                  showToast("Cleared merger data!");
                }}
                className="px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" /> {t("common.reset")}
              </button>
              <button
                onClick={handleCombine}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/10 flex items-center gap-2 cursor-pointer"
              >
                <Columns className="h-4 w-4" /> {t("compareMerge.joinBtn")}
              </button>
            </div>
          </div>

          {/* Combine Output */}
          {combineOutput && (
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col h-[300px]">
              <div className="p-3 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/50 dark:bg-[#0B0F1A]/50 rounded-t-2xl">
                <span className="text-xs font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> {t("compareMerge.mergedResult")}
                </span>
                <button
                  onClick={() => handleCopy(combineOutput, "combine")}
                  className="text-xs font-mono text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  {copiedText === "combine" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedText === "combine" ? "Copied" : "Copy Output"}
                </button>
              </div>
              <textarea
                readOnly
                className="w-full flex-1 p-4 bg-slate-50/40 dark:bg-[#0B0F1A]/30 text-slate-800 dark:text-slate-200 font-mono text-sm leading-relaxed resize-none focus:outline-none"
                value={combineOutput}
              />
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: AUTO-INCREMENT GENERATOR */}
      {activeSubTab === "autoinc" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls - Left */}
          <div className="lg:col-span-4 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800/60 pb-3 flex items-center gap-2">
              <PlusCircle className="h-4 w-4 text-indigo-500" /> Progressive Sequence Generator
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-2">
                  {t("compareMerge.template")}
                </label>
                <input
                  type="text"
                  placeholder="Example: item_[x]_sku"
                  value={state.autoIncTemplate ?? ""}
                  onChange={(e) => onChange({ autoIncTemplate: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 bg-transparent rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-sm"
                />
                <span className="text-[10px] text-slate-400 mt-1 block leading-normal">
                  The placeholder <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-bold text-indigo-500">[x]</code> will be replaced with the progressive incremental sequence.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-2">
                    {t("compareMerge.startVal")}
                  </label>
                  <input
                    type="number"
                    value={state.autoIncStart ?? ""}
                    onChange={(e) => onChange({ autoIncStart: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 bg-transparent rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-2">
                    {t("compareMerge.stepVal")}
                  </label>
                  <input
                    type="number"
                    value={state.autoIncStep ?? ""}
                    onChange={(e) => onChange({ autoIncStep: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 bg-transparent rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-2">
                  {t("compareMerge.countVal")}
                </label>
                <input
                  type="number"
                  min="1"
                  max="5000"
                  value={state.autoIncCount ?? ""}
                  onChange={(e) => onChange({ autoIncCount: Math.min(5000, Math.max(1, parseInt(e.target.value) || 1)) })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 bg-transparent rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-2">
                  Digit Padding
                </label>
                <select
                  value={paddingWidth}
                  onChange={(e) => setPaddingWidth(parseInt(e.target.value) || 1)}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 text-sm cursor-pointer"
                >
                  <option value={1}>No padding (1, 2, 3...)</option>
                  <option value={2}>2 digits (01, 02...)</option>
                  <option value={3}>3 digits (001, 002...)</option>
                  <option value={4}>4 digits (0001, 0002...)</option>
                  <option value={5}>5 digits (00001, 00002...)</option>
                </select>
              </div>

              <button
                onClick={handleGenerateAutoInc}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/15 flex items-center justify-center gap-2 cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" /> {t("compareMerge.generateBtn")}
              </button>
            </div>
          </div>

          {/* Result Output - Right */}
          <div className="lg:col-span-8 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col h-[480px]">
            <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/50 dark:bg-[#0B0F1A]/50 rounded-t-2xl">
              <span className="text-xs font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400">
                {t("compareMerge.previewList")}
              </span>
              {autoIncOutput && (
                <button
                  onClick={() => handleCopy(autoIncOutput, "autoinc")}
                  className="text-xs font-mono text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 hover:underline cursor-pointer"
                >
                  {copiedText === "autoinc" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedText === "autoinc" ? "Copied" : "Copy List"}
                </button>
              )}
            </div>
            <textarea
              readOnly
              className="w-full flex-1 p-4 bg-slate-50/40 dark:bg-[#0B0F1A]/30 text-slate-800 dark:text-slate-200 font-mono text-sm leading-relaxed resize-none focus:outline-none"
              placeholder="The progressive sequence list will be generated here..."
              value={autoIncOutput}
            />
            <div className="p-3 bg-slate-50 dark:bg-[#0B0F1A]/50 border-t border-slate-100 dark:border-slate-800/60 rounded-b-2xl flex justify-between text-xs text-slate-400">
              <span>Automatically generated using the progressive sequence generator.</span>
              <span>Total: {autoIncOutput ? autoIncOutput.split(/\r?\n/).length : 0} items</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
