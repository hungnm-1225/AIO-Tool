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
  MoveLeft, 
  MoveRight, 
  RotateCcw, 
  RotateCw,
  Check, 
  X, 
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
  ScanLine,
  GripVertical,
  BookOpen,
  BookMarked,
  MoveUp,
  MoveDown,
  Sun,
  Moon
} from "lucide-react";
import { toast } from "react-toastify";

export type PaperSize = "a4" | "a3" | "a5" | "letter" | "legal";

export const PAPER_SIZES_CONFIG: Record<PaperSize, { name: string; widthMm: number; heightMm: number }> = {
  a4: { name: "A4 (210 × 297 mm)", widthMm: 210, heightMm: 297 },
  a3: { name: "A3 (297 × 420 mm)", widthMm: 297, heightMm: 420 },
  a5: { name: "A5 (148 × 210 mm)", widthMm: 148, heightMm: 210 },
  letter: { name: "Letter (215.9 × 279.4 mm)", widthMm: 215.9, heightMm: 279.4 },
  legal: { name: "Legal (215.9 × 355.6 mm)", widthMm: 215.9, heightMm: 355.6 },
};

export interface ScannedPage {
  id: string;
  originalImage: HTMLImageElement;
  originalCanvas: HTMLCanvasElement;
  
  // 4 corner points in originalCanvas coordinates: [TL, TR, BR, BL]
  cropPoints: [Point, Point, Point, Point];
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

  // View Layout Mode ("grid" | "column" | "book")
  const [viewLayout, setViewLayout] = useState<"grid" | "column" | "book">("grid");
  const [isPage1Cover, setIsPage1Cover] = useState<boolean>(true);
  const [bookTheme, setBookTheme] = useState<"light" | "sepia" | "dark">("light");

  // Modal States
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [previewPdfModalOpen, setPreviewPdfModalOpen] = useState(false);
  const [fullscreenModalOpen, setFullscreenModalOpen] = useState(false);
  const [fullscreenPageIndex, setFullscreenPageIndex] = useState(0);

  // PDF Export & Numbering Settings
  const [pdfOrientation, setPdfOrientation] = useState<"portrait" | "landscape" | "auto">("portrait");
  const [paperSize, setPaperSize] = useState<PaperSize>("a4");
  const [pdfMarginMm, setPdfMarginMm] = useState<number>(10);
  const [pdfFileName, setPdfFileName] = useState("Scanned_Document");
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Auto Page Numbering Settings
  const [enablePageNumbers, setEnablePageNumbers] = useState(true);
  const [pageNumberPos, setPageNumberPos] = useState<"left" | "center" | "right">("center");
  const [pageNumberPlacement, setPageNumberPlacement] = useState<"footer_margin" | "burn_in">("footer_margin");
  const [pageNumberFormat, setPageNumberFormat] = useState(
    lang === "vi" ? "Trang {page} / {total}" : "Page {page} of {total}"
  );
  const [pageNumberStartPage, setPageNumberStartPage] = useState<number>(1);
  const [pageNumberStartVal, setPageNumberStartVal] = useState<number>(1);

  // Drag & Drop Reordering state
  const [draggedPageIndex, setDraggedPageIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<"before" | "after" | null>(null);

  // Update default format if lang changes
  useEffect(() => {
    setPageNumberFormat(
      lang === "vi" ? "Trang {page} / {total}" : "Page {page} of {total}"
    );
  }, [lang]);

  // Crop Dragging & Loupe Magnifier State (60fps SVG Overlay)
  const cropContainerRef = useRef<HTMLDivElement | null>(null);
  const [cropModalImgUrl, setCropModalImgUrl] = useState<string>("");
  const [isApplyingCrop, setIsApplyingCrop] = useState<boolean>(false);
  const [tempPoints, setTempPoints] = useState<[Point, Point, Point, Point]>([
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ]);
  const tempPointsRef = useRef<[Point, Point, Point, Point]>(tempPoints);
  tempPointsRef.current = tempPoints;

  const [draggingPointIdx, setDraggingPointIdx] = useState<number | null>(null);
  const draggingPointIdxRef = useRef<number | null>(null);
  draggingPointIdxRef.current = draggingPointIdx;

  const [loupePos, setLoupePos] = useState<{ x: number; y: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);

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

  // Quick Move Page Up / Down
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

  // Move page directly to target index
  const movePageToPosition = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pages.length || fromIndex === toIndex) return;
    const updated = [...pages];
    const [movedItem] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, movedItem);
    setPages(updated);
    toast.success(
      lang === "vi"
        ? `Đã chuyển trang sang vị trí ${toIndex + 1}`
        : `Moved page to position ${toIndex + 1}`
    );
  };

  // Drag and Drop Reorder Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedPageIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedPageIndex === null || draggedPageIndex === index) {
      setDropTargetIndex(null);
      setDropPosition(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    let isBefore = false;
    if (viewLayout === "grid") {
      const midX = rect.left + rect.width / 2;
      isBefore = e.clientX < midX;
    } else {
      const midY = rect.top + rect.height / 2;
      isBefore = e.clientY < midY;
    }

    setDropTargetIndex(index);
    setDropPosition(isBefore ? "before" : "after");
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedPageIndex === null || draggedPageIndex === targetIndex) {
      setDraggedPageIndex(null);
      setDropTargetIndex(null);
      setDropPosition(null);
      return;
    }

    let insertAt = targetIndex;
    if (dropPosition === "after") {
      insertAt = targetIndex + 1;
    }
    if (draggedPageIndex < insertAt) {
      insertAt -= 1;
    }

    const updated = [...pages];
    const [movedItem] = updated.splice(draggedPageIndex, 1);
    updated.splice(insertAt, 0, movedItem);

    setPages(updated);
    setDraggedPageIndex(null);
    setDropTargetIndex(null);
    setDropPosition(null);
    toast.success(lang === "vi" ? "Đã thay đổi thứ tự trang" : "Reordered pages");
  };

  const handleDragEnd = () => {
    setDraggedPageIndex(null);
    setDropTargetIndex(null);
    setDropPosition(null);
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
      // Cache data URL once on modal open to prevent expensive toDataURL re-encoding on every mouse move
      setCropModalImgUrl(page.originalCanvas.toDataURL("image/jpeg", 0.9));
      setCropModalOpen(true);
    }
  };

  // APPLY PERSPECTIVE CROP (EXECUTED ONLY UPON CONFIRMATION)
  const applyCropWarp = () => {
    const page = pages[activePageIndex];
    if (!page) return;

    setIsApplyingCrop(true);
    setTimeout(() => {
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
      } finally {
        setIsApplyingCrop(false);
      }
    }, 40);
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

  // SMOOTH 60FPS POINTER HANDLERS FOR CROP HANDLES
  const handlePointerDown = (e: React.PointerEvent<SVGElement>, pointIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingPointIdx(pointIdx);
    draggingPointIdxRef.current = pointIdx;
    setLoupePos({ x: e.clientX, y: e.clientY });
    try {
      const target = e.currentTarget as Element;
      if (target && target.setPointerCapture) {
        target.setPointerCapture(e.pointerId);
      }
    } catch (_err) {
      // Safe catch
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGElement>) => {
    if (draggingPointIdxRef.current === null) return;
    const activePage = pages[activePageIndex];
    if (!activePage) return;

    // Use actual SVG element bounding rect for accurate 1:1 screen mapping
    const target = e.currentTarget as Element;
    const svgTarget = target as unknown as SVGElement;
    const svgElement = svgTarget.ownerSVGElement || (target.tagName.toLowerCase() === "svg" ? target : null);
    const rect = svgElement ? svgElement.getBoundingClientRect() : cropContainerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;

    const origW = activePage.originalCanvas.width;
    const origH = activePage.originalCanvas.height;

    // Map screen pixel offset to original image canvas pixel coordinates
    const currentX = Math.min(Math.max(0, ((e.clientX - rect.left) / rect.width) * origW), origW);
    const currentY = Math.min(Math.max(0, ((e.clientY - rect.top) / rect.height) * origH), origH);

    const clientX = e.clientX;
    const clientY = e.clientY;

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      const activeIdx = draggingPointIdxRef.current;
      if (activeIdx !== null) {
        const roundedX = Math.round(currentX);
        const roundedY = Math.round(currentY);
        setTempPoints((prev) => {
          if (prev[activeIdx].x === roundedX && prev[activeIdx].y === roundedY) return prev;
          const next = [...prev] as [Point, Point, Point, Point];
          next[activeIdx] = { x: roundedX, y: roundedY };
          return next;
        });
        setLoupePos({ x: clientX, y: clientY });
      }
    });
  };

  const handlePointerUp = (e: React.PointerEvent<SVGElement>) => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (draggingPointIdxRef.current !== null) {
      try {
        const target = e.currentTarget as Element;
        if (target && target.releasePointerCapture) {
          target.releasePointerCapture(e.pointerId);
        }
      } catch (_err) {
        // Safe catch
      }
      setDraggingPointIdx(null);
      draggingPointIdxRef.current = null;
      setLoupePos(null);
    }
  };

  // EXPORT PDF GENERATION USING JSPDF WITH ACCURATE MARGINS & BURN-IN PLACEMENT
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
          format: paperSize,
        });

        pages.forEach((page, idx) => {
          if (idx > 0) {
            doc.addPage(paperSize, pdfOrientation === "landscape" ? "l" : "p");
          }

          const sheetW = doc.internal.pageSize.getWidth();
          const sheetH = doc.internal.pageSize.getHeight();

          const canvas = page.processedCanvas;
          const imgDataUrl = canvas.toDataURL("image/jpeg", 0.92);

          const imgWidth = canvas.width;
          const imgHeight = canvas.height;
          const ratio = imgWidth / imgHeight;

          const pageNum1Based = idx + 1;
          const shouldRenderPageNum = enablePageNumbers && (pageNum1Based >= pageNumberStartPage);
          
          const isFooterMargin = shouldRenderPageNum && pageNumberPlacement === "footer_margin";
          const margin = Math.max(0, pdfMarginMm);
          const footerSpace = isFooterMargin ? 10 : 0;

          const availW = Math.max(10, sheetW - margin * 2);
          const availH = Math.max(10, sheetH - margin * 2 - footerSpace);

          let renderW = availW;
          let renderH = availW / ratio;

          if (renderH > availH) {
            renderH = availH;
            renderW = availH * ratio;
          }

          const posX = margin + (availW - renderW) / 2;
          const posY = margin + (availH - renderH) / 2;

          doc.addImage(imgDataUrl, "JPEG", posX, posY, renderW, renderH);

          // Render Auto Page Numbering
          if (shouldRenderPageNum) {
            const computedPageNum = pageNumberStartVal + (idx - (pageNumberStartPage - 1));
            const computedTotal = pages.length - pageNumberStartPage + pageNumberStartVal;

            const textStr = pageNumberFormat
              .replace("{page}", String(computedPageNum))
              .replace("{total}", String(computedTotal));

            doc.setFontSize(10);

            let textX = sheetW / 2;
            let alignOpt: "left" | "center" | "right" = "center";

            if (pageNumberPos === "left") {
              textX = margin + 5;
              alignOpt = "left";
            } else if (pageNumberPos === "right") {
              textX = sheetW - margin - 5;
              alignOpt = "right";
            } else {
              textX = sheetW / 2;
              alignOpt = "center";
            }

            if (pageNumberPlacement === "footer_margin") {
              // Printed in white bottom margin
              doc.setTextColor(100, 116, 139);
              doc.text(textStr, textX, sheetH - Math.max(4, margin / 2), { align: alignOpt });
            } else {
              // Burned-in text on image bottom with dark background pill for legibility
              const textY = posY + renderH - 4;
              const textWidth = doc.getTextWidth(textStr);
              let boxX = textX - textWidth / 2 - 2;
              if (alignOpt === "left") boxX = textX - 2;
              if (alignOpt === "right") boxX = textX - textWidth - 2;

              doc.setFillColor(15, 23, 42);
              doc.roundedRect(boxX, textY - 3.5, textWidth + 4, 5, 1, 1, "F");
              doc.setTextColor(255, 255, 255);
              doc.text(textStr, textX, textY, { align: alignOpt });
            }
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

  // Helper component to render insertion indicator bar between cards
  const renderDropIndicator = (type: "grid" | "column") => (
    <div
      className={`relative z-30 flex items-center justify-center transition-all ${
        type === "grid"
          ? "col-span-full my-1 h-3"
          : "w-full my-2 h-4"
      }`}
    >
      <div className="w-full h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500 rounded-full shadow-lg animate-pulse" />
      <span className="absolute px-3 py-0.5 bg-rose-600 text-white font-mono text-[10px] font-bold rounded-full shadow-md tracking-wider uppercase border border-white/20">
        {lang === "vi" ? "Vị trí chen giữa" : "Drop Here"}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="h-9 w-9 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-600/20">
              <ScanLine className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{t("docScanner.title")}</span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t("docScanner.subtitle")}
          </p>
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
                • {lang === "vi" ? "Kéo thả toàn bộ thẻ để sắp xếp thứ tự trang" : "Drag entire card to reorder pages"}
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

              <button
                type="button"
                onClick={() => setViewLayout("book")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewLayout === "book"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
                title={lang === "vi" ? "Chế độ xem dạng sách (2 trang)" : "Book View (2 pages)"}
              >
                <BookOpen className="h-4 w-4" />
                <span>{lang === "vi" ? "Dạng sách" : "Book View"}</span>
              </button>
            </div>
          </div>

          {/* GRID LAYOUT MODE - ENTIRE CARD DRAGGABLE WITH DROP INDICATOR */}
          {viewLayout === "grid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {pages.map((page, index) => {
                const previewUrl = page.processedCanvas.toDataURL("image/jpeg", 0.85);
                const isDraggingThis = draggedPageIndex === index;
                const isDropTarget = dropTargetIndex === index;

                return (
                  <React.Fragment key={page.id}>
                    {/* Insertion Bar Before */}
                    {isDropTarget && dropPosition === "before" && renderDropIndicator("grid")}

                    <div
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`group relative rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-grab active:cursor-grabbing ${
                        isDraggingThis
                          ? "opacity-40 scale-95 border-dashed border-amber-500 bg-amber-50/20 dark:bg-amber-950/20 shadow-none"
                          : "border-slate-200 dark:border-white/10 bg-white/70 dark:bg-[#111827]/80 backdrop-blur-md shadow-xs hover:shadow-lg hover:border-emerald-400/50"
                      }`}
                    >
                      {/* Top Header Badge & Order with Grip Handle */}
                      <div className="p-2.5 bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs select-none">
                        <div className="flex items-center gap-1.5">
                          <GripVertical className="h-4 w-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                            {t("docScanner.page")} {index + 1}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {page.isCropped && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              {lang === "vi" ? "Đã cắt" : "Cropped"}
                            </span>
                          )}
                          {page.filters.filterType !== "original" && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                              {page.filters.filterType === "magic_color" ? "Magic Color" : "Filter"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Image Preview Canvas Thumbnail */}
                      <div
                        onClick={() => openFullscreenViewer(index)}
                        className="relative aspect-[3/4] bg-slate-950 flex items-center justify-center p-2 overflow-hidden cursor-pointer group/img select-none"
                        title={t("docScanner.clickToViewFull")}
                      >
                        <img
                          src={previewUrl}
                          alt={`Page ${index + 1}`}
                          className="max-h-full max-w-full object-contain rounded shadow-sm group-hover/img:scale-102 transition-transform pointer-events-none"
                        />

                        {/* Fullscreen Overlay Hint */}
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <div className="p-2.5 rounded-full bg-slate-900/80 backdrop-blur-xs border border-white/20 flex items-center gap-2 text-xs font-semibold">
                            <Maximize2 className="h-4 w-4 text-emerald-400" />
                            <span>Fullscreen</span>
                          </div>
                        </div>

                        {/* Quick Up/Down Move Buttons */}
                        <div
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
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

                      {/* Card Bottom Actions Bar */}
                      <div 
                        onMouseDown={(e) => e.stopPropagation()}
                        className="p-2.5 bg-white dark:bg-[#111827] border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5"
                      >
                        <button
                          type="button"
                          onClick={() => openCropModal(index)}
                          className="flex-1 py-1.5 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer border border-transparent hover:border-emerald-300 dark:hover:border-emerald-800"
                          title={t("docScanner.cropAlign")}
                        >
                          <Crop className="h-3.5 w-3.5" />
                          <span>{t("docScanner.cropTitle")}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openFilterModal(index)}
                          className="flex-1 py-1.5 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer border border-transparent hover:border-indigo-300 dark:hover:border-indigo-800"
                          title={t("docScanner.filters")}
                        >
                          <Sliders className="h-3.5 w-3.5" />
                          <span>{t("docScanner.filters")}</span>
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

                    {/* Insertion Bar After */}
                    {isDropTarget && dropPosition === "after" && renderDropIndicator("grid")}
                  </React.Fragment>
                );
              })}
            </div>
          )}

          {/* VERTICAL STREAM LAYOUT MODE - EXPLICIT POSITION CONTROLS (NO DRAG-AND-DROP) */}
          {viewLayout === "column" && (
            <div className="space-y-6 max-w-3xl mx-auto">
              {pages.map((page, index) => {
                const previewUrl = page.processedCanvas.toDataURL("image/jpeg", 0.9);

                return (
                  <div
                    key={page.id}
                    className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#111827]/90 hover:border-emerald-400/50 backdrop-blur-md shadow-md overflow-hidden flex flex-col items-center"
                  >
                    {/* Header bar with explicit page order controls */}
                    <div className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 select-none">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-sm text-slate-800 dark:text-slate-100 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 px-3 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800">
                          {t("docScanner.page")} {index + 1} / {pages.length}
                        </span>

                        {/* Explicit Up/Down Move Buttons */}
                        <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
                          <button
                            type="button"
                            onClick={() => movePage(index, "up")}
                            disabled={index === 0}
                            className="p-1 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                            title={lang === "vi" ? "Lên trên" : "Move Up"}
                          >
                            <MoveUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => movePage(index, "down")}
                            disabled={index === pages.length - 1}
                            className="p-1 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                            title={lang === "vi" ? "Xuống dưới" : "Move Down"}
                          >
                            <MoveDown className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Jump to Position Dropdown */}
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
                            {lang === "vi" ? "Đến vị trí:" : "Pos:"}
                          </span>
                          <select
                            value={index}
                            onChange={(e) => movePageToPosition(index, Number(e.target.value))}
                            className="px-2 py-1 rounded-lg bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-mono font-bold border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
                          >
                            {pages.map((_, pIdx) => (
                              <option key={pIdx} value={pIdx}>
                                {lang === "vi" ? `Trang ${pIdx + 1}` : `Page ${pIdx + 1}`}
                              </option>
                            ))}
                          </select>
                        </div>

                        {page.isCropped && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            {lang === "vi" ? "Đã cắt góc" : "Cropped"}
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
                      className="w-full p-6 bg-slate-950 flex items-center justify-center cursor-pointer group/colimg select-none"
                    >
                      <img
                        src={previewUrl}
                        alt={`Page ${index + 1}`}
                        className="max-h-[650px] w-auto object-contain rounded-lg shadow-xl group-hover/colimg:scale-101 transition-transform pointer-events-none"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* BOOK VIEW MODE - TWO PAGE SPREAD */}
          {viewLayout === "book" && (
            <div className="space-y-6 max-w-5xl mx-auto">
              {/* Option Bar for Book Mode */}
              <div className="p-4 rounded-2xl bg-white/80 dark:bg-[#111827]/80 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <BookOpen className="h-4.5 w-4.5 text-emerald-500" />
                  <span>{lang === "vi" ? "Chế Độ Xem Giống Sách (2 Trang Song Song)" : "Book View (Two-Page Spread)"}</span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Theme Selector for Book View */}
                  <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                    <span className="px-2 text-[11px] font-semibold text-slate-500 hidden sm:inline">
                      {lang === "vi" ? "Nền sách:" : "Book theme:"}
                    </span>

                    <button
                      type="button"
                      onClick={() => setBookTheme("light")}
                      className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        bookTheme === "light"
                          ? "bg-white text-slate-800 shadow-xs border border-slate-200"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                      title={lang === "vi" ? "Nền Sáng (Giấy Trắng)" : "Light Paper Theme"}
                    >
                      <Sun className="h-3.5 w-3.5 text-amber-500" />
                      <span>{lang === "vi" ? "Sáng" : "Light"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBookTheme("sepia")}
                      className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        bookTheme === "sepia"
                          ? "bg-[#f4ecd8] text-[#5c4a30] shadow-xs border border-[#e2d5ba]"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                      title={lang === "vi" ? "Giấy Ngà (Cổ Điển)" : "Warm Sepia Paper"}
                    >
                      <BookMarked className="h-3.5 w-3.5 text-amber-700" />
                      <span>{lang === "vi" ? "Giấy Ngà" : "Sepia"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBookTheme("dark")}
                      className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        bookTheme === "dark"
                          ? "bg-slate-800 text-white shadow-xs border border-slate-700"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                      title={lang === "vi" ? "Nền Tối" : "Dark Theme"}
                    >
                      <Moon className="h-3.5 w-3.5 text-indigo-400" />
                      <span>{lang === "vi" ? "Tối" : "Dark"}</span>
                    </button>
                  </div>

                  {/* Cover Page Checkbox */}
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={isPage1Cover}
                      onChange={(e) => setIsPage1Cover(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{lang === "vi" ? "Trang 1 là Trang Bìa" : "Page 1 is Cover Page"}</span>
                  </label>
                </div>
              </div>

              {/* Book Spreads */}
              {(() => {
                const spreads: {
                  spreadNum: number;
                  left?: { page: ScannedPage; idx: number };
                  right?: { page: ScannedPage; idx: number };
                }[] = [];

                let pIdx = 0;
                let sNum = 1;

                if (isPage1Cover && pages.length > 0) {
                  spreads.push({
                    spreadNum: sNum++,
                    right: { page: pages[0], idx: 0 },
                  });
                  pIdx = 1;
                }

                while (pIdx < pages.length) {
                  const leftPage = pages[pIdx];
                  const leftIdx = pIdx;
                  const rightPage = pages[pIdx + 1];
                  const rightIdx = pages[pIdx + 1] ? pIdx + 1 : undefined;

                  spreads.push({
                    spreadNum: sNum++,
                    left: { page: leftPage, idx: leftIdx },
                    right: rightPage ? { page: rightPage, idx: rightIdx } : undefined,
                  });

                  pIdx += 2;
                }

                // Theme-dependent styling classes
                const spreadOuterClass = 
                  bookTheme === "light"
                    ? "grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-200/80 p-3 md:p-4 rounded-2xl border border-slate-300/80 relative shadow-inner"
                    : bookTheme === "sepia"
                    ? "grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#f4ecd8] p-3 md:p-4 rounded-2xl border border-[#e2d5ba] relative shadow-inner"
                    : "grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950 p-3 md:p-4 rounded-2xl border border-slate-800 relative shadow-inner";

                const spineClass =
                  bookTheme === "light"
                    ? "hidden md:block absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 bg-gradient-to-b from-slate-300 via-slate-400 to-slate-300 z-10 shadow-md pointer-events-none"
                    : bookTheme === "sepia"
                    ? "hidden md:block absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 bg-gradient-to-b from-[#d4c3a3] via-[#bfae8e] to-[#d4c3a3] z-10 shadow-md pointer-events-none"
                    : "hidden md:block absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-700 z-10 shadow-md pointer-events-none";

                const pageCardClass =
                  bookTheme === "light"
                    ? "flex flex-col bg-white rounded-xl border border-slate-300/80 overflow-hidden shadow-sm"
                    : bookTheme === "sepia"
                    ? "flex flex-col bg-[#fcf8ed] rounded-xl border border-[#e8ddc5] overflow-hidden shadow-sm"
                    : "flex flex-col bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-md";

                const pageHeaderClass =
                  bookTheme === "light"
                    ? "p-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs text-slate-800"
                    : bookTheme === "sepia"
                    ? "p-2.5 bg-[#f0e6cf] border-b border-[#e2d5ba] flex items-center justify-between text-xs text-[#5c4a30]"
                    : "p-2.5 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between text-xs text-white";

                const pageNavBtnClass =
                  bookTheme === "light"
                    ? "p-1 rounded bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                    : bookTheme === "sepia"
                    ? "p-1 rounded bg-[#fcf8ed] hover:bg-[#e8ddc5] text-[#5c4a30] border border-[#e2d5ba] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                    : "p-1 rounded bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-2xs";

                const pageImageClass =
                  bookTheme === "light"
                    ? "relative aspect-[3/4] bg-slate-100/90 flex items-center justify-center p-2 overflow-hidden cursor-pointer group/bimg"
                    : bookTheme === "sepia"
                    ? "relative aspect-[3/4] bg-[#f7f1e1] flex items-center justify-center p-2 overflow-hidden cursor-pointer group/bimg"
                    : "relative aspect-[3/4] bg-slate-950 flex items-center justify-center p-2 overflow-hidden cursor-pointer group/bimg";

                const pageToolbarClass =
                  bookTheme === "light"
                    ? "p-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-1"
                    : bookTheme === "sepia"
                    ? "p-2 bg-[#f0e6cf] border-t border-[#e2d5ba] flex items-center justify-between gap-1"
                    : "p-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-1";

                const cropBtnClass =
                  bookTheme === "light"
                    ? "flex-1 py-1 px-2 rounded bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-600 border border-slate-200 text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                    : bookTheme === "sepia"
                    ? "flex-1 py-1 px-2 rounded bg-[#fcf8ed] hover:bg-[#e8ddc5] text-[#5c4a30] hover:text-amber-800 border border-[#e2d5ba] text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                    : "flex-1 py-1 px-2 rounded bg-slate-800 hover:bg-emerald-950 text-slate-200 hover:text-emerald-400 border border-slate-700 text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer shadow-2xs";

                const filterBtnClass =
                  bookTheme === "light"
                    ? "flex-1 py-1 px-2 rounded bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-200 text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                    : bookTheme === "sepia"
                    ? "flex-1 py-1 px-2 rounded bg-[#fcf8ed] hover:bg-[#e8ddc5] text-[#5c4a30] hover:text-indigo-800 border border-[#e2d5ba] text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                    : "flex-1 py-1 px-2 rounded bg-slate-800 hover:bg-indigo-950 text-slate-200 hover:text-indigo-400 border border-slate-700 text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer shadow-2xs";

                const deleteBtnClass =
                  bookTheme === "light"
                    ? "p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                    : bookTheme === "sepia"
                    ? "p-1 rounded text-[#8c7653] hover:text-rose-600 hover:bg-[#e8ddc5] cursor-pointer"
                    : "p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-950/60 cursor-pointer";

                const emptySlotClass =
                  bookTheme === "light"
                    ? "hidden md:flex aspect-[3/4] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-100/70 text-slate-500 text-xs font-mono"
                    : bookTheme === "sepia"
                    ? "hidden md:flex aspect-[3/4] items-center justify-center rounded-xl border border-dashed border-[#d9cca8] bg-[#f0e6cf]/60 text-[#8c7653] text-xs font-mono"
                    : "hidden md:flex aspect-[3/4] items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/40 text-slate-500 text-xs font-mono";

                return (
                  <div className="space-y-6">
                    {spreads.map((spread) => (
                      <div
                        key={`spread-${spread.spreadNum}`}
                        className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-[#111827]/90 shadow-xl p-4 md:p-6 backdrop-blur-md space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5 text-xs">
                          <span className="font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            {lang === "vi" ? `Tờ Sách #${spread.spreadNum}` : `Spread #${spread.spreadNum}`}
                          </span>
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                            {spread.left && spread.right
                              ? `${t("docScanner.page")} ${spread.left.idx + 1} & ${spread.right.idx + 1}`
                              : spread.right
                              ? `${t("docScanner.page")} ${spread.right.idx + 1} (${lang === "vi" ? "Trang Bìa" : "Cover"})`
                              : `${t("docScanner.page")} ${spread.left?.idx! + 1}`}
                          </span>
                        </div>

                        {/* Two Pages Side-by-Side Spread */}
                        <div className={spreadOuterClass}>
                          <div className={spineClass} />

                          {/* Left Page Slot */}
                          {spread.left ? (
                            <div className={pageCardClass}>
                              <div className={pageHeaderClass}>
                                <span className="font-mono font-bold bg-emerald-600 text-white px-2 py-0.5 rounded text-[11px]">
                                  {t("docScanner.page")} {spread.left.idx + 1}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => movePage(spread.left!.idx, "up")}
                                    disabled={spread.left.idx === 0}
                                    className={pageNavBtnClass}
                                  >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => movePage(spread.left!.idx, "down")}
                                    disabled={spread.left.idx === pages.length - 1}
                                    className={pageNavBtnClass}
                                  >
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                              <div
                                onClick={() => openFullscreenViewer(spread.left!.idx)}
                                className={pageImageClass}
                              >
                                <img
                                  src={spread.left.page.processedCanvas.toDataURL("image/jpeg", 0.85)}
                                  alt={`Page ${spread.left.idx + 1}`}
                                  className="max-h-full max-w-full object-contain rounded shadow-xs group-hover/bimg:scale-102 transition-transform"
                                />
                                <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover/bimg:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Maximize2 className="h-5 w-5 text-emerald-400" />
                                </div>
                              </div>
                              <div className={pageToolbarClass}>
                                <button
                                  type="button"
                                  onClick={() => openCropModal(spread.left!.idx)}
                                  className={cropBtnClass}
                                >
                                  <Crop className="h-3 w-3" />
                                  <span>{t("docScanner.cropTitle")}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openFilterModal(spread.left!.idx)}
                                  className={filterBtnClass}
                                >
                                  <Sliders className="h-3 w-3" />
                                  <span>{t("docScanner.filters")}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deletePage(spread.left!.idx)}
                                  className={deleteBtnClass}
                                  title={t("docScanner.deletePage")}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className={emptySlotClass}>
                              <span>{lang === "vi" ? "Mặt Bìa Trái (Trống)" : "Inside Cover"}</span>
                            </div>
                          )}

                          {/* Right Page Slot */}
                          {spread.right ? (
                            <div className={pageCardClass}>
                              <div className={pageHeaderClass}>
                                <span className="font-mono font-bold bg-emerald-600 text-white px-2 py-0.5 rounded text-[11px]">
                                  {t("docScanner.page")} {spread.right.idx + 1}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => movePage(spread.right!.idx, "up")}
                                    disabled={spread.right.idx === 0}
                                    className={pageNavBtnClass}
                                  >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => movePage(spread.right!.idx, "down")}
                                    disabled={spread.right.idx === pages.length - 1}
                                    className={pageNavBtnClass}
                                  >
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                              <div
                                onClick={() => openFullscreenViewer(spread.right!.idx)}
                                className={pageImageClass}
                              >
                                <img
                                  src={spread.right.page.processedCanvas.toDataURL("image/jpeg", 0.85)}
                                  alt={`Page ${spread.right.idx + 1}`}
                                  className="max-h-full max-w-full object-contain rounded shadow-xs group-hover/bimg:scale-102 transition-transform"
                                />
                                <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover/bimg:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Maximize2 className="h-5 w-5 text-emerald-400" />
                                </div>
                              </div>
                              <div className={pageToolbarClass}>
                                <button
                                  type="button"
                                  onClick={() => openCropModal(spread.right!.idx)}
                                  className={cropBtnClass}
                                >
                                  <Crop className="h-3 w-3" />
                                  <span>{t("docScanner.cropTitle")}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openFilterModal(spread.right!.idx)}
                                  className={filterBtnClass}
                                >
                                  <Sliders className="h-3 w-3" />
                                  <span>{t("docScanner.filters")}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deletePage(spread.right!.idx)}
                                  className={deleteBtnClass}
                                  title={t("docScanner.deletePage")}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className={emptySlotClass}>
                              <span>{lang === "vi" ? "Trang Phải (Trống)" : "Blank Page"}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* MODAL 0: FULLSCREEN IMAGE VIEWER MODAL */}
      {fullscreenModalOpen && pages[fullscreenPageIndex] && (
        <div className="fixed inset-0 z-50 bg-slate-100/95 dark:bg-slate-950/95 backdrop-blur-lg flex flex-col justify-between overflow-hidden text-slate-800 dark:text-slate-100">
          {/* Top Bar */}
          <div className="p-4 bg-white/90 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between z-10 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-sm text-white bg-emerald-600 px-3 py-1 rounded-xl shadow-xs">
                {t("docScanner.page")} {fullscreenPageIndex + 1} / {pages.length}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline-block">
                {t("docScanner.fullscreenViewer")}
              </span>
            </div>

            {/* Quick Action Toolbar in Fullscreen Mode */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openCropModal(fullscreenPageIndex)}
                className="px-3.5 py-2 rounded-xl bg-emerald-100 dark:bg-emerald-600/20 hover:bg-emerald-200 dark:hover:bg-emerald-600/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 border border-emerald-300 dark:border-emerald-500/30 transition-all cursor-pointer"
              >
                <Crop className="h-4 w-4" />
                <span>{t("docScanner.cropTitle")}</span>
              </button>

              <button
                type="button"
                onClick={() => openFilterModal(fullscreenPageIndex)}
                className="px-3.5 py-2 rounded-xl bg-indigo-100 dark:bg-indigo-600/20 hover:bg-indigo-200 dark:hover:bg-indigo-600/40 text-indigo-800 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1.5 border border-indigo-300 dark:border-indigo-500/30 transition-all cursor-pointer"
              >
                <Sliders className="h-4 w-4" />
                <span>{t("docScanner.filters")}</span>
              </button>

              <button
                type="button"
                onClick={() => rotatePage(fullscreenPageIndex, -90)}
                className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                title={t("docScanner.rotateLeft")}
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => rotatePage(fullscreenPageIndex, 90)}
                className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                title={t("docScanner.rotateRight")}
              >
                <RotateCw className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setFullscreenModalOpen(false)}
                className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                title={t("common.close")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Center Image Display */}
          <div className="relative flex-1 flex items-center justify-center p-4 overflow-hidden bg-slate-200/50 dark:bg-slate-950">
            <button
              type="button"
              onClick={() => setFullscreenPageIndex((prev) => Math.max(0, prev - 1))}
              disabled={fullscreenPageIndex === 0}
              className="absolute left-4 p-3 rounded-full bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed z-10 transition-all cursor-pointer shadow-xl"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <img
              src={pages[fullscreenPageIndex].processedCanvas.toDataURL("image/jpeg", 0.95)}
              alt={`Fullscreen Page ${fullscreenPageIndex + 1}`}
              className="max-h-[82vh] max-w-[90vw] object-contain rounded-lg shadow-2xl border border-slate-300 dark:border-slate-800"
            />

            <button
              type="button"
              onClick={() => setFullscreenPageIndex((prev) => Math.min(pages.length - 1, prev + 1))}
              disabled={fullscreenPageIndex === pages.length - 1}
              className="absolute right-4 p-3 rounded-full bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed z-10 transition-all cursor-pointer shadow-xl"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          {/* Bottom Thumbnails Strip */}
          <div className="p-3 bg-white/90 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2 overflow-x-auto">
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

      {/* MODAL 1: 60FPS SVG CROP & MAGNIFIER LOUPE MODAL */}
      {cropModalOpen && pages[activePageIndex] && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl text-slate-800 dark:text-slate-100">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/90">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <Crop className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {t("docScanner.cropAlign")} - {t("docScanner.page")} {activePageIndex + 1}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t("docScanner.magnifierHelp")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCropModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Workspace SVG Canvas Container */}
            <div 
              ref={cropContainerRef}
              className="relative flex-1 bg-slate-100 dark:bg-slate-950 p-4 flex items-center justify-center overflow-hidden min-h-[350px] select-none"
            >
              {(() => {
                const activePage = pages[activePageIndex];
                const origW = activePage.originalCanvas.width;
                const origH = activePage.originalCanvas.height;

                return (
                  <div className="relative max-h-[60vh] max-w-full flex items-center justify-center aspect-auto">
                    {/* Cached Static Original Image Background - Zero dataURL recalculations on mouse move */}
                    <img
                      src={cropModalImgUrl || activePage.originalCanvas.toDataURL()}
                      alt="Crop Original"
                      className="max-h-[60vh] max-w-full object-contain rounded-xl border border-slate-300 dark:border-slate-800 block pointer-events-none shadow-md"
                    />

                    {/* Lightweight SVG Vector Overlay for 60FPS Dragging */}
                    <svg
                      viewBox={`0 0 ${origW} ${origH}`}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      className="absolute inset-0 w-full h-full cursor-crosshair touch-none select-none"
                    >
                      {/* Dark Overlay Outside Quad */}
                      <path
                        d={`M 0 0 L ${origW} 0 L ${origW} ${origH} L 0 ${origH} Z M ${tempPoints[0].x} ${tempPoints[0].y} L ${tempPoints[1].x} ${tempPoints[1].y} L ${tempPoints[2].x} ${tempPoints[2].y} L ${tempPoints[3].x} ${tempPoints[3].y} Z`}
                        fill="rgba(15, 23, 42, 0.55)"
                        fillRule="evenodd"
                      />

                      {/* Quad Wireframe Box */}
                      <polygon
                        points={`${tempPoints[0].x},${tempPoints[0].y} ${tempPoints[1].x},${tempPoints[1].y} ${tempPoints[2].x},${tempPoints[2].y} ${tempPoints[3].x},${tempPoints[3].y}`}
                        fill="rgba(16, 185, 129, 0.08)"
                        stroke="#10b981"
                        strokeWidth={Math.max(4, origW / 250)}
                      />

                      {/* Guide Lines */}
                      <line x1={tempPoints[0].x} y1={tempPoints[0].y} x2={tempPoints[2].x} y2={tempPoints[2].y} stroke="#10b981" strokeWidth={Math.max(1, origW / 600)} strokeDasharray="8,8" opacity={0.4} />
                      <line x1={tempPoints[1].x} y1={tempPoints[1].y} x2={tempPoints[3].x} y2={tempPoints[3].y} stroke="#10b981" strokeWidth={Math.max(1, origW / 600)} strokeDasharray="8,8" opacity={0.4} />

                      {/* 4 Corner Handles */}
                      {tempPoints.map((pt, idx) => {
                        const isDragging = draggingPointIdx === idx;
                        const radius = Math.max(16, Math.round(origW / 80));

                        return (
                          <g key={idx}>
                            {/* Hit Target Expansion */}
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={radius * 2.2}
                              fill="transparent"
                              className="cursor-grab active:cursor-grabbing"
                              onPointerDown={(e) => handlePointerDown(e, idx)}
                            />

                            {/* Active Pulse Ring */}
                            {isDragging && (
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r={radius * 1.8}
                                fill="rgba(245, 158, 11, 0.25)"
                                stroke="#f59e0b"
                                strokeWidth={Math.max(2, radius / 5)}
                              />
                            )}

                            {/* Main Handle Circle */}
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={radius}
                              fill={isDragging ? "#f59e0b" : "#10b981"}
                              stroke="#ffffff"
                              strokeWidth={Math.max(3, radius / 3)}
                              className="cursor-grab active:cursor-grabbing transition-colors"
                              onPointerDown={(e) => handlePointerDown(e, idx)}
                            />

                            <text
                              x={pt.x}
                              y={pt.y}
                              dy="0.35em"
                              textAnchor="middle"
                              fill="#ffffff"
                              fontSize={radius * 0.9}
                              fontWeight="bold"
                              className="pointer-events-none select-none font-mono"
                            >
                              {idx + 1}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                );
              })()}

              {/* MAGNIFIER LOUPE OVERLAY */}
              {draggingPointIdx !== null && loupePos && cropContainerRef.current && (
                <div
                  className="fixed pointer-events-none z-50 w-36 h-36 rounded-full border-2 border-emerald-400 shadow-2xl overflow-hidden bg-slate-900"
                  style={{
                    left: `${loupePos.x - 72}px`,
                    top: `${loupePos.y - 150}px`,
                  }}
                >
                  <div
                    className="absolute"
                    style={{
                      width: `${pages[activePageIndex].originalCanvas.width}px`,
                      height: `${pages[activePageIndex].originalCanvas.height}px`,
                      transformOrigin: `${tempPoints[draggingPointIdx].x}px ${tempPoints[draggingPointIdx].y}px`,
                      transform: `translate(${72 - tempPoints[draggingPointIdx].x}px, ${72 - tempPoints[draggingPointIdx].y}px) scale(2.8)`,
                    }}
                  >
                    <img
                      src={cropModalImgUrl || pages[activePageIndex].originalCanvas.toDataURL()}
                      alt="Loupe Zoom"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Precision Crosshair Lines */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-full h-[1px] bg-emerald-400/80" />
                    <div className="h-full w-[1px] bg-emerald-400/80 absolute" />
                    <div className="w-3.5 h-3.5 rounded-full border border-emerald-300 absolute" />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
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
                className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{lang === "vi" ? "Căn hết viền ảnh" : "Reset Full Frame"}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCropModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={applyCropWarp}
                  disabled={isApplyingCrop}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isApplyingCrop ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>{lang === "vi" ? "Đang cắt & căn chỉnh..." : "Processing Crop..."}</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>{t("docScanner.applyCrop")}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CAMSCANNER IMAGE FILTERS MODAL */}
      {filterModalOpen && pages[activePageIndex] && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl text-slate-800 dark:text-slate-100">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/90">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {t("docScanner.filters")} - {t("docScanner.page")} {activePageIndex + 1}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {lang === "vi"
                      ? "Bộ lọc tăng độ tương phản CamScanner giúp loại bỏ bóng tối và làm rõ văn bản"
                      : "CamScanner contrast filters remove shadows and clarify text"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFilterModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-950/50">
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 min-h-[260px] shadow-sm">
                <canvas
                  ref={filterPreviewCanvasRef}
                  className="max-h-[300px] max-w-full object-contain rounded-lg border border-slate-300 dark:border-slate-800 shadow-md"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                    {t("docScanner.filters")}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTempFilters(f => ({ ...f, filterType: "original" }))}
                      className={`p-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        tempFilters.filterType === "original"
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-xs"
                          : "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800"
                      }`}
                    >
                      {t("docScanner.original")}
                    </button>

                    <button
                      type="button"
                      onClick={() => setTempFilters(f => ({ ...f, filterType: "magic_color" }))}
                      className={`p-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        tempFilters.filterType === "magic_color"
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-xs"
                          : "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800"
                      }`}
                    >
                      {lang === "vi" ? "Đen trắng CamScanner" : "CamScanner B&W"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setTempFilters(f => ({ ...f, filterType: "grayscale" }))}
                      className={`p-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        tempFilters.filterType === "grayscale"
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-xs"
                          : "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800"
                      }`}
                    >
                      {t("docScanner.grayscale")}
                    </button>

                    <button
                      type="button"
                      onClick={() => setTempFilters(f => ({ ...f, filterType: "threshold" }))}
                      className={`p-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        tempFilters.filterType === "threshold"
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-xs"
                          : "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800"
                      }`}
                    >
                      {lang === "vi" ? "Đen trắng tương phản cao" : "Stark Threshold"}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 mb-1">
                    <span>{t("docScanner.threshold")}</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{tempFilters.threshold}</span>
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

                <div>
                  <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 mb-1">
                    <span>{t("docScanner.brightness")}</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{tempFilters.brightness}</span>
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

                <div>
                  <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 mb-1">
                    <span>{t("docScanner.contrast")}</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{tempFilters.contrast}</span>
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
                  className="w-full py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>{t("docScanner.resetFilters")}</span>
                </button>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => applyFilters(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                <span>{t("docScanner.applyAll")}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilterModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
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

      {/* MODAL 3: PIXEL-PERFECT PDF PRINT PREVIEW & CONFIRMATION MODAL */}
      {previewPdfModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl text-slate-800 dark:text-slate-100">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/90">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <FileDown className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {t("docScanner.previewPdfTitle")}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t("docScanner.previewPdfDesc").replace("{count}", String(pages.length))}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPdfModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Controls Bar */}
            <div className="p-4 bg-slate-100/80 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* File Name */}
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  {t("docScanner.filename")}
                </label>
                <input
                  type="text"
                  value={pdfFileName}
                  onChange={(e) => setPdfFileName(e.target.value)}
                  placeholder="Scanned_Document"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 text-xs focus:outline-none focus:border-emerald-500 shadow-xs"
                />
              </div>

              {/* Paper Size Option */}
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  {t("docScanner.paperSize")}
                </label>
                <select
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value as PaperSize)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 text-xs focus:outline-none focus:border-emerald-500 font-mono font-semibold cursor-pointer shadow-xs"
                >
                  <option value="a4">A4 (210 × 297 mm)</option>
                  <option value="a3">A3 (297 × 420 mm)</option>
                  <option value="a5">A5 (148 × 210 mm)</option>
                  <option value="letter">Letter (215.9 × 279.4 mm)</option>
                  <option value="legal">Legal (215.9 × 355.6 mm)</option>
                </select>
              </div>

              {/* Page Margin Option */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    {t("docScanner.marginSize")}
                  </label>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    {pdfMarginMm} mm
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    value={pdfMarginMm}
                    onChange={(e) => setPdfMarginMm(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={pdfMarginMm}
                    onChange={(e) => setPdfMarginMm(Math.max(0, Number(e.target.value) || 0))}
                    className="w-14 px-2 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 text-xs font-mono text-center focus:outline-none focus:border-emerald-500 shadow-xs"
                  />
                </div>
              </div>

              {/* Orientation Option */}
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  {t("docScanner.orientation")}
                </label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPdfOrientation("portrait")}
                    className={`flex-1 py-2 px-2.5 rounded-xl font-semibold border transition-all cursor-pointer ${
                      pdfOrientation === "portrait"
                        ? "bg-emerald-600 text-white border-emerald-500 shadow-xs"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
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
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {t("docScanner.landscape")}
                  </button>
                </div>
              </div>

              {/* Page Numbering Option with Placement Selector */}
              <div className="md:col-span-2 lg:col-span-4 border-t border-slate-200 dark:border-slate-800/80 pt-3 mt-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Hash className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                    {/* Placement option selector */}
                    <div>
                      <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-1">
                        {lang === "vi" ? "Vị trí in số trang:" : "Placement Option:"}
                      </label>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => setPageNumberPlacement("footer_margin")}
                          className={`py-1.5 px-2 rounded-xl border text-[10px] font-semibold text-center transition-all cursor-pointer ${
                            pageNumberPlacement === "footer_margin"
                              ? "bg-emerald-600 text-white border-emerald-500 shadow-xs"
                              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          {lang === "vi" ? "Tạo lề dưới Footer" : "Footer Margin"}
                        </button>

                        <button
                          type="button"
                          onClick={() => setPageNumberPlacement("burn_in")}
                          className={`py-1.5 px-2 rounded-xl border text-[10px] font-semibold text-center transition-all cursor-pointer ${
                            pageNumberPlacement === "burn_in"
                              ? "bg-emerald-600 text-white border-emerald-500 shadow-xs"
                              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          {lang === "vi" ? "In trực tiếp lên ảnh" : "Burn-in on Image"}
                        </button>
                      </div>
                    </div>

                    {/* Alignments */}
                    <div>
                      <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-1">
                        {lang === "vi" ? "Căn lề số trang:" : "Text Alignment:"}
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPageNumberPos("left")}
                          className={`flex-1 py-1.5 rounded-xl border text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                            pageNumberPos === "left"
                              ? "bg-emerald-600 text-white border-emerald-500 shadow-xs"
                              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          <AlignLeft className="h-3 w-3" />
                          <span>{t("docScanner.posLeft")}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPageNumberPos("center")}
                          className={`flex-1 py-1.5 rounded-xl border text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                            pageNumberPos === "center"
                              ? "bg-emerald-600 text-white border-emerald-500 shadow-xs"
                              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          <AlignCenter className="h-3 w-3" />
                          <span>{t("docScanner.posCenter")}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPageNumberPos("right")}
                          className={`flex-1 py-1.5 rounded-xl border text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                            pageNumberPos === "right"
                              ? "bg-emerald-600 text-white border-emerald-500 shadow-xs"
                              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          <AlignRight className="h-3 w-3" />
                          <span>{t("docScanner.posRight")}</span>
                        </button>
                      </div>
                    </div>

                    {/* Start Page & Start Value Settings */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-0.5">
                          {t("docScanner.pageNumberStartPage")}
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={Math.max(1, pages.length)}
                          value={pageNumberStartPage}
                          onChange={(e) => setPageNumberStartPage(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-2 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-200 text-xs font-mono focus:outline-none focus:border-emerald-500 shadow-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-0.5">
                          {t("docScanner.pageNumberStartVal")}
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={pageNumberStartVal}
                          onChange={(e) => setPageNumberStartVal(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-2 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-200 text-xs font-mono focus:outline-none focus:border-emerald-500 shadow-xs"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-500 italic block mt-1">
                    {t("docScanner.noPageNumbers")}
                  </span>
                )}
              </div>
            </div>

            {/* PIXEL-PERFECT PDF PAGES PREVIEW - EXACT SHEET ASPECT RATIO & MARGIN PADDING */}
            <div className="p-6 bg-slate-100 dark:bg-slate-950/80 overflow-y-auto space-y-8 flex flex-col items-center max-h-[52vh]">
              {pages.map((page, idx) => {
                const paper = PAPER_SIZES_CONFIG[paperSize] || PAPER_SIZES_CONFIG.a4;
                const isLandscape = pdfOrientation === "landscape";
                const sheetW = isLandscape ? paper.heightMm : paper.widthMm;
                const sheetH = isLandscape ? paper.widthMm : paper.heightMm;

                const pageNum1Based = idx + 1;
                const shouldRenderPageNum = enablePageNumbers && (pageNum1Based >= pageNumberStartPage);
                const isFooterMargin = shouldRenderPageNum && pageNumberPlacement === "footer_margin";

                const pageNumStr = pageNumberFormat
                  .replace("{page}", String(pageNumberStartVal + (idx - (pageNumberStartPage - 1))))
                  .replace("{total}", String(pages.length - pageNumberStartPage + pageNumberStartVal));

                const marginPercent = Math.min(15, (pdfMarginMm / sheetW) * 100);

                return (
                  <div key={page.id} className="flex flex-col items-center w-full max-w-xl">
                    {/* Page badge indicator */}
                    <div className="mb-1 text-[11px] font-mono text-slate-400 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-bold">
                        {t("docScanner.page")} {idx + 1} / {pages.length}
                      </span>
                      <span>({paper.name} - {isLandscape ? "Landscape" : "Portrait"})</span>
                    </div>

                    {/* Dynamic Paper Sheet Box */}
                    <div
                      className="bg-white shadow-2xl relative flex flex-col overflow-hidden text-slate-800 transition-all duration-300 w-full max-w-md"
                      style={{
                        aspectRatio: `${sheetW} / ${sheetH}`,
                        padding: `${marginPercent}%`,
                      }}
                    >
                      {/* Image Render Area */}
                      <div
                        className={`relative w-full flex-1 flex items-center justify-center overflow-hidden ${
                          isFooterMargin ? "pb-4" : ""
                        }`}
                      >
                        <img
                          src={page.processedCanvas.toDataURL("image/jpeg", 0.9)}
                          alt={`Preview Page ${idx + 1}`}
                          className="max-h-full max-w-full object-contain shadow-xs"
                        />

                        {/* Burn-in Page Number Overlay directly on Image */}
                        {shouldRenderPageNum && pageNumberPlacement === "burn_in" && (
                          <div
                            className={`absolute bottom-2 px-2.5 py-0.5 rounded-md bg-slate-950/90 text-white font-mono text-[10px] font-bold shadow-md ${
                              pageNumberPos === "left"
                                ? "left-2"
                                : pageNumberPos === "right"
                                ? "right-2"
                                : "left-1/2 -translate-x-1/2"
                            }`}
                          >
                            {pageNumStr}
                          </div>
                        )}
                      </div>

                      {/* Footer Margin Page Number Area */}
                      {isFooterMargin && (
                        <div className="w-full h-7 px-2 flex items-center justify-center bg-white border-t border-slate-100 shrink-0">
                          <div
                            className={`w-full text-[10px] font-mono font-medium text-slate-500 ${
                              pageNumberPos === "left"
                                ? "text-left"
                                : pageNumberPos === "right"
                                ? "text-right"
                                : "text-center"
                            }`}
                          >
                            {pageNumStr}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPreviewPdfModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
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
