import React, { useState, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import { ExcelMergerState, ActiveModule } from "../types";
import {
  Layers,
  Upload,
  Download,
  Copy,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  RotateCcw,
  FileSpreadsheet,
  Check,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Sparkles,
  ListFilter,
  FileCheck,
  CheckCircle2,
  Key,
  UserCheck,
  X,
  GripVertical
} from "lucide-react";
import { toast } from "react-toastify";

export interface MergedRecord {
  id: string;
  _originalFileIndex: number;
  _originalFileName: string;
  _originalRowIndex: number;
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  email: string;
  mobileNumber: string;
  dob: string;
  role: string;
  extraCols: Record<string, string>;
}

export interface FileDataStore {
  fileName: string;
  records: MergedRecord[];
}

export interface LoadedFileInfo {
  name: string;
  recordCount: number;
  index: number;
}

interface ExcelMergerExtractorProps {
  state?: ExcelMergerState;
  onChange?: (newState: Partial<ExcelMergerState>) => void;
  onSwitchModule?: (mod: ActiveModule) => void;
}

type SortField =
  | "default"
  | "firstName"
  | "lastName"
  | "username"
  | "password"
  | "email"
  | "mobileNumber"
  | "dob"
  | "role"
  | "_originalFileName";

export default function ExcelMergerExtractor({
  state,
  onChange,
  onSwitchModule
}: ExcelMergerExtractorProps) {

  // State management
  const [fileStores, setFileStores] = useState<FileDataStore[]>([]);
  const [records, setRecords] = useState<MergedRecord[]>([]);
  const [loadedFiles, setLoadedFiles] = useState<LoadedFileInfo[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{ name: string; recordCount: number } | null>(null);

  // Drag & drop file reordering state
  const [draggedFileIndex, setDraggedFileIndex] = useState<number | null>(null);
  const [dragOverFileIndex, setDragOverFileIndex] = useState<number | null>(null);

  // Sorting & Filtering
  const [sortField, setSortField] = useState<SortField>("default");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = state?.pageSize ?? 10;
  const setPageSize = (size: number) => onChange?.({ pageSize: size });

  // Format cell value helper
  const formatCellValue = (val: any): string => {
    if (val === null || val === undefined) return "";
    if (typeof val === "number" && val > 20000 && val < 60000) {
      const date = XLSX.SSF.parse_date_code(val);
      if (date) {
        const dd = String(date.d).padStart(2, "0");
        const mm = String(date.m).padStart(2, "0");
        const yyyy = date.y;
        return `${dd}/${mm}/${yyyy}`;
      }
    }
    return String(val).trim();
  };

  // Rebuild state dataset from fileStores with natural or preserved custom order
  const rebuildFromStores = useCallback((stores: FileDataStore[], preserveStoreOrder = false) => {
    const finalStores = preserveStoreOrder
      ? [...stores]
      : [...stores].sort((a, b) =>
          a.fileName.localeCompare(b.fileName, undefined, {
            numeric: true,
            sensitivity: "base"
          })
        );

    const newAllRecords: MergedRecord[] = [];
    const filesSummary: LoadedFileInfo[] = [];

    finalStores.forEach((store, fIdx) => {
      const updatedStoreRecords = store.records.map((r, rIdx) => ({
        ...r,
        _originalFileIndex: fIdx,
        _originalFileName: store.fileName,
        _originalRowIndex: rIdx + 2
      }));

      newAllRecords.push(...updatedStoreRecords);
      filesSummary.push({
        name: store.fileName,
        recordCount: updatedStoreRecords.length,
        index: fIdx
      });
    });

    setFileStores(finalStores);
    setRecords(newAllRecords);
    setLoadedFiles(filesSummary);
    setSortField("default");
    setCurrentPage(1);

    return { allRecords: newAllRecords, summary: filesSummary };
  }, []);

  // Reorder files via drag & drop
  const handleReorderFiles = (fromIndex: number, toIndex: number) => {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= fileStores.length ||
      toIndex >= fileStores.length
    ) {
      return;
    }
    const updatedStores = [...fileStores];
    const [movedStore] = updatedStores.splice(fromIndex, 1);
    updatedStores.splice(toIndex, 0, movedStore);

    rebuildFromStores(updatedStores, true);
    toast.success(
      `Reordered file sequence: "${movedStore.fileName}" moved to position #${toIndex + 1}`
    );
  };

  // Multiple File Processing with Natural Filename Sorting & Preservation of existing files
  const processFiles = useCallback(async (files: File[]) => {
    if (!files || files.length === 0) return;

    // Filter valid excel files
    const validFiles = files.filter(
      (f) =>
        f.name.endsWith(".xlsx") ||
        f.name.endsWith(".xls") ||
        f.name.endsWith(".csv")
    );

    if (validFiles.length === 0) {
      toast.error("Please upload valid .xlsx, .xls or .csv files.");
      return;
    }

    const newParsedStores: FileDataStore[] = [];

    toast.info(`Processing ${validFiles.length} uploaded file(s)...`);

    for (let fileIdx = 0; fileIdx < validFiles.length; fileIdx++) {
      const file = validFiles[fileIdx];
      try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) continue;

        const worksheet = workbook.Sheets[sheetName];
        const rawAoa: any[][] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: ""
        });

        if (rawAoa.length < 1) continue;

        // Header row detection
        let headerRowIdx = 0;
        let maxScore = -1;
        const keywords = ["first", "last", "user", "pass", "email", "phone", "mobile", "sdt", "birth", "dob", "role", "họ", "tên", "ngàysinh", "vaitro"];

        for (let r = 0; r < Math.min(10, rawAoa.length); r++) {
          const rowStr = (rawAoa[r] || []).map((c) => String(c).toLowerCase()).join(" ");
          let score = 0;
          keywords.forEach((kw) => {
            if (rowStr.includes(kw)) score++;
          });
          if (score > maxScore) {
            maxScore = score;
            headerRowIdx = r;
          }
        }

        const headerRow = (rawAoa[headerRowIdx] || []).map((h: any) => String(h).trim());

        // Dynamic column mapper
        const colIndexes: Record<string, number> = {};
        headerRow.forEach((colName, idx) => {
          const norm = colName
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, "");
          const rawLower = colName.toLowerCase();

          // Phone / Mobile number
          if (
            norm.includes("mobile") ||
            norm.includes("phone") ||
            norm.includes("sdt") ||
            norm.includes("dienthoai") ||
            norm.includes("contact") ||
            rawLower.includes("số đt") ||
            rawLower.includes("sđt")
          ) {
            colIndexes["mobileNumber"] = idx;
          }
          // Email
          else if (norm.includes("email") || norm.includes("mail")) {
            colIndexes["email"] = idx;
          }
          // Username
          else if (norm.includes("username") || norm.includes("user")) {
            colIndexes["username"] = idx;
          }
          // Password
          else if (norm.includes("password") || norm.includes("pass")) {
            colIndexes["password"] = idx;
          }
          // DOB
          else if (
            norm.includes("birth") ||
            norm.includes("dob") ||
            norm.includes("ngaysinh") ||
            rawLower.includes("ngày sinh")
          ) {
            colIndexes["dob"] = idx;
          }
          // Role
          else if (
            norm.includes("role") ||
            norm.includes("vaitro") ||
            norm.includes("chucvu") ||
            rawLower.includes("vai trò")
          ) {
            colIndexes["role"] = idx;
          }
          // First Name
          else if (
            norm === "first" ||
            norm.includes("firstname") ||
            norm === "ten" ||
            norm.includes("tengoi") ||
            norm.includes("givenname")
          ) {
            colIndexes["firstName"] = idx;
          }
          // Last Name
          else if (
            norm === "last" ||
            norm.includes("lastname") ||
            norm === "ho" ||
            norm.includes("surname") ||
            norm.includes("familyname")
          ) {
            colIndexes["lastName"] = idx;
          }
          // Full Name
          else if (
            norm.includes("fullname") ||
            norm.includes("hovaten") ||
            norm.includes("hoten")
          ) {
            colIndexes["firstName"] = idx;
            colIndexes["lastName"] = idx;
          }
        });

        // Positional fallbacks if header names differ
        const assigned = new Set<number>(Object.values(colIndexes));
        const findNextUnassigned = (preferred: number) => {
          if (!assigned.has(preferred) && preferred < headerRow.length) {
            assigned.add(preferred);
            return preferred;
          }
          for (let i = 0; i < Math.max(headerRow.length, 10); i++) {
            if (!assigned.has(i)) {
              assigned.add(i);
              return i;
            }
          }
          return preferred;
        };

        const fnIdx = colIndexes["firstName"] ?? findNextUnassigned(0);
        const lnIdx = colIndexes["lastName"] ?? findNextUnassigned(1);
        const unIdx = colIndexes["username"] ?? findNextUnassigned(2);
        const pwIdx = colIndexes["password"] ?? findNextUnassigned(3);
        const emIdx = colIndexes["email"] ?? findNextUnassigned(4);
        const mbIdx = colIndexes["mobileNumber"] ?? findNextUnassigned(5);
        const dbIdx = colIndexes["dob"] ?? findNextUnassigned(6);
        const rlIdx = colIndexes["role"] ?? findNextUnassigned(7);

        const dataRows = rawAoa.slice(headerRowIdx + 1);
        const fileRecords: MergedRecord[] = [];

        dataRows.forEach((row, rowIdx) => {
          const isAllEmpty = row.every(
            (c) => c === null || c === undefined || String(c).trim() === ""
          );
          if (isAllEmpty) return;

          const firstName = formatCellValue(row[fnIdx]);
          const lastName = formatCellValue(row[lnIdx]);
          const username = formatCellValue(row[unIdx]);
          const password = formatCellValue(row[pwIdx]);
          const email = formatCellValue(row[emIdx]);
          const mobileNumber = formatCellValue(row[mbIdx]);
          const dob = formatCellValue(row[dbIdx]);
          const role = formatCellValue(row[rlIdx]);

          // Extra columns
          const extraCols: Record<string, string> = {};
          headerRow.forEach((hName, cIdx) => {
            if (
              ![fnIdx, lnIdx, unIdx, pwIdx, emIdx, mbIdx, dbIdx, rlIdx].includes(
                cIdx
              )
            ) {
              extraCols[hName || `Col_${cIdx + 1}`] = formatCellValue(row[cIdx]);
            }
          });

          fileRecords.push({
            id: `merge-rec-${file.name}-${rowIdx}-${Date.now()}`,
            _originalFileIndex: 0,
            _originalFileName: file.name,
            _originalRowIndex: rowIdx + 2,
            firstName,
            lastName,
            username,
            password,
            email,
            mobileNumber,
            dob,
            role,
            extraCols
          });
        });

        newParsedStores.push({
          fileName: file.name,
          records: fileRecords
        });
      } catch (err: any) {
        console.error(`Error reading ${file.name}:`, err);
        toast.error(`Failed to parse ${file.name}: ${err.message || "Unknown error"}`);
      }
    }

    setFileStores((prevStores) => {
      const existingMap = new Map<string, FileDataStore>();
      prevStores.forEach((s) => existingMap.set(s.fileName, s));
      newParsedStores.forEach((s) => existingMap.set(s.fileName, s));

      const updatedStores = Array.from(existingMap.values());
      const { allRecords, summary } = rebuildFromStores(updatedStores);

      toast.success(
        `Merged ${newParsedStores.length} file(s). Total dataset now has ${allRecords.length} record(s) across ${summary.length} file(s)!`
      );

      return updatedStores;
    });
  }, [rebuildFromStores]);

  // File Change Input Event Handler
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  // Dropzone Event Handlers
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  // Load Demo Data Set
  const handleLoadSampleDemo = () => {
    const demoFilesData = [
      {
        fileName: "account.xlsx",
        records: [
          ["Admin", "Manager", "admin_corp", "P@ssw0rd2026", "admin@corp.com", "+1 555-0100", "01/01/1990", "Teacher"],
          ["Sarah", "Conner", "s_conner", "SecuRe#123", "sarah@corp.com", "+1 555-0101", "15/05/1992", "Teacher"]
        ]
      },
      {
        fileName: "account (1).xlsx",
        records: [
          ["Michael", "Scott", "m_scott", "DunderMifflin1", "m.scott@dunder.com", "0912345678", "15/03/1980", "Teacher"],
          ["Dwight", "Schrute", "d_schrute", "Beets&Bears2", "", "", "20/01/1982", "Student"],
          ["Jim", "Halpert", "j_halpert", "PrankMaster88", "j.halpert@dunder.com", "0912345679", "01/10/1985", "Teacher"]
        ]
      },
      {
        fileName: "account (2).xlsx",
        records: [
          ["Pam", "Beesly", "p_beesly", "ArtPass2026", "p.beesly@dunder.com", "", "25/03/1986", "Student"],
          ["Ryan", "Howard", "r_howard", "WUpfh!2026", "ryan@wupfh.com", "0987654321", "05/05/1988", "Student"],
          ["Kelly", "Kapoor", "k_kapoor", "FashionRulez1", "", "", "12/08/1989", "Student"]
        ]
      },
      {
        fileName: "account (10).xlsx",
        records: [
          ["Angela", "Martin", "a_martin", "CatsRule123", "a.martin@dunder.com", "", "11/11/1981", "Teacher"],
          ["Kevin", "Malone", "k_malone", "ChiliPass456", "", "0911223344", "06/06/1983", "Student"]
        ]
      }
    ];

    const demoStores: FileDataStore[] = demoFilesData.map((f, fIdx) => ({
      fileName: f.fileName,
      records: f.records.map((r, rIdx) => ({
        id: `demo-${fIdx}-${rIdx}`,
        _originalFileIndex: fIdx,
        _originalFileName: f.fileName,
        _originalRowIndex: rIdx + 2,
        firstName: r[0],
        lastName: r[1],
        username: r[2],
        password: r[3],
        email: r[4],
        mobileNumber: r[5],
        dob: r[6],
        role: r[7],
        extraCols: {}
      }))
    }));

    rebuildFromStores(demoStores);
    toast.success("Loaded sample multi-file demo dataset!");
  };

  // Prompt File Deletion Warning
  const handlePromptDeleteFile = (fileName: string, recordCount: number) => {
    setFileToDelete({ name: fileName, recordCount });
  };

  // Confirm Delete File and remove its data
  const handleConfirmDeleteFile = () => {
    if (!fileToDelete) return;
    const targetName = fileToDelete.name;

    const remainingStores = fileStores.filter((s) => s.fileName !== targetName);
    rebuildFromStores(remainingStores);

    toast.success(`Removed ${targetName} and its ${fileToDelete.recordCount} record(s).`);
    setFileToDelete(null);
  };

  // Clear All
  const handleClearAll = () => {
    setFileStores([]);
    setRecords([]);
    setLoadedFiles([]);
    setSearchQuery("");
    setSortField("default");
    setCurrentPage(1);
    toast.info("Cleared all merged records and file list.");
  };

  // Restore Default Natural Sorted Order
  const handleRestoreDefaultOrder = () => {
    setSortField("default");
    setSortDirection("asc");
    toast.info("Restored default merged file sequence order.");
  };

  // Header Sorting Toggle
  const handleHeaderSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortField("default");
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filtered and Sorted Dataset
  const processedRecords = useMemo(() => {
    let result = [...records];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((rec) => {
        const fullStr = `${rec.firstName} ${rec.lastName} ${rec.username} ${rec.password} ${rec.email} ${rec.mobileNumber} ${rec.dob} ${rec.role} ${rec._originalFileName}`.toLowerCase();
        return fullStr.includes(q);
      });
    }

    // Sorting
    if (sortField === "default") {
      result.sort((a, b) => {
        if (a._originalFileIndex !== b._originalFileIndex) {
          return a._originalFileIndex - b._originalFileIndex;
        }
        return a._originalRowIndex - b._originalRowIndex;
      });
    } else {
      result.sort((a, b) => {
        const valA = String(a[sortField as keyof MergedRecord] || "").toLowerCase();
        const valB = String(b[sortField as keyof MergedRecord] || "").toLowerCase();

        const cmp = valA.localeCompare(valB, undefined, {
          numeric: true,
          sensitivity: "base"
        });
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [records, searchQuery, sortField, sortDirection]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(processedRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedRecords.slice(start, start + pageSize);
  }, [processedRecords, currentPage, pageSize]);

  // Quick Copy Username List
  const handleCopyUsernames = async () => {
    const usernames = processedRecords
      .map((r) => r.username)
      .filter((u) => u.trim().length > 0);

    if (usernames.length === 0) {
      toast.warn("No Username data available to copy.");
      return;
    }

    const textToCopy = usernames.join("\n");
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast.success(
        `Copied ${usernames.length} Username(s) to clipboard successfully!`
      );
    } catch (err) {
      toast.error("Failed to copy usernames to clipboard.");
    }
  };

  // Quick Copy Password List
  const handleCopyPasswords = async () => {
    const passwords = processedRecords
      .map((r) => r.password)
      .filter((p) => p.trim().length > 0);

    if (passwords.length === 0) {
      toast.warn("No Password data available to copy.");
      return;
    }

    const textToCopy = passwords.join("\n");
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast.success(
        `Copied ${passwords.length} Password(s) to clipboard successfully!`
      );
    } catch (err) {
      toast.error("Failed to copy passwords to clipboard.");
    }
  };

  // Download Merged XLSX File
  const handleDownloadMergedXLSX = () => {
    if (processedRecords.length === 0) {
      toast.warn("No data available to export.");
      return;
    }

    const exportAoa: any[][] = [
      [
        "First Name",
        "Last Name",
        "Username",
        "Password",
        "Email",
        "Mobile Number",
        "Date of Birth",
        "Role"
      ]
    ];

    processedRecords.forEach((r) => {
      exportAoa.push([
        r.firstName,
        r.lastName,
        r.username,
        r.password,
        r.email,
        r.mobileNumber,
        r.dob,
        r.role
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(exportAoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Merged Accounts");

    XLSX.writeFile(wb, "Merged_Account_Template.xlsx");
    toast.success(
      `Successfully exported ${processedRecords.length} merged records into Merged_Account_Template.xlsx!`
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-[#0B0F1A] text-slate-800 dark:text-slate-200 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Top Navigation & Module Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="h-9 w-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-600/20">
              <Layers className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Excel Merger & Data Extractor (Account Template)
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Upload multiple processed Excel files (e.g. account.xlsx, account (1).xlsx, account (2).xlsx), merge with natural filename sorting, and extract username & password lists.
          </p>
        </div>

        {/* Suite Sub-Tabs Switcher */}
        <div className="flex items-center gap-2">
          {onSwitchModule && (
            <div className="flex items-center gap-1 p-1 bg-slate-200/80 dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800">
              <button
                onClick={() => onSwitchModule(ActiveModule.EXCEL_SPLITTER)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-indigo-500" />
                <span>Splitter & Validator</span>
              </button>
              <button
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-[#111827] text-purple-600 dark:text-purple-400 shadow-xs flex items-center gap-1.5 cursor-default"
              >
                <Layers className="h-3.5 w-3.5 text-purple-500" />
                <span>Merger & Extractor</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Drop Zone / Multi File Input Area */}
      {records.length === 0 ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
            isDragging
              ? "border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 scale-[1.01]"
              : "border-slate-300 dark:border-slate-800 bg-white dark:bg-[#111827] hover:border-purple-400 dark:hover:border-purple-500/50"
          }`}
        >
          <div className="h-16 w-16 rounded-2xl bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-800/60 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4 shadow-inner">
            <Upload className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
            Drop Multiple Processed Excel Files Here
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mb-5 leading-relaxed">
            Select or drag multiple files (e.g. <code>account.xlsx</code>, <code>account (1).xlsx</code>, <code>account (2).xlsx</code> ... <code>account (10).xlsx</code>). Files will be automatically <strong>naturally sorted</strong> before merging!
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <label className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md shadow-purple-600/20 cursor-pointer transition-all flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              <span>Select Multiple XLSX Files</span>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                multiple
                onChange={handleFileInputChange}
                className="hidden"
              />
            </label>

            <button
              onClick={handleLoadSampleDemo}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all"
            >
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span>Load Sample Batch Demo</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Loaded Files Overview & Quick Stats Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 shadow-xs flex flex-col space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  <FileCheck className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Merged Dataset: {records.length} Total Records across {loadedFiles.length} Files
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Drag & drop file badges below to reorder files and update table record sequence.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5">
                  <Upload className="h-3.5 w-3.5 text-purple-500" />
                  <span>Add More Files</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    multiple
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={handleClearAll}
                  className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-semibold cursor-pointer transition-all hover:bg-rose-100 dark:hover:bg-rose-900/50 flex items-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear List</span>
                </button>
              </div>
            </div>

            {/* File List Badges with Drag and Drop Reordering */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Files (Drag & Drop to reorder):
              </span>
              {loadedFiles.map((f, idx) => (
                <div
                  key={f.name}
                  draggable
                  onDragStart={(e) => {
                    setDraggedFileIndex(idx);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", String(idx));
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dragOverFileIndex !== idx) {
                      setDragOverFileIndex(idx);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverFileIndex === idx) {
                      setDragOverFileIndex(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedFileIndex !== null && draggedFileIndex !== idx) {
                      handleReorderFiles(draggedFileIndex, idx);
                    }
                    setDraggedFileIndex(null);
                    setDragOverFileIndex(null);
                  }}
                  onDragEnd={() => {
                    setDraggedFileIndex(null);
                    setDragOverFileIndex(null);
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-medium border cursor-grab active:cursor-grabbing transition-all select-none ${
                    draggedFileIndex === idx
                      ? "opacity-40 border-dashed border-purple-500 bg-purple-100 dark:bg-purple-900/40"
                      : dragOverFileIndex === idx
                      ? "border-purple-500 bg-purple-100 dark:bg-purple-900/60 ring-2 ring-purple-500/50 scale-105"
                      : "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/50 hover:border-purple-400"
                  }`}
                  title="Click and drag to reorder file sequence"
                >
                  <GripVertical className="h-3.5 w-3.5 text-purple-400/80 shrink-0" />
                  <span className="text-[10px] opacity-60 font-bold">#{idx + 1}</span>
                  <span className="font-semibold">{f.name}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-purple-200/80 dark:bg-purple-900 text-[10px] font-bold">
                    {f.recordCount} recs
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePromptDeleteFile(f.name, f.recordCount);
                    }}
                    className="ml-0.5 p-0.5 rounded-md hover:bg-rose-500 hover:text-white text-slate-400 dark:text-slate-400 transition-colors cursor-pointer"
                    title={`Delete ${f.name} and remove its data`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Copy Extraction & Export Utility Actions Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Quick Copy Extraction Utilities */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Key className="h-3.5 w-3.5 text-amber-500" />
                Quick Copy Utilities:
              </span>

              <button
                onClick={handleCopyUsernames}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all"
                title="Copy only Usernames as newline-separated list"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Username List</span>
              </button>

              <button
                onClick={handleCopyPasswords}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all"
                title="Copy only Passwords as newline-separated list"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Password List</span>
              </button>
            </div>

            {/* Export & Order Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {sortField !== "default" && (
                <button
                  onClick={handleRestoreDefaultOrder}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Restore default naturally sorted file order"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Restore Default Order</span>
                </button>
              )}

              <button
                onClick={handleDownloadMergedXLSX}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
              >
                <Download className="h-4 w-4" />
                <span>Download Merged XLSX File</span>
              </button>
            </div>
          </div>

          {/* Interactive Data Table Section */}
          <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 shadow-xs overflow-hidden flex flex-col">
            {/* Search Bar & Table Controls */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name, username, email, phone, role, file..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span>
                  Showing {processedRecords.length} of {records.length} records
                </span>

                <div className="flex items-center gap-1.5">
                  <span>Page size:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table Display */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3 w-12 text-center">#</th>
                    <th
                      onClick={() => handleHeaderSort("_originalFileName")}
                      className="py-3 px-3 min-w-[140px] cursor-pointer hover:text-purple-500 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Source File</span>
                        {sortField === "_originalFileName" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-purple-500" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-purple-500" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleHeaderSort("firstName")}
                      className="py-3 px-3 min-w-[120px] cursor-pointer hover:text-purple-500 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>First Name</span>
                        {sortField === "firstName" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-purple-500" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-purple-500" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleHeaderSort("lastName")}
                      className="py-3 px-3 min-w-[120px] cursor-pointer hover:text-purple-500 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Last Name</span>
                        {sortField === "lastName" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-purple-500" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-purple-500" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleHeaderSort("username")}
                      className="py-3 px-3 min-w-[130px] cursor-pointer hover:text-purple-500 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Username</span>
                        {sortField === "username" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-purple-500" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-purple-500" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleHeaderSort("password")}
                      className="py-3 px-3 min-w-[130px] cursor-pointer hover:text-purple-500 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Password</span>
                        {sortField === "password" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-purple-500" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-purple-500" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleHeaderSort("email")}
                      className="py-3 px-3 min-w-[160px] cursor-pointer hover:text-purple-500 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Email</span>
                        {sortField === "email" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-purple-500" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-purple-500" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleHeaderSort("mobileNumber")}
                      className="py-3 px-3 min-w-[130px] cursor-pointer hover:text-purple-500 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Mobile Number</span>
                        {sortField === "mobileNumber" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-purple-500" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-purple-500" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleHeaderSort("dob")}
                      className="py-3 px-3 min-w-[120px] cursor-pointer hover:text-purple-500 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Date of Birth</span>
                        {sortField === "dob" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-purple-500" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-purple-500" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleHeaderSort("role")}
                      className="py-3 px-3 min-w-[110px] cursor-pointer hover:text-purple-500 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Role</span>
                        {sortField === "role" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-purple-500" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-purple-500" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-30" />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                  {paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        No records match the current filter or file input.
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((rec, index) => {
                      const absoluteIndex = (currentPage - 1) * pageSize + index + 1;
                      return (
                        <tr
                          key={rec.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-400">
                            #{absoluteIndex}
                          </td>

                          {/* Source File Badge */}
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {rec._originalFileName}
                            </span>
                          </td>

                          {/* First Name */}
                          <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                            {rec.firstName || <span className="text-slate-400 italic">-</span>}
                          </td>

                          {/* Last Name */}
                          <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                            {rec.lastName || <span className="text-slate-400 italic">-</span>}
                          </td>

                          {/* Username */}
                          <td className="py-2.5 px-3 font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                            {rec.username || <span className="text-slate-400 font-sans italic">-</span>}
                          </td>

                          {/* Password */}
                          <td className="py-2.5 px-3 font-mono text-purple-600 dark:text-purple-400 font-medium">
                            {rec.password || <span className="text-slate-400 font-sans italic">-</span>}
                          </td>

                          {/* Email */}
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                            {rec.email || <span className="text-slate-400 italic">-</span>}
                          </td>

                          {/* Mobile Number */}
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                            {rec.mobileNumber || <span className="text-slate-400 font-sans italic">-</span>}
                          </td>

                          {/* Date of Birth */}
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                            {rec.dob || <span className="text-slate-400 font-sans italic">-</span>}
                          </td>

                          {/* Role Badge */}
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                rec.role.toLowerCase().includes("teacher") ||
                                rec.role.toLowerCase().includes("giáo viên")
                                  ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60"
                                  : "bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/60"
                              }`}
                            >
                              {rec.role || "Student"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Page {currentPage} of {totalPages}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let p = i + 1;
                      if (totalPages > 5 && currentPage > 3) {
                        p = currentPage - 3 + i;
                        if (p > totalPages) p = totalPages - (4 - i);
                      }
                      return (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`w-7 h-7 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer ${
                            currentPage === p
                              ? "bg-purple-600 text-white"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* File Delete Confirmation Modal */}
      {fileToDelete && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Confirm File Deletion
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Remove file and all associated records
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to remove <strong className="font-mono text-purple-600 dark:text-purple-400">{fileToDelete.name}</strong>?
              This action will permanently delete <strong className="text-rose-600 dark:text-rose-400">{fileToDelete.recordCount} records</strong> from the merged dataset.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteFile}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
