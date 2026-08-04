import React, { useState, useMemo, useRef } from "react";
import { XLSX } from "../utils/xlsxHelper";
import JSZip from "jszip";
import { useI18n } from "../utils/i18n";
import {
  Upload,
  FileSpreadsheet,
  Download,
  Search,
  Eye,
  X,
  Check,
  Columns,
  AlertCircle,
  Trash2,
  FileArchive,
  Filter,
  CheckCircle2,
  Table,
  Sparkles,
  FileDown,
} from "lucide-react";
import { toast } from "react-toastify";

// Sample dataset for quick demo testing
const SAMPLE_HEADERS = [
  "STT",
  "Họ và tên",
  "Phòng ban",
  "Chức danh",
  "Tỉnh thành",
  "Trạng thái",
];

const SAMPLE_ROWS: any[][] = [
  [1, "Nguyễn Văn An", "Kinh doanh", "Trưởng phòng", "Hà Nội", "Chính thức"],
  [2, "Trần Thị Bích", "Kinh doanh", "Chuyên viên", "TP. Hồ Chí Minh", "Chính thức"],
  [3, "Lê Hoàng Cường", "Kỹ thuật", "Kỹ sư Senior", "Hà Nội", "Chính thức"],
  [4, "Phạm Minh Đức", "Kỹ thuật", "Lập trình viên", "Đà Nẵng", "Thử việc"],
  [5, "Hoàng Thanh Hà", "Nhân sự", "Chuyên viên", "TP. Hồ Chí Minh", "Chính thức"],
  [6, "Vũ Quốc Hùng", "Kế toán", "Kế toán tổng hợp", "Hà Nội", "Chính thức"],
  [7, "Đỗ Kim Ngân", "Marketing", "Chuyên viên Content", "Đà Nẵng", "Chính thức"],
  [8, "Bùi Anh Tuấn", "Kinh doanh", "Chuyên viên", "Cần Thơ", "Thử việc"],
  [9, "Ngô Bảo Trâm", "Kỹ thuật", "DevOps", "TP. Hồ Chí Minh", "Chính thức"],
  [10, "Dương Văn Khoa", "Kỹ thuật", "Frontend Developer", "Hà Nội", "Thử việc"],
  [11, "Lý Mỹ Duyên", "Nhân sự", "Trưởng phòng", "Hà Nội", "Chính thức"],
  [12, "Đặng Hữu Tài", "Marketing", "Designer", "TP. Hồ Chí Minh", "Thử việc"],
  [13, "Trịnh Mai Phương", "Kế toán", "Kế toán viên", "Hải Phòng", "Chính thức"],
  [14, "Võ Đức Minh", "Kinh doanh", "Chuyên viên", "Đà Nẵng", "Chính thức"],
  [15, "Phan Hải Yến", "Kỹ thuật", "QA Engineer", "TP. Hồ Chí Minh", "Chính thức"],
  [16, "Nguyễn Thị Ngọc", "Marketing", "SEO Specialist", "Hà Nội", "Chính thức"],
  [17, "Cao Tiến Dũng", "Kinh doanh", "Chuyên viên", "Hải Phòng", "Thử việc"],
  [18, "Đào Thanh Tùng", "Kỹ thuật", "Backend Developer", "Hà Nội", "Chính thức"],
  [19, "Hồ Bích Thủy", "Nhân sự", "Recruiter", "Đà Nẵng", "Chính thức"],
  [20, "Trương Gia Huy", "Kế toán", "Trưởng phòng", "TP. Hồ Chí Minh", "Chính thức"],
];

interface ExcelSplitByColumnProps {
  hideInnerHeader?: boolean;
}

export default function ExcelSplitByColumn({ hideInnerHeader = false }: ExcelSplitByColumnProps) {
  const { lang, t } = useI18n();

  // File state
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<number>(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<any[][]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Grouping state
  const [selectedColIndex, setSelectedColIndex] = useState<number | null>(null);
  const [searchGroupQuery, setSearchGroupQuery] = useState<string>("");
  const [previewGroupKey, setPreviewGroupKey] = useState<string | null>(null);

  // Export settings state
  const [includeCountInFilename, setIncludeCountInFilename] = useState<boolean>(true);
  const [customZipName, setCustomZipName] = useState<string>("split_data_by_column.zip");
  const [exportFormat, setExportFormat] = useState<"xlsx" | "csv">("xlsx");
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse Excel/CSV File
  const handleFileUpload = (file: File) => {
    if (!file) return;
    setIsLoading(true);
    setFileName(file.name);
    setFileSize(file.size);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) throw new Error("Empty file content");

        const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Parse as raw 2D array to preserve exact header positions and row data
        const rawAoa: any[][] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: "",
        });

        if (!rawAoa || rawAoa.length === 0) {
          toast.error(
            lang === "vi"
              ? "Tệp không chứa dữ liệu hoặc bị lỗi định dạng."
              : "File contains no data or invalid format."
          );
          setIsLoading(false);
          return;
        }

        // Header is row 0
        const headerRow: string[] = (rawAoa[0] || []).map((h, idx) =>
          h !== undefined && h !== null && String(h).trim() !== ""
            ? String(h).trim()
            : `Column ${idx + 1}`
        );

        // Data rows are row 1..N (filtering out purely empty rows)
        const rows: any[][] = rawAoa.slice(1).filter((r) => {
          if (!r || !Array.isArray(r)) return false;
          return r.some((cell) => cell !== undefined && cell !== null && String(cell).trim() !== "");
        });

        setHeaders(headerRow);
        setDataRows(rows);
        
        // Auto-select first column if available
        if (headerRow.length > 0) {
          setSelectedColIndex(0);
        } else {
          setSelectedColIndex(null);
        }

        toast.success(
          lang === "vi"
            ? `Đã đọc tệp "${file.name}" với ${rows.length} dòng dữ liệu!`
            : `Loaded "${file.name}" with ${rows.length} records!`
        );
      } catch (err: any) {
        console.error("Error reading Excel file:", err);
        toast.error(
          lang === "vi"
            ? `Lỗi khi đọc tệp: ${err.message || "Định dạng không hỗ trợ"}`
            : `Failed to read file: ${err.message || "Unsupported format"}`
        );
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      toast.error(lang === "vi" ? "Lỗi đọc tệp từ đĩa" : "Failed to read file from disk");
      setIsLoading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleReset = () => {
    setFileName("");
    setFileSize(0);
    setHeaders([]);
    setDataRows([]);
    setSelectedColIndex(null);
    setPreviewGroupKey(null);
    setSearchGroupQuery("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Load sample dataset directly into component state
  const handleLoadSampleData = () => {
    setFileName("Danh_Sach_Nhan_Su_Mau.xlsx");
    setFileSize(18420);
    setHeaders(SAMPLE_HEADERS);
    setDataRows(SAMPLE_ROWS);
    setSelectedColIndex(2); // Auto select "Phòng ban" (Index 2)
    setPreviewGroupKey(null);
    setSearchGroupQuery("");
    toast.info(t("excelSuite.sampleDataLoaded"));
  };

  // Download sample .xlsx file
  const handleDownloadSampleFile = () => {
    try {
      const aoa = [SAMPLE_HEADERS, ...SAMPLE_ROWS];
      const worksheet = XLSX.utils.aoa_to_sheet(aoa);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Dữ Liệu Nhân Sự");
      XLSX.writeFile(workbook, "Danh_Sach_Nhan_Su_Mau.xlsx");
      toast.success(
        lang === "vi"
          ? "Đã tải xuống tệp mẫu 'Danh_Sach_Nhan_Su_Mau.xlsx' thành công!"
          : "Successfully downloaded 'Danh_Sach_Nhan_Su_Mau.xlsx' sample file!"
      );
    } catch (err: any) {
      console.error("Error downloading sample file:", err);
      toast.error(
        lang === "vi" ? `Lỗi tạo tệp mẫu: ${err.message}` : `Failed to create sample file: ${err.message}`
      );
    }
  };

  // Grouping logic: map groupKey -> rows
  const uncategorizedLabel = t("excelSuite.uncategorized") || (lang === "vi" ? "Chưa phân loại (Ô rỗng)" : "Uncategorized (Blank)");

  const groupedData = useMemo(() => {
    if (selectedColIndex === null || dataRows.length === 0) {
      return new Map<string, any[][]>();
    }

    const map = new Map<string, any[][]>();

    dataRows.forEach((row) => {
      const cellVal = row[selectedColIndex];
      let groupKey = cellVal !== undefined && cellVal !== null ? String(cellVal).trim() : "";
      if (groupKey === "") {
        groupKey = uncategorizedLabel;
      }

      if (!map.has(groupKey)) {
        map.set(groupKey, []);
      }
      map.get(groupKey)!.push(row);
    });

    return map;
  }, [dataRows, selectedColIndex, uncategorizedLabel]);

  // Convert grouped map to sorted array for rendering
  const groupList = useMemo(() => {
    const list: { key: string; rows: any[][]; count: number; percentage: number }[] = [];
    const total = dataRows.length || 1;

    groupedData.forEach((rows, key) => {
      list.push({
        key,
        rows,
        count: rows.length,
        percentage: (rows.length / total) * 100,
      });
    });

    // Sort descending by count, then alphabetically
    return list.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  }, [groupedData, dataRows.length]);

  // Filtered group list by search query
  const filteredGroupList = useMemo(() => {
    if (!searchGroupQuery.trim()) return groupList;
    const query = searchGroupQuery.toLowerCase().trim();
    return groupList.filter((g) => g.key.toLowerCase().includes(query));
  }, [groupList, searchGroupQuery]);

  // Helper to sanitize group value into valid OS filename
  const sanitizeFilename = (str: string): string => {
    return str
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, "_")
      .substring(0, 100);
  };

  // Handle Export ZIP
  const handleExportZip = async () => {
    if (groupedData.size === 0) {
      toast.warning(t("excelSuite.noColumnSelected"));
      return;
    }

    setIsExporting(true);
    try {
      const zip = new JSZip();
      const formatExt = exportFormat === "csv" ? ".csv" : ".xlsx";
      let count = 0;

      groupedData.forEach((rows, groupKey) => {
        // Build sheet with headers + group rows
        const aoa = [headers, ...rows];
        const worksheet = XLSX.utils.aoa_to_sheet(aoa);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

        const safeKey = sanitizeFilename(groupKey);
        let individualFilename = safeKey;
        if (includeCountInFilename) {
          const recLabel = lang === "vi" ? "ban_ghi" : "records";
          individualFilename = `${safeKey}_(${rows.length}_${recLabel})`;
        }
        individualFilename += formatExt;

        // Write to buffer
        const fileBuffer = XLSX.write(workbook, {
          bookType: exportFormat,
          type: "array",
        });

        zip.file(individualFilename, fileBuffer);
        count++;
      });

      const zipBlob = await zip.generateAsync({ type: "blob" });
      let zipName = customZipName.trim();
      if (!zipName.toLowerCase().endsWith(".zip")) {
        zipName += ".zip";
      }

      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = zipName;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(
        lang === "vi"
          ? `Đã xuất thành công file ZIP "${zipName}" chứa ${count} tệp!`
          : `Successfully exported ZIP "${zipName}" containing ${count} files!`
      );
    } catch (err: any) {
      console.error("ZIP export error:", err);
      toast.error(
        lang === "vi"
          ? `Lỗi khi xuất tệp ZIP: ${err.message}`
          : `Failed to export ZIP archive: ${err.message}`
      );
    } finally {
      setIsExporting(false);
    }
  };

  // Format file size helper
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const previewGroupData = useMemo(() => {
    if (!previewGroupKey || !groupedData.has(previewGroupKey)) return null;
    return groupedData.get(previewGroupKey);
  }, [previewGroupKey, groupedData]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Optional Inner Header */}
      {!hideInnerHeader && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
              <Columns className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {t("excelSuite.splitByColumnTitle")}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("excelSuite.splitByColumnSubtitle")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: Upload Dropzone or Active File Banner */}
      {dataRows.length === 0 ? (
        <div className="space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-emerald-300 dark:border-emerald-800/80 hover:border-emerald-500 dark:hover:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-2xl p-8 md:p-10 text-center transition-all cursor-pointer group shadow-xs"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />
            <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-inner">
              <Upload className="h-8 w-8" />
            </div>
            <h3 className="text-base md:text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">
              {t("excelSuite.dropzoneSplitByCol")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
              {t("excelSuite.dropzoneSubtitle")}
            </p>
            {isLoading && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <span>{lang === "vi" ? "Đang xử lý tệp..." : "Reading file..."}</span>
              </div>
            )}
          </div>

          {/* Quick Sample Data & Template Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400">
              <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0 animate-pulse" />
              <span>
                {lang === "vi"
                  ? "Chưa có sẵn tệp Excel? Bạn có thể trải nghiệm ngay với dữ liệu mẫu thử hoặc tải file mẫu."
                  : "Don't have an Excel file ready? Try quick sample data or download a sample file."}
              </span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLoadSampleData();
                }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer hover:shadow-emerald-600/20"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{t("excelSuite.trySampleData")}</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadSampleFile();
                }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
              >
                <FileDown className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{t("excelSuite.downloadSampleFile")}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Active File Summary Bar */
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm md:text-base">
                  {fileName}
                </span>
                <span className="text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md">
                  {formatBytes(fileSize)}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-3">
                <span>
                  {t("excelSuite.totalRowsCount")} <strong>{dataRows.length.toLocaleString()}</strong>
                </span>
                <span>•</span>
                <span>
                  {lang === "vi" ? "Số cột:" : "Columns:"} <strong>{headers.length}</strong>
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-semibold transition-colors cursor-pointer self-start sm:self-center"
          >
            <Trash2 className="h-4 w-4" />
            <span>{t("excelSuite.changeFileBtn")}</span>
          </button>
        </div>
      )}

      {/* STEP 2: Column Selection Panel */}
      {dataRows.length > 0 && (
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm md:text-base border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <Filter className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>{t("excelSuite.selectColumnHeader")}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                {lang === "vi" ? "Chọn cột làm tiêu chí phân nhóm:" : "Select grouping column:"}
              </label>
              <select
                value={selectedColIndex !== null ? selectedColIndex : ""}
                onChange={(e) =>
                  setSelectedColIndex(e.target.value !== "" ? Number(e.target.value) : null)
                }
                className="w-full bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="">{t("excelSuite.selectColumnPlaceholder")}</option>
                {headers.map((h, idx) => (
                  <option key={idx} value={idx}>
                    {idx + 1}. {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Column Quick Info Card */}
            {selectedColIndex !== null && (
              <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl p-3.5 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                  #{selectedColIndex + 1}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-emerald-800 dark:text-emerald-300 font-extrabold">
                    {lang === "vi" ? "Cột đã chọn" : "Selected Column"}
                  </p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {headers[selectedColIndex]}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: Summary Banner & Breakdown Table */}
      {dataRows.length > 0 && selectedColIndex !== null && (
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-5">
          {/* Summary Banner */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 rounded-xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold text-lg">
                ⚡
              </div>
              <div>
                <p className="text-xs text-emerald-100 uppercase tracking-wider font-semibold">
                  {lang === "vi" ? "Kết quả phân nhóm" : "Grouping Summary"}
                </p>
                <p className="text-sm md:text-base font-bold">
                  {t("excelSuite.summaryBanner").replace(/{count}/g, String(groupedData.size))}
                </p>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-xs px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-white/20 whitespace-nowrap self-start sm:self-center">
              {t("excelSuite.totalGroupsCount")} {groupedData.size}
            </div>
          </div>

          {/* Group Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchGroupQuery}
                onChange={(e) => setSearchGroupQuery(e.target.value)}
                placeholder={t("excelSuite.searchGroupPlaceholder")}
                className="w-full bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {searchGroupQuery && (
                <button
                  onClick={() => setSearchGroupQuery("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 self-end sm:self-center">
              {lang === "vi"
                ? `Hiển thị ${filteredGroupList.length} trên ${groupList.length} nhóm`
                : `Showing ${filteredGroupList.length} of ${groupList.length} groups`}
            </p>
          </div>

          {/* Breakdown Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 font-bold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3.5 w-12 text-center">#</th>
                    <th className="py-2.5 px-3.5">{t("excelSuite.groupValueHeader")}</th>
                    <th className="py-2.5 px-3.5 w-36 text-right">{t("excelSuite.recordCountHeader")}</th>
                    <th className="py-2.5 px-3.5 w-48">{t("excelSuite.proportionHeader")}</th>
                    <th className="py-2.5 px-3.5 w-24 text-center">{lang === "vi" ? "Xem trước" : "Preview"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {filteredGroupList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        {lang === "vi" ? "Không tìm thấy nhóm phù hợp" : "No matching groups found"}
                      </td>
                    </tr>
                  ) : (
                    filteredGroupList.map((g, idx) => (
                      <tr
                        key={g.key}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-2.5 px-3.5 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3.5 font-semibold text-slate-900 dark:text-slate-100 max-w-xs truncate">
                          {g.key === uncategorizedLabel ? (
                            <span className="italic text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                              {g.key}
                            </span>
                          ) : (
                            <span>{g.key}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {g.count.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(g.percentage, 100)}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 w-10 text-right">
                              {g.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          <button
                            onClick={() => setPreviewGroupKey(g.key)}
                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                            title={lang === "vi" ? "Xem trước dữ liệu nhóm" : "Preview group data"}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Export Configuration & Download ZIP */}
      {dataRows.length > 0 && selectedColIndex !== null && (
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-5">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm md:text-base border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <FileArchive className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>{lang === "vi" ? "Cấu Hình Xuất Tệp ZIP" : "ZIP Export Settings"}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* ZIP Filename */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                {t("excelSuite.customZipFilename")} (.zip):
              </label>
              <input
                type="text"
                value={customZipName}
                onChange={(e) => setCustomZipName(e.target.value)}
                placeholder="split_data_by_column.zip"
                className="w-full bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Export Format Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                {t("excelSuite.exportFormat")}:
              </label>
              <div className="flex items-center gap-3">
                <label className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  exportFormat === "xlsx"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F172A] text-slate-600 dark:text-slate-400"
                }`}>
                  <input
                    type="radio"
                    name="exportFormat"
                    value="xlsx"
                    checked={exportFormat === "xlsx"}
                    onChange={() => setExportFormat("xlsx")}
                    className="hidden"
                  />
                  <span>Excel Workbook (.xlsx)</span>
                </label>

                <label className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  exportFormat === "csv"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F172A] text-slate-600 dark:text-slate-400"
                }`}>
                  <input
                    type="radio"
                    name="exportFormat"
                    value="csv"
                    checked={exportFormat === "csv"}
                    onChange={() => setExportFormat("csv")}
                    className="hidden"
                  />
                  <span>CSV File (.csv)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Toggle include record count in filename */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="includeCountToggle"
                checked={includeCountInFilename}
                onChange={(e) => setIncludeCountInFilename(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="includeCountToggle" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                {t("excelSuite.includeCountInFilename")}
              </label>
            </div>
          </div>

          {/* Output Filename Sample Preview */}
          {groupList.length > 0 && (
            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {t("excelSuite.fileNamePreview")}
              </span>
              <div className="flex flex-wrap gap-2 pt-1 font-mono text-[11px]">
                {groupList.slice(0, 3).map((g) => {
                  const safeKey = sanitizeFilename(g.key);
                  const recLabel = lang === "vi" ? "ban_ghi" : "records";
                  const sampleName = includeCountInFilename
                    ? `${safeKey}_(${g.count}_${recLabel}).${exportFormat}`
                    : `${safeKey}.${exportFormat}`;
                  return (
                    <span
                      key={g.key}
                      className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-md text-emerald-700 dark:text-emerald-400 font-semibold"
                    >
                      {sampleName}
                    </span>
                  );
                })}
                {groupList.length > 3 && (
                  <span className="self-center text-slate-400 italic">
                    +{groupList.length - 3} {lang === "vi" ? "file khác" : "more files"}...
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Export Action Button */}
          <button
            onClick={handleExportZip}
            disabled={isExporting || groupedData.size === 0}
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-bold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{lang === "vi" ? "Đang tạo file ZIP..." : "Creating ZIP archive..."}</span>
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                <span>
                  {t("excelSuite.exportZipBtn").replace(/{count}/g, String(groupedData.size))}
                </span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Group Row Data Preview Modal */}
      {previewGroupKey && previewGroupData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80">
              <div className="flex items-center gap-2">
                <Table className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm md:text-base">
                  {t("excelSuite.previewGroupTitle").replace(/{name}/g, previewGroupKey)}
                </h3>
                <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold">
                  {previewGroupData.length} {lang === "vi" ? "dòng" : "records"}
                </span>
              </div>
              <button
                onClick={() => setPreviewGroupKey(null)}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body: Table Grid */}
            <div className="flex-1 overflow-auto p-4">
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      {headers.map((h, idx) => (
                        <th
                          key={idx}
                          className={`py-2.5 px-3 whitespace-nowrap ${
                            idx === selectedColIndex
                              ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200"
                              : ""
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {previewGroupData.slice(0, 100).map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {rIdx + 1}
                        </td>
                        {headers.map((_, cIdx) => (
                          <td
                            key={cIdx}
                            className={`py-2 px-3 whitespace-nowrap max-w-xs truncate ${
                              cIdx === selectedColIndex
                                ? "font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20"
                                : ""
                            }`}
                          >
                            {row[cIdx] !== undefined && row[cIdx] !== null
                              ? String(row[cIdx])
                              : ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewGroupData.length > 100 && (
                <p className="text-center text-xs text-slate-400 italic mt-3">
                  {lang === "vi"
                    ? `Hiển thị 100 dòng đầu tiên trên tổng số ${previewGroupData.length} dòng.`
                    : `Showing first 100 rows out of ${previewGroupData.length} total.`}
                </p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-900/80">
              <button
                onClick={() => setPreviewGroupKey(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
