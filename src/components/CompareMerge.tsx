import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { CompareMergeState } from "../types";
import { useI18n } from "../utils/i18n";
import { diffLines, LineDiff, DiffToken } from "../utils/diff";
import { navigateTo } from "../utils/navigation";
import { 
  GitCompare, 
  Columns, 
  PlusCircle, 
  Copy, 
  Check, 
  CheckCircle, 
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Trash2,
  ArrowLeftRight
} from "lucide-react";

interface CompareMergeProps {
  state: CompareMergeState;
  onChange: (newState: Partial<CompareMergeState>) => void;
  subSlug?: string;
  hideInnerHeader?: boolean;
}

export default function CompareMerge({ state, onChange, subSlug, hideInnerHeader = false }: CompareMergeProps) {
  const { lang, t } = useI18n();
  const [activeSubTab, setActiveSubTab] = useState<"diff" | "combine" | "autoinc">("diff");

  // Synchronize sub-tab from subSlug
  useEffect(() => {
    if (subSlug === "so-sanh-ma-diff" || subSlug === "diff-checker") {
      setActiveSubTab("diff");
    } else if (subSlug === "ghep-cot" || subSlug === "column-joiner") {
      setActiveSubTab("combine");
    } else if (subSlug === "tu-dong-tang-so" || subSlug === "auto-increasement-generator") {
      setActiveSubTab("autoinc");
    }
  }, [subSlug]);

  const handleTabChange = (tab: "diff" | "combine" | "autoinc") => {
    setActiveSubTab(tab);
    const path =
      tab === "diff"
        ? "/text-suite/diff-checker"
        : tab === "combine"
        ? "/text-suite/column-joiner"
        : "/text-suite/auto-increasement-generator";
    navigateTo(path);
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

  // --- SUB-FEATURE 2: COLUMN COMBINER (Cột A - B - C) ---
  const handleCombine = () => {
    const colA = state.combineCol1 || "";
    const colB = state.combineDelimiter !== undefined ? state.combineDelimiter : "";
    const colC = state.combineCol2 || "";

    if (!colA.trim() && !colB.trim() && !colC.trim()) {
      showToast(lang === "vi" ? "Vui lòng nhập dữ liệu để ghép!" : "Please enter data to merge!", true);
      return;
    }

    const linesA = colA ? colA.split(/\r?\n/) : [];
    const linesB = colB !== "" ? colB.split(/\r?\n/) : [];
    const linesC = colC ? colC.split(/\r?\n/) : [];

    const lenA = colA.trim() === "" ? 0 : linesA.length;
    const lenB = colB === "" ? 0 : linesB.length;
    const lenC = colC.trim() === "" ? 0 : linesC.length;

    const maxLines = Math.max(lenA, lenC, lenB > 1 ? lenB : 0);
    if (maxLines === 0) {
      showToast(lang === "vi" ? "Không có dữ liệu hợp lệ để ghép!" : "No valid data to merge!", true);
      return;
    }

    const merged: string[] = [];

    for (let idx = 0; idx < maxLines; idx++) {
      const valA = lenA === 1 ? linesA[0] : (linesA[idx] !== undefined ? linesA[idx] : "");
      
      // Delimiter: if only 1 line in Column B, use it for all rows; if multiple lines, map row by row
      let valB = "";
      if (lenB === 1) {
        valB = linesB[0];
      } else if (lenB > 1) {
        valB = linesB[idx] !== undefined ? linesB[idx] : (linesB[lenB - 1] ?? "");
      }

      const valC = lenC === 1 ? linesC[0] : (linesC[idx] !== undefined ? linesC[idx] : "");
      
      merged.push(`${valA}${valB}${valC}`);
    }

    setCombineOutput(merged.join("\n"));
    showToast(
      lang === "vi" 
        ? `Đã ghép thành công ${merged.length} dòng dữ liệu (Cột A + B + C)!` 
        : `Merged ${merged.length} lines successfully (Column A + B + C)!`
    );
  };

  const handleSwapAC = () => {
    const tempA = state.combineCol1 || "";
    const tempC = state.combineCol2 || "";
    onChange({ combineCol1: tempC, combineCol2: tempA });
    showToast(lang === "vi" ? "Đã đổi vị trí Cột A ⇄ Cột C!" : "Swapped Column A ⇄ Column C!");
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
      {!hideInnerHeader && (
        <div className="border-b border-slate-200 dark:border-slate-800/80 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="h-9 w-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-600/20">
                  <GitCompare className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>{t("compareMerge.title")}</span>
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
      )}

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
                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/50 transition-all inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                  title="Clear original input"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{t("common.clear")}</span>
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
                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/50 transition-all inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                  title="Clear modified input"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{t("common.clear")}</span>
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

      {/* SUB-TAB 2: COLUMN COMBINER (Cột A - B - C) */}
      {activeSubTab === "combine" && (
        <div className="space-y-6">
          {/* 3 Columns Grid: Cột A - B - C */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column A Input */}
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col h-[320px]">
              <div className="p-3 px-4 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/70 dark:bg-[#0B0F1A]/70 rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    {lang === "vi" ? "Cột A" : "Column A"}
                  </span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {lang === "vi" ? "Dữ liệu Cột A" : "Column A Data"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400">
                    {state.combineCol1 ? state.combineCol1.split(/\r?\n/).length : 0} {lang === "vi" ? "dòng" : "lines"}
                  </span>
                  {state.combineCol1 && (
                    <button
                      onClick={() => onChange({ combineCol1: "" })}
                      className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                      title={lang === "vi" ? "Xóa Cột A" : "Clear Column A"}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
              <textarea
                className="w-full flex-1 p-4 bg-transparent text-slate-800 dark:text-slate-200 font-mono text-xs leading-relaxed resize-none focus:outline-none"
                placeholder={lang === "vi" ? "Nhập dữ liệu Cột A (mỗi mục một dòng)..." : "Enter Column A data (one item per line)..."}
                value={state.combineCol1 ?? ""}
                onChange={(e) => onChange({ combineCol1: e.target.value })}
              />
            </div>

            {/* Column B (Delimiter) Input */}
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col h-[320px]">
              <div className="p-3 px-4 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/70 dark:bg-[#0B0F1A]/70 rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    {lang === "vi" ? "Cột B" : "Column B"}
                  </span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {lang === "vi" ? "Phân cách (Delimiter)" : "Delimiter"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400">
                    {state.combineDelimiter ? state.combineDelimiter.split(/\r?\n/).length : 0} {lang === "vi" ? "dòng" : "lines"}
                  </span>
                  {state.combineDelimiter && (
                    <button
                      onClick={() => onChange({ combineDelimiter: "" })}
                      className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                      title={lang === "vi" ? "Xóa Cột B" : "Clear Column B"}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
              <textarea
                className="w-full flex-1 p-4 bg-transparent text-slate-800 dark:text-slate-200 font-mono text-xs leading-relaxed resize-none focus:outline-none"
                placeholder={lang === "vi" 
                  ? "Nhập ký tự phân cách Cột B:\n• Nhập 1 dòng (ví dụ: | hoặc , hoặc -) để áp dụng cho tất cả hàng\n• Hoặc nhập nhiều dòng tương ứng từng hàng..." 
                  : "Enter delimiter in Column B:\n• Enter 1 line (e.g. | or , or -) to apply to all rows\n• Or enter multiple lines for row-by-row mapping..."}
                value={state.combineDelimiter ?? ""}
                onChange={(e) => onChange({ combineDelimiter: e.target.value })}
              />
              {/* Quick Delimiter Presets */}
              <div className="p-2 px-3 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-[#0B0F1A]/50 rounded-b-2xl flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="text-slate-400 font-medium text-[10px]">{lang === "vi" ? "Mẫu nhanh:" : "Presets:"}</span>
                {[
                  { label: "|", val: " | " },
                  { label: ",", val: ", " },
                  { label: "-", val: " - " },
                  { label: "Tab", val: "\t" },
                  { label: "Space", val: " " },
                  { label: ":", val: ": " },
                  { label: "→", val: " -> " },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => onChange({ combineDelimiter: preset.val })}
                    className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:border-amber-300 text-slate-600 dark:text-slate-300 text-[10px] font-mono cursor-pointer transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Column C Input */}
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col h-[320px]">
              <div className="p-3 px-4 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/70 dark:bg-[#0B0F1A]/70 rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    {lang === "vi" ? "Cột C" : "Column C"}
                  </span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {lang === "vi" ? "Dữ liệu Cột C" : "Column C Data"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400">
                    {state.combineCol2 ? state.combineCol2.split(/\r?\n/).length : 0} {lang === "vi" ? "dòng" : "lines"}
                  </span>
                  {state.combineCol2 && (
                    <button
                      onClick={() => onChange({ combineCol2: "" })}
                      className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                      title={lang === "vi" ? "Xóa Cột C" : "Clear Column C"}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
              <textarea
                className="w-full flex-1 p-4 bg-transparent text-slate-800 dark:text-slate-200 font-mono text-xs leading-relaxed resize-none focus:outline-none"
                placeholder={lang === "vi" ? "Nhập dữ liệu Cột C (mỗi mục một dòng)..." : "Enter Column C data (one item per line)..."}
                value={state.combineCol2 ?? ""}
                onChange={(e) => onChange({ combineCol2: e.target.value })}
              />
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              <span>
                {lang === "vi" 
                  ? "Công thức ghép: [Cột A] + [Cột B (Phân cách)] + [Cột C]" 
                  : "Join Formula: [Column A] + [Column B (Delimiter)] + [Column C]"}
              </span>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={handleSwapAC}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                title="Swap Column A and Column C"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                <span>{lang === "vi" ? "Đổi vị trí A ⇄ C" : "Swap A ⇄ C"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onChange({ combineCol1: "", combineCol2: "", combineDelimiter: "" });
                  setCombineOutput("");
                  showToast(lang === "vi" ? "Đã xóa toàn bộ dữ liệu 3 cột!" : "Cleared all 3 columns data!");
                }}
                className="px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{t("common.reset")}</span>
              </button>

              <button
                type="button"
                onClick={handleCombine}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer"
              >
                <Columns className="h-4 w-4" />
                <span>{lang === "vi" ? "Ghép Dữ Liệu (Cột A + B + C)" : "Join Columns (A + B + C)"}</span>
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
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                  title="Copy merged output"
                >
                  {copiedText === "combine" ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-emerald-500 font-semibold">{lang === "vi" ? "Đã chép" : "Copied"}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                      <span>{lang === "vi" ? "Sao chép" : "Copy"}</span>
                    </>
                  )}
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
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                  title="Copy generated list"
                >
                  {copiedText === "autoinc" ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-emerald-500 font-semibold">{lang === "vi" ? "Đã chép" : "Copied"}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                      <span>{lang === "vi" ? "Sao chép" : "Copy"}</span>
                    </>
                  )}
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
