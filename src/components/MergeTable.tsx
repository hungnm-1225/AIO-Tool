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
  X
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
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as any[];

        const headers: string[] = [];
        if (rawRows.length > 0) {
          const keys = new Set<string>();
          rawRows.forEach((r) => {
            Object.keys(r).forEach((k) => keys.add(k));
          });
          headers.push(...Array.from(keys));
        }

        const defaultKey = autoDetectKeyColumn(headers);

        loaded.push({
          id: `km_file_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 5)}`,
          name: file.name,
          size: file.size,
          file,
          headers,
          rows: rawRows,
          selectedKeyCol: defaultKey,
        });
      }

      if (loaded.length > 0) {
        setUploadedFiles((prev) => {
          const updated = [...prev, ...loaded];
          // Proactively set unified key based on the first key col
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

      // 3. Form output headers
      const finalUnifiedKey = unifiedKeyName.trim() || "Email";
      const outputHeaders = [finalUnifiedKey];
      uploadedFiles.forEach((f) => {
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
    const file1Rows = [
      { "Mã Học Sinh": "HS-001", "Họ Và Tên": "Nguyễn Hoàng Nam", "Lớp": "10A1" },
      { "Mã Học Sinh": "HS-002", "Họ Và Tên": "Trần Thị Lan", "Lớp": "10A2" },
      { "Mã Học Sinh": "HS-003", "Họ Và Tên": "Phạm Văn Minh", "Lớp": "10A1" },
    ];
    const file2Rows = [
      { "Student ID": "HS-001", "Điểm Toán": "8.5", "Điểm Lý": "7.0" },
      { "Student ID": "HS-002", "Điểm Toán": "9.0", "Điểm Lý": "8.5" },
      { "Student ID": "HS-004", "Điểm Toán": "7.5", "Điểm Lý": "8.0" }, // Different ID
    ];

    const demoFiles: KeyMergeFile[] = [
      {
        id: "demo_km_1",
        name: "Danh_Sach_Hoc_Sinh.xlsx",
        size: 15300,
        file: new File([], "Danh_Sach_Hoc_Sinh.xlsx"),
        headers: ["Mã Học Sinh", "Họ Và Tên", "Lớp"],
        rows: file1Rows,
        selectedKeyCol: "Mã Học Sinh",
      },
      {
        id: "demo_km_2",
        name: "Bang_Diem_Mon_Hoc.xlsx",
        size: 14200,
        file: new File([], "Bang_Diem_Mon_Hoc.xlsx"),
        headers: ["Student ID", "Điểm Toán", "Điểm Lý"],
        rows: file2Rows,
        selectedKeyCol: "Student ID",
      },
    ];

    setUploadedFiles(demoFiles);
    setUnifiedKeyName("Mã Học Sinh");
    toast.success(
      lang === "vi"
        ? "Đã nạp 2 tệp học sinh & bảng điểm mẫu. Nhấp vào nút chạy để xem kết quả!"
        : "Loaded student list & grade tables demo. Click Merge to view results!"
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

    const exportData = sortedAndFilteredGridRows.map((row) => {
      const cleanRow: Record<string, string> = {};
      mergedHeaders.forEach((h) => {
        cleanRow[h] = row[h] || "";
      });
      return cleanRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
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
                      <button
                        onClick={() => removeKeyMergeFile(f.id)}
                        className="absolute right-3 top-3 p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        title={lang === "vi" ? "Xóa tệp" : "Remove file"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                      <div>
                        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block truncate max-w-[85%]">
                          {f.name}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {lang === "vi" ? `Dung lượng: ${(f.size / 1024).toFixed(1)} KB • Có ${f.rows.length} dòng` : `Size: ${(f.size / 1024).toFixed(1)} KB • ${f.rows.length} rows`}
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
    </div>
  );
}
