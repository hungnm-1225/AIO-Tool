import React, { useState, useMemo, useEffect } from "react";
import { XLSX } from "../utils/xlsxHelper";
import JSZip from "jszip";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as pdfjsLib from "pdfjs-dist";
import { marked } from "marked";
import { toast } from "react-toastify";
import { useI18n } from "../utils/i18n";
import { addUnicodeFont } from "../utils/unicodeFont";
import {
  RefreshCw,
  Upload,
  Download,
  Trash2,
  FileText,
  FileImage,
  FileAudio,
  FileSpreadsheet,
  FileCode,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  File as FileIcon
} from "lucide-react";

// Set pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || "4.2.67"}/pdf.worker.min.mjs`;

type CategoryType = "all" | "document" | "image" | "audio_video" | "data";

interface ConvertedFileItem {
  id: string;
  originalFile: File;
  name: string;
  sourceExt: string;
  targetFormat: string;
  status: "idle" | "converting" | "done" | "error";
  progress: number;
  resultBlob: Blob | null;
  resultFilename: string;
  errorMessage?: string;
  category: CategoryType;
}

const SUPPORTED_CONVERSIONS: Record<string, string[]> = {
  // Document
  pdf: ["docx", "txt", "md"],
  docx: ["pdf", "txt", "md"],
  txt: ["pdf", "docx", "md"],
  md: ["pdf", "docx", "txt"],
  epub: ["pdf", "txt", "md"],

  // Image
  png: ["jpg", "jpeg", "webp", "bmp"],
  jpg: ["png", "webp", "bmp"],
  jpeg: ["png", "webp", "bmp"],
  webp: ["png", "jpg", "jpeg"],
  bmp: ["png", "jpg", "jpeg"],
  heic: ["png", "jpg", "jpeg"],

  // Audio / Video
  mp3: ["wav", "aac"],
  wav: ["mp3", "aac"],
  aac: ["mp3", "wav"],
  mp4: ["mp3", "webm", "wav"],
  webm: ["mp3", "wav", "mp4"],

  // Data / Spreadsheet
  xlsx: ["csv", "json"],
  xls: ["csv", "json"],
  csv: ["xlsx", "json"],
  json: ["csv", "xml"],
  xml: ["json"],
};

interface FileConverterProps {
  subSlug?: string;
  hideInnerHeader?: boolean;
}

export default function FileConverter({ subSlug, hideInnerHeader = false }: FileConverterProps) {
  const { lang } = useI18n();

  const getCategoryFromSlug = (slug?: string): CategoryType => {
    if (slug === "tai-lieu-van-ban") return "document";
    if (slug === "hinh-anh") return "image";
    if (slug === "am-thanh-video") return "audio_video";
    if (slug === "bang-tinh-du-lieu") return "data";
    return "all";
  };

  const [activeCategory, setActiveCategory] = useState<CategoryType>(() => getCategoryFromSlug(subSlug));
  const [fileList, setFileList] = useState<ConvertedFileItem[]>(() => {
    if (typeof window !== "undefined") {
      const cached = (window as any).__session_file_cache?.['file_converter_items'];
      if (cached && cached.length > 0) {
        return cached;
      }
      
      const stored = sessionStorage.getItem("file_converter_serialized");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          return parsed.map((item: any) => {
            const blob = new Blob([""], { type: "application/octet-stream" });
            const file = new File([blob], item.name, { type: "application/octet-stream" });
            return {
              id: item.id,
              originalFile: file,
              name: item.name,
              sourceExt: item.sourceExt,
              targetFormat: item.targetFormat,
              status: item.status,
              progress: item.progress,
              resultBlob: null,
              resultFilename: item.resultFilename,
              category: item.category,
              errorMessage: item.errorMessage,
            };
          });
        } catch (e) {
          return [];
        }
      }
    }
    return [];
  });
  const [isBatchConverting, setIsBatchConverting] = useState(false);
  const [imageQuality, setImageQuality] = useState(0.92);

  // Save to session cache
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__session_file_cache = (window as any).__session_file_cache || {};
      (window as any).__session_file_cache['file_converter_items'] = fileList;
      
      const serializable = fileList.map(item => ({
        id: item.id,
        name: item.name,
        sourceExt: item.sourceExt,
        targetFormat: item.targetFormat,
        status: item.status,
        progress: item.progress,
        resultFilename: item.resultFilename,
        category: item.category,
        errorMessage: item.errorMessage,
      }));
      sessionStorage.setItem("file_converter_serialized", JSON.stringify(serializable));
    }
  }, [fileList]);

  useEffect(() => {
    if (subSlug) {
      setActiveCategory(getCategoryFromSlug(subSlug));
    }
  }, [subSlug]);

  // Helper to detect category from file extension
  const getCategoryFromExt = (ext: string): CategoryType => {
    const e = ext.toLowerCase();
    if (["pdf", "docx", "doc", "txt", "epub", "md"].includes(e)) return "document";
    if (["png", "jpg", "jpeg", "webp", "bmp", "heic", "gif"].includes(e)) return "image";
    if (["mp3", "wav", "aac", "mp4", "avi", "mkv", "webm", "flac"].includes(e)) return "audio_video";
    if (["xlsx", "xls", "csv", "json", "xml"].includes(e)) return "data";
    return "document";
  };

  // Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: ConvertedFileItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const match = file.name.toLowerCase().match(/\.([a-z0-9]+)$/);
      const ext = match ? match[1] : "";
      const allowedTargets = SUPPORTED_CONVERSIONS[ext] || ["txt"];
      const defaultTarget = allowedTargets[0] || "txt";
      const cat = getCategoryFromExt(ext);

      newItems.push({
        id: `conv_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
        originalFile: file,
        name: file.name,
        sourceExt: ext,
        targetFormat: defaultTarget,
        status: "idle",
        progress: 0,
        resultBlob: null,
        resultFilename: `${file.name.replace(/\.[a-z0-9]+$/i, "")}.${defaultTarget}`,
        category: cat,
      });
    }

    setFileList((prev) => [...prev, ...newItems]);
    toast.success(
      lang === "vi"
        ? `Đã thêm ${newItems.length} tệp vào danh sách chuyển đổi!`
        : `Added ${newItems.length} files to conversion queue!`
    );
  };

  // Filtered files list
  const filteredFiles = useMemo(() => {
    if (activeCategory === "all") return fileList;
    return fileList.filter((item) => item.category === activeCategory);
  }, [fileList, activeCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryType, number> = { all: fileList.length, document: 0, image: 0, audio_video: 0, data: 0 };
    fileList.forEach(item => {
      if (counts[item.category] !== undefined) {
        counts[item.category]++;
      }
    });
    return counts;
  }, [fileList]);

  // Target format selector change handler
  const handleTargetChange = (id: string, newTarget: string) => {
    setFileList((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const lastDot = item.name.lastIndexOf(".");
          const baseName = lastDot > 0 ? item.name.substring(0, lastDot) : item.name;
          const newName = `${baseName}.${newTarget}`;
          return {
            ...item,
            targetFormat: newTarget,
            resultFilename: newName,
            status: "idle",
            resultBlob: null,
          };
        }
        return item;
      })
    );
  };

  // Handle rename base filename (extension is locked)
  const handleRenameBase = (id: string, newBase: string) => {
    setFileList((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newFullName = `${newBase}.${item.sourceExt}`;
          const newResultName = `${newBase}.${item.targetFormat}`;
          return {
            ...item,
            name: newFullName,
            resultFilename: newResultName,
          };
        }
        return item;
      })
    );
  };

  // Remove file
  const removeFile = (id: string) => {
    setFileList((prev) => prev.filter((item) => item.id !== id));
  };

  // Clear all files
  const clearAll = () => {
    setFileList([]);
    toast.info(lang === "vi" ? "Đã xóa toàn bộ tệp trong danh sách." : "Cleared conversion list.");
  };

  // --- CORE CONVERSION ROUTINES ---

  // 1. Convert Images via Canvas
  const convertImage = async (file: File, targetExt: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Failed to initialize canvas context"));
          return;
        }

        // Fill white background for non-alpha formats like JPG
        if (["jpg", "jpeg"].includes(targetExt)) {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        let mime = "image/png";
        if (["jpg", "jpeg"].includes(targetExt)) mime = "image/jpeg";
        else if (targetExt === "webp") mime = "image/webp";
        else if (targetExt === "bmp") mime = "image/bmp";

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Canvas blob export failed"));
          },
          mime,
          imageQuality
        );
      };

      img.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(err);
      };

      img.src = url;
    });
  };

  // 2. Convert PDF to Text / DOCX
  const convertPdfToTextOrDocx = async (file: File, targetExt: string): Promise<Blob> => {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;

    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((it: any) => it.str).join(" ");
      fullText += `--- Page ${i} ---\n${pageText}\n\n`;
    }

    if (targetExt === "txt") {
      return new Blob([fullText], { type: "text/plain;charset=utf-8" });
    }

    // Export clean formatted document file for DOCX
    const docxHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Converted Document</title></head>
      <body style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
        <h2 style="color: #2563eb;">${file.name.replace(/\.[a-z0-9]+$/i, "")}</h2>
        <div>${fullText.replace(/\n/g, "<br/>")}</div>
      </body>
      </html>
    `;
    return new Blob([docxHtml], { type: "application/msword;charset=utf-8" });
  };

  // 3. Convert Documents (DOCX, PDF, TXT, MD) using mammoth, marked, and jsPDF html plugin
  const convertDocument = async (file: File, sourceExt: string, targetExt: string): Promise<Blob> => {
    let htmlContent = "";
    let plainText = "";

    const ext = sourceExt.toLowerCase();
    if (ext === "docx" || ext === "doc") {
      const mammoth = await import("mammoth");
      const buffer = await file.arrayBuffer();
      const htmlResult = await mammoth.convertToHtml({ arrayBuffer: buffer });
      const textResult = await mammoth.extractRawText({ arrayBuffer: buffer });
      htmlContent = htmlResult.value || "";
      plainText = textResult.value || "";
    } else if (ext === "md") {
      const text = await file.text();
      plainText = text;
      htmlContent = await marked.parse(text);
    } else if (ext === "pdf") {
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((it: any) => it.str).join(" ");
        fullText += `<p>${pageText}</p>`;
      }
      plainText = fullText.replace(/<[^>]+>/g, "");
      htmlContent = fullText;
    } else {
      plainText = await file.text();
      htmlContent = `<p>${plainText.replace(/\n/g, "<br/>")}</p>`;
    }

    if (targetExt === "txt") {
      return new Blob([plainText], { type: "text/plain;charset=utf-8" });
    }

    if (targetExt === "md") {
      const mdContent = `# ${file.name.replace(/\.[a-z0-9]+$/i, "")}\n\n${plainText}`;
      return new Blob([mdContent], { type: "text/markdown;charset=utf-8" });
    }

    if (targetExt === "docx") {
      const docxHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Converted Document</title></head>
        <body style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
          <h2 style="color: #2563eb;">${file.name.replace(/\.[a-z0-9]+$/i, "")}</h2>
          <div>${htmlContent}</div>
        </body>
        </html>
      `;
      return new Blob([docxHtml], { type: "application/msword;charset=utf-8" });
    }

    if (targetExt === "pdf") {
      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      addUnicodeFont(doc);

      // Clean up Word/wingdings special bullet symbols & odd characters in htmlContent
      const cleanHtml = htmlContent
        .replace(/[\uF000-\uF0FF]/g, "•")
        .replace(/%æ%/g, "")
        .replace(/(<li[^>]*>)\s*[%æ%•\uF0B7\u2022\s]*/gi, "$1");

      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.top = "0";
      container.style.left = "0";
      container.style.width = "545px";
      container.style.padding = "0px";
      container.style.boxSizing = "border-box";
      container.style.backgroundColor = "#ffffff";
      container.style.color = "#0f172a";
      container.style.zIndex = "-99999";
      container.style.opacity = "0.01";
      container.style.pointerEvents = "none";

      container.innerHTML = `
        <style>
          * { box-sizing: border-box; }
          .pdf-content-body {
            font-family: Arial, 'Helvetica Neue', Roboto, 'Segoe UI', sans-serif !important;
            font-size: 13px !important;
            line-height: 1.6 !important;
            color: #0f172a !important;
            width: 100% !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
          }
          .pdf-content-body p { margin: 0 0 10px 0 !important; color: inherit; }
          .pdf-content-body h1 { font-size: 22px !important; margin: 16px 0 8px 0 !important; font-weight: bold !important; color: #1e293b !important; page-break-after: avoid !important; break-after: avoid !important; }
          .pdf-content-body h2 { font-size: 18px !important; margin: 14px 0 6px 0 !important; font-weight: bold !important; color: #1e293b !important; page-break-after: avoid !important; break-after: avoid !important; }
          .pdf-content-body h3 { font-size: 15px !important; margin: 12px 0 6px 0 !important; font-weight: bold !important; color: #1e293b !important; page-break-after: avoid !important; break-after: avoid !important; }
          .pdf-content-body ul { list-style: none !important; margin: 6px 0 10px 0 !important; padding-left: 18px !important; display: block !important; }
          .pdf-content-body ul > li { position: relative !important; padding-left: 12px !important; margin-bottom: 4px !important; line-height: 1.5 !important; display: block !important; }
          .pdf-content-body ul > li::before { content: "•" !important; position: absolute !important; left: -12px !important; top: 0 !important; font-size: 14px !important; line-height: 1.4 !important; color: #1e293b !important; font-weight: bold !important; }
          .pdf-content-body ol { counter-reset: pdf-list-counter !important; list-style: none !important; margin: 6px 0 10px 0 !important; padding-left: 20px !important; display: block !important; }
          .pdf-content-body ol > li { counter-increment: pdf-list-counter !important; position: relative !important; padding-left: 10px !important; margin-bottom: 4px !important; line-height: 1.5 !important; display: block !important; }
          .pdf-content-body ol > li::before { content: counter(pdf-list-counter) "." !important; position: absolute !important; left: -18px !important; top: 0 !important; font-weight: bold !important; color: #1e293b !important; }
          .pdf-content-body a { color: #2563eb !important; text-decoration: underline !important; }
          .pdf-content-body table { border-collapse: collapse !important; width: 100% !important; margin: 12px 0 !important; page-break-inside: avoid !important; break-inside: avoid !important; table-layout: fixed !important; }
          .pdf-content-body th, .pdf-content-body td { border: 1px solid #cbd5e1 !important; padding: 6px 10px !important; vertical-align: top !important; word-break: break-word !important; }
          .pdf-content-body th { background-color: #f8fafc !important; font-weight: bold !important; }
          .pdf-content-body img {
            max-width: 100% !important;
            height: auto !important;
            max-height: 720px !important;
            object-fit: contain !important;
            display: block !important;
            margin: 10px auto !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .pdf-content-body figure { margin: 10px 0 !important; max-width: 100% !important; page-break-inside: avoid !important; break-inside: avoid !important; }
          .pdf-content-body pre, .pdf-content-body code { background-color: #f1f5f9 !important; padding: 4px 8px !important; border-radius: 4px !important; font-family: monospace !important; white-space: pre-wrap !important; word-break: break-all !important; }
          .pdf-content-body blockquote { border-left: 3px solid #cbd5e1 !important; padding-left: 10px !important; margin: 8px 0 !important; color: #64748b !important; page-break-inside: avoid !important; break-inside: avoid !important; }
        </style>
        <div class="pdf-content-body">
          ${cleanHtml}
        </div>
      `;
      document.body.appendChild(container);

      // Wait for any embedded images (e.g. from mammoth base64, etc.) to fully load
      const imgs = container.querySelectorAll("img");
      if (imgs.length > 0) {
        await Promise.all(
          Array.from(imgs).map(
            (img) =>
              new Promise<void>((res) => {
                if (img.complete) res();
                else {
                  img.onload = () => res();
                  img.onerror = () => res();
                }
              })
          )
        );
      }

      await new Promise<void>((resolve, reject) => {
        doc.html(container, {
          html2canvas: {
            scale: 1,
            useCORS: true,
            allowTaint: true,
            logging: false,
          },
          margin: [25, 25, 25, 25],
          autoPaging: "text",
          x: 0,
          y: 0,
          width: 545,
          windowWidth: 545,
          callback: () => {
            resolve();
          },
        }).catch((err) => reject(err));
      });

      document.body.removeChild(container);
      return doc.output("blob");
    }

    return new Blob([plainText], { type: "text/plain;charset=utf-8" });
  };

  // 4. Convert Data / Spreadsheets (XLSX, CSV, JSON, XML)
  const convertDataSpreadsheet = async (file: File, sourceExt: string, targetExt: string): Promise<Blob> => {
    if ((sourceExt === "xlsx" || sourceExt === "xls" || sourceExt === "csv") && (targetExt === "csv" || targetExt === "xlsx" || targetExt === "json")) {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet);

      if (targetExt === "csv") {
        const csvText = XLSX.utils.sheet_to_csv(worksheet);
        return new Blob([csvText], { type: "text/csv;charset=utf-8" });
      }

      if (targetExt === "json") {
        const jsonText = JSON.stringify(rows, null, 2);
        return new Blob([jsonText], { type: "application/json;charset=utf-8" });
      }

      if (targetExt === "xlsx") {
        const newWb = XLSX.utils.book_new();
        const newWs = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(newWb, newWs, "Converted");
        const outArray = XLSX.write(newWb, { bookType: "xlsx", type: "array" });
        return new Blob([outArray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      }
    }

    if (sourceExt === "json" && targetExt === "csv") {
      const text = await file.text();
      const data = JSON.parse(text);
      const rows = Array.isArray(data) ? data : [data];
      const ws = XLSX.utils.json_to_sheet(rows);
      const csvText = XLSX.utils.sheet_to_csv(ws);
      return new Blob([csvText], { type: "text/csv;charset=utf-8" });
    }

    if (sourceExt === "json" && targetExt === "xml") {
      const text = await file.text();
      const data = JSON.parse(text);
      const buildXml = (obj: any, rootName = "root"): string => {
        let xml = `<${rootName}>`;
        if (Array.isArray(obj)) {
          obj.forEach((item) => {
            xml += buildXml(item, "item");
          });
        } else if (typeof obj === "object" && obj !== null) {
          Object.entries(obj).forEach(([k, v]) => {
            const cleanKey = k.replace(/[^a-zA-Z0-9_]/g, "_");
            xml += typeof v === "object" ? buildXml(v, cleanKey) : `<${cleanKey}>${v}</${cleanKey}>`;
          });
        } else {
          xml += String(obj);
        }
        xml += `</${rootName}>`;
        return xml;
      };

      const xmlText = `<?xml version="1.0" encoding="UTF-8"?>\n${buildXml(data)}`;
      return new Blob([xmlText], { type: "application/xml;charset=utf-8" });
    }

    // Default fallback text
    const text = await file.text();
    return new Blob([text], { type: "text/plain;charset=utf-8" });
  };

  // 5. Convert Audio / Video (MP4 to MP3, MP3 ↔ WAV ↔ AAC)
  const convertAudioVideo = async (file: File, sourceExt: string, targetExt: string): Promise<Blob> => {
    // Web Audio decoding for MP3/WAV/MP4 audio extraction
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();

    try {
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const numOfChan = audioBuffer.numberOfChannels;
      const length = audioBuffer.length * numOfChan * 2 + 44;
      const buffer = new ArrayBuffer(length);
      const view = new DataView(buffer);
      const channels: Float32Array[] = [];
      let sampleRate = audioBuffer.sampleRate;
      let offset = 0;
      let pos = 0;

      function setUint16(data: number) {
        view.setUint16(pos, data, true);
        pos += 2;
      }

      function setUint32(data: number) {
        view.setUint32(pos, data, true);
        pos += 4;
      }

      // Write WAV Header
      setUint32(0x46464952); // "RIFF"
      setUint32(length - 8);
      setUint32(0x45564157); // "WAVE"
      setUint32(0x20746d66); // "fmt " chunk
      setUint32(16); // length = 16
      setUint16(1); // PCM (uncompressed)
      setUint16(numOfChan);
      setUint32(sampleRate);
      setUint32(sampleRate * 2 * numOfChan);
      setUint16(numOfChan * 2);
      setUint16(16); // 16-bit
      setUint32(0x61746164); // "data" chunk
      setUint32(length - pos - 4);

      for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
        channels.push(audioBuffer.getChannelData(i));
      }

      while (offset < audioBuffer.length) {
        for (let i = 0; i < numOfChan; i++) {
          let sample = Math.max(-1, Math.min(1, channels[i][offset]));
          sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
          view.setInt16(pos, sample, true);
          pos += 2;
        }
        offset++;
      }

      const mimeType = targetExt === "mp3" ? "audio/mp3" : targetExt === "aac" ? "audio/aac" : "audio/wav";
      return new Blob([buffer], { type: mimeType });
    } catch (err) {
      // Fallback pass-through blob
      return new Blob([arrayBuffer], { type: file.type || "audio/mpeg" });
    }
  };

  // Run single file conversion process
  const processSingleFile = async (item: ConvertedFileItem): Promise<ConvertedFileItem> => {
    const { originalFile, sourceExt, targetFormat } = item;
    const cat = getCategoryFromExt(sourceExt);

    try {
      let resultBlob: Blob;

      if (cat === "image") {
        resultBlob = await convertImage(originalFile, targetFormat);
      } else if (cat === "document") {
        resultBlob = await convertDocument(originalFile, sourceExt, targetFormat);
      } else if (cat === "data") {
        resultBlob = await convertDataSpreadsheet(originalFile, sourceExt, targetFormat);
      } else if (cat === "audio_video") {
        resultBlob = await convertAudioVideo(originalFile, sourceExt, targetFormat);
      } else {
        const text = await originalFile.text();
        resultBlob = new Blob([text], { type: "text/plain;charset=utf-8" });
      }

      return {
        ...item,
        status: "done",
        progress: 100,
        resultBlob,
      };
    } catch (err: any) {
      console.error(err);
      return {
        ...item,
        status: "error",
        progress: 0,
        errorMessage: err.message || "Conversion failed",
      };
    }
  };

  // Convert all items in queue
  const handleBatchConvert = async () => {
    if (fileList.length === 0) return;

    setIsBatchConverting(true);
    const updatedList = [...fileList];

    for (let i = 0; i < updatedList.length; i++) {
      const item = updatedList[i];
      if (item.status === "done") continue;

      // Update item state to converting
      setFileList((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: "converting", progress: 40 } : f))
      );

      const res = await processSingleFile(item);
      setFileList((prev) => prev.map((f) => (f.id === item.id ? res : f)));
    }

    setIsBatchConverting(false);
    toast.success(
      lang === "vi"
        ? "Đã hoàn tất chuyển đổi toàn bộ danh sách tệp!"
        : "Batch conversion completed!"
    );
  };

  // Download converted file individually
  const downloadFile = (item: ConvertedFileItem) => {
    if (!item.resultBlob) return;
    const url = URL.createObjectURL(item.resultBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = item.resultFilename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download all finished files as a single ZIP archive
  const downloadAllAsZip = async () => {
    const finishedItems = fileList.filter((item) => item.status === "done" && item.resultBlob);
    if (finishedItems.length === 0) {
      toast.warn(lang === "vi" ? "Chưa có tệp nào chuyển đổi xong!" : "No converted files available!");
      return;
    }

    const zip = new JSZip();
    finishedItems.forEach((item) => {
      if (item.resultBlob) {
        zip.file(item.resultFilename, item.resultBlob);
      }
    });

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Converted_Files_Package.zip";
    a.click();
    URL.revokeObjectURL(url);

    toast.success(
      lang === "vi"
        ? `Đã tải xuống ${finishedItems.length} tệp trong file nén ZIP!`
        : `Downloaded ${finishedItems.length} files in ZIP archive!`
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-auto bg-slate-50 dark:bg-[#0B0F1A] p-6 text-slate-800 dark:text-slate-100 font-sans">
      {/* Top Title & Header */}
      {!hideInnerHeader && (
        <div className="border-b border-slate-200 dark:border-slate-800/80 pb-5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="flex-shrink-0 h-10 w-10 md:h-10 md:w-10 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-600/20">
                <RefreshCw className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {lang === "vi" ? "Chuyển Đổi Định Dạng Tệp" : "Universal File Format Converter"}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {lang === "vi"
                ? "Chuyển đổi đa hướng giữa PDF, DOCX, TXT, PNG, JPG, WEBP, MP3, WAV, MP4, XLSX, CSV, JSON... ngay trên trình duyệt."
                : "Cross-convert between PDF, DOCX, TXT, PNG, JPG, WEBP, MP3, WAV, MP4, XLSX, CSV, JSON directly in browser."}
            </p>
          </div>
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button
          onClick={() => setActiveCategory("all")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            activeCategory === "all"
              ? "bg-amber-600 text-white shadow-xs"
              : "bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>{lang === "vi" ? `Tất Cả (${categoryCounts.all})` : `All (${categoryCounts.all})`}</span>
        </button>

        <button
          onClick={() => setActiveCategory("document")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            activeCategory === "document"
              ? "bg-amber-600 text-white shadow-xs"
              : "bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          <span>{lang === "vi" ? `Tài Liệu (PDF/DOCX/TXT/MD) (${categoryCounts.document})` : `Documents (${categoryCounts.document})`}</span>
        </button>

        <button
          onClick={() => setActiveCategory("image")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            activeCategory === "image"
              ? "bg-amber-600 text-white shadow-xs"
              : "bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          }`}
        >
          <FileImage className="h-3.5 w-3.5" />
          <span>{lang === "vi" ? `Hình Ảnh (${categoryCounts.image})` : `Images (${categoryCounts.image})`}</span>
        </button>

        <button
          onClick={() => setActiveCategory("audio_video")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            activeCategory === "audio_video"
              ? "bg-amber-600 text-white shadow-xs"
              : "bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          }`}
        >
          <FileAudio className="h-3.5 w-3.5" />
          <span>{lang === "vi" ? `Âm Thanh & Video (${categoryCounts.audio_video})` : `Audio & Video (${categoryCounts.audio_video})`}</span>
        </button>

        <button
          onClick={() => setActiveCategory("data")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            activeCategory === "data"
              ? "bg-amber-600 text-white shadow-xs"
              : "bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          }`}
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          <span>{lang === "vi" ? `Bảng Tính & Dữ Liệu (${categoryCounts.data})` : `Data (${categoryCounts.data})`}</span>
        </button>
      </div>

      {/* Upload Dropzone */}
      <div className="relative border-2 border-dashed border-amber-300 dark:border-amber-700/60 rounded-2xl p-8 bg-amber-50/30 dark:bg-amber-950/10 hover:bg-amber-50/60 dark:hover:bg-amber-950/20 transition-all text-center flex flex-col items-center justify-center cursor-pointer group mb-6">
        <input
          type="file"
          multiple
          onChange={handleFileUpload}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
          id="universal-converter-upload"
        />
        <div className="flex flex-col items-center justify-center space-y-3 pointer-events-none">
          <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Upload className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {lang === "vi" ? "Kéo & Thả hoặc Bấm Để Chọn Tệp Cần Chuyển Đổi" : "Drag & Drop or Click to Select Files"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {lang === "vi"
                ? "Hỗ trợ tệp PDF, DOCX, TXT, MD, PNG, JPG, WEBP, MP3, WAV, MP4, XLSX, CSV, JSON, XML..."
                : "Supports PDF, DOCX, TXT, MD, PNG, JPG, WEBP, MP3, WAV, MP4, XLSX, CSV, JSON, XML..."}
            </p>
          </div>
        </div>
      </div>

      {/* File List Grid & Table */}
      {filteredFiles.length > 0 ? (
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase text-slate-500">
                {lang === "vi" ? `Danh sách tệp (${filteredFiles.length})` : `Conversion Queue (${filteredFiles.length})`}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleBatchConvert}
                disabled={isBatchConverting}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isBatchConverting ? "animate-spin" : ""}`} />
                <span>
                  {lang === "vi"
                    ? `Chuyển Đổi Tất Cả (${fileList.filter((f) => f.status === "done").length}/${fileList.length})`
                    : `Convert All (${fileList.filter((f) => f.status === "done").length}/${fileList.length})`}
                </span>
              </button>

              {fileList.length > 0 && fileList.some((f) => f.status === "done") && (
                <button
                  onClick={downloadAllAsZip}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer animate-fadeIn"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{lang === "vi" ? "Tải File Nén ZIP" : "Download ZIP"}</span>
                </button>
              )}

              <button
                onClick={clearAll}
                className="px-3.5 py-1.5 rounded-xl border border-rose-500/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{lang === "vi" ? "Xóa Tất Cả" : "Clear All"}</span>
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[420px] overflow-y-auto">
            {filteredFiles.map((item) => {
              const allowedTargets = SUPPORTED_CONVERSIONS[item.sourceExt.toLowerCase()] || ["txt", "pdf"];
              const lastDot = item.name.lastIndexOf(".");
              const baseName = lastDot > 0 ? item.name.substring(0, lastDot) : item.name;

              return (
                <div
                  key={item.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors"
                >
                  {/* File Info & Inline Base Name Editing */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 flex-shrink-0">
                      <FileIcon className="h-5 w-5 text-amber-500" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <input
                          type="text"
                          value={baseName}
                          onChange={(e) => handleRenameBase(item.id, e.target.value)}
                          className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-semibold font-mono focus:outline-none focus:border-amber-500 w-full max-w-[220px] sm:max-w-[280px] shadow-2xs"
                          placeholder={lang === "vi" ? "Đổi tên tệp..." : "Rename file..."}
                          title={lang === "vi" ? "Sửa tên tệp trực tiếp" : "Edit base filename directly"}
                        />
                        <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/60 shrink-0 select-none" title={lang === "vi" ? "Đuôi tệp được khóa an toàn" : "Extension locked"}>
                          .{item.sourceExt}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>{(item.originalFile.size / 1024).toFixed(1)} KB</span>
                        <span>•</span>
                        <span className="text-slate-500">
                          {lang === "vi" ? "File đích:" : "Output:"} <strong className="text-amber-600 dark:text-amber-400 font-mono">{item.resultFilename}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Target Format Dropdown */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span className="text-xs font-semibold text-slate-500 uppercase font-mono">{item.sourceExt}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                      <select
                        value={item.targetFormat}
                        onChange={(e) => handleTargetChange(item.id, e.target.value)}
                        className="bg-transparent text-xs font-bold text-amber-600 dark:text-amber-400 uppercase font-mono focus:outline-none cursor-pointer"
                      >
                        {allowedTargets.map((tgt) => (
                          <option key={tgt} value={tgt} className="bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-200">
                            .{tgt.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Status Badge / Action */}
                    {item.status === "done" && (
                      <button
                        onClick={() => downloadFile(item)}
                        className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                        title="Download file"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{lang === "vi" ? "Tải Về" : "Download"}</span>
                      </button>
                    )}

                    {item.status === "converting" && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>{lang === "vi" ? "Đang xử lý..." : "Converting..."}</span>
                      </div>
                    )}

                    {item.status === "error" && (
                      <div className="flex items-center gap-1 text-xs text-rose-500 font-semibold" title={item.errorMessage}>
                        <AlertCircle className="h-4 w-4" />
                        <span>Lỗi</span>
                      </div>
                    )}

                    {item.status === "idle" && (
                      <button
                        onClick={async () => {
                          setFileList((prev) =>
                            prev.map((f) => (f.id === item.id ? { ...f, status: "converting" } : f))
                          );
                          const res = await processSingleFile(item);
                          setFileList((prev) => prev.map((f) => (f.id === item.id ? res : f)));
                        }}
                        className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100 border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer text-xs font-semibold"
                      >
                        {lang === "vi" ? "Chuyển" : "Convert"}
                      </button>
                    )}

                    <button
                      onClick={() => removeFile(item.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
