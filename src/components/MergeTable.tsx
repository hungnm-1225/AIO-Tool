import React, { useState, useMemo } from "react";
import { XLSX } from "../utils/xlsxHelper";
import { DirAggregatorState } from "../types";
import { useI18n } from "../utils/i18n";
import {
  Upload,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  FolderOpen,
  ArrowLeftRight,
  Settings,
  HelpCircle,
  Check,
  Plus,
  Download,
  Database,
  Grid,
  Sparkles,
  FileSpreadsheet,
  X,
  Eye,
  Star,
  FileText
} from "lucide-react";
import { toast } from "react-toastify";
import DirectoryAggregator from "./DirectoryAggregator";

interface MergeTableProps {
  state?: DirAggregatorState;
  onChange?: (newState: Partial<DirAggregatorState>) => void;
  hideInnerHeader?: boolean;
}

interface KeyMergeFile {
  id: string;
  name: string;
  size: number;
  file: File;
  headers: string[];
  rows: any[];
  selectedKeyCol: string;
  rawAoa?: any[][];
  headerRowIndex?: number;
}

export default function MergeTable({
  state,
  onChange,
  hideInnerHeader = false,
}: MergeTableProps) {
  const { lang, t } = useI18n();

  // Active Tab Mode: "common" (Directory stacking) vs "key-based" (Column joining)
  const [activeTab, setActiveTab] = useState<"common" | "key-based">("common");

  // ==========================================
  // STATE FOR KEY-BASED MERGE
  // ==========================================
  const [uploadedFiles, setUploadedFiles] = useState<KeyMergeFile[]>([]);
  const [unifiedKeyName, setUnifiedKeyName] = useState("Email");
  const [joinStrategy, setJoinStrategy] = useState<"inner" | "outer">("outer");
  const [isProcessing, setIsProcessing] = useState(false);

  // Template file & preamble state for Key-based Merge
  const [keyMergeTemplateFileId, setKeyMergeTemplateFileId] = useState<string | null>(null);
  const [keyMergePreambleRows, setKeyMergePreambleRows] = useState<any[][]>([]);
  const [keyMergeTemplateFileName, setKeyMergeTemplateFileName] = useState<string>("");
  const [showKeyPreamblePreview, setShowKeyPreamblePreview] = useState<boolean>(false);

  // Preview Modal state for Key-based Merge
  const [keyPreviewModalFile, setKeyPreviewModalFile] = useState<KeyMergeFile | null>(null);
  const [keyPreviewModalAoa, setKeyPreviewModalAoa] = useState<any[][]>([]);
  const [keyPreviewModalHeaderRow, setKeyPreviewModalHeaderRow] = useState<number>(0);
  const [keyPreviewModalIsTemplate, setKeyPreviewModalIsTemplate] = useState<boolean>(false);

  // Merged Output State
  const [mergedHeaders, setMergedHeaders] = useState<string[]>([]);
  const [mergedRows, setMergedRows] = useState<Record<string, string>[]>([]);

  // Preview Grid & Pagination
  const [gridSearch, setGridSearch] = useState("");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [gridPage, setGridPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Auto detect potential key columns
  const autoDetectKeyColumn = (headers: string[]): string => {
    const commonKeys = [
      "email", "id", "key", "mã", "ma", "username", "phone", "sđt", "sdt", "name", "tên", "ten", "user"
    ];
    for (const k of commonKeys) {
      const found = headers.find((h) => h.toLowerCase().includes(k));
      if (found) return found;
    }
    return headers[0] || "";
  };

  // Helper to derive headers and rows from raw 2D array and header row index
  const deriveKeyMergeData = (rawAoa: any[][], headerRowIndex: number) => {
    const rawHeadersRow = rawAoa[headerRowIndex] || [];
    const headers = rawHeadersRow.map((h: any, idx: number) => {
      const str = String(h !== undefined && h !== null ? h : "").trim();
      return str || `Cột_${idx + 1}`;
    });
    const dataRowsAoa = rawAoa.slice(headerRowIndex + 1);
    const validRows = dataRowsAoa.filter(
      (r) => r && r.some((c: any) => c !== undefined && c !== null && String(c).trim() !== "")
    );
    const rows = validRows.map((r) => {
      const obj: Record<string, string> = {};
      headers.forEach((h: string, colIdx: number) => {
        obj[h] = r[colIdx] !== undefined && r[colIdx] !== null ? String(r[colIdx]) : "";
      });
      return obj;
    });
    return { headers, rows };
  };

  // Parse uploaded files into rows and headers
  const handleKeyMergeFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const loaded: KeyMergeFile[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const lowerName = file.name.toLowerCase();
        if (!lowerName.endsWith(".xlsx") && !lowerName.endsWith(".xls") && !lowerName.endsWith(".csv")) {
          toast.error(
            lang === "vi"
              ? `Tệp ${file.name} không đúng định dạng Excel/CSV.`
              : `File ${file.name} is not a valid Excel/CSV format.`
          );
          continue;
        }

        const data = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (evt) => resolve(evt.target?.result as ArrayBuffer);
          reader.onerror = (err) => reject(err);
          reader.readAsArrayBuffer(file);
        });

        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) continue;

        const worksheet = workbook.Sheets[sheetName];
        const rawAoa = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];

        const hIdx = 0;
        const { headers, rows } = deriveKeyMergeData(rawAoa, hIdx);
        const defaultKey = autoDetectKeyColumn(headers);

        loaded.push({
          id: `km_file_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 5)}`,
          name: file.name,
          size: file.size,
          file,
          headers,
          rows,
          selectedKeyCol: defaultKey,
          rawAoa,
          headerRowIndex: hIdx,
        });
      }

      if (loaded.length > 0) {
        setUploadedFiles((prev) => {
          const updated = [...prev, ...loaded];
          if (!keyMergeTemplateFileId && updated[0]) {
            setKeyMergeTemplateFileId(updated[0].id);
          }
          if (updated[0]) {
            setUnifiedKeyName(updated[0].selectedKeyCol || "Email");
          }
          return updated;
        });

        toast.success(
          lang === "vi"
            ? `Đã nạp thành công ${loaded.length} tệp tin!`
            : `Loaded ${loaded.length} files successfully!`
        );
      }
    } catch (err: any) {
      console.error(err);
      toast.error(lang === "vi" ? `Lỗi đọc tệp: ${err.message}` : `Error reading files: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Open Preview Modal for a KeyMergeFile
  const handleOpenKeyPreview = (file: KeyMergeFile) => {
    setKeyPreviewModalFile(file);
    setKeyPreviewModalAoa(file.rawAoa || []);
    setKeyPreviewModalHeaderRow(file.headerRowIndex ?? 0);
    setKeyPreviewModalIsTemplate(keyMergeTemplateFileId === file.id);
  };

  // Save Header Row & Template Config for KeyMergeFile
  const handleSaveKeyHeaderConfig = () => {
    if (!keyPreviewModalFile) return;
    const fileId = keyPreviewModalFile.id;
    const newHeaderRow = keyPreviewModalHeaderRow;
    const rawAoa = keyPreviewModalFile.rawAoa || [];

    const { headers, rows } = deriveKeyMergeData(rawAoa, newHeaderRow);
    const validKey = headers.includes(keyPreviewModalFile.selectedKeyCol)
      ? keyPreviewModalFile.selectedKeyCol
      : autoDetectKeyColumn(headers);

    setUploadedFiles((prev) =>
      prev.map((f) => {
        if (f.id === fileId) {
          return {
            ...f,
            headerRowIndex: newHeaderRow,
            headers,
            rows,
            selectedKeyCol: validKey,
          };
        }
        return f;
      })
    );

    if (keyPreviewModalIsTemplate) {
      setKeyMergeTemplateFileId(fileId);
    } else if (keyMergeTemplateFileId === fileId) {
      setKeyMergeTemplateFileId(null);
    }

    toast.success(
      lang === "vi"
        ? `Đã cập nhật dòng header (Dòng ${newHeaderRow + 1}) cho tệp "${keyPreviewModalFile.name}"!`
        : `Updated header row (Row ${newHeaderRow + 1}) for "${keyPreviewModalFile.name}"!`
    );
    setKeyPreviewModalFile(null);
  };

  // Remove file from merge list
  const removeKeyMergeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Change selected key column for a specific file
  const handleSelectKeyCol = (id: string, col: string) => {
    setUploadedFiles((prev) =>
      prev.map((f) => {
        if (f.id === id) {
          return { ...f, selectedKeyCol: col };
        }
        return f;
      })
    );
  };

  // Core Relational Join Logic Engine
  const executeKeyBasedMerge = () => {
    if (uploadedFiles.length < 2) {
      toast.warn(
        lang === "vi"
          ? "Cần ít nhất 2 tệp để thực hiện ghép cột ngang (Relational Join)."
          : "At least 2 files are required to perform a Relational Join."
      );
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Map all normalized keys from each file
      const fileKeys = uploadedFiles.map((f) => {
        const keysSet = new Set<string>();
        f.rows.forEach((row) => {
          const rawVal = row[f.selectedKeyCol];
          if (rawVal !== undefined && rawVal !== null) {
            const norm = String(rawVal).trim().toLowerCase();
            if (norm) {
              keysSet.add(norm);
            }
          }
        });
        return keysSet;
      });

      // 2. Select target keys based on join strategy (Inner Join vs Outer Join)
      let targetKeys: string[] = [];
      if (joinStrategy === "inner") {
        let intersect = new Set<string>(fileKeys[0] || []);
        for (let i = 1; i < fileKeys.length; i++) {
          const currentSet = fileKeys[i] || new Set<string>();
          intersect = new Set<string>([...intersect].filter((k) => currentSet.has(k)));
        }
        targetKeys = Array.from(intersect);
      } else {
        const union = new Set<string>();
        fileKeys.forEach((keysSet) => {
          keysSet.forEach((k) => union.add(k));
        });
        targetKeys = Array.from(union);
      }

      if (targetKeys.length === 0) {
        toast.error(
          lang === "vi"
            ? "Không có khóa trùng khớp nào giữa các tệp để gộp theo cấu hình hiện tại."
            : "No matching keys found across files under the current configurations."
        );
        setMergedRows([]);
        setMergedHeaders([]);
        setIsProcessing(false);
        return;
      }

      // Map normalized key to its first original display value
      const keyToDisplayMap = new Map<string, string>();
      uploadedFiles.forEach((f) => {
        f.rows.forEach((row) => {
          const rawVal = row[f.selectedKeyCol];
          if (rawVal !== undefined && rawVal !== null) {
            const rawStr = String(rawVal).trim();
            const norm = rawStr.toLowerCase();
            if (norm && !keyToDisplayMap.has(norm)) {
              keyToDisplayMap.set(norm, rawStr);
            }
          }
        });
      });

      // Calculate column headers collision
      const nonKeyHeaders = uploadedFiles.flatMap((f) =>
        f.headers.filter((h) => h !== f.selectedKeyCol)
      );
      const headerCounts = nonKeyHeaders.reduce((acc, h) => {
        const norm = h.toLowerCase();
        acc[norm] = (acc[norm] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Get appropriate column name
      const getColName = (f: KeyMergeFile, col: string): string => {
        const norm = col.toLowerCase();
        if (headerCounts[norm] > 1) {
          const shortName = f.name.replace(/\.[a-z0-9]+$/i, "");
          return `${col} (${shortName})`;
        }
        return col;
      };

      // 3. Form output headers - Prioritize Template File Headers First!
      const finalUnifiedKey = unifiedKeyName.trim() || "Email";
      const outputHeaders = [finalUnifiedKey];

      const effectiveTemplateId = keyMergeTemplateFileId || uploadedFiles[0]?.id;
      const templateFile = uploadedFiles.find((f) => f.id === effectiveTemplateId) || uploadedFiles[0];

      // Extract template preamble rows
      const templateHIdx = templateFile.headerRowIndex ?? 0;
      const preamble = templateFile.rawAoa ? templateFile.rawAoa.slice(0, templateHIdx) : [];
      setKeyMergePreambleRows(preamble);
      setKeyMergeTemplateFileName(templateFile.name);

      // Add templateFile non-key headers first
      templateFile.headers.forEach((col) => {
        if (col === templateFile.selectedKeyCol) return;
        const targetCol = getColName(templateFile, col);
        if (!outputHeaders.includes(targetCol)) {
          outputHeaders.push(targetCol);
        }
      });

      // Add other files non-key headers
      uploadedFiles.forEach((f) => {
        if (f.id === templateFile.id) return;
        f.headers.forEach((col) => {
          if (col === f.selectedKeyCol) return;
          const targetCol = getColName(f, col);
          if (!outputHeaders.includes(targetCol)) {
            outputHeaders.push(targetCol);
          }
        });
      });

      // 4. Create merged rows
      const compiledRows = targetKeys.map((normKey) => {
        const displayKey = keyToDisplayMap.get(normKey) || normKey;
        const joinedRow: Record<string, string> = {
          "__row_id": `key_row_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`,
          [finalUnifiedKey]: displayKey,
        };

        uploadedFiles.forEach((f) => {
          const matchingRow = f.rows.find((r) => {
            const val = r[f.selectedKeyCol];
            return val !== undefined && val !== null && String(val).trim().toLowerCase() === normKey;
          });

          f.headers.forEach((col) => {
            if (col === f.selectedKeyCol) return;
            const targetCol = getColName(f, col);
            joinedRow[targetCol] = matchingRow ? String(matchingRow[col] ?? "") : "";
          });
        });

        return joinedRow;
      });

      setMergedHeaders(outputHeaders);
      setMergedRows(compiledRows);
      setGridPage(1);

      toast.success(
        lang === "vi"
          ? `Ghép cột thành công! Tạo ra bảng quan hệ với ${compiledRows.length} bản ghi và ${outputHeaders.length} cột.`
          : `Relational Join successful! Generated ${compiledRows.length} rows with ${outputHeaders.length} columns.`
      );
    } catch (err: any) {
      console.error(err);
      toast.error(lang === "vi" ? `Lỗi khi ghép cột: ${err.message}` : `Join error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Demo Dataset Loader for Key-Based Merge
  const loadKeyMergeDemo = () => {
    const demo1Aoa = [
      ["BẢNG DANH SÁCH HỌC SINH KHỐI 10 - NĂM HỌC 2026", "", ""],
      ["Mã Học Sinh", "Họ Và Tên", "Lớp"],
      ["HS-001", "Nguyễn Hoàng Nam", "10A1"],
      ["HS-002", "Trần Thị Lan", "10A2"],
      ["HS-003", "Phạm Văn Minh", "10A1"],
    ];
    const { headers: headers1, rows: rows1 } = deriveKeyMergeData(demo1Aoa, 1);

    const demo2Aoa = [
      ["BẢNG ĐIỂM KIỂM TRA HỌC KỲ I", "", ""],
      ["Student ID", "Điểm Toán", "Điểm Lý"],
      ["HS-001", "8.5", "7.0"],
      ["HS-002", "9.0", "8.5"],
      ["HS-004", "7.5", "8.0"],
    ];
    const { headers: headers2, rows: rows2 } = deriveKeyMergeData(demo2Aoa, 1);

    const demoFiles: KeyMergeFile[] = [
      {
        id: "demo_km_1",
        name: "Danh_Sach_Hoc_Sinh.xlsx",
        size: 15300,
        file: new File([], "Danh_Sach_Hoc_Sinh.xlsx"),
        headers: headers1,
        rows: rows1,
        selectedKeyCol: "Mã Học Sinh",
        rawAoa: demo1Aoa,
        headerRowIndex: 1,
      },
      {
        id: "demo_km_2",
        name: "Bang_Diem_Mon_Hoc.xlsx",
        size: 14200,
        file: new File([], "Bang_Diem_Mon_Hoc.xlsx"),
        headers: headers2,
        rows: rows2,
        selectedKeyCol: "Student ID",
        rawAoa: demo2Aoa,
        headerRowIndex: 1,
      },
    ];

    setUploadedFiles(demoFiles);
    setKeyMergeTemplateFileId("demo_km_1");
    setUnifiedKeyName("Mã Học Sinh");
    toast.success(
      lang === "vi"
        ? "Đã nạp 2 tệp học sinh & bảng điểm mẫu (Dòng header bắt đầu từ Dòng 2). Nhấp vào nút chạy để xem kết quả!"
        : "Loaded student list & grade tables demo (Header starts at Row 2). Click Merge to view results!"
    );
  };

  // Clean all relational states
  const clearKeyMergeAll = () => {
    setUploadedFiles([]);
    setMergedHeaders([]);
    setMergedRows([]);
    setGridSearch("");
    toast.info(lang === "vi" ? "Đã dọn dẹp bộ nhớ ghép tệp." : "Cleared workspace.");
  };

  // Sort & Filter Grid Rows
  const sortedAndFilteredGridRows = useMemo(() => {
    let result = [...mergedRows];

    if (gridSearch.trim()) {
      const q = gridSearch.toLowerCase();
      result = result.filter((row) =>
        Object.entries(row).some(([key, val]) => {
          if (key.startsWith("__")) return false;
          return String(val).toLowerCase().includes(q);
        })
      );
    }

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

  // Pagination bounds
  const totalPages = Math.ceil(sortedAndFilteredGridRows.length / pageSize) || 1;
  const paginatedGridRows = useMemo(() => {
    const startIndex = (gridPage - 1) * pageSize;
    return sortedAndFilteredGridRows.slice(startIndex, startIndex + pageSize);
  }, [sortedAndFilteredGridRows, gridPage, pageSize]);

  // Export spreadsheet triggered from Client
  const handleExportKeyMerged = (format: "xlsx" | "csv") => {
    if (mergedRows.length === 0) return;

    const exportAoa: any[][] = [];

    // Prepend template preamble rows (if any)
    if (keyMergePreambleRows.length > 0) {
      keyMergePreambleRows.forEach((pRow) => {
        exportAoa.push([...pRow]);
      });
    }

    // Add header row
    exportAoa.push(mergedHeaders);

    // Add data rows
    sortedAndFilteredGridRows.forEach((row) => {
      const dataRow = mergedHeaders.map((h) => row[h] || "");
      exportAoa.push(dataRow);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(exportAoa);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Merged_Data");

    const extension = format === "csv" ? ".csv" : ".xlsx";
    const finalName = `Key_Based_Merged_Output${extension}`;

    if (format === "csv") {
      XLSX.writeFile(workbook, finalName, { bookType: "csv" });
    } else {
      XLSX.writeFile(workbook, finalName);
    }

    toast.success(
      lang === "vi"
        ? `Tải xuống tệp gộp ngang thành công: "${finalName}"!`
        : `Exported successfully as "${finalName}"!`
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50 dark:bg-[#0B0F1A] text-slate-800 dark:text-slate-100 font-sans p-4 lg:p-6 transition-colors duration-200">
      
      {/* Upper Title Area */}
      {!hideInnerHeader && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-5 mb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="h-9 w-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-600/20">
                <FolderOpen className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>{lang === "vi" ? "Gộp Bảng Dữ Liệu Excel / CSV" : "Merge Table Suite"}</span>
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {lang === "vi"
                ? "Gộp bảng dọc theo thư mục hoặc ghép cột song song theo khóa liên kết một cách chuẩn xác."
                : "Stack files vertically or perform fully customizable relational column joins based on a matching key."}
            </p>
          </div>
        </div>
      )}

      {/* Operation Mode Tabs Bar */}
      <div className="flex bg-slate-200/60 dark:bg-slate-900/40 p-1 rounded-xl mb-6 max-w-lg w-full self-start border border-slate-200 dark:border-slate-800">
        <button
          onClick={() => {
            setActiveTab("common");
            // Clear grids
            setMergedHeaders([]);
            setMergedRows([]);
          }}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "common"
              ? "bg-teal-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Database className="h-4 w-4" />
          {t("excelSuite.commonMergeTab")}
        </button>
        <button
          onClick={() => {
            setActiveTab("key-based");
            // Clear grids
            setMergedHeaders([]);
            setMergedRows([]);
          }}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "key-based"
              ? "bg-teal-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <ArrowLeftRight className="h-4 w-4" />
          {t("excelSuite.keyMergeTab")}
        </button>
      </div>

      {/* Render Component based on selected operation mode tab */}
      {activeTab === "common" ? (
        <DirectoryAggregator hideInnerHeader state={state} onChange={onChange} />
      ) : (
        /* ==========================================
           KEY-BASED RELATIONAL JOIN RENDER MODULE
           ========================================== */
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          {/* Left Panel: Configuration and Uploads */}
          <div className="xl:col-span-5 space-y-6">
            
            {/* File Upload Zone */}
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm rounded-2xl p-6 transition-all">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 mb-4 flex items-center gap-2">
                <Upload className="h-4.5 w-4.5 text-teal-500" />
                {lang === "vi" ? "1. Tải Lên Tệp Tin Ghép Cột" : "1. Relational Files Upload"}
              </h3>

              <div className="border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-teal-500/50 dark:hover:border-teal-500/40 rounded-xl p-8 text-center transition-all cursor-pointer relative bg-slate-100/50 dark:bg-slate-950/20 group">
                <input
                  type="file"
                  multiple
                  accept=".xlsx,.xls,.csv"
                  onChange={handleKeyMergeFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  id="key-merge-uploader"
                />
                <div className="flex flex-col items-center">
                  <div className="h-11 w-11 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 mb-3 group-hover:scale-105 transition-transform">
                    <FileSpreadsheet className="h-5.5 w-5.5 text-teal-500" />
                  </div>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                    {lang === "vi" ? "Chọn Nhiều Tệp Excel / CSV" : "Choose Excel / CSV Files"}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {lang === "vi" ? "Chọn từ 2 tệp để tiến hành liên kết" : "Select 2 or more files to join"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                <button
                  onClick={loadKeyMergeDemo}
                  className="px-4 py-2 bg-teal-50 dark:bg-teal-600/10 border border-teal-200 dark:border-teal-500/20 hover:bg-teal-100 dark:hover:bg-teal-600/20 text-teal-600 dark:text-teal-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Sparkles className="h-4 w-4" />
                  {lang === "vi" ? "Thử Bản Ghi Mẫu" : "Try Demo Files"}
                </button>
                {uploadedFiles.length > 0 && (
                  <button
                    onClick={clearKeyMergeAll}
                    className="px-4 py-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                    {lang === "vi" ? "Xóa Đặt Lại" : "Clear Workspace"}
                  </button>
                )}
              </div>
            </div>

            {/* List of uploaded files with Key Selection */}
            {uploadedFiles.length > 0 && (
              <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm rounded-2xl p-6 transition-all space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                  <Settings className="h-4.5 w-4.5 text-teal-500" />
                  {lang === "vi" ? "2. Cấu Hình Cột Khóa Từng Tệp" : "2. Configure Key Column mapping"}
                </h3>

                <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                  {uploadedFiles.map((f) => (
                    <div
                      key={f.id}
                      className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 p-4 rounded-xl flex flex-col gap-3 relative"
                    >
                      <div className="absolute right-3 top-3 flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenKeyPreview(f)}
                          className="p-1 rounded-lg text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                          title={lang === "vi" ? "Xem preview & chỉnh dòng Header" : "Preview & select Header row"}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeKeyMergeFile(f.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                          title={lang === "vi" ? "Xóa tệp" : "Remove file"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="pr-16">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {/* Clickable file name */}
                          <button
                            onClick={() => handleOpenKeyPreview(f)}
                            className="text-xs font-extrabold text-slate-800 dark:text-slate-100 hover:text-teal-600 dark:hover:text-teal-400 hover:underline cursor-pointer text-left truncate max-w-[200px]"
                            title={lang === "vi" ? "Bấm vào tên tệp để xem preview & hiệu chỉnh dòng Header" : "Click file name to preview & customize Header row"}
                          >
                            {f.name}
                          </button>

                          {/* Header row badge */}
                          <button
                            onClick={() => handleOpenKeyPreview(f)}
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100/70 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-700 cursor-pointer hover:bg-teal-200 transition-colors flex items-center gap-1"
                            title={lang === "vi" ? "Dòng được chọn làm Header cột" : "Selected Header row"}
                          >
                            <span>Header: Dòng {(f.headerRowIndex ?? 0) + 1}</span>
                          </button>

                          {/* Template file badge / button */}
                          {keyMergeTemplateFileId === f.id ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-400 dark:border-amber-600 flex items-center gap-1 shadow-xs">
                              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                              <span>{lang === "vi" ? "Mẫu Đầu Trang" : "Template"}</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setKeyMergeTemplateFileId(f.id);
                                toast.success(
                                  lang === "vi"
                                    ? `Đã chọn "${f.name}" làm File Mẫu đầu trang!`
                                    : `Selected "${f.name}" as Template file!`
                                );
                              }}
                              className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors flex items-center gap-1"
                              title={lang === "vi" ? "Chọn tệp này để dùng phần đầu & header làm chuẩn xuất ra" : "Set as Master Template File"}
                            >
                              <Star className="h-3 w-3" />
                              <span>{lang === "vi" ? "Đặt làm mẫu" : "Set template"}</span>
                            </button>
                          )}
                        </div>

                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {lang === "vi" ? `Dung lượng: ${(f.size / 1024).toFixed(1)} KB • Có ${f.rows.length} dòng dữ liệu` : `Size: ${(f.size / 1024).toFixed(1)} KB • ${f.rows.length} data rows`}
                        </span>
                      </div>

                      {/* Dropdown column map selector */}
                      <div className="space-y-1">
                        <label className="block text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                          {t("excelSuite.keyColumnSelect")}
                        </label>
                        <select
                          value={f.selectedKeyCol}
                          onChange={(e) => handleSelectKeyCol(f.id, e.target.value)}
                          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs p-2 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
                        >
                          {f.headers.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Unified Output Key Input */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                    {t("excelSuite.customKeyName")}
                  </label>
                  <input
                    type="text"
                    value={unifiedKeyName}
                    onChange={(e) => setUnifiedKeyName(e.target.value)}
                    placeholder="Email"
                    className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/10 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-slate-800 dark:text-slate-200 text-xs px-3 py-2 rounded-xl transition-all"
                  />
                </div>
              </div>
            )}

            {/* Join Type Selector & Match Options */}
            {uploadedFiles.length > 1 && (
              <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm rounded-2xl p-6 transition-all space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                  <Database className="h-4.5 w-4.5 text-teal-500" />
                  {t("excelSuite.joinStrategy")}
                </h3>

                {/* Inner Join Radio */}
                <div
                  onClick={() => setJoinStrategy("inner")}
                  className={`border rounded-xl p-3.5 cursor-pointer transition-all flex items-start gap-3 ${
                    joinStrategy === "inner"
                      ? "border-teal-500/70 bg-teal-50/20 dark:bg-teal-950/20"
                      : "border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-900/20"
                  }`}
                >
                  <div className="h-4.5 w-4.5 rounded-full border border-slate-300 dark:border-white/10 flex items-center justify-center mt-0.5 bg-white dark:bg-slate-950">
                    {joinStrategy === "inner" && (
                      <div className="h-2 w-2 rounded-full bg-teal-600" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      {t("excelSuite.joinInner")}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed block mt-0.5">
                      {t("excelSuite.joinInnerDesc")}
                    </span>
                  </div>
                </div>

                {/* Outer Join Radio */}
                <div
                  onClick={() => setJoinStrategy("outer")}
                  className={`border rounded-xl p-3.5 cursor-pointer transition-all flex items-start gap-3 ${
                    joinStrategy === "outer"
                      ? "border-teal-500/70 bg-teal-50/20 dark:bg-teal-950/20"
                      : "border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-900/20"
                  }`}
                >
                  <div className="h-4.5 w-4.5 rounded-full border border-slate-300 dark:border-white/10 flex items-center justify-center mt-0.5 bg-white dark:bg-slate-950">
                    {joinStrategy === "outer" && (
                      <div className="h-2 w-2 rounded-full bg-teal-600" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      {t("excelSuite.joinOuter")}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed block mt-0.5">
                      {t("excelSuite.joinOuterDesc")}
                    </span>
                  </div>
                </div>

                {/* Submit Action Button */}
                <button
                  onClick={executeKeyBasedMerge}
                  disabled={isProcessing}
                  className="w-full mt-2 py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-teal-600/10 cursor-pointer"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  {lang === "vi" ? "Tiến Hành Ghép Cột" : "Execute Relational Join"}
                </button>
              </div>
            )}
          </div>

          {/* Right Panel: Merged Grid Output Preview */}
          <div className="xl:col-span-7 space-y-6">
            
            {/* Grid Preview Card */}
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm rounded-2xl p-6 transition-all min-h-[300px] flex flex-col justify-between">
              <div>
                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-4 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                      <Grid className="h-4.5 w-4.5 text-teal-500" />
                      {lang === "vi" ? "Lưới Xem Trước Bản Ghi Ghép Cột" : "Joined Dataset Preview"}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {lang === "vi"
                        ? `Tìm thấy ${sortedAndFilteredGridRows.length} bản ghi hợp nhất`
                        : `Found ${sortedAndFilteredGridRows.length} merged record(s)`}
                    </p>
                  </div>

                  {mergedRows.length > 0 && (
                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <button
                        onClick={() => handleExportKeyMerged("xlsx")}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                        title="Download Excel Spreadsheet"
                      >
                        <Download className="h-3.5 w-3.5" />
                        XLSX
                      </button>
                      <button
                        onClick={() => handleExportKeyMerged("csv")}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                        title="Download CSV"
                      >
                        <Download className="h-3.5 w-3.5" />
                        CSV
                      </button>
                    </div>
                  )}
                </div>

                {/* Template Preamble Banner (If chosen template file has preamble rows) */}
                {keyMergePreambleRows.length > 0 && (
                  <div className="mb-4 p-4 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700/40 text-xs shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
                          <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                        </div>
                        <div>
                          <span className="font-bold text-amber-900 dark:text-amber-200 block">
                            {lang === "vi" 
                              ? `Phần đầu file xuất (Lấy từ file mẫu "${keyMergeTemplateFileName}"): gồm ${keyMergePreambleRows.length} dòng tiêu đề / thông tin đầu bảng.`
                              : `Output preamble (From template "${keyMergeTemplateFileName}"): includes ${keyMergePreambleRows.length} header/preamble row(s).`}
                          </span>
                          <span className="text-[11px] text-amber-700/80 dark:text-amber-300/80">
                            {lang === "vi"
                              ? "Khi tải xuống, các dòng này sẽ được đặt chính xác ở phần đầu tệp, tiếp theo là hàng Header và dữ liệu ghép cột."
                              : "When exported, these rows are preserved at the top, followed by the Header and joined data."}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowKeyPreamblePreview(!showKeyPreamblePreview)}
                        className="px-3 py-1.5 bg-amber-200/70 hover:bg-amber-200 dark:bg-amber-900/50 dark:hover:bg-amber-900/70 text-amber-900 dark:text-amber-100 font-bold rounded-lg cursor-pointer transition-colors self-start sm:self-auto text-xs flex items-center gap-1.5"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>{showKeyPreamblePreview ? (lang === "vi" ? "Ẩn xem trước" : "Hide") : (lang === "vi" ? "Xem trước phần đầu" : "Preview preamble")}</span>
                      </button>
                    </div>

                    {showKeyPreamblePreview && (
                      <div className="mt-3 overflow-x-auto border border-amber-200 dark:border-amber-700/50 rounded-lg bg-white dark:bg-slate-900 p-2 max-h-48 overflow-y-auto">
                        <table className="w-full text-[11px] font-mono border-collapse">
                          <tbody>
                            {keyMergePreambleRows.map((pRow, pIdx) => (
                              <tr key={pIdx} className="border-b border-amber-100 dark:border-amber-900/30 last:border-none">
                                <td className="p-1.5 font-bold text-amber-600 dark:text-amber-400 select-none w-20 whitespace-nowrap bg-amber-50/50 dark:bg-amber-950/20">
                                  Dòng {pIdx + 1}
                                </td>
                                {pRow.map((cell: any, cIdx: number) => (
                                  <td key={cIdx} className="p-1.5 text-slate-700 dark:text-slate-300 border-l border-amber-100 dark:border-amber-900/30">
                                    {String(cell !== undefined && cell !== null ? cell : "")}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Table search filter */}
                {mergedRows.length > 0 && (
                  <div className="mb-4 relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder={lang === "vi" ? "Tìm nhanh trong bảng..." : "Quick table filter..."}
                      value={gridSearch}
                      onChange={(e) => {
                        setGridSearch(e.target.value);
                        setGridPage(1);
                      }}
                      className="w-full max-w-xs bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/10 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-slate-800 dark:text-slate-200 text-xs pl-9 pr-4 py-2 rounded-lg transition-all"
                    />
                  </div>
                )}

                {/* Real interactive Data Grid */}
                {mergedRows.length > 0 ? (
                  <div className="border border-slate-200 dark:border-white/5 rounded-xl overflow-x-auto max-w-full">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-white/5">
                          {mergedHeaders.map((h) => (
                            <th
                              key={h}
                              onClick={() => {
                                if (sortField === h) {
                                  setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                                } else {
                                  setSortField(h);
                                  setSortDirection("asc");
                                }
                              }}
                              className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-850 select-none whitespace-nowrap"
                            >
                              <div className="flex items-center gap-1.5">
                                <span>{h}</span>
                                {sortField === h && (
                                  <span className="text-[10px] text-teal-600">
                                    {sortDirection === "asc" ? "▲" : "▼"}
                                  </span>
                                )}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                        {paginatedGridRows.map((row, idx) => (
                          <tr
                            key={row["__row_id"] || idx}
                            className="hover:bg-slate-50 dark:hover:bg-slate-950/30 transition-colors"
                          >
                            {mergedHeaders.map((h) => (
                              <td
                                key={h}
                                className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap"
                              >
                                {row[h] || "-"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-16 text-center flex flex-col items-center justify-center">
                    <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 mb-3">
                      <Database className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                      {lang === "vi"
                        ? "Chưa có bảng dữ liệu hợp nhất."
                        : "No merged relational dataset available."}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs block leading-relaxed">
                      {lang === "vi"
                        ? "Vui lòng tải lên ít nhất 2 tệp Excel/CSV, cài đặt cột khóa và nhấn tiến hành ghép cột."
                        : "Please upload at least 2 files, configure mapping keys, and trigger Relational Join."}
                    </span>
                  </div>
                )}
              </div>

              {/* Grid Pagination controls */}
              {mergedRows.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-100 dark:border-white/5">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {lang === "vi"
                      ? `Hiển thị ${(gridPage - 1) * pageSize + 1} - ${Math.min(
                          gridPage * pageSize,
                          sortedAndFilteredGridRows.length
                        )} trên tổng ${sortedAndFilteredGridRows.length} bản ghi`
                      : `Showing ${(gridPage - 1) * pageSize + 1} - ${Math.min(
                          gridPage * pageSize,
                          sortedAndFilteredGridRows.length
                        )} of ${sortedAndFilteredGridRows.length} record(s)`}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setGridPage((p) => Math.max(1, p - 1))}
                      disabled={gridPage === 1}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-50 text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-2">
                      {gridPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setGridPage((p) => Math.min(totalPages, p + 1))}
                      disabled={gridPage === totalPages}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-50 text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ========================================================
          MODAL: KEY-BASED MERGE FILE PREVIEW & HEADER ROW SELECTION
          ======================================================== */}
      {keyPreviewModalFile && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white truncate flex items-center gap-2">
                    <span>{keyPreviewModalFile.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                      Excel / CSV
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono truncate">
                    {(keyPreviewModalFile.size / 1024).toFixed(1)} KB • {keyPreviewModalAoa.length} dòng
                  </p>
                </div>
              </div>

              <button
                onClick={() => setKeyPreviewModalFile(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={lang === "vi" ? "Đóng" : "Close"}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body / Toolbar */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Header row picker control */}
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {lang === "vi" ? "Dòng Header (Tiêu Đề Cột):" : "Header Row (Column Titles):"}
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={keyPreviewModalHeaderRow}
                      onChange={(e) => setKeyPreviewModalHeaderRow(Number(e.target.value))}
                      className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl text-teal-600 dark:text-teal-400 focus:outline-none cursor-pointer"
                    >
                      {keyPreviewModalAoa.slice(0, 30).map((_, idx) => (
                        <option key={idx} value={idx}>
                          {lang === "vi" ? `Dòng ${idx + 1}` : `Row ${idx + 1}`}
                        </option>
                      ))}
                    </select>

                    {/* Quick helper buttons for rows 1 to 5 */}
                    <div className="hidden sm:flex items-center gap-1">
                      {[0, 1, 2, 3, 4].map((rIdx) => (
                        <button
                          key={rIdx}
                          type="button"
                          onClick={() => setKeyPreviewModalHeaderRow(rIdx)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                            keyPreviewModalHeaderRow === rIdx
                              ? "bg-teal-600 text-white shadow-xs"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                          }`}
                        >
                          D{rIdx + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Master template file toggle */}
                <label className="flex items-center gap-2.5 cursor-pointer p-2 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-700/40 hover:bg-amber-100/60 transition-colors">
                  <input
                    type="checkbox"
                    checked={keyPreviewModalIsTemplate}
                    onChange={(e) => setKeyPreviewModalIsTemplate(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 border-amber-300 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      {lang === "vi" 
                        ? "Dùng file này làm Mẫu Đầu Trang & Header khi xuất" 
                        : "Use this file as Master Template (Header & Preamble)"}
                    </span>
                  </div>
                </label>
              </div>

              {/* Color legend & explanation */}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-amber-400 border border-amber-500" />
                  <span className="text-slate-600 dark:text-slate-400">
                    {keyPreviewModalHeaderRow === 0
                      ? (lang === "vi" ? "Không có dòng tiêu đề đầu (Preamble)" : "No preamble rows")
                      : (lang === "vi" ? `Dòng 1 đến Dòng ${keyPreviewModalHeaderRow}: Tiêu đề / Thông tin đầu tệp (Preamble)` : `Rows 1 to ${keyPreviewModalHeaderRow}: Preamble`)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-emerald-500 border border-emerald-600" />
                  <span className="font-bold text-emerald-700 dark:text-emerald-300">
                    {lang === "vi" ? `Dòng ${keyPreviewModalHeaderRow + 1}: Hàng Header (Tiêu Đề Cột)` : `Row ${keyPreviewModalHeaderRow + 1}: Header Row`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-sky-400 border border-sky-500" />
                  <span className="text-slate-600 dark:text-slate-400">
                    {lang === "vi" ? `Dòng ${keyPreviewModalHeaderRow + 2} trở đi: Dữ liệu ghép (Data Rows)` : `Rows ${keyPreviewModalHeaderRow + 2}+: Data rows`}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Sheet Preview Grid */}
            <div className="flex-1 overflow-auto p-5 bg-slate-50 dark:bg-slate-950/40 custom-scrollbar">
              {keyPreviewModalAoa.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <p>{lang === "vi" ? "Tệp không chứa dữ liệu hoặc không thể hiển thị bảng." : "File contains no tabular data."}</p>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#111827] shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <tbody>
                      {keyPreviewModalAoa.slice(0, 60).map((row, rIdx) => {
                        const isHeader = rIdx === keyPreviewModalHeaderRow;
                        const isPreamble = rIdx < keyPreviewModalHeaderRow;
                        const isData = rIdx > keyPreviewModalHeaderRow;

                        return (
                          <tr
                            key={rIdx}
                            onClick={() => setKeyPreviewModalHeaderRow(rIdx)}
                            className={`border-b border-slate-200/80 dark:border-slate-800 transition-colors cursor-pointer select-none ${
                              isHeader
                                ? "bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50"
                                : isPreamble
                                ? "bg-amber-50/60 dark:bg-amber-950/20 hover:bg-amber-100/40 text-amber-900 dark:text-amber-200"
                                : "hover:bg-slate-50 dark:hover:bg-slate-900/60"
                            }`}
                          >
                            {/* Row Selector & Badge */}
                            <td className="p-2.5 font-mono font-bold text-center w-28 whitespace-nowrap border-r border-slate-200 dark:border-slate-800">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-slate-500 dark:text-slate-400">#{rIdx + 1}</span>
                                {isHeader ? (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white font-extrabold text-[9px] uppercase shadow-xs">
                                    Header
                                  </span>
                                ) : isPreamble ? (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-bold text-[9px]">
                                    Tiêu đề
                                  </span>
                                ) : (
                                  <span className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px]">
                                    Dữ liệu
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Cells */}
                            {Array.from({ length: Math.max(1, ...keyPreviewModalAoa.slice(0, 30).map(r => r.length)) }).map((_, cIdx) => {
                              const cellVal = row[cIdx];
                              return (
                                <td
                                  key={cIdx}
                                  className={`p-2.5 border-r border-slate-200/60 dark:border-slate-800/60 max-w-[200px] truncate ${
                                    isHeader
                                      ? "font-extrabold text-emerald-950 dark:text-emerald-100"
                                      : isPreamble
                                      ? "italic text-amber-800 dark:text-amber-300 font-medium"
                                      : "text-slate-700 dark:text-slate-300"
                                  }`}
                                  title={cellVal !== undefined && cellVal !== null ? String(cellVal) : ""}
                                >
                                  {cellVal !== undefined && cellVal !== null && String(cellVal).trim() !== "" ? (
                                    String(cellVal)
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-700 select-none">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
              <span className="text-xs text-slate-500 dark:text-slate-400 italic">
                {lang === "vi" 
                  ? "💡 Bạn có thể nhấp trực tiếp vào bất kỳ dòng nào trong bảng trên để chọn dòng đó làm Header!" 
                  : "💡 Click on any row in the table above to set it as the Header row!"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setKeyPreviewModalFile(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {lang === "vi" ? "Hủy" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={handleSaveKeyHeaderConfig}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="h-4 w-4" />
                  {lang === "vi" ? "Lưu Cấu Hình & Áp Dụng" : "Save & Apply"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
