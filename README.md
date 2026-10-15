# AIO Tool — Hệ Thống Công Cụ Web Đa Năng (All-In-One Developer & Office Suite)

> **Phiên bản hiện tại:** `v2.9.0`  
> **Kiến trúc cốt lõi:** Single Page Application (SPA) / React 19 + TypeScript 5.8 + Vite 6 + Tailwind CSS 4 + Express Server  
> **Mô hình hoạt động:** **100% Client-Side Sandbox & Offline-First** (Tất cả logic xử lý Excel, PDF, hình ảnh, văn bản, nén ZIP đều thực thi trực tiếp trên Sandbox RAM của trình duyệt người dùng; tuyệt đối không truyền tải hay lưu trữ dữ liệu người dùng lên máy chủ).

---

## 📑 MỤC LỤC TOÀN DIỆN
1. [Tổng Quan Kiến Trúc & Triết Lý Thiết Kế](#1-tổng-quan-kiến-trúc--triết-lý-thiết-kế)
2. [Chi Tiết Tech Stack & Thư Viện Phụ Thuộc](#2-chi-tiết-tech-stack--thư-viện-phụ-thuộc)
3. [Sơ Đồ Thư Mục & Danh Mục Toàn Bộ Tệp Tin (File Catalog)](#3-sơ-đồ-thư-mục--danh-mục-toàn-bộ-tệp-tin-file-catalog)
4. [Kiến Trúc Luồng Dữ Liệu & Quản Trị Trạng Thái (Data Flow & State)](#4-kiến-trúc-luồng-dữ-liệu--quản-trị-trạng-thái-data-flow--state)
5. [Phân Tích Chi Tiết Từng Module, Từng File & Hàm Xử Lý (Deep Dive)](#5-phân-tích-chi-tiết-từng-module-từng-file--hàm-xử-lý-deep-dive)
   - [5.1. Module Text & Compare Suite (Văn Bản & So Sánh)](#51-module-text--compare-suite-văn-bản--so-sánh)
   - [5.2. Module Web Data & Live HTML Runner (Dữ Liệu & Sandbox HTML)](#52-module-web-data--live-html-runner-dữ-liệu--sandbox-html)
   - [5.3. Module Excel Suite (Bộ Công Cụ Bảng Tính)](#53-module-excel-suite-bộ-công-cụ-bảng-tính)
   - [5.4. Module Document Scanner & PDF Suite (Quét Ảnh & Xử Lý PDF)](#54-module-document-scanner--pdf-suite-quét-ảnh--xử-lý-pdf)
   - [5.5. Module File Manager Suite (Quản Lý Tệp & Metadata)](#55-module-file-manager-suite-quản-lý-tệp--metadata)
   - [5.6. Backend Server & API Handlers](#56-backend-server--api-handlers)
6. [Hệ Thống Tiện Ích & Thuật Toán Cốt Lõi (Core Algorithms & Helpers)](#6-hệ-thống-tiện-ích--thuật-toán-cốt-lõi-core-algorithms--helpers)
7. [Hướng Dẫn Dành Cho AI Coder & Kỹ Sư Phát Triển (Onboarding Guide)](#7-hướng-dẫn-dành-cho-ai-coder--kỹ-sư-phát-triển-onboarding-guide)
8. [Quy Chuẩn Kiểm Thử, Build & Khởi Chạy](#8-quy-chuẩn-kiểm-thử-build--khởi-chạy)

---

## 1. Tổng Quan Kiến Trúc & Triết Lý Thiết Kế

### 1.1. Mục Tiêu Dự Án
AIO Tool là một bộ công cụ web tổng hợp ("Thụy Sĩ đa năng" cho lập trình viên và khối văn phòng), tích hợp hơn 18 tính năng chuyên sâu vào một giao diện web duy nhất: từ thao tác chuỗi/văn bản, so sánh diff mã nguồn, làm đẹp/chuyển đổi JSON-CSV-HTML, xử lý bảng tính Excel quy mô lớn, quét tài liệu nắn phẳng 4 góc và xuất PDF nét cao, đến quản lý và chỉnh sửa metadata timestamp của tệp tin.

### 1.2. Triết Lý Thiết Kế 100% Client-Side Sandbox
* **Zero Data Retention:** Không có bất kỳ database hay cloud storage nào lưu trữ tài liệu của người dùng.
* **In-Browser Processing:** Các tác vụ nặng như chuyển đổi tài liệu, tách file Excel 50.000 dòng, giải mã PDF hàng trăm trang, nén ZIP, lọc màu CamScanner... đều tận dụng tối đa CPU của máy trạm thông qua Web APIs: HTML5 Canvas, Web Workers, TypedArrays (`Uint8Array`, `ArrayBuffer`), Blob và FileReader.
* **Bảo toàn tính riêng tư:** Tài liệu mật, danh sách nhân sự, tài khoản doanh nghiệp, hóa đơn thuế xử lý an toàn tuyệt đối ngay cả khi ngắt kết nối Internet.

---

## 2. Chi Tiết Tech Stack & Thư Viện Phụ Thuộc

Dự án sử dụng bộ công nghệ hiện đại nhất (Modern Web Ecosystem) được định nghĩa trong `package.json`:

| Thư Viện / Gói | Phiên Bản | Mục Đích & Vai Trò Trong Dự Án |
| :--- | :--- | :--- |
| **`react`** / **`react-dom`** | `^19.0.1` | Core UI library phiên bản mới nhất, quản lý trạng thái phản ứng và cây component. |
| **`vite`** | `^6.2.3` | Build tool và dev server cực nhanh, hỗ trợ module HMR và đóng gói tối ưu. |
| **`@tailwindcss/vite`** | `^4.1.14` | Plugin Tailwind CSS v4 trực tiếp cho Vite (kiến trúc Engine mới không cần `postcss.config`). |
| **`tailwindcss`** | `^4.1.14` | Utility-first CSS framework định hình toàn bộ giao diện Dark/Light mode. |
| **`typescript`** | `~5.8.2` | Ngôn ngữ tĩnh bảo đảm an toàn kiểu dữ liệu (Strict type checking) cho toàn bộ hệ thống. |
| **`express`** | `^4.21.2` | Web server Node.js chạy ở `server.ts`, tích hợp Vite Middleware ở dev và Static server ở prod. |
| **`tsx`** | `^4.21.0` | Bộ thực thi TypeScript trực tiếp cho Node.js runtime (chạy lệnh `npm run dev`). |
| **`esbuild`** | `^0.25.0` | Bundler siêu tốc đóng gói file `server.ts` thành `dist/server.cjs` khi triển khai sản phẩm. |
| **`xlsx` (SheetJS)** | `^0.18.5` | Đọc, phân tích, trích xuất và tạo file Excel (.xlsx, .xls) và CSV trực tiếp trên RAM. |
| **`jszip`** | `^3.10.1` | Nén và đóng gói nhiều tệp tin thành file ZIP (tách Excel, tách PDF, đổi tên hàng loạt). |
| **`jspdf`** | `^4.2.1` | Tạo file PDF trực tiếp từ dữ liệu ảnh hoặc mã HTML canvas, hỗ trợ cấu hình khổ giấy và lề. |
| **`pdf-lib`** | `^1.17.1` | Thao tác nhị phân với PDF: gộp nhiều file PDF, tách dải trang, xoay góc trang, sao chép trang. |
| **`pdfjs-dist`** | `^6.1.200` | Parse cấu trúc trang PDF và render từng trang thành HTML5 Canvas làm thumbnail/preview. |
| **`prismjs`** | `^1.30.0` | Thư viện tô màu cú pháp (Syntax highlighting) cho JSON, HTML, CSS, JavaScript. |
| **`motion`** | `^12.23.24` | Tạo animation mượt mà cho các modal, hiệu ứng chuyển trang và danh sách kéo thả. |
| **`lucide-react`** | `^0.546.0` | Hệ thống vector icon SVG chất lượng cao, đồng bộ thị giác cho toàn bộ UI. |
| **`react-toastify`** | `^11.1.0` | Hiển thị thông báo trạng thái nổi (Toast Notification: success, error, info, warning). |
| **`mammoth`** | `^1.12.0` | Trích xuất văn bản từ tệp Word (.docx) chuyển đổi sang HTML/Markdown. |
| **`marked`** | `^18.0.7` | Trình biên dịch Markdown sang HTML siêu tốc. |
| **`tesseract.js`** | `^7.0.0` | Engine OCR (nhận dạng ký tự quang học) chạy trên WebAssembly cho các tác vụ trích xuất chữ. |
| **`html2canvas`** | `^1.4.1` | Chụp và chuyển đổi các phần tử DOM thành HTML5 Canvas để in ấn hoặc xuất ảnh/PDF. |

---

## 3. Sơ Đồ Thư Mục & Danh Mục Toàn Bộ Tệp Tin (File Catalog)

```text
AIO-Tool/
├── api/
│   └── download.ts                  # Backend Serverless/Express endpoint hỗ trợ proxy tải media
├── src/
│   ├── components/                  # Toàn bộ UI Components của hệ thống
│   │   ├── CodeEditor.tsx           # Trình soạn thảo mã 2 lớp (Dual-Layer) tích hợp PrismJS
│   │   ├── CompareMerge.tsx         # So sánh văn bản (Diff LCS), ghép cột, sinh số tự tăng
│   │   ├── DataConverterHtml.tsx    # Chuyển đổi dữ liệu JSON/CSV, JSON Grid Viewer, Live HTML Runner
│   │   ├── DirectoryAggregator.tsx  # Quét đệ quy thư mục, tùy chỉnh dòng header từng file, gộp master
│   │   ├── DocScannerPdf.tsx        # Quét tài liệu phối cảnh 4 góc, bộ lọc CamScanner, xuất PDF
│   │   ├── ExcelSplitByColumn.tsx   # Tách file Excel/CSV theo giá trị cột duy nhất (v2.9.0)
│   │   ├── ExcelSuite.tsx           # Container quản lý điều hướng cho toàn bộ phân hệ Excel
│   │   ├── FileConverter.tsx        # Bộ chuyển đổi định dạng tệp tin đa năng (Doc, Img, Audio, Data)
│   │   ├── FileManagerSuite.tsx     # Container quản lý phân hệ Quản lý tệp tin
│   │   ├── FileMetadataEditor.tsx   # Sửa ngày tạo (created) và ngày sửa (modified) của tệp tin & tải ZIP
│   │   ├── FileRenamer.tsx          # Đổi tên tệp tin hàng loạt với pattern và số tự tăng
│   │   ├── MediaDownloader.tsx      # Giao diện tải video/audio đa nền tảng
│   │   ├── MergeTable.tsx           # Gộp bảng (Common Merge đệ quy & Key-based Merge có tùy biến Header & File Mẫu)
│   │   ├── PdfEdit.tsx              # Chỉnh sửa PDF: chèn trang từ ảnh/PDF khác, nắn góc, lọc màu
│   │   ├── PdfMerge.tsx             # Gộp nhiều file PDF, sắp xếp kéo thả, xoay và xóa trang
│   │   ├── PdfSplit.tsx             # Tách PDF theo dải trang (Range) hoặc tách lẻ từng trang
│   │   ├── ScrollToTop.tsx          # Nút cuộn nhanh lên đầu trang khi màn hình cuộn xuống
│   │   ├── Sidebar.tsx              # Thanh điều hướng Accordion đa tầng & hỗ trợ chế độ thu gọn
│   │   ├── TextAndCompareSuite.tsx  # Container tích hợp các công cụ văn bản và so sánh mã
│   │   └── TextUtilities.tsx        # Biến đổi kiểu chữ, lọc dòng trùng lặp, cắt chuỗi & Regex
│   ├── utils/                       # Hệ thống tiện ích và thuật toán xử lý dữ liệu
│   │   ├── diff.ts                  # Thuật toán LCS so sánh ký tự, từ ngữ và dòng văn bản
│   │   ├── formatters.ts            # Parser & Minifier cho JSON, HTML, CSS, JavaScript, CSV
│   │   ├── i18n.tsx                 # Hệ thống đa ngôn ngữ song ngữ Tiếng Việt - English
│   │   ├── navigation.ts            # Bảng cấu trúc menu, phân tích Route URL & Legacy Hash Map
│   │   ├── perspectiveWarp.ts       # Thuật toán ma trận nắn phối cảnh 4 điểm & bộ lọc CamScanner
│   │   ├── sessionHelper.ts         # Quản trị cache RAM và SessionStorage 2 tầng chống tràn bộ nhớ
│   │   ├── unicodeFont.ts           # Cấu hình font chữ Unicode hỗ trợ tiếng Việt cho jsPDF
│   │   └── xlsxHelper.ts            # Wrapper tương thích tĩnh ESM/CJS an toàn cho thư viện SheetJS
│   ├── App.tsx                      # Component gốc: Quản lý AppState, Theme, Routing & LocalStorage
│   ├── index.css                    # Tailwind CSS v4 styles, custom scrollbar & theme styling
│   ├── main.tsx                     # Điểm nhập (Entrypoint) React 19 mount vào thẻ #root
│   └── types.ts                     # Hệ thống Interfaces, Enums và Types dùng chung toàn dự án
├── index.html                       # HTML Template cho Single Page Application
├── package.json                     # Cấu hình dependencies, metadata và các script npm
├── server.ts                        # Máy chủ phát triển & phân phối sản phẩm (Express + Vite)
├── tsconfig.json                    # Cấu hình trình biên dịch TypeScript (ESNext, React JSX)
├── vercel.json                      # Cấu hình điều hướng SPA khi triển khai trên Vercel
└── vite.config.ts                   # Cấu hình bundler Vite, aliases và plugin Tailwind
```

---

## 4. Kiến Trúc Luồng Dữ Liệu & Quản Trị Trạng Thái (Data Flow & State)

### 4.1. Cấu Trúc Cây Component (Component Hierarchy)
```text
index.html
  └── main.tsx
        └── I18nProvider (src/utils/i18n.tsx)
              └── App.tsx (MainApp)
                    ├── Sidebar.tsx
                    │     └── Accordion Main Menus -> Submenus
                    ├── Main View (Router Container)
                    │     ├── TextAndCompareSuite.tsx
                    │     │     ├── TextUtilities.tsx
                    │     │     └── CompareMerge.tsx
                    │     ├── DataConverterHtml.tsx
                    │     │     ├── CodeEditor.tsx
                    │     │     ├── Visual JSON Grid Viewer
                    │     │     └── Live HTML Runner (Iframe Sandbox)
                    │     ├── ExcelSuite.tsx
                    │     │     ├── MergeTable.tsx (Common Merge & Key-based Relational Join)
                    │     │     │     └── DirectoryAggregator.tsx
                    │     │     └── ExcelSplitByColumn.tsx
                    │     ├── DocScannerPdf.tsx
                    │     ├── PdfMerge.tsx
                    │     ├── PdfSplit.tsx
                    │     ├── PdfEdit.tsx
                    │     ├── FileManagerSuite.tsx
                    │     │     ├── FileRenamer.tsx
                    │     │     ├── FileMetadataEditor.tsx
                    │     │     └── FileConverter.tsx
                    │     └── MediaDownloader.tsx
                    ├── ScrollToTop.tsx
                    └── ToastContainer (react-toastify)
```

### 4.2. Hệ Thống Định Tuyến URL & Navigation (`src/utils/navigation.ts`)
* Dự án sử dụng hệ thống Client-Side URL Routing linh hoạt dạng `/{mainSlug}/{subSlug}` (ví dụ: `/excel-suite/split-by-column`).
* **Hàm `parseRoute(pathString)`**:
  - Tách đường dẫn URL hiện tại thành `mainSlug` và `subSlug`.
  - Hỗ trợ đối chiếu ngược qua bảng **`LEGACY_HASH_MAP`** để các bookmark cũ (dạng `#xu-ly-van-ban`, `#tach-va-kiem-tra-loi`) tự động chuyển hướng chuẩn xác về định dạng URL phân cấp mới mà không làm vỡ phiên làm việc của người dùng.
  - Tự động fallback về tab con đầu tiên nếu người dùng chỉ gõ `/{mainSlug}`.
* **Hàm `navigateTo(path)`**:
  - Gọi `window.history.pushState(null, "", path)`.
  - Kích hoạt sự kiện tùy biến `window.dispatchEvent(new Event("popstate"))` để `App.tsx` bắt được thay đổi và render lại component tương ứng ngay tức thì mà không tải lại toàn trang.

### 4.3. Quản Trị Bộ Nhớ Đa Tầng Chống Tràn Quota (`src/utils/sessionHelper.ts`)
Một vấn đề sống còn trong các ứng dụng xử lý file nhị phân (Canvas, PDF, ArrayBuffer, File) trên trình duyệt là: **`sessionStorage` và `localStorage` chỉ có hạn mức tối đa ~5MB**. Nếu lưu trực tiếp các đối tượng nhị phân lớn vào session storage, trình duyệt sẽ ném lỗi vỡ ứng dụng `QuotaExceededError`.

Hệ thống đã giải quyết triệt để vấn đề này bằng kiến trúc **Hybrid 2-Tier Caching**:
1. **Tier 1 — In-Memory RAM Cache (`window.__session_file_cache`):** Lưu trữ trực tiếp con trỏ tham chiếu đối tượng gốc (HTMLCanvasElement, Uint8Array, File). Tốc độ đọc/ghi là $O(1)$, tức thì và không làm nghẽn main thread.
2. **Tier 2 — Sanitized Session Storage (`sessionStorage`):** Sử dụng hàm đệ quy `sanitizeForSessionStorage(obj)` để tự động quét và loại bỏ các trường nặng (`originalPdfBytes`, `warpedCanvas`, `processedCanvas`, `Uint8Array`) trước khi `JSON.stringify`. Chỉ các trường metadata nhẹ (tên file, kích thước, số trang, cấu hình filter) được lưu xuống `sessionStorage`. Khi người dùng F5 hoặc reload trang, dữ liệu cấu hình vẫn được giữ nguyên.
3. **Bộ API tiện ích `pdfSessionStore`:** Cung cấp các phương thức chuyên biệt cho từng phân hệ PDF:
   - `getMerge()` / `setMerge()` / `clearMerge()`
   - `getSplit()` / `setSplit()` / `clearSplit()`
   - `getEdit()` / `setEdit()` / `clearEdit()`
   - `getScanner()` / `setScanner()` / `clearScanner()`

### 4.4. Hệ Thống Đa Ngôn Ngữ Song Ngữ (`src/utils/i18n.tsx`)
* Cung cấp Context `I18nProvider` bọc toàn bộ ứng dụng.
* Sử dụng hook `const { t, lang, setLang } = useI18n()`.
* Hàm `t(keyPath)` cho phép truy xuất chuỗi song ngữ lồng nhau (dot-notation), ví dụ: `t("common.copy")` hay `t("docScanner.title")`.
* Ngôn ngữ được tự động ghi nhớ vào `localStorage.getItem("preferred_lang")`.

---

## 5. Phân Tích Chi Tiết Từng Module, Từng File & Hàm Xử Lý (Deep Dive)

---

### 5.1. Module Text & Compare Suite (Văn Bản & So Sánh)
**Files:** `TextAndCompareSuite.tsx`, `TextUtilities.tsx`, `CompareMerge.tsx`, `src/utils/diff.ts`

#### A. `TextUtilities.tsx`
Chịu trách nhiệm cho 3 tính năng con:
1. **Chuyển Đổi Kiểu Chữ (Case Converter):**
   - Hàm `handleCaseConvert(format)`: Hỗ trợ biến đổi chữ hoa toàn bộ (`UPPERCASE`), chữ thường (`lowercase`), chữ hoa đầu từ (`Capitalize`), `camelCase`, `kebab-case`, `snake_case`, `PascalCase`, và chuyển đổi sang Tiêu Đề Bài Viết Chuẩn Tiếng Việt.
2. **Lọc Dòng Trùng Lặp & Đếm Từ (Duplicate Filter & Counter):**
   - Hàm `getCounts(text, countSpaces, countEmpty)`: Trả về số lượng ký tự (tùy chọn tính/bỏ qua khoảng trắng), số lượng dòng (tùy chọn bỏ qua dòng rỗng), và số lượng từ ngữ.
   - Hàm `handleFilter(mode)`:
     - `remove`: Loại bỏ toàn bộ các dòng trùng lặp, chỉ giữ lại bản ghi đầu tiên xuất hiện.
     - `frequency`: Thống kê tần suất xuất hiện của từng dòng và sắp xếp theo số lần xuất hiện giảm dần kèm tỷ lệ phần trăm.
     - `uniques`: Lọc ra những dòng chỉ xuất hiện đúng 1 lần duy nhất trong toàn văn bản.
     - `duplicates`: Trích xuất danh sách các dòng bị lặp lại từ 2 lần trở lên.
3. **Cắt & Thay Thế Chuỗi (String Cutter & Regex Replacer):**
   - Hàm `handleSliceText()`: Cắt bớt $N$ ký tự đầu dòng (`start`) hoặc cuối dòng (`end`).
   - Hàm `handleReplace()`: Hỗ trợ tìm kiếm và thay thế chuỗi bằng văn bản thuần túy hoặc Regular Expression với cờ phân biệt hoa thường (`matchCase`).

#### B. `CompareMerge.tsx` & `src/utils/diff.ts`
1. **So Sánh Mã Nguồn & Văn Bản (Diff Checker):**
   - Tích hợp thuật toán quy hoạch động LCS (Longest Common Subsequence) trong `src/utils/diff.ts`.
   - Hàm `diffLines(origText, modText, options)`: Phân tích khác biệt từng dòng, phát hiện các khối dòng được thêm (`added`), xóa (`removed`), giữ nguyên (`equal`) hoặc sửa đổi (`modified`).
   - Hàm `diffWordsOrChars(orig, mod, options)`: Khi một dòng bị sửa đổi (`modified`), hàm này tự động phân tích chi tiết đến từng từ và ký tự để highlight chính xác phần chữ bị thay đổi, giúp người dùng không cần nhìn mỏi mắt so sánh từng chữ.
   - Hỗ trợ 2 chế độ hiển thị: Hợp nhất (`unified`) và Song song 2 cột (`side-by-side`).
2. **Ghép Cột Văn Bản (Column Joiner):**
   - Hàm `handleCombineColumns()`: Ghép hai danh sách cột văn bản độc lập chạy dọc nhau theo ký tự phân cách tùy biến (phẩy, gạch đứng `|`, tab `\t`, dấu cách...).
3. **Tạo Dãy Số Tự Tăng (Auto Increasement Generator):**
   - Hàm `handleAutoInc()`: Sinh danh sách chuỗi dựa trên mẫu quy định (ví dụ: `ID_USER_[x]_HN`), cho phép thiết lập giá trị bắt đầu, bước nhảy và độ dài đệm số không phía trước (`zeroPadding`).

---

### 5.2. Module Web Data & Live HTML Runner (Dữ Liệu & Sandbox HTML)
**Files:** `DataConverterHtml.tsx`, `CodeEditor.tsx`, `src/utils/formatters.ts`

#### A. `CodeEditor.tsx` — Trình Soạn Thảo Cú Pháp Dual-Layer
Để đạt hiệu năng cao và loại bỏ sự cồng kềnh của các editor nặng như Monaco Editor, `CodeEditor.tsx` được thiết kế theo mô hình **Dual-Layer**:
* **Layer 1 (Tương tác):** Thẻ `<textarea>` trong suốt với font chữ monospace đặt ở tầng trên, tiếp nhận toàn bộ tương tác gõ phím, copy, paste, select của người dùng.
* **Layer 2 (Hiển thị tô màu):** Thẻ `<pre><code>` đặt ở tầng dưới với cùng kích thước, font chữ và padding, hiển thị mã nguồn đã được tô màu bằng PrismJS.
* **Hàm `handleScroll()`**: Đồng bộ chính xác tọa độ cuộn `scrollTop` và `scrollLeft` giữa textarea và pre layer, mang lại trải nghiệm gõ code chuyên nghiệp.

#### B. `DataConverterHtml.tsx`
1. **Định Dạng Mã (Format & Minify JSON/HTML/CSS/JS):**
   - Sử dụng các parser viết bằng pure TypeScript trong `formatters.ts`: `beautifyJson`, `minifyJson`, `beautifyHtml`, `minifyHtml`, `beautifyCss`, `minifyCss`, `beautifyJs`, `minifyJs`.
   - Chuyển đổi dữ liệu 2 chiều: `csvToJson` và `jsonToCsv` (xử lý an toàn chuỗi chứa dấu phẩy và dấu ngoặc kép trích dẫn).
2. **Xem Dữ Liệu Dạng Lưới (JSON Grid Viewer):**
   - Chuyển đổi mảng đối tượng JSON bất kỳ thành bảng dữ liệu trực quan tương tác.
   - Hỗ trợ sắp xếp theo cột (`handleSort`), thu gọn/mở rộng từng bản ghi (`toggleCollapseRecord`), lọc tìm kiếm và xem toàn màn hình.
3. **Trình Chạy Live HTML (Live HTML Runner):**
   - Chạy thử nghiệm mã HTML, CSS và JavaScript thời gian thực.
   - Chế độ biên tập linh hoạt: Code gộp 1 file (`Single Code`) hoặc chia 3 tab riêng biệt (`HTML / CSS / JS`).
   - Sandbox an toàn: Render mã vào thẻ `<iframe sandbox="allow-scripts allow-modals">` để ngăn chặn các đoạn mã độc tác động vào môi trường chính của ứng dụng.
   - Hỗ trợ giả lập kích thước hiển thị Responsive: **Desktop (100%)**, **Tablet (768px)**, **Mobile (375px)**.

---

### 5.3. Module Excel Suite (Bộ Công Cụ Bảng Tính)
**Files:** `ExcelSuite.tsx`, `ExcelSplitterValidator.tsx`, `ExcelSplitByColumn.tsx`, `ExcelMergerExtractor.tsx`, `MergeTable.tsx`, `src/utils/xlsxHelper.ts`

#### A. `xlsxHelper.ts` — Lớp Đệm Module Nhập Khẩu SheetJS
Do thư viện `xlsx` (SheetJS) có sự không đồng nhất giữa định dạng CommonJS và ESM trong môi trường Vite/Node, việc import thông thường sẽ ném cảnh báo hoặc lỗi `"default is not exported"`.  
File `xlsxHelper.ts` giải quyết triệt để điều này:
```typescript
import * as XLSXModule from "xlsx";
export const XLSX = XLSXModule.utils ? XLSXModule : ((XLSXModule as any).default || XLSXModule);
export default XLSX;
```
*Tất cả component trong dự án bắt buộc phải import XLSX từ file helper này.*

#### B. `MergeTable.tsx` & `DirectoryAggregator.tsx` — Gộp Bảng Dữ Liệu Đa Năng
Hỗ trợ 2 chế độ gộp dữ liệu nâng cao với cơ chế xem trước từng tệp và tùy biến dòng Header:

1. **Common Merge (Gộp Bảng Dọc Theo Thư Mục / Cây Tệp Tin):**
   - Tích hợp sâu với `DirectoryAggregator.tsx`, cho phép quét cả cây thư mục (`webkitdirectory`) hoặc chọn nhiều tệp Excel, CSV.
   - **Xem Trước & Hiệu Chỉnh Dòng Header Từng Tệp (File Preview Modal):**
     * Khi người dùng nhấp vào tên tệp hoặc biểu tượng con mắt trong danh sách *Hàng Đợi File (Parsed Directory File Queue)*, hệ thống mở cửa sổ xem trước dữ liệu thô dạng lưới của tệp đó.
     * Người dùng có thể chỉ định chính xác dòng nào là **Dòng Header (Tiêu Đề Cột)** (ví dụ: Dòng 1, Dòng 2, Dòng 3...). Có thể bấm chọn trực tiếp vào bất kỳ dòng nào trong bảng xem trước.
     * Hệ thống đánh dấu trực quan bằng màu sắc và huy hiệu rõ ràng:
       - **Màu Vàng / Amber:** Phần đầu / Tiêu đề tệp (Preamble) — Từ Dòng 1 đến trước dòng Header.
       - **Màu Xanh Lá / Emerald:** ★ Hàng Header (Tiêu Đề Cột) — Dòng chứa tên các cột dữ liệu.
       - **Màu Xanh Dương / Sky:** Dữ liệu ghép (Data Rows) — Từ sau dòng Header đến hết bảng.
   - **Chọn File Mẫu Đầu Trang (Master Template File):**
     * Cho phép chỉ định 1 trong các tệp làm **File Mẫu Đầu Trang**.
     * Toàn bộ phần thông tin từ dòng Header trở lên (gồm tiêu đề báo cáo, ghi chú, thông tin doanh nghiệp... ở phần Preamble) của file mẫu này sẽ được bảo toàn nguyên vẹn và đặt ở phần đầu của tệp xuất ra.
     * Bảng xem trước dữ liệu hợp nhất (Merged Grid Preview) hiển thị banner xem trước các dòng Preamble này một cách trung thực nhất.
   - **Đồng Bộ Cột & Ghép Dữ Liệu Thông Minh:**
     * Cột của tệp mẫu được ưu tiên hiển thị trước, các cột bổ sung từ các tệp khác được ghép tiếp nối vào sau.
     * Hỗ trợ loại bỏ trùng lặp nội bộ tệp (`executeInFileDeduplication`), tự sinh cột Username độc nhất, lọc bỏ dòng trống theo cột, và chỉnh sửa ô trực tiếp (Inline Editing).
     * Khi xuất file (`.xlsx` hoặc `.csv`), hệ thống dùng `aoa_to_sheet` ghi tuần tự: Phần đầu tệp mẫu $\rightarrow$ Dòng Header $\rightarrow$ Dữ liệu gộp.

2. **Key-based Merge (Ghép Cột Ngang Theo Khóa Liên Kết - Relational Join):**
   - Cho phép chọn từ 2 bảng tính trở lên và tự động phát hiện cột khóa liên kết (Email, ID, Mã SV, SĐT, Username...).
   - **Tùy Biến Header Từng Tệp Trong Ghép Cột:**
     * Trong phần *2. Cấu Hình Cột Khóa Từng Tệp*, người dùng có thể nhấp vào từng tệp để mở cửa sổ xem trước (Preview) và tùy chỉnh dòng Header tương tự Common Merge.
     * Tự động tính toán lại danh sách cột và ánh xạ khóa ngay khi thay đổi dòng Header.
   - **Chọn File Mẫu Tiêu Đề:**
     * Cho phép chọn 1 tệp làm chuẩn để ưu tiên thứ tự các cột và bảo toàn phần đầu tệp khi xuất.
   - Hỗ trợ chiến lược liên kết **Inner Join** (chỉ giữ bản ghi xuất hiện ở cả 2 bảng) hoặc **Full Outer Join** (giữ toàn bộ dữ liệu của tất cả các bảng).

#### C. `ExcelSplitByColumn.tsx` — Tách File Theo Cột Duy Nhất (v2.9.0)
Cho phép người dùng upload 1 file Excel/CSV tổng hợp lớn (ví dụ danh sách nhân sự toàn quốc), sau đó:
* Lựa chọn 1 cột làm tiêu chí phân nhóm (ví dụ: cột "Phòng ban", "Tỉnh thành", "Chức danh", "Chi nhánh").
* Hệ thống tự động phân loại và gom nhóm dữ liệu theo từng giá trị duy nhất trong cột đó.
* Cho phép xem trước danh sách các nhóm, số lượng bản ghi trong từng nhóm và nội dung chi tiết của nhóm được chọn.
* Tùy chọn cấu hình đóng gói:
  - Kèm số lượng bản ghi vào tên file con (ví dụ: `Kinh_doanh_42_records.xlsx`).
  - Lựa chọn định dạng xuất `.xlsx` hoặc `.csv`.
  - Tùy chỉnh tên tệp ZIP lưu trữ.
  - Tự động tạo file ZIP chứa tất cả các file đã tách chỉ trong vài giây.

---

### 5.4. Module Document Scanner & PDF Suite (Quét Ảnh & Xử Lý PDF)
**Files:** `DocScannerPdf.tsx`, `PdfMerge.tsx`, `PdfSplit.tsx`, `PdfEdit.tsx`, `src/utils/perspectiveWarp.ts`, `src/utils/unicodeFont.ts`

#### A. `src/utils/perspectiveWarp.ts` — Thuật Toán Xử Lý Ảnh Chuyên Nghiệp
Chứa 2 thuật toán cốt lõi làm nên sức mạnh của tính năng Quét Tài Liệu:
1. **Thuật toán nắn góc phối cảnh 4 điểm (Homography Transformation):**
   - `calculateDestinationDimensions(points)`: Tính chiều rộng và chiều cao tối ưu của ảnh đầu ra dựa trên độ dài khoảng cách Euclidean giữa 4 góc `[TopLeft, TopRight, BottomRight, BottomLeft]`.
   - `solveSquareToQuad(points)`: Giải hệ phương trình ma trận ánh xạ tọa độ 2D từ hình vuông đơn vị sang tứ giác tự do bất kỳ.
   - `warpPerspective(sourceCanvas, points)`: Thực hiện ánh xạ ngược (Reverse Mapping) từ từng pixel của ảnh đích về ảnh nguồn và áp dụng kỹ thuật **Nội suy song tuyến tính (Bilinear Interpolation)** cho cả 3 kênh màu RGB. Giúp ảnh sau khi nắn phẳng cực kỳ sắc nét, không bị răng cưa hay vỡ hạt.
2. **Bộ lọc xử lý ảnh CamScanner (`applyImageFilters`):**
   - **Magic Color (CamScanner Mode):** Tự động phát hiện và triệt tiêu màu xám/bóng mờ của mặt bàn hoặc giấy cũ thành màu trắng tinh (`gray > threshold ? 255 : gray * 0.75`), đồng thời tăng cường độ đậm cho nét mực chữ viết.
   - **Grayscale:** Chuyển đổi màu sắc sang thang độ xám chuẩn quang học ($0.299R + 0.587G + 0.114B$).
   - **Threshold:** Nhị phân hóa đen trắng tuyệt đối (Black/White 1-bit).
   - Tinh chỉnh Độ sáng (`brightness`) và Độ tương phản (`contrastFactor`).

#### B. `DocScannerPdf.tsx` — Quét Tài Liệu & Chuyển Ảnh Sang PDF
* Hỗ trợ kéo thả 4 điểm góc với **Kính Lúp Phóng To (Magnifier)** hiển thị chi tiết vùng pixel dưới con trỏ chuột, giúp căn góc giấy chính xác 100%.
* Tùy chọn khổ giấy: A3, A4, A5, Letter, Legal với hướng đứng (Portrait) hoặc ngang (Landscape).
* Thiết lập khoảng cách lề giấy (`marginMm`) và chế độ tự động vừa vặn (Auto-fit).
* **Đánh số trang tự động vào chân trang PDF:** Cấu hình vị trí (Trái, Giữa, Phải), mẫu văn bản đánh số và trang bắt đầu.

#### C. `PdfMerge.tsx` — Ghép File PDF
* Sử dụng `pdfjs-dist` để render từng trang của nhiều file PDF thành thumbnail hình ảnh.
* Hỗ trợ kéo thả (Drag & Drop) để thay đổi thứ tự trang.
* Xoay góc trang độc lập ($90^\circ, 180^\circ, 270^\circ$) hoặc xóa các trang thừa.
* Hợp nhất nhị phân tốc độ cao bằng thư viện `pdf-lib` và tải về tức thì.

#### D. `PdfSplit.tsx` — Chia Nhỏ PDF
* **Chế độ 1: Chia theo dải trang (Range Split):** Phân tích cú pháp dải trang thông minh (ví dụ: `1-3, 5, 8-10`), kiểm tra tính hợp lệ của trang so với tổng số trang của file gốc, tạo các file PDF con tương ứng và đóng gói file ZIP.
* **Chế độ 2: Chia lẻ từng file (Single Page Split):** Cắt từng trang PDF thành một file PDF độc lập.

#### E. `PdfEdit.tsx` — Chỉnh Sửa Trang PDF Chuyên Sâu
* Cho phép nạp thêm các trang mới từ file ảnh hoặc file PDF khác vào tài liệu hiện có.
* Cắt nắn góc 4 điểm và áp dụng bộ lọc làm nét trực tiếp trên bất kỳ trang nào của file PDF gốc.

---

### 5.5. Module File Manager Suite (Quản Lý Tệp & Metadata)
**Files:** `FileManagerSuite.tsx`, `FileRenamer.tsx`, `FileMetadataEditor.tsx`, `DirectoryAggregator.tsx`, `FileConverter.tsx`

#### A. `FileRenamer.tsx` — Đổi Tên Tệp Tin Hàng Loạt
* Hỗ trợ tải lên cùng lúc hàng trăm tệp tin thuộc bất kỳ định dạng nào.
* Quy tắc đổi tên linh hoạt:
  - Thêm tiền tố (`prefix`), hậu tố (`suffix`).
  - Tìm kiếm và thay thế chuỗi ký tự trong tên gốc.
  - Đánh số thứ tự tự tăng: Sử dụng pattern `[name]_[x]`, tùy chỉnh số bắt đầu, bước nhảy và độ dài số không (`zeroPadding`: `01`, `001`).
  - Biến đổi kiểu chữ: Toàn bộ chữ hoa, chữ thường, hoặc Title Case.
* Đóng gói toàn bộ các file đã đổi tên vào một file ZIP bảo toàn nguyên vẹn nội dung gốc.

#### B. `FileMetadataEditor.tsx` — Sửa Lịch Sử & Timestamp File
* Cho phép người dùng chỉnh sửa ngày tạo (`createdDate`) và ngày sửa đổi cuối cùng (`modifiedDate`) của từng tệp tin hoặc hàng loạt.
* Khi xuất file qua `JSZip`, hệ thống gán chính xác giá trị thời gian vào thuộc tính `date` của từng entry trong ZIP. Khi người dùng giải nén trên Windows/macOS/Linux, các tệp tin sẽ giữ nguyên chính xác ngày giờ đã chỉnh sửa.

#### C. `DirectoryAggregator.tsx` — Quét Cây Thư Mục & Hợp Nhất
* Tận dụng thuộc tính `webkitdirectory` của HTML5 input để đọc đệ quy toàn bộ thư mục và cây thư mục con từ máy tính người dùng.
* Lọc file theo phần mở rộng, bỏ dấu tiếng Việt (`removeVietnameseTones`) để tìm kiếm dữ liệu không dấu.
* Gộp dữ liệu của tất cả file tìm thấy vào một bảng Master Data duy nhất, cho phép sửa trực tiếp trên từng ô (Inline editing) và xuất báo cáo.

#### D. `FileConverter.tsx` — Chuyển Đổi Định Dạng Đa Năng
Chuyển đổi hoàn toàn Client-Side giữa các định dạng:
* **Tài liệu:** PDF $\leftrightarrow$ DOCX, TXT, Markdown (kết hợp `pdfjs-dist`, `mammoth`, `marked`, `jspdf`).
* **Hình ảnh:** Chuyển đổi qua lại giữa PNG, JPG, JPEG, WEBP, BMP (sử dụng HTML5 Canvas `toBlob`).
* **Bảng tính & Dữ liệu:** XLSX $\leftrightarrow$ CSV $\leftrightarrow$ JSON $\leftrightarrow$ XML.

---

### 5.6. Backend Server & API Handlers
**Files:** `server.ts`, `api/download.ts`

#### A. `server.ts`
Máy chủ chạy trên cổng `3000` (hoặc `PORT` môi trường), tích hợp hai chế độ vận hành:
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

## 7. Hướng Dẫn Dành Cho AI Coder & Kỹ Sư Phát Triển (Onboarding Guide)

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
5. **Gắn Component vào Cây App:** Cập nhật file Suite cha (ví dụ `FileManagerSuite.tsx` hoặc `App.tsx`) để hiển thị component khi `subSlug` khớp với đường dẫn URL.

### ⚠️ Nguyên Tắc 4: Bảo Trì Hệ Thống Typescript Chặt Chẽ
* Dự án chạy TypeScript ở chế độ Strict. Không tùy tiện xóa hoặc thay đổi kiểu dữ liệu trong `src/types.ts` mà không kiểm tra tất cả các component đang import nó.
* Sau khi sửa bất kỳ dòng code nào, **bắt buộc chạy `npm run lint` (`tsc --noEmit`)** để chắc chắn 100% không còn lỗi kiểu dữ liệu.

---

## 8. Quy Chuẩn Kiểm Thử, Build & Khởi Chạy

### 8.1. Cài Đặt Môi Trường
Yêu cầu Node.js phiên bản $\ge 18$ (khuyến nghị Node 20+ hoặc 24+):
```bash
# 1. Di chuyển vào thư mục dự án
cd AIO-Tool

# 2. Cài đặt các gói phụ thuộc
npm install
```

### 8.2. Khởi Chạy Môi Trường Phát Triển (Development)
```bash
npm run dev
```
Ứng dụng sẽ khởi động tại: `http://localhost:3000` (hoặc `http://0.0.0.0:3000`). Mọi thay đổi trong mã nguồn sẽ tự động phản ánh tức thì qua Hot Module Replacement (HMR).

### 8.3. Kiểm Tra Toàn Vẹn Mã Nguồn (Type Checking)
Trước khi tạo Git commit hoặc chuyển giao mã, bắt buộc phải chạy lệnh kiểm tra kiểu tĩnh:
```bash
npm run lint
```
*Kết quả phải hoàn thành với mã thoát 0 (Zero errors).*

### 8.4. Đóng Gói Sản Phẩm (Production Build)
```bash
npm run build
```
Lệnh này sẽ thực hiện song song 2 tác vụ:
1. `vite build`: Biên dịch và tối ưu mã nguồn giao diện vào thư mục `dist/`.
2. `esbuild server.ts ...`: Đóng gói máy chủ Node vào `dist/server.cjs`.

### 8.5. Khởi Chạy Bản Build Production
```bash
npm start
```
Máy chủ Express sẽ phục vụ toàn bộ ứng dụng từ bundle `dist/` với hiệu năng tối đa.

---

*Tài liệu này được biên soạn độc quyền cho hệ thống **AIO Tool v2.9.0**, cung cấp bức tranh toàn cảnh chính xác từng chi tiết kỹ thuật cho các kỹ sư và AI Coder tiếp tục bảo trì, debug và phát triển mở rộng hệ thống.*
