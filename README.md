# AIO Tool — Hệ Thống Công Cụ Tổng Hợp (AIO Web Tools)

> **Phiên bản hiện tại:** `v2.8.0`  
> **Kiến trúc:** Client-Side Single Page Application (SPA) / React 19 + Vite 6 + TypeScript 5 + Tailwind CSS 4  
> **Chế độ hoạt động:** 100% Offline-First (Xử lý trực tiếp trên Sandbox Browser của người dùng, không truyền dữ liệu lên máy chủ)

---

## 📌 1. Quy Chuẩn Đặt Mã Phiên Bản (Versioning Strategy)

Hệ thống tuân thủ nghiêm ngặt quy chuẩn ngữ nghĩa **Semantic Versioning (`vX.Y.Z`)**:
- **Major (`vX.0.0`)**: Thay đổi cấu trúc toàn bộ hệ thống ở cấp độ lớn (Big Revamp / Complete Architectural Redesign).
- **Minor (`vX.Y.0`)**: Thêm tính năng mới hoặc nâng cấp quy trình cho các mô-đun chính (Feature Addition / Module Revamp).
- **Patch (`vX.Y.Z`)**: Sửa lỗi kỹ thuật, tinh chỉnh giao diện, tối ưu hiệu năng hoặc sửa bug phát sinh.

*Phiên bản `v2.8.0` mang đến đợt cải tiến trải nghiệm người dùng (UX) chuyên sâu cho Phân hệ Excel & Quản lý Tệp tin. Chức năng "Batch File Renamer" được nâng cấp khung tải lên, loại bỏ các nút thừa để thao tác click/drag-and-drop liền mạch. Hai phân hệ "Account Information Extraction" và "Account Creation Validation" được làm mới giao diện với màu nền viền đồng bộ, trang bị nút "Thử dữ liệu mẫu" màu xanh lá nổi bật và đính kèm Badge "★ Exclusively designed for Pythaverse.space" với hiệu ứng nhịp tim (heartbeat) sinh động. Phân hệ "Directory Data Aggregator" được vá lỗi mã hóa tiếng Việt bằng cấu trúc BOM UTF-8 giúp nạp và trích xuất dữ liệu không bị lỗi phông.*

---

## 🛠️ 2. Công Nghệ & Thư Viện Thực Hiện (Tech Stack & Libraries)

### Core Framework & Build System
- **React 19.0.1**: Sử dụng các thành phần chức năng (Functional Components) cùng hệ thống State Hooks mới nhất nhằm tăng tốc độ kết xuất và quản lý trạng thái động.
- **TypeScript 5.x**: Thiết lập kiểu dữ liệu nghiêm ngặt (`Strict Type Safety`) cho tất cả mô-đun giúp tránh các lỗi biên dịch và runtime.
- **Vite 6.2.3 / ESBuild**: Cung cấp môi trường dev siêu nhanh và tối ưu hóa việc đóng gói các thư viện nặng ở client-side thành các bundle tĩnh.
- **Tailwind CSS 4.x**: Khung thiết kế Utility-First hiện đại. Tất cả phong cách giao diện (màu sắc, khoảng cách, tương thích giao diện tối/sáng) được xây dựng nhất quán và phản hồi mượt mà qua các break-point (`sm:`, `md:`, `lg:`, `xl:`).

### Thư Viện Chuyên Dụng Cho Từng Mô-đun (Client-Side Engines)
1. **`xlsx` (SheetJS)**: Trái tim của toàn bộ phân hệ Excel. Thực hiện phân tích cú pháp mã nhị phân tệp tin Excel, đọc/ghi định dạng `.xlsx`, `.xls`, `.csv` và chuyển đổi trực tiếp sang mảng dữ liệu JSON.
2. **`pdfjs-dist` (PDF.js)**: Công cụ kết xuất tệp tin PDF thành tài liệu số hoặc trích xuất văn bản phẳng ngay trên trình duyệt (sử dụng công nghệ Web Worker tách biệt luồng xử lý).
3. **`pdf-lib` & `jspdf`**: Tạo lập, sửa đổi cấu trúc trang tệp PDF, gộp nhiều tệp PDF riêng biệt hoặc nắn chỉnh kích thước khung giấy (A4, Letter) khi xuất kết quả.
4. **`jszip`**: Đóng gói nhanh hàng loạt tệp tin đã xử lý thành một tệp nén duy nhất (`.zip`) để tải về chỉ trong một cú nhấp chuột.
5. **`mammoth`**: Chuyển đổi nhị phân của tài liệu Microsoft Word (`.docx`) sang cấu trúc HTML hoặc định dạng văn bản thô `.txt`.
6. **`tesseract.js`**: Công cụ nhận diện ký tự quang học (OCR) đa ngôn ngữ giúp chuyển ảnh chụp văn bản thành ký tự có thể chỉnh sửa.
7. **`lucide-react`**: Thư viện icon đồng bộ, sắc nét, hỗ trợ tối ưu hiển thị vector trên các độ phân giải màn hình khác nhau.
8. **`react-toastify`**: Giao diện hiển thị thông báo trạng thái thao tác thành công, cảnh báo, hoặc báo lỗi tức thì một cách trực quan.

---

## 🧭 3. Cấu Trúc Điều Hướng & Hệ Thống Định Tuyến (Routing & Navigation System)

Hệ thống điều hướng sử dụng **Custom SPA Routing System** tự phát triển thay vì dùng các thư viện cồng kềnh như React Router. Toàn bộ cơ chế nằm tại tệp `src/utils/navigation.ts`.

### 1. Cơ Chế Đường Dẫn (Slug Structure)
Hệ thống sử dụng các đường dẫn trực quan theo chuẩn phân cấp:
```text
/menu-chinh/menu-con
Ví dụ:
/text-suite/case-converter                 -> Trình chuyển kiểu chữ
/excel-suite/split-and-validate            -> Chia nhỏ & kiểm tra tài khoản Excel
/file-manager/universal-file-converter     -> Chuyển đổi định dạng tệp tin
```

### 2. Luồng Xử Lý Định Tuyến (Routing Flow)
1. **Lắng Nghe Sự Kiện**: Hệ thống lắng nghe sự kiện thay đổi lịch sử trình duyệt thông qua sự kiện `popstate` và hàm định tuyến tùy biến `navigateTo(path)`.
2. **Phân Tích Route (`parseRoute`)**: 
   - Hàm `parseRoute` trong `src/utils/navigation.ts` sẽ đọc URL thô (cả đường dẫn dạng path sạch hoặc các hash cũ dạng `#/`).
   - Tiếp theo, nó đối chiếu qua bảng ánh xạ di sản **`LEGACY_HASH_MAP`** để tự động nâng cấp các đường dẫn định dạng cũ (như `#case-converter` hoặc `#tai-lieu-van-ban`) thành định dạng URL phân cấp mới, kích hoạt cờ `shouldRedirect: true`.
3. **Tự Động Chuyển Hướng (Auto-Redirect)**:
   - Nếu người dùng truy cập trang gốc `/`, hệ thống tự chuyển hướng sang `/text-suite/case-converter`.
   - Nếu truy cập danh mục chính như `/excel-suite`, hệ thống tự động nhận dạng và đưa người dùng đến menu con đầu tiên của danh mục đó (`/excel-suite/split-and-validate`).
4. **Sidebar Accordion**:
   - Sidebar được thiết kế trực quan, tự động mở danh mục chính tương ứng với URL hiện tại.
   - Khi nhấp vào danh mục chính khác, Sidebar sẽ mở ra thông qua hiệu ứng chuyển động mượt mà bằng CSS Grid (`grid-rows-[1fr]` ↔ `grid-rows-[0fr]`) đồng thời kích hoạt chuyển trang tới menu con đầu tiên của danh mục đó.

---

## 📋 4. Sơ Đồ Thiết Kế & Luồng Xử Lý Của Các Phân Hệ (System Modules Blueprint)

Hệ thống bao gồm 6 phân hệ lớn với cách tổ chức mã nguồn độc lập, chặt chẽ:

```
src/
├── components/
│   ├── Sidebar.tsx                   # Menu điều hướng chính & Chuyển đổi giao diện Sáng/Tối
│   ├── TextUtilities.tsx             # Hợp bộ Case Converter, Word Counter, String Cutter
│   ├── TextAndCompareSuite.tsx       # Khung điều hướng & So sánh Diff Checker, Column Joiner, Auto Inc
│   ├── ExcelSplitterValidator.tsx    # Công cụ Chia nhỏ Excel & Phát hiện lỗi tài khoản
│   ├── ExcelMergerExtractor.tsx      # Công cụ Gộp Excel & Trích xuất tài khoản tự động
│   ├── DirectoryAggregator.tsx       # Công cụ Gộp dữ liệu Excel/CSV theo thư mục gốc
│   ├── DocumentScanner.tsx           # Công cụ chụp ảnh, nắn phẳng góc 4 điểm & xuất PDF
│   ├── PdfMergerSplitter.tsx         # Công cụ Ghép & Chia nhỏ tệp tin PDF theo trang
│   ├── FileRenamer.tsx               # Công cụ đổi tên tệp hàng loạt
│   ├── FileMetadataEditor.tsx        # Trình chỉnh sửa thông tin thời gian (Timestamp) của file
│   └── FileConverter.tsx             # Bộ công cụ Chuyển đổi Định dạng Tệp tin Đa năng (Amber theme)
├── utils/
│   ├── i18n.ts                       # Bộ từ điển song ngữ Việt - Anh
│   └── navigation.ts                 # Trình phân tích & kiểm soát định tuyến URL
├── types.ts                          # Định nghĩa cấu trúc State và Enums hệ thống
├── App.tsx                           # Điểm điều phối kết xuất chính
└── main.tsx                          # Điểm khởi chạy của ứng dụng client
```

### 1. Phân Hệ Xử Lý Văn Bản - Text Utilities Suite (`text-suite`)
- **Case Converter (`case-converter`)**: 
  - *Đầu vào:* Chuỗi văn bản thô từ người dùng.
  - *Thuật toán:* Sử dụng Regex và các hàm xử lý chuỗi chuẩn để biến đổi định dạng chữ. Hỗ trợ 8 chế độ chuyển đổi bao gồm: UPPERCASE, lowercase, Title Case (Hoa Đầu Từ), camelCase, kebab-case, snake_case, PascalCase, Toggle Case.
- **Word Counter & Duplicate Filter (`word-counter-duplicate-filter`)**:
  - *Luồng xử lý:* Phân tách văn bản dựa trên khoảng trắng và ký tự xuống dòng để đo lường các chỉ số: Số từ, số ký tự (gồm/không gồm dấu cách), số dòng, số câu.
  - *Lọc trùng lặp:* Tách văn bản thành mảng các dòng (`lines`), thực hiện loại bỏ trùng lặp qua đối tượng `Set` ở JavaScript, lọc dòng rỗng tùy chọn, trả về danh sách văn bản sạch.
- **String Cutter (`string-cutter`)**:
  - *Chức năng:* Cho phép người dùng cắt bớt ký tự ở đầu/cuối mỗi dòng, cắt chuỗi theo từ khóa phân cách, hoặc tìm kiếm thay thế nâng cao sử dụng biểu thức chính quy (Regular Expression).
- **Diff Checker (`diff-checker`)**:
  - *Thuật toán:* Áp dụng giải pháp so sánh ký tự Myers' Diff Algorithm để phát hiện các dòng/từ được thêm mới (màu xanh lá), bị loại bỏ (màu đỏ) giữa hai khối văn bản gốc và văn bản sửa đổi.
- **Column Joiner (`column-joiner`)**:
  - *Chức năng:* Nhận vào 2 danh sách cột riêng biệt, tự động ghép cặp từng dòng tương ứng của Cột A và Cột B với ký hiệu nối (Delimiter) tùy chỉnh.
- **Auto Increasement Generator (`auto-increasement-generator`)**:
  - *Chức năng:* Sinh danh sách chuỗi dựa trên mẫu văn bản đầu vào (ví dụ: `User_[x]_ID`) bằng cách thay thế mã định danh `[x]` bằng dải số tăng dần tự động với tùy chọn bước tăng, giá trị khởi tạo và số lượng dòng.

### 2. Phân Hệ Dữ Liệu Web & Trình Xem JSON (`web-data-html`)
- **Format JSON & CSV (`format-json-csv`)**:
  - *Cơ chế:* Sử dụng `JSON.stringify(data, null, indent)` để làm đẹp (Beautify) mã JSON bị nén hoặc dùng Regex để thu gọn (Minify) mã JSON, CSV, CSS, JS.
- **JSON Grid Viewer (`json-grid-viewer`)**:
  - *Luồng hoạt động:* Phân tích chuỗi JSON đầu vào thành mảng đối tượng dẹt (Flat Object Array). Kết xuất dữ liệu này dưới dạng bảng lưới (Grid) trực quan, cho phép lọc, tìm kiếm, xem chế độ Toàn Màn Hình, và xuất ngược lại thành file CSV, Excel hoặc JSON thô.
- **Live HTML Runner (`live-html-runner`)**:
  - *Cơ chế bảo mật:* Chạy mã HTML/CSS/JS được viết bởi người dùng bên trong một thẻ `<iframe>` được trang bị thuộc tính bảo mật `sandbox="allow-scripts"`. Nhờ đó mã độc không thể truy cập vào cookie hay thông tin lưu trữ (`localStorage`) của trang chính.

### 3. Phân Hệ Xử Lý Excel & Dữ Liệu Lớn (`excel-suite`)
- **Split & Validate (`split-and-validate`)**:
  - *Đầu vào:* Tệp Excel dung lượng lớn tải lên từ client.
  - *Thuật toán tách:* Đọc nhị phân qua SheetJS, cắt lát mảng dữ liệu thành các nhóm có số dòng tối đa do người dùng cấu hình (ví dụ: 10,000 dòng/file). Đóng gói và xuất ra file ZIP chứa các tệp con.
  - *Thuật toán kiểm tra lỗi tài khoản:* Kiểm tra từng dòng trong file. Phát hiện các định dạng lỗi phổ biến như: thiếu mật khẩu, mật khẩu chứa khoảng trắng, email sai định dạng, tài khoản bị trùng lặp, dòng chứa ký tự lạ. Trực quan hóa các dòng lỗi bằng màu đỏ để người dùng dễ sửa đổi.
- **Merge & Extract Account (`merge-and-extract-account`)**:
  - *Luồng hoạt động:* Tiếp nhận danh sách nhiều file Excel cùng lúc. Hợp nhất (Concatenate) tất cả các hàng dữ liệu từ các sheet đầu tiên của từng file. Tự động nhận diện cấu trúc cột thông minh để phân tích và chỉ trích xuất ra các cột liên quan đến tài khoản (Username, Password, Email), loại bỏ các cột thông tin dư thừa.
- **Directory Aggregator (`directory-aggregator`)**:
  - *Luồng hoạt động:* Người dùng tải lên toàn bộ thư mục chứa hàng chục tệp Excel/CSV qua tính năng kéo thả. Ứng dụng tự động duyệt qua cây thư mục, chỉ lọc ra các tệp bảng tính hợp lệ, hợp nhất chúng thành một bảng dữ liệu hợp nhất khổng lồ ở RAM, hỗ trợ tìm kiếm và xuất kết quả tức thì.

### 4. Phân Hệ Xử Lý Ảnh Tài Liệu & PDF (`pdf-suite`)
- **Chuyển Ảnh Sang PDF (`create-pdf-from-images`)**:
  - *Cơ chế Nắn góc 4 điểm (Perspective Crop):* Sử dụng Canvas HTML5 để hiển thị ảnh tài liệu bị nghiêng, hiển thị 4 điểm neo tròn ở 4 góc kèm kính lúp phóng to tọa độ pixel. Khi người dùng xác nhận, thuật toán nội suy bilinear sẽ tính toán ma trận biến đổi phối cảnh 2D để biến vùng ảnh méo thành một hình chữ nhật phẳng phiu, loại bỏ các góc nghiêng.
  - *Bộ lọc màu:* Áp dụng các bộ lọc điểm ảnh trực tiếp trên mảng dữ liệu ảnh (`ImageData`): Grayscale (Ảnh xám), CamScanner B&W (Tăng tương phản đen trắng lọc bóng mờ), Magic Color (Làm nét chữ và rực rỡ màu sắc).
  - *Xuất PDF:* Sử dụng `jspdf` để chèn các ảnh sau khi lọc màu thành từng trang của file tài liệu PDF, hỗ trợ căn chỉnh lề và khổ giấy.
- **Ghép File PDF (`merge-pdf`)**:
  - *Luồng hoạt động:* Nhận nhiều file PDF nguồn đồng thời thông qua tính năng kéo thả. Sử dụng `pdfjs-dist` để chuyển dịch và hiển thị thumbnail thời gian thực cho **tất cả** các trang của tất cả tài liệu đã tải lên.
  - *Tương tác trực quan:* Người dùng có thể kéo thả hoặc nhấn nút mũi tên để thay đổi thứ tự các trang, xoay góc trang (xoay 90, 180, 270 độ), xóa trang không cần thiết, hoặc nhấp vào bất kỳ trang nào để xem ở chế độ fullscreen sắc nét.
  - *Tạo PDF mới:* Sử dụng thư viện `pdf-lib` nạp các tệp nguồn ở mức độ nhị phân, sao chép tuần tự các trang đã chọn và sắp xếp lại theo ý muốn (`copyPages` và `insertPage`), sau đó kết xuất tệp đã ghép hoàn chỉnh.
- **Chia Nhỏ PDF (`split-pdf`)**:
  - *Luồng hoạt động:* Người dùng tải lên một tệp PDF bất kỳ. Ứng dụng phân tích và kết xuất toàn bộ số trang của tệp dưới dạng các trang lưới.
  - *Tách theo dải trang (Extract Range):* Cung cấp ô nhập dải trang chuyên nghiệp (ví dụ: `1-3, 5, 8-10`). Hệ thống sẽ phân tách dải trang thông qua bộ phân tích chuỗi Regex thông minh.
  - *Xem trước dải trang:* Đối với mỗi dải trang cấu hình, hệ thống kết xuất một khối preview gồm hình thu nhỏ của trang đầu tiên và trang cuối cùng của dải đó. Khi người dùng bấm vào trang preview, một cửa sổ xem fullscreen xuất hiện cho phép duyệt qua tất cả các trang nằm trong dải đó bằng nút mũi tên điều hướng.
  - *Kết xuất & Đóng gói:* Sử dụng `pdf-lib` để trích xuất dải trang thành các tệp PDF độc lập tương ứng. Cho phép người dùng tải trực tiếp từng tệp nhỏ hoặc đóng gói toàn bộ danh sách tệp con vào một tệp tin nén `.zip` (sử dụng `jszip`).
- **Chỉnh Sửa PDF (`edit-pdf`)**:
  - *Luồng hoạt động:* Trình biên tập tổng hợp toàn năng. Người dùng có thể nạp các trang ban đầu từ cả hai nguồn: tệp ảnh chụp (JPEG, PNG) hoặc các tệp tin PDF khác.
  - *Trích xuất trang PDF nguồn:* Đối với tệp PDF tải lên, hệ thống gọi `pdfjs-dist` kết xuất từng trang với hệ số phóng đại chất lượng cao (zoom 1.5x) sang canvas trong bộ nhớ đệm RAM để chuyển thành trang chỉnh sửa.
  - *Biên tập nâng cao:* Với từng trang trong danh sách, người dùng được cung cấp đầy đủ bộ công cụ:
    - **Nắn góc 4 điểm (Perspective Crop):** Chỉnh ma trận 4 góc bằng điểm neo tương tác trực tiếp trên ảnh gốc, biến đổi phối cảnh 2D tức thì.
    - **Bộ lọc màu (CamScanner Filters):** Giao diện bảng điều khiển các thanh kéo cho phép tinh chỉnh Độ sáng (Brightness), Độ tương phản (Contrast), Ngưỡng nhị phân (B&W Threshold), chế độ Magic Color và Grayscale.
    - **Sắp xếp & Xoay trang:** Đổi vị trí trang và xoay góc tức thời.
  - *Xuất bản chất lượng cao:* Thiết lập kích thước khổ giấy đích (A4, Letter, Legal), hướng xoay trang giấy (Portrait/Landscape), lề trang giấy (pdfMargin) và đóng gói xuất bản tệp PDF hoàn chỉnh qua `jspdf`.

### 5. Phân Hệ Quản Lý Tệp & Metadata (`file-manager`)
- **Batch File Renamer (`batch-file-renamer`)**:
  - *Cơ chế:* Tiếp nhận danh sách tệp tin. Người dùng thiết lập cấu hình đổi tên hàng loạt: Thêm tiền tố (Prefix), hậu tố (Suffix), tìm kiếm và thay thế chuỗi bằng Regex hoặc từ khóa thô, tự động đánh số thứ tự tăng dần (ví dụ: `[name]_01`, `[name]_02`) với số chữ số 0 tùy chỉnh.
  - *Kết quả:* Không làm thay đổi nội dung tệp tin, hệ thống tạo đối tượng File mới với tên gọi mới, giữ nguyên định dạng nhị phân, cho phép đóng gói tải về toàn bộ danh sách file đã đổi tên qua tệp ZIP.
- **Metadata & Timestamp Editor (`metadata-timestamp-editor`)**:
  - *Luồng hoạt động:* Sửa đổi thông tin thời gian hệ thống của tệp tin. Vì trình duyệt không thể ghi đè trực tiếp ngày tạo/sửa đổi của tệp tin tải xuống trực tiếp thông qua cơ chế download của trình duyệt thông thường, hệ thống áp dụng kỹ thuật **JSZip Metadata Override**: Khi người dùng cấu hình ngày khởi tạo (`Created Date`) và ngày chỉnh sửa mới (`Modified Date`), hệ thống sẽ nạp tệp tin vào JSZip và cấu hình tham số `date` của từng file bên trong ZIP bằng đúng mốc thời gian đó trước khi kết xuất file nén. Khi giải nén, hệ điều hành (Windows, macOS, Linux) sẽ nhận dạng chính xác mốc thời gian mới này.

### 6. Bộ Chuyển Đổi Định Dạng Đa Năng (`universal-file-converter`)
Tập trung tại tệp `src/components/FileConverter.tsx`. Đây là bộ công cụ chuyển đổi định dạng tệp chéo vô cùng mạnh mẽ, hoạt động bằng cách chuyển dịch dữ liệu trực tiếp trong bộ nhớ trình duyệt thông qua các API client:

| Định dạng gốc (Source) | Định dạng đích (Target) | Công nghệ/Cơ chế thực hiện ở Client-Side |
| :--- | :--- | :--- |
| **PDF** | `.docx`, `.txt` | Sử dụng `pdfjs-dist` phân tích nhị phân tệp tin, trích xuất chuỗi văn bản thô theo trang. Đối với `.docx`, chuỗi được đóng gói vào mẫu HTML định dạng đặc biệt thích hợp để Word mở trực tiếp. |
| **DOCX** | `.pdf`, `.txt` | Sử dụng `mammoth` để bóc tách tệp DOCX thành văn bản thô. Đối với `.pdf`, sử dụng thư viện `jspdf` để tính toán khoảng xuống dòng và tự động ngắt trang, tạo file PDF dạng text nét cao. |
| **TXT** | `.pdf`, `.docx` | Sử dụng `jspdf` kết xuất chuỗi văn bản thô trực tiếp thành trang PDF hoặc đóng gói chuỗi thô thành tệp tin Word định dạng MS-Word HTML. |
| **PNG, JPG, WEBP, BMP** | `.png`, `.jpg`, `.webp`, `.bmp` | Nạp ảnh nguồn vào đối tượng `Image` của trình duyệt, kết xuất ra một thẻ `<canvas>` có kích thước tương đương. Sử dụng phương thức `canvas.toBlob(callback, mimeType, quality)` để xuất ảnh sang định dạng đích với chất lượng mong muốn. Khi xuất sang JPG, canvas tự động được phủ một lớp nền trắng tinh để loại bỏ thuộc tính alpha trong suốt. |
| **MP4, WEBM** (Video) | `.mp3`, `.wav`, `.aac` | Trích xuất luồng âm thanh nhị phân từ luồng video thông qua API **Web Audio Context** (`decodeAudioData`). Hệ thống giải mã dữ liệu âm thanh dưới dạng mảng Float32Array thô của các kênh âm thanh, sau đó tự viết cấu trúc nhị phân của đầu Header WAV chuẩn (`RIFF`, định dạng PCM, tần số lấy mẫu, số bit) và xuất ra file âm thanh chất lượng gốc. |
| **MP3, WAV, AAC** (Audio) | `.mp3`, `.wav`, `.aac` | Thực hiện giải mã âm thanh nhị phân qua Audio Context và mã hóa/chuyển đổi định dạng đích thông qua cơ chế ghi đè dữ liệu nhị phân (Binary Rewriting). |
| **XLSX, XLS, CSV** | `.csv`, `.xlsx`, `.json` | Sử dụng SheetJS (`xlsx`) đọc dữ liệu đầu vào. Trích xuất sheet đầu tiên, chuyển đổi sang bảng mảng 2 chiều, sau đó viết lại dữ liệu bằng các bộ chuyển đổi chuẩn của SheetJS sang định dạng mới. |
| **JSON** | `.csv`, `.xml` | Phân tích cú pháp chuỗi JSON thành mảng đối tượng dẹt. Tạo ra chuỗi định dạng CSV bằng thuật toán phân tách dấu phẩy. Đối với XML, sử dụng hàm đệ quy duyệt qua các cặp Key-Value để xây dựng nên cây thẻ XML đóng mở hợp lệ. |

---

## 🧭 5. Hướng Dẫn Phát Triển Dành Cho AI Coder Mới (Onboarding Guide)

Nếu bạn là một AI Coder mới nhận bàn giao dự án này và cần sửa đổi hoặc thêm tính năng, hãy đọc kỹ hướng dẫn từng bước sau để đảm bảo không làm phá vỡ kiến trúc mượt mà sẵn có của hệ thống:

### Bước 1: Cách Thêm Một Menu Chức Năng Con Mới (Sub-module Addition)
1. **Mở tệp `src/types.ts`**: Đảm bảo state liên quan đến phân hệ của bạn được định nghĩa cấu trúc rõ ràng trong tệp này.
2. **Mở tệp `src/utils/navigation.ts`**:
   - Tìm hằng số **`MAIN_MENU_ITEMS`**.
   - Xác định danh mục chính chứa tính năng con của bạn (ví dụ: `text-suite` hoặc `file-manager`).
   - Thêm một đối tượng con vào mảng `submenus` có cấu trúc:
     ```typescript
     {
       subSlug: "ten-tinh-nang-moi-viet-lien-khong-dau",
       labelVi: "Tên Tiếng Việt Hiển Thị",
       labelEn: "Display English Name",
       descriptionVi: "Mô tả ngắn gọn chức năng bằng Tiếng Việt",
       descriptionEn: "Short English description",
       icon: LucideIconName, // Import icon tương ứng từ lucide-react ở đầu tệp
       componentKey: "key-dinh-danh-component"
     }
     ```
   - Điền đường dẫn kế thừa của bạn vào bảng **`LEGACY_HASH_MAP`** ở phía dưới nếu bạn cần ánh xạ một hash cũ bất kỳ về định dạng URL phân cấp mới để giữ khả năng tương thích ngược.

### Bước 2: Cách Khởi Tạo & Gắn Thành Phần Giao Diện (Component Mounting)
1. **Viết mã nguồn Component**: Tạo một component mới bên trong thư mục `src/components/` (ví dụ: `src/components/NewFeature.tsx`). Hãy sử dụng Tailwind CSS 4 và Lucide Icons cho giao diện. Hãy đảm bảo mọi nút hành động đều có thông báo Toast rõ ràng bằng `react-toastify`.
2. **Đăng ký Component trong `src/App.tsx`**:
   - Nhập khẩu (Import) component mới của bạn ở đầu tệp `src/App.tsx`.
   - Tìm đoạn mã quản lý kết xuất giao diện dựa trên `componentKey` (hoặc `subSlug`).
   - Thêm nhánh rẽ nhánh tương ứng để trả về Component mới của bạn:
     ```typescript
     // Ví dụ trong hàm render nội dung chính ở App.tsx
     if (subSlug === "ten-tinh-nang-moi-viet-lien-khong-dau") {
       return <NewFeature />;
     }
     ```

### Bước 3: Cách Quản Lý Đa Ngôn Ngữ (Localization)
Dự án hỗ trợ hoàn chỉnh song ngữ Việt - Anh thông qua tệp `src/utils/i18n.ts`.
1. **Mở tệp `src/utils/i18n.ts`**: Tìm đối tượng dịch tương ứng với phân hệ hoặc thêm một nhánh key mới chứa nội dung dịch cho component của bạn:
   ```typescript
   // Trong i18n.ts
   vi: {
     newFeature: {
       title: "Tiêu đề tính năng mới",
       buttonLabel: "Thực hiện",
     }
   },
   en: {
     newFeature: {
       title: "New Feature Title",
       buttonLabel: "Execute",
     }
   }
   ```
2. **Sử dụng trong Component**:
   ```typescript
   import { useI18n } from "../utils/i18n";
   
   export default function NewFeature() {
     const { t, lang } = useI18n();
     return (
       <div>
         <h1>{t("newFeature.title")}</h1>
         <button>{t("newFeature.buttonLabel")}</button>
       </div>
     );
   }
   ```

### Bước 4: Kiểm Tra Chất Lượng Mã Nguồn & Biên Dịch
Trước khi bàn giao bất kỳ thay đổi nào, bạn **bắt buộc** phải chạy các lệnh sau để đảm bảo hệ thống hoạt động ổn định và không phát sinh lỗi kiểu dữ liệu (TypeScript Type Checking):

```bash
# 1. Cài đặt các gói phụ thuộc (chỉ cần chạy một lần đầu tiên)
npm install

# 2. Khởi chạy máy chủ phát triển ở cổng mặc định 3000
npm run dev

# 3. Chạy trình kiểm tra tĩnh nghiêm ngặt (TypeScript Compiler No-Emit)
npm run lint

# 4. Biên dịch thử nghiệm đóng gói dự án để chắc chắn không bị lỗi Build
npm run build
```

---

*Cảm ơn bạn đã đồng hành và phát triển hệ thống AIO Tool v2.8.0! Hãy tiếp tục giữ vững tôn chỉ: Code sạch, kiểu dữ liệu an toàn, xử lý 100% Client-Side bảo mật.*
