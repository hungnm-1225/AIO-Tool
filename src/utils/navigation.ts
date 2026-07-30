import { 
  FileText, 
  Terminal, 
  FileSpreadsheet,
  ScanLine,
  FolderSync,
  RefreshCw,
  Type,
  GitCompare,
  Columns,
  PlusCircle,
  Code,
  Table,
  Play,
  Split,
  Layers,
  FolderOpen,
  Crop,
  BookOpen,
  Edit3,
  FileClock,
  Scissors,
  FileCheck2,
  FileStack,
  FolderSync as FolderSyncIcon
} from "lucide-react";
import { ActiveModule } from "../types";

export interface SubMenuItem {
  subSlug: string;
  labelVi: string;
  labelEn: string;
  descriptionVi: string;
  descriptionEn: string;
  icon: any;
  componentKey: string;
}

export interface MainMenuItem {
  mainSlug: string;
  module: ActiveModule;
  labelVi: string;
  labelEn: string;
  descriptionVi: string;
  descriptionEn: string;
  icon: any;
  submenus: SubMenuItem[];
}

export const MAIN_MENU_ITEMS: MainMenuItem[] = [
  {
    mainSlug: "text-suite",
    module: ActiveModule.TEXT_SUITE,
    labelVi: "Text Utilities Suite",
    labelEn: "Text Utilities Suite",
    descriptionVi: "Chuyển chữ, đếm từ, cắt chuỗi, so sánh diff, ghép cột & tự tăng số",
    descriptionEn: "Case converter, word counter, string cutter, diff checker, column joiner & auto inc",
    icon: FileText,
    submenus: [
      {
        subSlug: "case-converter",
        labelVi: "Case Converter",
        labelEn: "Case Converter",
        descriptionVi: "Chuyển đổi kiểu chữ: IN HOA, in thường, Title Case, camelCase, kebab-case",
        descriptionEn: "Convert text letter casing: UPPERCASE, lowercase, Title Case, camelCase",
        icon: Type,
        componentKey: "case-converter",
      },
      {
        subSlug: "word-counter-duplicate-filter",
        labelVi: "Word Counter & Duplicate Filter",
        labelEn: "Word Counter & Duplicate Filter",
        descriptionVi: "Đếm từ, đếm ký tự, đếm dòng & lọc danh sách trùng lặp",
        descriptionEn: "Count words, characters, lines & filter duplicate records",
        icon: FileCheck2,
        componentKey: "word-counter-duplicate-filter",
      },
      {
        subSlug: "string-cutter",
        labelVi: "String Cutter",
        labelEn: "String Cutter",
        descriptionVi: "Cắt chuỗi, cắt bớt ký tự đầu/cuối dòng & tìm kiếm thay thế Regex",
        descriptionEn: "Slice lines, trim prefix/suffix & Regex find-replace",
        icon: Scissors,
        componentKey: "string-cutter",
      },
      {
        subSlug: "diff-checker",
        labelVi: "Diff Checker",
        labelEn: "Diff Checker",
        descriptionVi: "So sánh khác biệt văn bản & mã nguồn theo từng dòng",
        descriptionEn: "Line-by-line text and code diff comparison",
        icon: GitCompare,
        componentKey: "diff-checker",
      },
      {
        subSlug: "column-joiner",
        labelVi: "Column Joiner",
        labelEn: "Column Joiner",
        descriptionVi: "Ghép hai danh sách cột văn bản nối tiếp nhau theo ký tự phân cách",
        descriptionEn: "Join two lists of text side by side with delimiter",
        icon: Columns,
        componentKey: "column-joiner",
      },
      {
        subSlug: "auto-increasement-generator",
        labelVi: "Auto Increasement Generator",
        labelEn: "Auto Increasement Generator",
        descriptionVi: "Tạo dãy văn bản có chèn số tự động tăng dần theo mẫu quy định",
        descriptionEn: "Generate text sequence with auto-incrementing numbers",
        icon: PlusCircle,
        componentKey: "auto-increasement-generator",
      },
    ],
  },
  {
    mainSlug: "web-data-html",
    module: ActiveModule.DATA_CONVERTER,
    labelVi: "Data & Live HTML Runner",
    labelEn: "Data & Live HTML Runner",
    descriptionVi: "Định dạng JSON/CSV, xem dạng lưới & chạy live HTML",
    descriptionEn: "Format JSON/CSV, view JSON grid & live HTML preview",
    icon: Terminal,
    submenus: [
      {
        subSlug: "format-json-csv",
        labelVi: "Format JSON & CSV",
        labelEn: "Format JSON & CSV",
        descriptionVi: "Làm đẹp (Beautify) & nén (Minify) mã JSON, CSV",
        descriptionEn: "Beautify and minify JSON, CSV code",
        icon: Code,
        componentKey: "format",
      },
      {
        subSlug: "json-grid-viewer",
        labelVi: "JSON Grid Viewer",
        labelEn: "JSON Grid Viewer",
        descriptionVi: "Hiển thị dữ liệu JSON cấu trúc dưới dạng bảng tương tác",
        descriptionEn: "Display structured JSON data as an interactive grid",
        icon: Table,
        componentKey: "convert",
      },
      {
        subSlug: "live-html-runner",
        labelVi: "Live HTML Runner",
        labelEn: "Live HTML Runner",
        descriptionVi: "Xem trước trực tiếp giao diện HTML/CSS/JS",
        descriptionEn: "Real-time preview for HTML/CSS/JS code",
        icon: Play,
        componentKey: "preview",
      },
    ],
  },
  {
    mainSlug: "excel-suite",
    module: ActiveModule.EXCEL_SUITE,
    labelVi: "Excel & Data Suite",
    labelEn: "Excel & Data Suite",
    descriptionVi: "Tách file, check lỗi account & gộp thư mục XLSX/CSV",
    descriptionEn: "Split files, validate accounts & merge XLSX/CSV folders",
    icon: FileSpreadsheet,
    submenus: [
      {
        subSlug: "split-and-validate",
        labelVi: "Split & Validate",
        labelEn: "Split & Validate",
        descriptionVi: "Chia nhỏ tệp Excel lớn và phát hiện dòng lỗi tài khoản",
        descriptionEn: "Split large Excel files and detect credential errors",
        icon: Split,
        componentKey: "splitter",
      },
      {
        subSlug: "merge-and-extract-account",
        labelVi: "Merge & Extract Account",
        labelEn: "Merge & Extract Account",
        descriptionVi: "Hợp nhất nhiều tệp Excel và trích xuất tài khoản/mật khẩu",
        descriptionEn: "Combine Excel files and extract account credentials",
        icon: Layers,
        componentKey: "merger",
      },
      {
        subSlug: "directory-aggregator",
        labelVi: "Directory Aggregator",
        labelEn: "Directory Aggregator",
        descriptionVi: "Tải nguyên thư mục & gộp toàn bộ bảng dữ liệu Excel/CSV",
        descriptionEn: "Upload entire directory & aggregate all Excel/CSV tables",
        icon: FolderOpen,
        componentKey: "aggregator",
      },
    ],
  },
  {
    mainSlug: "pdf-suite",
    module: ActiveModule.DOCUMENT_SCANNER,
    labelVi: "PDF Utilities Suite",
    labelEn: "PDF Utilities Suite",
    descriptionVi: "Quét ảnh nắn góc 4 điểm, tạo PDF, ghép và chia nhỏ file PDF",
    descriptionEn: "4-point perspective crop, image to PDF, merge & split PDF files",
    icon: ScanLine,
    submenus: [
      {
        subSlug: "create-pdf-from-images",
        labelVi: "Create PDF from Images",
        labelEn: "Create PDF from Images",
        descriptionVi: "Quét tài liệu, nắn góc 4 điểm, bộ lọc CamScanner & xuất PDF",
        descriptionEn: "Scan document, 4-point crop, CamScanner filters & export PDF",
        icon: Crop,
        componentKey: "scanner",
      },
      {
        subSlug: "merge-and-split-pdf",
        labelVi: "Merger & Split PDF Files",
        labelEn: "Merger & Split PDF Files",
        descriptionVi: "Hợp nhất nhiều tệp PDF thành 1 hoặc trích xuất/chia nhỏ các trang PDF",
        descriptionEn: "Merge multiple PDFs into one or split/extract PDF pages",
        icon: FileStack,
        componentKey: "pdf-merge-split",
      },
    ],
  },
  {
    mainSlug: "file-manager",
    module: ActiveModule.FILE_MANAGER,
    labelVi: "File & Metadata Manager",
    labelEn: "File & Metadata Manager",
    descriptionVi: "Đổi tên hàng loạt, sửa ngày tạo/sửa tệp, tải ZIP & chuyển đổi định dạng tệp",
    descriptionEn: "Batch rename, edit file timestamps, ZIP download & universal converter",
    icon: FolderSync,
    submenus: [
      {
        subSlug: "batch-file-renamer",
        labelVi: "Batch File Renamer",
        labelEn: "Batch File Renamer",
        descriptionVi: "Thêm tiền tố, hậu tố, số thứ tự cho hàng loạt tệp",
        descriptionEn: "Add prefix, suffix and numbering pattern to batch files",
        icon: Edit3,
        componentKey: "renamer",
      },
      {
        subSlug: "metadata-timestamp-editor",
        labelVi: "Metadata & Timestamp Editor",
        labelEn: "Metadata & Timestamp Editor",
        descriptionVi: "Sửa ngày khởi tạo và ngày chỉnh sửa tệp rồi tải ZIP",
        descriptionEn: "Modify file created/modified dates and export as ZIP",
        icon: FileClock,
        componentKey: "metadata",
      },
      {
        subSlug: "universal-file-converter",
        labelVi: "Universal File Converter",
        labelEn: "Universal File Converter",
        descriptionVi: "Chuyển đổi đa định dạng: PDF, DOCX, PNG, JPG, WEBP, MP3, WAV, XLSX, CSV, JSON",
        descriptionEn: "Convert between PDF, DOCX, PNG, JPG, WEBP, MP3, WAV, XLSX, CSV, JSON",
        icon: RefreshCw,
        componentKey: "converter",
      },
    ],
  },
];

// Helper: Legacy Hash Mapping Table
const LEGACY_HASH_MAP: Record<string, { mainSlug: string; subSlug: string }> = {
  // Text suite
  "xu-ly-van-ban": { mainSlug: "text-suite", subSlug: "case-converter" },
  "chuyen-doi-kieu-chu": { mainSlug: "text-suite", subSlug: "case-converter" },
  "case-converter": { mainSlug: "text-suite", subSlug: "case-converter" },
  
  "dem-tu-va-loc-trung": { mainSlug: "text-suite", subSlug: "word-counter-duplicate-filter" },
  "van-ban-va-loc-trung": { mainSlug: "text-suite", subSlug: "word-counter-duplicate-filter" },
  "word-counter-duplicate-filter": { mainSlug: "text-suite", subSlug: "word-counter-duplicate-filter" },
  "text-utilities": { mainSlug: "text-suite", subSlug: "word-counter-duplicate-filter" },
  
  "cat-va-thay-the-chuoi": { mainSlug: "text-suite", subSlug: "string-cutter" },
  "string-cutter": { mainSlug: "text-suite", subSlug: "string-cutter" },
  
  "so-sanh-ma-diff": { mainSlug: "text-suite", subSlug: "diff-checker" },
  "diff-checker": { mainSlug: "text-suite", subSlug: "diff-checker" },
  "diff": { mainSlug: "text-suite", subSlug: "diff-checker" },
  
  "ghep-cot": { mainSlug: "text-suite", subSlug: "column-joiner" },
  "column-joiner": { mainSlug: "text-suite", subSlug: "column-joiner" },
  
  "tu-dong-tang-so": { mainSlug: "text-suite", subSlug: "auto-increasement-generator" },
  "auto-increasement-generator": { mainSlug: "text-suite", subSlug: "auto-increasement-generator" },

  // Data converter
  "du-lieu-va-html": { mainSlug: "web-data-html", subSlug: "format-json-csv" },
  "chuyen-doi-du-lieu-web": { mainSlug: "web-data-html", subSlug: "format-json-csv" },
  "dinh-dang-json-csv": { mainSlug: "web-data-html", subSlug: "format-json-csv" },
  "format-json-csv": { mainSlug: "web-data-html", subSlug: "format-json-csv" },
  "xem-luoi-json": { mainSlug: "web-data-html", subSlug: "json-grid-viewer" },
  "json-grid-viewer": { mainSlug: "web-data-html", subSlug: "json-grid-viewer" },
  "chay-html-truc-tiep": { mainSlug: "web-data-html", subSlug: "live-html-runner" },
  "live-html-runner": { mainSlug: "web-data-html", subSlug: "live-html-runner" },

  // Excel suite
  "bo-cong-cu-excel": { mainSlug: "excel-suite", subSlug: "split-and-validate" },
  "xu-ly-excel": { mainSlug: "excel-suite", subSlug: "split-and-validate" },
  "tach-va-kiem-tra-loi": { mainSlug: "excel-suite", subSlug: "split-and-validate" },
  "split-and-validate": { mainSlug: "excel-suite", subSlug: "split-and-validate" },
  "gop-va-trich-xuat-account": { mainSlug: "excel-suite", subSlug: "merge-and-extract-account" },
  "merge-and-extract-account": { mainSlug: "excel-suite", subSlug: "merge-and-extract-account" },
  "gop-thu-muc-xlsx-csv": { mainSlug: "excel-suite", subSlug: "directory-aggregator" },
  "directory-aggregator": { mainSlug: "excel-suite", subSlug: "directory-aggregator" },

  // PDF suite
  "quet-tai-lieu": { mainSlug: "pdf-suite", subSlug: "create-pdf-from-images" },
  "xu-ly-tai-lieu-pdf": { mainSlug: "pdf-suite", subSlug: "create-pdf-from-images" },
  "tao-pdf-tu-anh": { mainSlug: "pdf-suite", subSlug: "create-pdf-from-images" },
  "create-pdf-from-images": { mainSlug: "pdf-suite", subSlug: "create-pdf-from-images" },
  "ghep-chia-pdf": { mainSlug: "pdf-suite", subSlug: "merge-and-split-pdf" },
  "gop-chia-nho-pdf": { mainSlug: "pdf-suite", subSlug: "merge-and-split-pdf" },
  "merge-and-split-pdf": { mainSlug: "pdf-suite", subSlug: "merge-and-split-pdf" },
  "xem-sach-song-song": { mainSlug: "pdf-suite", subSlug: "create-pdf-from-images" },

  // File manager & Converter
  "quan-ly-tep": { mainSlug: "file-manager", subSlug: "batch-file-renamer" },
  "doi-ten-hang-loat": { mainSlug: "file-manager", subSlug: "batch-file-renamer" },
  "batch-file-renamer": { mainSlug: "file-manager", subSlug: "batch-file-renamer" },
  "chinh-sua-metadata-timestamp": { mainSlug: "file-manager", subSlug: "metadata-timestamp-editor" },
  "metadata-timestamp-editor": { mainSlug: "file-manager", subSlug: "metadata-timestamp-editor" },
  "chuyen-doi-dinh-dang": { mainSlug: "file-manager", subSlug: "universal-file-converter" },
  "universal-file-converter": { mainSlug: "file-manager", subSlug: "universal-file-converter" },
};

/**
 * Parses the current location path into mainSlug and subSlug.
 * Supports clean routes like `/text-suite/case-converter` or `/web-data-html/live-html-runner`
 */
export function parseRoute(pathString: string): {
  mainSlug: string;
  subSlug: string;
  activeModule: ActiveModule;
  mainItem: MainMenuItem;
  subItem: SubMenuItem;
  shouldRedirect: boolean;
  targetPath: string;
} {
  let cleanPath = pathString;
  if (cleanPath.startsWith("#")) {
    cleanPath = cleanPath.replace(/^#\/?/, "");
  }
  cleanPath = cleanPath.replace(/^\//, "").trim();
  const parts = cleanPath.split("/").filter(Boolean);

  // Default fallback item
  const defaultMain = MAIN_MENU_ITEMS[0];
  const defaultSub = defaultMain.submenus[0];

  if (!cleanPath) {
    return {
      mainSlug: defaultMain.mainSlug,
      subSlug: defaultSub.subSlug,
      activeModule: defaultMain.module,
      mainItem: defaultMain,
      subItem: defaultSub,
      shouldRedirect: true,
      targetPath: `/${defaultMain.mainSlug}/${defaultSub.subSlug}`,
    };
  }

  // Check legacy map first
  if (LEGACY_HASH_MAP[cleanPath.toLowerCase()]) {
    const mapped = LEGACY_HASH_MAP[cleanPath.toLowerCase()];
    const mItem = MAIN_MENU_ITEMS.find((m) => m.mainSlug === mapped.mainSlug) || defaultMain;
    const sItem = mItem.submenus.find((s) => s.subSlug === mapped.subSlug) || mItem.submenus[0];
    return {
      mainSlug: mItem.mainSlug,
      subSlug: sItem.subSlug,
      activeModule: mItem.module,
      mainItem: mItem,
      subItem: sItem,
      shouldRedirect: true,
      targetPath: `/${mItem.mainSlug}/${sItem.subSlug}`,
    };
  }

  // Check 1 part path: `mainSlug` or `mainSlug/`
  if (parts.length === 1) {
    const rawMain = parts[0].toLowerCase();
    const matchedMain = MAIN_MENU_ITEMS.find((m) => m.mainSlug === rawMain);

    if (matchedMain) {
      const firstSub = matchedMain.submenus[0];
      return {
        mainSlug: matchedMain.mainSlug,
        subSlug: firstSub.subSlug,
        activeModule: matchedMain.module,
        mainItem: matchedMain,
        subItem: firstSub,
        shouldRedirect: true,
        targetPath: `/${matchedMain.mainSlug}/${firstSub.subSlug}`,
      };
    }
  }

  // Check 2 parts path: `mainSlug/subSlug`
  if (parts.length >= 2) {
    const rawMain = parts[0].toLowerCase();
    const rawSub = parts[1].toLowerCase();

    const matchedMain = MAIN_MENU_ITEMS.find((m) => m.mainSlug === rawMain);
    if (matchedMain) {
      const matchedSub = matchedMain.submenus.find((s) => s.subSlug === rawSub);
      if (matchedSub) {
        return {
          mainSlug: matchedMain.mainSlug,
          subSlug: matchedSub.subSlug,
          activeModule: matchedMain.module,
          mainItem: matchedMain,
          subItem: matchedSub,
          shouldRedirect: false,
          targetPath: `/${matchedMain.mainSlug}/${matchedSub.subSlug}`,
        };
      } else {
        // subSlug not matched, redirect to first sub of this main
        const firstSub = matchedMain.submenus[0];
        return {
          mainSlug: matchedMain.mainSlug,
          subSlug: firstSub.subSlug,
          activeModule: matchedMain.module,
          mainItem: matchedMain,
          subItem: firstSub,
          shouldRedirect: true,
          targetPath: `/${matchedMain.mainSlug}/${firstSub.subSlug}`,
        };
      }
    }
  }

  // Unknown route fallback
  return {
    mainSlug: defaultMain.mainSlug,
    subSlug: defaultSub.subSlug,
    activeModule: defaultMain.module,
    mainItem: defaultMain,
    subItem: defaultSub,
    shouldRedirect: true,
    targetPath: `/${defaultMain.mainSlug}/${defaultSub.subSlug}`,
  };
}

export function navigateTo(path: string) {
  window.history.pushState(null, "", path);
  window.dispatchEvent(new Event("popstate"));
}
