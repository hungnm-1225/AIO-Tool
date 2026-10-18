# AIO Tool — Hệ Thống Công Cụ Web Đa Năng (All-In-One Developer & Office Suite)

> **Phiên bản hiện tại:** `v2.9.0`  
> **Kiến trúc cốt lõi:** Single Page Application (SPA) / React 19 + TypeScript 5.8 + Vite 6 + Tailwind CSS 4 + Express Server  
> **Mô hình hoạt động:** **100% Client-Side Sandbox & Offline-First** (Toàn bộ dữ liệu xử lý Excel, PDF, tài liệu, hình ảnh, văn bản, nén ZIP đều thực thi trực tiếp trên Sandbox RAM của trình duyệt; bảo đảm an toàn dữ liệu tuyệt đối).

---

## 📑 MỤC LỤC TOÀN DIỆN

1. [Tổng Quan Kiến Trúc & Triết Lý Thiết Kế](#1-tổng-quan-kiến-trúc--triết-lý-thiết-kế)
2. [Chi Tiết Tech Stack & Thư Viện Phụ Thuộc](#2-chi-tiết-tech-stack--thư-viện-phụ-thuộc)
3. [Sơ Đồ Thư Mục & Danh Mục Toàn Bộ Tệp Tin (File Catalog)](#3-sơ-đồ-thư-mục--danh-mục-toàn-bộ-tệp-tin-file-catalog)
4. [Kiến Trúc Luồng Dữ Liệu & Quản Trị Trạng Thái (Data Flow & State)](#4-kiến-trúc-luồng-dữ-liệu--quản-trị-trạng-thái-data-flow--state)
   - [4.1. Cấu Trúc Cây Component (Component Hierarchy)](#41-cấu-trúc-cây-component-component-hierarchy)
   - [4.2. Hệ Thống Định Tuyến URL & Navigation Phân Cấp](#42-hệ-thống-định-tuyến-url--navigation-phân-cấp)
   - [4.3. Quản Trị Bộ Nhớ 2 Tầng Chống Tràn Quota Storage](#43-quản-trị-bộ-nhớ-2-tầng-chống-tràn-quota-storage)
   - [4.4. Hệ Thống Đa Ngôn Ngữ Song Ngữ (i18n)](#44-hệ-thống-đa-ngôn-ngữ-song-ngữ-i18n)
5. [Phân Tích Chi Tiết Từng Phân Hệ & Module (Deep Dive)](#5-phân-tích-chi-tiết-từng-phân-hệ--module-deep-dive)
   - [5.1. Phân Hệ Văn Bản & So Sánh Mã (Text & Compare Suite)](#51-phân-hệ-văn-bản--so-sánh-mã-text--compare-suite)
   - [5.2. Phân Hệ Dữ Liệu Web & Chạy Live HTML (Web Data & Live HTML Runner)](#52-phân-hệ-dữ-liệu-web--chạy-live-html-web-data--live-html-runner)
   - [5.3. Phân Hệ Bảng Tính Excel (Excel Suite)](#53-phân-hệ-bảng-tính-excel-excel-suite)
   - [5.4. Phân Hệ Quét Tài Liệu & Xử Lý PDF (Document Scanner & PDF Suite)](#54-phân-hệ-quét-tài-liệu--xử-lý-pdf-document-scanner--pdf-suite)
   - [5.5. Phân Hệ Quản Lý Tệp & Metadata (File Manager Suite)](#55-phân-hệ-quản-lý-tệp--metadata-file-manager-suite)
   - [5.6. Máy Chủ Backend & API Handlers](#56-máy-chủ-backend--api-handlers)
6. [Hệ Thống Tiện Ích & Thuật Toán Cốt Lõi (Core Algorithms & Helpers)](#6-hệ-thống-tiện-ích--thuật-toán-cốt-lõi-core-algorithms--helpers)
7. [Bảng Tra Cứu Tuyến Đường URL (Route Reference Table)](#7-bảng-tra-cứu-tuyến-đường-url-route-reference-table)
8. [Hướng Dẫn Dành Cho AI Coder & Kỹ Sư Phát Triển (Onboarding Guide)](#8-hướng-dẫn-dành-cho-ai-coder--kỹ-sư-phát-triển-onboarding-guide)
9. [Quy Chuẩn Kiểm Thử, Build & Khởi Chạy](#9-quy-chuẩn-kiểm-thử-build--khởi-chạy)

---

## 1. Tổng Quan Kiến Trúc & Triết Lý Thiết Kế

### 1.1. Mục Tiêu Dự Án
**AIO Tool (All-In-One Developer & Office Suite)** là một bộ công cụ web tích hợp toàn diện ("Swiss Army Knife" cho lập trình viên, kỹ sư dữ liệu và nhân sự văn phòng), tập hợp hơn 18 công cụ chuyên sâu vào một giao diện web duy nhất:
* Thao tác văn bản, chuẩn hóa kiểu chữ, lọc bản ghi trùng, so sánh mã nguồn (LCS Diff).
* Định dạng mã, làm đẹp/nén JSON, CSV, HTML, CSS, JS; xem dữ liệu JSON dạng lưới và Sandbox Live HTML thời gian thực.
* Xử lý bảng tính Excel/CSV quy mô lớn: Gộp dọc đệ quy theo cây thư mục với cơ chế xem trước tùy biến dòng Header, giữ nguyên Preamble file mẫu; Ghép cột ngang theo khóa liên kết (Relational Join); Tách bảng tính lớn thành nhiều file nhỏ theo giá trị cột độc nhất kèm đóng gói ZIP.
* Quét tài liệu nắn phẳng 4 góc (Homography Warp) với kính lúp phóng to pixel, bộ lọc CamScanner Magic Color và xuất PDF chuẩn in ấn; Ghép, cắt dải trang, xoay và biên tập trang PDF nhị phân.
* Quản lý tệp tin hàng loạt: Đổi tên theo mẫu tự tăng, can thiệp timestamp lịch sử tệp (ngày tạo/ngày sửa) trong file ZIP, và chuyển đổi định dạng đa năng (Document, Image, Audio, Data).

### 1.2. Triết Lý Thiết Kế 100% Client-Side Sandbox & Offline-First
* **Zero Data Retention:** Không thiết lập cơ sở dữ liệu lưu trữ tài liệu người dùng. Mọi file tải lên đều được xử lý cục bộ trên RAM của trình duyệt.
* **In-Browser Processing:** Các tác vụ nặng như tách file Excel hàng chục ngàn dòng, bóc tách cấu trúc PDF, nén ZIP, lọc ma trận điểm ảnh... đều tận dụng tối đa CPU và bộ nhớ của máy khách thông qua Web APIs: HTML5 Canvas, Web Workers, TypedArrays (`Uint8Array`, `ArrayBuffer`), Blob và FileReader.
* **Bảo Mật & Riêng Tư Tuyệt Đối:** Dữ liệu nhân sự, danh sách tài khoản, hồ sơ khách hàng, hóa đơn thuế và tài liệu mật được xử lý độc lập ngay cả khi thiết bị ngắt kết nối Internet hoàn toàn.

---

## 2. Chi Tiết Tech Stack & Thư Viện Phụ Thuộc

Dự án áp dụng hệ sinh thái công nghệ hiện đại nhất (Modern Web Ecosystem) được định nghĩa trong `package.json`:

| Thư Viện / Gói | Phiên Bản | Mục Đích & Vai Trò Trong Dự Án |
| :--- | :--- | :--- |
| **`react`** / **`react-dom`** | `^19.0.1` | Thư viện UI cốt lõi phiên bản React 19, điều phối vòng đời component và trạng thái phản ứng. |
| **`vite`** | `^6.2.3` | Bundler và Development Server hiệu năng cao, hỗ trợ Hot Module Replacement (HMR). |
| **`@tailwindcss/vite`** | `^4.1.14` | Plugin Tailwind CSS v4 Engine chạy trực tiếp bên trong pipeline của Vite. |
| **`tailwindcss`** | `^4.1.14` | Framework CSS Utility-first định hình toàn bộ giao diện Dark/Light mode chuẩn xác. |
| **`typescript`** | `~5.8.2` | Ngôn ngữ tĩnh bảo đảm kiểm tra kiểu nghiêm ngặt (Strict Type Checking) cho toàn bộ codebase. |
| **`express`** | `^4.21.2` | Máy chủ Node.js chạy ở `server.ts`, tích hợp Vite Middleware ở môi trường dev và phục vụ static bundle ở production. |
| **`tsx`** | `^4.21.0` | Bộ thực thi TypeScript trực tiếp cho Node.js runtime trong script `npm run dev`. |
| **`esbuild`** | `^0.25.0` | Trình đóng gói siêu tốc biên dịch `server.ts` thành `dist/server.cjs` khi triển khai sản xuất. |
| **`xlsx` (SheetJS)** | `^0.18.5` | Đọc, phân tích, trích xuất và tạo file Excel (.xlsx, .xls) và CSV trực tiếp trên RAM. |
| **`jszip`** | `^3.10.1` | Đóng gói và giải nén file ZIP Client-Side (tách Excel, tách PDF, đổi tên, can thiệp timestamp). |
| **`jspdf`** | `^4.2.1` | Khởi tạo file PDF vector/raster trực tiếp từ dữ liệu ảnh hoặc mã canvas, hỗ trợ cấu hình khổ giấy và lề. |
| **`pdf-lib`** | `^1.17.1` | Xử lý nhị phân tài liệu PDF: ghép file, trích xuất dải trang, sao chép và xoay góc trang độc lập. |
| **`pdfjs-dist`** | `^6.1.200` | Giải mã cấu trúc trang PDF và render từng trang thành HTML5 Canvas làm thumbnail trực quan. |
| **`prismjs`** | `^1.30.0` | Thư viện tô màu cú pháp (Syntax Highlighting) cho các ngôn ngữ JSON, HTML, CSS, JavaScript. |
| **`motion`** | `^12.23.24` | Hiệu ứng chuyển động mượt mà cho các modal, danh sách và bảng điều khiển. |
| **`lucide-react`** | `^0.546.0` | Bộ icon SVG phong phú, hiện đại và đồng bộ phong cách visual cho toàn bộ hệ thống. |
| **`react-toastify`** | `^11.1.0` | Hệ thống thông báo trạng thái nổi (Toast Notifications: success, error, info, warning). |
| **`mammoth`** | `^1.12.0` | Trích xuất văn bản từ tệp Word (.docx) sang HTML/Markdown phục vụ chuyển đổi tài liệu. |
| **`marked`** | `^18.0.7` | Trình biên dịch Markdown sang HTML tốc độ cao. |
| **`tesseract.js`** | `^7.0.0` | Engine OCR (Optical Character Recognition) chạy WebAssembly trích xuất chữ viết từ ảnh. |
| **`html2canvas`** | `^1.4.1` | Render DOM element thành HTML5 Canvas phục vụ in ấn hoặc xuất ảnh chất lượng cao. |

---

## 3. Sơ Đồ Thư Mục & Danh Mục Toàn Bộ Tệp Tin (File Catalog)

```text
AIO-Tool/
├── api/
│   └── download.ts                  # Serverless / Express endpoint hỗ trợ proxy tải media đa nền tảng
├── src/
│   ├── components/                  # Toàn bộ UI Components của hệ thống
│   │   ├── CodeEditor.tsx           # Trình soạn thảo mã Dual-Layer (Textarea + PrismJS Highlight)
│   │   ├── CompareMerge.tsx         # So sánh diff văn bản (LCS), ghép 2 cột, tạo dãy số tự tăng
│   │   ├── DataConverterHtml.tsx    # Định dạng/nén JSON/CSV, xem lưới JSON, Live HTML Sandbox
│   │   ├── DirectoryAggregator.tsx  # Quét đệ quy thư mục, tùy chỉnh dòng header từng file, gộp master
│   │   ├── DocScannerPdf.tsx        # Quét tài liệu nắn phối cảnh 4 điểm, bộ lọc CamScanner, xuất PDF
│   │   ├── ExcelSplitByColumn.tsx   # Tách file Excel/CSV theo giá trị cột duy nhất (Group & Split)
│   │   ├── ExcelSuite.tsx           # Container điều hướng thống nhất cho toàn bộ phân hệ Excel
│   │   ├── FileConverter.tsx        # Bộ chuyển đổi định dạng đa năng (Document, Image, Audio, Data)
│   │   ├── FileManagerSuite.tsx     # Container điều hướng phân hệ Quản lý tệp tin
│   │   ├── FileMetadataEditor.tsx   # Sửa ngày tạo/sửa đổi tệp tin (created/modified) & xuất file ZIP
│   │   ├── FileRenamer.tsx          # Đổi tên tệp tin hàng loạt theo pattern, prefix, suffix, tự tăng
│   │   ├── MediaDownloader.tsx      # Giao diện tải video/audio đa nền tảng (Facebook, TikTok, v.v.)
│   │   ├── MergeTable.tsx           # Gộp bảng (Common Merge đệ quy & Key-based Merge tùy biến Header)
│   │   ├── PdfEdit.tsx              # Chỉnh sửa PDF: chèn trang mới từ ảnh/PDF, nắn góc, bộ lọc nét chữ
│   │   ├── PdfMerge.tsx             # Ghép file PDF: sắp xếp kéo thả, xoay góc và xóa trang
│   │   ├── PdfSplit.tsx             # Chia nhỏ PDF theo dải trang (Range) hoặc tách lẻ từng trang
│   │   ├── ScrollToTop.tsx          # Nút cuộn nhanh mượt mà lên đầu trang
│   │   ├── Sidebar.tsx              # Thanh điều hướng Accordion đa tầng & chế độ thu gọn linh hoạt
│   │   ├── TextAndCompareSuite.tsx  # Container tích hợp các công cụ văn bản và so sánh mã
│   │   └── TextUtilities.tsx        # Biến đổi kiểu chữ, lọc dòng trùng lặp/đếm từ, cắt chuỗi & Regex
│   ├── utils/                       # Hệ thống tiện ích và thuật toán xử lý dữ liệu
│   │   ├── diff.ts                  # Thuật toán LCS so sánh ký tự, từ ngữ và dòng văn bản
│   │   ├── formatters.ts            # Parser & Minifier cho JSON, HTML, CSS, JavaScript, CSV
│   │   ├── i18n.tsx                 # Context Provider đa ngôn ngữ song ngữ Tiếng Việt - English
│   │   ├── navigation.ts            # Bảng cấu trúc menu, phân tích Route URL & Legacy Hash Map
│   │   ├── perspectiveWarp.ts       # Ma trận nắn phối cảnh 4 điểm Homography & bộ lọc CamScanner
│   │   ├── sessionHelper.ts         # Quản trị cache RAM và SessionStorage 2 tầng chống tràn bộ nhớ
│   │   ├── unicodeFont.ts           # Cấu hình font chữ Unicode hỗ trợ tiếng Việt đầy đủ cho jsPDF
│   │   └── xlsxHelper.ts            # Wrapper tương thích tĩnh ESM/CJS an toàn cho thư viện SheetJS
│   ├── App.tsx                      # Component gốc: Quản lý AppState, Theme, Routing & LocalStorage
│   ├── index.css                    # Tailwind CSS v4 styling, custom scrollbars & theme variables
│   ├── main.tsx                     # Điểm nhập React 19 mount vào phần tử DOM #root
│   └── types.ts                     # Định nghĩa Interfaces, Enums và Types dùng chung toàn dự án
├── index.html                       # HTML Template cho Single Page Application
├── metadata.json                    # Metadata thông tin dự án
├── package.json                     # Cấu hình dependencies, metadata và các npm scripts
├── server.ts                        # Máy chủ phát triển & phân phối sản phẩm (Express + Vite)
├── tsconfig.json                    # Cấu hình trình biên dịch TypeScript (ESNext, React JSX)
├── vercel.json                      # Cấu hình định tuyến SPA khi triển khai trên Vercel
└── vite.config.ts                   # Cấu hình bundler Vite, aliases và plugin Tailwind CSS v4
```

---

## 4. Kiến Trúc Luồng Dữ Liệu & Quản Trị Trạng Thái (Data Flow & State)

### 4.1. Cấu Trúc Cây Component (Component Hierarchy)

```text
index.html
  └── main.tsx
        └── I18nProvider (src/utils/i18n.tsx)
              └── App.tsx (MainApp)
                    ├── Mobile Header Bar (Menu, Theme, Lang)
                    ├── Sidebar.tsx (Accordion Navigation + Collapsible Flyout)
                    ├── Main View (Router Container)
                    │     ├── TextAndCompareSuite.tsx
                    │     │     ├── TextUtilities.tsx (Case, Duplicates, Slice & Regex)
                    │     │     └── CompareMerge.tsx (Diff Checker, Column Joiner, Auto Inc)
                    │     ├── DataConverterHtml.tsx
                    │     │     ├── CodeEditor.tsx (Dual-Layer Syntax Editor)
                    │     │     ├── JSON Grid Viewer (Interactive Table)
                    │     │     └── Live HTML Runner (Iframe Sandbox)
                    │     ├── ExcelSuite.tsx
                    │     │     ├── MergeTable.tsx (Common Merge & Key-based Relational Join)
                    │     │     │     └── DirectoryAggregator.tsx (Recursive Folder Picker)
                    │     │     └── ExcelSplitByColumn.tsx (Group & Split by Column)
                    │     ├── DocScannerPdf.tsx (4-point Warp & CamScanner Filters)
                    │     ├── PdfMerge.tsx (Binary PDF Merge & Page Management)
                    │     ├── PdfSplit.tsx (Range & Single-Page PDF Split)
                    │     ├── PdfEdit.tsx (Insert Pages, Warp & Filter Pages)
                    │     ├── FileManagerSuite.tsx
                    │     │     ├── FileRenamer.tsx (Batch Rename with Pattern)
                    │     │     ├── FileMetadataEditor.tsx (Timestamp Modification)
                    │     │     └── FileConverter.tsx (Universal Document/Image/Audio/Data)
                    │     └── FileConverter.tsx (Direct route /file-converter)
                    ├── ScrollToTop.tsx
                    └── ToastContainer (react-toastify)
```

### 4.2. Hệ Thống Định Tuyến URL & Navigation Phân Cấp (`src/utils/navigation.ts`)
* Dự án áp dụng cơ chế Client-Side URL Routing phân cấp dạng sạch (Clean URL):  
  **`/{mainSlug}/{subSlug}`** (ví dụ: `/excel-suite/merge-table`, `/pdf-suite/create-pdf-from-images`).
* **Hàm `parseRoute(pathString)`**:
  - Phân tách URL hiện tại thành `mainSlug` và `subSlug`.
  - Hỗ trợ đối chiếu ngược qua bảng **`LEGACY_HASH_MAP`** để các URL bookmark cũ (ví dụ: `#xu-ly-van-ban`, `#tach-va-kiem-tra-loi`, `#ghep-chia-pdf`) tự động chuyển hướng chuẩn xác về định dạng URL phân cấp mới mà không làm mất phiên làm việc của người dùng.
  - Tự động fallback về tab con mặc định đầu tiên nếu người dùng chỉ truy cập đường dẫn cấp 1 `/{mainSlug}` hoặc đường dẫn không hợp lệ.
* **Hàm `navigateTo(path)`**:
  - Gọi `window.history.pushState(null, "", path)`.
  - Phát sự kiện tùy biến `window.dispatchEvent(new Event("popstate"))` giúp `App.tsx` nhận biết thay đổi và render lại component tương ứng ngay tức thì mà không cần reload trang.

### 4.3. Quản Trị Bộ Nhớ 2 Tầng Chống Tràn Quota Storage (`src/utils/sessionHelper.ts`)
Trong các ứng dụng xử lý tệp nhị phân (Canvas, PDF, ArrayBuffer, File) trên trình duyệt, hạn mức lưu trữ của `sessionStorage` và `localStorage` chỉ khoảng **~5MB**. Nếu lưu trực tiếp các đối tượng nhị phân lớn, trình duyệt sẽ ném ngoại lệ làm sập ứng dụng: `QuotaExceededError`.

Hệ thống giải quyết triệt để vấn đề này bằng kiến trúc **Hybrid 2-Tier Caching**:
1. **Tier 1 — In-Memory RAM Cache (`window.__session_file_cache`):** Lưu trữ trực tiếp con trỏ tham chiếu đối tượng gốc (`HTMLCanvasElement`, `Uint8Array`, `File`, `Blob`). Tốc độ truy xuất đạt $O(1)$, tức thì và không gây tắc nghẽn main thread.
2. **Tier 2 — Sanitized Session Storage (`sessionStorage`):** Sử dụng hàm đệ quy `sanitizeForSessionStorage(obj)` để tự động quét và loại bỏ các trường dữ liệu nặng (`originalPdfBytes`, `warpedCanvas`, `processedCanvas`, `Uint8Array`, `File`) trước khi thực hiện `JSON.stringify`. Chỉ các trường cấu hình nhẹ (tên file, kích thước, số trang, tùy chọn bộ lọc) được lưu xuống `sessionStorage`. Khi người dùng F5 hoặc reload trang, trạng thái cấu hình vẫn được bảo toàn.
3. **Bộ API chuyên biệt `pdfSessionStore`:**
   - `getMerge()` / `setMerge()` / `clearMerge()`
   - `getSplit()` / `setSplit()` / `clearSplit()`
   - `getEdit()` / `setEdit()` / `clearEdit()`
   - `getScanner()` / `setScanner()` / `clearScanner()`

### 4.4. Hệ Thống Đa Ngôn Ngữ Song Ngữ (i18n) (`src/utils/i18n.tsx`)
* Cung cấp Context `I18nProvider` bọc toàn bộ ứng dụng, hỗ trợ chuyển đổi mượt mà giữa **Tiếng Việt 🇻🇳** và **English 🇺🇸**.
* Hook `const { t, lang, setLang } = useI18n()` cho phép truy xuất khóa dịch dạng dot-notation lồng nhau (ví dụ: `t("common.copy")`, `t("excelSplitByColumn.title")`).
* Lựa chọn ngôn ngữ được ghi nhớ tự động vào `localStorage.getItem("preferred_lang")`.

---

## 5. Phân Tích Chi Tiết Từng Phân Hệ & Module (Deep Dive)

---

### 5.1. Phân Hệ Văn Bản & So Sánh Mã (Text & Compare Suite)
**Đường dẫn chính:** `/text-suite`  
**Files:** `TextAndCompareSuite.tsx`, `TextUtilities.tsx`, `CompareMerge.tsx`, `src/utils/diff.ts`

#### A. `TextUtilities.tsx` — Tiện Ích Xử Lý Chuỗi Chuyên Sâu
Bao gồm 3 tab chức năng:
1. **Chuyển Đổi Kiểu Chữ (Case Converter):**
   - Biến đổi nhanh chóng giữa các định dạng: `UPPERCASE` (IN HOA), `lowercase` (in thường), `Capitalize` (Hoa Đầu Chữ), `camelCase`, `kebab-case`, `snake_case`, `PascalCase`, và chuyển đổi sang Tiêu Đề Bài Viết Chuẩn Tiếng Việt.
2. **Lọc Dòng Trùng Lặp & Đếm Từ (Duplicate Filter & Word Counter):**
   - Đếm số ký tự (hỗ trợ bật/tắt đếm khoảng trắng), đếm số dòng (hỗ trợ bỏ qua dòng trống), và đếm số từ.
   - Các chế độ lọc nâng cao:
     - `remove`: Loại bỏ toàn bộ các dòng trùng lặp, chỉ giữ lại lần xuất hiện đầu tiên.
     - `frequency`: Thống kê tần suất xuất hiện của từng dòng, sắp xếp giảm dần kèm tỷ lệ phần trăm trực quan.
     - `uniques`: Lọc ra danh sách những dòng chỉ xuất hiện duy nhất 1 lần trong toàn văn bản.
     - `duplicates`: Trích xuất riêng các dòng bị lặp lại từ 2 lần trở lên.
3. **Cắt & Thay Thế Chuỗi (String Cutter & Regex Replacer):**
   - Cắt bớt $N$ ký tự ở đầu dòng (`start`) hoặc cuối dòng (`end`).
   - Tìm kiếm và thay thế chuỗi bằng văn bản thuần hoặc Regular Expression có hỗ trợ tùy chọn phân biệt chữ hoa/chữ thường (`matchCase`).

#### B. `CompareMerge.tsx` & `src/utils/diff.ts` — So Sánh Mã & Thao Tác Cột
1. **So Sánh Mã Nguồn & Văn Bản (Diff Checker):**
   - Áp dụng thuật toán quy hoạch động **LCS (Longest Common Subsequence)** trong `diff.ts`.
   - `diffLines(origText, modText)`: Nhận diện chính xác các dòng được thêm (`added`), xóa (`removed`), giữ nguyên (`equal`) hoặc sửa đổi (`modified`).
   - `diffWordsOrChars(orig, mod)`: Khi một dòng bị sửa đổi (`modified`), thuật toán tự động phân tích sâu đến từng từ và ký tự để highlight màu sắc chính xác phần khác biệt, loại bỏ hoàn toàn việc dò tìm thủ công.
   - Hỗ trợ 2 chế độ hiển thị: Hợp nhất (`unified`) và Song song 2 cột (`side-by-side`).
2. **Ghép Cột Văn Bản (Column Joiner):**
   - Ghép hai danh sách cột văn bản độc lập chạy dọc theo nhau với ký tự phân cách tùy biến (phẩy, gạch đứng `|`, tab `\t`, dấu cách...).
3. **Tạo Dãy Số Tự Tăng (Auto Increasement Generator):**
   - Sinh danh sách văn bản theo mẫu (ví dụ: `USER_[x]_HN`), cho phép cấu hình giá trị bắt đầu, bước nhảy và độ dài đệm số không phía trước (`zeroPadding`).

---

### 5.2. Phân Hệ Dữ Liệu Web & Chạy Live HTML (Web Data & Live HTML Runner)
**Đường dẫn chính:** `/web-data-html`  
**Files:** `DataConverterHtml.tsx`, `CodeEditor.tsx`, `src/utils/formatters.ts`

#### A. `CodeEditor.tsx` — Trình Soạn Thảo Cú Pháp Dual-Layer
Để tối ưu tốc độ render và loại bỏ sự cồng kềnh của Monaco Editor, `CodeEditor.tsx` được thiết kế theo mô hình **Dual-Layer Architecture**:
* **Layer Tương Tác:** Thẻ `<textarea>` trong suốt với font chữ monospace đặt ở tầng trên, tiếp nhận toàn bộ thao tác gõ phím, bôi đen, sao chép và phím tắt.
* **Layer Hiển Thị Cú Pháp:** Thẻ `<pre><code>` đặt ở tầng dưới với cùng kích thước, cỡ chữ và lề padding, hiển thị mã nguồn đã được tô màu cú pháp bởi PrismJS.
* **Đồng Bộ Tọa Độ Cuộn:** Tự động đồng bộ `scrollTop` và `scrollLeft` thời gian thực, mang lại trải nghiệm gõ code chuyên nghiệp.

#### B. `DataConverterHtml.tsx` — Xử Lý Dữ Liệu & Sandbox HTML
1. **Định Dạng Mã (Format & Minify JSON/HTML/CSS/JS):**
   - Tích hợp các bộ parser viết bằng TypeScript thuần trong `formatters.ts`: `beautifyJson`, `minifyJson`, `beautifyHtml`, `minifyHtml`, `beautifyCss`, `minifyCss`, `beautifyJs`, `minifyJs`.
   - Chuyển đổi hai chiều: `csvToJson` và `jsonToCsv` (bảo đảm an toàn chuỗi chứa dấu phẩy và dấu ngoặc kép).
2. **Xem Dữ Liệu Dạng Lưới (JSON Grid Viewer):**
   - Phân tích cú pháp mảng đối tượng JSON và render thành bảng dữ liệu tương tác.
   - Hỗ trợ sắp xếp cột, thu gọn/mở rộng từng bản ghi, lọc tìm kiếm tức thì và phóng to toàn màn hình.
3. **Trình Chạy Live HTML (Live HTML Runner):**
   - Chạy thử nghiệm mã HTML, CSS và JavaScript thời gian thực.
   - Hỗ trợ 2 chế độ biên tập: Mã gộp chung (`Single Code`) hoặc tách 3 tab độc lập (`HTML / CSS / JS`).
   - Sandbox an toàn: Render mã vào thẻ `<iframe sandbox="allow-scripts allow-modals">` ngăn chặn mã độc can thiệp vào trang web chính.
   - Giả lập Responsive đa thiết bị: **Desktop (100%)**, **Tablet (768px)**, **Mobile (375px)**.

---

### 5.3. Phân Hệ Bảng Tính Excel (Excel Suite)
**Đường dẫn chính:** `/excel-suite`  
**Files:** `ExcelSuite.tsx`, `MergeTable.tsx`, `DirectoryAggregator.tsx`, `ExcelSplitByColumn.tsx`, `src/utils/xlsxHelper.ts`

#### A. `xlsxHelper.ts` — Lớp Đệm Module Nhập Khẩu SheetJS
Do thư viện `xlsx` (SheetJS) có sự không đồng nhất giữa định dạng CommonJS và ESM trong môi trường Vite/Rollup, file `xlsxHelper.ts` chuẩn hóa việc export đối tượng `XLSX` an toàn và đồng nhất:
```typescript
import * as XLSXModule from "xlsx";
export const XLSX = XLSXModule.utils ? XLSXModule : ((XLSXModule as any).default || XLSXModule);
export default XLSX;
```
*Tất cả component trong dự án bắt buộc phải import XLSX thông qua file helper này để tránh lỗi runtime production.*

#### B. `MergeTable.tsx` & `DirectoryAggregator.tsx` — Gộp Bảng Dữ Liệu Nâng Cao
Hỗ trợ 2 chế độ gộp bảng dữ liệu mạnh mẽ:

1. **Common Merge (Gộp Dọc Cây Thư Mục Hoặc Danh Sách Tệp):**
   - Hỗ trợ chọn nhiều file hoặc quét đệ quy toàn bộ thư mục bằng thuộc tính `webkitdirectory` qua `DirectoryAggregator.tsx`.
   - **Xem Trước & Tùy Chỉnh Dòng Header Từng Tệp (File Preview Modal):**
     * Người dùng có thể nhấp vào bất kỳ tệp nào trong hàng đợi để mở modal xem trước bảng dữ liệu thô.
     * Cho phép chỉ định chính xác dòng nào là **Dòng Header** (Dòng 1, Dòng 2, Dòng 3...). Có thể bấm trực tiếp vào dòng mong muốn trong bảng xem trước.
     * Đánh dấu trực quan 3 vùng màu sắc:
       - **Màu Vàng / Amber:** Phần đầu tệp (Preamble) — Từ Dòng 1 đến trước dòng Header (thông tin tiêu đề báo cáo, đơn vị, ngày lập...).
       - **Màu Xanh Lá / Emerald:** ★ Hàng Header (Tiêu Đề Cột) — Dòng chứa tên cột dữ liệu.
       - **Màu Xanh Dương / Sky:** Dữ liệu ghép (Data Rows) — Các dòng dữ liệu thực tế từ sau Header đến hết tệp.
   - **Chỉ Định File Mẫu Đầu Trang (Master Template File):**
     * Cho phép chọn 1 file làm mẫu chuẩn.
     * Toàn bộ phần Preamble (tiêu đề, ghi chú đầu trang) của file mẫu này được giữ nguyên và đặt ở đầu file kết quả xuất ra.
     * Bảng xem trước dữ liệu hợp nhất (Merged Grid Preview) hiển thị banner xem trước các dòng Preamble mẫu một cách trực quan.
   - **Tối Ưu & Xuất Dữ Liệu:**
     * Cột của file mẫu được ưu tiên sắp xếp trước, các cột mới từ file khác được ghép nối tiếp phía sau.
     * Hỗ trợ khử trùng lặp nội bộ tệp (`executeInFileDeduplication`), tự sinh cột Username độc nhất, lọc bỏ dòng trống theo cột, và chỉnh sửa ô trực tiếp (Inline Editing).
     * Khi xuất file (`.xlsx` hoặc `.csv`), hệ thống dùng `aoa_to_sheet` ghi tuần tự: Phần đầu tệp mẫu $\rightarrow$ Dòng Header $\rightarrow$ Dữ liệu gộp.

2. **Key-based Merge (Ghép Cột Ngang Theo Khóa Chung - Relational Join):**
   - Hỗ trợ liên kết từ 2 bảng tính trở lên dựa trên cột khóa chung (Email, ID, Mã Nhân Viên, SĐT, Username...).
   - **Tùy Biến Header Từng Tệp:** Cho phép bấm vào từng tệp trong danh sách cấu hình khóa để xem trước và đổi dòng Header; tự động tính toán lại danh sách cột và ánh xạ khóa ngay khi đổi Header.
   - **Chọn File Mẫu:** Ưu tiên thứ tự cột của file mẫu và bảo tồn phần Preamble khi xuất dữ liệu.
   - Hỗ trợ 2 chiến lược liên kết: **Inner Join** (chỉ lấy bản ghi xuất hiện ở tất cả bảng) hoặc **Full Outer Join** (giữ lại toàn bộ dữ liệu của tất cả bảng).

#### C. `ExcelSplitByColumn.tsx` — Tách File Theo Cột Duy Nhất (Group & Split)
Tính năng chuyên dụng giải quyết bài toán phân chia bảng tính tổng hợp lớn thành nhiều file nhỏ:
* Tải lên tệp Excel/CSV lớn (hỗ trợ dataset mẫu tích hợp để thử nghiệm nhanh).
* Tự động quét và hiển thị toàn bộ danh sách cột dữ liệu.
* Người dùng chọn 1 cột làm tiêu chí gom nhóm (ví dụ: "Phòng ban", "Tỉnh thành", "Chi nhánh", "Trạng thái").
* Hệ thống tự động phân loại, lọc ra danh sách các giá trị duy nhất trong cột đó và gom nhóm các bản ghi tương ứng.
* Bảng điều khiển cho phép xem trước danh sách các nhóm, số lượng bản ghi của từng nhóm và nội dung chi tiết của nhóm đang chọn.
* Tùy chọn cấu hình xuất dữ liệu:
  - Tự động gắn số lượng bản ghi vào tên file con (ví dụ: `Kinh_doanh_42_records.xlsx`).
  - Lựa chọn định dạng xuất `.xlsx` hoặc `.csv`.
  - Tùy chỉnh tên tệp ZIP lưu trữ.
  - Tạo và tải về file ZIP chứa tất cả các tệp con đã phân tách chỉ trong vài giây.

---

### 5.4. Phân Hệ Quét Tài Liệu & Xử Lý PDF (Document Scanner & PDF Suite)
**Đường dẫn chính:** `/pdf-suite`  
**Files:** `DocScannerPdf.tsx`, `PdfMerge.tsx`, `PdfSplit.tsx`, `PdfEdit.tsx`, `src/utils/perspectiveWarp.ts`, `src/utils/unicodeFont.ts`

#### A. `perspectiveWarp.ts` — Thuật Toán Xử Lý Ảnh Chuyên Nghiệp
Chứa 2 thuật toán cốt lõi xử lý ảnh tài liệu:
1. **Thuật Toán Nắn Góc Phối Cảnh 4 Điểm (Homography Transformation):**
   - `calculateDestinationDimensions(points)`: Tính chiều rộng và chiều cao tối ưu của ảnh phẳng đầu ra dựa trên khoảng cách Euclidean giữa 4 góc `[TopLeft, TopRight, BottomRight, BottomLeft]`.
   - `solveSquareToQuad(points)`: Giải hệ phương trình ma trận ánh xạ tọa độ 2D từ hình vuông đơn vị sang tứ giác tự do.
   - `warpPerspective(sourceCanvas, points)`: Ánh xạ ngược (Reverse Mapping) từ từng pixel của ảnh đích về ảnh nguồn và áp dụng kỹ thuật **Nội suy song tuyến tính (Bilinear Interpolation)** cho cả 3 kênh màu RGB. Giúp ảnh sau khi nắn phẳng cực kỳ sắc nét, không bị răng cưa hay nhòe cạnh.
2. **Bộ Lọc Xử Lý Ảnh Tài Liệu (`applyImageFilters`):**
   - **Magic Color (CamScanner Mode):** Tự động phát hiện và chuyển nền xám, bóng mờ mặt bàn thành màu trắng tinh khiết (`gray > threshold ? 255 : gray * 0.75`), đồng thời làm đậm các nét mực chữ viết.
   - **Grayscale:** Chuyển đổi màu sắc sang thang độ xám chuẩn quang học ($0.299R + 0.587G + 0.114B$).
   - **B/W Threshold:** Nhị phân hóa đen trắng tuyệt đối (Black/White 1-bit) tối ưu cho tài liệu scan văn bản.
   - Tinh chỉnh Độ sáng (`brightness`) và Độ tương phản (`contrastFactor`).

#### B. `DocScannerPdf.tsx` — Quét Tài Liệu & Tạo PDF Từ Ảnh
* Kéo thả 4 điểm góc linh hoạt với **Kính Lúp Phóng To Pixel (Magnifier)** hiển thị chi tiết vùng ảnh dưới con trỏ chuột, hỗ trợ căn góc giấy chính xác từng pixel.
* Cấu hình khổ giấy: A3, A4, A5, Letter, Legal với hướng đứng (Portrait) hoặc ngang (Landscape).
* Cấu hình khoảng cách lề giấy (`marginMm`) và chế độ tự động vừa vặn (Auto-fit).
* **Đánh số trang tự động vào chân trang PDF:** Tùy biến vị trí (Trái, Giữa, Phải), mẫu văn bản đánh số và trang bắt đầu.

#### C. `PdfMerge.tsx` — Ghép Tệp PDF
* Sử dụng `pdfjs-dist` render thumbnail từng trang của nhiều file PDF lên giao diện.
* Hỗ trợ kéo thả (Drag & Drop) trực quan để sắp xếp lại thứ tự trang.
* Xoay góc trang độc lập ($90^\circ, 180^\circ, 270^\circ$) hoặc xóa các trang không mong muốn.
* Hợp nhất nhị phân tốc độ cao bằng `pdf-lib` và tải về tức thì.

#### D. `PdfSplit.tsx` — Chia Nhỏ Tệp PDF
* **Chia Theo Dải Trang (Range Split):** Phân tích cú pháp dải trang thông minh (ví dụ: `1-3, 5, 8-10`), kiểm tra tính hợp lệ so với tổng số trang của file gốc, trích xuất thành các file con và đóng gói ZIP.
* **Chia Lẻ Từng Trang (Single Page Split):** Cắt mỗi trang của file gốc thành 1 file PDF độc lập.

#### E. `PdfEdit.tsx` — Chỉnh Sửa Trang PDF Chuyên Sâu
* Cho phép nạp thêm các trang mới từ file ảnh hoặc file PDF khác vào tài liệu hiện có.
* Cắt nắn góc 4 điểm và áp dụng bộ lọc làm nét trực tiếp trên bất kỳ trang nào của file PDF gốc.

---

### 5.5. Phân Hệ Quản Lý Tệp & Metadata (File Manager Suite)
**Đường dẫn chính:** `/file-manager`  
**Files:** `FileManagerSuite.tsx`, `FileRenamer.tsx`, `FileMetadataEditor.tsx`, `FileConverter.tsx`, `MediaDownloader.tsx`

#### A. `FileRenamer.tsx` — Đổi Tên Tệp Tin Hàng Loạt
* Tải lên đồng thời hàng trăm tệp tin thuộc bất kỳ định dạng nào.
* Quy tắc đổi tên đa dạng:
  - Thêm tiền tố (`prefix`), hậu tố (`suffix`).
  - Tìm kiếm và thay thế chuỗi ký tự trong tên gốc.
  - Đánh số thứ tự tự tăng: Hỗ trợ pattern `[name]_[x]`, tùy chỉnh số bắt đầu, bước nhảy và độ dài đệm số không (`zeroPadding`: `01`, `001`).
  - Biến đổi kiểu chữ: Toàn bộ chữ hoa, chữ thường, hoặc Title Case cho cả tên file và phần mở rộng.
* Đóng gói toàn bộ các file đã đổi tên vào một file ZIP bảo toàn nguyên vẹn nội dung gốc.

#### B. `FileMetadataEditor.tsx` — Sửa Lịch Sử & Timestamp File
* Cho phép người dùng chỉnh sửa ngày tạo (`createdDate`) và ngày sửa đổi cuối cùng (`modifiedDate`) của từng tệp tin hoặc áp dụng hàng loạt.
* Khi xuất file qua `JSZip`, hệ thống gán chính xác giá trị thời gian vào thuộc tính `date` của từng entry trong ZIP. Khi người dùng giải nén trên Windows/macOS/Linux, các tệp tin sẽ giữ nguyên chính xác ngày giờ đã chỉnh sửa.

#### C. `FileConverter.tsx` — Chuyển Định Dạng Đa Năng (Universal Converter)
Chuyển đổi hoàn toàn Client-Side giữa các định dạng phổ biến:
* **Tài liệu (Document):** PDF $\leftrightarrow$ DOCX, TXT, Markdown, EPUB (kết hợp `pdfjs-dist`, `mammoth`, `marked`, `jspdf`).
* **Hình ảnh (Image):** Chuyển đổi qua lại giữa PNG, JPG, JPEG, WEBP, BMP, HEIC (sử dụng HTML5 Canvas `toBlob`).
* **Âm thanh & Video (Audio/Video):** MP3 $\leftrightarrow$ WAV, AAC, MP4, WEBM.
* **Bảng tính & Dữ liệu (Spreadsheet/Data):** XLSX $\leftrightarrow$ CSV $\leftrightarrow$ JSON $\leftrightarrow$ XML.

#### D. `MediaDownloader.tsx` — Tải Media Đa Nền Tảng
* Hỗ trợ trích xuất liên kết tải video/audio không logo từ các nền tảng mạng xã hội (Facebook, TikTok, v.v.).
* Tùy chọn chất lượng video (`1080`, `720`, `480`, `max`) hoặc chỉ tải âm thanh (`audioOnly`).
* Tích hợp tính năng bóc tách link từ mã nguồn trang HTML (HTML Inspector).

---

### 5.6. Máy Chủ Backend & API Handlers
**Files:** `server.ts`, `api/download.ts`

#### A. `server.ts`
Máy chủ Express chạy trên cổng `3000` (hoặc `PORT` môi trường), tích hợp hai chế độ vận hành:
1. **Development (`process.env.NODE_ENV !== "production"`):** Khởi tạo Vite Dev Server ở chế độ middleware mode (`createServer({ server: { middlewareMode: true }, appType: "spa" })`). Express chuyển toàn bộ request tĩnh và HMR cho Vite xử lý.
2. **Production:** Phục vụ trực tiếp thư mục tĩnh `dist/` và fallback mọi route chưa định nghĩa về `dist/index.html` để hỗ trợ SPA Routing trơn tru.

#### B. `api/download.ts`
Endpoint hỗ trợ phân tích và trích xuất link tải trực tiếp cho các phương tiện truyền thông mạng xã hội khi người dùng sử dụng tính năng Media Downloader.

---

## 6. Hệ Thống Tiện Ích & Thuật Toán Cốt Lõi (Core Algorithms & Helpers)

| File Tiện Ích | Thuật Toán / Chức Năng Chính | Đầu Vào / Đầu Ra |
| :--- | :--- | :--- |
| **`src/utils/diff.ts`** | Quy hoạch động LCS (Longest Common Subsequence) tìm khác biệt chuỗi ký tự, từ ngữ và dòng. | Inputs: `orig: string`, `mod: string` $\rightarrow$ Output: `LineDiff[]`, `DiffToken[]` |
| **`src/utils/perspectiveWarp.ts`** | Ma trận chuyển đổi phối cảnh 4 góc (Homography), Bilinear Interpolation, bộ lọc CamScanner Magic Color. | Inputs: `sourceCanvas`, `points: [TL, TR, BR, BL]` $\rightarrow$ Output: `HTMLCanvasElement` |
| **`src/utils/sessionHelper.ts`** | Dual-tier Memory Cache (`window` object) + Sanitized `sessionStorage` chống tràn bộ nhớ 5MB. | Inputs: `key: string`, `data: any` $\rightarrow$ Lưu trữ & phục hồi an toàn |
| **`src/utils/navigation.ts`** | Hệ thống định tuyến Clean URL phân cấp, `LEGACY_HASH_MAP` tương thích ngược, quản trị Menu Data. | Inputs: `pathString: string` $\rightarrow$ Output: Phân tích Route & Redirect info |
| **`src/utils/formatters.ts`** | Format, Minify mã JSON, HTML, CSS, JavaScript; chuyển đổi 2 chiều CSV $\leftrightarrow$ JSON. | Inputs: Chuỗi mã thô $\rightarrow$ Output: Chuỗi mã đã format / Array JSON |
| **`src/utils/xlsxHelper.ts`** | Wrapper chống lỗi module loading ESM của SheetJS trên mọi môi trường build. | Xuất ra thực thể `XLSX` an toàn và đồng nhất. |
| **`src/utils/i18n.tsx`** | Context Provider đa ngôn ngữ song ngữ Việt - Anh, hỗ trợ key lồng nhau. | `t(path)` $\rightarrow$ Chuỗi dịch thuật tương ứng |
| **`src/utils/unicodeFont.ts`** | Tích hợp font chữ hỗ trợ dấu tiếng Việt đầy đủ cho thư viện `jsPDF`. | Cấu hình Document instance của jsPDF |

---

## 7. Bảng Tra Cứu Tuyến Đường URL (Route Reference Table)

Hệ thống hỗ trợ truy cập trực tiếp qua các URL phân cấp chuẩn sau:

| Phân Hệ Chính (`mainSlug`) | Đường Dẫn Con (`subSlug`) | Tên Tính Năng (Tiếng Việt / English) | Component Đảm Nhận |
| :--- | :--- | :--- | :--- |
| `/text-suite` | `case-converter` | Chuyển Đổi Kiểu Chữ / Case Converter | `TextUtilities.tsx` |
| `/text-suite` | `word-counter-duplicate-filter` | Lọc Dòng Trùng Lặp & Đếm Từ / Duplicate Filter | `TextUtilities.tsx` |
| `/text-suite` | `string-cutter` | Cắt & Thay Thế Chuỗi / String Cutter | `TextUtilities.tsx` |
| `/text-suite` | `diff-checker` | So Sánh Văn Bản & Mã / Diff Checker | `CompareMerge.tsx` |
| `/text-suite` | `column-joiner` | Ghép Cột Văn Bản / Column Joiner | `CompareMerge.tsx` |
| `/text-suite` | `auto-increasement-generator` | Tạo Dãy Số Tự Tăng / Auto Inc Generator | `CompareMerge.tsx` |
| `/web-data-html` | `format-json-csv` | Định Dạng JSON & CSV / Format JSON & CSV | `DataConverterHtml.tsx` |
| `/web-data-html` | `json-grid-viewer` | Xem Lưới JSON / JSON Grid Viewer | `DataConverterHtml.tsx` |
| `/web-data-html` | `live-html-runner` | Trình Chạy Live HTML / Live HTML Runner | `DataConverterHtml.tsx` |
| `/excel-suite` | `merge-table` | Gộp Bảng Dữ Liệu / Merge Table (Common & Key) | `MergeTable.tsx` |
| `/excel-suite` | `split-by-column` | Tách File Theo Cột / Split by Column | `ExcelSplitByColumn.tsx` |
| `/pdf-suite` | `create-pdf-from-images` | Chuyển Ảnh Sang PDF / Create PDF from Images | `DocScannerPdf.tsx` |
| `/pdf-suite` | `merge-pdf` | Ghép File PDF / Merge PDF | `PdfMerge.tsx` |
| `/pdf-suite` | `split-pdf` | Chia Nhỏ PDF / Split PDF | `PdfSplit.tsx` |
| `/pdf-suite` | `edit-pdf` | Chỉnh Sửa PDF / Edit PDF | `PdfEdit.tsx` |
| `/file-manager` | `batch-file-renamer` | Đổi Tên Hàng Loạt / Batch File Renamer | `FileRenamer.tsx` |
| `/file-manager` | `metadata-timestamp-editor` | Sửa Lịch Sử File / Metadata Timestamp Editor | `FileMetadataEditor.tsx` |
| `/file-manager` | `universal-file-converter` | Chuyển Định Dạng Đa Năng / Universal Converter | `FileConverter.tsx` |

*(Toàn bộ các URL Hash cũ như `#xu-ly-van-ban`, `#tach-va-kiem-tra-loi`, `#ghep-chia-pdf` đều tự động chuyển hướng về URL chuẩn tương ứng).*

---

## 8. Hướng Dẫn Dành Cho AI Coder & Kỹ Sư Phát Triển (Onboarding Guide)

Nếu bạn là một AI Coder hoặc một Lập trình viên mới tiếp nhận dự án này, **hãy ghi nhớ 5 nguyên tắc vàng kiến trúc sau để không gây lỗi hệ thống**:

### ⚠️ Nguyên Tắc 1: Tuyệt Đối Không Lưu Trực Tiếp Dữ Liệu Lớn Vào Storage
* **Sai:** `localStorage.setItem("pdf_data", JSON.stringify(largeCanvasOrPdfBytes))` $\rightarrow$ **Gây lỗi sập ứng dụng `QuotaExceededError` ngay lập tức!**
* **Đúng:** Sử dụng các wrapper trong `src/utils/sessionHelper.ts` (ví dụ `pdfSessionStore.setMerge(...)` hoặc `saveSessionData(...)`).

### ⚠️ Nguyên Tắc 2: Luôn Import SheetJS Qua `xlsxHelper`
* **Sai:** `import * as XLSX from "xlsx";` hoặc `import XLSX from "xlsx";` $\rightarrow$ **Gây lỗi runtime `"default is not exported"` khi build production!**
* **Đúng:** `import { XLSX } from "../utils/xlsxHelper";`

### ⚠️ Nguyên Tắc 3: Quy Trình Chuẩn Khi Thêm Tính Năng Hoặc Module Mới
Khi muốn thêm một tính năng mới (ví dụ `AudioEditor`), bạn thực hiện theo đúng 5 bước sau:
1. **Khai báo Type:** Thêm interface trạng thái vào `src/types.ts` và bổ sung định danh vào enum `ActiveModule` nếu là phân hệ lớn.
2. **Khai báo Menu & Route:** Mở `src/utils/navigation.ts`, thêm `SubMenuItem` vào cụm menu tương ứng trong `MAIN_MENU_ITEMS`.
3. **Thêm Khóa Dịch Thuật:** Mở `src/utils/i18n.tsx`, thêm nội dung song ngữ vào **CẢ HAI** nhánh `vi` và `en`.
4. **Tạo Component:** Tạo component mới trong `src/components/`, sử dụng hook `useI18n()` để lấy chuỗi dịch và icon từ `lucide-react`.
5. **Gắn Component vào Cây App:** Cập nhật file Suite cha (ví dụ `ExcelSuite.tsx`, `FileManagerSuite.tsx` hoặc `App.tsx`) để hiển thị component khi `subSlug` khớp với đường dẫn URL.

### ⚠️ Nguyên Tắc 4: Bảo Trì Hệ Thống TypeScript Chặt Chẽ
* Dự án chạy TypeScript ở chế độ Strict. Không tùy tiện xóa hoặc thay đổi kiểu dữ liệu trong `src/types.ts` mà không kiểm tra tất cả các component đang import nó.
* Sau khi sửa bất kỳ dòng code nào, **bắt buộc chạy `npm run lint` (`tsc --noEmit`)** để chắc chắn 100% không còn lỗi kiểu dữ liệu.

---

## 9. Quy Chuẩn Kiểm Thử, Build & Khởi Chạy

### 9.1. Cài Đặt Môi Trường
Yêu cầu Node.js phiên bản $\ge 18$ (khuyến nghị Node 20+ hoặc 22+):
```bash
# 1. Di chuyển vào thư mục dự án
cd AIO-Tool

# 2. Cài đặt các gói phụ thuộc
npm install
```

### 9.2. Khởi Chạy Môi Trường Phát Triển (Development)
```bash
npm run dev
```
Ứng dụng sẽ khởi động tại: `http://localhost:3000` (hoặc `http://0.0.0.0:3000`). Mọi thay đổi trong mã nguồn sẽ tự động phản ánh tức thì qua Hot Module Replacement (HMR).

### 9.3. Kiểm Tra Toàn Vẹn Mã Nguồn (Type Checking)
Trước khi tạo Git commit hoặc chuyển giao mã, bắt buộc phải chạy lệnh kiểm tra kiểu tĩnh:
```bash
npm run lint
```
*Kết quả phải hoàn thành với mã thoát 0 (Zero errors).*

### 9.4. Đóng Gói Sản Phẩm (Production Build)
```bash
npm run build
```
Lệnh này sẽ thực hiện song song 2 tác vụ:
1. `vite build`: Biên dịch và tối ưu mã nguồn giao diện vào thư mục `dist/`.
2. `esbuild server.ts ...`: Đóng gói máy chủ Node vào `dist/server.cjs`.

### 9.5. Khởi Chạy Bản Build Production
```bash
npm start
```
Máy chủ Express sẽ phục vụ toàn bộ ứng dụng từ bundle `dist/` với hiệu năng tối đa.

---

*Tài liệu này được biên soạn độc quyền cho hệ thống **AIO Tool v2.9.0**, cung cấp bức tranh toàn cảnh chính xác từng chi tiết kỹ thuật cho các kỹ sư và AI Coder tiếp tục bảo trì, debug và phát triển mở rộng hệ thống.*
