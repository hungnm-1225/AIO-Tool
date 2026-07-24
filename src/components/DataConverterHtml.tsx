import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { DataConverterState } from "../types";
import { useI18n } from "../utils/i18n";
import CodeEditor from "./CodeEditor";
import { 
  beautifyJson, minifyJson,
  beautifyHtml, minifyHtml,
  beautifyCss, minifyCss,
  beautifyJs, minifyJs,
  csvToJson, jsonToCsv 
} from "../utils/formatters";
import * as XLSX from "xlsx";
import { 
  Code, 
  Table, 
  Play, 
  Copy, 
  Check, 
  CheckCircle, 
  AlertTriangle,
  Download,
  Lock,
  Unlock,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Plus,
  Trash2,
  RotateCcw,
  Maximize2,
  Minimize2,
  Monitor,
  Tablet,
  Smartphone,
  Terminal
} from "lucide-react";

interface DataConverterHtmlProps {
  state: DataConverterState;
  onChange: (newState: Partial<DataConverterState>) => void;
}

export default function DataConverterHtml({ state, onChange }: DataConverterHtmlProps) {
  const { t, lang } = useI18n();
  const [activeSubTab, setActiveSubTab] = useState<"format" | "convert" | "preview">("format");
  const [isInputFullScreen, setIsInputFullScreen] = useState(false);
  const [isPreviewFullScreen, setIsPreviewFullScreen] = useState(false);
  const [viewportMode, setViewportMode] = useState<"desktop" | "tablet" | "mobile">("desktop");

  // Synchronize sub-tab from hash
  useEffect(() => {
    const syncSubTab = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === "#formatter" || hash === "#format") {
        setActiveSubTab("format");
      } else if (hash === "#converter" || hash === "#convert") {
        setActiveSubTab("convert");
      } else if (hash === "#html-sandbox" || hash === "#preview" || hash === "#sandbox") {
        setActiveSubTab("preview");
      }
    };

    syncSubTab();

    window.addEventListener("hashchange", syncSubTab);
    return () => window.removeEventListener("hashchange", syncSubTab);
  }, []);

  const handleTabChange = (tab: "format" | "convert" | "preview") => {
    setActiveSubTab(tab);
    const hash =
      tab === "format"
        ? "formatter"
        : tab === "convert"
        ? "converter"
        : "html-sandbox";
    window.location.hash = hash;
  };
  const [copiedIdentifier, setCopiedIdentifier] = useState<string | null>(null);

  // Parse state for Visual Grid
  const [parsedJson, setParsedJson] = useState<any>([]);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [iframeSrcDoc, setIframeSrcDoc] = useState("");

  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);
  const [collapsedRecords, setCollapsedRecords] = useState<Record<number, boolean>>({});

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortKey(null);
        setSortDirection(null);
      }
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const resetSort = () => {
    setSortKey(null);
    setSortDirection(null);
    showToast(
      lang === "vi"
        ? "Đã khôi phục bảng về thứ tự ban đầu!"
        : "Restored table to original order!"
    );
  };

  const toggleCollapseRecord = (idx: number) => {
    setCollapsedRecords((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const getSortedData = () => {
    if (!Array.isArray(parsedJson)) return parsedJson;
    if (!sortKey || !sortDirection) return parsedJson;

    return [...parsedJson].sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];

      if (valA === undefined || valA === null) valA = "";
      if (valB === undefined || valB === null) valB = "";

      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB) && valA !== "" && valB !== "") {
        return sortDirection === "asc" ? numA - numB : numB - numA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();

      if (strA < strB) return sortDirection === "asc" ? -1 : 1;
      if (strA > strB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  };

  const displayJson = getSortedData();

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
      setCopiedIdentifier(identifier);
      showToast(t("common.copied"));
      setTimeout(() => setCopiedIdentifier(null), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  // Sync parsed JSON state whenever rawJson changes
  useEffect(() => {
    try {
      if (state.rawJson.trim() === "") {
        setParsedJson([]);
        setJsonError(null);
        return;
      }
      const parsed = JSON.parse(state.rawJson);
      setParsedJson(parsed);
      setJsonError(null);
    } catch (err: any) {
      setJsonError(err.message);
    }
  }, [state.rawJson]);

  // Sync edited cells/inputs back to rawJson
  const syncBackToJson = (updatedData: any) => {
    setParsedJson(updatedData);
    onChange({ rawJson: JSON.stringify(updatedData, null, 2) });
  };

  // --- SUB-FEATURE 1: FORMATTER ACTIONS ---
  const handleFormat = (action: "beautify" | "minify") => {
    const input = state.formatInput;
    if (!input.trim()) {
      showToast(
        lang === "vi"
          ? "Vui lòng nhập mã nguồn để xử lý!"
          : "Please enter source code to process!",
        true
      );
      return;
    }

    try {
      let result = "";
      if (state.activeFormatType === "json") {
        result = action === "beautify" ? beautifyJson(input) : minifyJson(input);
      } else if (state.activeFormatType === "html") {
        result = action === "beautify" ? beautifyHtml(input) : minifyHtml(input);
      } else if (state.activeFormatType === "css") {
        result = action === "beautify" ? beautifyCss(input) : minifyCss(input);
      } else if (state.activeFormatType === "javascript") {
        result = action === "beautify" ? beautifyJs(input) : minifyJs(input);
      }
      onChange({ formatInput: result });
      showToast(
        action === "beautify"
          ? (lang === "vi" ? "Định dạng mã thành công!" : "Code formatted successfully!")
          : (lang === "vi" ? "Nén mã thành công!" : "Code minified successfully!")
      );
    } catch (err: any) {
      showToast(
        lang === "vi" ? `Lỗi cú pháp: ${err.message}` : `Parse error: ${err.message}`,
        true
      );
    }
  };

  // --- SUB-FEATURE 2: DATA CONVERTER ACTIONS ---
  const handleConvertCsvToJson = () => {
    const csv = state.rawCsv;
    if (!csv.trim()) {
      showToast(
        lang === "vi" ? "Vui lòng nhập dữ liệu CSV!" : "Please enter CSV data!",
        true
      );
      return;
    }
    try {
      const jsonArr = csvToJson(csv);
      onChange({ rawJson: JSON.stringify(jsonArr, null, 2) });
      showToast(
        lang === "vi" ? "Chuyển đổi CSV sang JSON thành công!" : "CSV converted to JSON successfully!"
      );
    } catch (err: any) {
      showToast(
        lang === "vi" ? `Lỗi chuyển đổi: ${err.message}` : `Conversion error: ${err.message}`,
        true
      );
    }
  };

  const handleConvertJsonToCsvAction = () => {
    if (jsonError || !parsedJson || (Array.isArray(parsedJson) && parsedJson.length === 0)) {
      showToast(
        lang === "vi"
          ? "Vui lòng nhập một mảng JSON hợp lệ trước!"
          : "Please enter a valid JSON array first!",
        true
      );
      return;
    }
    try {
      const data = Array.isArray(parsedJson) ? parsedJson : [parsedJson];
      const csv = jsonToCsv(data);
      onChange({ rawCsv: csv });
      showToast(lang === "vi" ? "Đã xuất JSON sang CSV!" : "Exported JSON to CSV!");
    } catch (err: any) {
      showToast(
        lang === "vi" ? `Lỗi chuyển đổi: ${err.message}` : `Conversion error: ${err.message}`,
        true
      );
    }
  };

  const handleExportToXlsx = () => {
    if (jsonError || !parsedJson) {
      showToast(
        lang === "vi"
          ? "Dữ liệu JSON hiện tại không hợp lệ để xuất Excel!"
          : "Current JSON is invalid for Excel export!",
        true
      );
      return;
    }
    try {
      const dataToExport = Array.isArray(parsedJson) ? parsedJson : [parsedJson];
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      XLSX.writeFile(workbook, "vibecode_converted_data.xlsx");
      showToast(
        lang === "vi"
          ? "Tải xuống tệp Excel (XLSX) thành công!"
          : "Excel file (XLSX) downloaded successfully!"
      );
    } catch (err: any) {
      showToast(
        lang === "vi" ? `Lỗi xuất Excel: ${err.message}` : `Excel Export Error: ${err.message}`,
        true
      );
    }
  };

  // Cell editing handlers
  const handleCellChange = (rowIndex: number, key: string, value: string) => {
    if (state.lockEdit) return;
    if (Array.isArray(parsedJson)) {
      const updated = [...parsedJson];
      const targetObj = displayJson[rowIndex];
      const originalIndex = parsedJson.indexOf(targetObj);
      if (originalIndex !== -1) {
        updated[originalIndex] = { ...updated[originalIndex], [key]: value };
        syncBackToJson(updated);
      }
    } else if (typeof parsedJson === "object" && parsedJson !== null) {
      const updated = { ...parsedJson, [key]: value };
      syncBackToJson(updated);
    }
  };

  const handleAddRow = () => {
    if (state.lockEdit) return;
    if (Array.isArray(parsedJson)) {
      const template = parsedJson.length > 0 ? { ...parsedJson[0] } : { key1: "", key2: "" };
      // reset properties
      Object.keys(template).forEach(k => template[k] = "");
      const updated = [...parsedJson, template];
      syncBackToJson(updated);
      showToast(lang === "vi" ? "Đã thêm dòng mới vào lưới!" : "Added new row to grid!");
    } else {
      const updated = [parsedJson || {}, {}];
      syncBackToJson(updated);
    }
  };

  const handleDeleteRow = (idx: number) => {
    if (state.lockEdit) return;
    if (Array.isArray(parsedJson)) {
      const targetObj = displayJson[idx];
      const originalIndex = parsedJson.indexOf(targetObj);
      if (originalIndex !== -1) {
        const updated = parsedJson.filter((_, rIndex) => rIndex !== originalIndex);
        syncBackToJson(updated);
        showToast(lang === "vi" ? "Đã xóa dòng được chọn!" : "Deleted selected row!");
      }
    }
  };

  // Render Visual Grid Headers
  const getGridKeys = (): string[] => {
    if (Array.isArray(parsedJson) && parsedJson.length > 0) {
      return Object.keys(parsedJson[0]);
    } else if (typeof parsedJson === "object" && parsedJson !== null) {
      return Object.keys(parsedJson);
    }
    return [];
  };

  const gridKeys = getGridKeys();

  // --- SUB-FEATURE 3: HTML LIVE PREVIEW ACTIONS ---
  const handleRefreshCode = () => {
    if (state.htmlPreviewMode === "single") {
      setIframeSrcDoc(state.htmlSingleInput ?? "");
    } else {
      const combined = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <style>
            ${state.cssSplitInput ?? ""}
          </style>
        </head>
        <body>
          ${state.htmlSplitInput ?? ""}
          <script>
            try {
              ${state.jsSplitInput ?? ""}
            } catch (err) {
              console.error("Live JS error:", err);
            }
          </script>
        </body>
        </html>
      `;
      setIframeSrcDoc(combined);
    }
  };

  // Trigger iframe update on changes
  useEffect(() => {
    if (activeSubTab === "preview") {
      const timer = setTimeout(handleRefreshCode, 300); // lightweight debounce
      return () => clearTimeout(timer);
    }
  }, [
    state.htmlPreviewMode, 
    state.htmlSingleInput, 
    state.htmlSplitInput, 
    state.cssSplitInput, 
    state.jsSplitInput,
    activeSubTab
  ]);

  return (
    <div className="flex-1 overflow-auto bg-slate-50 dark:bg-[#0B0F1A] p-6 space-y-6">

      {/* Sub Navigation */}
      <div className="border-b border-slate-200 dark:border-slate-800/80 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="h-9 w-9 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-md shadow-sky-600/20">
                <Terminal className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>{t("dataConverter.title")}</span>
                <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                  Data & HTML Runner
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("dataConverter.subtitle")}
            </p>
          </div>

          <div className="flex bg-slate-100 dark:bg-[#111827] p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
            <button
              onClick={() => handleTabChange("format")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === "format"
                  ? "bg-white dark:bg-[#0B0F1A] text-slate-800 dark:text-slate-200 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              <Code className="h-3.5 w-3.5" /> {t("dataConverter.dataFormatterTab")}
            </button>
            <button
              onClick={() => handleTabChange("convert")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === "convert"
                  ? "bg-white dark:bg-[#0B0F1A] text-slate-800 dark:text-slate-200 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              <Table className="h-3.5 w-3.5" /> {t("dataConverter.jsonTab")}
            </button>
            <button
              onClick={() => handleTabChange("preview")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === "preview"
                  ? "bg-white dark:bg-[#0B0F1A] text-slate-800 dark:text-slate-200 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              <Play className="h-3.5 w-3.5" /> {t("dataConverter.htmlRunnerTab")}
            </button>
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: BEAUTIFIER / MINIFIER */}
      {activeSubTab === "format" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-4">
            {/* Lang Selection */}
            <div className="flex gap-2">
              {(["json", "html", "css", "javascript"] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => onChange({ activeFormatType: lang })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                    state.activeFormatType === lang
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-50 dark:bg-[#0B0F1A] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {lang === "javascript" ? "JS" : lang}
                </button>
              ))}
            </div>

            {/* Quick formatting buttons */}
            <div className="flex gap-2.5">
              <button
                onClick={() => handleFormat("beautify")}
                className="px-4.5 py-2 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 cursor-pointer"
              >
                {t("dataConverter.beautifyJson")}
              </button>
              <button
                onClick={() => handleFormat("minify")}
                className="px-4.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white cursor-pointer"
              >
                {t("dataConverter.minifyJson")}
              </button>
            </div>
          </div>

          {/* Formatter Input / Output Area */}
          <CodeEditor
            value={state.formatInput ?? ""}
            onChange={(val) => onChange({ formatInput: val })}
            language={state.activeFormatType}
            height="h-[500px]"
            title={`Workspace Editor (${state.activeFormatType.toUpperCase()})`}
            showDownload={true}
            showCopy={true}
            showClear={true}
            defaultFilename={`formatted_code.${
              state.activeFormatType === "javascript" ? "js" : state.activeFormatType
            }`}
          />
        </div>
      )}

      {/* SUB-TAB 2: VISUAL DATA CONVERTER */}
      {activeSubTab === "convert" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Inputs Section - Left */}
          <div className="xl:col-span-4 flex flex-col gap-6">
            {/* Raw JSON Input */}
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col h-[280px]">
              <div className="p-3 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/50 dark:bg-[#0B0F1A]/50 rounded-t-2xl">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className="text-xs font-mono font-bold uppercase text-indigo-600 dark:text-indigo-400">
                    {t("dataConverter.rawInputLabel")}
                  </span>
                  {jsonError && (
                    <span className="text-[9px] text-rose-500 truncate max-w-[120px] ml-1" title={jsonError}>
                      (Error: {jsonError})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleCopy(state.rawJson, "raw_json")}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
                    title="Copy JSON"
                  >
                    {copiedIdentifier === "raw_json" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => {
                      onChange({ rawJson: "" });
                      showToast(lang === "vi" ? "Đã xóa dữ liệu JSON thô!" : "Cleared raw JSON data!");
                    }}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-rose-500 cursor-pointer transition-colors"
                    title="Clear JSON"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <textarea
                className="w-full flex-1 p-4 bg-transparent text-slate-800 dark:text-slate-200 font-mono text-xs leading-relaxed resize-none focus:outline-none"
                placeholder='Enter JSON array (e.g. [{"id":1, "name":"John"}]) to render interactive grid...'
                value={state.rawJson ?? ""}
                onChange={(e) => onChange({ rawJson: e.target.value })}
              />
              <div className="p-2 bg-slate-50 dark:bg-[#0B0F1A]/50 border-t border-slate-100 dark:border-slate-800/60 flex justify-between">
                <button
                  onClick={handleConvertJsonToCsvAction}
                  className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  {t("dataConverter.jsonToCsv")}
                </button>
              </div>
            </div>

            {/* Raw CSV Input */}
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col h-[280px]">
              <div className="p-3 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/50 dark:bg-[#0B0F1A]/50 rounded-t-2xl">
                <span className="text-xs font-mono font-bold uppercase text-slate-500 dark:text-slate-400">
                  {t("dataConverter.rawCsvLabel")}
                </span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleCopy(state.rawCsv, "raw_csv")}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
                    title="Copy CSV"
                  >
                    {copiedIdentifier === "raw_csv" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => {
                      onChange({ rawCsv: "" });
                      showToast(lang === "vi" ? "Đã xóa dữ liệu CSV thô!" : "Cleared raw CSV data!");
                    }}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-rose-500 cursor-pointer transition-colors"
                    title="Clear CSV"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <textarea
                className="w-full flex-1 p-4 bg-transparent text-slate-800 dark:text-slate-200 font-mono text-xs leading-relaxed resize-none focus:outline-none"
                placeholder="id,name,value&#10;1,John,Apple&#10;2,Alice,Grape"
                value={state.rawCsv ?? ""}
                onChange={(e) => onChange({ rawCsv: e.target.value })}
              />
              <div className="p-2 bg-slate-50 dark:bg-[#0B0F1A]/50 border-t border-slate-100 dark:border-slate-800/60 flex justify-between">
                <button
                  onClick={handleConvertCsvToJson}
                  className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  {t("dataConverter.csvToJson")}
                </button>
              </div>
            </div>
          </div>

          {/* Visual Table Grid Section - Right */}
          <div className="xl:col-span-8 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col min-h-[580px]">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 dark:bg-[#0B0F1A]/50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Table className="h-4 w-4" /> {t("dataConverter.interactiveGrid")}
                </span>
                
                {/* Lock Edit */}
                <button
                  onClick={() => onChange({ lockEdit: !state.lockEdit })}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase transition-all cursor-pointer ${
                    state.lockEdit
                      ? "bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400"
                      : "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {state.lockEdit ? (
                    <>
                      <Lock className="h-3 w-3" /> {t("dataConverter.locked")}
                    </>
                  ) : (
                    <>
                      <Unlock className="h-3 w-3" /> {t("dataConverter.editable")}
                    </>
                  )}
                </button>
              </div>

              {/* Toggles & Excel Button */}
              <div className="flex flex-1 items-center justify-between md:justify-end gap-4 flex-wrap sm:flex-nowrap">
                {/* Left group of controls */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Restore Sort Button if sortKey exists */}
                  {sortKey && (
                    <button
                      onClick={resetSort}
                      className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/50 text-amber-600 dark:text-amber-400 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Restore original table sorting"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Restore Original
                    </button>
                  )}

                  {/* Label Value Toggle */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500 font-medium">Grid</span>
                    <button
                      onClick={() => onChange({ labelValueMode: !state.labelValueMode })}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    >
                      {state.labelValueMode ? (
                        <ToggleRight className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <ToggleLeft className="h-6 w-6 text-slate-400" />
                      )}
                    </button>
                    <span className="text-[11px] text-slate-500 font-medium">Label-Value</span>
                  </div>

                  {/* Collapsible buttons in Label-Value mode, right of toggle switch */}
                  {state.labelValueMode && Array.isArray(parsedJson) && parsedJson.length > 0 && (
                    <>
                      <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            const collapses: Record<number, boolean> = {};
                            parsedJson.forEach((_, idx) => { collapses[idx] = true; });
                            setCollapsedRecords(collapses);
                          }}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-semibold text-[11px] rounded-lg cursor-pointer transition-colors"
                          title="Collapse all records"
                        >
                          Collapse All
                        </button>
                        <button
                          onClick={() => setCollapsedRecords({})}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-semibold text-[11px] rounded-lg cursor-pointer transition-colors"
                          title="Expand all records"
                        >
                          Expand All
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Right group of controls: Push Excel XLSX to the far right */}
                <div className="sm:ml-auto flex-shrink-0">
                  <button
                    onClick={handleExportToXlsx}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> Excel (XLSX)
                  </button>
                </div>
              </div>
            </div>

            {/* Grid Container */}
            <div className="flex-1 overflow-auto p-4">
              {jsonError ? (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-mono flex items-start gap-2.5">
                  <AlertTriangle className="h-4.5 w-4.5 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold mb-1">Invalid JSON Structure</div>
                    <div>{jsonError}. The format must be a flat array of objects (e.g., [&#123;&quot;key&quot;: &quot;value&quot;&#125;]) to render a grid.</div>
                  </div>
                </div>
              ) : parsedJson && gridKeys.length > 0 ? (
                /* Toggle Grid View vs Label-Value View */
                !state.labelValueMode ? (
                  /* Standard Grid Table */
                  <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-auto shadow-xs max-h-[440px]">
                    <table className="w-full text-left border-collapse font-mono text-xs relative">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-[#0B0F1A] border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10 shadow-[inset_0_-1px_0_rgba(226,232,240,1)] dark:shadow-[inset_0_-1px_0_rgba(51,65,85,1)]">
                          {gridKeys.map((k) => {
                            const isSorted = sortKey === k;
                            return (
                              <th 
                                key={k} 
                                onClick={() => handleSort(k)}
                                className="p-3 font-semibold text-slate-500 dark:text-slate-400 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors sticky top-0 bg-slate-50 dark:bg-[#0B0F1A] z-10"
                              >
                                <div className="flex items-center gap-1.5">
                                  <span>{k}</span>
                                  {isSorted ? (
                                    sortDirection === "asc" ? "▲" : "▼"
                                  ) : (
                                    <span className="text-[10px] text-slate-300 dark:text-slate-700 opacity-50">⇅</span>
                                  )}
                                </div>
                              </th>
                            );
                          })}
                          {!state.lockEdit && <th className="p-3 w-12 sticky top-0 bg-slate-50 dark:bg-[#0B0F1A] z-10 shadow-[inset_0_-1px_0_rgba(226,232,240,1)] dark:shadow-[inset_0_-1px_0_rgba(51,65,85,1)]" />}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {Array.isArray(displayJson) ? (
                          displayJson.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                              {gridKeys.map((k) => (
                                <td key={k} className="p-2">
                                  <input
                                    type="text"
                                    value={row[k] !== undefined ? row[k] : ""}
                                    readOnly={state.lockEdit}
                                    onChange={(e) => handleCellChange(rIdx, k, e.target.value)}
                                    className={`w-full bg-transparent px-2 py-1.5 focus:outline-none rounded border border-transparent focus:border-indigo-500/30 text-slate-800 dark:text-slate-200 ${
                                      state.lockEdit ? "cursor-default" : ""
                                    }`}
                                  />
                                </td>
                              ))}
                              {!state.lockEdit && (
                                <td className="p-2 text-center">
                                  <button
                                    onClick={() => handleDeleteRow(rIdx)}
                                    className="text-slate-400 hover:text-rose-500 p-1.5 rounded cursor-pointer"
                                    title="Delete this row"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))
                        ) : (
                          /* Fallback single object */
                          <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                            {gridKeys.map((k) => (
                              <td key={k} className="p-2">
                                <input
                                  type="text"
                                  value={parsedJson[k] !== undefined ? parsedJson[k] : ""}
                                  readOnly={state.lockEdit}
                                  onChange={(e) => handleCellChange(0, k, e.target.value)}
                                  className="w-full bg-transparent px-2 py-1.5 focus:outline-none rounded border border-transparent focus:border-indigo-500/30 text-slate-800 dark:text-slate-200"
                                />
                              </td>
                            ))}
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* Vertical Label-Value list view */
                  <div className="space-y-3.5 max-w-2xl font-mono text-xs">
                    {Array.isArray(displayJson) ? (
                      displayJson.map((row, rIdx) => {
                        const isCollapsed = collapsedRecords[rIdx];
                        return (
                          <div key={rIdx} className="p-4 bg-slate-50/60 dark:bg-[#0B0F1A]/50 border border-slate-100 dark:border-slate-800 rounded-xl space-y-2.5 transition-all duration-200">
                            <div 
                              className="text-[11px] font-bold text-indigo-500 flex justify-between items-center cursor-pointer select-none"
                              onClick={() => toggleCollapseRecord(rIdx)}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400 font-mono w-4 text-center">
                                  {isCollapsed ? "▶" : "▼"}
                                </span>
                                <span>Record #{rIdx + 1}</span>
                                {isCollapsed && (
                                  <span className="text-[10px] text-slate-400 font-normal italic font-mono truncate max-w-xs md:max-w-md ml-2">
                                    ({Object.entries(row).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(", ")}...)
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => toggleCollapseRecord(rIdx)}
                                  className="text-indigo-600 dark:text-indigo-400 hover:underline text-[10px] font-semibold cursor-pointer"
                                >
                                  {isCollapsed ? "Expand" : "Collapse"}
                                </button>
                                {!state.lockEdit && (
                                  <>
                                    <div className="h-3 w-px bg-slate-200 dark:bg-slate-800" />
                                    <button 
                                      onClick={() => handleDeleteRow(rIdx)}
                                      className="text-rose-500 hover:underline font-normal text-[10px] cursor-pointer"
                                    >
                                      Delete Record
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            {!isCollapsed && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 animate-fade-in">
                                {gridKeys.map((k) => (
                                  <div key={k} className="flex flex-col gap-1">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">{k}</span>
                                    <input
                                      type="text"
                                      value={row[k] ?? ""}
                                      readOnly={state.lockEdit}
                                      onChange={(e) => handleCellChange(rIdx, k, e.target.value)}
                                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      /* Single Object */
                      <div className="p-4 bg-slate-50/60 dark:bg-[#0B0F1A]/50 border border-slate-100 dark:border-slate-800 rounded-xl space-y-3.5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {gridKeys.map((k) => (
                            <div key={k} className="flex flex-col gap-1">
                              <span className="text-[10px] text-slate-400 font-bold uppercase">{k}</span>
                              <input
                                  type="text"
                                  value={parsedJson[k] ?? ""}
                                  readOnly={state.lockEdit}
                                  onChange={(e) => handleCellChange(0, k, e.target.value)}
                                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center py-12">
                  <Table className="h-10 w-10 mb-3 text-slate-300 dark:text-slate-700" />
                  <p className="text-sm font-sans">No active table data.</p>
                  <p className="text-xs max-w-sm mt-1 leading-normal">
                    Paste valid JSON array data on the left panel to dynamically build and sync this interactive table.
                  </p>
                </div>
              )}
            </div>

            {/* Add row controller if editable */}
            {!state.lockEdit && !jsonError && parsedJson && gridKeys.length > 0 && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-[#0B0F1A]/50 rounded-b-2xl">
                <button
                  onClick={handleAddRow}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Add New Row
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: HTML LIVE PREVIEW */}
      {activeSubTab === "preview" && (
        <div className="flex flex-col gap-6">
          {/* Inputs - Top (Doubled Width!) */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col space-y-4 h-[450px]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Code className="h-4 w-4 text-indigo-500" /> Code Sandbox
              </h3>

              <div className="flex items-center gap-3">
                {/* Mode Toggle */}
                <div className="flex bg-slate-100 dark:bg-[#0B0F1A] p-1 rounded-lg border border-slate-200/40 dark:border-slate-800/40">
                  <button
                    onClick={() => onChange({ htmlPreviewMode: "single" })}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      state.htmlPreviewMode === "single"
                        ? "bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-200 shadow-sm"
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    }`}
                  >
                    Single HTML
                  </button>
                  <button
                    onClick={() => onChange({ htmlPreviewMode: "split" })}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      state.htmlPreviewMode === "split"
                        ? "bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-200 shadow-sm"
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    }`}
                  >
                    Split Inputs
                  </button>
                </div>

                <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

                <button
                  onClick={() => setIsInputFullScreen(true)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer"
                  title="Open code editor in fullscreen"
                >
                  <Maximize2 className="h-3.5 w-3.5" /> Fullscreen
                </button>
              </div>
            </div>

            {/* Editor Textareas */}
            {state.htmlPreviewMode === "single" ? (
              <div className="flex-1 flex flex-col min-h-0">
                <CodeEditor
                  value={state.htmlSingleInput ?? ""}
                  onChange={(val) => onChange({ htmlSingleInput: val })}
                  language="html"
                  height="h-[360px]"
                  title="HTML Code Editor"
                  defaultFilename="index.html"
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
                <CodeEditor
                  className="flex-1 min-h-0"
                  value={state.htmlSplitInput ?? ""}
                  onChange={(val) => onChange({ htmlSplitInput: val })}
                  language="html"
                  height="h-[360px]"
                  title="HTML"
                  defaultFilename="index.html"
                />
                <CodeEditor
                  className="flex-1 min-h-0"
                  value={state.cssSplitInput ?? ""}
                  onChange={(val) => onChange({ cssSplitInput: val })}
                  language="css"
                  height="h-[360px]"
                  title="CSS"
                  defaultFilename="styles.css"
                />
                <CodeEditor
                  className="flex-1 min-h-0"
                  value={state.jsSplitInput ?? ""}
                  onChange={(val) => onChange({ jsSplitInput: val })}
                  language="javascript"
                  height="h-[360px]"
                  title="JavaScript"
                  defaultFilename="script.js"
                />
              </div>
            )}
          </div>

          {/* Iframe Preview Container - Bottom (Doubled Width!) */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col h-[580px] overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-[#0B0F1A]/50">
              <span className="text-xs font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Play className="h-3.5 w-3.5" /> Interactive Sandbox Preview
              </span>

              {/* Viewport Mode Controls */}
              <div className="flex bg-slate-200/60 dark:bg-[#0B0F1A] p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <button
                  onClick={() => setViewportMode("desktop")}
                  title="Desktop Mode (100% width)"
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewportMode === "desktop"
                      ? "bg-white dark:bg-[#111827] text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5" />
                  <span>Desktop</span>
                </button>
                <button
                  onClick={() => setViewportMode("tablet")}
                  title="Tablet Mode (768px width)"
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewportMode === "tablet"
                      ? "bg-white dark:bg-[#111827] text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                  }`}
                >
                  <Tablet className="h-3.5 w-3.5" />
                  <span>Tablet</span>
                </button>
                <button
                  onClick={() => setViewportMode("mobile")}
                  title="Mobile Mode (375px width)"
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewportMode === "mobile"
                      ? "bg-white dark:bg-[#111827] text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>Mobile</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleRefreshCode}
                  className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline cursor-pointer"
                  title="Re-render iframe code"
                >
                  <RefreshCw className="h-3 w-3" /> Refresh Code
                </button>
                <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
                <button
                  onClick={() => setIsPreviewFullScreen(true)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer"
                  title="Open preview in fullscreen"
                >
                  <Maximize2 className="h-3.5 w-3.5" /> Fullscreen
                </button>
              </div>
            </div>

            {/* Viewport Frame Box */}
            <div className="flex-1 bg-slate-100 dark:bg-[#0B0F1A] p-2 flex justify-center items-center overflow-auto relative">
              <div
                className={`h-full bg-white transition-all duration-300 shadow-md ${
                  viewportMode === "mobile"
                    ? "w-[375px] max-w-full rounded-2xl border-4 border-slate-800 my-1"
                    : viewportMode === "tablet"
                    ? "w-[768px] max-w-full rounded-xl border-4 border-slate-700 my-1"
                    : "w-full"
                }`}
              >
                <iframe
                  title="HTML Live Sandbox"
                  className="w-full h-full border-none rounded-lg bg-white"
                  sandbox="allow-scripts"
                  srcDoc={iframeSrcDoc}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inputs Fullscreen Modal Overlay */}
      {isInputFullScreen && (
        <div className="fixed inset-0 z-50 p-4 md:p-6 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center animate-fade-in">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col w-full h-full max-w-7xl max-h-[92vh] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Code className="h-4 w-4 text-indigo-500" /> Fullscreen Code Sandbox
              </h3>
              
              <div className="flex items-center gap-4">
                {/* Mode Toggle */}
                <div className="flex bg-slate-100 dark:bg-[#0B0F1A] p-1 rounded-lg border border-slate-200/40 dark:border-slate-800/40">
                  <button
                    onClick={() => onChange({ htmlPreviewMode: "single" })}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      state.htmlPreviewMode === "single"
                        ? "bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-200 shadow-sm"
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    }`}
                  >
                    Single HTML
                  </button>
                  <button
                    onClick={() => onChange({ htmlPreviewMode: "split" })}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      state.htmlPreviewMode === "split"
                        ? "bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-200 shadow-sm"
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    }`}
                  >
                    Split Inputs
                  </button>
                </div>

                <button
                  onClick={() => setIsInputFullScreen(false)}
                  className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 flex items-center gap-1 text-xs font-semibold transition-all cursor-pointer"
                >
                  <Minimize2 className="h-4 w-4" /> Exit Fullscreen
                </button>
              </div>
            </div>

            {/* Editor Textareas */}
            {state.htmlPreviewMode === "single" ? (
              <div className="flex-1 flex flex-col min-h-0">
                <CodeEditor
                  value={state.htmlSingleInput ?? ""}
                  onChange={(val) => onChange({ htmlSingleInput: val })}
                  language="html"
                  height="h-full"
                  title="HTML Code Editor"
                  defaultFilename="index.html"
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
                <CodeEditor
                  className="flex-1 min-h-0"
                  value={state.htmlSplitInput ?? ""}
                  onChange={(val) => onChange({ htmlSplitInput: val })}
                  language="html"
                  height="h-full"
                  title="HTML"
                  defaultFilename="index.html"
                />
                <CodeEditor
                  className="flex-1 min-h-0"
                  value={state.cssSplitInput ?? ""}
                  onChange={(val) => onChange({ cssSplitInput: val })}
                  language="css"
                  height="h-full"
                  title="CSS"
                  defaultFilename="styles.css"
                />
                <CodeEditor
                  className="flex-1 min-h-0"
                  value={state.jsSplitInput ?? ""}
                  onChange={(val) => onChange({ jsSplitInput: val })}
                  language="javascript"
                  height="h-full"
                  title="JavaScript"
                  defaultFilename="script.js"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview Fullscreen Modal Overlay */}
      {isPreviewFullScreen && (
        <div className="fixed inset-0 z-50 p-4 md:p-6 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center animate-fade-in">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col w-full h-full max-w-7xl max-h-[92vh] overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-[#0B0F1A]/50">
              <span className="text-xs font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Play className="h-3.5 w-3.5" /> Interactive Sandbox Preview (Fullscreen)
              </span>

              {/* Viewport Mode Controls */}
              <div className="flex bg-slate-200/60 dark:bg-[#0B0F1A] p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <button
                  onClick={() => setViewportMode("desktop")}
                  title="Desktop Mode (100% width)"
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewportMode === "desktop"
                      ? "bg-white dark:bg-[#111827] text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5" />
                  <span>Desktop</span>
                </button>
                <button
                  onClick={() => setViewportMode("tablet")}
                  title="Tablet Mode (768px width)"
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewportMode === "tablet"
                      ? "bg-white dark:bg-[#111827] text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                  }`}
                >
                  <Tablet className="h-3.5 w-3.5" />
                  <span>Tablet</span>
                </button>
                <button
                  onClick={() => setViewportMode("mobile")}
                  title="Mobile Mode (375px width)"
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewportMode === "mobile"
                      ? "bg-white dark:bg-[#111827] text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>Mobile</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleRefreshCode}
                  className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" /> Refresh Code
                </button>
                <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
                <button
                  onClick={() => setIsPreviewFullScreen(false)}
                  className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 flex items-center gap-1 text-xs font-semibold transition-all cursor-pointer"
                >
                  <Minimize2 className="h-4 w-4" /> Exit Fullscreen
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 dark:bg-[#0B0F1A] p-2 flex justify-center items-center overflow-auto relative">
              <div
                className={`h-full bg-white transition-all duration-300 shadow-md ${
                  viewportMode === "mobile"
                    ? "w-[375px] max-w-full rounded-2xl border-4 border-slate-800 my-1"
                    : viewportMode === "tablet"
                    ? "w-[768px] max-w-full rounded-xl border-4 border-slate-700 my-1"
                    : "w-full"
                }`}
              >
                <iframe
                  title="HTML Live Sandbox"
                  className="w-full h-full border-none rounded-lg bg-white"
                  sandbox="allow-scripts"
                  srcDoc={iframeSrcDoc}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
