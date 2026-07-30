import React, { useState, useRef } from "react";
import JSZip from "jszip";
import { useI18n } from "../utils/i18n";
import { FileMetadataState } from "../types";
import {
  Upload,
  FileClock,
  Trash2,
  Calendar,
  Clock,
  FileText,
  Sparkles,
  RefreshCw,
  FolderArchive,
  Edit3,
  Sliders,
  AlertCircle,
  Eye,
  CheckCircle2,
  Hash,
  Lock,
  Tag
} from "lucide-react";
import { toast } from "react-toastify";

export interface FileItem {
  id: string;
  file: File;
  originalName: string;
  newName: string;
  size: number;
  mimeType: string;
  createdDate: Date;
  modifiedDate: Date;
}

interface FileMetadataEditorProps {
  state?: FileMetadataState;
  onChange?: (subState: Partial<FileMetadataState>) => void;
  hideInnerHeader?: boolean;
}

// Helper to convert Date to string for datetime-local input (YYYY-MM-DDTHH:mm:ss)
const dateToInputStr = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

// Helper to parse datetime-local input string to Date object
const inputStrToDate = (str: string, fallbackDate: Date): Date => {
  if (!str) return fallbackDate;
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? fallbackDate : parsed;
};

// Helper to format file size in KB / MB
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// Helper to format Date for display
const formatDisplayDate = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

// Helper to separate file base name and extension
const getFilenameParts = (filename: string): { baseName: string; ext: string } => {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot > 0) {
    return {
      baseName: filename.substring(0, lastDot),
      ext: filename.substring(lastDot),
    };
  }
  return { baseName: filename, ext: "" };
};

export default function FileMetadataEditor({
  state,
  onChange,
  hideInnerHeader = false,
}: FileMetadataEditorProps) {
  const { t, lang } = useI18n();
  const [fileList, setFileList] = useState<FileItem[]>([]);
  const [isZipping, setIsZipping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Edit Mode Switcher: "quick" (default) or "manual"
  const [editMode, setEditMode] = useState<"quick" | "manual">("quick");

  // Batch Editing States
  const [batchCreatedStr, setBatchCreatedStr] = useState<string>(
    dateToInputStr(new Date())
  );
  const [batchModifiedStr, setBatchModifiedStr] = useState<string>(
    dateToInputStr(new Date())
  );

  // Batch Renaming States
  const [batchBaseName, setBatchBaseName] = useState<string>("");
  const [batchAutoNumber, setBatchAutoNumber] = useState<boolean>(true);
  const [batchNumberPadding, setBatchNumberPadding] = useState<number>(2); // 1 = 1, 2 = 01, 3 = 001
  const [batchStartNum, setBatchStartNum] = useState<number>(1);
  const [batchPrefix, setBatchPrefix] = useState<string>("");
  const [batchSuffix, setBatchSuffix] = useState<string>("");

  // Upload handler
  const handleFilesAdded = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: FileItem[] = [];
    Array.from(files).forEach((f) => {
      const modDate = new Date(f.lastModified || Date.now());
      const crtDate = new Date(f.lastModified || Date.now());

      newItems.push({
        id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file: f,
        originalName: f.name,
        newName: f.name,
        size: f.size,
        mimeType: f.type || "application/octet-stream",
        createdDate: crtDate,
        modifiedDate: modDate,
      });
    });

    setFileList((prev) => [...prev, ...newItems]);
    toast.success(
      lang === "vi"
        ? `Đã thêm ${newItems.length} tệp vào danh sách!`
        : `Added ${newItems.length} file(s) to list!`
    );
  };

  // Update item field
  const updateItem = (id: string, updates: Partial<FileItem>) => {
    setFileList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  // Remove single item
  const removeItem = (id: string) => {
    setFileList((prev) => prev.filter((item) => item.id !== id));
  };

  // Clear all items
  const clearAll = () => {
    setFileList([]);
    toast.info(lang === "vi" ? "Đã xóa toàn bộ tệp" : "Cleared all files");
  };

  // Batch ZIP Download Action (JSZip passing { date: newModifiedDate })
  const handleDownloadZip = async () => {
    if (fileList.length === 0) return;

    setIsZipping(true);
    try {
      const zip = new JSZip();

      // Add each file to ZIP with explicit custom modified date timestamp
      fileList.forEach((item) => {
        zip.file(item.newName, item.file, {
          date: item.modifiedDate,
        });
      });

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Metadata_Updated_Files_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(
        lang === "vi"
          ? `Đã tạo và tải xuống gói ZIP (${fileList.length} tệp)!`
          : `ZIP package created and downloaded (${fileList.length} files)!`
      );
    } catch (err) {
      console.error("ZIP packaging error", err);
      toast.error(t("common.error"));
    } finally {
      setIsZipping(false);
    }
  };

  // Instant Live Update for Batch Created Date
  const handleBatchCreatedChange = (valStr: string) => {
    setBatchCreatedStr(valStr);
    const crt = inputStrToDate(valStr, new Date());
    setFileList((prev) =>
      prev.map((item) => ({
        ...item,
        createdDate: new Date(crt),
      }))
    );
  };

  // Instant Live Update for Batch Modified Date
  const handleBatchModifiedChange = (valStr: string) => {
    setBatchModifiedStr(valStr);
    const mod = inputStrToDate(valStr, new Date());
    setFileList((prev) =>
      prev.map((item) => ({
        ...item,
        modifiedDate: new Date(mod),
      }))
    );
  };

  // Shift timestamps by offset in hours
  const shiftTimestamps = (hours: number) => {
    setFileList((prev) =>
      prev.map((item) => ({
        ...item,
        createdDate: new Date(item.createdDate.getTime() + hours * 3600 * 1000),
        modifiedDate: new Date(item.modifiedDate.getTime() + hours * 3600 * 1000),
      }))
    );
    toast.success(
      lang === "vi"
        ? `Đã dịch chuyển ngày giờ ${hours > 0 ? `+${hours}` : hours} giờ!`
        : `Shifted timestamps by ${hours > 0 ? `+${hours}` : hours} hour(s)!`
    );
  };

  // Reset to original file attributes
  const resetAllMetadata = () => {
    setFileList((prev) =>
      prev.map((item) => {
        const originalDate = new Date(item.file.lastModified || Date.now());
        return {
          ...item,
          newName: item.originalName,
          createdDate: new Date(originalDate),
          modifiedDate: new Date(originalDate),
        };
      })
    );
    toast.info(
      lang === "vi"
        ? "Đã khôi phục metadata & thời gian gốc cho toàn bộ tệp!"
        : "Reset metadata to original file attributes!"
    );
  };

  // Apply Batch Name Transformations (New Base Name + Auto Numbering + Prefix + Suffix)
  const applyNameTransformations = () => {
    if (!batchBaseName && !batchPrefix && !batchSuffix) {
      toast.warning(
        lang === "vi"
          ? "Vui lòng nhập Tên mới, Tiền tố hoặc Hậu tố để thực hiện đổi tên!"
          : "Please enter a New Name, Prefix, or Suffix to rename files!"
      );
      return;
    }

    setFileList((prev) =>
      prev.map((item, idx) => {
        const { ext, baseName: origBaseName } = getFilenameParts(item.originalName);

        let targetBase = batchBaseName.trim() ? batchBaseName.trim() : origBaseName;

        if (batchBaseName.trim() && batchAutoNumber) {
          const numVal = batchStartNum + idx;
          const numFormatted = String(numVal).padStart(batchNumberPadding, "0");
          targetBase = `${targetBase}_${numFormatted}`;
        }

        const finalName = `${batchPrefix}${targetBase}${batchSuffix}${ext}`;
        return {
          ...item,
          newName: finalName,
        };
      })
    );

    toast.success(
      lang === "vi"
        ? `Đã đổi tên hàng loạt ${fileList.length} tệp (giữ nguyên đuôi tệp)!`
        : `Batch renamed ${fileList.length} files (preserving extensions)!`
    );
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-5">
        {!hideInnerHeader && (
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="h-9 w-9 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-600/20">
                <FileClock className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>{lang === "vi" ? "Chỉnh Sửa File Metadata & Timestamp" : "File Metadata & Timestamp Editor"}</span>
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {lang === "vi"
                ? "Tải lên mọi định dạng tệp, tùy chỉnh Tên, Ngày Tạo (Created Date) & Ngày Sửa (Last Modified Date). Xuất gói ZIP bảo toàn 100% nhãn thời gian tùy chỉnh."
                : "Upload any file format, customize Filename, Created Date & Last Modified Date. Export ZIP package preserving 100% custom timestamps."}
            </p>
          </div>
        )}

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {fileList.length > 0 && (
            <>
              {/* Reset to Original Timestamps Button - PROMINENT TOP LEVEL LOCATION */}
              <button
                type="button"
                onClick={resetAllMetadata}
                className="px-3.5 py-2 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                title={lang === "vi" ? "Khôi phục ngày giờ và tên gốc cho toàn bộ danh sách" : "Reset timestamps and original names for all files"}
              >
                <RefreshCw className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>{lang === "vi" ? "Khôi Phục Thời Gian Gốc" : "Reset to Original Timestamps"}</span>
              </button>

              <button
                type="button"
                onClick={clearAll}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <Trash2 className="h-4 w-4 text-rose-500" />
                <span>{t("common.clear")} ({fileList.length})</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Upload Dropzone Area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="relative border-2 border-dashed border-amber-300 dark:border-amber-700/60 rounded-2xl p-8 bg-amber-50/30 dark:bg-amber-950/10 hover:bg-amber-50/60 dark:hover:bg-amber-950/20 transition-all text-center flex flex-col items-center justify-center cursor-pointer group"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => handleFilesAdded(e.target.files)}
          className="hidden"
        />
        <div className="h-14 w-14 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
          <Upload className="h-7 w-7" />
        </div>
        <h3 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-200">
          {lang === "vi" ? "Kéo thả bất kỳ tệp nào vào đây, hoặc click để chọn tệp" : "Drag & drop any files here, or click to upload"}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {lang === "vi" ? "Hỗ trợ mọi định dạng tệp (PDF, DOCX, XLSX, PNG, ZIP, MP4, TXT, code, ...)" : "Supports all file formats (PDF, DOCX, XLSX, PNG, ZIP, MP4, TXT, code, ...)"}
        </p>
      </div>

      {/* Main Editing Workspace with Mode Accordion Switcher */}
      {fileList.length > 0 && (
        <div className="space-y-6">
          {/* Mode Switcher & Tools Panel */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                <Sliders className="h-4.5 w-4.5 text-amber-500" />
                <span>{lang === "vi" ? "Chế Độ Chỉnh Sửa Metadata" : "Metadata Editing Mode"}</span>
              </div>

              {/* Accordion Mode Switcher */}
              <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditMode("quick")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    editMode === "quick"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{lang === "vi" ? "⚡ Chỉnh Nhanh Hàng Loạt" : "⚡ Quick Batch Presets"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditMode("manual")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    editMode === "manual"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>{lang === "vi" ? "✏️ Chỉnh Thủ Công Từng Tệp" : "✏️ Manual Adjustment"}</span>
                </button>
              </div>
            </div>

            {/* ACCORDION CONTENT 1: QUICK BATCH PRESETS (Expanded when editMode === "quick") */}
            {editMode === "quick" && (
              <div className="space-y-4 pt-1 animate-fadeIn">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>
                    {lang === "vi"
                      ? "Thay đổi Ngày Tạo / Ngày Sửa sẽ được tự động đồng bộ ngay lập tức tới tất cả các tệp. Bạn cũng có thể đổi tên mẫu hàng loạt có đánh số thứ tự tự động."
                      : "Changes to Created / Modified Date will be automatically applied to all files in real-time. You can also batch rename files with custom numbering."}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  {/* 1. Batch Timestamp Inputs (INSTANT REAL-TIME APPLICATION, NO APPLY BUTTONS) */}
                  <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {lang === "vi" ? "1. Ngày Giờ Mẫu Hàng Loạt" : "1. Batch Target Timestamps"}
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-100 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded">
                        {lang === "vi" ? "Đồng bộ ngay" : "Auto Sync"}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1 flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-indigo-500" />
                          <span>{lang === "vi" ? "Ngày tạo (Created):" : "Created Date:"}</span>
                        </label>
                        <input
                          type="datetime-local"
                          step="1"
                          value={batchCreatedStr}
                          onChange={(e) => handleBatchCreatedChange(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:border-amber-500 shadow-xs"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-emerald-500" />
                          <span>{lang === "vi" ? "Ngày sửa (Modified):" : "Modified Date:"}</span>
                        </label>
                        <input
                          type="datetime-local"
                          step="1"
                          value={batchModifiedStr}
                          onChange={(e) => handleBatchModifiedChange(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:border-amber-500 shadow-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Shift Quick Presets */}
                  <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block border-b border-slate-200 dark:border-slate-800 pb-1.5">
                      {lang === "vi" ? "2. Phím Tắt Dịch Chuyển Giờ" : "2. Quick Shift Hours"}
                    </span>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {lang === "vi"
                        ? "Dịch chuyển đồng thời Ngày Tạo và Ngày Sửa tiến/lùi theo khoảng thời gian chọn:"
                        : "Shift both Created and Modified timestamps forward/backward:"}
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => shiftTimestamps(1)}
                        className="py-2 px-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:text-amber-700 dark:hover:text-amber-300 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-xs"
                      >
                        +1 {lang === "vi" ? "giờ" : "hour"}
                      </button>
                      <button
                        type="button"
                        onClick={() => shiftTimestamps(-1)}
                        className="py-2 px-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:text-amber-700 dark:hover:text-amber-300 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-xs"
                      >
                        -1 {lang === "vi" ? "giờ" : "hour"}
                      </button>
                      <button
                        type="button"
                        onClick={() => shiftTimestamps(24)}
                        className="py-2 px-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:text-amber-700 dark:hover:text-amber-300 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-xs"
                      >
                        +1 {lang === "vi" ? "ngày" : "day"}
                      </button>
                      <button
                        type="button"
                        onClick={() => shiftTimestamps(-24)}
                        className="py-2 px-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:text-amber-700 dark:hover:text-amber-300 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-xs"
                      >
                        -1 {lang === "vi" ? "ngày" : "day"}
                      </button>
                    </div>
                  </div>

                  {/* 3. Batch Renaming Rules with Auto Numbering */}
                  <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 md:col-span-2 lg:col-span-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block border-b border-slate-200 dark:border-slate-800 pb-1.5">
                      {lang === "vi" ? "3. Đổi Tên Tệp Hàng Loạt & Đánh Số" : "3. Batch Name Rules & Auto-Numbering"}
                    </span>

                    <div className="space-y-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">
                          {lang === "vi" ? "Tên mới gốc (Base Name):" : "New Base Name:"}
                        </label>
                        <input
                          type="text"
                          placeholder={lang === "vi" ? "ViDụ_TaiLieu" : "Document"}
                          value={batchBaseName}
                          onChange={(e) => setBatchBaseName(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-amber-500 font-mono"
                        />
                      </div>

                      {/* Auto Numbering Toggle & Options */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={batchAutoNumber}
                            onChange={(e) => setBatchAutoNumber(e.target.checked)}
                            className="rounded text-amber-600 focus:ring-amber-500"
                          />
                          <Hash className="h-3.5 w-3.5 text-amber-500" />
                          <span>{lang === "vi" ? "Tự thêm số thứ tự (_01, _02)" : "Auto-add index suffix (_01)"}</span>
                        </label>

                        {batchAutoNumber && (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400">{lang === "vi" ? "Mẫu:" : "Format:"}</span>
                            <select
                              value={batchNumberPadding}
                              onChange={(e) => setBatchNumberPadding(Number(e.target.value))}
                              className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-[10px] font-mono border border-slate-200 dark:border-slate-800"
                            >
                              <option value={1}>_1, _2</option>
                              <option value={2}>_01, _02</option>
                              <option value={3}>_001, _002</option>
                            </select>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">
                            {lang === "vi" ? "Tiền tố (Prefix):" : "Prefix:"}
                          </label>
                          <input
                            type="text"
                            placeholder="v1_"
                            value={batchPrefix}
                            onChange={(e) => setBatchPrefix(e.target.value)}
                            className="w-full px-2 py-1 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-amber-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">
                            {lang === "vi" ? "Hậu tố (Suffix):" : "Suffix:"}
                          </label>
                          <input
                            type="text"
                            placeholder="_final"
                            value={batchSuffix}
                            onChange={(e) => setBatchSuffix(e.target.value)}
                            className="w-full px-2 py-1 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-amber-500 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={applyNameTransformations}
                      className="w-full py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <Tag className="h-3.5 w-3.5" />
                      <span>{lang === "vi" ? "Áp Dụng Đổi Tên Hàng Loạt" : "Apply Batch Renaming"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ACCORDION CONTENT 2: MANUAL ITEM ADJUSTMENT (Expanded when editMode === "manual") */}
            {editMode === "manual" && (
              <div className="space-y-4 pt-1 animate-fadeIn">
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-800 dark:text-indigo-300 text-xs flex items-center gap-2">
                  <Edit3 className="h-4 w-4 shrink-0 text-indigo-500" />
                  <span>
                    {lang === "vi"
                      ? "Chế Độ Chỉnh Thủ Công: Đuôi tệp (loại file) được khóa an toàn để tránh làm hỏng định dạng file. Bạn có thể tự do đổi tên gốc và tùy chỉnh Ngày Tạo/Ngày Sửa cho từng tệp."
                      : "Manual Adjustment Mode: File extension is safely locked to prevent broken formats. You can freely rename the base name and set Created/Modified dates per file."}
                  </span>
                </div>

                <div className="space-y-3">
                  {fileList.map((item) => {
                    const createdStr = dateToInputStr(item.createdDate);
                    const modifiedStr = dateToInputStr(item.modifiedDate);
                    const { baseName, ext } = getFilenameParts(item.newName);

                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 p-4 shadow-xs hover:border-amber-400/60 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                      >
                        {/* File Base Name Edit (EXTENSION IS LOCKED) */}
                        <div className="flex items-start gap-3 flex-1 min-w-0 w-full md:w-auto">
                          <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                            <FileText className="h-5 w-5" />
                          </div>

                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate max-w-[200px]" title={item.originalName}>
                                {item.originalName}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">({formatFileSize(item.size)})</span>
                            </div>

                            <div>
                              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1 flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                  <Edit3 className="h-3 w-3 text-amber-500" />
                                  <span>{lang === "vi" ? "Tên tệp mới (không chứa đuôi):" : "New Filename (base only):"}</span>
                                </span>
                                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                                  <Lock className="h-2.5 w-2.5 text-amber-500" />
                                  <span>{lang === "vi" ? "Khóa đuôi tệp" : "Extension Locked"}</span>
                                </span>
                              </label>

                              {/* Input field for base name + locked extension badge */}
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={baseName}
                                  onChange={(e) => {
                                    const newBase = e.target.value;
                                    updateItem(item.id, { newName: `${newBase}${ext}` });
                                  }}
                                  className="flex-1 min-w-0 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-mono font-semibold focus:outline-none focus:border-amber-500 shadow-xs"
                                  placeholder={lang === "vi" ? "Tên tệp..." : "Filename..."}
                                />
                                {ext && (
                                  <span
                                    className="px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs border border-slate-300 dark:border-slate-700 select-none shrink-0 flex items-center gap-1"
                                    title={lang === "vi" ? `Loại file/Đuôi tệp (${ext}) được khóa an toàn` : `File extension (${ext}) locked`}
                                  >
                                    <Lock className="h-3 w-3 text-amber-500" />
                                    <span>{ext}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Date & Time Editable Inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full md:w-auto shrink-0 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-3 md:pt-0 md:pl-4">
                          {/* Created Date Field */}
                          <div>
                            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-0.5 flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-indigo-500" />
                              <span>{lang === "vi" ? "Ngày Tạo (Created):" : "Created Date & Time:"}</span>
                            </label>
                            <input
                              type="datetime-local"
                              step="1"
                              value={createdStr}
                              onChange={(e) => {
                                const newDate = inputStrToDate(e.target.value, item.createdDate);
                                updateItem(item.id, { createdDate: newDate });
                              }}
                              className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500 shadow-xs"
                            />
                          </div>

                          {/* Modified Date Field */}
                          <div>
                            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-0.5 flex items-center gap-1">
                              <Clock className="h-3 w-3 text-emerald-500" />
                              <span>{lang === "vi" ? "Ngày Sửa (Modified):" : "Last Modified Date & Time:"}</span>
                            </label>
                            <input
                              type="datetime-local"
                              step="1"
                              value={modifiedStr}
                              onChange={(e) => {
                                const newDate = inputStrToDate(e.target.value, item.modifiedDate);
                                updateItem(item.id, { modifiedDate: newDate });
                              }}
                              className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-mono focus:outline-none focus:border-emerald-500 shadow-xs"
                            />
                          </div>
                        </div>

                        {/* Remove Action */}
                        <div className="flex items-center justify-end w-full md:w-auto shrink-0 border-t md:border-t-0 border-slate-200 dark:border-slate-800 pt-2 md:pt-0">
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                            title={t("common.clear")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* REAL-TIME SYNCHRONIZED PREVIEW TABLE & SUMMARY */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Eye className="h-4.5 w-4.5 text-emerald-500" />
                <span>
                  {lang === "vi" ? "Bảng Xem Trước & Đồng Bộ Metadata Real-Time" : "Real-time Synchronized Preview Table"} ({fileList.length})
                </span>
              </h3>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{lang === "vi" ? "Đồng bộ tức thì" : "Instant Sync"}</span>
              </span>
            </div>

            {/* Table View of Metadata Changes */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 uppercase font-bold text-[10px]">
                    <th className="p-3 rounded-tl-xl">{lang === "vi" ? "Tên Tệp Đã Đổi" : "Target Filename"}</th>
                    <th className="p-3">{lang === "vi" ? "Ngày Tạo (Created Date)" : "Created Date"}</th>
                    <th className="p-3">{lang === "vi" ? "Ngày Sửa (Modified Date)" : "Modified Date"}</th>
                    <th className="p-3">{lang === "vi" ? "Kích Thước" : "Size"}</th>
                    <th className="p-3 rounded-tr-xl text-right">{lang === "vi" ? "Thao Tác" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {fileList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="p-3 font-semibold text-slate-900 dark:text-slate-100 max-w-[240px] truncate" title={item.newName}>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-amber-500 shrink-0" />
                          <span className="truncate">{item.newName}</span>
                        </div>
                      </td>
                      <td className="p-3 text-indigo-600 dark:text-indigo-400 font-medium">
                        {formatDisplayDate(item.createdDate)}
                      </td>
                      <td className="p-3 text-emerald-600 dark:text-emerald-400 font-medium">
                        {formatDisplayDate(item.modifiedDate)}
                      </td>
                      <td className="p-3 text-slate-500 dark:text-slate-400">
                        {formatFileSize(item.size)}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                          title={t("common.clear")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Callout Notice regarding OS Download behavior */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-slate-800 dark:text-amber-100 text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-amber-700 dark:text-amber-400">
                  {lang === "vi" ? "Lưu ý quan trọng về Ngày Giờ tệp trên Windows / macOS" : "Important Note on Windows/macOS File Timestamps"}
                </h4>
                <p className="leading-relaxed text-slate-600 dark:text-slate-300">
                  {lang === "vi" ? (
                    <>
                      Trình duyệt web không thể tự ghi đè thuộc tính tạo tệp của hệ điều hành đĩa cứng khi tải tệp lẻ trực tiếp.
                      Để <strong>bảo toàn chính xác 100% Ngày Tạo & Ngày Sửa tùy chỉnh</strong> trên ổ cứng Windows/macOS, hãy bấm nút <span className="font-bold underline text-amber-600 dark:text-amber-400">"Tải Gói ZIP Tất Cả"</span> bên dưới!
                    </>
                  ) : (
                    <>
                      Browsers automatically assign current disk arrival time when downloading single files directly.
                      To <b>preserve 100% custom Created & Modified timestamps</b> on disk, download via the <span className="font-bold underline text-amber-600 dark:text-amber-400">"Download All as ZIP"</span> button below!
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* PRIMARY DOWNLOAD ZIP ACTION BUTTON MOVED TO BOTTOM */}
          <div className="flex flex-col items-center justify-center pt-2 pb-6">
            <button
              type="button"
              onClick={handleDownloadZip}
              disabled={isZipping || fileList.length === 0}
              className="w-full md:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-sm flex items-center justify-center gap-3 transition-all cursor-pointer shadow-xl shadow-amber-600/25 disabled:opacity-50 hover:scale-[1.01]"
            >
              {isZipping ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>{lang === "vi" ? "Đang tạo gói ZIP bảo toàn nhãn thời gian..." : "Generating timestamped ZIP..."}</span>
                </>
              ) : (
                <>
                  <FolderArchive className="h-5 w-5" />
                  <span>
                    {lang === "vi"
                      ? `Tải Gói ZIP Tất Cả (${fileList.length} tệp - Bảo Toàn Giờ Tùy Chỉnh)`
                      : `Download All as ZIP (${fileList.length} files - Preserve Timestamps)`}
                  </span>
                </>
              )}
            </button>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 text-center">
              {lang === "vi"
                ? "Tệp ZIP đã được tự động gắn nhãn thời gian tùy chỉnh cho từng tệp bên trong."
                : "The ZIP archive contains exact custom timestamps embedded for each enclosed file."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
