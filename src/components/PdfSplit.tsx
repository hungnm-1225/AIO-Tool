import React, { useState, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { useI18n } from "../utils/i18n";
import { 
  Upload, 
  Trash2, 
  Maximize2, 
  X, 
  ArrowLeft, 
  ArrowRight, 
  FileText, 
  Loader2, 
  Plus, 
  Download, 
  HelpCircle,
  FileCheck2,
  FolderDown,
  Layers,
  Split
} from "lucide-react";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "motion/react";

// Set pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || "4.2.67"}/pdf.worker.min.mjs`;

interface SplitRange {
  id: string;
  name: string;
  rangeStr: string; // e.g. "1-3", "4-5"
}

interface SplitResult {
  id: string;
  name: string;
  pages: number[]; // 1-based page numbers
  pdfBytes: Uint8Array;
  firstPageThumb: string;
  lastPageThumb: string;
}

export default function PdfSplit() {
  const { lang } = useI18n();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileDetails, setFileDetails] = useState<{ name: string; size: string; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(false);
  
  // All original pages' thumbnail data URLs (0-based list)
  const [allPagesThumbs, setAllPagesThumbs] = useState<string[]>([]);
  const [originalPdfBytes, setOriginalPdfBytes] = useState<Uint8Array | null>(null);

  // Split configurations
  const [splitRanges, setSplitRanges] = useState<SplitRange[]>([]);
  const [splitResults, setSplitResults] = useState<SplitResult[]>([]);
  const [isSplitting, setIsSplitting] = useState(false);

  // Fullscreen view state
  const [fullscreenPages, setFullscreenPages] = useState<number[]>([]); // list of 1-based page indices to display
  const [fullscreenActiveIndex, setFullscreenActiveIndex] = useState<number | null>(null); // index in the fullscreenPages array

  // Parse a range string into 1-based page numbers
  const parseRange = (rangeStr: string, maxPages: number): number[] => {
    const pages: number[] = [];
    const parts = rangeStr.split(",");
    
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      if (trimmed.includes("-")) {
        const [startStr, endStr] = trimmed.split("-");
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        
        if (!isNaN(start) && !isNaN(end)) {
          const s = Math.max(1, Math.min(start, maxPages));
          const e = Math.max(1, Math.min(end, maxPages));
          
          if (s <= e) {
            for (let j = s; j <= e; j++) {
              pages.push(j);
            }
          } else {
            for (let j = s; j >= e; j--) {
              pages.push(j);
            }
          }
        }
      } else {
        const p = parseInt(trimmed, 10);
        if (!isNaN(p) && p >= 1 && p <= maxPages) {
          pages.push(p);
        }
      }
    }
    // Remove duplicates and sort
    return Array.from(new Set(pages)).sort((a, b) => a - b);
  };

  // Process uploaded PDF file
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error(lang === "vi" ? "Vui lòng chọn tệp tin PDF hợp lệ!" : "Please select a valid PDF file!");
      return;
    }

    setLoading(true);
    setSplitResults([]);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      setOriginalPdfBytes(bytes);

      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const totalPages = pdf.numPages;

      setFileDetails({
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
        totalPages,
      });

      const thumbs: string[] = [];
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.35 });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport } as any).promise;
        }
        thumbs.push(canvas.toDataURL("image/jpeg", 0.85));
      }

      setAllPagesThumbs(thumbs);
      setUploadedFile(file);

      // Default split ranges: divide in halves or preset a first range
      const mid = Math.max(1, Math.floor(totalPages / 2));
      if (totalPages > 1) {
        setSplitRanges([
          { id: `range-${Date.now()}-1`, name: lang === "vi" ? "Phần 1" : "Part 1", rangeStr: `1-${mid}` },
          { id: `range-${Date.now()}-2`, name: lang === "vi" ? "Phần 2" : "Part 2", rangeStr: `${mid + 1}-${totalPages}` },
        ]);
      } else {
        setSplitRanges([
          { id: `range-${Date.now()}-1`, name: lang === "vi" ? "Phần 1" : "Part 1", rangeStr: "1" },
        ]);
      }

      toast.success(
        lang === "vi" 
          ? `Đã tải thành công tệp PDF với ${totalPages} trang!` 
          : `Loaded PDF file with ${totalPages} pages successfully!`
      );
    } catch (err: any) {
      toast.error(lang === "vi" ? `Không thể đọc file PDF: ${err.message}` : `Cannot read PDF file: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRangeStr = (id: string, newStr: string) => {
    setSplitRanges(prev => prev.map(r => r.id === id ? { ...r, rangeStr: newStr } : r));
  };

  const handleUpdateRangeName = (id: string, newName: string) => {
    setSplitRanges(prev => prev.map(r => r.id === id ? { ...r, name: newName } : r));
  };

  const addRange = () => {
    if (!fileDetails) return;
    const count = splitRanges.length + 1;
    setSplitRanges(prev => [
      ...prev,
      {
        id: `range-${Date.now()}-${count}`,
        name: lang === "vi" ? `Phần ${count}` : `Part ${count}`,
        rangeStr: `${fileDetails.totalPages}-${fileDetails.totalPages}`,
      }
    ]);
  };

  const removeRange = (id: string) => {
    setSplitRanges(prev => prev.filter(r => r.id !== id));
  };

  // Perform split logic using pdf-lib
  const executeSplit = async () => {
    if (!originalPdfBytes || !fileDetails) return;
    setIsSplitting(true);
    const results: SplitResult[] = [];

    try {
      const srcDoc = await PDFDocument.load(originalPdfBytes);

      for (const range of splitRanges) {
        const pagesToExtract = parseRange(range.rangeStr, fileDetails.totalPages);
        if (pagesToExtract.length === 0) continue;

        const subPdf = await PDFDocument.create();
        // pdf-lib copyPages uses 0-based indices
        const zeroBasedIndices = pagesToExtract.map(p => p - 1);
        const copiedPages = await subPdf.copyPages(srcDoc, zeroBasedIndices);
        
        copiedPages.forEach(p => subPdf.addPage(p));
        const bytes = await subPdf.save();

        // Get thumbs for split result first and last pages
        const firstIdx = pagesToExtract[0] - 1;
        const lastIdx = pagesToExtract[pagesToExtract.length - 1] - 1;

        results.push({
          id: range.id,
          name: range.name,
          pages: pagesToExtract,
          pdfBytes: bytes,
          firstPageThumb: allPagesThumbs[firstIdx] || "",
          lastPageThumb: allPagesThumbs[lastIdx] || "",
        });
      }

      setSplitResults(results);
      toast.success(
        lang === "vi" 
          ? `Đã chia tệp thành ${results.length} phần thành công! Bạn có thể xem preview hoặc tải xuống dưới đây.` 
          : `Split into ${results.length} files successfully! Previews and downloads are ready.`
      );
    } catch (err: any) {
      toast.error(lang === "vi" ? `Lỗi khi chia nhỏ tệp: ${err.message}` : `Error splitting file: ${err.message}`);
    } finally {
      setIsSplitting(false);
    }
  };

  // Individual file download
  const downloadResultFile = (res: SplitResult) => {
    const blob = new Blob([res.pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${res.name.replace(/\s+/g, "_")}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ZIP download of all files
  const downloadAllAsZip = async () => {
    if (splitResults.length === 0) return;
    const zip = new JSZip();

    splitResults.forEach((res) => {
      zip.file(`${res.name.replace(/\s+/g, "_")}.pdf`, res.pdfBytes);
    });

    try {
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${uploadedFile?.name.replace(/\.pdf$/i, "") || "Split_Files"}_results.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(lang === "vi" ? "Đã tải xuống gói ZIP thành công!" : "ZIP package downloaded successfully!");
    } catch (err: any) {
      toast.error(lang === "vi" ? "Lỗi khi tạo file nén ZIP" : "Error creating ZIP file");
    }
  };

  // Trigger fullscreen viewer for specific pages inside a range
  const openFullscreenForRange = (pagesList: number[], initialPageNum: number) => {
    setFullscreenPages(pagesList);
    const idx = pagesList.indexOf(initialPageNum);
    setFullscreenActiveIndex(idx !== -1 ? idx : 0);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-[#0B0F1A]" id="pdf-split-container">
      {/* Upper Action Bar / Header */}
      <div className="bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800/80 px-[25px] py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
        <div className="flex items-start gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-600/20 flex-shrink-0 mt-0.5">
            <Split className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              <span>{lang === "vi" ? "Chia Nhỏ PDF" : "Split PDF Document"}</span>
              {fileDetails && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 font-bold border border-rose-100 dark:border-rose-900/40">
                  {fileDetails.totalPages} {lang === "vi" ? "Trang" : "Pages"}
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {lang === "vi" 
                ? "Trích xuất hoặc cắt nhỏ file PDF gốc theo nhiều khoảng trang (ví dụ: 1-3, 5, 8-12) cùng lúc. Hỗ trợ preview trang cắt và tải xuống cả file nén ZIP."
                : "Extract or slice a PDF into multiple smaller documents by page ranges (e.g. 1-3, 5, 8-12). Previews range margins and download as ZIP."}
            </p>
          </div>
        </div>

        {uploadedFile && (
          <div className="flex items-center gap-2 self-stretch md:self-auto">
            <button
              onClick={() => {
                setUploadedFile(null);
                setFileDetails(null);
                setSplitRanges([]);
                setSplitResults([]);
              }}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{lang === "vi" ? "Xoá tất cả" : "Reset file"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Body Content Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {!uploadedFile ? (
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
                className="relative border-2 border-dashed rounded-3xl p-12 text-center flex flex-col items-center justify-center min-h-[300px] transition-all cursor-pointer border-rose-300 dark:border-rose-800/60 bg-rose-50/10 dark:bg-rose-950/5 hover:border-rose-500 dark:hover:border-rose-700/80"
              >
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />
                <div className="p-4 rounded-2xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 mb-4">
                  <Upload className="h-8 w-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  {lang === "vi" ? "Kéo & thả file PDF vào đây hoặc nhấp để tải lên" : "Drag & drop PDF file here or click to choose from computer"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                  {lang === "vi" ? "Hỗ trợ chia tách, cắt hoặc trích xuất dải trang từ file PDF của bạn" : "Supports splitting, slicing or extracting page ranges from your PDF"}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left column: PDF upload and split range builder */}
            <div className="lg:col-span-7 space-y-6">
              {/* Selected File metadata card */}
              <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-sm" title={fileDetails?.name}>
                      {fileDetails?.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {fileDetails?.size} • {fileDetails?.totalPages} {lang === "vi" ? "trang" : "pages"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setUploadedFile(null);
                    setFileDetails(null);
                    setSplitRanges([]);
                    setSplitResults([]);
                  }}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                  title={lang === "vi" ? "Chọn file khác" : "Change file"}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Loading status */}
              {loading && (
                <div className="flex flex-col items-center justify-center py-10 space-y-3 bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800">
                  <Loader2 className="h-8 w-8 text-rose-500 animate-spin" />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {lang === "vi" ? "Đang chuẩn bị file và tạo preview các trang..." : "Parsing PDF document and preparing page thumbnails..."}
                  </span>
                </div>
              )}

              {/* Ranges list editor */}
              {!loading && uploadedFile && fileDetails && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
                      {lang === "vi" ? "Thiết Lập Các Phần Cần Cắt" : "Configure Split Ranges"}
                    </h3>
                    <button
                      onClick={addRange}
                      className="px-3 py-1.5 text-[11px] font-bold bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{lang === "vi" ? "Thêm phần cắt mới" : "Add Split Part"}</span>
                    </button>
                  </div>

              {/* Loop Split Ranges */}
              <div className="space-y-3.5">
                {splitRanges.map((range, idx) => {
                  const pagesList = parseRange(range.rangeStr, fileDetails.totalPages);
                  const firstPage = pagesList[0];
                  const lastPage = pagesList[pagesList.length - 1];

                  return (
                    <div
                      key={range.id}
                      className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                    >
                      {/* Form Details */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">
                            #{idx + 1}
                          </span>
                          <input
                            type="text"
                            value={range.name}
                            onChange={(e) => handleUpdateRangeName(range.id, e.target.value)}
                            placeholder={lang === "vi" ? "Tên file nhỏ" : "Output label"}
                            className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden border-b border-transparent hover:border-slate-200 dark:hover:border-slate-800 focus:border-rose-500 px-1 py-0.5"
                          />
                        </div>

                        {/* Range input row */}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={range.rangeStr}
                            onChange={(e) => handleUpdateRangeStr(range.id, e.target.value)}
                            placeholder={lang === "vi" ? "Ví dụ: 1-3, 5" : "E.g. 1-3, 5"}
                            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F1A] text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20"
                          />
                          {splitRanges.length > 1 && (
                            <button
                              onClick={() => removeRange(range.id)}
                              className="p-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 rounded-xl transition-colors cursor-pointer"
                              title={lang === "vi" ? "Xoá phần cắt này" : "Remove this split"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        {/* Parsed list helper */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          <span>{lang === "vi" ? "Các trang trích xuất:" : "Extracted pages:"}</span>
                          {pagesList.length === 0 ? (
                            <span className="text-rose-500 font-bold">{lang === "vi" ? "Trống (Nhập dải trang)" : "Empty (Enter ranges)"}</span>
                          ) : (
                            <span className="font-bold text-rose-500">{pagesList.join(", ")}</span>
                          )}
                        </div>
                      </div>

                      {/* Visual previews of range: first page and last page */}
                      {pagesList.length > 0 && (
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#0B0F1A]/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 self-center">
                          {/* First Page Preview */}
                          {firstPage && (
                            <div 
                              onClick={() => openFullscreenForRange(pagesList, firstPage)}
                              className="relative cursor-zoom-in group/item w-[50px] aspect-[3/4] bg-white dark:bg-[#111827] rounded-md overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs hover:border-rose-400 transition-colors"
                            >
                              <img src={allPagesThumbs[firstPage - 1]} alt="First" className="w-full h-full object-contain pointer-events-none" referrerPolicy="no-referrer" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/item:opacity-100 flex items-center justify-center transition-opacity">
                                <Maximize2 className="h-3 w-3 text-white" />
                              </div>
                              <span className="absolute bottom-0.5 left-0.5 bg-black/75 px-1 py-0.2 text-[8px] font-bold text-white rounded-xs">
                                P.{firstPage}
                              </span>
                            </div>
                          )}

                          {/* Arrow if multiple pages */}
                          {pagesList.length > 1 && (
                            <span className="text-slate-400 dark:text-slate-600 font-mono text-xs">...</span>
                          )}

                          {/* Last Page Preview */}
                          {pagesList.length > 1 && lastPage && (
                            <div 
                              onClick={() => openFullscreenForRange(pagesList, lastPage)}
                              className="relative cursor-zoom-in group/item w-[50px] aspect-[3/4] bg-white dark:bg-[#111827] rounded-md overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs hover:border-rose-400 transition-colors"
                            >
                              <img src={allPagesThumbs[lastPage - 1]} alt="Last" className="w-full h-full object-contain pointer-events-none" referrerPolicy="no-referrer" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/item:opacity-100 flex items-center justify-center transition-opacity">
                                <Maximize2 className="h-3 w-3 text-white" />
                              </div>
                              <span className="absolute bottom-0.5 left-0.5 bg-black/75 px-1 py-0.2 text-[8px] font-bold text-white rounded-xs">
                                P.{lastPage}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Action Button */}
              <button
                onClick={executeSplit}
                disabled={isSplitting}
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-md shadow-rose-600/10 disabled:opacity-50"
              >
                {isSplitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{lang === "vi" ? "Đang chia tách và xử lý PDF..." : "Slicing PDF..."}</span>
                  </>
                ) : (
                  <>
                    <Split className="h-4 w-4" />
                    <span>{lang === "vi" ? "Bắt Đầu Chia Nhỏ PDF" : "Execute PDF Split"}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right column: Results preview and download */}
        <div className="lg:col-span-5 space-y-6">
          {splitResults.length > 0 ? (
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                  {lang === "vi" ? "Kết Quả Chia Nhỏ" : "Split Output Files"}
                </h3>
                <button
                  onClick={downloadAllAsZip}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold rounded-lg border border-emerald-100 dark:border-emerald-900/40 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <FolderDown className="h-3.5 w-3.5" />
                  <span>{lang === "vi" ? "Tải tất cả (ZIP)" : "Download All (ZIP)"}</span>
                </button>
              </div>

              <div className="space-y-3.5">
                {splitResults.map((res) => (
                  <div
                    key={res.id}
                    className="flex items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-[#0B0F1A] border border-slate-100 dark:border-slate-800/80 rounded-xl"
                  >
                    <div className="flex items-center gap-2.5">
                      {/* Margins preview stacked */}
                      <div className="flex items-center -space-x-4 bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
                        {res.firstPageThumb && (
                          <div className="w-8 aspect-[3/4] bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <img src={res.firstPageThumb} alt="First thumb" className="w-full h-full object-contain pointer-events-none" referrerPolicy="no-referrer" />
                          </div>
                        )}
                        {res.pages.length > 1 && res.lastPageThumb && (
                          <div className="w-8 aspect-[3/4] bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 overflow-hidden shadow-md">
                            <img src={res.lastPageThumb} alt="Last thumb" className="w-full h-full object-contain pointer-events-none" referrerPolicy="no-referrer" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[120px] md:max-w-[160px]">
                          {res.name}
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          {res.pages.length} {lang === "vi" ? "Trang" : "Pages"} ({res.pages[0]} - {res.pages[res.pages.length - 1]})
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => openFullscreenForRange(res.pages, res.pages[0])}
                        className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title={lang === "vi" ? "Xem trước trang" : "Preview range pages"}
                      >
                        <Maximize2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => downloadResultFile(res)}
                        className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-400 rounded-lg transition-colors cursor-pointer"
                        title={lang === "vi" ? "Tải xuống file này" : "Download PDF"}
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Idle / Instruction block */
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center space-y-4">
              <div className="p-4 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 max-w-max mx-auto">
                <FileCheck2 className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  {lang === "vi" ? "Trình Trích Xuất & Cắt File" : "Extraction & Splitter Output"}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  {lang === "vi" 
                    ? "Sau khi chọn dải trang và thực hiện chia nhỏ, các file PDF kết quả sẽ hiển thị tại đây để bạn tải xuống riêng biệt hoặc tải nén ZIP." 
                    : "Configure page ranges and click Split. The split PDF outputs will be ready here for individual download or ZIP export."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    )}
  </div>

      {/* Fullscreen Page Viewer for specific ranges */}
      <AnimatePresence>
        {fullscreenActiveIndex !== null && fullscreenPages.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
            <button
              onClick={() => {
                setFullscreenActiveIndex(null);
                setFullscreenPages([]);
              }}
              className="absolute top-4 right-4 p-2 bg-slate-800/80 text-white rounded-xl hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Left arrow */}
            <button
              disabled={fullscreenActiveIndex === 0}
              onClick={() => setFullscreenActiveIndex(prev => (prev !== null && prev > 0 ? prev - 1 : prev))}
              className="absolute left-4 p-3 bg-slate-800/80 text-white rounded-full hover:bg-slate-700 disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>

            {/* Content view */}
            <div className="flex flex-col items-center max-w-full max-h-[85vh]">
              <img
                src={allPagesThumbs[fullscreenPages[fullscreenActiveIndex] - 1]}
                alt={`Page ${fullscreenPages[fullscreenActiveIndex]}`}
                referrerPolicy="no-referrer"
                className="max-h-[75vh] max-w-[90vw] object-contain rounded-lg shadow-2xl border border-slate-800"
              />
              <div className="mt-4 text-center text-white">
                <p className="font-bold text-sm">
                  {lang === "vi" 
                    ? `Xem Trang ${fullscreenPages[fullscreenActiveIndex]} (Dải trang hiển thị: ${fullscreenActiveIndex + 1} / ${fullscreenPages.length})` 
                    : `Viewing Page ${fullscreenPages[fullscreenActiveIndex]} (Range index: ${fullscreenActiveIndex + 1} of ${fullscreenPages.length})`}
                </p>
              </div>
            </div>

            {/* Right arrow */}
            <button
              disabled={fullscreenActiveIndex === fullscreenPages.length - 1}
              onClick={() => setFullscreenActiveIndex(prev => (prev !== null && prev < fullscreenPages.length - 1 ? prev + 1 : prev))}
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
