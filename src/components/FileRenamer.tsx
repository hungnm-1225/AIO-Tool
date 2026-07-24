import React, { useState, useMemo } from "react";
import { FileRenamerState } from "../types";
import { useI18n } from "../utils/i18n";
import {
  FolderSync,
  Upload,
  FileDown,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  File,
  Sparkles,
  Edit3,
  Check,
  RefreshCw,
  Hash,
  Type
} from "lucide-react";
import JSZip from "jszip";
import { toast } from "react-toastify";

export interface FileItem {
  id: string;
  file: File;
  originalName: string;
  originalExt: string;
  nameWithoutExt: string;
  customOverride?: string;
}

interface FileRenamerProps {
  state?: FileRenamerState;
  onChange?: (updated: Partial<FileRenamerState>) => void;
}

const DEFAULT_RENAMER_STATE: FileRenamerState = {
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
};

export default function FileRenamer({ state, onChange }: FileRenamerProps) {
  const { t, lang } = useI18n();
  const currentState = state || DEFAULT_RENAMER_STATE;

  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const updateState = (updates: Partial<FileRenamerState>) => {
    if (onChange) {
      onChange(updates);
    }
  };

  // Helper to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Get file icon based on extension
  const getFileIcon = (ext: string) => {
    const e = ext.toLowerCase();
    if (["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp"].includes(e)) {
      return <FileImage className="h-4 w-4 text-amber-500" />;
    }
    if (["xlsx", "xls", "csv"].includes(e)) {
      return <FileSpreadsheet className="h-4 w-4 text-emerald-500" />;
    }
    if (["doc", "docx", "pdf", "txt", "md"].includes(e)) {
      return <FileText className="h-4 w-4 text-sky-500" />;
    }
    if (["json", "js", "ts", "html", "css", "py", "cpp", "java"].includes(e)) {
      return <FileCode className="h-4 w-4 text-purple-500" />;
    }
    if (["zip", "rar", "7z", "tar", "gz"].includes(e)) {
      return <FileArchive className="h-4 w-4 text-orange-500" />;
    }
    return <File className="h-4 w-4 text-slate-400" />;
  };

  // Process uploaded files
  const handleFileUpload = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const newItems: FileItem[] = Array.from(fileList).map((f) => {
      const lastDot = f.name.lastIndexOf(".");
      let originalExt = "";
      let nameWithoutExt = f.name;
      if (lastDot > 0) {
        originalExt = f.name.substring(lastDot + 1);
        nameWithoutExt = f.name.substring(0, lastDot);
      }
      return {
        id: Math.random().toString(36).substring(2, 9),
        file: f,
        originalName: f.name,
        originalExt,
        nameWithoutExt,
      };
    });

    setFiles((prev) => [...prev, ...newItems]);
    toast.success(
      lang === "vi"
        ? `Đã tải thành công ${newItems.length} tệp!`
        : `${newItems.length} file(s) loaded successfully!`
    );
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  // Compute final new filename for an item
  const computeNewName = (item: FileItem, index: number): string => {
    if (item.customOverride) {
      return item.customOverride;
    }

    let base = item.nameWithoutExt;

    // Search and Replace
    if (currentState.findStr) {
      base = base.replaceAll(currentState.findStr, currentState.replaceStr || "");
    }

    // Prefix & Suffix
    if (currentState.prefix) {
      base = currentState.prefix + base;
    }
    if (currentState.suffix) {
      base = base + currentState.suffix;
    }

    // Numbering pattern
    if (currentState.enableNumbering) {
      const numVal = currentState.startNumber + index * currentState.stepNumber;
      const numStr = String(numVal).padStart(currentState.zeroPadding || 1, "0");

      let pattern = currentState.numberingPattern || "[name]_[x]";
      base = pattern.replaceAll("[name]", base).replaceAll("[x]", numStr);
    }

    // Case mode for filename base
    if (currentState.caseMode === "lowercase") {
      base = base.toLowerCase();
    } else if (currentState.caseMode === "uppercase") {
      base = base.toUpperCase();
    } else if (currentState.caseMode === "titlecase") {
      base = base.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
    }

    // Extension case
    let ext = item.originalExt;
    if (currentState.extensionCase === "lowercase") {
      ext = ext.toLowerCase();
    } else if (currentState.extensionCase === "uppercase") {
      ext = ext.toUpperCase();
    }

    return ext ? `${base}.${ext}` : base;
  };

  // Move item up / down
  const moveItem = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= files.length) return;

    const updated = [...files];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setFiles(updated);
  };

  // Delete item
  const removeItem = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Single file download
  const downloadSingleFile = (item: FileItem, index: number) => {
    const finalName = computeNewName(item, index);
    const url = URL.createObjectURL(item.file);
    const a = document.createElement("a");
    a.href = url;
    a.download = finalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(
      lang === "vi" ? `Đã tải xuống "${finalName}"` : `Downloaded "${finalName}"`
    );
  };

  // Download All as ZIP
  const downloadAllAsZip = async () => {
    if (files.length === 0) return;

    setIsGeneratingZip(true);
    try {
      const zip = new JSZip();

      // Ensure unique filenames in ZIP
      const usedNames = new Set<string>();

      files.forEach((item, idx) => {
        let finalName = computeNewName(item, idx);
        let counter = 1;

        // resolve collisions
        while (usedNames.has(finalName)) {
          const lastDot = finalName.lastIndexOf(".");
          if (lastDot > 0) {
            const base = finalName.substring(0, lastDot);
            const ext = finalName.substring(lastDot);
            finalName = `${base}_${counter}${ext}`;
          } else {
            finalName = `${finalName}_${counter}`;
          }
          counter++;
        }
        usedNames.add(finalName);
        zip.file(finalName, item.file);
      });

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `renamed_files_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(t("fileRenamer.zipSuccess"));
    } catch (e) {
      console.error(e);
      toast.error(
        lang === "vi" ? "Có lỗi xảy ra khi tạo tệp nén ZIP!" : "Error generating ZIP archive!"
      );
    } finally {
      setIsGeneratingZip(false);
    }
  };

  // Copy new names list
  const copyNewNamesList = () => {
    const names = files.map((item, idx) => computeNewName(item, idx)).join("\n");
    navigator.clipboard.writeText(names);
    toast.info(t("fileRenamer.copiedNotice"));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-[#0B0F1A] text-slate-800 dark:text-slate-200 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="h-9 w-9 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-600/20">
              <FolderSync className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{t("fileRenamer.title")}</span>
              <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                Batch Preservation
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t("fileRenamer.subtitle")}
          </p>
        </div>

        {/* Feature badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Preserve Bytes</span>
          </span>
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5 text-indigo-500" />
            <span>Auto-Sequence [x]</span>
          </span>
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <FileDown className="h-3.5 w-3.5 text-emerald-500" />
            <span>ZIP Export</span>
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Renaming Rules Config Panel */}
        <div className="lg:col-span-4 bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-5 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3">
            <div className="flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {t("fileRenamer.renameOptions")}
              </h3>
            </div>
            <button
              onClick={() =>
                updateState({
                  prefix: "",
                  suffix: "",
                  findStr: "",
                  replaceStr: "",
                  enableNumbering: false,
                  caseMode: "original",
                  extensionCase: "original",
                })
              }
              className="text-[11px] font-semibold text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              <span>{t("common.reset")}</span>
            </button>
          </div>

          {/* 1. Prefix & Suffix */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              1. {t("fileRenamer.prefix")} / {t("fileRenamer.suffix")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">{t("fileRenamer.prefix")}</span>
                <input
                  type="text"
                  placeholder="e.g. Doc_"
                  value={currentState.prefix}
                  onChange={(e) => updateState({ prefix: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden transition-all"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">{t("fileRenamer.suffix")}</span>
                <input
                  type="text"
                  placeholder="e.g. _v1"
                  value={currentState.suffix}
                  onChange={(e) => updateState({ suffix: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden transition-all"
                />
              </div>
            </div>
          </div>

          {/* 2. Find and Replace */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              2. {t("fileRenamer.findStr")} & {t("fileRenamer.replaceStr")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">{t("fileRenamer.findStr")}</span>
                <input
                  type="text"
                  placeholder="e.g. IMG_"
                  value={currentState.findStr}
                  onChange={(e) => updateState({ findStr: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden transition-all"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">{t("fileRenamer.replaceStr")}</span>
                <input
                  type="text"
                  placeholder="e.g. Photo_"
                  value={currentState.replaceStr}
                  onChange={(e) => updateState({ replaceStr: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden transition-all"
                />
              </div>
            </div>
          </div>

          {/* 3. Auto Numbering */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentState.enableNumbering}
                  onChange={(e) => updateState({ enableNumbering: e.target.checked })}
                  className="rounded-md border-slate-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
                />
                <span>3. {t("fileRenamer.enableNumbering")}</span>
              </label>
            </div>

            {currentState.enableNumbering && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    {t("fileRenamer.numberingPattern")}
                  </span>
                  <input
                    type="text"
                    value={currentState.numberingPattern}
                    onChange={(e) => updateState({ numberingPattern: e.target.value })}
                    placeholder="[name]_[x]"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-xs font-mono focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden transition-all"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Gợi ý: <code>[name]_[x]</code> hoặc <code>File_[x]</code>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">{t("fileRenamer.startNumber")}</span>
                    <input
                      type="number"
                      value={currentState.startNumber}
                      onChange={(e) => updateState({ startNumber: parseInt(e.target.value) || 1 })}
                      className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-xs font-medium"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">{t("fileRenamer.stepNumber")}</span>
                    <input
                      type="number"
                      value={currentState.stepNumber}
                      onChange={(e) => updateState({ stepNumber: parseInt(e.target.value) || 1 })}
                      className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-xs font-medium"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">{t("fileRenamer.zeroPadding")}</span>
                    <select
                      value={currentState.zeroPadding}
                      onChange={(e) => updateState({ zeroPadding: parseInt(e.target.value) })}
                      className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-xs font-medium cursor-pointer"
                    >
                      <option value={1}>1 (1, 2, 3)</option>
                      <option value={2}>2 (01, 02)</option>
                      <option value={3}>3 (001, 002)</option>
                      <option value={4}>4 (0001)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. Letter Case & Extension Case */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              4. {t("fileRenamer.caseMode")}
            </label>

            <div>
              <span className="text-[11px] text-slate-400 block mb-1">Filename Case</span>
              <select
                value={currentState.caseMode}
                onChange={(e) => updateState({ caseMode: e.target.value as any })}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden transition-all cursor-pointer"
              >
                <option value="original">{t("fileRenamer.originalCase")}</option>
                <option value="lowercase">{t("fileRenamer.lowercase")}</option>
                <option value="uppercase">{t("fileRenamer.uppercase")}</option>
                <option value="titlecase">{t("fileRenamer.titlecase")}</option>
              </select>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block mb-1">{t("fileRenamer.extensionCase")}</span>
              <select
                value={currentState.extensionCase}
                onChange={(e) => updateState({ extensionCase: e.target.value as any })}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden transition-all cursor-pointer"
              >
                <option value="original">Giữ nguyên (.PNG, .xlsx...)</option>
                <option value="lowercase">Chữ thường (.png, .xlsx...)</option>
                <option value="uppercase">CHỮ HOA (.PNG, .XLSX...)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Column: Upload Area & File List Table */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          {/* Dropzone Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
              isDragging
                ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 scale-[1.01]"
                : "border-slate-300 dark:border-slate-800 bg-white dark:bg-[#111827] hover:border-amber-400 dark:hover:border-amber-500/50"
            }`}
          >
            <div className="h-12 w-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-2 shadow-inner">
              <Upload className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
              {t("fileRenamer.dropzoneTitle")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-3 leading-relaxed">
              {t("fileRenamer.dropzoneSubtitle")}
            </p>

            <label className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-md shadow-amber-600/20 cursor-pointer transition-all flex items-center gap-2">
              <FolderSync className="h-4 w-4" />
              <span>{t("excelSuite.selectFile")}</span>
              <input
                type="file"
                multiple
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
            </label>
          </div>

          {/* Table Container */}
          {files.length > 0 && (
            <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs overflow-hidden flex flex-col">
              {/* Table Header Bar */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {t("fileRenamer.previewList")}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                    {files.length} {t("fileRenamer.filesCount")}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={copyNewNamesList}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Copy className="h-3.5 w-3.5 text-amber-500" />
                    <span>Copy Name List</span>
                  </button>

                  <button
                    onClick={downloadAllAsZip}
                    disabled={isGeneratingZip}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-amber-600/20 cursor-pointer transition-all disabled:opacity-50"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    <span>{isGeneratingZip ? "Zipping..." : t("fileRenamer.downloadZip")}</span>
                  </button>

                  <button
                    onClick={() => setFiles([])}
                    className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 cursor-pointer transition-all"
                    title={t("fileRenamer.clearAll")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Table Data */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800/80">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3">{t("fileRenamer.originalName")}</th>
                      <th className="py-2.5 px-3">{t("fileRenamer.newName")}</th>
                      <th className="py-2.5 px-3">{t("fileRenamer.fileSize")}</th>
                      <th className="py-2.5 px-3 text-center">{t("fileRenamer.actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {files.map((item, idx) => {
                      const computedName = computeNewName(item, idx);
                      const isEditing = editingId === item.id;

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-amber-50/30 dark:hover:bg-amber-950/10 transition-colors group"
                        >
                          <td className="py-2.5 px-3 text-center text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              {getFileIcon(item.originalExt)}
                              <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-xs">
                                {item.originalName}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  defaultValue={computedName}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      const val = (e.target as HTMLInputElement).value;
                                      setFiles((prev) =>
                                        prev.map((f) =>
                                          f.id === item.id
                                            ? { ...f, customOverride: val }
                                            : f
                                        )
                                      );
                                      setEditingId(null);
                                    }
                                  }}
                                  onBlur={(e) => {
                                    const val = e.target.value;
                                    setFiles((prev) =>
                                      prev.map((f) =>
                                        f.id === item.id
                                          ? { ...f, customOverride: val }
                                          : f
                                      )
                                    );
                                    setEditingId(null);
                                  }}
                                  autoFocus
                                  className="px-2 py-1 rounded-lg border border-amber-500 bg-white dark:bg-slate-900 text-xs font-bold text-amber-700 dark:text-amber-300 w-full outline-hidden"
                                />
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="p-1 text-emerald-600 hover:text-emerald-500"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between group-hover:pr-2">
                                <span className="font-bold text-amber-700 dark:text-amber-300 font-mono tracking-tight">
                                  {computedName}
                                </span>
                                <button
                                  onClick={() => setEditingId(item.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-amber-500 transition-opacity cursor-pointer"
                                  title={t("fileRenamer.inlineEdit")}
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                            {formatFileSize(item.file.size)}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => moveItem(idx, "up")}
                                disabled={idx === 0}
                                className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 disabled:opacity-20 cursor-pointer"
                                title="Move Up"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => moveItem(idx, "down")}
                                disabled={idx === files.length - 1}
                                className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 disabled:opacity-20 cursor-pointer"
                                title="Move Down"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => downloadSingleFile(item, idx)}
                                className="p-1 rounded-md hover:bg-amber-100 dark:hover:bg-amber-950 text-amber-600 dark:text-amber-400 cursor-pointer transition-colors"
                                title={t("fileRenamer.downloadSingle")}
                              >
                                <FileDown className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => removeItem(item.id)}
                                className="p-1 rounded-md hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-500 cursor-pointer transition-colors"
                                title={t("common.clear")}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty state when no files */}
          {files.length === 0 && (
            <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white/40 dark:bg-slate-900/20">
              <FolderSync className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {t("fileRenamer.noFiles")}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {t("fileRenamer.noFilesSub")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
