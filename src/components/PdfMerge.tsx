import React, { useState, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { PDFDocument, degrees } from "pdf-lib";
import { useI18n } from "../utils/i18n";
import { 
  Upload, 
  Trash2, 
  RotateCw, 
  RotateCcw, 
  Maximize2, 
  X, 
  ArrowLeft, 
  ArrowRight, 
  FileText, 
  Loader2, 
  Check, 
  GripVertical, 
  HelpCircle,
  FileDown,
  FileStack
} from "lucide-react";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "motion/react";

// Set pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || "4.2.67"}/pdf.worker.min.mjs`;

interface PageItem {
  id: string;
  file: File;
  fileName: string;
  pageIndex: number; // 0-based
  thumbnailUrl: string;
  rotation: number; // 0, 90, 180, 270
}

export default function PdfMerge() {
  const { lang } = useI18n();
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [mergeOutputName, setMergeOutputName] = useState("Gop_Tai_Lieu");
  const [isMerging, setIsMerging] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Fullscreen Viewer state
  const [fullscreenIdx, setFullscreenIdx] = useState<number | null>(null);

  // Load pages from selected PDF files
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    await processFiles(Array.from(e.target.files));
    e.target.value = ""; // Reset
  };

  const processFiles = async (files: File[]) => {
    const pdfFiles = files.filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (pdfFiles.length === 0) {
      toast.error(lang === "vi" ? "Vui lòng chọn tệp tin PDF hợp lệ!" : "Please select valid PDF files!");
      return;
    }

    setLoading(true);
    const newPages: PageItem[] = [];

    for (const file of pdfFiles) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.4 }); // Thumbnail size

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (context) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvasContext: context, viewport } as any).promise;
          }

          const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.85);

          newPages.push({
            id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            file,
            fileName: file.name,
            pageIndex: i - 1,
            thumbnailUrl,
            rotation: 0,
          });
        }
      } catch (err: any) {
        toast.error(
          lang === "vi" 
            ? `Không thể đọc file "${file.name}": ${err.message}` 
            : `Could not read file "${file.name}": ${err.message}`
        );
      }
    }

    if (newPages.length > 0) {
      setPages(prev => [...prev, ...newPages]);
      toast.success(
        lang === "vi"
          ? `Đã nạp thành công ${newPages.length} trang từ ${pdfFiles.length} file.`
          : `Successfully loaded ${newPages.length} pages from ${pdfFiles.length} files.`
      );
    }
    setLoading(false);
  };

  // Reorder pages
  const movePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pages.length) return;
    const updated = [...pages];
    const [movedItem] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, movedItem);
    setPages(updated);
  };

  const rotatePage = (idx: number, degrees: number) => {
    setPages(prev => prev.map((p, i) => {
      if (i !== idx) return p;
      let nextRot = (p.rotation + degrees) % 360;
      if (nextRot < 0) nextRot += 360;
      return { ...p, rotation: nextRot };
    }));
    toast.info(lang === "vi" ? "Đã xoay hướng trang" : "Page rotated");
  };

  const deletePage = (idx: number) => {
    setPages(prev => prev.filter((_, i) => i !== idx));
    toast.success(lang === "vi" ? "Đã xoá trang khỏi danh sách ghép" : "Page removed from merge list");
  };

  const clearAll = () => {
    if (window.confirm(lang === "vi" ? "Bạn có chắc muốn xoá tất cả trang đã chọn?" : "Are you sure you want to clear all pages?")) {
      setPages([]);
      toast.info(lang === "vi" ? "Đã dọn dẹp danh sách" : "Clear list");
    }
  };

  // Merge Action
  const handleMerge = async () => {
    if (pages.length === 0) {
      toast.warning(lang === "vi" ? "Vui lòng thêm file PDF để ghép!" : "Please add PDF files to merge!");
      return;
    }

    setIsMerging(true);
    try {
      const mergedPdf = await PDFDocument.create();

      // We'll cache the loaded source documents to avoid parsing multiple times
      const fileCache = new Map<File, PDFDocument>();

      for (const item of pages) {
        let srcDoc = fileCache.get(item.file);
        if (!srcDoc) {
          const arrayBuffer = await item.file.arrayBuffer();
          srcDoc = await PDFDocument.load(arrayBuffer);
          fileCache.set(item.file, srcDoc);
        }

        // Copy the specific page
        const [copiedPage] = await mergedPdf.copyPages(srcDoc, [item.pageIndex]);
        
        // Apply rotation
        if (item.rotation !== 0) {
          copiedPage.setRotation(degrees((copiedPage.getRotation().angle + item.rotation) % 360));
        }

        mergedPdf.addPage(copiedPage);
      }

      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${mergeOutputName.replace(/\.pdf$/i, "") || "Merged_Document"}.pdf`;
      a.click();

      URL.revokeObjectURL(url);
      toast.success(lang === "vi" ? "Đã ghép và tải xuống tệp PDF thành công!" : "PDF merged and downloaded successfully!");
    } catch (err: any) {
      toast.error(lang === "vi" ? `Lỗi khi ghép tệp: ${err.message}` : `Error merging PDFs: ${err.message}`);
    } finally {
      setIsMerging(false);
    }
  };

  // Drag and drop logic
  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = (idx: number) => {
    if (draggedIdx !== null && draggedIdx !== idx) {
      movePage(draggedIdx, idx);
    }
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  // File drag-over for drop zone
  const [zoneDragOver, setZoneDragOver] = useState(false);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-[#0B0F1A]" id="pdf-merge-container">
      {/* Upper Action Bar / Header */}
      <div className="bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800/80 px-[25px] py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
        <div className="flex items-start gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-600/20 flex-shrink-0 mt-0.5">
            <FileStack className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              <span>{lang === "vi" ? "Ghép File PDF" : "Merge PDF Files"}</span>
              {pages.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 font-bold border border-rose-100 dark:border-rose-900/40">
                  {pages.length} {lang === "vi" ? "Trang" : "Pages"}
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {lang === "vi" 
                ? "Ghép nhiều file PDF thành 1 tệp duy nhất. Xem trước, xoá trang lẻ, xoay chiều, và kéo thả sắp xếp lại thứ tự trước khi ghép."
                : "Merge multiple PDF files into one. Preview, delete unwanted pages, rotate, and drag & drop to reorder before export."}
            </p>
          </div>
        </div>

        {pages.length > 0 && (
          <div className="flex items-center gap-2 self-stretch md:self-auto">
            <label className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs">
              <Upload className="h-3.5 w-3.5 text-rose-500" />
              <span>{lang === "vi" ? "Thêm tệp" : "Add files"}</span>
              <input
                type="file"
                multiple
                accept="application/pdf"
                onChange={handlePdfUpload}
                className="hidden"
              />
            </label>
            <button
              onClick={clearAll}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{lang === "vi" ? "Xoá tất cả" : "Clear all"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Body Content Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-6">

      {pages.length === 0 ? (
        <div className="w-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3 bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <Loader2 className="h-10 w-10 text-rose-500 animate-spin" />
              <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                {lang === "vi" ? "Đang trích xuất nội dung và dựng ảnh các trang..." : "Extracting pages and rendering previews..."}
              </span>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setZoneDragOver(true);
              }}
              onDragLeave={() => setZoneDragOver(false)}
              onDrop={async (e) => {
                e.preventDefault();
                setZoneDragOver(false);
                if (e.dataTransfer.files) {
                  await processFiles(Array.from(e.dataTransfer.files));
                }
              }}
              className={`relative border-2 border-dashed rounded-3xl p-12 text-center flex flex-col items-center justify-center min-h-[300px] transition-all cursor-pointer ${
                zoneDragOver 
                  ? "border-rose-500 bg-rose-50/30 dark:bg-rose-950/20 scale-[0.99]" 
                  : "border-rose-300 dark:border-rose-800/60 bg-rose-50/10 dark:bg-rose-950/5 hover:border-rose-500 dark:hover:border-rose-700/80"
              }`}
            >
              <input
                type="file"
                multiple
                accept="application/pdf"
                onChange={handlePdfUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              />
              <div className="p-4 rounded-2xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 mb-4">
                <Upload className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                {lang === "vi" ? "Kéo & thả các file PDF vào đây hoặc nhấp để chọn tệp tải lên" : "Drag & drop PDF files here or click to choose from computer"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                {lang === "vi" ? "Hỗ trợ tải lên cùng lúc nhiều tệp PDF để gộp và sắp xếp trang" : "Supports uploading multiple PDF files at once to merge and sort pages"}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Side: Upload Zone & Page Previews */}
          <div className="lg:col-span-8 space-y-6">

          {/* Pages Grid */}
          {!loading && pages.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                  {lang === "vi" ? "Danh sách trang" : "Pages list"}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <HelpCircle className="h-3.5 w-3.5" />
                  {lang === "vi" ? "Kéo thả trang để thay đổi vị trí ghép" : "Drag and drop pages to reorder"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {pages.map((item, idx) => {
                  const isDragged = draggedIdx === idx;
                  const isDragOver = dragOverIdx === idx;

                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={() => handleDrop(idx)}
                      className={`relative flex flex-col bg-white dark:bg-[#111827] border rounded-2xl p-2 select-none group transition-all ${
                        isDragged ? "opacity-40 scale-95" : ""
                      } ${
                        isDragOver ? "border-rose-500 bg-rose-50/10 dark:bg-rose-950/10 ring-2 ring-rose-500/20" : "border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      {/* Thumbnail Container */}
                      <div className="relative aspect-[3/4] bg-slate-50 dark:bg-[#0B0F1A] rounded-xl overflow-hidden flex items-center justify-center border border-slate-100 dark:border-slate-800">
                        {/* Drag Handle Overlay on hover */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10">
                          <button
                            onClick={() => setFullscreenIdx(idx)}
                            className="p-1.5 bg-white text-slate-800 rounded-lg hover:bg-slate-100 transition-transform hover:scale-105"
                            title={lang === "vi" ? "Xem Toàn Màn Hình" : "Fullscreen View"}
                          >
                            <Maximize2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Page Preview Image */}
                        <img
                          src={item.thumbnailUrl}
                          alt={`Page ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          style={{ transform: `rotate(${item.rotation}deg)` }}
                          className="max-h-full max-w-full object-contain transition-transform duration-200 shadow-xs pointer-events-none"
                        />

                        {/* Quick controls at top right */}
                        <div className="absolute top-1.5 right-1.5 flex gap-1 z-20">
                          <button
                            onClick={() => deletePage(idx)}
                            className="p-1 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/60 dark:text-red-400 dark:hover:bg-red-950 rounded-md transition-colors cursor-pointer"
                            title={lang === "vi" ? "Xoá trang" : "Delete Page"}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Order badge bottom left */}
                        <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-mono font-bold rounded-md z-20">
                          #{idx + 1}
                        </div>
                      </div>

                      {/* Info & Micro controls */}
                      <div className="mt-2.5 px-1 space-y-1.5">
                        <p className="text-[10px] font-mono font-medium text-slate-400 truncate" title={item.fileName}>
                          {item.fileName}
                        </p>
                        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          {lang === "vi" ? `Trang ${item.pageIndex + 1}` : `Page ${item.pageIndex + 1}`}
                        </p>

                        {/* Row of navigation & rotation buttons */}
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                          <div className="flex gap-1">
                            <button
                              onClick={() => rotatePage(idx, -90)}
                              className="p-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-md text-slate-500 dark:text-slate-400 transition-colors"
                              title={lang === "vi" ? "Xoay trái 90°" : "Rotate Left 90°"}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => rotatePage(idx, 90)}
                              className="p-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-md text-slate-500 dark:text-slate-400 transition-colors"
                              title={lang === "vi" ? "Xoay phải 90°" : "Rotate Right 90°"}
                            >
                              <RotateCw className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="flex gap-1">
                            <button
                              disabled={idx === 0}
                              onClick={() => movePage(idx, idx - 1)}
                              className="p-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-md text-slate-500 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <ArrowLeft className="h-3.5 w-3.5" />
                            </button>
                            <button
                              disabled={idx === pages.length - 1}
                              onClick={() => movePage(idx, idx + 1)}
                              className="p-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-md text-slate-500 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Right Side: Options & Actions Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
            <h3 className="text-sm font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase pb-2 border-b border-slate-100 dark:border-slate-800">
              {lang === "vi" ? "Cài Đặt Xuất File" : "Export Settings"}
            </h3>

            {/* Output File Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {lang === "vi" ? "Tên tệp xuất ra (.pdf)" : "Output file name (.pdf)"}
              </label>
              <input
                type="text"
                value={mergeOutputName}
                onChange={(e) => setMergeOutputName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F1A] text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 text-slate-800 dark:text-slate-200"
                placeholder="Merged_Document"
              />
            </div>

            {/* Summary Statistics */}
            <div className="bg-slate-50 dark:bg-[#0B0F1A] border border-slate-100 dark:border-slate-800/80 rounded-xl p-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">{lang === "vi" ? "Tổng số trang ghép:" : "Total pages to merge:"}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{pages.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{lang === "vi" ? "Định dạng đầu ra:" : "Output format:"}</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase">PDF</span>
              </div>
            </div>

            {/* Export Trigger Button */}
            <button
              onClick={handleMerge}
              disabled={pages.length === 0 || isMerging}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-rose-600/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isMerging ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{lang === "vi" ? "Đang ghép tệp PDF..." : "Merging PDFs..."}</span>
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4" />
                  <span>{lang === "vi" ? `Thực Hiện Ghép PDF (${pages.length} trang)` : `Proceed to Merge (${pages.length} pages)`}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      )}
      </div>

      {/* Fullscreen Modal View */}
      <AnimatePresence>
        {fullscreenIdx !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <button
              onClick={() => setFullscreenIdx(null)}
              className="absolute top-4 right-4 p-2 bg-slate-800/80 text-white rounded-xl hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Previous Page Button */}
            <button
              disabled={fullscreenIdx === 0}
              onClick={() => setFullscreenIdx(prev => (prev !== null && prev > 0 ? prev - 1 : prev))}
              className="absolute left-4 p-3 bg-slate-800/80 text-white rounded-full hover:bg-slate-700 disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>

            {/* Main Image content */}
            <div className="flex flex-col items-center max-w-full max-h-[85vh]">
              <img
                src={pages[fullscreenIdx].thumbnailUrl}
                alt={`Page ${fullscreenIdx + 1}`}
                referrerPolicy="no-referrer"
                style={{ transform: `rotate(${pages[fullscreenIdx].rotation}deg)` }}
                className="max-h-[75vh] max-w-[90vw] object-contain transition-transform duration-200 rounded-lg shadow-2xl border border-slate-800"
              />
              <div className="mt-4 text-center">
                <p className="text-white font-bold text-sm">
                  {lang === "vi" ? `Trang ${fullscreenIdx + 1} / ${pages.length}` : `Page ${fullscreenIdx + 1} of ${pages.length}`}
                </p>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  {pages[fullscreenIdx].fileName} (Trang gốc #{pages[fullscreenIdx].pageIndex + 1})
                </p>
              </div>
            </div>

            {/* Next Page Button */}
            <button
              disabled={fullscreenIdx === pages.length - 1}
              onClick={() => setFullscreenIdx(prev => (prev !== null && prev < pages.length - 1 ? prev + 1 : prev))}
              className="absolute right-4 p-3 bg-slate-800/80 text-white rounded-full hover:bg-slate-700 disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ArrowRight className="h-6 w-6" />
            </button>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
