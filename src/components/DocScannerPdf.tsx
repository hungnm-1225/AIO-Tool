import React, { useState, useRef, useEffect, useCallback } from "react";
import { jsPDF } from "jspdf";
import { useI18n } from "../utils/i18n";
import { 
  Point, 
  FilterSettings, 
  DEFAULT_FILTERS, 
  warpPerspective, 
  applyImageFilters 
} from "../utils/perspectiveWarp";
import { 
  Upload, 
  Trash2, 
  Crop, 
  Sliders, 
  FileDown, 
  Eye, 
  MoveLeft, 
  MoveRight, 
  RotateCcw, 
  RotateCw,
  Check, 
  X, 
  ZoomIn, 
  Layers, 
  FileText,
  Sparkles,
  RefreshCw,
  LayoutGrid, 
  ListFilter, 
  Maximize2, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Hash, 
  ChevronLeft, 
  ChevronRight,
  ScanLine 
} from "lucide-react";
import { toast } from "react-toastify";

export interface ScannedPage {
  id: string;
  originalImage: HTMLImageElement;
  originalCanvas: HTMLCanvasElement;
  
  // 4 corner points in originalCanvas coordinates
  cropPoints: [Point, Point, Point, Point]; // TL, TR, BR, BL
  isCropped: boolean;
  
  warpedCanvas: HTMLCanvasElement | null;
  filters: FilterSettings;
  processedCanvas: HTMLCanvasElement;
}

interface DocScannerPdfProps {
  // Optional state integration
}

export default function DocScannerPdf(_props: DocScannerPdfProps) {
  const { t, lang } = useI18n();

  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);

  // View Layout Mode ("grid" | "column")
  const [viewLayout, setViewLayout] = useState<"grid" | "column">("grid");

  // Modal States
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [previewPdfModalOpen, setPreviewPdfModalOpen] = useState(false);
  const [fullscreenModalOpen, setFullscreenModalOpen] = useState(false);
  const [fullscreenPageIndex, setFullscreenPageIndex] = useState(0);

  // PDF Export & Numbering Settings
  const [pdfOrientation, setPdfOrientation] = useState<"portrait" | "landscape" | "auto">("portrait");
  const [pdfFileName, setPdfFileName] = useState("Scanned_Document");
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Auto Page Numbering Settings
  const [enablePageNumbers, setEnablePageNumbers] = useState(true);
  const [pageNumberPos, setPageNumberPos] = useState<"left" | "center" | "right">("center");
  const [pageNumberFormat, setPageNumberFormat] = useState(
    lang === "vi" ? "Trang {page} / {total}" : "Page {page} of {total}"
  );
  const [pageNumberStartPage, setPageNumberStartPage] = useState<number>(1);
  const [pageNumberStartVal, setPageNumberStartVal] = useState<number>(1);

  // Update default format if lang changes
  useEffect(() => {
    setPageNumberFormat(
      lang === "vi" ? "Trang {page} / {total}" : "Page {page} of {total}"
    );
  }, [lang]);

  // Crop Dragging & Loupe Magnifier State
  const cropCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tempPoints, setTempPoints] = useState<[Point, Point, Point, Point]>([
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ]);
  const [draggingPointIdx, setDraggingPointIdx] = useState<number | null>(null);
  const [loupePos, setLoupePos] = useState<{ x: number; y: number } | null>(null);

  // Filter Modal Temporary Settings
  const [tempFilters, setTempFilters] = useState<FilterSettings>(DEFAULT_FILTERS);
  const filterPreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // File Upload Handler
  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (fileArray.length === 0) {
      toast.error(t("docScanner.noImagesSub"));
      return;
    }

    let loadedCount = 0;
    const newPages: ScannedPage[] = [];

    fileArray.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const origCanvas = document.createElement("canvas");
          origCanvas.width = img.naturalWidth || img.width;
          origCanvas.height = img.naturalHeight || img.height;
          const ctx = origCanvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
          }

          const w = origCanvas.width;
          const h = origCanvas.height;

          const padX = Math.round(w * 0.03);
          const padY = Math.round(h * 0.03);

          const defaultPoints: [Point, Point, Point, Point] = [
            { x: padX, y: padY },
            { x: w - padX, y: padY },
            { x: w - padX, y: h - padY },
            { x: padX, y: h - padY },
          ];

          const initProcessed = applyImageFilters(origCanvas, DEFAULT_FILTERS);

          const page: ScannedPage = {
            id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            originalImage: img,
            originalCanvas: origCanvas,
            cropPoints: defaultPoints,
            isCropped: false,
            warpedCanvas: null,
            filters: { ...DEFAULT_FILTERS },
            processedCanvas: initProcessed,
          };

          newPages.push(page);
          loadedCount++;

          if (loadedCount === fileArray.length) {
            setPages((prev) => [...prev, ...newPages]);
            toast.success(`${t("docScanner.imageAdded")} (${newPages.length})`);
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // Rotate Page (90° Left / Right)
  const rotatePage = (pageIdx: number, angle: 90 | -90) => {
    setPages((prev) => {
      return prev.map((page, idx) => {
        if (idx !== pageIdx) return page;

        const src = page.originalCanvas;
        const dst = document.createElement("canvas");
        if (angle === 90 || angle === -90) {
          dst.width = src.height;
          dst.height = src.width;
        } else {
          dst.width = src.width;
          dst.height = src.height;
        }
        const ctx = dst.getContext("2d");
        if (ctx) {
          ctx.translate(dst.width / 2, dst.height / 2);
          ctx.rotate((angle * Math.PI) / 180);
          ctx.drawImage(src, -src.width / 2, -src.height / 2);
        }

        const w = dst.width;
        const h = dst.height;
        const padX = Math.round(w * 0.03);
        const padY = Math.round(h * 0.03);
        const newPoints: [Point, Point, Point, Point] = [
          { x: padX, y: padY },
          { x: w - padX, y: padY },
          { x: w - padX, y: h - padY },
          { x: padX, y: h - padY },
        ];

        const warped = page.isCropped ? warpPerspective(dst, newPoints) : null;
        const sourceForFilter = warped || dst;
        const processed = applyImageFilters(sourceForFilter, page.filters);

        return {
          ...page,
          originalCanvas: dst,
          cropPoints: newPoints,
          warpedCanvas: warped,
          processedCanvas: processed,
        };
      });
    });
    toast.success(angle === 90 ? t("docScanner.rotateRight") : t("docScanner.rotateLeft"));
  };

  // Reordering Pages
  const movePage = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === pages.length - 1)
    ) {
      return;
    }
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    const updated = [...pages];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setPages(updated);

    if (fullscreenModalOpen && fullscreenPageIndex === index) {
      setFullscreenPageIndex(targetIdx);
    }
  };

  const deletePage = (index: number) => {
    const updated = pages.filter((_, i) => i !== index);
    setPages(updated);
    if (activePageIndex >= updated.length) {
      setActivePageIndex(Math.max(0, updated.length - 1));
    }
    if (fullscreenPageIndex >= updated.length) {
      setFullscreenPageIndex(Math.max(0, updated.length - 1));
    }
    if (updated.length === 0) {
      setFullscreenModalOpen(false);
    }
    toast.info(t("docScanner.deletePage"));
  };

  const clearAllPages = () => {
    setPages([]);
    setFullscreenModalOpen(false);
    toast.info(t("docScanner.clearAll"));
  };

  // Open Fullscreen Viewer
  const openFullscreenViewer = (pageIdx: number) => {
    setFullscreenPageIndex(pageIdx);
    setActivePageIndex(pageIdx);
    setFullscreenModalOpen(true);
  };

  // OPEN CROP MODAL
  const openCropModal = (pageIdx: number) => {
    setActivePageIndex(pageIdx);
    const page = pages[pageIdx];
    if (page) {
      setTempPoints([...page.cropPoints]);
      setCropModalOpen(true);
    }
  };

  // APPLY PERSPECTIVE CROP
  const applyCropWarp = () => {
    const page = pages[activePageIndex];
    if (!page) return;

    try {
      const warped = warpPerspective(page.originalCanvas, tempPoints);
      const processed = applyImageFilters(warped, page.filters);

      setPages((prev) => {
        const next = [...prev];
        next[activePageIndex] = {
          ...page,
          cropPoints: [...tempPoints],
          isCropped: true,
          warpedCanvas: warped,
          processedCanvas: processed,
        };
        return next;
      });

      setCropModalOpen(false);
      toast.success(t("docScanner.cropSuccess"));
    } catch (e) {
      console.error("Warp error", e);
      toast.error(t("common.error"));
    }
  };

  // OPEN FILTER MODAL
  const openFilterModal = (pageIdx: number) => {
    setActivePageIndex(pageIdx);
    const page = pages[pageIdx];
    if (page) {
      setTempFilters({ ...page.filters });
      setFilterModalOpen(true);
    }
  };

  // APPLY FILTERS TO ACTIVE PAGE OR ALL PAGES
  const applyFilters = (applyToAll: boolean = false) => {
    const page = pages[activePageIndex];
    if (!page) return;

    setPages((prev) => {
      return prev.map((p, idx) => {
        if (applyToAll || idx === activePageIndex) {
          const sourceCanvas = p.warpedCanvas || p.originalCanvas;
          const newProcessed = applyImageFilters(sourceCanvas, tempFilters);
          return {
            ...p,
            filters: { ...tempFilters },
            processedCanvas: newProcessed,
          };
        }
        return p;
      });
    });

    setFilterModalOpen(false);
    toast.success(t("docScanner.filterUpdated"));
  };

  // RENDER FILTER PREVIEW LIVE
  useEffect(() => {
    if (!filterModalOpen) return;
    const page = pages[activePageIndex];
    if (!page) return;

    const sourceCanvas = page.warpedCanvas || page.originalCanvas;
    const filteredCanvas = applyImageFilters(sourceCanvas, tempFilters);

    if (filterPreviewCanvasRef.current) {
      const targetCanvas = filterPreviewCanvasRef.current;
      targetCanvas.width = filteredCanvas.width;
      targetCanvas.height = filteredCanvas.height;
      const ctx = targetCanvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(filteredCanvas, 0, 0);
      }
    }
  }, [filterModalOpen, tempFilters, activePageIndex, pages]);

  // RENDER CROP CANVAS & MAGNIFIER LOUPE
  const renderCropCanvas = useCallback(() => {
    const canvas = cropCanvasRef.current;
    if (!canvas) return;

    const page = pages[activePageIndex];
    if (!page) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const orig = page.originalCanvas;
    canvas.width = orig.width;
    canvas.height = orig.height;

    // Draw background original image
    ctx.drawImage(orig, 0, 0);

    // Dim area outside quad
    ctx.fillStyle = "rgba(15, 23, 42, 0.45)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw clear quad aperture
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(tempPoints[0].x, tempPoints[0].y);
    ctx.lineTo(tempPoints[1].x, tempPoints[1].y);
    ctx.lineTo(tempPoints[2].x, tempPoints[2].y);
    ctx.lineTo(tempPoints[3].x, tempPoints[3].y);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(orig, 0, 0);
    ctx.restore();

    // Draw polygon boundary lines
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = Math.max(3, Math.round(canvas.width / 250));
    ctx.beginPath();
    ctx.moveTo(tempPoints[0].x, tempPoints[0].y);
    ctx.lineTo(tempPoints[1].x, tempPoints[1].y);
    ctx.lineTo(tempPoints[2].x, tempPoints[2].y);
    ctx.lineTo(tempPoints[3].x, tempPoints[3].y);
    ctx.closePath();
    ctx.stroke();

    // Draw corner handle dots
    const radius = Math.max(12, Math.round(canvas.width / 100));
    tempPoints.forEach((pt, idx) => {
      const isDragging = draggingPointIdx === idx;
      ctx.fillStyle = isDragging ? "#f59e0b" : "#10b981";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = Math.max(3, radius / 3);

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    });
  }, [pages, activePageIndex, tempPoints, draggingPointIdx]);

  useEffect(() => {
    if (cropModalOpen) {
      renderCropCanvas();
    }
  }, [cropModalOpen, renderCropCanvas]);

  // Pointer interaction for Corner Handles Dragging
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = cropCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const thresholdRadius = Math.max(40, canvas.width / 20);
    let nearestIdx: number | null = null;
    let minDistance = Infinity;

    tempPoints.forEach((pt, idx) => {
      const dist = Math.hypot(pt.x - clickX, pt.y - clickY);
      if (dist < thresholdRadius && dist < minDistance) {
        minDistance = dist;
        nearestIdx = idx;
      }
    });

    if (nearestIdx !== null) {
      setDraggingPointIdx(nearestIdx);
      setLoupePos({ x: e.clientX, y: e.clientY });
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (draggingPointIdx === null) return;
    const canvas = cropCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const currentX = Math.min(Math.max(0, (e.clientX - rect.left) * scaleX), canvas.width);
    const currentY = Math.min(Math.max(0, (e.clientY - rect.top) * scaleY), canvas.height);

    setTempPoints((prev) => {
      const next = [...prev] as [Point, Point, Point, Point];
      next[draggingPointIdx] = { x: Math.round(currentX), y: Math.round(currentY) };
      return next;
    });

    setLoupePos({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (draggingPointIdx !== null) {
      setDraggingPointIdx(null);
      setLoupePos(null);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_err) {
        // Safe catch
      }
    }
  };

  // EXPORT PDF GENERATION USING JSPDF WITH AUTO PAGE NUMBERING
  const handleExportPdf = () => {
    if (pages.length === 0) {
      toast.error(t("docScanner.noImagesUploaded"));
      return;
    }

    setIsExportingPdf(true);

    setTimeout(() => {
      try {
        const doc = new jsPDF({
          orientation: pdfOrientation === "landscape" ? "l" : "p",
          unit: "mm",
          format: "a4",
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        pages.forEach((page, idx) => {
          if (idx > 0) {
            doc.addPage("a4", pdfOrientation === "landscape" ? "l" : "p");
          }

          const canvas = page.processedCanvas;
          const imgDataUrl = canvas.toDataURL("image/jpeg", 0.92);

          const imgWidth = canvas.width;
          const imgHeight = canvas.height;
          const ratio = imgWidth / imgHeight;

          // Reserve bottom margin if page numbering is active on this page
          const pageNum1Based = idx + 1;
          const shouldRenderPageNum = enablePageNumbers && (pageNum1Based >= pageNumberStartPage);
          const bottomMargin = shouldRenderPageNum ? 12 : 0;
          const availHeight = pageHeight - bottomMargin;

          let renderW = pageWidth;
          let renderH = pageWidth / ratio;

          if (renderH > availHeight) {
            renderH = availHeight;
            renderW = availHeight * ratio;
          }

          const posX = (pageWidth - renderW) / 2;
          const posY = (availHeight - renderH) / 2;

          doc.addImage(imgDataUrl, "JPEG", posX, posY, renderW, renderH);

          // Render Auto Page Numbering
          if (shouldRenderPageNum) {
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139); // slate-500

            const computedPageNum = pageNumberStartVal + (idx - (pageNumberStartPage - 1));
            const computedTotal = pages.length - pageNumberStartPage + pageNumberStartVal;

            const textStr = pageNumberFormat
              .replace("{page}", String(computedPageNum))
              .replace("{total}", String(computedTotal));

            let textX = pageWidth / 2;
            let alignOpt: "left" | "center" | "right" = "center";

            if (pageNumberPos === "left") {
              textX = 15;
              alignOpt = "left";
            } else if (pageNumberPos === "right") {
              textX = pageWidth - 15;
              alignOpt = "right";
            } else {
              textX = pageWidth / 2;
              alignOpt = "center";
            }

            doc.text(textStr, textX, pageHeight - 6, { align: alignOpt });
          }
        });

        const sanitizedName = pdfFileName.trim().replace(/[^a-zA-Z0-9_-]/g, "_") || "Scanned_Document";
        doc.save(`${sanitizedName}.pdf`);

        toast.success(t("docScanner.pdfGeneratedSuccess"));
        setPreviewPdfModalOpen(false);
      } catch (e) {
        console.error("PDF generation error", e);
        toast.error(t("common.error"));
      } finally {
        setIsExportingPdf(false);
      }
    }, 150);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header Card */}
      <div className="p-6 rounded-2xl bg-white/70 dark:bg-[#111827]/80 backdrop-blur-md border border-slate-200/80 dark:border-white/10 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/20">
              <ScanLine className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold font-sans tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>{t("docScanner.title")}</span>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                  PDF & CamScanner
                </span>
              </h2>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
                {t("docScanner.subtitle")}
              </p>
            </div>
          </div>

          {/* Export & Actions Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            {pages.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={clearAllPages}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  <Trash2 className="h-4 w-4 text-rose-500" />
                  <span>{t("docScanner.clearAll")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewPdfModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-rose-600/20"
                >
                  <FileDown className="h-4 w-4" />
                  <span>{t("docScanner.exportPdf")} ({pages.length})</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Dropzone Area */}
      <div className="relative border-2 border-dashed border-rose-300 dark:border-rose-700/60 rounded-2xl p-8 bg-rose-50/30 dark:bg-rose-950/10 hover:bg-rose-50/60 dark:hover:bg-rose-950/20 transition-all text-center flex flex-col items-center justify-center cursor-pointer group">
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => handleFileUpload(e.target.files)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div className="h-14 w-14 rounded-2xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
          <Upload className="h-7 w-7" />
        </div>
        <h3 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-200">
          {t("docScanner.uploadDropzoneTitle")}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {t("docScanner.uploadDropzoneSubtitle")}
        </p>
      </div>

      {/* Empty State */}
      {pages.length === 0 && (
        <div className="p-12 text-center rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/40 dark:bg-[#111827]/40 backdrop-blur-xs flex flex-col items-center justify-center">
          <FileText className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
          <h4 className="text-base font-semibold text-slate-700 dark:text-slate-300">
            {t("docScanner.noImagesUploaded")}
          </h4>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-md mt-1">
            {t("docScanner.noImagesSub")}
          </p>
        </div>
      )}

      {/* Pages Toolbar & Layout Mode Selector */}
      {pages.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t("docScanner.pageCount")}: <span className="text-emerald-600 font-bold">{pages.length}</span>
              </span>
              <span className="hidden sm:inline-block text-xs text-slate-400">
                • {t("docScanner.clickToViewFull")}
              </span>
            </div>

            {/* View Layout Switcher */}
            <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <button
                type="button"
                onClick={() => setViewLayout("grid")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewLayout === "grid"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
                title={t("docScanner.gridView")}
              >
                <LayoutGrid className="h-4 w-4" />
                <span>{t("docScanner.gridView")}</span>
              </button>

              <button
                type="button"
                onClick={() => setViewLayout("column")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewLayout === "column"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
                title={t("docScanner.columnView")}
              >
                <ListFilter className="h-4 w-4" />
                <span>{t("docScanner.columnView")}</span>
              </button>
            </div>
          </div>

          {/* GRID LAYOUT MODE */}
          {viewLayout === "grid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {pages.map((page, index) => {
                const previewUrl = page.processedCanvas.toDataURL("image/jpeg", 0.85);

                return (
                  <div
                    key={page.id}
                    className="group relative rounded-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-[#111827]/80 backdrop-blur-md overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    {/* Top Header Badge & Order */}
                    <div className="p-3 bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        {t("docScanner.page")} {index + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        {page.isCropped && (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            Đã cắt
                          </span>
                        )}
                        {page.filters.filterType !== "original" && (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                            {page.filters.filterType === "magic_color" ? "Magic Color" : "Filter"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Image Preview Canvas Thumbnail - Click to open Fullscreen */}
                    <div
                      onClick={() => openFullscreenViewer(index)}
                      className="relative aspect-[3/4] bg-slate-950 flex items-center justify-center p-2 overflow-hidden cursor-pointer group/img"
                      title={t("docScanner.clickToViewFull")}
                    >
                      <img
                        src={previewUrl}
                        alt={`Page ${index + 1}`}
                        className="max-h-full max-w-full object-contain rounded shadow-sm group-hover/img:scale-102 transition-transform"
                      />

                      {/* Fullscreen Overlay Hint */}
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <div className="p-2.5 rounded-full bg-slate-900/80 backdrop-blur-xs border border-white/20 flex items-center gap-2 text-xs font-semibold">
                          <Maximize2 className="h-4 w-4 text-emerald-400" />
                          <span>{t("common.search")} / Fullscreen</span>
                        </div>
                      </div>

                      {/* Reorder Buttons Overlay */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-2 right-2 flex flex-col gap-1 opacity-90 group-hover:opacity-100 transition-opacity z-10"
                      >
                        <button
                          type="button"
                          onClick={() => movePage(index, "up")}
                          disabled={index === 0}
                          className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                          title={t("docScanner.moveLeft")}
                        >
                          <MoveLeft className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => movePage(index, "down")}
                          disabled={index === pages.length - 1}
                          className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                          title={t("docScanner.moveRight")}
                        >
                          <MoveRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Card Actions Bar */}
                    <div className="p-2.5 bg-white dark:bg-[#111827] border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
                      <button
                        type="button"
                        onClick={() => openCropModal(index)}
                        className="flex-1 py-1.5 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer border border-transparent hover:border-emerald-300 dark:hover:border-emerald-800"
                        title={t("docScanner.cropAlign")}
                      >
                        <Crop className="h-3.5 w-3.5" />
                        <span>Cắt góc</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openFilterModal(index)}
                        className="flex-1 py-1.5 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer border border-transparent hover:border-indigo-300 dark:hover:border-indigo-800"
                        title={t("docScanner.filters")}
                      >
                        <Sliders className="h-3.5 w-3.5" />
                        <span>Bộ lọc</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => deletePage(index)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                        title={t("docScanner.deletePage")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VERTICAL STREAM / SINGLE COLUMN LAYOUT MODE */}
          {viewLayout === "column" && (
            <div className="space-y-6 max-w-3xl mx-auto">
              {pages.map((page, index) => {
                const previewUrl = page.processedCanvas.toDataURL("image/jpeg", 0.9);

                return (
                  <div
                    key={page.id}
                    className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#111827]/90 backdrop-blur-md shadow-md overflow-hidden flex flex-col items-center"
                  >
                    {/* Header bar */}
                    <div className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-sm text-slate-800 dark:text-slate-100 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 px-3 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800">
                          {t("docScanner.page")} {index + 1} / {pages.length}
                        </span>
                        {page.isCropped && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            Đã cắt góc
                          </span>
                        )}
                        {page.filters.filterType !== "original" && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                            {page.filters.filterType}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openCropModal(index)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Crop className="h-4 w-4" />
                          <span>{t("docScanner.cropTitle")}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openFilterModal(index)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Sliders className="h-4 w-4" />
                          <span>{t("docScanner.filters")}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => rotatePage(index, 90)}
                          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                          title={t("docScanner.rotateRight")}
                        >
                          <RotateCw className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => openFullscreenViewer(index)}
                          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                          title={t("docScanner.fullscreenViewer")}
                        >
                          <Maximize2 className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => deletePage(index)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                          title={t("docScanner.deletePage")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Image Content Stream */}
                    <div
                      onClick={() => openFullscreenViewer(index)}
                      className="w-full p-6 bg-slate-950 flex items-center justify-center cursor-pointer group/colimg"
                    >
                      <img
                        src={previewUrl}
                        alt={`Page ${index + 1}`}
                        className="max-h-[650px] w-auto object-contain rounded-lg shadow-xl group-hover/colimg:scale-101 transition-transform"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 0: FULLSCREEN IMAGE VIEWER MODAL */}
      {fullscreenModalOpen && pages[fullscreenPageIndex] && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-lg flex flex-col justify-between overflow-hidden">
          {/* Top Bar */}
          <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-sm text-white bg-emerald-600 px-3 py-1 rounded-xl">
                {t("docScanner.page")} {fullscreenPageIndex + 1} / {pages.length}
              </span>
              <span className="text-xs text-slate-400 hidden sm:inline-block">
                {t("docScanner.fullscreenViewer")}
              </span>
            </div>

            {/* Quick Action Toolbar in Fullscreen Mode */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openCropModal(fullscreenPageIndex)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 border border-emerald-500/30 transition-all cursor-pointer"
              >
                <Crop className="h-4 w-4" />
                <span>{t("docScanner.cropTitle")}</span>
              </button>

              <button
                type="button"
                onClick={() => openFilterModal(fullscreenPageIndex)}
                className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 border border-indigo-500/30 transition-all cursor-pointer"
              >
                <Sliders className="h-4 w-4" />
                <span>{t("docScanner.filters")}</span>
              </button>

              <button
                type="button"
                onClick={() => rotatePage(fullscreenPageIndex, -90)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                title={t("docScanner.rotateLeft")}
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => rotatePage(fullscreenPageIndex, 90)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                title={t("docScanner.rotateRight")}
              >
                <RotateCw className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setFullscreenModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white transition-colors cursor-pointer"
                title={t("common.close")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Center Image Display */}
          <div className="relative flex-1 flex items-center justify-center p-4 overflow-hidden bg-slate-950">
            {/* Nav Left */}
            <button
              type="button"
              onClick={() => setFullscreenPageIndex((prev) => Math.max(0, prev - 1))}
              disabled={fullscreenPageIndex === 0}
              className="absolute left-4 p-3 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed z-10 transition-all cursor-pointer shadow-2xl"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            {/* Main Image */}
            <img
              src={pages[fullscreenPageIndex].processedCanvas.toDataURL("image/jpeg", 0.95)}
              alt={`Fullscreen Page ${fullscreenPageIndex + 1}`}
              className="max-h-[82vh] max-w-[90vw] object-contain rounded-lg shadow-2xl border border-slate-800"
            />

            {/* Nav Right */}
            <button
              type="button"
              onClick={() => setFullscreenPageIndex((prev) => Math.min(pages.length - 1, prev + 1))}
              disabled={fullscreenPageIndex === pages.length - 1}
              className="absolute right-4 p-3 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed z-10 transition-all cursor-pointer shadow-2xl"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          {/* Bottom Thumbnails Strip */}
          <div className="p-3 bg-slate-900/80 border-t border-slate-800 flex items-center justify-center gap-2 overflow-x-auto">
            {pages.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setFullscreenPageIndex(idx)}
                className={`relative h-14 w-11 rounded-lg overflow-hidden border-2 transition-all cursor-pointer flex-shrink-0 ${
                  idx === fullscreenPageIndex
                    ? "border-emerald-500 scale-105 shadow-lg shadow-emerald-500/20"
                    : "border-slate-700 opacity-60 hover:opacity-100"
                }`}
              >
                <img
                  src={p.processedCanvas.toDataURL("image/jpeg", 0.5)}
                  alt={`Thumb ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: PERSPECTIVE CROP & MAGNIFIER LOUPE MODAL */}
      {cropModalOpen && pages[activePageIndex] && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Crop className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {t("docScanner.cropAlign")} - {t("docScanner.page")} {activePageIndex + 1}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {t("docScanner.magnifierHelp")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCropModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Workspace Canvas */}
            <div className="relative flex-1 bg-slate-950 p-4 flex items-center justify-center overflow-hidden min-h-[350px]">
              <canvas
                ref={cropCanvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="max-h-[60vh] max-w-full object-contain cursor-crosshair touch-none rounded-xl border border-slate-800"
              />

              {/* MAGNIFIER LOUPE OVERLAY */}
              {draggingPointIdx !== null && loupePos && cropCanvasRef.current && (
                <div
                  className="fixed pointer-events-none z-50 w-32 h-32 rounded-full border-2 border-emerald-400 shadow-2xl overflow-hidden bg-black"
                  style={{
                    left: `${loupePos.x - 64}px`,
                    top: `${loupePos.y - 140}px`,
                  }}
                >
                  <div
                    className="absolute"
                    style={{
                      width: `${cropCanvasRef.current.width}px`,
                      height: `${cropCanvasRef.current.height}px`,
                      transformOrigin: `${tempPoints[draggingPointIdx].x}px ${tempPoints[draggingPointIdx].y}px`,
                      transform: `translate(${64 - tempPoints[draggingPointIdx].x}px, ${64 - tempPoints[draggingPointIdx].y}px) scale(2.8)`,
                    }}
                  >
                    <img
                      src={pages[activePageIndex].originalCanvas.toDataURL()}
                      alt="Loupe Zoom"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Precision Crosshair Lines */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-full h-[1px] bg-emerald-400/80" />
                    <div className="h-full w-[1px] bg-emerald-400/80 absolute" />
                    <div className="w-3 h-3 rounded-full border border-emerald-300 absolute" />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 border-t border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  const w = pages[activePageIndex].originalCanvas.width;
                  const h = pages[activePageIndex].originalCanvas.height;
                  setTempPoints([
                    { x: 0, y: 0 },
                    { x: w, y: 0 },
                    { x: w, y: h },
                    { x: 0, y: h },
                  ]);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Căn hết viền ảnh</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCropModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={applyCropWarp}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>{t("docScanner.applyCrop")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CAMSCANNER IMAGE FILTERS MODAL */}
      {filterModalOpen && pages[activePageIndex] && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {t("docScanner.filters")} - {t("docScanner.page")} {activePageIndex + 1}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Bộ lọc tăng độ tương phản CamScanner giúp loại bỏ bóng tối và làm rõ văn bản
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFilterModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950/50">
              {/* Canvas Preview */}
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-950 border border-slate-800 min-h-[260px]">
                <canvas
                  ref={filterPreviewCanvasRef}
                  className="max-h-[300px] max-w-full object-contain rounded-lg border border-slate-800 shadow-md"
                />
              </div>

              {/* Filter Controls Panel */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-2 block">
                    {t("docScanner.filters")}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTempFilters(f => ({ ...f, filterType: "original" }))}
                      className={`p-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        tempFilters.filterType === "original"
                          ? "bg-indigo-600 text-white border-indigo-500"
                          : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
                      }`}
                    >
                      {t("docScanner.original")}
                    </button>

                    <button
                      type="button"
                      onClick={() => setTempFilters(f => ({ ...f, filterType: "magic_color" }))}
                      className={`p-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        tempFilters.filterType === "magic_color"
                          ? "bg-indigo-600 text-white border-indigo-500"
                          : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
                      }`}
                    >
                      CamScanner B&W
                    </button>

                    <button
                      type="button"
                      onClick={() => setTempFilters(f => ({ ...f, filterType: "grayscale" }))}
                      className={`p-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        tempFilters.filterType === "grayscale"
                          ? "bg-indigo-600 text-white border-indigo-500"
                          : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
                      }`}
                    >
                      {t("docScanner.grayscale")}
                    </button>

                    <button
                      type="button"
                      onClick={() => setTempFilters(f => ({ ...f, filterType: "threshold" }))}
                      className={`p-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        tempFilters.filterType === "threshold"
                          ? "bg-indigo-600 text-white border-indigo-500"
                          : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
                      }`}
                    >
                      Stark Threshold
                    </button>
                  </div>
                </div>

                {/* Threshold Slider */}
                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span>{t("docScanner.threshold")}</span>
                    <span className="font-mono text-indigo-400 font-bold">{tempFilters.threshold}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={tempFilters.threshold}
                    onChange={(e) => setTempFilters(f => ({ ...f, threshold: Number(e.target.value) }))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>

                {/* Brightness Slider */}
                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span>{t("docScanner.brightness")}</span>
                    <span className="font-mono text-indigo-400 font-bold">{tempFilters.brightness}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={tempFilters.brightness}
                    onChange={(e) => setTempFilters(f => ({ ...f, brightness: Number(e.target.value) }))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>

                {/* Contrast Slider */}
                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span>{t("docScanner.contrast")}</span>
                    <span className="font-mono text-indigo-400 font-bold">{tempFilters.contrast}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={tempFilters.contrast}
                    onChange={(e) => setTempFilters(f => ({ ...f, contrast: Number(e.target.value) }))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setTempFilters({ ...DEFAULT_FILTERS })}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>{t("docScanner.resetFilters")}</span>
                </button>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 border-t border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => applyFilters(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>{t("docScanner.applyAll")}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilterModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={() => applyFilters(false)}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>{t("docScanner.saveThis")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PDF PRINT PREVIEW & CONFIRMATION MODAL */}
      {previewPdfModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <FileDown className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {t("docScanner.previewPdfTitle")}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {t("docScanner.previewPdfDesc").replace("{count}", String(pages.length))}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPdfModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Controls Bar */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* File Name */}
              <div>
                <label className="font-semibold text-slate-300 mb-1 block">
                  {t("docScanner.filename")}
                </label>
                <input
                  type="text"
                  value={pdfFileName}
                  onChange={(e) => setPdfFileName(e.target.value)}
                  placeholder="Scanned_Document"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Orientation Option */}
              <div>
                <label className="font-semibold text-slate-300 mb-1 block">
                  {t("docScanner.orientation")}
                </label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPdfOrientation("portrait")}
                    className={`flex-1 py-2 px-2.5 rounded-xl font-semibold border transition-all cursor-pointer ${
                      pdfOrientation === "portrait"
                        ? "bg-emerald-600 text-white border-emerald-500 shadow-xs"
                        : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
                    }`}
                  >
                    {t("docScanner.portrait")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPdfOrientation("landscape")}
                    className={`flex-1 py-2 px-2.5 rounded-xl font-semibold border transition-all cursor-pointer ${
                      pdfOrientation === "landscape"
                        ? "bg-emerald-600 text-white border-emerald-500 shadow-xs"
                        : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
                    }`}
                  >
                    {t("docScanner.landscape")}
                  </button>
                </div>
              </div>

              {/* Page Numbering Option */}
              <div>
                <label className="font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Hash className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{t("docScanner.enablePageNumbers")}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={enablePageNumbers}
                    onChange={(e) => setEnablePageNumbers(e.target.checked)}
                    className="accent-emerald-500 rounded cursor-pointer h-4 w-4"
                  />
                </label>

                {enablePageNumbers ? (
                  <>
                    <div className="flex items-center gap-1 mt-1">
                      <button
                        type="button"
                        onClick={() => setPageNumberPos("left")}
                        className={`flex-1 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                          pageNumberPos === "left"
                            ? "bg-emerald-600 text-white border-emerald-500"
                            : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
                        }`}
                      >
                        <AlignLeft className="h-3 w-3" />
                        <span>{t("docScanner.posLeft")}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPageNumberPos("center")}
                        className={`flex-1 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                          pageNumberPos === "center"
                            ? "bg-emerald-600 text-white border-emerald-500"
                            : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
                        }`}
                      >
                        <AlignCenter className="h-3 w-3" />
                        <span>{t("docScanner.posCenter")}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPageNumberPos("right")}
                        className={`flex-1 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                          pageNumberPos === "right"
                            ? "bg-emerald-600 text-white border-emerald-500"
                            : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
                        }`}
                      >
                        <AlignRight className="h-3 w-3" />
                        <span>{t("docScanner.posRight")}</span>
                      </button>
                    </div>

                    {/* Start Page & Start Value Settings */}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                          {t("docScanner.pageNumberStartPage")}
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={Math.max(1, pages.length)}
                          value={pageNumberStartPage}
                          onChange={(e) => setPageNumberStartPage(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                          {t("docScanner.pageNumberStartVal")}
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={pageNumberStartVal}
                          onChange={(e) => setPageNumberStartVal(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <span className="text-[11px] text-slate-500 italic block mt-2">
                    {t("docScanner.noPageNumbers")}
                  </span>
                )}
              </div>
            </div>

            {/* Scrollable PDF Pages Stream Preview - DYNAMIC ASPECT RATIO FOR PORTRAIT / LANDSCAPE */}
            <div className="p-6 bg-slate-950/80 overflow-y-auto space-y-8 flex flex-col items-center max-h-[52vh]">
              {pages.map((page, idx) => {
                const isLandscape = pdfOrientation === "landscape";
                
                return (
                  <div
                    key={page.id}
                    className={`bg-white shadow-2xl rounded-sm p-6 border border-slate-200 flex flex-col justify-between text-slate-800 transition-all duration-300 ${
                      isLandscape
                        ? "w-full max-w-2xl aspect-[297/210]"
                        : "w-full max-w-md aspect-[210/297]"
                    }`}
                  >
                    {/* Simulation Header */}
                    <div className="w-full flex items-center justify-between text-[11px] text-slate-400 font-mono border-b border-slate-100 pb-2">
                      <span>Simulated PDF Sheet ({isLandscape ? "A4 Landscape" : "A4 Portrait"})</span>
                      <span className="font-bold text-slate-600">{idx + 1} / {pages.length}</span>
                    </div>

                    {/* Image Content Container */}
                    <div className="flex-1 flex items-center justify-center py-2 overflow-hidden">
                      <img
                        src={page.processedCanvas.toDataURL("image/jpeg", 0.9)}
                        alt={`Preview Page ${idx + 1}`}
                        className="max-h-full max-w-full object-contain shadow-xs rounded"
                      />
                    </div>

                    {/* Simulated Page Numbering Line at Bottom Margin */}
                    {enablePageNumbers && (idx + 1 >= pageNumberStartPage) && (
                      <div className="w-full pt-2 border-t border-slate-100 flex items-center">
                        <div
                          className={`w-full text-xs font-mono text-slate-500 ${
                            pageNumberPos === "left"
                              ? "text-left pl-2"
                              : pageNumberPos === "right"
                              ? "text-right pr-2"
                              : "text-center"
                          }`}
                        >
                          {pageNumberFormat
                            .replace("{page}", String(pageNumberStartVal + (idx - (pageNumberStartPage - 1))))
                            .replace("{total}", String(pages.length - pageNumberStartPage + pageNumberStartVal))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPreviewPdfModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                {t("common.close")}
              </button>

              <button
                type="button"
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {isExportingPdf ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>{t("docScanner.processing")}</span>
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4" />
                    <span>{t("docScanner.downloadPdf")}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
