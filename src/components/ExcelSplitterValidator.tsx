import React, { useState, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { ExcelSplitterState, ActiveModule } from "../types";
import { useI18n } from "../utils/i18n";
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  Users,
  UserCheck,
  GraduationCap,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  FileCheck,
  AlertCircle,
  X,
  Check,
  Archive,
  RotateCcw,
  Layers,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Lock,
  Unlock
} from "lucide-react";
import { toast } from "react-toastify";

export interface ValidationError {
  field: "firstName" | "lastName" | "phoneNumber" | "email" | "dob" | "role" | "general";
  message: string;
}

export interface ParsedRecord {
  id: string;
  rowIndex: number; // Row number in original Excel (e.g. 6, 7...)
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  dob: string;
  role: string;
  extraCols: string[]; // Any additional columns from original row
  errors: ValidationError[];
  isValid: boolean;
}

interface ColumnIndexes {
  firstName: number;
  lastName: number;
  phoneNumber: number;
  email: number;
  dob: number;
  role: number;
}

interface ExcelSplitterValidatorProps {
  state?: ExcelSplitterState;
  onChange?: (newState: Partial<ExcelSplitterState>) => void;
  onSwitchModule?: (mod: ActiveModule) => void;
}

const DEFAULT_HEADERS_AOA = [
  ["ACCOUNT CREATION TEMPLATE - CORPORATE SYSTEM", "", "", "", "", ""],
  [
    "Note: First Name, Last Name, Date of Birth (DD/MM/YYYY), and Role are required. Email is required for Teachers, optional for Students.",
    "",
    "",
    "",
    "",
    ""
  ],
  ["System ID: ACC-MGMT-2026", "", "", "", "", ""],
  ["Department: HR & IT Onboarding", "", "", "", "", ""],
  [
    "First Name (*)",
    "Last Name (*)",
    "Phone Number",
    "Email (*)",
    "Date of Birth (*) (DD/MM/YYYY)",
    "Role (*)"
  ]
];

/**
 * Parses and normalizes Date of Birth to DD/MM/YYYY format.
 * Auto-swaps Month and Day if Month > 12 (e.g. 09/22/2010 -> 22/09/2010).
 * Only invalid if neither original nor swapped day/month forms a valid date.
 */
export function parseAndNormalizeDOB(rawDob: string): {
  isValid: boolean;
  normalizedDob: string;
  errorMessage?: string;
} {
  const trimmed = rawDob.trim();
  if (!trimmed) {
    return {
      isValid: false,
      normalizedDob: "",
      errorMessage: "Date of Birth is required (*)"
    };
  }

  // Handle separators: /, -, ., space
  const parts = trimmed.split(/[\/\.-]/).map((p) => p.trim()).filter(Boolean);

  if (parts.length === 3) {
    let numA = parseInt(parts[0], 10);
    let numB = parseInt(parts[1], 10);
    let numC = parseInt(parts[2], 10);

    if (isNaN(numA) || isNaN(numB) || isNaN(numC)) {
      return {
        isValid: false,
        normalizedDob: trimmed,
        errorMessage: "DOB must contain valid numeric Day, Month, and Year"
      };
    }

    let day = numA;
    let month = numB;
    let year = numC;

    // Handle YYYY-MM-DD or YYYY-DD-MM format
    if (numA >= 1900 && numA <= 2100) {
      year = numA;
      day = numC;
      month = numB;
    }

    // Auto-swap if month > 12 and day <= 12 (e.g. 09/22/2010 -> month=22, day=9)
    if (month > 12 && day <= 12) {
      const temp = day;
      day = month;
      month = temp;
    }

    // Days in month calculation
    const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    if (isLeap) daysInMonth[2] = 29;

    const isMonthValid = month >= 1 && month <= 12;
    const isYearValid = year >= 1900 && year <= 2100;
    const maxDays = isMonthValid ? daysInMonth[month] : 31;
    const isDayValid = day >= 1 && day <= maxDays;

    if (isDayValid && isMonthValid && isYearValid) {
      const dd = String(day).padStart(2, "0");
      const mm = String(month).padStart(2, "0");
      const yyyy = String(year);
      return {
        isValid: true,
        normalizedDob: `${dd}/${mm}/${yyyy}`
      };
    } else {
      let msg = "Invalid Date of Birth";
      if (!isMonthValid) msg = "Month must be between 1 and 12";
      else if (!isDayValid) msg = `Day must be between 1 and ${maxDays} for month ${month}`;
      else if (!isYearValid) msg = "Year must be between 1900 and 2100";

      return {
        isValid: false,
        normalizedDob: trimmed,
        errorMessage: msg
      };
    }
  }

  return {
    isValid: false,
    normalizedDob: trimmed,
    errorMessage: "DOB must be in DD/MM/YYYY format (e.g., 07/09/2010)"
  };
}

export default function ExcelSplitterValidator({
  state,
  onChange,
  onSwitchModule
}: ExcelSplitterValidatorProps) {
  const { t, lang } = useI18n();
  // Config state
  const maxRecordsPerFile = state?.maxRecordsPerFile ?? 50;
  const setMaxRecordsPerFile = (val: number) =>
    onChange?.({ maxRecordsPerFile: val });

  const exportFormat = state?.exportFormat ?? "zip";
  const setExportFormat = (fmt: "zip" | "individual") =>
    onChange?.({ exportFormat: fmt });

  // Uploaded template header (5 rows)
  const [headerRows, setHeaderRows] = useState<any[][]>(DEFAULT_HEADERS_AOA);
  const [columnHeaders, setColumnHeaders] = useState<string[]>([
    "First Name (*)",
    "Last Name (*)",
    "Phone Number",
    "Email (*)",
    "Date of Birth (*) (DD/MM/YYYY)",
    "Role (*)"
  ]);
  const [colIndexes, setColIndexes] = useState<ColumnIndexes>({
    firstName: 0,
    lastName: 1,
    phoneNumber: 2,
    email: 3,
    dob: 4,
    role: 5
  });

  // Parsed records list
  const [records, setRecords] = useState<ParsedRecord[]>([]);
  const [fileName, setFileName] = useState<string>("Account_Creation_Template.xlsx");
  const [isDragging, setIsDragging] = useState(false);

  // Table filtering & pagination & sorting
  type SplitterSortField =
    | "default"
    | "rowIndex"
    | "status"
    | "firstName"
    | "lastName"
    | "phoneNumber"
    | "email"
    | "dob"
    | "role";

  const [sortField, setSortField] = useState<SplitterSortField>("default");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const [pendingExportFormat, setPendingExportFormat] = useState<"zip" | "individual">("zip");

  const [filterMode, setFilterMode] = useState<"all" | "errors" | "valid">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Edit Lock Toggle State
  const [isEditingLocked, setIsEditingLocked] = useState<boolean>(false);

  // Split Confirmation Modal for erroneous records
  const [showExportModal, setShowExportModal] = useState(false);

  // Validation function for a single record
  const validateRecord = useCallback(
    (data: {
      firstName: string;
      lastName: string;
      phoneNumber: string;
      email: string;
      dob: string;
      role: string;
    }): { errors: ValidationError[]; normalizedDob: string } => {
      const errors: ValidationError[] = [];

      // 1. First Name required
      if (!data.firstName.trim()) {
        errors.push({ field: "firstName", message: "First Name is required (*)" });
      }

      // 2. Last Name required
      if (!data.lastName.trim()) {
        errors.push({ field: "lastName", message: "Last Name is required (*)" });
      }

      // 3. Role strictly restricted to Teacher or Student
      const trimmedRole = data.role.trim();
      if (!trimmedRole) {
        errors.push({ field: "role", message: "Role is required (*)" });
      }

      const roleLower = trimmedRole.toLowerCase();
      const isTeacher =
        roleLower === "teacher" || roleLower.includes("giáo viên");
      const isStudent =
        roleLower === "student" || roleLower.includes("học sinh");

      if (!isTeacher && !isStudent && trimmedRole) {
        errors.push({
          field: "role",
          message: "Role must be either 'Teacher' or 'Student' (*)"
        });
      }

      // 4. Email validation
      const trimmedEmail = data.email.trim();
      if (isTeacher && !trimmedEmail) {
        errors.push({
          field: "email",
          message: "Email is strictly required for Teacher role (*)"
        });
      } else if (trimmedEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
          errors.push({
            field: "email",
            message: "Invalid email format (e.g. user@domain.com)"
          });
        }
      }

      // 5. Phone number is optional for both Teacher & Student
      // No validation errors raised for phone number

      // 6. Date of Birth format validation with smart auto-swap
      const dobResult = parseAndNormalizeDOB(data.dob);
      if (!dobResult.isValid) {
        errors.push({
          field: "dob",
          message: dobResult.errorMessage || "DOB must be in DD/MM/YYYY format (*)"
        });
      }

      return {
        errors,
        normalizedDob: dobResult.normalizedDob
      };
    },
    []
  );

  // Convert raw value to string format (handling Excel serial dates)
  const formatCellValue = (val: any): string => {
    if (val === null || val === undefined) return "";
    if (typeof val === "number" && val > 20000 && val < 60000) {
      // Excel Serial Date Number
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

  // Helper to parse file buffer
  const parseExcelBuffer = (buffer: ArrayBuffer, name: string) => {
    try {
      const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        toast.error(
          lang === "vi"
            ? "Tệp tải lên không chứa bất kỳ bảng tính nào."
            : "The uploaded file does not contain any worksheets."
        );
        return;
      }
      const worksheet = workbook.Sheets[sheetName];
      const rawAoa: any[][] = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: ""
      });

      if (!rawAoa || rawAoa.length === 0) {
        toast.error(
          lang === "vi"
            ? "Tệp Excel tải lên rỗng."
            : "The uploaded Excel file is empty."
        );
        return;
      }

      // Step 1: Dynamically detect header row index (1-row files, 5-row corporate templates, etc.)
      let headerRowIdx = -1;
      let maxScore = -1;

      const keywords = [
        "first",
        "last",
        "phone",
        "email",
        "dob",
        "birth",
        "role",
        "họ",
        "tên",
        "sđt",
        "điện thoại",
        "ngày sinh",
        "vai trò",
        "mobile",
        "contact",
        "giáo viên",
        "học sinh"
      ];

      for (let r = 0; r < Math.min(10, rawAoa.length); r++) {
        const rowStr = (rawAoa[r] || []).map((c) => String(c).toLowerCase()).join(" ");
        let score = 0;
        keywords.forEach((kw) => {
          if (rowStr.includes(kw)) score++;
        });

        // Special priority bonus for row 4 (5th row) if it matches keywords (standard corporate template)
        if (r === 4 && score >= 2) score += 5;

        if (score > maxScore) {
          maxScore = score;
          headerRowIdx = r;
        }
      }

      if (headerRowIdx === -1 || maxScore < 1) {
        headerRowIdx = rawAoa.length >= 5 ? 4 : 0;
      }

      // Preserve top header rows for export template format
      const extractedHeaderRows = rawAoa.slice(0, headerRowIdx + 1);
      setHeaderRows(extractedHeaderRows);

      const detectedHeaderRow = (rawAoa[headerRowIdx] || []).map((cell: any) =>
        String(cell).trim()
      );
      setColumnHeaders(detectedHeaderRow);

      // Step 2: Auto-detect column positions with strict non-overlapping distinction
      let fnIdx = -1;
      let lnIdx = -1;
      let phoneIdx = -1;
      let emIdx = -1;
      let dobIdx = -1;
      let roleIdx = -1;
      let isFullNameCol = false;

      detectedHeaderRow.forEach((title, idx) => {
        const norm = title
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, "");

        const rawLower = title.toLowerCase();

        // Phone Number detection (Priority check to prevent overlap)
        if (
          norm.includes("phone") ||
          norm.includes("mobile") ||
          norm.includes("sdt") ||
          norm.includes("dienthoai") ||
          norm.includes("contact") ||
          norm.includes("tel") ||
          rawLower.includes("số đt") ||
          rawLower.includes("sđt")
        ) {
          phoneIdx = idx;
        }
        // Email
        else if (norm.includes("email") || norm.includes("mail")) {
          emIdx = idx;
        }
        // DOB
        else if (
          norm.includes("birth") ||
          norm.includes("dob") ||
          norm.includes("ngaysinh") ||
          rawLower.includes("ngày sinh")
        ) {
          dobIdx = idx;
        }
        // Role
        else if (
          norm.includes("role") ||
          norm.includes("vaitro") ||
          norm.includes("chucvu") ||
          norm.includes("position") ||
          rawLower.includes("vai trò")
        ) {
          roleIdx = idx;
        }
        // First Name / Tên
        else if (
          norm === "first" ||
          norm.includes("firstname") ||
          norm === "ten" ||
          norm.includes("tengoi") ||
          norm.includes("givenname")
        ) {
          fnIdx = idx;
        }
        // Last Name / Họ
        else if (
          norm === "last" ||
          norm.includes("lastname") ||
          norm === "ho" ||
          norm.includes("surname") ||
          norm.includes("familyname")
        ) {
          lnIdx = idx;
        }
        // Full Name / Họ và tên
        else if (
          norm.includes("fullname") ||
          norm.includes("hovaten") ||
          norm.includes("hoten")
        ) {
          fnIdx = idx;
          lnIdx = idx;
          isFullNameCol = true;
        }
      });

      // Assign positional defaults if columns were not found by explicit keyword
      const assignedIndices = new Set<number>();
      if (fnIdx !== -1) assignedIndices.add(fnIdx);
      if (lnIdx !== -1 && lnIdx !== fnIdx) assignedIndices.add(lnIdx);
      if (phoneIdx !== -1) assignedIndices.add(phoneIdx);
      if (emIdx !== -1) assignedIndices.add(emIdx);
      if (dobIdx !== -1) assignedIndices.add(dobIdx);
      if (roleIdx !== -1) assignedIndices.add(roleIdx);

      const findNextUnassigned = (preferred: number) => {
        if (!assignedIndices.has(preferred) && preferred < detectedHeaderRow.length) {
          assignedIndices.add(preferred);
          return preferred;
        }
        for (let i = 0; i < Math.max(detectedHeaderRow.length, 10); i++) {
          if (!assignedIndices.has(i)) {
            assignedIndices.add(i);
            return i;
          }
        }
        return preferred;
      };

      if (fnIdx === -1) fnIdx = findNextUnassigned(0);
      if (lnIdx === -1) lnIdx = isFullNameCol ? fnIdx : findNextUnassigned(1);
      if (phoneIdx === -1) phoneIdx = findNextUnassigned(2);
      if (emIdx === -1) emIdx = findNextUnassigned(3);
      if (dobIdx === -1) dobIdx = findNextUnassigned(4);
      if (roleIdx === -1) roleIdx = findNextUnassigned(5);

      setColIndexes({
        firstName: fnIdx,
        lastName: lnIdx,
        phoneNumber: phoneIdx,
        email: emIdx,
        dob: dobIdx,
        role: roleIdx
      });

      // Data rows start after headerRowIdx
      const rawDataRows = rawAoa.slice(headerRowIdx + 1);
      const parsedList: ParsedRecord[] = [];

      rawDataRows.forEach((row, idx) => {
        const isAllEmpty = (row || []).every(
          (cell: any) => cell === null || cell === undefined || String(cell).trim() === ""
        );
        if (isAllEmpty) return;

        let firstName = formatCellValue(row[fnIdx]);
        let lastName = formatCellValue(row[lnIdx]);

        // If First Name & Last Name are in the same Full Name column ("Họ và Tên")
        if (fnIdx === lnIdx && firstName) {
          const parts = firstName.trim().split(/\s+/);
          if (parts.length > 1) {
            firstName = parts[parts.length - 1]; // Tên
            lastName = parts.slice(0, parts.length - 1).join(" "); // Họ đệm
          } else {
            lastName = firstName;
          }
        }

        const phoneNumber = formatCellValue(row[phoneIdx]);
        const email = formatCellValue(row[emIdx]);
        const rawDob = formatCellValue(row[dobIdx]);
        const rawRole = formatCellValue(row[roleIdx]);

        // Normalize role string to Teacher or Student if possible
        let role = rawRole || "Student";
        const rLower = rawRole.toLowerCase();
        if (rLower === "teacher" || rLower.includes("giáo viên")) role = "Teacher";
        else if (rLower === "student" || rLower.includes("học sinh")) role = "Student";

        // Extra columns
        const maxCols = Math.max(row.length, detectedHeaderRow.length);
        const extraCols: string[] = [];
        for (let c = 0; c < maxCols; c++) {
          if (![fnIdx, lnIdx, phoneIdx, emIdx, dobIdx, roleIdx].includes(c)) {
            extraCols.push(formatCellValue(row[c]));
          }
        }

        const { errors, normalizedDob } = validateRecord({
          firstName,
          lastName,
          phoneNumber,
          email,
          dob: rawDob,
          role
        });

        parsedList.push({
          id: `rec-${idx}-${Date.now()}`,
          rowIndex: parsedList.length + 1,
          firstName,
          lastName,
          phoneNumber,
          email,
          dob: normalizedDob,
          role,
          extraCols,
          errors,
          isValid: errors.length === 0
        });
      });

      setRecords(parsedList);
      setFileName(name);
      setCurrentPage(1);
      toast.success(
        lang === "vi"
          ? `Đã tải thành công ${parsedList.length} bản ghi người dùng từ tệp ${name}`
          : `Successfully loaded ${parsedList.length} user records from ${name}`
      );
    } catch (err: any) {
      console.error(err);
      toast.error(
        lang === "vi"
          ? `Lỗi khi phân tích tệp Excel: ${err.message || "Lỗi không xác định"}`
          : `Error parsing Excel file: ${err.message || "Unknown error"}`
      );
    }
  };

  // Handle Drag & Drop / File Input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          parseExcelBuffer(evt.target.result as ArrayBuffer, file.name);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (
        !file.name.endsWith(".xlsx") &&
        !file.name.endsWith(".xls") &&
        !file.name.endsWith(".csv")
      ) {
        toast.error(
          lang === "vi"
            ? "Vui lòng tải lên tệp .xlsx hoặc .xls hợp lệ."
            : "Please upload a valid .xlsx or .xls file."
        );
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          parseExcelBuffer(evt.target.result as ArrayBuffer, file.name);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // Download Sample Template
  const handleDownloadSampleTemplate = () => {
    const sampleRows = [
      ...DEFAULT_HEADERS_AOA,
      ["Alex", "Rivera", "+1 555-0192", "alex.rivera@edu-corp.com", "15/04/1988", "Teacher"],
      ["Sarah", "Conner", "", "", "22/09/2010", "Student"],
      ["Michael", "Scott", "0912345678", "m.scott@company.org", "08/01/1982", "Teacher"],
      ["David", "Miller", "", "", "05/11/2012", "Student"],
      ["Emma", "Watson", "+1 555-0144", "emma.w@edu-corp.com", "15/04/1990", "Teacher"],
      // Intentionally invalid sample row 1 (missing email for teacher)
      ["John", "Doe", "0987654321", "", "10/10/1985", "Teacher"],
      // Sample row 2 with auto-swapped date format (09/22/2010 -> will auto normalize to 22/09/2010)
      ["Lisa", "Simpson", "", "", "09/22/2010", "Student"]
    ];

    const ws = XLSX.utils.aoa_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Account Template");
    XLSX.writeFile(wb, "Account_Creation_Template_Sample.xlsx");
    toast.info(
      lang === "vi"
        ? "Đã tải xuống tệp mẫu đăng ký tài khoản doanh nghiệp."
        : "Downloaded sample corporate account template."
    );
  };

  // Clear list & Reset state
  const handleResetAll = () => {
    setRecords([]);
    setHeaderRows(DEFAULT_HEADERS_AOA);
    setColumnHeaders([
      "First Name (*)",
      "Last Name (*)",
      "Phone Number",
      "Email (*)",
      "Date of Birth (*) (DD/MM/YYYY)",
      "Role (*)"
    ]);
    setColIndexes({
      firstName: 0,
      lastName: 1,
      phoneNumber: 2,
      email: 3,
      dob: 4,
      role: 5
    });
    setFileName("Account_Creation_Template.xlsx");
    setCurrentPage(1);
    toast.info(
      lang === "vi"
        ? "Đã xóa tất cả bản ghi và đặt lại lựa chọn."
        : "Cleared all records and reset selection."
    );
  };

  // Inline cell edit update handler
  const handleCellEdit = (
    recordId: string,
    field: "firstName" | "lastName" | "phoneNumber" | "email" | "dob" | "role",
    newValue: string
  ) => {
    setRecords((prev) =>
      prev.map((rec) => {
        if (rec.id !== recordId) return rec;

        const updated = {
          ...rec,
          [field]: newValue
        };

        const { errors, normalizedDob } = validateRecord({
          firstName: updated.firstName,
          lastName: updated.lastName,
          phoneNumber: updated.phoneNumber,
          email: updated.email,
          dob: updated.dob,
          role: updated.role
        });

        return {
          ...updated,
          dob: field === "dob" ? normalizedDob : updated.dob,
          errors,
          isValid: errors.length === 0
        };
      })
    );
  };

  // Add new blank row record
  const handleAddNewRecord = () => {
    const newRec: ParsedRecord = {
      id: `rec-new-${Date.now()}`,
      rowIndex: records.length > 0 ? Math.max(...records.map((r) => r.rowIndex)) + 1 : 1,
      firstName: "",
      lastName: "",
      phoneNumber: "",
      email: "",
      dob: "",
      role: "Student",
      extraCols: [],
      errors: [],
      isValid: false
    };

    const { errors, normalizedDob } = validateRecord({
      firstName: newRec.firstName,
      lastName: newRec.lastName,
      phoneNumber: newRec.phoneNumber,
      email: newRec.email,
      dob: newRec.dob,
      role: newRec.role
    });

    newRec.dob = normalizedDob;
    newRec.errors = errors;
    newRec.isValid = errors.length === 0;

    setRecords((prev) => [newRec, ...prev]);
    toast.success(
      lang === "vi"
        ? "Đã thêm bản ghi mới. Vui lòng điền đầy đủ thông tin bắt buộc."
        : "Added new record. Please complete the required fields."
    );
  };

  // Delete record
  const handleDeleteRecord = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    toast.info(lang === "vi" ? "Đã xóa bản ghi." : "Record removed.");
  };

  // Statistics calculation
  const stats = useMemo(() => {
    const total = records.length;
    const valid = records.filter((r) => r.isValid).length;
    const erroneous = total - valid;

    let teachers = 0;
    let students = 0;

    records.forEach((r) => {
      const roleLower = r.role.toLowerCase().trim();
      if (roleLower === "teacher" || roleLower.includes("giáo viên")) {
        teachers++;
      } else if (roleLower === "student" || roleLower.includes("học sinh")) {
        students++;
      }
    });

    return { total, valid, erroneous, teachers, students };
  }, [records]);

  const handleHeaderSort = (field: SplitterSortField) => {
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

  const handleRestoreDefaultOrder = () => {
    setSortField("default");
    setSortDirection("asc");
    toast.info(
      lang === "vi"
        ? "Đã khôi phục thứ tự dòng Excel ban đầu."
        : "Restored original Excel row order."
    );
  };

  // Filtered & Sorted Records
  const filteredAndSortedRecords = useMemo(() => {
    let list = records.filter((rec) => {
      // 1. Filter mode
      if (filterMode === "errors" && rec.isValid) return false;
      if (filterMode === "valid" && !rec.isValid) return false;

      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullStr = `${rec.firstName} ${rec.lastName} ${rec.phoneNumber} ${rec.email} ${rec.dob} ${rec.role} ${rec.rowIndex}`.toLowerCase();
        if (!fullStr.includes(q)) return false;
      }

      return true;
    });

    if (sortField === "default") {
      list.sort((a, b) => a.rowIndex - b.rowIndex);
    } else {
      list.sort((a, b) => {
        if (sortField === "rowIndex") {
          return sortDirection === "asc" ? a.rowIndex - b.rowIndex : b.rowIndex - a.rowIndex;
        } else if (sortField === "status") {
          const valA = a.isValid ? 1 : 0;
          const valB = b.isValid ? 1 : 0;
          return sortDirection === "asc" ? valA - valB : valB - valA;
        } else {
          const valA = String(a[sortField as keyof ParsedRecord] || "").toLowerCase();
          const valB = String(b[sortField as keyof ParsedRecord] || "").toLowerCase();
          const cmp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: "base" });
          return sortDirection === "asc" ? cmp : -cmp;
        }
      });
    }

    return list;
  }, [records, filterMode, searchQuery, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedRecords.slice(start, start + pageSize);
  }, [filteredAndSortedRecords, currentPage, pageSize]);

  // Export & Split Handler
  const executeExport = async (recordsToExport: ParsedRecord[]) => {
    if (recordsToExport.length === 0) {
      toast.warn(
        lang === "vi"
          ? "Không có bản ghi nào khả dụng để xuất dữ liệu."
          : "No records available to export."
      );
      return;
    }

    const maxPerFile = Math.max(1, maxRecordsPerFile);
    const chunkCount = Math.ceil(recordsToExport.length / maxPerFile);
    const baseName = fileName.replace(/\.[^/.]+$/, "");

    if (exportFormat === "zip") {
      toast.info(
        lang === "vi"
          ? `Đang nén ${chunkCount} tệp đã tách thành một lưu trữ ZIP...`
          : `Compressing ${chunkCount} split file(s) into a ZIP archive...`
      );

      try {
        const zip = new JSZip();

        for (let i = 0; i < chunkCount; i++) {
          const chunk = recordsToExport.slice(i * maxPerFile, (i + 1) * maxPerFile);

          const exportAoa: any[][] = [...headerRows];

          chunk.forEach((rec) => {
            const rowData: any[] = [];
            rowData[colIndexes.firstName] = rec.firstName;
            rowData[colIndexes.lastName] = rec.lastName;
            rowData[colIndexes.phoneNumber] = rec.phoneNumber;
            rowData[colIndexes.email] = rec.email;
            rowData[colIndexes.dob] = rec.dob;
            rowData[colIndexes.role] = rec.role;

            exportAoa.push(rowData);
          });

          const ws = XLSX.utils.aoa_to_sheet(exportAoa);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Account Template");

          const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
          const outFileName = `${baseName}_Part_${i + 1}_of_${chunkCount}.xlsx`;
          zip.file(outFileName, wbout);
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const zipFileName = `${baseName}_Split_Files.zip`;

        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = zipFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success(
          lang === "vi"
            ? `Đã tạo và tải xuống thành công tệp lưu trữ ZIP chứa ${chunkCount} tệp XLSX!`
            : `Successfully generated & downloaded ZIP archive containing ${chunkCount} XLSX file(s)!`
        );
      } catch (err: any) {
        console.error(err);
        toast.error(
          lang === "vi"
            ? `Tạo tệp lưu trữ ZIP thất bại: ${err.message || "Lỗi không xác định"}`
            : `Failed to create ZIP archive: ${err.message || "Unknown error"}`
        );
      }
    } else {
      toast.info(
        lang === "vi"
          ? `Bắt đầu tải xuống ${chunkCount} tệp XLSX riêng biệt (tổng cộng ${recordsToExport.length} bản ghi)...`
          : `Starting download of ${chunkCount} separate XLSX file(s) (${recordsToExport.length} records total)...`
      );

      for (let i = 0; i < chunkCount; i++) {
        const chunk = recordsToExport.slice(i * maxPerFile, (i + 1) * maxPerFile);

        const exportAoa: any[][] = [...headerRows];

        chunk.forEach((rec) => {
          const rowData: any[] = [];
          rowData[colIndexes.firstName] = rec.firstName;
          rowData[colIndexes.lastName] = rec.lastName;
          rowData[colIndexes.phoneNumber] = rec.phoneNumber;
          rowData[colIndexes.email] = rec.email;
          rowData[colIndexes.dob] = rec.dob;
          rowData[colIndexes.role] = rec.role;

          exportAoa.push(rowData);
        });

        const ws = XLSX.utils.aoa_to_sheet(exportAoa);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Account Template");

        const outFileName = `${baseName}_Part_${i + 1}_of_${chunkCount}.xlsx`;
        XLSX.writeFile(wb, outFileName);

        if (chunkCount > 1) {
          await new Promise((resolve) => setTimeout(resolve, 350));
        }
      }

      toast.success(
        lang === "vi"
          ? `Đã tạo và tải xuống thành công ${chunkCount} tệp XLSX riêng biệt!`
          : `Successfully generated & downloaded ${chunkCount} separate XLSX file(s)!`
      );
    }
  };

  const handleSplitAndExport = () => {
    if (records.length === 0) {
      toast.warn(
        lang === "vi"
          ? "Vui lòng tải lên hoặc thêm các bản ghi trước!"
          : "Please upload or add records first!"
      );
      return;
    }

    if (stats.erroneous > 0) {
      setShowExportModal(true);
    } else {
      executeExport(records);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-[#0B0F1A] text-slate-800 dark:text-slate-200 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Top Header & Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{t("excelSuite.title")}</span>
              <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                🌐 Pythaverse.space
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t("excelSuite.subtitle")} • <span className="font-medium text-emerald-600 dark:text-emerald-400">{t("excelSuite.pythaverseNotice")}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onSwitchModule && (
            <div className="flex items-center gap-1 p-1 bg-slate-200/80 dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800">
              <button
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-[#111827] text-emerald-600 dark:text-emerald-400 shadow-xs flex items-center gap-1.5 cursor-default"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
                <span>{t("excelSuite.splitterTab")}</span>
              </button>
              <button
                onClick={() => onSwitchModule(ActiveModule.EXCEL_MERGER)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Layers className="h-3.5 w-3.5 text-emerald-500" />
                <span>{t("excelSuite.mergerTab")}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Drag and Drop File Upload Area */}
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
              ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 scale-[1.01]"
              : "border-slate-300 dark:border-slate-800 bg-white dark:bg-[#111827] hover:border-emerald-400 dark:hover:border-emerald-500/50"
          }`}
        >
          <div className="h-16 w-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 shadow-inner">
            <Upload className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
            {t("excelSuite.dropzoneSplit")}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mb-2 leading-relaxed">
            {t("excelSuite.pythaverseDesc")}
          </p>
          <div className="mb-5">
            <span className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 inline-block">
              ★ {t("excelSuite.pythaverseNotice")}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <label className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 cursor-pointer transition-all flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              <span>{t("excelSuite.selectFile")}</span>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            <button
              onClick={handleDownloadSampleTemplate}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-2 cursor-pointer transition-all"
              title="Download sample 5-row header Excel template"
            >
              <Download className="h-4 w-4 text-emerald-500" />
              <span>{t("excelSuite.loadSample")}</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* File Active Header & Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Total Records */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 shadow-xs flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                  Total Records
                </span>
                <span className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  {stats.total}
                </span>
              </div>
            </div>

            {/* Valid Records */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 shadow-xs flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                  Valid Records
                </span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.valid}
                </span>
              </div>
            </div>

            {/* Erroneous Records */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 shadow-xs flex items-center gap-3.5">
              <div className={`p-2.5 rounded-xl ${
                stats.erroneous > 0
                  ? "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 animate-pulse"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400"
              }`}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                  With Errors
                </span>
                <span className={`text-lg font-bold ${
                  stats.erroneous > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-800 dark:text-slate-100"
                }`}>
                  {stats.erroneous}
                </span>
              </div>
            </div>

            {/* Teacher Count */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 shadow-xs flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                  Teachers
                </span>
                <span className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  {stats.teachers}
                </span>
              </div>
            </div>

            {/* Student Count */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 shadow-xs flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/50">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                  Students
                </span>
                <span className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  {stats.students}
                </span>
              </div>
            </div>
          </div>

          {/* Validation Alert Warning Banner */}
          {stats.erroneous > 0 && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold">
                    Found {stats.erroneous} record(s) with validation errors!
                  </span>{" "}
                  Edit values directly in table cells below to resolve issues on the fly.
                </div>
              </div>
              <button
                onClick={() => {
                  setFilterMode("errors");
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold self-start sm:self-auto cursor-pointer transition-all shadow-xs"
              >
                Isolate Erroneous Records
              </button>
            </div>
          )}

          {/* File Controls & Splitter Export Settings Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Active File Label & Re-upload */}
            <div className="flex flex-wrap items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                <FileCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 mr-2">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px] sm:max-w-xs">
                  {fileName}
                </div>
                <div className="text-[11px] text-slate-400">
                  5 Header Rows Preserved
                </div>
              </div>

              {/* Prominent Change File & Reset Buttons */}
              <label className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-sm shadow-indigo-600/20 cursor-pointer transition-all shrink-0">
                <Upload className="h-3.5 w-3.5" />
                <span>Change File</span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleResetAll}
                className="px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-all shrink-0 shadow-xs"
                title="Clear selected file and reset all records"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            </div>

            {/* Split Export Configuration Controls & Download Dropdown */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 pl-2">
                  {t("excelSuite.maxRecords")}:
                </span>
                <input
                  type="number"
                  min={1}
                  max={5000}
                  value={maxRecordsPerFile}
                  onChange={(e) =>
                    setMaxRecordsPerFile(Math.max(1, parseInt(e.target.value) || 50))
                  }
                  className="w-16 px-2 py-1 text-xs font-mono font-bold bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 text-center focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Single Download Button with Dropdown Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDownloadMenuOpen((prev) => !prev)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isDownloadMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {isDownloadMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsDownloadMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2 space-y-1">
                      <button
                        onClick={() => {
                          setIsDownloadMenuOpen(false);
                          setExportFormat("zip");
                          if (stats.erroneous > 0) {
                            setPendingExportFormat("zip");
                            setShowExportModal(true);
                          } else {
                            executeExport(records);
                          }
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 flex items-start gap-2.5 group cursor-pointer transition-colors"
                      >
                        <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0">
                          <Archive className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                            {t("excelSuite.exportZip")}
                          </div>
                          <div className="text-[11px] text-slate-400 leading-snug mt-0.5">
                            Compress all split files into a single ZIP archive
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setIsDownloadMenuOpen(false);
                          setExportFormat("individual");
                          if (stats.erroneous > 0) {
                            setPendingExportFormat("individual");
                            setShowExportModal(true);
                          } else {
                            executeExport(records);
                          }
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 flex items-start gap-2.5 group cursor-pointer transition-colors"
                      >
                        <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0">
                          <FileSpreadsheet className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                            {t("excelSuite.exportIndividual")}
                          </div>
                          <div className="text-[11px] text-slate-400 leading-snug mt-0.5">
                            Download individual split .xlsx files separately
                          </div>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Records Table Section */}
          <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 shadow-xs overflow-hidden flex flex-col">
            {/* Table Search & Filter Sub-Bar */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <button
                  onClick={() => {
                    setFilterMode("all");
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    filterMode === "all"
                      ? "bg-white dark:bg-[#111827] text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  {t("excelSuite.filterAll")} ({records.length})
                </button>

                <button
                  onClick={() => {
                    setFilterMode("errors");
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    filterMode === "errors"
                      ? "bg-rose-500 text-white shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <span>{t("excelSuite.filterErrors")}</span>
                  {stats.erroneous > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-rose-700 text-white font-bold">
                      {stats.erroneous}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    setFilterMode("valid");
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    filterMode === "valid"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  {t("excelSuite.filterValid")} ({stats.valid})
                </button>
              </div>

              {/* Lock Toggle, Add Row, Search Box, Page Size & Restore Default Order Button */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Lock / Unlock Editing Toggle Button */}
                <button
                  type="button"
                  onClick={() => {
                    const nextLocked = !isEditingLocked;
                    setIsEditingLocked(nextLocked);
                    toast.info(
                      nextLocked
                        ? (lang === "vi" ? "Đã khóa chỉnh sửa dữ liệu trong bảng." : "Data editing has been locked.")
                        : (lang === "vi" ? "Đã mở khóa, bạn có thể chỉnh sửa dữ liệu." : "Data editing has been unlocked.")
                    );
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs ${
                    isEditingLocked
                      ? "bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800/80 text-amber-700 dark:text-amber-300 hover:bg-amber-100"
                      : "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
                  }`}
                  title={
                    isEditingLocked
                      ? "Bấm để mở khóa chỉnh sửa dữ liệu"
                      : "Bấm để khóa không cho chỉnh sửa dữ liệu"
                  }
                >
                  {isEditingLocked ? (
                    <>
                      <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      <span>{t("excelSuite.lockEdit")}</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{t("excelSuite.unlockEdit")}</span>
                    </>
                  )}
                </button>

                {/* Add Row Button */}
                <button
                  type="button"
                  onClick={handleAddNewRecord}
                  disabled={isEditingLocked}
                  className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Thêm dòng mới vào bảng"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{t("excelSuite.addRow")}</span>
                </button>

                {sortField !== "default" && (
                  <button
                    onClick={handleRestoreDefaultOrder}
                    className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                    title="Restore original Excel row order"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Restore Default Order</span>
                  </button>
                )}

                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search name, phone, email, role..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
                  <span>Show:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Interactive Grid Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th
                      onClick={() => handleHeaderSort("rowIndex")}
                      className="py-3 px-3 w-12 text-center cursor-pointer select-none hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors"
                      title="Sort by STT (Số thứ tự từ 1)"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>STT</span>
                        {sortField === "rowIndex" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-indigo-500" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-indigo-500" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-50" />
                        )}
                      </div>
                    </th>

                    <th
                      onClick={() => handleHeaderSort("status")}
                      className="py-3 px-3 w-20 text-center cursor-pointer select-none hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors"
                      title="Sort by Validation Status"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Status</span>
                        {sortField === "status" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-indigo-500" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-indigo-500" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-50" />
                        )}
                      </div>
                    </th>

                    <th
                      onClick={() => handleHeaderSort("firstName")}
                      className="py-3 px-3 min-w-[120px] cursor-pointer select-none hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors"
                      title="Sort by First Name"
                    >
                      <div className="flex items-center gap-1">
                        <span>First Name</span>
                        <span className="text-rose-500 font-bold ml-0.5">(*)</span>
                        {sortField === "firstName" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-indigo-500" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-indigo-500" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-50" />
                        )}
                      </div>
                    </th>

                    <th
                      onClick={() => handleHeaderSort("lastName")}
                      className="py-3 px-3 min-w-[120px] cursor-pointer select-none hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors"
                      title="Sort by Last Name"
                    >
                      <div className="flex items-center gap-1">
                        <span>Last Name</span>
                        <span className="text-rose-500 font-bold ml-0.5">(*)</span>
                        {sortField === "lastName" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-indigo-500" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-indigo-500" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-50" />
                        )}
                      </div>
                    </th>

                    <th
                      onClick={() => handleHeaderSort("phoneNumber")}
                      className="py-3 px-3 min-w-[130px] cursor-pointer select-none hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors"
                      title="Sort by Phone Number"
                    >
                      <div className="flex items-center gap-1">
                        <span>Phone Number</span>
                        {sortField === "phoneNumber" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-indigo-500" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-indigo-500" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-50" />
                        )}
                      </div>
                    </th>

                    <th
                      onClick={() => handleHeaderSort("email")}
                      className="py-3 px-3 min-w-[180px] cursor-pointer select-none hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors"
                      title="Sort by Email"
                    >
                      <div className="flex items-center gap-1">
                        <span>Email</span>
                        <span className="text-rose-500 font-bold ml-0.5">(*)</span>
                        {sortField === "email" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-indigo-500" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-indigo-500" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-50" />
                        )}
                      </div>
                    </th>

                    <th
                      onClick={() => handleHeaderSort("dob")}
                      className="py-3 px-3 min-w-[140px] cursor-pointer select-none hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors"
                      title="Sort by Date of Birth"
                    >
                      <div className="flex items-center gap-1">
                        <span>Date of Birth</span>
                        <span className="text-rose-500 font-bold ml-0.5">(*)</span>
                        {sortField === "dob" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-indigo-500" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-indigo-500" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-50" />
                        )}
                      </div>
                    </th>

                    <th
                      onClick={() => handleHeaderSort("role")}
                      className="py-3 px-3 min-w-[110px] cursor-pointer select-none hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors"
                      title="Sort by Role"
                    >
                      <div className="flex items-center gap-1">
                        <span>Role</span>
                        <span className="text-rose-500 font-bold ml-0.5">(*)</span>
                        {sortField === "role" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-indigo-500" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-indigo-500" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-50" />
                        )}
                      </div>
                    </th>

                    <th className="py-3 px-3 min-w-[200px]">Validation Details</th>
                    <th className="py-3 px-3 w-14 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                  {paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        {t("excelSuite.noRecords")}
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((rec) => {
                      const firstNameErr = rec.errors.find((e) => e.field === "firstName");
                      const lastNameErr = rec.errors.find((e) => e.field === "lastName");
                      const emailErr = rec.errors.find((e) => e.field === "email");
                      const dobErr = rec.errors.find((e) => e.field === "dob");
                      const roleErr = rec.errors.find((e) => e.field === "role");

                      return (
                        <tr
                          key={rec.id}
                          className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                            !rec.isValid ? "bg-rose-500/5" : ""
                          }`}
                        >
                          {/* Row Number */}
                          <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-400">
                            #{rec.rowIndex}
                          </td>

                          {/* Status Badge */}
                          <td className="py-2.5 px-3 text-center">
                            {rec.isValid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                                <Check className="h-3 w-3" />
                                Valid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60 animate-pulse">
                                <AlertTriangle className="h-3 w-3" />
                                Error
                              </span>
                            )}
                          </td>

                          {/* First Name Cell */}
                          <td className="p-1">
                            <input
                              type="text"
                              disabled={isEditingLocked}
                              value={rec.firstName}
                              onChange={(e) =>
                                handleCellEdit(rec.id, "firstName", e.target.value)
                              }
                              placeholder="First Name"
                              className={`w-full px-2.5 py-1.5 rounded-lg text-xs transition-all focus:outline-none ${
                                isEditingLocked
                                  ? "cursor-not-allowed opacity-75"
                                  : ""
                              } ${
                                firstNameErr
                                  ? "bg-rose-100/80 dark:bg-rose-950/80 border border-rose-400 dark:border-rose-700 text-rose-900 dark:text-rose-200 font-medium"
                                  : "bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 text-slate-800 dark:text-slate-200"
                              }`}
                            />
                          </td>

                          {/* Last Name Cell */}
                          <td className="p-1">
                            <input
                              type="text"
                              disabled={isEditingLocked}
                              value={rec.lastName}
                              onChange={(e) =>
                                handleCellEdit(rec.id, "lastName", e.target.value)
                              }
                              placeholder="Last Name"
                              className={`w-full px-2.5 py-1.5 rounded-lg text-xs transition-all focus:outline-none ${
                                isEditingLocked
                                  ? "cursor-not-allowed opacity-75"
                                  : ""
                              } ${
                                lastNameErr
                                  ? "bg-rose-100/80 dark:bg-rose-950/80 border border-rose-400 dark:border-rose-700 text-rose-900 dark:text-rose-200 font-medium"
                                  : "bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 text-slate-800 dark:text-slate-200"
                              }`}
                            />
                          </td>

                          {/* Phone Number Cell */}
                          <td className="p-1">
                            <input
                              type="text"
                              disabled={isEditingLocked}
                              value={rec.phoneNumber}
                              onChange={(e) =>
                                handleCellEdit(rec.id, "phoneNumber", e.target.value)
                              }
                              placeholder="Phone Number (optional)"
                              className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all focus:outline-none ${
                                isEditingLocked ? "cursor-not-allowed opacity-75" : ""
                              } bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 text-slate-800 dark:text-slate-200`}
                            />
                          </td>

                          {/* Email Cell */}
                          <td className="p-1">
                            <input
                              type="text"
                              disabled={isEditingLocked}
                              value={rec.email}
                              onChange={(e) =>
                                handleCellEdit(rec.id, "email", e.target.value)
                              }
                              placeholder="user@domain.com"
                              className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all focus:outline-none ${
                                isEditingLocked
                                  ? "cursor-not-allowed opacity-75"
                                  : ""
                              } ${
                                emailErr
                                  ? "bg-rose-100/80 dark:bg-rose-950/80 border border-rose-400 dark:border-rose-700 text-rose-900 dark:text-rose-200 font-medium"
                                  : "bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 text-slate-800 dark:text-slate-200"
                              }`}
                            />
                          </td>

                          {/* Date of Birth Cell */}
                          <td className="p-1">
                            <input
                              type="text"
                              disabled={isEditingLocked}
                              value={rec.dob}
                              onChange={(e) =>
                                handleCellEdit(rec.id, "dob", e.target.value)
                              }
                              placeholder="DD/MM/YYYY"
                              className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all focus:outline-none ${
                                isEditingLocked
                                  ? "cursor-not-allowed opacity-75"
                                  : ""
                              } ${
                                dobErr
                                  ? "bg-rose-100/80 dark:bg-rose-950/80 border border-rose-400 dark:border-rose-700 text-rose-900 dark:text-rose-200 font-medium"
                                  : "bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 text-slate-800 dark:text-slate-200"
                              }`}
                            />
                          </td>

                          {/* Role Cell - Strictly Teacher or Student */}
                          <td className="p-1">
                            <select
                              disabled={isEditingLocked}
                              value={rec.role}
                              onChange={(e) =>
                                handleCellEdit(rec.id, "role", e.target.value)
                              }
                              className={`w-full px-2 py-1.5 rounded-lg text-xs transition-all focus:outline-none ${
                                isEditingLocked
                                  ? "cursor-not-allowed opacity-75"
                                  : ""
                              } ${
                                roleErr
                                  ? "bg-rose-100/80 dark:bg-rose-950/80 border border-rose-400 dark:border-rose-700 text-rose-900 dark:text-rose-200 font-medium"
                                  : "bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 text-slate-800 dark:text-slate-200"
                              }`}
                            >
                              <option value="Teacher">Teacher</option>
                              <option value="Student">Student</option>
                            </select>
                          </td>

                          {/* Validation Details */}
                          <td className="py-2 px-3">
                            {rec.isValid ? (
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Ready for export
                              </span>
                            ) : (
                              <div className="space-y-1">
                                {rec.errors.map((err, idx) => (
                                  <div
                                    key={idx}
                                    className="text-[10px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1 leading-tight"
                                  >
                                    <AlertCircle className="h-3 w-3 shrink-0" />
                                    <span>{err.message}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* Action Button */}
                          <td className="py-2 px-3 text-center">
                            <button
                              onClick={() => handleDeleteRecord(rec.id)}
                              disabled={isEditingLocked}
                              className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400"
                              title={isEditingLocked ? "Đã khóa chỉnh sửa" : "Delete Record"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div>
                Showing{" "}
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {filteredAndSortedRecords.length === 0
                    ? 0
                    : (currentPage - 1) * pageSize + 1}
                </span>{" "}
                to{" "}
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {Math.min(currentPage * pageSize, filteredAndSortedRecords.length)}
                </span>{" "}
                of{" "}
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {filteredAndSortedRecords.length}
                </span>{" "}
                records
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <span className="px-3 font-mono font-medium">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Confirmation Export Modal when Erroneous Records exist */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold">
                <AlertTriangle className="h-5 w-5" />
                <span>Validation Errors Detected</span>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              You currently have <strong>{stats.erroneous} record(s)</strong> with validation errors out of <strong>{stats.total} total records</strong>. How would you like to proceed with splitting and exporting?
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setShowExportModal(false);
                  const validOnly = records.filter((r) => r.isValid);
                  executeExport(validOnly);
                }}
                className="w-full p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-between shadow-sm cursor-pointer transition-all"
              >
                <span>Export Valid Records Only ({stats.valid} records)</span>
                <CheckCircle2 className="h-4 w-4" />
              </button>

              <button
                onClick={() => {
                  setShowExportModal(false);
                  executeExport(records);
                }}
                className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center justify-between cursor-pointer transition-all"
              >
                <span>Export All Records (Include {stats.erroneous} errors)</span>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </button>

              <button
                onClick={() => {
                  setShowExportModal(false);
                  setFilterMode("errors");
                  setCurrentPage(1);
                }}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold text-xs cursor-pointer text-center"
              >
                Cancel & Fix Errors First
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
