import React, { useState, useRef, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { jsPDF } from "jspdf";
import { useI18n } from "../utils/i18n";
import { pdfSessionStore } from "../utils/sessionHelper";
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
  Crop, 
  Sliders, 
  Settings, 
  Download, 
  Plus, 
  Image as ImageIcon 
} from "lucide-react";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "motion/react";
import { 
  Point, 
  FilterSettings, 
  DEFAULT_FILTERS, 
  warpPerspective, 
  applyImageFilters 
} from "../utils/perspectiveWarp";

// Set pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || "4.2.67"}/pdf.worker.min.mjs`;

interface EditPageItem {
  id: string;
  sourceName: string;
  originalCanvas: HTMLCanvasElement; // uncropped, unfiltered original canvas
  cropPoints: [Point, Point, Point, Point]; // top-left, top-right, bottom-right, bottom-left
  isCropped: boolean;
  warpedCanvas: HTMLCanvasElement | null;
  filters: FilterSettings;
  processedCanvas: HTMLCanvasElement; // final canvas ready for display and export
  thumbnailUrl: string; // generated from processedCanvas
}

export function getPageDataUrl(page: any, quality = 0.8): string {
  if (!page) return "";
  if (page.thumbnailUrl && typeof page.thumbnailUrl === "string") return page.thumbnailUrl;
  if (page.processedCanvas && typeof page.processedCanvas.toDataURL === "function") {
    try {
      return page.processedCanvas.toDataURL("image/jpeg", quality);
    } catch (e) {}
  }
  if (page.warpedCanvas && typeof page.warpedCanvas.toDataURL === "function") {
    try {
      return page.warpedCanvas.toDataURL("image/jpeg", quality);
    } catch (e) {}
  }
  if (page.originalCanvas && typeof page.originalCanvas.toDataURL === "function") {
    try {
      return page.originalCanvas.toDataURL("image/jpeg", quality);
    } catch (e) {}
  }
  return "";
}

export function getOriginalPageDataUrl(page: any): string {
  if (!page) return "";
  if (page.originalCanvas && typeof page.originalCanvas.toDataURL === "function") {
    try {
      return page.originalCanvas.toDataURL("image/jpeg", 0.9);
    } catch (e) {}
  }
  return getPageDataUrl(page);
}

export default function PdfEdit() {
  const { lang, t } = useI18n();
  const [pages, setPages] = useState<EditPageItem[]>(() => {
    return pdfSessionStore.getEdit()?.pages || [];
  });
  const [loading, setLoading] = useState(false);
  const [exportName, setExportName] = useState(() => {
    return pdfSessionStore.getEdit()?.exportName || "Tai_Lieu_Chinh_Sua";
  });
  const [isExporting, setIsExporting] = useState(false);

  // PDF Export settings
  const [paperSize, setPaperSize] = useState<"a4" | "letter" | "legal">(
    () => pdfSessionStore.getEdit()?.paperSize || "a4"
  );
  const [pdfOrientation, setPdfOrientation] = useState<"portrait" | "landscape">(
    () => pdfSessionStore.getEdit()?.pdfOrientation || "portrait"
  );
  const [pdfMargin, setPdfMargin] = useState(() => pdfSessionStore.getEdit()?.pdfMargin || 0); // in mm

  // Sync state to pdfSessionStore
  useEffect(() => {
    pdfSessionStore.setEdit({
      pages,
      exportName,
      paperSize,
      pdfOrientation,
      pdfMargin,
    });
  }, [pages, exportName, paperSize, pdfOrientation, pdfMargin]);

  // Crop Modal state
  const [cropIdx, setCropIdx] = useState<number | null>(null);
  const [cropPoints, setCropPoints] = useState<[Point, Point, Point, Point]>([
    { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }
  ]);
  const [draggingPointIdx, setDraggingPointIdx] = useState<number | null>(null);
  const cropImageRef = useRef<HTMLImageElement | null>(null);
  const [cropImageDims, setCropImageDims] = useState({ width: 1, height: 1 });

  // Filter Modal state
  const [filterIdx, setFilterIdx] = useState<number | null>(null);
  const [tempFilters, setTempFilters] = useState<FilterSettings>(DEFAULT_FILTERS);

  // Fullscreen view state
  const [fullscreenIdx, setFullscreenIdx] = useState<number | null>(null);

  // Drag-and-drop file upload helpers
  const [zoneDragOver, setZoneDragOver] = useState(false);

  // Handle uploading files (images or PDFs)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    await processUploadedFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const processUploadedFiles = async (files: File[]) => {
    setLoading(true);
    const newItems: EditPageItem[] = [];

    for (const file of files) {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const isImg = file.type.startsWith("image/");

      if (isPdf) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            // Render at higher scale (1.5) for crisp page editing quality
            const viewport = page.getViewport({ scale: 1.5 });

            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const context = canvas.getContext("2d");
            if (context) {
              await page.render({ canvasContext: context, viewport } as any).promise;
            }

            const padX = Math.round(canvas.width * 0.03);
            const padY = Math.round(canvas.height * 0.03);
            const defaultPoints: [Point, Point, Point, Point] = [
              { x: padX, y: padY },
              { x: canvas.width - padX, y: padY },
              { x: canvas.width - padX, y: canvas.height - padY },
              { x: padX, y: canvas.height - padY }
            ];

            const processed = applyImageFilters(canvas, DEFAULT_FILTERS);

            newItems.push({
              id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
              sourceName: `${file.name} (P.${i})`,
              originalCanvas: canvas,
              cropPoints: defaultPoints,
              isCropped: false,
              warpedCanvas: null,
              filters: { ...DEFAULT_FILTERS },
              processedCanvas: processed,
              thumbnailUrl: processed.toDataURL("image/jpeg", 0.8),
            });
          }
        } catch (err: any) {
          toast.error(
            lang === "vi" 
              ? `Không thể trích xuất PDF "${file.name}": ${err.message}` 
              : `Could not extract PDF "${file.name}": ${err.message}`
          );
        }
      } else if (isImg) {
        try {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = dataUrl;
          });

          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
          }

          const padX = Math.round(canvas.width * 0.03);
          const padY = Math.round(canvas.height * 0.03);
          const defaultPoints: [Point, Point, Point, Point] = [
            { x: padX, y: padY },
            { x: canvas.width - padX, y: padY },
            { x: canvas.width - padX, y: canvas.height - padY },
            { x: padX, y: canvas.height - padY }
          ];

          const processed = applyImageFilters(canvas, DEFAULT_FILTERS);

          newItems.push({
            id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            sourceName: file.name,
            originalCanvas: canvas,
            cropPoints: defaultPoints,
            isCropped: false,
            warpedCanvas: null,
            filters: { ...DEFAULT_FILTERS },
            processedCanvas: processed,
            thumbnailUrl: processed.toDataURL("image/jpeg", 0.8),
          });
        } catch (err: any) {
          toast.error(
            lang === "vi" 
              ? `Không thể đọc ảnh "${file.name}": ${err.message}` 
              : `Could not read image "${file.name}": ${err.message}`
          );
        }
      }
    }

    if (newItems.length > 0) {
      setPages(prev => [...prev, ...newItems]);
      toast.success(
        lang === "vi" 
          ? `Đã thêm thành công ${newItems.length} trang chỉnh sửa.` 
          : `Successfully added ${newItems.length} pages.`
      );
    }
    setLoading(false);
  };

  // Move page
  const movePage = (from: number, to: number) => {
    if (to < 0 || to >= pages.length) return;
    const updated = [...pages];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setPages(updated);
  };

  // Delete page
  const deletePage = (idx: number) => {
    setPages(prev => prev.filter((_, i) => i !== idx));
    toast.success(lang === "vi" ? "Đã xoá trang" : "Deleted page");
  };

  // Rotate page directly by redrawing canvas rotated 90 degrees
  const rotatePage = (idx: number, angle: 90 | -90) => {
    setPages(prev => prev.map((item, i) => {
      if (i !== idx) return item;

      const src = item.originalCanvas;
      const dst = document.createElement("canvas");
      dst.width = src.height;
      dst.height = src.width;

      const ctx = dst.getContext("2d");
      if (ctx) {
        ctx.translate(dst.width / 2, dst.height / 2);
        ctx.rotate((angle * Math.PI) / 180);
        ctx.drawImage(src, -src.width / 2, -src.height / 2);
      }

      const padX = Math.round(dst.width * 0.03);
      const padY = Math.round(dst.height * 0.03);
      const newPoints: [Point, Point, Point, Point] = [
        { x: padX, y: padY },
        { x: dst.width - padX, y: padY },
        { x: dst.width - padX, y: dst.height - padY },
        { x: padX, y: dst.height - padY }
      ];

      const warped = item.isCropped ? warpPerspective(dst, newPoints) : null;
      const baseCanvas = warped || dst;
      const processed = applyImageFilters(baseCanvas, item.filters);

      return {
        ...item,
        originalCanvas: dst,
        cropPoints: newPoints,
        warpedCanvas: warped,
        processedCanvas: processed,
        thumbnailUrl: processed.toDataURL("image/jpeg", 0.8),
      };
    }));
    toast.info(lang === "vi" ? "Đã xoay trang" : "Rotated page");
  };

  // Crop Modal interaction setup
  const openCropModal = (idx: number) => {
    const item = pages[idx];
    setCropIdx(idx);
    setCropPoints([...item.cropPoints]);
  };

  const handleCropPointMouseDown = (pIdx: number) => {
    setDraggingPointIdx(pIdx);
  };

  const handleCropMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingPointIdx === null || cropIdx === null) return;
    const svgRect = e.currentTarget.getBoundingClientRect();

    const mouseX = e.clientX - svgRect.left;
    const mouseY = e.clientY - svgRect.top;

    // Convert to percentage
    const pctX = Math.max(0, Math.min(100, (mouseX / svgRect.width) * 100));
    const pctY = Math.max(0, Math.min(100, (mouseY / svgRect.height) * 100));

    // Map back to canvas pixel size
    const pixelX = Math.round((pctX / 100) * cropImageDims.width);
    const pixelY = Math.round((pctY / 100) * cropImageDims.height);

    setCropPoints(prev => {
      const updated = [...prev] as [Point, Point, Point, Point];
      updated[draggingPointIdx] = { x: pixelX, y: pixelY };
      return updated;
    });
  };

  const handleCropMouseUp = () => {
    setDraggingPointIdx(null);
  };

  const applyCropAndWarp = () => {
    if (cropIdx === null) return;
    setPages(prev => prev.map((item, i) => {
      if (i !== cropIdx) return item;

      // Warp perspective
      const warped = warpPerspective(item.originalCanvas, cropPoints);
      const processed = applyImageFilters(warped, item.filters);

      return {
        ...item,
        cropPoints: [...cropPoints] as [Point, Point, Point, Point],
        isCropped: true,
        warpedCanvas: warped,
        processedCanvas: processed,
        thumbnailUrl: processed.toDataURL("image/jpeg", 0.8)
      };
    }));

    setCropIdx(null);
    toast.success(lang === "vi" ? "Đã áp dụng cắt góc tài liệu" : "Applied document cropping");
  };

  const resetCrop = () => {
    if (cropIdx === null) return;
    setPages(prev => prev.map((item, i) => {
      if (i !== cropIdx) return item;

      const padX = Math.round(item.originalCanvas.width * 0.03);
      const padY = Math.round(item.originalCanvas.height * 0.03);
      const defaultPoints: [Point, Point, Point, Point] = [
        { x: padX, y: padY },
        { x: item.originalCanvas.width - padX, y: padY },
        { x: item.originalCanvas.width - padX, y: item.originalCanvas.height - padY },
        { x: padX, y: item.originalCanvas.height - padY }
      ];

      const processed = applyImageFilters(item.originalCanvas, item.filters);

      return {
        ...item,
        cropPoints: defaultPoints,
        isCropped: false,
        warpedCanvas: null,
        processedCanvas: processed,
        thumbnailUrl: processed.toDataURL("image/jpeg", 0.8)
      };
    }));

    setCropIdx(null);
    toast.info(lang === "vi" ? "Đã hoàn tác cắt góc" : "Reset cropping");
  };

  // Filter settings panel interaction
  const openFilterModal = (idx: number) => {
    setFilterIdx(idx);
    setTempFilters({ ...pages[idx].filters });
  };

  const applyFiltersToPage = () => {
    if (filterIdx === null) return;
    setPages(prev => prev.map((item, i) => {
      if (i !== filterIdx) return item;

      const sourceCanvas = item.warpedCanvas || item.originalCanvas;
      const processed = applyImageFilters(sourceCanvas, tempFilters);

      return {
        ...item,
        filters: { ...tempFilters },
        processedCanvas: processed,
        thumbnailUrl: processed.toDataURL("image/jpeg", 0.8)
      };
    }));

    setFilterIdx(null);
    toast.success(lang === "vi" ? "Đã lưu bộ lọc màu sắc" : "Color filters saved");
  };

  // Export fully edited PDF via jsPDF
  const exportEditedPdf = async () => {
    if (pages.length === 0) return;
    setIsExporting(true);

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
          const imgDataUrl = canvas.toDataURL("image/jpeg", 0.9);

          const imgWidth = canvas.width;
          const imgHeight = canvas.height;
          const ratio = imgWidth / imgHeight;

          const margin = Math.max(0, pdfMargin);
          const availW = Math.max(10, sheetW - margin * 2);
          const availH = Math.max(10, sheetH - margin * 2);

          let renderW = availW;
          let renderH = availW / ratio;

          if (renderH > availH) {
            renderH = availH;
            renderW = availH * ratio;
          }

          const posX = margin + (availW - renderW) / 2;
          const posY = margin + (availH - renderH) / 2;

          doc.addImage(imgDataUrl, "JPEG", posX, posY, renderW, renderH);
        });

        doc.save(`${exportName.replace(/\.pdf$/i, "") || "Edited_Document"}.pdf`);
        toast.success(lang === "vi" ? "Đã hoàn tất xuất tệp PDF!" : "PDF document exported successfully!");
      } catch (err: any) {
        toast.error(lang === "vi" ? `Không thể xuất PDF: ${err.message}` : `Cannot export PDF: ${err.message}`);
      } finally {
        setIsExporting(false);
      }
    }, 150);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-[#0B0F1A]" id="pdf-edit-container">
      {/* Upper Action Bar / Header */}
      <div className="bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800/80 px-[25px] py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
        <div className="flex items-start gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-600/20 flex-shrink-0 mt-0.5">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {lang === "vi" ? "Chỉnh Sửa PDF Nâng Cao" : "Advanced PDF Editor"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {lang === "vi" 
                ? "Trình chỉnh sửa PDF toàn diện: Ghép các trang từ ảnh hoặc các file PDF khác vào dự án, sau đó nắn góc 4 điểm, chỉnh bộ lọc CamScanner (màu nhiệm, trắng đen), xoay/sắp xếp lại trang."
                : "All-in-one PDF compiler: Import pages from images or other PDFs, then crop with 4-point perspective warping, apply CamScanner filters, and arrange."}
            </p>
          </div>
        </div>
      </div>

      {/* Main Body Content Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading && pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs w-full">
            <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
            <span className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-3">
              {lang === "vi" ? "Đang giải mã và trích xuất tài nguyên trang..." : "Importing and converting pages..."}
            </span>
          </div>
        ) : !loading && pages.length === 0 ? (
          <div className="w-full">
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
                  await processUploadedFiles(Array.from(e.dataTransfer.files));
                }
              }}
              className={`relative border-2 border-dashed rounded-3xl p-12 text-center flex flex-col items-center justify-center min-h-[320px] transition-all cursor-pointer ${
                zoneDragOver 
                  ? "border-purple-500 bg-purple-50/20 dark:bg-purple-950/10 scale-[0.99]" 
                  : "border-purple-300 dark:border-purple-800/60 bg-purple-50/10 dark:bg-purple-950/5 hover:border-purple-500"
              }`}
            >
              <input
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              />
              <div className="p-4 rounded-2xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 mb-4">
                <Upload className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                {lang === "vi" ? "Kéo & thả ảnh hoặc file PDF vào đây hoặc nhấp để tải lên" : "Drag & drop images or PDFs here or click to choose"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                {lang === "vi" 
                  ? "Hỗ trợ tệp ảnh (JPEG/PNG) hoặc tài liệu PDF để cắt nắn góc 4 điểm, chỉnh bộ lọc màu và sắp xếp trang" 
                  : "Supports image files (JPEG/PNG) or PDF documents for perspective warping, color filters and page sorting"}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 max-w-6xl mx-auto w-full">
            {/* Unified Top Card: Publishing Configs & Global Export Settings */}
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-xs font-bold tracking-wider text-purple-600 dark:text-purple-400 uppercase flex items-center gap-2">
                  <Sliders className="h-4 w-4" />
                  <span>{lang === "vi" ? "Cấu Hình Xuất Bản PDF" : "Publishing & Sheet Configs"}</span>
                </h3>
                <span className="text-xs font-bold font-mono text-slate-500 dark:text-slate-400">
                  {lang === "vi" ? `${pages.length} trang đã tải` : `${pages.length} pages loaded`}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                {/* Document Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {lang === "vi" ? "Tên tài liệu (.pdf)" : "Document name (.pdf)"}
                  </label>
                  <input
                    type="text"
                    value={exportName}
                    onChange={(e) => setExportName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F1A] text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 text-slate-800 dark:text-slate-200"
                    placeholder="Compiled_Document"
                  />
                </div>

                {/* Paper Size selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {lang === "vi" ? "Khổ giấy (Paper Sheet)" : "Paper Sheet Format"}
                  </label>
                  <select
                    value={paperSize}
                    onChange={(e) => setPaperSize(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F1A] text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden"
                  >
                    <option value="a4">A4 (210 x 297 mm)</option>
                    <option value="letter">Letter (8.5 x 11 in)</option>
                    <option value="legal">Legal (8.5 x 14 in)</option>
                  </select>
                </div>

                {/* Orientation */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {lang === "vi" ? "Hướng trang (Orientation)" : "Orientation"}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPdfOrientation("portrait")}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        pdfOrientation === "portrait"
                          ? "border-purple-500 bg-purple-600 text-white shadow-xs"
                          : "border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {lang === "vi" ? "Chiều dọc" : "Portrait"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPdfOrientation("landscape")}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        pdfOrientation === "landscape"
                          ? "border-purple-500 bg-purple-600 text-white shadow-xs"
                          : "border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {lang === "vi" ? "Chiều ngang" : "Landscape"}
                    </button>
                  </div>
                </div>

                {/* Margin Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>{lang === "vi" ? "Lề trang (Margin)" : "Sheet Margins"}</span>
                    <span className="text-purple-600 dark:text-purple-400">{pdfMargin} mm</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    step="5"
                    value={pdfMargin}
                    onChange={(e) => setPdfMargin(Number(e.target.value))}
                    className="w-full accent-purple-600 cursor-pointer my-1"
                  />
                </div>
              </div>

              {/* Build & Download PDF CTA Button */}
              <div className="pt-2">
                <button
                  onClick={exportEditedPdf}
                  disabled={pages.length === 0 || isExporting}
                  className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-purple-600/20 disabled:opacity-50 transition-all"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{lang === "vi" ? "Đang xử lý xuất PDF..." : "Exporting document..."}</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>{lang === "vi" ? `Lưu & Xuất Bản PDF (${pages.length} trang)` : `Build and Download PDF (${pages.length} pages)`}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Operational Action Bar & Add Dropzone */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {lang === "vi" ? `Danh sách trang biên tập (${pages.length} trang)` : `Page Editor Grid (${pages.length} pages)`}
                </span>
                <button
                  onClick={() => {
                    setPages([]);
                    pdfSessionStore.clearEdit();
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-rose-500/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{lang === "vi" ? "Xoá tất cả trang" : "Clear All Pages"}</span>
                </button>
              </div>

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
                    await processUploadedFiles(Array.from(e.dataTransfer.files));
                  }
                }}
                className={`relative border-2 border-dashed rounded-2xl p-4 text-center flex flex-col items-center justify-center transition-all ${
                  zoneDragOver 
                    ? "border-purple-500 bg-purple-50/20 dark:bg-purple-950/10 scale-[0.99]" 
                    : "border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#111827] hover:border-purple-400"
                }`}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                  <Plus className="h-4 w-4" />
                  <span className="text-xs font-bold">
                    {lang === "vi" ? "Tải lên thêm ảnh hoặc tệp PDF khác" : "Upload more images or PDF documents"}
                  </span>
                </div>
              </div>

              {/* Loader */}
              {loading && (
                <div className="flex flex-col items-center justify-center py-10 space-y-3 bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800">
                  <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {lang === "vi" ? "Đang giải mã và trích xuất tài nguyên trang..." : "Importing and converting pages..."}
                  </span>
                </div>
              )}

              {/* Page Editor Grid with Live Sheet Size, Orientation & Margin Preview */}
              {!loading && pages.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {pages.map((item, idx) => (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 flex flex-col group relative transition-all shadow-xs hover:border-purple-400"
                    >
                      {/* LIVE SHEET LAYOUT PREVIEW CONTAINER */}
                      <div className={`relative w-full ${pdfOrientation === "landscape" ? "aspect-[1.414/1]" : "aspect-[1/1.414]"} bg-slate-200/70 dark:bg-[#070A12] rounded-xl overflow-hidden flex items-center justify-center border border-slate-300 dark:border-slate-700/80 transition-all p-2`}>
                        {/* Paper Sheet Representation */}
                        <div 
                          className="relative w-full h-full bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center overflow-hidden transition-all"
                          style={{ padding: `${Math.min(20, Math.max(2, pdfMargin * 0.6))}px` }}
                        >
                          {/* Inner Margin Guideline Border */}
                          {pdfMargin > 0 && (
                            <div className="absolute inset-0 pointer-events-none border border-dashed border-purple-400/60 dark:border-purple-500/40 z-0 m-1 rounded-xs" />
                          )}

                          <img
                            src={item.thumbnailUrl || null}
                            alt={`Page ${idx + 1}`}
                            className="max-h-full max-w-full object-contain pointer-events-none relative z-1"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        {/* Hover controls overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 z-10">
                          <button
                            onClick={() => openCropModal(idx)}
                            className="p-1.5 bg-white text-slate-800 hover:bg-purple-600 hover:text-white rounded-lg transition-transform hover:scale-105 cursor-pointer shadow-md"
                            title={lang === "vi" ? "Cắt nắn góc 4 điểm" : "4-Point Crop"}
                          >
                            <Crop className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openFilterModal(idx)}
                            className="p-1.5 bg-white text-slate-800 hover:bg-purple-600 hover:text-white rounded-lg transition-transform hover:scale-105 cursor-pointer shadow-md"
                            title={lang === "vi" ? "Bộ lọc CamScanner" : "Color Filters"}
                          >
                            <Sliders className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setFullscreenIdx(idx)}
                            className="p-1.5 bg-white text-slate-800 hover:bg-purple-600 hover:text-white rounded-lg transition-transform hover:scale-105 cursor-pointer shadow-md"
                            title={lang === "vi" ? "Xem Toàn Màn Hình" : "Fullscreen View"}
                          >
                            <Maximize2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Page badge */}
                        <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 bg-slate-900/85 backdrop-blur-xs text-white text-[10px] font-mono font-bold rounded-md z-10">
                          #{idx + 1}
                        </span>

                        {/* Delete item button */}
                        <button
                          onClick={() => deletePage(idx)}
                          className="absolute top-1.5 right-1.5 p-1 bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 border border-rose-500/60 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-md shadow-xs transition-colors z-20 cursor-pointer"
                          title={lang === "vi" ? "Xoá trang này" : "Delete page"}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Info details and inline controls */}
                      <div className="mt-2.5 px-1 space-y-1.5">
                        <p className="text-[10px] font-mono font-medium text-slate-400 truncate" title={item.sourceName}>
                          {item.sourceName}
                        </p>

                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                          {/* Rotates */}
                          <div className="flex gap-1">
                            <button
                              onClick={() => rotatePage(idx, -90)}
                              className="p-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-md text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
                              title={lang === "vi" ? "Xoay trái" : "Rotate Left"}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => rotatePage(idx, 90)}
                              className="p-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-md text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
                              title={lang === "vi" ? "Xoay phải" : "Rotate Right"}
                            >
                              <RotateCw className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Move left/right */}
                          <div className="flex gap-1">
                            <button
                              disabled={idx === 0}
                              onClick={() => movePage(idx, idx - 1)}
                              className="p-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-md text-slate-500 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            >
                              <ArrowLeft className="h-3.5 w-3.5" />
                            </button>
                            <button
                              disabled={idx === pages.length - 1}
                              onClick={() => movePage(idx, idx + 1)}
                              className="p-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-md text-slate-500 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            >
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4-Point Perspective Crop Modal */}
      <AnimatePresence>
        {cropIdx !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <div className="bg-slate-900 text-white rounded-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-800 shadow-2xl">
              {/* Modal header */}
              <div className="flex justify-between items-center p-4 border-b border-slate-800">
                <h3 className="text-sm font-bold flex items-center gap-2 text-slate-200">
                  <Crop className="h-4 w-4 text-rose-500" />
                  <span>{lang === "vi" ? "Nắn góc tài liệu 4 điểm" : "4-Point Perspective Crop"}</span>
                </h3>
                <button
                  onClick={() => setCropIdx(null)}
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Crop Stage Workspace */}
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950 min-h-[40vh] max-h-[65vh]">
                <div className="relative max-h-full max-w-full">
                  {/* Invisible loader/measurer of dimensions */}
                  <img
                    ref={cropImageRef}
                    src={getOriginalPageDataUrl(pages[cropIdx]) || null}
                    alt="Original cropping workspace"
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      setCropImageDims({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
                    }}
                    className="max-h-[50vh] max-w-[80vw] object-contain block opacity-100 pointer-events-none rounded-sm"
                  />

                  {/* SVG Drag Handle Overlay */}
                  {cropImageRef.current && (
                    <svg
                      onMouseMove={handleCropMouseMove}
                      onMouseUp={handleCropMouseUp}
                      onMouseLeave={handleCropMouseUp}
                      viewBox={`0 0 ${cropImageDims.width} ${cropImageDims.height}`}
                      className="absolute inset-0 w-full h-full select-none cursor-crosshair overflow-visible z-20"
                    >
                      {/* Grid Polygon Lines */}
                      <polygon
                        points={`${cropPoints[0].x},${cropPoints[0].y} ${cropPoints[1].x},${cropPoints[1].y} ${cropPoints[2].x},${cropPoints[2].y} ${cropPoints[3].x},${cropPoints[3].y}`}
                        className="fill-rose-500/10 stroke-rose-400 stroke-[3] stroke-dasharray-[2,2] transition-colors duration-150"
                      />

                      {/* 4 Interactive corner handle circles */}
                      {cropPoints.map((pt, pIdx) => (
                        <g key={pIdx}>
                          {/* Inner touch target */}
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={Math.round(cropImageDims.width * 0.015 + 10)}
                            className="fill-transparent cursor-pointer"
                            onMouseDown={() => handleCropPointMouseDown(pIdx)}
                          />
                          {/* Visible ring */}
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={Math.round(cropImageDims.width * 0.012 + 2)}
                            className="fill-rose-500 stroke-white stroke-[2] pointer-events-none drop-shadow-md hover:scale-125 transition-transform"
                          />
                          <text
                            x={pt.x}
                            y={pt.y - Math.round(cropImageDims.width * 0.02 + 6)}
                            textAnchor="middle"
                            className="fill-white font-bold text-[10px] font-mono select-none pointer-events-none"
                            style={{ fontSize: Math.round(cropImageDims.width * 0.02 + 10) }}
                          >
                            {pIdx === 0 ? "TL" : pIdx === 1 ? "TR" : pIdx === 2 ? "BR" : "BL"}
                          </text>
                        </g>
                      ))}
                    </svg>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-between gap-3">
                <button
                  onClick={resetCrop}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {lang === "vi" ? "Hoàn tác / Hủy cắt" : "Reset / Cancel crop"}
                </button>
                <button
                  onClick={applyCropAndWarp}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>{lang === "vi" ? "Xác nhận cắt nắn góc" : "Apply & Warp perspective"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* CamScanner Filter Adjustment Modal */}
      <AnimatePresence>
        {filterIdx !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <div className="bg-slate-900 text-white rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-slate-800 shadow-2xl">
              {/* Header */}
              <div className="flex justify-between items-center p-4 border-b border-slate-800">
                <h3 className="text-sm font-bold flex items-center gap-2 text-slate-200">
                  <Sliders className="h-4 w-4 text-rose-500" />
                  <span>{lang === "vi" ? "Chỉnh sửa bộ lọc màu CamScanner" : "Adjust Color Filters"}</span>
                </h3>
                <button
                  onClick={() => setFilterIdx(null)}
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 max-h-[60vh] overflow-y-auto">
                {/* Left Side: Live filter preview */}
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-center aspect-[3/4]">
                  <div className="relative max-h-full max-w-full">
                    {/* Rendered temporary filter canvas helper */}
                    <img
                      src={(() => {
                        const p = pages[filterIdx];
                        const srcCanvas = p?.warpedCanvas || p?.originalCanvas;
                        if (srcCanvas && typeof srcCanvas.toDataURL === "function") {
                          try {
                            return applyImageFilters(srcCanvas, tempFilters).toDataURL("image/jpeg", 0.8);
                          } catch (e) {}
                        }
                        return getPageDataUrl(p, 0.8) || null;
                      })()}
                      alt="Filter live rendering"
                      className="max-h-full max-w-full object-contain block rounded-md shadow-lg pointer-events-none"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

                {/* Right Side: Filters selecting and slider parameters */}
                <div className="space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    {/* Filter Type selects */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400">{lang === "vi" ? "Chế độ bộ lọc" : "Filter Type"}</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { key: "original", label: lang === "vi" ? "Ảnh Gốc" : "Original" },
                          { key: "magic_color", label: lang === "vi" ? "Màu nhiệm" : "Magic Color" },
                          { key: "grayscale", label: lang === "vi" ? "Ảnh xám" : "Grayscale" },
                          { key: "threshold", label: lang === "vi" ? "B&W (Trắng đen)" : "B&W Threshold" },
                        ].map((btn) => (
                          <button
                            key={btn.key}
                            type="button"
                            onClick={() => setTempFilters(prev => ({ ...prev, filterType: btn.key as any }))}
                            className={`py-2 px-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              tempFilters.filterType === btn.key
                                ? "border-rose-500 bg-rose-950/40 text-rose-400"
                                : "border-slate-800 bg-slate-900/50 text-slate-400 hover:text-white"
                            }`}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Brightness Slider */}
                    {tempFilters.filterType !== "threshold" && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-400">{lang === "vi" ? "Độ sáng" : "Brightness"}</span>
                          <span className="text-rose-400">{tempFilters.brightness}</span>
                        </div>
                        <input
                          type="range"
                          min="-100"
                          max="100"
                          value={tempFilters.brightness}
                          onChange={(e) => setTempFilters(prev => ({ ...prev, brightness: Number(e.target.value) }))}
                          className="w-full accent-rose-500"
                        />
                      </div>
                    )}

                    {/* Contrast Slider */}
                    {tempFilters.filterType !== "threshold" && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-400">{lang === "vi" ? "Độ tương phản" : "Contrast"}</span>
                          <span className="text-rose-400">{tempFilters.contrast}</span>
                        </div>
                        <input
                          type="range"
                          min="-100"
                          max="100"
                          value={tempFilters.contrast}
                          onChange={(e) => setTempFilters(prev => ({ ...prev, contrast: Number(e.target.value) }))}
                          className="w-full accent-rose-500"
                        />
                      </div>
                    )}

                    {/* Threshold Slider (only for threshold and magic_color) */}
                    {(tempFilters.filterType === "threshold" || tempFilters.filterType === "magic_color") && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-400">{lang === "vi" ? "Ngưỡng nhị phân (Threshold)" : "B&W Threshold"}</span>
                          <span className="text-rose-400">{tempFilters.threshold}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="255"
                          value={tempFilters.threshold}
                          onChange={(e) => setTempFilters(prev => ({ ...prev, threshold: Number(e.target.value) }))}
                          className="w-full accent-rose-500"
                        />
                      </div>
                    )}
                  </div>

                  <button
                    onClick={applyFiltersToPage}
                    className="w-full py-2.5 mt-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Check className="h-4 w-4" />
                    <span>{lang === "vi" ? "Lưu và áp dụng bộ lọc" : "Save and Apply"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Fullscreen Page Modal View */}
      <AnimatePresence>
        {fullscreenIdx !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <button
              onClick={() => setFullscreenIdx(null)}
              className="absolute top-4 right-4 p-2 bg-slate-800/80 text-white rounded-xl hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Left page navigation */}
            <button
              disabled={fullscreenIdx === 0}
              onClick={() => setFullscreenIdx(prev => (prev !== null && prev > 0 ? prev - 1 : prev))}
              className="absolute left-4 p-3 bg-slate-800/80 text-white rounded-full hover:bg-slate-700 disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>

            {/* Central content with Paper Sheet Layout Sync */}
            {(() => {
              const activePg = pages[fullscreenIdx];
              const isLandscape = pdfOrientation === "landscape";
              const marginPx = Math.max(0, pdfMargin);

              return (
                <div className="flex flex-col items-center max-w-full max-h-[88vh]">
                  {/* Paper Sheet Representation Frame */}
                  <div className={`bg-slate-200 dark:bg-slate-950 p-2.5 rounded-2xl border border-slate-700 shadow-2xl relative flex items-center justify-center transition-all ${
                    isLandscape ? "aspect-[1.414/1] w-[82vw] max-h-[72vh]" : "aspect-[1/1.414] h-[75vh] max-w-[85vw]"
                  }`}>
                    <div 
                      className="relative w-full h-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center overflow-hidden transition-all"
                      style={{ padding: `${Math.min(32, Math.max(4, marginPx * 1.2))}px` }}
                    >
                      {/* Inner Margin Guideline Border */}
                      {marginPx > 0 && (
                        <div className="absolute inset-0 pointer-events-none border border-dashed border-purple-400/60 dark:border-purple-500/40 z-0 m-2 rounded-xs" />
                      )}

                      <img
                        src={activePg?.thumbnailUrl || null}
                        alt={`Page ${fullscreenIdx + 1}`}
                        referrerPolicy="no-referrer"
                        className="max-h-full max-w-full object-contain relative z-1 pointer-events-none shadow-xs"
                      />
                    </div>
                  </div>

                  <div className="mt-3.5 text-center">
                    <p className="text-white font-bold text-sm">
                      {lang === "vi" 
                        ? `Xem Trang ${fullscreenIdx + 1} / ${pages.length} (${isLandscape ? "Chiều ngang" : "Chiều dọc"})` 
                        : `Viewing Page ${fullscreenIdx + 1} of ${pages.length} (${isLandscape ? "Landscape" : "Portrait"})`}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 font-mono truncate max-w-md">
                      {activePg?.sourceName}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Right page navigation */}
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
