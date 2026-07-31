import React, { useState, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { PDFDocument, degrees } from "pdf-lib";
import JSZip from "jszip";
import { useI18n } from "../utils/i18n";
import { pdfSessionStore } from "../utils/sessionHelper";
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
  FolderDown, 
  Layers, 
  Split, 
  CheckCircle2,
  RotateCcw,
  RotateCw,
  CheckSquare,
  Square,
  RefreshCw,
  FileCheck2
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

interface SinglePageItem {
  originalIndex: number; // 0-based
  pageNum: number; // 1-based
  rotation: number; // 0, 90, 180, 270
  selected: boolean;
}

export default function PdfSplit() {
  const { lang } = useI18n();

  // Mode: "range" = Chia theo dải trang, "single" = Chia lẻ từng file
  const [splitMode, setSplitMode] = useState<"range" | "single">(() => {
    return pdfSessionStore.getSplit()?.splitMode || "range";
  });

  const [uploadedFile, setUploadedFile] = useState<File | null>(() => {
    return pdfSessionStore.getSplit()?.uploadedFile || null;
  });
  const [fileDetails, setFileDetails] = useState<{ name: string; size: string; totalPages: number } | null>(() => {
    return pdfSessionStore.getSplit()?.fileDetails || null;
  });
  const [loading, setLoading] = useState(false);
  const [splitProgress, setSplitProgress] = useState<{ current: number; total: number; message: string } | null>(null);
  
  // All original pages' thumbnail data URLs (0-based list)
  const [allPagesThumbs, setAllPagesThumbs] = useState<string[]>(() => {
    return pdfSessionStore.getSplit()?.allPagesThumbs || [];
  });
  const [originalPdfBytes, setOriginalPdfBytes] = useState<Uint8Array | null>(() => {
    return pdfSessionStore.getSplit()?.originalPdfBytes || null;
  });

  // Range Split Configurations
  const [splitRanges, setSplitRanges] = useState<SplitRange[]>(() => {
    return pdfSessionStore.getSplit()?.splitRanges || [];
  });
  const [splitResults, setSplitResults] = useState<SplitResult[]>(() => {
    return pdfSessionStore.getSplit()?.splitResults || [];
  });
  const [isSplitting, setIsSplitting] = useState(false);

  // Single Pages Configurations (For Mode 2: Chia lẻ từng file)
  const [singlePages, setSinglePages] = useState<SinglePageItem[]>(() => {
    return pdfSessionStore.getSplit()?.singlePages || [];
  });

  // Sync state to pdfSessionStore
  useEffect(() => {
    pdfSessionStore.setSplit({
      splitMode,
      uploadedFile,
      fileDetails,
      originalPdfBytes,
      allPagesThumbs,
      splitRanges,
      splitResults,
      singlePages,
    });
  }, [splitMode, uploadedFile, fileDetails, originalPdfBytes, allPagesThumbs, splitRanges, splitResults, singlePages]);

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

      const bytesForWorker = bytes.slice();
      const pdf = await pdfjsLib.getDocument({ data: bytesForWorker }).promise;
      const totalPages = pdf.numPages;

      setFileDetails({
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
        totalPages,
      });

      const thumbs: string[] = [];
      const singlePageList: SinglePageItem[] = [];

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.65 });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport } as any).promise;
        }
        thumbs.push(canvas.toDataURL("image/jpeg", 0.8));
        singlePageList.push({
          originalIndex: i - 1,
          pageNum: i,
          rotation: 0,
          selected: true,
        });

        if (i % 2 === 0 || i === totalPages) {
          setSplitProgress({
            current: i,
            total: totalPages,
            message: lang === "vi" 
              ? `Đang tạo ảnh xem trước trang ${i}/${totalPages}...` 
              : `Generating page preview ${i}/${totalPages}...`
          });
          await new Promise((r) => setTimeout(r, 12));
        }
      }

      setAllPagesThumbs(thumbs);
      setSinglePages(singlePageList);
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
      setSplitProgress(null);
    }
  };

  // Range Split Handlers
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
    setSplitProgress({
      current: 0,
      total: splitRanges.length,
      message: lang === "vi" ? "Đang khởi tạo tiến trình chia tệp..." : "Initializing split process...",
    });

    const results: SplitResult[] = [];

    try {
      await new Promise((r) => setTimeout(r, 40));
      const srcDoc = await PDFDocument.load(originalPdfBytes);

      for (let idx = 0; idx < splitRanges.length; idx++) {
        const range = splitRanges[idx];
        setSplitProgress({
          current: idx + 1,
          total: splitRanges.length,
          message: lang === "vi" 
            ? `Đang cắt ${range.name} (${idx + 1}/${splitRanges.length})...` 
            : `Processing ${range.name} (${idx + 1}/${splitRanges.length})...`,
        });

        await new Promise((r) => setTimeout(r, 20));

        const pagesToExtract = parseRange(range.rangeStr, fileDetails.totalPages);
        if (pagesToExtract.length === 0) continue;

        const subPdf = await PDFDocument.create();
        const zeroBasedIndices = pagesToExtract.map(p => p - 1);
        const copiedPages = await subPdf.copyPages(srcDoc, zeroBasedIndices);
        
        copiedPages.forEach(p => subPdf.addPage(p));
        const bytes = await subPdf.save();

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
          ? `Đã chia tệp thành ${results.length} phần thành công!` 
          : `Split into ${results.length} files successfully!`
      );
    } catch (err: any) {
      toast.error(lang === "vi" ? `Lỗi khi chia nhỏ tệp: ${err.message}` : `Error splitting file: ${err.message}`);
    } finally {
      setIsSplitting(false);
      setSplitProgress(null);
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

  // Single Page Mode Handlers (Mode 2)
  const rotateSinglePage = (pageNum: number, deltaAngle: number) => {
    setSinglePages(prev => prev.map(p => {
      if (p.pageNum === pageNum) {
        const newRot = (p.rotation + deltaAngle + 360) % 360;
        return { ...p, rotation: newRot };
      }
      return p;
    }));
  };

  const deleteSinglePage = (pageNum: number) => {
    setSinglePages(prev => prev.filter(p => p.pageNum !== pageNum));
    toast.info(lang === "vi" ? `Đã xoá trang ${pageNum}` : `Removed page ${pageNum}`);
  };

  const toggleSelectSinglePage = (pageNum: number) => {
    setSinglePages(prev => prev.map(p => p.pageNum === pageNum ? { ...p, selected: !p.selected } : p));
  };

  const selectAllSinglePages = (value: boolean) => {
    setSinglePages(prev => prev.map(p => ({ ...p, selected: value })));
  };

  const resetSinglePages = async () => {
    if (!fileDetails) return;
    const list: SinglePageItem[] = [];
    for (let i = 1; i <= fileDetails.totalPages; i++) {
      list.push({
        originalIndex: i - 1,
        pageNum: i,
        rotation: 0,
        selected: true,
      });
    }
    setSinglePages(list);
    toast.success(lang === "vi" ? "Đã khôi phục tất cả các trang gốc!" : "Restored all original pages!");
  };

  // Download individual pages as separate PDF files zipped
  const downloadSinglePagesZip = async () => {
    if (!originalPdfBytes) return;
    const selected = singlePages.filter(p => p.selected);
    if (selected.length === 0) {
      toast.warn(lang === "vi" ? "Vui lòng chọn ít nhất 1 trang để xuất tệp!" : "Please select at least 1 page!");
      return;
    }

    setIsSplitting(true);
    try {
      const srcDoc = await PDFDocument.load(originalPdfBytes);
      const zip = new JSZip();

      for (let i = 0; i < selected.length; i++) {
        const pageItem = selected[i];
        const subDoc = await PDFDocument.create();
        const [copiedPage] = await subDoc.copyPages(srcDoc, [pageItem.originalIndex]);
        if (pageItem.rotation > 0) {
          const currRot = copiedPage.getRotation().angle;
          copiedPage.setRotation(degrees(currRot + pageItem.rotation));
        }
        subDoc.addPage(copiedPage);
        const bytes = await subDoc.save();

        const baseName = uploadedFile?.name.replace(/\.pdf$/i, "") || "Page";
        zip.file(`${baseName}_Page_${pageItem.pageNum}.pdf`, bytes);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${uploadedFile?.name.replace(/\.pdf$/i, "") || "Pages"}_Individual_Files.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(lang === "vi" ? "Đã xuất thành công ZIP các trang lẻ!" : "Exported individual pages ZIP successfully!");
    } catch (err: any) {
      toast.error(lang === "vi" ? `Lỗi khi xuất các file lẻ: ${err.message}` : `Error exporting pages: ${err.message}`);
    } finally {
      setIsSplitting(false);
    }
  };

  // Combine selected single pages into 1 new PDF
  const downloadCombinedSinglePages = async () => {
    if (!originalPdfBytes) return;
    const selected = singlePages.filter(p => p.selected);
    if (selected.length === 0) {
      toast.warn(lang === "vi" ? "Vui lòng chọn ít nhất 1 trang!" : "Please select at least 1 page!");
      return;
    }

    setIsSplitting(true);
    try {
      const srcDoc = await PDFDocument.load(originalPdfBytes);
      const newDoc = await PDFDocument.create();

      for (const pageItem of selected) {
        const [copiedPage] = await newDoc.copyPages(srcDoc, [pageItem.originalIndex]);
        if (pageItem.rotation > 0) {
          const currRot = copiedPage.getRotation().angle;
          copiedPage.setRotation(degrees(currRot + pageItem.rotation));
        }
        newDoc.addPage(copiedPage);
      }

      const bytes = await newDoc.save();
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${uploadedFile?.name.replace(/\.pdf$/i, "") || "Selected"}_Combined.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(lang === "vi" ? "Đã ghép thành công các trang đã chọn thành PDF mới!" : "Exported combined PDF successfully!");
    } catch (err: any) {
      toast.error(lang === "vi" ? `Lỗi khi tạo file PDF: ${err.message}` : `Error creating PDF: ${err.message}`);
    } finally {
      setIsSplitting(false);
    }
  };

  // Lightbox view launcher
  const openFullscreenForRange = (pagesList: number[], initialPageNum: number) => {
    setFullscreenPages(pagesList);
    const idx = pagesList.indexOf(initialPageNum);
    setFullscreenActiveIndex(idx !== -1 ? idx : 0);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-[#0B0F1A]" id="pdf-split-container">
      {/* Upper Action Bar / Header */}
      <div className="bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800/80 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
        <div className="flex items-start gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-600/20 flex-shrink-0 mt-0.5">
            <Split className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {lang === "vi" ? "Chia Nhỏ PDF" : "Split PDF Document"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {lang === "vi" 
                ? "Chia tách tệp PDF theo dải trang hoặc cắt lẻ từng trang trực tiếp với các công cụ xem trước, xoay và xoá tiện lợi."
                : "Split PDF documents by page ranges or manage individual pages with quick previews, rotation and delete features."}
            </p>
          </div>
        </div>
      </div>

      {/* Main Body Content Scrollable Area - SINGLE PANE LAYOUT */}
      <div className="flex-1 overflow-y-auto p-6 max-w-5xl w-full mx-auto">
        {!uploadedFile ? (
          <div className="w-full">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 space-y-4 bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-md mx-auto my-8">
                <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
                <div className="text-center space-y-1.5 w-full">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {splitProgress?.message || (lang === "vi" ? "Đang xử lý tệp PDF..." : "Processing PDF file...")}
                  </h4>
                  {splitProgress && splitProgress.total > 0 && (
                    <div className="w-full space-y-1 pt-2">
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-purple-600 h-full rounded-full transition-all duration-200"
                          style={{ width: `${Math.round((splitProgress.current / splitProgress.total) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 font-semibold block text-right">
                        {Math.round((splitProgress.current / splitProgress.total) * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                className="relative border-2 border-dashed rounded-3xl p-12 text-center flex flex-col items-center justify-center min-h-[340px] transition-all cursor-pointer border-purple-300 dark:border-purple-800/60 bg-purple-50/10 dark:bg-purple-950/5 hover:border-purple-500 dark:hover:border-purple-700/80"
              >
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />
                <div className="p-4 rounded-2xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 mb-4">
                  <Upload className="h-8 w-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  {lang === "vi" ? "Kéo & thả file PDF vào đây hoặc nhấp để tải lên" : "Drag & drop PDF file here or click to choose from computer"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                  {lang === "vi" ? "Hỗ trợ chia tách theo dải trang hoặc cắt lẻ từng trang linh hoạt" : "Supports range splits or individual single page extractions"}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Mode Switcher Tabs (Moved below header in main body) */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full sm:w-auto self-start">
              <button
                type="button"
                onClick={() => setSplitMode("range")}
                className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  splitMode === "range"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Layers className="h-4 w-4" />
                <span>{lang === "vi" ? "Chia theo range" : "Split by Range"}</span>
              </button>

              <button
                type="button"
                onClick={() => setSplitMode("single")}
                className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  splitMode === "single"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>{lang === "vi" ? "Chia theo trang" : "Split by page"}</span>
              </button>
            </div>

            {/* Selected File Metadata Card */}
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate max-w-md" title={fileDetails?.name}>
                    {fileDetails?.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {fileDetails?.size} • {fileDetails?.totalPages} {lang === "vi" ? "trang" : "pages"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setUploadedFile(null);
                    setFileDetails(null);
                    setOriginalPdfBytes(null);
                    setAllPagesThumbs([]);
                    setSplitRanges([]);
                    setSplitResults([]);
                    setSinglePages([]);
                    pdfSessionStore.clearSplit();
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-rose-500/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:border-rose-600 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{lang === "vi" ? "Xoá tệp" : "Clear File"}</span>
                </button>
              </div>
            </div>

            {/* ======================================================== */}
            {/* MODE 1: CHIA THEO RANGE (SPLIT BY RANGE) - SINGLE PANE   */}
            {/* ======================================================== */}
            {splitMode === "range" && (
              <div className="space-y-6">
                {/* Control Header bar with Execute & ZIP buttons at top */}
                <div className="flex flex-wrap justify-between items-center gap-3 px-1">
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase flex items-center gap-2">
                    <Layers className="h-4 w-4 text-purple-500" />
                    <span>{lang === "vi" ? "Thiết Lập Các Phần Cần Cắt" : "Configure Split Ranges"}</span>
                  </h3>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={addRange}
                      className="px-3.5 py-2 text-xs font-bold bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{lang === "vi" ? "Thêm phần cắt mới" : "Add Split Part"}</span>
                    </button>

                    <button
                      onClick={executeSplit}
                      disabled={isSplitting}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-md shadow-purple-600/20 disabled:opacity-50"
                    >
                      {isSplitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>{splitProgress?.message || (lang === "vi" ? "Đang chia..." : "Splitting...")}</span>
                        </>
                      ) : (
                        <>
                          <Split className="h-4 w-4" />
                          <span>{lang === "vi" ? "Bắt Đầu Chia Nhỏ PDF" : "Execute Split"}</span>
                        </>
                      )}
                    </button>

                    {splitResults.length > 0 && (
                      <button
                        onClick={downloadAllAsZip}
                        className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <FolderDown className="h-4 w-4" />
                        <span>{lang === "vi" ? "Tải tất cả (ZIP)" : "Download All (ZIP)"}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Range Items List */}
                <div className="space-y-4">
                  {splitRanges.map((range, idx) => {
                    const pagesList = parseRange(range.rangeStr, fileDetails?.totalPages || 0);
                    const firstPageNum = pagesList[0];
                    const lastPageNum = pagesList[pagesList.length - 1];
                    const firstThumb = firstPageNum ? allPagesThumbs[firstPageNum - 1] : null;
                    const lastThumb = (lastPageNum && pagesList.length > 1) ? allPagesThumbs[lastPageNum - 1] : null;

                    return (
                      <div
                        key={range.id}
                        className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-all hover:border-purple-300 dark:hover:border-purple-800/80"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                          {/* Left Column: Title & Input info */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 flex-1">
                                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                                  #{idx + 1}
                                </span>
                                <input
                                  type="text"
                                  value={range.name}
                                  onChange={(e) => handleUpdateRangeName(range.id, e.target.value)}
                                  placeholder={lang === "vi" ? "Tên file nhỏ" : "Output label"}
                                  className="bg-transparent text-sm font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden border-b border-slate-200 dark:border-slate-800 focus:border-purple-500 px-2 py-0.5 flex-1 max-w-xs"
                                />
                              </div>

                              {splitRanges.length > 1 && (
                                <button
                                  onClick={() => removeRange(range.id)}
                                  className="p-2 border border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors cursor-pointer"
                                  title={lang === "vi" ? "Xoá phần cắt này" : "Remove this split"}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                {lang === "vi" ? "Khoảng trang cần cắt (VD: 1-3, 5):" : "Page range to extract (e.g. 1-3, 5):"}
                              </label>
                              <input
                                type="text"
                                value={range.rangeStr}
                                onChange={(e) => handleUpdateRangeStr(range.id, e.target.value)}
                                placeholder={lang === "vi" ? "Ví dụ: 1-3, 5" : "E.g. 1-3, 5"}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F1A] text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20"
                              />
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                              <span>{lang === "vi" ? "Các trang trích xuất:" : "Extracted pages:"}</span>
                              {pagesList.length === 0 ? (
                                <span className="text-rose-500 font-bold">{lang === "vi" ? "Chưa hợp lệ" : "Invalid"}</span>
                              ) : (
                                <span className="font-bold text-purple-600 dark:text-purple-400">{pagesList.join(", ")} ({pagesList.length} {lang === "vi" ? "trang" : "pages"})</span>
                              )}
                            </div>
                          </div>

                          {/* Right Column: Page Preview box with only 2 thumbnails (First & Last) */}
                          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center space-y-2 h-full min-h-[130px]">
                            {pagesList.length > 0 && (firstThumb || lastThumb) ? (
                              <div className="flex items-center justify-center gap-6">
                                {firstThumb && (
                                  <div
                                    onClick={() => openFullscreenForRange(pagesList, firstPageNum)}
                                    className="group/thumb flex flex-col items-center gap-1 cursor-pointer"
                                    title={lang === "vi" ? `Click để xem trang đầu (#${firstPageNum})` : `Click to preview first page (#${firstPageNum})`}
                                  >
                                    <div className="w-16 aspect-[3/4] bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs group-hover/thumb:scale-105 group-hover/thumb:border-purple-500 transition-all p-1 relative">
                                      <img src={firstThumb || null} alt="First Page" className="w-full h-full object-contain pointer-events-none" referrerPolicy="no-referrer" />
                                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                                        <Maximize2 className="h-4 w-4 text-white" />
                                      </div>
                                    </div>
                                    <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                                      {lang === "vi" ? `Trang đầu (#${firstPageNum})` : `First (#${firstPageNum})`}
                                    </span>
                                  </div>
                                )}

                                {lastThumb && pagesList.length > 1 && (
                                  <div
                                    onClick={() => openFullscreenForRange(pagesList, lastPageNum)}
                                    className="group/thumb flex flex-col items-center gap-1 cursor-pointer"
                                    title={lang === "vi" ? `Click để xem trang cuối (#${lastPageNum})` : `Click to preview last page (#${lastPageNum})`}
                                  >
                                    <div className="w-16 aspect-[3/4] bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs group-hover/thumb:scale-105 group-hover/thumb:border-purple-500 transition-all p-1 relative">
                                      <img src={lastThumb || null} alt="Last Page" className="w-full h-full object-contain pointer-events-none" referrerPolicy="no-referrer" />
                                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                                        <Maximize2 className="h-4 w-4 text-white" />
                                      </div>
                                    </div>
                                    <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                                      {lang === "vi" ? `Trang cuối (#${lastPageNum})` : `Last (#${lastPageNum})`}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-center text-xs text-slate-400 py-4">
                                {lang === "vi" ? "Vui lòng nhập dải trang hợp lệ để xem trước" : "Enter a valid range to preview"}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Split Output Results Integrated directly below */}
                {splitResults.length > 0 && (
                  <div className="bg-white dark:bg-[#111827] border border-purple-200 dark:border-purple-800/80 rounded-2xl p-5 shadow-lg space-y-4 animate-fadeIn mt-6">
                    <div className="flex justify-between items-center pb-2 border-b border-purple-100 dark:border-purple-800/60">
                      <h3 className="text-xs font-bold tracking-wider text-purple-600 dark:text-purple-400 uppercase flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span>{lang === "vi" ? "Kết Quả Chia Nhỏ Tệp" : "Split Output Files"}</span>
                      </h3>
                      <button
                        onClick={downloadAllAsZip}
                        className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <FolderDown className="h-4 w-4" />
                        <span>{lang === "vi" ? "Tải tất cả (ZIP)" : "Download All (ZIP)"}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {splitResults.map((res) => (
                        <div
                          key={res.id}
                          className="flex items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-slate-800/80 rounded-xl"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex items-center -space-x-3 bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs flex-shrink-0">
                              {res.firstPageThumb && (
                                <div className="w-9 aspect-[3/4] bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 overflow-hidden">
                                  <img src={res.firstPageThumb || null} alt="First thumb" className="w-full h-full object-contain pointer-events-none" referrerPolicy="no-referrer" />
                                </div>
                              )}
                              {res.pages.length > 1 && res.lastPageThumb && (
                                <div className="w-9 aspect-[3/4] bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 overflow-hidden shadow-md">
                                  <img src={res.lastPageThumb || null} alt="Last thumb" className="w-full h-full object-contain pointer-events-none" referrerPolicy="no-referrer" />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 space-y-0.5">
                              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={res.name}>
                                {res.name}
                              </h4>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                {res.pages.length} {lang === "vi" ? "Trang" : "Pages"} ({res.pages[0]} - {res.pages[res.pages.length - 1]})
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => openFullscreenForRange(res.pages, res.pages[0])}
                              className="p-2 border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                              title={lang === "vi" ? "Xem các trang trong phần này" : "Preview range pages"}
                            >
                              <Maximize2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => downloadResultFile(res)}
                              className="p-2 border border-emerald-500/60 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50 rounded-xl transition-colors cursor-pointer"
                              title={lang === "vi" ? "Tải xuống file này" : "Download PDF"}
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* MODE 2: CHIA LẺ TỪNG FILE (INDIVIDUAL PAGE EXTRACTION)   */}
            {/* ======================================================== */}
            {splitMode === "single" && (
              <div className="space-y-6">
                {/* Action Bar for Mode 2 */}
                <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => selectAllSinglePages(singlePages.some(p => !p.selected))}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {singlePages.every(p => p.selected) ? (
                        <>
                          <CheckSquare className="h-4 w-4 text-purple-600" />
                          <span>{lang === "vi" ? "Bỏ chọn tất cả" : "Deselect All"}</span>
                        </>
                      ) : (
                        <>
                          <Square className="h-4 w-4 text-slate-400" />
                          <span>{lang === "vi" ? "Chọn tất cả" : "Select All"}</span>
                        </>
                      )}
                    </button>

                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {lang === "vi" 
                        ? `Đã chọn ${singlePages.filter(p => p.selected).length} / ${fileDetails?.totalPages || singlePages.length} trang`
                        : `Selected ${singlePages.filter(p => p.selected).length} / ${fileDetails?.totalPages || singlePages.length} pages`}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={resetSinglePages}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-xs font-semibold hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>{lang === "vi" ? "Khôi phục lại các trang" : "Restore All Pages"}</span>
                  </button>
                </div>

                {/* Pages Grid Layout */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {singlePages.map((pageItem) => {
                    const thumb = allPagesThumbs[pageItem.originalIndex];

                    return (
                      <div
                        key={`single-page-${pageItem.pageNum}`}
                        className={`group relative rounded-2xl border p-3 bg-white dark:bg-[#111827] flex flex-col items-center justify-between transition-all shadow-xs ${
                          pageItem.selected
                            ? "border-purple-500 ring-2 ring-purple-500/20"
                            : "border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100"
                        }`}
                      >
                        {/* Page Top Header */}
                        <div className="w-full flex items-center justify-between mb-2">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={pageItem.selected}
                              onChange={() => toggleSelectSinglePage(pageItem.pageNum)}
                              className="accent-purple-600 rounded h-4 w-4 cursor-pointer"
                            />
                            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">
                              #{pageItem.pageNum}
                            </span>
                          </label>

                          {pageItem.rotation > 0 && (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                              {pageItem.rotation}°
                            </span>
                          )}
                        </div>

                        {/* Thumbnail with CSS rotation */}
                        <div
                          onClick={() => openFullscreenForRange([pageItem.pageNum], pageItem.pageNum)}
                          className="relative w-full aspect-[3/4] bg-slate-900/90 dark:bg-slate-950 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 p-1 flex items-center justify-center cursor-pointer group/thumb"
                        >
                          {thumb ? (
                            <img
                              src={thumb || null}
                              alt={`Page ${pageItem.pageNum}`}
                              className="max-h-full max-w-full object-contain pointer-events-none transition-transform duration-300"
                              style={{ transform: `rotate(${pageItem.rotation}deg)` }}
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <Loader2 className="h-5 w-5 text-purple-400 animate-spin" />
                          )}

                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Maximize2 className="h-6 w-6 text-purple-300" />
                          </div>
                        </div>

                        {/* Page Toolbar Actions (Rotate, Delete) */}
                        <div className="w-full flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => rotateSinglePage(pageItem.pageNum, -90)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-950 text-slate-700 dark:text-slate-300 hover:text-purple-600 transition-colors cursor-pointer"
                              title={lang === "vi" ? "Xoay trái 90°" : "Rotate Left 90°"}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => rotateSinglePage(pageItem.pageNum, 90)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-950 text-slate-700 dark:text-slate-300 hover:text-purple-600 transition-colors cursor-pointer"
                              title={lang === "vi" ? "Xoay phải 90°" : "Rotate Right 90°"}
                            >
                              <RotateCw className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => deleteSinglePage(pageItem.pageNum)}
                            className="p-1.5 rounded-lg border border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                            title={lang === "vi" ? "Xoá trang này" : "Delete Page"}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Action Bar for Mode 2 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                  <button
                    type="button"
                    onClick={downloadSinglePagesZip}
                    disabled={isSplitting || singlePages.filter(p => p.selected).length === 0}
                    className="py-3.5 px-4 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-purple-600/25 disabled:opacity-50 cursor-pointer"
                  >
                    <FolderDown className="h-4 w-4" />
                    <span>{lang === "vi" ? "Xuất các trang đã chọn (Tệp ZIP lẻ)" : "Export Selected Pages (ZIP of Individual PDFs)"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={downloadCombinedSinglePages}
                    disabled={isSplitting || singlePages.filter(p => p.selected).length === 0}
                    className="py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-600/25 disabled:opacity-50 cursor-pointer"
                  >
                    <FileCheck2 className="h-4 w-4" />
                    <span>{lang === "vi" ? "Ghép các trang đã chọn thành 1 PDF mới" : "Combine Selected Pages into Single PDF"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox / Fullscreen Page Viewer */}
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

            {/* Content view with Rotation Sync */}
            {(() => {
              const curPageNum = fullscreenPages[fullscreenActiveIndex];
              const matchedSinglePage = singlePages.find((p) => p.pageNum === curPageNum);
              const currentRotation = matchedSinglePage ? matchedSinglePage.rotation : 0;

              return (
                <div className="flex flex-col items-center max-w-full max-h-[85vh]">
                  <div className="relative flex items-center justify-center p-4">
                    <img
                      src={allPagesThumbs[curPageNum - 1] || null}
                      alt={`Page ${curPageNum}`}
                      referrerPolicy="no-referrer"
                      className="max-h-[70vh] max-w-[85vw] object-contain rounded-lg shadow-2xl border border-slate-800 transition-transform duration-300"
                      style={{ transform: currentRotation ? `rotate(${currentRotation}deg)` : undefined }}
                    />
                  </div>
                  <div className="mt-3 text-center text-white">
                    <p className="font-bold text-sm">
                      {lang === "vi" 
                        ? `Xem Trang ${curPageNum} (${fullscreenActiveIndex + 1} / ${fullscreenPages.length})${currentRotation ? ` — Xoay ${currentRotation}°` : ""}` 
                        : `Viewing Page ${curPageNum} (${fullscreenActiveIndex + 1} of ${fullscreenPages.length})${currentRotation ? ` — Rotated ${currentRotation}°` : ""}`}
                    </p>
                  </div>
                </div>
              );
            })()}

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
