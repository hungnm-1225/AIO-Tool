import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { DirAggregatorState, ActiveModule } from "../types";
import { useI18n } from "../utils/i18n";
import {
  Upload,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  FolderOpen,
  ArrowUp,
  ArrowDown,
  Play,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  File as FileIcon,
  Sparkles,
  Download,
  CheckSquare,
  Square,
  Check,
  Edit2,
  CheckCircle2,
  XCircle,
  Folder,
  MinusCircle,
  RefreshCw,
  X,
  User,
  Scissors,
  Filter,
  Plus
} from "lucide-react";
import { toast } from "react-toastify";
import * as pdfjsLib from "pdfjs-dist";

// Initialize pdfjs-dist worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || "4.2.67"}/pdf.worker.min.mjs`;

interface DirectoryAggregatorProps {
  state?: DirAggregatorState;
  onChange?: (newState: Partial<DirAggregatorState>) => void;
}

interface UploadedFileWrapper {
  id: string;
  file: File;
  name: string;
  relativePath: string;
  extension: string;
  size: number;
  excluded: boolean;
}

interface ProgressInfo {
  fileName: string;
  phase: string;
  progress: number;
}

export default function DirectoryAggregator({
  state,
  onChange,
}: DirectoryAggregatorProps) {
  const { lang } = useI18n();
  
  // Local Settings from App-level State
  const searchQuery = state?.searchQuery ?? "";
  const diacriticSensitive = state?.diacriticSensitive ?? false;
  const caseSensitive = state?.caseSensitive ?? false;

  const setSearchQuery = (val: string) => onChange?.({ searchQuery: val });
  const setDiacriticSensitive = (val: boolean) => onChange?.({ diacriticSensitive: val });
  const setCaseSensitive = (val: boolean) => onChange?.({ caseSensitive: val });

  // Uploaded and Filtered Files State
  const [fileList, setFileList] = useState<UploadedFileWrapper[]>([]);
  const [fileTypeFilter, setFileTypeFilter] = useState<string>("all");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressInfo, setProgressInfo] = useState<ProgressInfo | null>(null);

  // Merged Master Data State
  const [mergedHeaders, setMergedHeaders] = useState<string[]>([]);
  const [mergedRows, setMergedRows] = useState<Record<string, string>[]>([]);
  
  // Merged Table UI State
  const [gridSearch, setGridSearch] = useState("");
  const [editingCell, setEditingCell] = useState<{ rowId: string; colName: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [gridPage, setGridPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // New Export, Deduplicate, and Auto-Generator options
  const [exportMode, setExportMode] = useState<"consolidated" | "individual">("consolidated");
  const [exportFormat, setExportFormat] = useState<"xlsx" | "csv">("xlsx");
  const [namingMode, setNamingMode] = useState<"original" | "system" | "custom" | "parent_folder">("system");
  const [customExportName, setCustomExportName] = useState("Consolidated_Report");
  const [excludeHeaders, setExcludeHeaders] = useState(false);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  
  // In-file deduplication columns
  const [dedupColumn, setDedupColumn] = useState("");

  // Auto column generation state
  const [genTargetCol, setGenTargetCol] = useState("Username");
  const [genSourceCol, setGenSourceCol] = useState("");
  const [addUniqueSuffix, setAddUniqueSuffix] = useState(true);

  // File exclusion filter state
  const [excludeQuery, setExcludeQuery] = useState("");

  // Normalization of Vietnamese tones helper
  const removeVietnameseTones = (str: string): string => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D");
  };

  // Strip Vietnamese diacritics and return run-together alpha-numeric
  const stripVietnameseDiacritics = (str: string): string => {
    const raw = removeVietnameseTones(str);
    return raw.replace(/[^a-zA-Z0-9]/g, ""); // Strip non-alphanumeric and spaces
  };

  // Directory upload handler
  const handleDirectoryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const wrappedFiles: UploadedFileWrapper[] = [];
    const allowedExtensions = [".xlsx", ".xls", ".csv", ".docx", ".pdf"];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relativePath = file.webkitRelativePath || file.name;
      const lowerName = file.name.toLowerCase();
      const extMatch = lowerName.match(/\.[a-z0-9]+$/);
      const ext = extMatch ? extMatch[0] : "";

      if (allowedExtensions.includes(ext)) {
        wrappedFiles.push({
          id: `file_${Date.now()}_${i}`,
          file,
          name: file.name,
          relativePath,
          extension: ext,
          size: file.size,
          excluded: false,
        });
      }
    }

    if (wrappedFiles.length === 0) {
      toast.warn(
        lang === "vi"
          ? "Không tìm thấy tệp .xlsx, .xls, .csv, .docx, hoặc .pdf nào hợp lệ."
          : "No valid .xlsx, .xls, .csv, .docx, or .pdf files found."
      );
      return;
    }

    setFileList((prev) => [...prev, ...wrappedFiles]);
    toast.success(
      lang === "vi"
        ? `Đã nạp ${wrappedFiles.length} tệp tin!`
        : `Loaded ${wrappedFiles.length} files!`
    );
  };

  // Check file match search queries (Support multiple comma or semicolon separated file names)
  const doesFileMatch = (fileName: string) => {
    if (!searchQuery.trim()) return true;

    // Split query by commas or semicolons
    const keywords = searchQuery
      .split(/[,;]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (keywords.length === 0) return true;

    let processedName = fileName;
    if (!caseSensitive) {
      processedName = processedName.toLowerCase();
    }
    if (!diacriticSensitive) {
      processedName = removeVietnameseTones(processedName);
    }

    return keywords.some((kw) => {
      let processedKw = kw;
      if (!caseSensitive) {
        processedKw = processedKw.toLowerCase();
      }
      if (!diacriticSensitive) {
        processedKw = removeVietnameseTones(processedKw);
      }
      return processedName.includes(processedKw);
    });
  };

  // List of files that match search query
  const filteredFiles = useMemo(() => {
    return fileList.filter((f) => {
      // 1. Check positive match
      const isMatched = doesFileMatch(f.name);
      if (!isMatched) return false;

      // 2. Check exclusion match
      if (excludeQuery.trim()) {
        const excludeKeywords = excludeQuery
          .split(/[,;]+/)
          .map((k) => k.trim())
          .filter((k) => k.length > 0);

        if (excludeKeywords.length > 0) {
          let processedName = f.name;
          if (!caseSensitive) {
            processedName = processedName.toLowerCase();
          }
          if (!diacriticSensitive) {
            processedName = removeVietnameseTones(processedName);
          }

          const isExcluded = excludeKeywords.some((kw) => {
            let processedKw = kw;
            if (!caseSensitive) {
              processedKw = processedKw.toLowerCase();
            }
            if (!diacriticSensitive) {
              processedKw = removeVietnameseTones(processedKw);
            }
            return processedName.includes(processedKw);
          });

          if (isExcluded) return false;
        }
      }

      // 3. Check file extension/type match
      if (fileTypeFilter !== "all") {
        const ext = f.name.toLowerCase().split(".").pop() || "";
        if (fileTypeFilter === "excel" && !["xlsx", "xls"].includes(ext)) {
          return false;
        }
        if (fileTypeFilter === "csv" && ext !== "csv") {
          return false;
        }
        if (fileTypeFilter === "word" && !["docx", "doc"].includes(ext)) {
          return false;
        }
        if (fileTypeFilter === "pdf" && ext !== "pdf") {
          return false;
        }
      }

      return true;
    });
  }, [fileList, searchQuery, excludeQuery, diacriticSensitive, caseSensitive, fileTypeFilter]);

  // Remove a single file from listing
  const removeFile = (id: string) => {
    setFileList((prev) => prev.filter((f) => f.id !== id));
  };

  // Toggle file exclusion status
  const toggleExclude = (id: string) => {
    setFileList((prev) =>
      prev.map((f) => (f.id === id ? { ...f, excluded: !f.excluded } : f))
    );
  };

  // File ordering handlers
  const moveFileOrder = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === filteredFiles.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    
    // Find absolute indices in fileList
    const absoluteIndex1 = fileList.findIndex((f) => f.id === filteredFiles[index].id);
    const absoluteIndex2 = fileList.findIndex((f) => f.id === filteredFiles[targetIndex].id);

    if (absoluteIndex1 === -1 || absoluteIndex2 === -1) return;

    const updated = [...fileList];
    const temp = updated[absoluteIndex1];
    updated[absoluteIndex1] = updated[absoluteIndex2];
    updated[absoluteIndex2] = temp;

    setFileList(updated);
  };

  // Demo Dataset Loader
  const loadDemoFolder = () => {
    // Generate dummy files with fake schemas
    const textData = `Mã Nhân Viên,Họ Tên,Chức Danh,Phòng Ban\nNV-001,Nguyễn Văn Linh,Kỹ Sư Hệ Thống,Phòng Kỹ Thuật\nNV-002,Lê Thị Thu Thảo,Phân Tích Viên,Phòng Kế Hoạch\nNV-001,Nguyễn Văn Linh,Trùng Lặp,Ngoại Lệ`;
    const blob1 = new Blob([textData], { type: "text/csv" });
    const file1 = new File([blob1], "HaNoi_NhanVien_PL1.csv");

    const textData2 = `Ma Nhan Vien,Ho Ten,Chuc Danh,Email\nNV-003,Trần Hữu Kiên,Trưởng Nhóm,kien.th@company.com\nNV-004,Đặng Minh Hoàng,Nhân Viên Lập Trình,hoang.dm@company.com\nNV-003,Trần Hữu Kiên,Trùng Lặp,kien.th@company.com`;
    const blob2 = new Blob([textData2], { type: "text/csv" });
    const file2 = new File([blob2], "HoChiMinh_NhanVien_PL2.csv");

    const mockFiles: UploadedFileWrapper[] = [
      {
        id: "demo_1",
        file: file1,
        name: file1.name,
        relativePath: "Mien_Bac/HaNoi_NhanVien_PL1.csv",
        extension: ".csv",
        size: file1.size,
        excluded: false,
      },
      {
        id: "demo_2",
        file: file2,
        name: file2.name,
        relativePath: "Mien_Nam/HoChiMinh_NhanVien_PL2.csv",
        extension: ".csv",
        size: file2.size,
        excluded: false,
      }
    ];

    setFileList(mockFiles);
    toast.success(
      lang === "vi"
        ? "Đã nạp bộ dữ liệu demo của 2 văn phòng (Hà Nội & Hồ Chí Minh) có kèm dòng trùng lặp!"
        : "Loaded demo datasets with duplicate rows for Ha Noi & Ho Chi Minh!"
    );
  };

  // Parse Excel/CSV using xlsx
  const parseXlsxOrCsv = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          if (!sheetName) {
            resolve([]);
            return;
          }
          const worksheet = workbook.Sheets[sheetName];
          const rawRows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: "" });
          resolve(rawRows);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  };

  // Parse Word DOCX using mammoth.js and parsing tables
  const parseDocxTable = async (file: File): Promise<any[]> => {
    const mammoth = await import("mammoth");
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
          const html = result.value;

          const container = document.createElement("div");
          container.innerHTML = html;
          const tables = container.querySelectorAll("table");

          if (tables.length === 0) {
            resolve([]);
            return;
          }

          const allExtractedRows: any[] = [];
          tables.forEach((table) => {
            const gridRows: string[][] = [];
            const trs = table.querySelectorAll("tr");
            trs.forEach((tr) => {
              const cells: string[] = [];
              const tds = tr.querySelectorAll("td, th");
              tds.forEach((td) => {
                cells.push(td.textContent?.trim() || "");
              });
              if (cells.length > 0) {
                gridRows.push(cells);
              }
            });

            if (gridRows.length > 1) {
              const headers = gridRows[0];
              const tableRows = gridRows.slice(1).map((row) => {
                const obj: Record<string, string> = {};
                headers.forEach((h, idx) => {
                  obj[h || `Column_${idx + 1}`] = row[idx] || "";
                });
                return obj;
              });
              allExtractedRows.push(...tableRows);
            }
          });

          resolve(allExtractedRows);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  };

  // Parse PDF with optional text extraction & Vietnamese OCR fallback
  const parsePdfTable = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const pdfData = new Uint8Array(buffer);
          const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

          let hasSelectableText = false;
          const rawLines: string[][] = [];

          // Phase 1: Try Text Extraction
          setProgressInfo({
            fileName: file.name,
            phase: lang === "vi" ? "Đang quét text có sẵn..." : "Extracting digital text...",
            progress: 10,
          });

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            if (textContent.items.length > 0) {
              const items = textContent.items.map((item: any) => ({
                text: item.str,
                x: item.transform[4],
                y: item.transform[5],
              }));

              if (items.some((it) => it.text.trim().length > 0)) {
                hasSelectableText = true;
              }

              // Reconstruct table layout by grouping items in same Y level
              const tolerance = 6;
              const rowsGrouped: any[][] = [];
              items.forEach((item) => {
                if (!item.text.trim()) return;
                const match = rowsGrouped.find(
                  (r) => Math.abs(r[0].y - item.y) <= tolerance
                );
                if (match) {
                  match.push(item);
                } else {
                  rowsGrouped.push([item]);
                }
              });

              rowsGrouped.sort((a, b) => b[0].y - a[0].y); // top down
              rowsGrouped.forEach((row) => {
                row.sort((a, b) => a.x - b.x); // left right
                rawLines.push(row.map((it) => it.text));
              });
            }
          }

          // Case A: Text was successfully found in the PDF
          if (hasSelectableText && rawLines.length > 1) {
            setProgressInfo({
              fileName: file.name,
              phase: lang === "vi" ? "Đã nạp văn bản kỹ thuật số." : "Digital text extracted.",
              progress: 100,
            });

            const headers = rawLines[0];
            const resultObj = rawLines.slice(1).map((row) => {
              const obj: Record<string, string> = {};
              headers.forEach((h, idx) => {
                obj[h || `Column_${idx + 1}`] = row[idx] || "";
              });
              return obj;
            });
            resolve(resultObj);
            return;
          }

          // Case B: Scanned PDF (Run Vietnamese OCR with Tesseract)
          toast.info(
            lang === "vi"
              ? `Phát hiện tài liệu quét. Bắt đầu OCR tiếng Việt trên ${pdf.numPages} trang...`
              : `Scanned PDF detected. Initiating Vietnamese OCR on ${pdf.numPages} pages...`
          );

          const ocrTextLines: string[][] = [];
          const { createWorker } = await import("tesseract.js");

          for (let i = 1; i <= pdf.numPages; i++) {
            setProgressInfo({
              fileName: file.name,
              phase:
                lang === "vi"
                  ? `Đang chuyển đổi trang ${i}/${pdf.numPages} sang ảnh...`
                  : `Rendering page ${i}/${pdf.numPages} to image...`,
              progress: Math.round(((i - 1) / pdf.numPages) * 100),
            });

            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const context = canvas.getContext("2d");

            if (context) {
              await page.render({ canvasContext: context, viewport } as any).promise;

              setProgressInfo({
                fileName: file.name,
                phase:
                  lang === "vi"
                    ? `Trang ${i}/${pdf.numPages}: Đang chạy OCR Tiếng Việt...`
                    : `Page ${i}/${pdf.numPages}: Running Vietnamese OCR...`,
                progress: Math.round(((i - 0.5) / pdf.numPages) * 100),
              });

              // Instantiate worker
              const worker = await createWorker("vie");
              const { data: { text } } = await worker.recognize(canvas);
              await worker.terminate();

              if (text) {
                const lines = text
                  .split("\n")
                  .map((l) => l.trim())
                  .filter((l) => l.length > 0);

                lines.forEach((line) => {
                  // Segment line into cells using double spacing/tabs
                  const cells = line
                    .split(/\s{2,}|\t/)
                    .map((c) => c.trim())
                    .filter((c) => c.length > 0);

                  if (cells.length > 0) {
                    ocrTextLines.push(cells);
                  }
                });
              }
            }
          }

          if (ocrTextLines.length > 1) {
            const headers = ocrTextLines[0];
            const resultObj = ocrTextLines.slice(1).map((row) => {
              const obj: Record<string, string> = {};
              headers.forEach((h, idx) => {
                obj[h || `Column_${idx + 1}`] = row[idx] || "";
              });
              return obj;
            });
            resolve(resultObj);
          } else {
            resolve([]);
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  };

  // Execution Master Engine (Extract & Merge)
  const executeExtractAndMerge = async () => {
    const activeFiles = filteredFiles.filter((f) => !f.excluded);
    if (activeFiles.length === 0) {
      toast.warn(
        lang === "vi"
          ? "Vui lòng chọn hoặc hiển thị ít nhất một tệp không bị loại trừ để gộp."
          : "Please include at least one non-excluded file to merge."
      );
      return;
    }

    setIsProcessing(true);
    setMergedHeaders([]);
    setMergedRows([]);
    setProgressInfo({
      fileName: "",
      phase: lang === "vi" ? "Khởi động quy trình..." : "Starting extraction...",
      progress: 0,
    });

    const parsedTables: { fileName: string; relativePath: string; rows: any[] }[] = [];

    try {
      for (let i = 0; i < activeFiles.length; i++) {
        const fileWrapper = activeFiles[i];
        const { file, name, relativePath, extension } = fileWrapper;

        setProgressInfo({
          fileName: name,
          phase: lang === "vi" ? `Đang giải mã cấu trúc tệp ${extension}...` : `Decoding ${extension} structure...`,
          progress: Math.round((i / activeFiles.length) * 100),
        });

        let rows: any[] = [];
        if (extension === ".xlsx" || extension === ".xls" || extension === ".csv") {
          rows = await parseXlsxOrCsv(file);
        } else if (extension === ".docx") {
          rows = await parseDocxTable(file);
        } else if (extension === ".pdf") {
          rows = await parsePdfTable(file);
        }

        if (rows && rows.length > 0) {
          parsedTables.push({
            fileName: name,
            relativePath,
            rows,
          });
        }
      }

      if (parsedTables.length === 0) {
        toast.error(
          lang === "vi"
            ? "Không thể trích xuất được bảng dữ liệu nào từ các tệp đã chọn."
            : "No tabular datasets could be parsed from the selected files."
        );
        setIsProcessing(false);
        setProgressInfo(null);
        return;
      }

      // Merge Columns Phase
      setProgressInfo({
        fileName: "",
        phase: lang === "vi" ? "Đang đồng bộ và căn chỉnh cột..." : "Aligning and merging headers...",
        progress: 95,
      });

      // Align header names case-insensitive, ignoring spaces
      const normHeaderToOriginal = new Map<string, string>();
      const masterHeadersSet = new Set<string>();

      parsedTables.forEach((table) => {
        table.rows.forEach((row) => {
          Object.keys(row).forEach((header) => {
            const normalized = header.toLowerCase().replace(/\s+/g, "");
            if (!normHeaderToOriginal.has(normalized)) {
              normHeaderToOriginal.set(normalized, header);
              masterHeadersSet.add(header);
            }
          });
        });
      });

      const masterHeadersList = Array.from(masterHeadersSet);
      
      let rowCounter = 0;
      const compiledRows = parsedTables.flatMap(({ fileName, relativePath, rows }) => {
        return rows.map((row) => {
          rowCounter++;
          const matchedRow: Record<string, string> = {
            "__row_id": `row_${Math.random().toString(36).substring(2, 11)}_${Date.now()}_${rowCounter}`,
            "__source_file_name": fileName,
            "__source_relative_path": relativePath,
          };

          // Seed default values
          masterHeadersList.forEach((h) => {
            matchedRow[h] = "";
          });

          // Match data based on normalized keys
          Object.entries(row).forEach(([originalKey, val]) => {
            const normalized = originalKey.toLowerCase().replace(/\s+/g, "");
            const canonicalKey = normHeaderToOriginal.get(normalized);
            if (canonicalKey) {
              matchedRow[canonicalKey] = String(val ?? "");
            }
          });

          return matchedRow;
        });
      });

      setMergedHeaders(masterHeadersList);
      setMergedRows(compiledRows);
      
      // Select first header as default deduplication column
      if (masterHeadersList.length > 0) {
        setDedupColumn(masterHeadersList[0]);
        setGenSourceCol(masterHeadersList[0]);
      }

      setGridPage(1);

      toast.success(
        lang === "vi"
          ? `Gộp thành công! Tạo ra bảng hợp nhất với ${compiledRows.length} bản ghi và ${masterHeadersList.length} cột.`
          : `Merged successfully! Created grid with ${compiledRows.length} records and ${masterHeadersList.length} columns.`
      );
    } catch (err: any) {
      console.error(err);
      toast.error(
        lang === "vi"
          ? `Thao tác thất bại: ${err.message || "Lỗi không xác định"}`
          : `Failed: ${err.message || "Unknown error"}`
      );
    } finally {
      setIsProcessing(false);
      setProgressInfo(null);
    }
  };

  // Cell Edit Commit
  const commitCellEdit = (rowId: string, colName: string) => {
    setMergedRows((prev) =>
      prev.map((row) => {
        if (row["__row_id"] === rowId) {
          return {
            ...row,
            [colName]: editValue,
          };
        }
        return row;
      })
    );
    setEditingCell(null);
  };

  // Delete Column Handler
  const deleteColumn = (colName: string) => {
    setMergedHeaders((prev) => prev.filter((h) => h !== colName));
    setMergedRows((prev) =>
      prev.map((row) => {
        const copy = { ...row };
        delete copy[colName];
        return copy;
      })
    );
    // Reset columns states if they are pointing to deleted columns
    if (dedupColumn === colName) setDedupColumn("");
    if (genSourceCol === colName) setGenSourceCol("");

    toast.success(
      lang === "vi"
        ? `Đã xóa cột "${colName}" thành công.`
        : `Successfully deleted column "${colName}".`
    );
  };

  // Delete Row Handler
  const deleteRow = (rowId: string, displayIndex: number) => {
    setMergedRows((prev) => prev.filter((row, idx) => {
      if (row["__row_id"] && rowId) {
        return row["__row_id"] !== rowId;
      }
      return (idx + 1) !== displayIndex;
    }));
    toast.success(
      lang === "vi" ? `Đã xóa dòng #${displayIndex}.` : `Deleted row #${displayIndex}.`
    );
  };

  // Remove rows with empty/blank values in a specific column
  const removeEmptyRowsInColumn = (colName: string) => {
    if (!colName) return;
    const initialCount = mergedRows.length;
    const filtered = mergedRows.filter((row) => {
      const val = row[colName];
      return val !== undefined && val !== null && String(val).trim() !== "";
    });
    const removedCount = initialCount - filtered.length;
    setMergedRows(filtered);
    setGridPage(1);
    toast.info(
      lang === "vi"
        ? `Đã loại bỏ ${removedCount} dòng trống tại cột "${colName}".`
        : `Removed ${removedCount} empty/blank rows in column "${colName}".`
    );
  };

  // Deduplicate rows in-file based on chosen column (loại bỏ trùng lặp nội bộ tệp)
  const executeInFileDeduplication = () => {
    if (!dedupColumn) {
      toast.warn(
        lang === "vi"
          ? "Vui lòng chọn một cột khóa để xác định trùng lặp nội bộ tệp."
          : "Please select a key column to identify in-file duplicates."
      );
      return;
    }

    const beforeCount = mergedRows.length;
    
    // Group records by their original source file name
    const groupedByFile: Record<string, typeof mergedRows> = {};
    mergedRows.forEach((row) => {
      const srcFile = row["__source_file_name"] || "unknown_source";
      if (!groupedByFile[srcFile]) {
        groupedByFile[srcFile] = [];
      }
      groupedByFile[srcFile].push(row);
    });

    // Run deduplication for each file separately
    const deduplicatedResults: typeof mergedRows = [];
    Object.values(groupedByFile).forEach((fileRows) => {
      const seenValues = new Set<string>();
      fileRows.forEach((row) => {
        const cellVal = String(row[dedupColumn] ?? "").trim();
        if (cellVal === "") {
          // Keep empty rows or skip? Keep them by default to avoid losing data, or filter out if desired.
          // Let's keep empty rows since they don't block. Or we can treat empty as a duplicate. Let's make it a strict seen value:
          deduplicatedResults.push(row);
        } else {
          if (!seenValues.has(cellVal)) {
            seenValues.add(cellVal);
            deduplicatedResults.push(row);
          }
        }
      });
    });

    const removedCount = beforeCount - deduplicatedResults.length;
    setMergedRows(deduplicatedResults);
    setGridPage(1);

    toast.success(
      lang === "vi"
        ? `Đã rà quét trùng lặp nội bộ từng tệp! Đã loại bỏ ${removedCount} bản ghi trùng.`
        : `Completed in-file deduplication! Excluded ${removedCount} duplicate rows.`
    );
  };

  // Auto-generate target column (like short-hash unique Username) based on selected source column
  const executeColumnGeneration = () => {
    if (!genSourceCol) {
      toast.warn(lang === "vi" ? "Hãy chọn cột nguồn!" : "Please select source column!");
      return;
    }
    if (!genTargetCol.trim()) {
      toast.warn(lang === "vi" ? "Hãy nhập tên cột mới cần tạo!" : "Please type target column name!");
      return;
    }

    const targetColName = genTargetCol.trim();

    // Add target column to headers if it doesn't exist
    if (!mergedHeaders.includes(targetColName)) {
      setMergedHeaders((prev) => [...prev, targetColName]);
    }

    // Populate values for all rows
    const updatedRows = mergedRows.map((row) => {
      const sourceVal = String(row[genSourceCol] ?? "").trim();
      let generatedValue = "";

      if (sourceVal) {
        // Extract prefix if it is an email format containing '@'
        let baseVal = sourceVal;
        if (baseVal.includes("@")) {
          baseVal = baseVal.split("@")[0].trim();
        }

        const cleanedName = stripVietnameseDiacritics(baseVal).toLowerCase();
        
        if (addUniqueSuffix) {
          // Generate a short 4-char unique base-36 hash that ensures no collision 
          // across runs, while keeping the username brief and human-friendly.
          const randHash = Math.random().toString(36).substring(2, 6);
          generatedValue = `${cleanedName}_${randHash}`;
        } else {
          generatedValue = cleanedName;
        }
      } else {
        if (addUniqueSuffix) {
          generatedValue = `user_${Math.random().toString(36).substring(2, 6)}`;
        } else {
          generatedValue = "";
        }
      }

      return {
        ...row,
        [targetColName]: generatedValue,
      };
    });

    setMergedRows(updatedRows);
    toast.success(
      lang === "vi"
        ? `Đã sinh cột tự động "${targetColName}" dựa trên cột "${genSourceCol}" thành công!`
        : `Automatically generated column "${targetColName}" based on "${genSourceCol}" successfully!`
    );
  };

  // Reset state
  const resetAllState = () => {
    setFileList([]);
    setMergedHeaders([]);
    setMergedRows([]);
    setGridSearch("");
    setEditingCell(null);
    toast.info(lang === "vi" ? "Đã dọn dẹp dữ liệu và nạp lại trạng thái." : "Cleared all data stores.");
  };

  // Sort & Filter Merged Grid
  const sortedAndFilteredGridRows = useMemo(() => {
    let result = [...mergedRows];

    // Grid Search
    if (gridSearch.trim()) {
      const q = gridSearch.toLowerCase();
      result = result.filter((row) =>
        Object.entries(row).some(([key, val]) => {
          if (key.startsWith("__")) return false; // Ignore source metadata cols
          return String(val).toLowerCase().includes(q);
        })
      );
    }

    // Sort
    if (sortField) {
      result.sort((a, b) => {
        const valA = a[sortField] || "";
        const valB = b[sortField] || "";
        return sortDirection === "asc"
          ? valA.localeCompare(valB, undefined, { numeric: true, sensitivity: "base" })
          : valB.localeCompare(valA, undefined, { numeric: true, sensitivity: "base" });
      });
    }

    return result;
  }, [mergedRows, gridSearch, sortField, sortDirection]);

  // Compute calculated export filename based on naming config & options
  const getExportFilename = (fileWrapper?: UploadedFileWrapper): string => {
    const rawCustom = customExportName.trim() || "Consolidated_Report";
    const extension = exportFormat === "csv" ? ".csv" : ".xlsx";

    // Fallback or specific file
    const targetFile = fileWrapper || (filteredFiles.filter((f) => !f.excluded)[0]);

    if (namingMode === "original") {
      if (targetFile) {
        return targetFile.name.replace(/\.[a-z0-9]+$/, "") + extension;
      }
      return "Consolidated_Original_Name" + extension;
    }

    if (namingMode === "custom") {
      return rawCustom.endsWith(extension) ? rawCustom : rawCustom + extension;
    }

    if (namingMode === "parent_folder") {
      if (targetFile) {
        const parts = targetFile.relativePath.split("/");
        if (parts.length > 1) {
          const folderName = parts[parts.length - 2];
          return `${folderName}_Report${extension}`;
        }
      }
      return "Root_Folder_Report" + extension;
    }

    // Default "system" mode
    return "Directory_Consolidated_Master" + extension;
  };

  // Download Consolidated or Batch Individual files
  const handleDownload = () => {
    if (mergedRows.length === 0) return;

    if (exportMode === "consolidated") {
      // 1. Consolidated mode
      const exportData = sortedAndFilteredGridRows.map((row) => {
        const cleanRow: Record<string, string> = {};
        
        // Add metadata columns if enabled
        if (includeMetadata) {
          cleanRow[lang === "vi" ? "Tệp Nguồn" : "Source File"] = row["__source_file_name"] || "";
          cleanRow[lang === "vi" ? "Đường Dẫn" : "Folder Path"] = row["__source_relative_path"] || "";
        }
        
        // Add content columns
        mergedHeaders.forEach((h) => {
          cleanRow[h] = row[h] || "";
        });
        return cleanRow;
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData, { skipHeader: excludeHeaders });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Consolidated_Data");

      const finalName = getExportFilename();
      if (exportFormat === "csv") {
        XLSX.writeFile(workbook, finalName, { bookType: "csv" });
      } else {
        XLSX.writeFile(workbook, finalName);
      }
      
      toast.success(
        lang === "vi"
          ? `Đã xuất bảng gộp thành công với tên "${finalName}"!`
          : `Consolidated data downloaded as "${finalName}"!`
      );
    } else {
      // 2. Individual Batch Download Mode (tải xuống hàng loạt file riêng biệt) - Nén thành file ZIP
      const activeFiles = filteredFiles.filter((f) => !f.excluded);
      const zip = new JSZip();
      let batchSuccessCount = 0;
      const extension = exportFormat === "csv" ? ".csv" : ".xlsx";

      activeFiles.forEach((fWrapper, idx) => {
        // Filter rows belonging only to this file
        const fileRows = sortedAndFilteredGridRows.filter(
          (row) => row["__source_file_name"] === fWrapper.name
        );

        if (fileRows.length > 0) {
          const exportData = fileRows.map((row) => {
            const cleanRow: Record<string, string> = {};
            mergedHeaders.forEach((h) => {
              cleanRow[h] = row[h] || "";
            });
            return cleanRow;
          });

          const worksheet = XLSX.utils.json_to_sheet(exportData, { skipHeader: excludeHeaders });
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

          // Compute individual file name according to naming rules
          let individualName = "";
          if (namingMode === "original") {
            individualName = fWrapper.name.replace(/\.[a-z0-9]+$/, "") + `_processed${extension}`;
          } else if (namingMode === "custom") {
            individualName = `${customExportName.trim() || "Export"}_${fWrapper.name.replace(/\.[a-z0-9]+$/, "")}${extension}`;
          } else if (namingMode === "parent_folder") {
            const parts = fWrapper.relativePath.split("/");
            const folderName = parts.length > 1 ? parts[parts.length - 2] : "Root";
            individualName = `${folderName}_${fWrapper.name.replace(/\.[a-z0-9]+$/, "")}${extension}`;
          } else {
            // System Auto Naming
            individualName = `Auto_${idx + 1}_${fWrapper.name.replace(/\.[a-z0-9]+$/, "")}${extension}`;
          }

          // Ghi thành ArrayBuffer và add vào file ZIP
          const bookType = exportFormat === "csv" ? "csv" : "xlsx";
          const fileBuffer = XLSX.write(workbook, { bookType: bookType, type: "array" });
          zip.file(individualName, fileBuffer);
          batchSuccessCount++;
        }
      });

      if (batchSuccessCount > 0) {
        zip.generateAsync({ type: "blob" }).then((content) => {
          const zipName = "Batch_Individual_Reports.zip";
          const url = URL.createObjectURL(content);
          const a = document.createElement("a");
          a.href = url;
          a.download = zipName;
          a.click();
          URL.revokeObjectURL(url);

          toast.success(
            lang === "vi"
              ? `Đã xuất hàng loạt thành công ${batchSuccessCount} tệp ${exportFormat.toUpperCase()} vào file nén "${zipName}"!`
              : `Successfully exported ${batchSuccessCount} ${exportFormat.toUpperCase()} files into compressed zip archive "${zipName}"!`
          );
        }).catch((err) => {
          console.error(err);
          toast.error(
            lang === "vi"
              ? "Có lỗi xảy ra khi tạo file nén zip."
              : "An error occurred while building the zip file."
          );
        });
      } else {
        toast.warn(
          lang === "vi"
            ? "Không có tệp dữ liệu nào khả dụng để xuất."
            : "No active files available to export."
        );
      }
    }
  };

  // Pagination bounds
  const totalPages = Math.ceil(sortedAndFilteredGridRows.length / pageSize) || 1;
  const paginatedGridRows = useMemo(() => {
    const startIndex = (gridPage - 1) * pageSize;
    return sortedAndFilteredGridRows.slice(startIndex, startIndex + pageSize);
  }, [sortedAndFilteredGridRows, gridPage, pageSize]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50 dark:bg-[#0B0F1A] text-slate-800 dark:text-slate-100 font-sans p-4 lg:p-6 transition-colors duration-200">
      {/* Upper Title Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-5 mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="h-9 w-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-600/20">
              <FolderOpen className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{lang === "vi" ? "Hợp Nhất Thư Mục & Quét OCR" : "Directory Data Aggregator & OCR Parser"}</span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {lang === "vi"
              ? "Tải lên thư mục, lọc tên tệp linh hoạt, quét bảng từ Word/Excel/PDF/OCR & tự sinh dữ liệu và loại bỏ trùng lặp."
              : "Recursive folders parsing, diacritic multi-search, auto data mapping, in-file deduplication & smart auto column generator."}
          </p>
        </div>
      </div>

      {/* Main Grid Layout split */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Side: Upload controls and smart configurations */}
        <div className="xl:col-span-5 space-y-6">
          
          {/* Section 1: Directory & File Upload Input Card */}
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm rounded-2xl p-6 transition-all">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Upload className="h-4.5 w-4.5 text-teal-500" />
              {lang === "vi" ? "1. Tải Lên Thư Mục / Tệp" : "1. Directory / File Upload"}
            </h3>

            {/* Custom Webkit directory & file uploader */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-teal-500/50 dark:hover:border-teal-500/40 rounded-xl p-6 text-center transition-all cursor-pointer relative bg-slate-100/50 dark:bg-slate-950/20 group">
                <input
                  type="file"
                  // @ts-ignore
                  webkitdirectory=""
                  directory=""
                  multiple
                  onChange={handleDirectoryUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  id="dir-uploader-agg"
                  title=""
                />
                <div className="flex flex-col items-center">
                  <div className="h-10 w-10 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 mb-2 group-hover:scale-105 transition-transform">
                    <Folder className="h-5 w-5 text-teal-500 dark:text-teal-400" />
                  </div>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {lang === "vi" ? "Chọn Thư Mục" : "Select Folder"}
                  </span>
                </div>
              </div>
              <div className="flex-1 border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-teal-500/50 dark:hover:border-teal-500/40 rounded-xl p-6 text-center transition-all cursor-pointer relative bg-slate-100/50 dark:bg-slate-950/20 group">
                <input
                  type="file"
                  multiple
                  accept=".xlsx,.xls,.csv,.docx,.pdf"
                  onChange={handleDirectoryUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  id="file-uploader-agg"
                  title=""
                />
                <div className="flex flex-col items-center">
                  <div className="h-10 w-10 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 mb-2 group-hover:scale-105 transition-transform">
                    <FileIcon className="h-5 w-5 text-teal-500 dark:text-teal-400" />
                  </div>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {lang === "vi" ? "Chọn Nhiều Tệp" : "Select Files"}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-center mt-3">
              <span className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                {lang === "vi"
                  ? "Hỗ trợ định dạng .xlsx, .xls, .csv, .docx, .pdf"
                  : "Supports Excel, CSV, Word docs, and PDF tables"}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-4">
              <button
                onClick={loadDemoFolder}
                className="px-4 py-2 bg-teal-50 dark:bg-teal-600/10 border border-teal-200 dark:border-teal-500/20 hover:bg-teal-100 dark:hover:bg-teal-600/20 text-teal-600 dark:text-teal-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                {lang === "vi" ? "Chạy Dữ Liệu Demo" : "Load Sample Demo Folders"}
              </button>
              
              {fileList.length > 0 && (
                <button
                  onClick={resetAllState}
                  className="px-4 py-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  {lang === "vi" ? "Xóa Đặt Lại Tệp" : "Clear All Loaded"}
                </button>
              )}
            </div>
          </div>

          {/* Section 2: Smart Filter & Multi Keyword Query */}
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm rounded-2xl p-6 transition-all">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Search className="h-4.5 w-4.5 text-teal-500" />
              {lang === "vi" ? "2. Lọc Đa Tên Tệp Linh Hoạt" : "2. Smart Multi-Keyword Filtering"}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    {lang === "vi"
                      ? "Tìm kiếm cùng lúc nhiều từ khóa (ngăn cách bằng dấu phẩy ',' hoặc ';')"
                      : "Search multiple keywords simultaneously (separated by ',' or ';')"}
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder={
                        lang === "vi"
                          ? "Ví dụ: phu luc 1, PL2; hopdong..."
                          : "Example: phu luc 1, PL2; contract..."
                      }
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/10 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-slate-800 dark:text-slate-200 text-sm pl-10 pr-4 py-2.5 rounded-xl transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    {lang === "vi" ? "Lọc theo loại tệp" : "Filter by file type"}
                  </label>
                  <select
                    value={fileTypeFilter}
                    onChange={(e) => setFileTypeFilter(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/10 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-slate-800 dark:text-slate-200 text-sm px-3.5 py-2.5 rounded-xl transition-all cursor-pointer font-medium"
                  >
                    <option value="all">{lang === "vi" ? "Tất cả loại tệp" : "All file types"}</option>
                    <option value="excel">Excel (.xlsx, .xls)</option>
                    <option value="csv">CSV (.csv)</option>
                    <option value="word">Word (.docx, .doc)</option>
                    <option value="pdf">PDF (.pdf)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-500 dark:text-rose-400 mb-1.5 flex items-center gap-1.5">
                  <MinusCircle className="h-3.5 w-3.5" />
                  {lang === "vi"
                    ? "Loại trừ các file chứa từ khóa (ngăn cách bằng dấu phẩy ',' hoặc ';')"
                    : "Exclude files containing keywords (separated by ',' or ';')"}
                </label>
                <div className="relative">
                  <XCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-400 dark:text-rose-500/80" />
                  <input
                    type="text"
                    placeholder={
                      lang === "vi"
                        ? "Ví dụ: nhap, test, backup..."
                        : "Example: draft, test, backup..."
                    }
                    value={excludeQuery}
                    onChange={(e) => setExcludeQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/10 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-slate-800 dark:text-slate-200 text-sm pl-10 pr-4 py-2.5 rounded-xl transition-all"
                  />
                </div>
              </div>

              {/* Sensitivity checkboxes */}
              <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-white/5 rounded-xl p-3.5 space-y-2.5">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={diacriticSensitive}
                    onChange={(e) => setDiacriticSensitive(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950"
                  />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                    {lang === "vi"
                      ? "Phân biệt dấu tiếng Việt (Diacritic Sensitive)"
                      : "Vietnamese Diacritic Sensitive matching"}
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={caseSensitive}
                    onChange={(e) => setCaseSensitive(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950"
                  />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                    {lang === "vi"
                      ? "Phân biệt viết hoa (Case Sensitive)"
                      : "Case Sensitive search matching"}
                  </span>
                </label>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 italic leading-relaxed">
                {lang === "vi"
                  ? "💡 Khi tắt phân biệt dấu, 'phu luc' sẽ khớp với 'Phụ lục', 'Phú Lực', 'PHỤ LỤC'."
                  : "💡 Turn off diacritic matching to easily query Vietnamese tones using raw English alphabet keys."}
              </div>
            </div>
          </div>

          {/* Section 3: In-file Deduplicate & Auto Generator Columns */}
          {mergedRows.length > 0 && (
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm rounded-2xl p-6 transition-all space-y-6">
              
              {/* Tool A: In-file Deduplication */}
              <div className="border-b border-slate-100 dark:border-white/5 pb-4.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-3 flex items-center gap-1.5">
                  <Scissors className="h-3.5 w-3.5" />
                  {lang === "vi" ? "A. Loại Trùng Lặp Nội Bộ File" : "A. In-File Deduplication"}
                </h4>
                
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                  {lang === "vi"
                    ? "Loại bỏ các dòng dữ liệu trùng lặp dựa trên một cột khóa, hoạt động độc lập trong phạm vi nội bộ của từng file nguồn."
                    : "Remove duplicates on a selected key column. Runs safely scoped within each individual source file."}
                </p>

                <div className="flex gap-2.5">
                  <select
                    value={dedupColumn}
                    onChange={(e) => setDedupColumn(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs p-2 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none"
                  >
                    <option value="">-- {lang === "vi" ? "Chọn Cột Khóa" : "Select Key Column"} --</option>
                    {mergedHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={executeInFileDeduplication}
                    className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-teal-600/10 cursor-pointer whitespace-nowrap"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {lang === "vi" ? "Chạy Lọc Trùng" : "Deduplicate"}
                  </button>
                </div>
              </div>

              {/* Tool B: Auto Unique Username Generator */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-3 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {lang === "vi" ? "B. Tự Động Sinh Cột Mới (Unique Username)" : "B. Auto Username Column Generator"}
                </h4>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                  {lang === "vi"
                    ? "Tự tạo cột thông tin dạng username viết liền không dấu từ một cột gốc. Hệ thống tự động tách lấy tiền tố email (nếu có định dạng chứa '@') và tuỳ chọn bật/tắt sinh thêm kí tự ngẫu nhiên phía sau để đảm bảo thông tin duy nhất (unique)."
                    : "Create unique lowercase usernames. Automatically extracts the email prefix (if input contains '@') and features a toggle to append a unique random suffix."}
                </p>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                        {lang === "vi" ? "Cột gốc họ tên:" : "Source Name Column:"}
                      </label>
                      <select
                        value={genSourceCol}
                        onChange={(e) => setGenSourceCol(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs p-2 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none"
                      >
                        <option value="">-- {lang === "vi" ? "Chọn Cột" : "Select Col"} --</option>
                        {mergedHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                        {lang === "vi" ? "Tên cột mới tạo:" : "Target New Col:"}
                      </label>
                      <input
                        type="text"
                        value={genTargetCol}
                        onChange={(e) => setGenTargetCol(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs px-2 py-1.5 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none"
                        placeholder="Username"
                      />
                    </div>
                  </div>

                  {/* Suffix uniqueness toggle */}
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-white/5 rounded-xl">
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={addUniqueSuffix}
                        onChange={(e) => setAddUniqueSuffix(e.target.checked)}
                        className="rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950 cursor-pointer"
                      />
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors cursor-pointer">
                        {lang === "vi"
                          ? "Thêm hậu tố ngẫu nhiên để đảm bảo duy nhất (Unique suffix)"
                          : "Append random hash suffix for uniqueness (Unique suffix)"}
                      </span>
                    </label>
                  </div>

                  <button
                    onClick={executeColumnGeneration}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/10 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {lang === "vi" ? "Sinh cột tự động ngay" : "Generate Column Values"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: File Queue list & Extract button, output grid */}
        <div className="xl:col-span-7 space-y-6">
          
          {/* Section 4: File Selection and Queue Control */}
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm rounded-2xl p-6 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                  <FileText className="h-4.5 w-4.5 text-teal-500" />
                  {lang === "vi" ? "Hàng Đợi File Thư Mục Quét Được" : "Parsed Directory File Queue"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {lang === "vi"
                    ? `Đang lọc hiển thị ${filteredFiles.length} tệp khớp bộ lọc (Tổng ${fileList.length} tệp nạp)`
                    : `Showing ${filteredFiles.length} match(es) (Total ${fileList.length} imported folder items)`}
                </p>
              </div>

              {filteredFiles.length > 0 && (
                <button
                  onClick={executeExtractAndMerge}
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-teal-600/10"
                >
                  <Play className="h-3.5 w-3.5" />
                  {lang === "vi" ? "Trích Xuất & Gộp Ngay" : "Extract & Merge Folder"}
                </button>
              )}
            </div>

            {/* OCR/Parsing Progress Info Panel */}
            {isProcessing && progressInfo && (
              <div className="mb-6 p-4 bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-500/20 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-teal-600 dark:text-teal-400 truncate max-w-xs">{progressInfo.fileName || "Directory Aggregator"}</span>
                  <span className="text-slate-700 dark:text-slate-300">{progressInfo.progress}%</span>
                </div>
                <div className="text-[11px] text-teal-500 dark:text-teal-300 font-medium">{progressInfo.phase}</div>
                <div className="w-full bg-slate-200 dark:bg-slate-900 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-teal-600 dark:bg-teal-500 h-full transition-all duration-300"
                    style={{ width: `${progressInfo.progress}%` }}
                  />
                </div>
              </div>
            )}

            {filteredFiles.length === 0 ? (
              <div className="border border-slate-200 dark:border-white/10 rounded-xl p-10 text-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950/15">
                <FileIcon className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2.5" />
                <p className="text-xs">
                  {lang === "vi"
                    ? "Chưa nạp thư mục nào. Tải lên thư mục local ở cột trái hoặc nạp dữ liệu Demo mẫu!"
                    : "File queue is empty. Upload folder or click sample dataset to explore!"}
                </p>
              </div>
            ) : (
              <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {filteredFiles.map((item, idx) => {
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-3 border rounded-xl transition-all ${
                        item.excluded
                          ? "bg-slate-100/40 dark:bg-slate-950/10 border-slate-200 dark:border-white/5 opacity-50"
                          : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Exclude Toggle */}
                        <button
                          onClick={() => toggleExclude(item.id)}
                          className="text-slate-400 dark:text-slate-500 hover:text-teal-500 transition-colors cursor-pointer"
                          title={item.excluded ? "Include" : "Exclude"}
                        >
                          {item.excluded ? (
                            <Square className="h-4.5 w-4.5" />
                          ) : (
                            <CheckSquare className="h-4.5 w-4.5 text-teal-600 dark:text-teal-400" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/5 text-[9px] uppercase font-bold text-teal-600 dark:text-teal-400">
                              {item.extension.replace(".", "")}
                            </span>
                            <span className="truncate" title={item.name}>
                              {item.name}
                            </span>
                          </div>
                          
                          {/* Folder path breadcrumb / tooltip */}
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate font-mono" title={item.relativePath}>
                            {item.relativePath.split("/").slice(0, -1).join(" ❯ ") || "Root"}
                          </div>
                        </div>
                      </div>

                      {/* Controls to reorder and remove file */}
                      <div className="flex items-center gap-1.5 ml-2">
                        <button
                          onClick={() => moveFileOrder(idx, "up")}
                          disabled={idx === 0}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-white/5 rounded text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-20 cursor-pointer"
                          title="Move Up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => moveFileOrder(idx, "down")}
                          disabled={idx === filteredFiles.length - 1}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-white/5 rounded text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-20 cursor-pointer"
                          title="Move Down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => removeFile(item.id)}
                          className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded text-slate-400 dark:text-slate-500 hover:text-rose-500 cursor-pointer"
                          title="Remove from List"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 5: Download configuration setting controls */}
          {mergedRows.length > 0 && (
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm rounded-2xl p-6 transition-all">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 mb-4 flex items-center gap-2">
                <Download className="h-4.5 w-4.5 text-teal-500" />
                {lang === "vi" ? "Xuất Bản & Thiết Lập Tên File" : "Export & Custom Filename Config"}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Mode Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    {lang === "vi" ? "Chế độ tải xuống:" : "Export Download Mode:"}
                  </label>
                  <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl gap-1">
                    <button
                      onClick={() => setExportMode("consolidated")}
                      className={`flex-1 text-center py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        exportMode === "consolidated"
                          ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      {lang === "vi" ? "Gộp" : "Consolidated"}
                    </button>
                    <button
                      onClick={() => setExportMode("individual")}
                      className={`flex-1 text-center py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        exportMode === "individual"
                          ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      {lang === "vi" ? "Hàng loạt" : "Batch"}
                    </button>
                  </div>
                </div>

                {/* Format Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    {lang === "vi" ? "Định dạng xuất:" : "Export Format:"}
                  </label>
                  <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl gap-1">
                    <button
                      onClick={() => setExportFormat("xlsx")}
                      className={`flex-1 text-center py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        exportFormat === "xlsx"
                          ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      XLSX
                    </button>
                    <button
                      onClick={() => setExportFormat("csv")}
                      className={`flex-1 text-center py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        exportFormat === "csv"
                          ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      CSV
                    </button>
                  </div>
                </div>

                {/* Naming Mode Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    {lang === "vi" ? "Kiểu đặt tên tệp:" : "Filename Naming Type:"}
                  </label>
                  <select
                    value={namingMode}
                    onChange={(e) => setNamingMode(e.target.value as any)}
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs px-3 py-2 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none"
                  >
                    <option value="system">
                      {lang === "vi" ? "Tên hệ thống tự đặt" : "System default assignment"}
                    </option>
                    <option value="original">
                      {lang === "vi" ? "Dùng tên cũ gốc đang có" : "Use existing original name"}
                    </option>
                    <option value="custom">
                      {lang === "vi" ? "Người dùng tự đặt tên" : "Custom user-defined name"}
                    </option>
                    <option value="parent_folder">
                      {lang === "vi" ? "Đặt tên theo thư mục chứa file" : "Name by parent folder of file"}
                    </option>
                  </select>
                </div>
              </div>

              {/* Conditional custom name input */}
              {namingMode === "custom" && (
                <div className="mt-4">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    {lang === "vi" ? "Nhập tên tệp bạn muốn đặt:" : "Type desired custom filename:"}
                  </label>
                  <input
                    type="text"
                    value={customExportName}
                    onChange={(e) => setCustomExportName(e.target.value)}
                    placeholder="Consolidated_Report"
                    className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/10 text-xs px-3 py-2 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              )}

              {/* Option to exclude column headers in downloaded files */}
              <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-white/5 rounded-xl space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={excludeHeaders}
                    onChange={(e) => setExcludeHeaders(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-950 dark:group-hover:text-white transition-colors cursor-pointer">
                    {lang === "vi"
                      ? "Bỏ qua dòng tiêu đề cột khi xuất tệp (Chỉ xuất dòng dữ liệu)"
                      : "Exclude column headers on export (Data row entries only)"}
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group border-t border-slate-200/60 dark:border-white/5 pt-2.5">
                  <input
                    type="checkbox"
                    checked={includeMetadata}
                    onChange={(e) => setIncludeMetadata(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-950 dark:group-hover:text-white transition-colors cursor-pointer">
                    {lang === "vi"
                      ? "Bao gồm cột thông tin tệp nguồn & đường dẫn thư mục"
                      : "Include Source File & Folder Path metadata columns"}
                  </span>
                </label>
              </div>

              {/* File Preview Label */}
              <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-white/5 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  {lang === "vi" ? "Tên tệp sẽ tải:" : "Export Sample File Name:"}
                </span>
                <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                  {exportMode === "consolidated" 
                    ? getExportFilename() 
                    : `${namingMode === "parent_folder" ? "[ParentFolder]_" : ""}[OriginalName]_processed.xlsx`}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 6: Merged Table Master Sheet Grid */}
      {mergedRows.length > 0 && (
        <div className="mt-8 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm rounded-2xl p-6 transition-all">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
                {lang === "vi" ? "Bảng Dữ Liệu Hợp Nhất" : "Unified Merged Master Grid"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {lang === "vi"
                  ? `Đang hiển thị ${sortedAndFilteredGridRows.length} dòng kết quả (Gốc: ${mergedRows.length} dòng)`
                  : `Showing ${sortedAndFilteredGridRows.length} filter record lines (Raw total: ${mergedRows.length} lines)`}
              </p>
            </div>

            {/* Grid control items */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Internal grid text search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={lang === "vi" ? "Tìm kiếm nội dung ô..." : "Search cells..."}
                  value={gridSearch}
                  onChange={(e) => {
                    setGridSearch(e.target.value);
                    setGridPage(1);
                  }}
                  className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/10 text-xs px-3 py-1.5 pl-8 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Master Download trigger Button */}
              <button
                onClick={handleDownload}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/10 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                {exportMode === "consolidated" 
                  ? (lang === "vi" ? `Tải File Gộp ${exportFormat.toUpperCase()}` : `Download Consolidated ${exportFormat.toUpperCase()}`)
                  : (lang === "vi" ? "Tải Hàng Loạt Files" : "Batch Download Files")}
              </button>
            </div>
          </div>

          {/* Master Responsive Grid Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-slate-950/20">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                  <th className="p-3 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap text-center">#</th>
                  <th className="p-3 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap min-w-[140px]">
                    {lang === "vi" ? "Nguồn File" : "Source File"}
                  </th>
                  {mergedHeaders.map((header) => {
                    const isSorted = sortField === header;
                    return (
                      <th
                        key={header}
                        className="p-3 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider whitespace-nowrap border-l border-slate-200 dark:border-white/5 min-w-[140px]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span 
                            onClick={() => {
                              if (sortField === header) {
                                setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                              } else {
                                setSortField(header);
                                setSortDirection("asc");
                              }
                            }}
                            className="cursor-pointer hover:text-teal-500 flex items-center gap-1 flex-1 text-left select-none"
                          >
                            {header}
                            <span className="text-[10px] text-slate-400">
                              {isSorted ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}
                            </span>
                          </span>

                          {/* Action panel triggers for specific header columns */}
                          <div className="flex items-center gap-1 opacity-60 hover:opacity-100">
                            {/* Filter out empty row lines action */}
                            <button
                              onClick={() => removeEmptyRowsInColumn(header)}
                              className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 rounded cursor-pointer transition-colors"
                              title={lang === "vi" ? `Xóa hàng trống cột ${header}` : `Clear empty rows for ${header}`}
                            >
                              <Filter className="h-3 w-3 text-teal-500" />
                            </button>
                            {/* Delete column button */}
                            <button
                              onClick={() => deleteColumn(header)}
                              className="p-1 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-slate-500 dark:text-slate-400 hover:text-rose-500 rounded cursor-pointer transition-colors"
                              title={lang === "vi" ? "Xóa cột này" : "Delete column"}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </th>
                    );
                  })}
                  <th className="p-3 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap text-center min-w-[60px] border-l border-slate-200 dark:border-white/5">
                    {lang === "vi" ? "Hành động" : "Actions"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedGridRows.map((row, relativeIdx) => {
                  const absoluteIdx = (gridPage - 1) * pageSize + relativeIdx;
                  return (
                    <tr
                      key={row["__row_id"] || absoluteIdx}
                      className="border-b border-slate-200 dark:border-b-white/5 hover:bg-slate-100/50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Index row */}
                      <td className="p-3 text-slate-400 dark:text-slate-500 font-mono font-medium text-center border-r border-slate-200 dark:border-r-white/5">{absoluteIdx + 1}</td>
                      
                      {/* Origin tracking info metadata column */}
                      <td className="p-3">
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px]" title={row["__source_file_name"]}>
                          {row["__source_file_name"]}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[150px] mt-0.5" title={row["__source_relative_path"]}>
                          {row["__source_relative_path"]}
                        </div>
                      </td>

                      {/* Header matching data columns */}
                      {mergedHeaders.map((header) => {
                        const isEditing = editingCell?.rowId === row["__row_id"] && editingCell?.colName === header;
                        const cellValue = row[header] ?? "";

                        return (
                          <td
                            key={header}
                            className="p-3 border-l border-slate-200 dark:border-l-white/5 cursor-pointer max-w-[180px] group relative"
                            onDoubleClick={() => {
                              setEditingCell({ rowId: row["__row_id"], colName: header });
                              setEditValue(cellValue);
                            }}
                          >
                            {isEditing ? (
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => commitCellEdit(row["__row_id"], header)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") commitCellEdit(row["__row_id"], header);
                                  if (e.key === "Escape") setEditingCell(null);
                                }}
                                autoFocus
                                className="w-full bg-teal-50 dark:bg-teal-950 text-slate-800 dark:text-teal-100 border border-teal-500 rounded px-1.5 py-0.5 text-xs focus:outline-none"
                              />
                            ) : (
                              <div className="flex items-center justify-between gap-1.5 group-hover:text-teal-600 dark:group-hover:text-teal-300">
                                <span className="truncate" title={cellValue}>
                                  {cellValue || <span className="text-slate-300 dark:text-slate-700 italic">-</span>}
                                </span>
                                <Edit2 className="h-2.5 w-2.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* Actions column to delete row */}
                      <td className="p-3 border-l border-slate-200 dark:border-l-white/5 text-center">
                        <button
                          onClick={() => deleteRow(row["__row_id"], absoluteIdx + 1)}
                          className="p-1 hover:bg-rose-50 dark:hover:bg-rose-500/15 rounded text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                          title={lang === "vi" ? "Xóa dòng này" : "Delete row"}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Grid pagination control toolbar */}
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {lang === "vi"
                ? `Đang hiển thị dòng ${(gridPage - 1) * pageSize + 1} - ${Math.min(
                    gridPage * pageSize,
                    sortedAndFilteredGridRows.length
                  )} trong tổng số ${sortedAndFilteredGridRows.length} dòng.`
                : `Showing ${(gridPage - 1) * pageSize + 1} to ${Math.min(
                    gridPage * pageSize,
                    sortedAndFilteredGridRows.length
                  )} of ${sortedAndFilteredGridRows.length} entries.`}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                {lang === "vi" ? "Hiển thị:" : "Page size:"}
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setGridPage(1);
                }}
                className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-xs p-1 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                {[5, 10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setGridPage((prev) => Math.max(prev - 1, 1))}
                  disabled={gridPage === 1}
                  className="p-1.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 disabled:opacity-20 rounded-lg cursor-pointer transition-all"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs text-slate-700 dark:text-slate-200 font-mono font-semibold">
                  {gridPage} / {totalPages}
                </span>
                <button
                  onClick={() => setGridPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={gridPage === totalPages}
                  className="p-1.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 disabled:opacity-20 rounded-lg cursor-pointer transition-all"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
