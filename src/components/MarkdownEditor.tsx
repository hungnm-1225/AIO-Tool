import React, { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { useI18n } from "../utils/i18n";
import { marked } from "marked";
import { htmlToMarkdown } from "../utils/htmlToMarkdown";
import {
  Upload,
  Download,
  Copy,
  Check,
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code2,
  Link,
  Quote,
  Minus,
  Trash2,
  Eye,
  Edit3,
  FileDown,
  ChevronDown,
  BookOpen,
  Table,
} from "lucide-react";

const DEFAULT_MARKDOWN = `# Chào mừng đến với Markdown Editor 📝

Đây là trình soạn thảo Markdown **trực quan** với khả năng chỉnh sửa song song. Bạn có thể viết Markdown ở bên trái hoặc chỉnh sửa trực tiếp như Word ở bên phải!

## Tính Năng Chính

- **Chỉnh sửa hai chiều** — Viết Markdown hoặc chỉnh sửa văn bản trực quan
- **Cuộn đồng bộ** — Cả hai bên cuộn cùng nhau
- **Tải file** — Import file \`.md\` hoặc \`.docx\` từ máy tính
- **Xuất file** — Tải về file \`.md\` hoặc Word \`.doc\`
- **Thanh công cụ** — Định dạng nhanh: Bold, Italic, Heading, List…

## Ví Dụ Định Dạng

**Chữ in đậm**, *chữ nghiêng*, ~~chữ gạch ngang~~

Kết hợp: ***in đậm và nghiêng***, **chữ đậm với \`code inline\`**

### Liên Kết & Hình Ảnh

[Trang chủ Google](https://google.com) — Ctrl + Click để mở liên kết

### Khối Mã (Code Block)

\`\`\`javascript
function greet(name) {
  return \`Xin chào, \${name}!\`;
}

console.log(greet("Việt Nam"));
\`\`\`

### Bảng Dữ Liệu

| Tính Năng | Trạng Thái | Ghi Chú |
| --- | --- | --- |
| In đậm / nghiêng | ✅ | Ctrl+B / Ctrl+I |
| Tiêu đề H1-H3 | ✅ | Toolbar hoặc # |
| Bảng (Table) | ✅ | GFM Syntax |
| Code Block | ✅ | Fenced \`\`\` |

### Trích Dẫn

> "Cách tốt nhất để dự đoán tương lai là tạo ra nó."
> — Abraham Lincoln

### Danh Sách

1. Mục đánh số thứ nhất
2. Mục đánh số thứ hai
3. Mục đánh số thứ ba

- Gạch đầu dòng A
- Gạch đầu dòng B
- Gạch đầu dòng C

---

Chúc bạn soạn thảo vui vẻ! 🎉
`;

// Hàm đếm ký tự / từ / dòng
function getCounts(text: string) {
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const lines = text ? text.split(/\r?\n/).length : 0;
  return { chars, words, lines };
}

export default function MarkdownEditor() {
  const { t, lang } = useI18n();
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
  const [previewText, setPreviewText] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [fileName, setFileName] = useState("document.md");
  const [showExportMenu, setShowExportMenu] = useState(false);

  const mdEditorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const skipPreviewUpdateRef = useRef(false);
  const scrollSourceRef = useRef<"editor" | "preview" | null>(null);
  const rafRef = useRef<number>(0);
  const mdFileInputRef = useRef<HTMLInputElement>(null);
  const docxFileInputRef = useRef<HTMLInputElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // ─── Markdown → HTML: cập nhật preview khi markdown thay đổi ───
  useEffect(() => {
    if (skipPreviewUpdateRef.current) {
      skipPreviewUpdateRef.current = false;
      return;
    }
    if (previewRef.current) {
      const html = marked.parse(markdown) as string;
      previewRef.current.innerHTML = html;
      setPreviewText(previewRef.current.innerText || "");
    }
  }, [markdown]);

  // ─── WYSIWYG → Markdown: đồng bộ ngược khi edit bên Word Editor ───
  const syncFromPreview = useCallback(() => {
    skipPreviewUpdateRef.current = true;
    const html = previewRef.current?.innerHTML || "";
    const md = htmlToMarkdown(html);
    setMarkdown(md);
    setPreviewText(previewRef.current?.innerText || "");
  }, []);

  // ─── Click outside đóng dropdown export ───
  useEffect(() => {
    if (!showExportMenu) return;
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showExportMenu]);

  // ─── Cuộn đồng bộ (rAF + source-lock — mượt, không giật, không vòng lặp) ───
  const syncScroll = useCallback((source: "editor" | "preview") => {
    // Chỉ cho phép nguồn đang active đồng bộ, chặn chiều ngược
    if (scrollSourceRef.current && scrollSourceRef.current !== source) return;
    scrollSourceRef.current = source;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const editor = mdEditorRef.current;
      const preview = previewContainerRef.current;
      if (!editor || !preview) return;
      if (source === "editor") {
        const max = editor.scrollHeight - editor.clientHeight;
        const pct = max > 0 ? editor.scrollTop / max : 0;
        const targetMax = preview.scrollHeight - preview.clientHeight;
        preview.scrollTop = pct * targetMax;
      } else {
        const max = preview.scrollHeight - preview.clientHeight;
        const pct = max > 0 ? preview.scrollTop / max : 0;
        const targetMax = editor.scrollHeight - editor.clientHeight;
        editor.scrollTop = pct * targetMax;
      }
      // Mở khóa sau 1 frame để bên kia không trigger ngược
      requestAnimationFrame(() => { scrollSourceRef.current = null; });
    });
  }, []);

  const handleEditorScroll = useCallback(() => syncScroll("editor"), [syncScroll]);
  const handlePreviewScroll = useCallback(() => syncScroll("preview"), [syncScroll]);

  // ─── Upload .md ───
  const handleUploadMd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) || "";
      setMarkdown(text);
      toast.success(lang === "vi" ? `Đã tải "${file.name}" thành công!` : `Loaded "${file.name}" successfully!`);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ─── Upload .docx → mammoth → HTML → Markdown ───
  const handleUploadDocx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const mammothModule = await import("mammoth");
      const mammoth = mammothModule.default || mammothModule;
      const result = await (mammoth as any).convertToHtml({ arrayBuffer });
      const html: string = result.value;
      if (previewRef.current) {
        previewRef.current.innerHTML = html;
        setPreviewText(previewRef.current.innerText || "");
      }
      const md = htmlToMarkdown(html);
      setMarkdown(md);
      setFileName(file.name.replace(/\.docx?$/i, ".md"));
      toast.success(lang === "vi" ? `Đã import "${file.name}" thành công!` : `Imported "${file.name}" successfully!`);
    } catch (err: any) {
      toast.error(lang === "vi" ? `Lỗi đọc file: ${err.message}` : `Error reading file: ${err.message}`);
    }
    e.target.value = "";
  };

  // ─── Download .md ───
  const handleDownloadMd = () => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(lang === "vi" ? `Đã tải xuống "${fileName}"!` : `Downloaded "${fileName}"!`);
  };

  // ─── Download Word (.doc) từ rendered HTML ───
  const handleDownloadWord = () => {
    const html = previewRef.current?.innerHTML || "";
    if (!html.trim()) {
      toast.warning(lang === "vi" ? "Không có nội dung để xuất!" : "No content to export!");
      return;
    }
    const docHtml = [
      '<html xmlns:o="urn:schemas-microsoft-com:office:office"',
      '      xmlns:w="urn:schemas-microsoft-com:office:word"',
      '      xmlns="http://www.w3.org/TR/REC-html40">',
      '<head><meta charset="utf-8">',
      '<style>',
      '  @page { size: A4; margin: 2.54cm; }',
      '  body { font-family: Calibri, "Segoe UI", Arial, sans-serif; font-size: 11pt; line-height: 1.7; color: #1a1a1a; }',
      '  h1 { font-size: 20pt; font-weight: bold; margin: 14pt 0 6pt; border-bottom: 1px solid #d0d0d0; padding-bottom: 4pt; }',
      '  h2 { font-size: 16pt; font-weight: bold; margin: 12pt 0 4pt; border-bottom: 1px solid #e8e8e8; padding-bottom: 3pt; }',
      '  h3 { font-size: 13pt; font-weight: bold; margin: 10pt 0 4pt; }',
      '  h4 { font-size: 11pt; font-weight: bold; margin: 8pt 0 3pt; }',
      '  p { margin: 0 0 6pt; }',
      '  strong, b { font-weight: bold; }',
      '  em, i { font-style: italic; }',
      '  del, s { text-decoration: line-through; }',
      '  a { color: #4f46e5; text-decoration: underline; }',
      '  code { font-family: Consolas, "Courier New", monospace; background: #f4f4f4; padding: 1px 4px; border-radius: 3px; font-size: 10pt; }',
      '  pre { font-family: Consolas, "Courier New", monospace; background: #f8f8f8; border: 1px solid #e0e0e0; padding: 8pt 10pt; border-radius: 4px; font-size: 9.5pt; white-space: pre-wrap; word-wrap: break-word; }',
      '  pre code { background: transparent; padding: 0; font-size: inherit; }',
      '  blockquote { border-left: 3pt solid #6366f1; padding: 4pt 0 4pt 10pt; margin: 6pt 0; color: #555; background: #f9f9ff; }',
      '  blockquote p:last-child { margin-bottom: 0; }',
      '  table { border-collapse: collapse; width: 100%; margin: 8pt 0; }',
      '  th, td { border: 1px solid #bbb; padding: 5pt 8pt; text-align: left; font-size: 10pt; }',
      '  th { background: #f0f0f0; font-weight: bold; }',
      '  ul, ol { margin: 4pt 0 8pt; padding-left: 22pt; }',
      '  li { margin: 2pt 0; line-height: 1.6; }',
      '  hr { border: none; border-top: 1px solid #ccc; margin: 12pt 0; }',
      '  img { max-width: 100%; }',
      '</style>',
      '</head>',
      `<body>${html}</body>`,
      '</html>',
    ].join('\n');
    const docName = fileName.replace(/\.(md|markdown|mdx|txt)$/i, "") + ".doc";
    const blob = new Blob(['\ufeff', docHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = docName;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(lang === "vi" ? `Đã xuất Word "${docName}"!` : `Exported "${docName}"!`);
  };

  // ─── Copy Markdown source ───
  const handleCopyMd = async () => {
    if (!markdown) return;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied("md");
      toast.success(lang === "vi" ? "Đã sao chép Markdown!" : "Markdown copied!");
      setTimeout(() => setCopied(null), 2000);
    } catch (err) { console.error("Copy failed", err); }
  };

  // ─── Copy Word content (HTML rich-text → clipboard) ───
  const handleCopyWord = async () => {
    const html = previewRef.current?.innerHTML || "";
    const text = previewRef.current?.innerText || "";
    if (!text) return;
    try {
      // Paste vào Word/Docs giữ format, paste notepad là plain-text
      const item = new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" }),
      });
      await navigator.clipboard.write([item]);
    } catch {
      await navigator.clipboard.writeText(text);
    }
    setCopied("word");
    toast.success(lang === "vi" ? "Đã sao chép nội dung!" : "Content copied!");
    setTimeout(() => setCopied(null), 2000);
  };

  // ─── Ctrl+Click mở link trong Word Editor ───
  const handlePreviewClick = (e: React.MouseEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    const target = e.target as HTMLElement;
    const anchor = target.closest("a");
    if (anchor?.getAttribute("href")) {
      e.preventDefault();
      window.open(anchor.getAttribute("href")!, "_blank", "noopener,noreferrer");
    }
  };

  // ─── Markdown toolbar: chèn cú pháp MD vào textarea tại vị trí con trỏ ───
  const mdInsert = useCallback((before: string, after: string, placeholder?: string) => {
    const ta = mdEditorRef.current;
    if (!ta) return;
    ta.focus();
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = ta.value;
    const selected = text.slice(start, end);
    const inner = selected || placeholder || "";
    const newText = text.slice(0, start) + before + inner + after + text.slice(end);
    setMarkdown(newText);
    // Đặt lại cursor để bôi đen phần vừa chèn (hoặc placeholder)
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = start + before.length;
      ta.selectionEnd = start + before.length + inner.length;
    });
  }, []);

  const mdInsertLine = useCallback((prefix: string, placeholder?: string) => {
    const ta = mdEditorRef.current;
    if (!ta) return;
    ta.focus();
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = ta.value;
    const selected = text.slice(start, end);
    // Tìm đầu dòng hiện tại
    const lineStart = text.lastIndexOf("\n", start - 1) + 1;
    const inner = selected || placeholder || "";
    const needNewline = lineStart > 0 && text[lineStart - 1] !== "\n" ? "" : "";
    const newText = text.slice(0, lineStart) + needNewline + prefix + inner + text.slice(end);
    setMarkdown(newText);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = lineStart + needNewline.length + prefix.length;
      ta.selectionEnd = lineStart + needNewline.length + prefix.length + inner.length;
    });
  }, []);

  const mdInsertLink = useCallback(() => {
    const url = prompt(lang === "vi" ? "Nhập URL:" : "Enter URL:");
    if (!url) return;
    const ta = mdEditorRef.current;
    if (!ta) return;
    ta.focus();
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = ta.value;
    const label = text.slice(start, end) || (lang === "vi" ? "liên kết" : "link");
    const insert = `[${label}](${url})`;
    const newText = text.slice(0, start) + insert + text.slice(end);
    setMarkdown(newText);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = start + 1;
      ta.selectionEnd = start + 1 + label.length;
    });
  }, [lang]);

  const mdInsertTable = useCallback(() => {
    const table = "\n| Col 1 | Col 2 | Col 3 |\n| --- | --- | --- |\n| A | B | C |\n";
    mdInsert(table, "");
  }, [mdInsert]);

  const mdInsertHr = useCallback(() => {
    mdInsert("\n---\n", "");
  }, [mdInsert]);

  // ─── WYSIWYG formatting (document.execCommand) ───
  const execFormat = (command: string, value?: string) => {
    previewRef.current?.focus();
    document.execCommand(command, false, value);
    syncFromPreview();
  };

  const insertLink = () => {
    const url = prompt(lang === "vi" ? "Nhập URL:" : "Enter URL:");
    if (url) execFormat("createLink", url);
  };

  const insertCode = () => {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    previewRef.current?.focus();
    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    if (selectedText) {
      const codeEl = document.createElement("code");
      range.surroundContents(codeEl);
    } else {
      document.execCommand("insertHTML", false, "<code>code</code>");
    }
    syncFromPreview();
  };

  // ─── Bộ đếm ký tự cho mỗi panel ───
  const mdCounts = getCounts(markdown);
  const wordCounts = getCounts(previewText);

  // ─── Style constants ───
  const tbBtn = "p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer transition-colors";
  const tbSep = "h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1 flex-shrink-0";
  const subBtn = "px-2 py-1 rounded-lg border border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all";

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-[#0B0F1A]">
      {/* ─── Header (đồng bộ design với các trang khác) ─── */}
      <div className="flex-shrink-0 p-6 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="h-9 w-9 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-md shadow-sky-600/20">
                <BookOpen className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>{t("markdownEditor.title")}</span>
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t("markdownEditor.subtitle")}
            </p>
          </div>

          {/* Phải: Export dropdown + Clear */}
          <div className="flex items-center gap-2 self-start md:self-center">
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-indigo-600/20"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{t("markdownEditor.export")}</span>
                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showExportMenu ? "rotate-180" : ""}`} />
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1.5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-20 min-w-[200px] overflow-hidden animate-fade-in">
                  <button
                    onClick={() => { handleDownloadMd(); setShowExportMenu(false); }}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer transition-colors"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-emerald-500" />
                    {t("markdownEditor.exportMd")}
                  </button>
                  <button
                    onClick={() => { handleDownloadWord(); setShowExportMenu(false); }}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer transition-colors border-t border-slate-100 dark:border-slate-800/60"
                  >
                    <FileDown className="h-3.5 w-3.5 text-sky-500" />
                    {t("markdownEditor.exportWord")}
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => { setMarkdown(""); toast.success(lang === "vi" ? "Đã xóa nội dung!" : "Content cleared!"); }}
              className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{t("common.clear")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Editor Body — Split View ─── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

        {/* ═══ Trái: Markdown Source Editor ═══ */}
        <div className="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-800/80 min-w-0">
          {/* Sub-header: label + Upload .md + Copy */}
          <div className="flex-shrink-0 px-4 py-2 bg-white dark:bg-[#111827] border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Edit3 className="h-3.5 w-3.5 text-indigo-500" />
              <span className="text-[11px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400">
                {t("markdownEditor.markdownSource")}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <input ref={mdFileInputRef} type="file" accept=".md,.markdown,.mdx,.txt" onChange={handleUploadMd} className="hidden" />
              <button onClick={() => mdFileInputRef.current?.click()} className={subBtn}>
                <Upload className="h-3 w-3" />
                <span>{t("markdownEditor.upload")}</span>
              </button>
              <button onClick={handleCopyMd} className={subBtn}>
                {copied === "md" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                <span>{copied === "md" ? (lang === "vi" ? "Đã chép" : "Copied") : (lang === "vi" ? "Sao chép" : "Copy")}</span>
              </button>
            </div>
          </div>

          {/* Markdown toolbar — chèn cú pháp MD vào textarea */}
          <div className="flex-shrink-0 px-3 py-1.5 bg-white dark:bg-[#111827] border-b border-slate-100 dark:border-slate-800/60 flex items-center gap-0.5 flex-wrap overflow-x-auto">
            <button onClick={() => mdInsert("**", "**", lang === "vi" ? "chữ đậm" : "bold")} className={tbBtn} title="Bold **text**"><Bold className="h-3.5 w-3.5" /></button>
            <button onClick={() => mdInsert("*", "*", lang === "vi" ? "chữ nghiêng" : "italic")} className={tbBtn} title="Italic *text*"><Italic className="h-3.5 w-3.5" /></button>
            <button onClick={() => mdInsert("~~", "~~", lang === "vi" ? "gạch ngang" : "strikethrough")} className={tbBtn} title="Strikethrough ~~text~~"><Strikethrough className="h-3.5 w-3.5" /></button>
            <div className={tbSep} />
            <button onClick={() => mdInsertLine("# ", "Heading 1")} className={tbBtn} title="# Heading 1"><Heading1 className="h-3.5 w-3.5" /></button>
            <button onClick={() => mdInsertLine("## ", "Heading 2")} className={tbBtn} title="## Heading 2"><Heading2 className="h-3.5 w-3.5" /></button>
            <button onClick={() => mdInsertLine("### ", "Heading 3")} className={tbBtn} title="### Heading 3"><Heading3 className="h-3.5 w-3.5" /></button>
            <div className={tbSep} />
            <button onClick={() => mdInsertLine("- ", lang === "vi" ? "mục" : "item")} className={tbBtn} title="- Bullet list"><List className="h-3.5 w-3.5" /></button>
            <button onClick={() => mdInsertLine("1. ", lang === "vi" ? "mục" : "item")} className={tbBtn} title="1. Numbered list"><ListOrdered className="h-3.5 w-3.5" /></button>
            <div className={tbSep} />
            <button onClick={() => mdInsert("`", "`", "code")} className={tbBtn} title="`inline code`"><Code2 className="h-3.5 w-3.5" /></button>
            <button onClick={mdInsertLink} className={tbBtn} title="[text](url)"><Link className="h-3.5 w-3.5" /></button>
            <button onClick={() => mdInsertLine("> ", lang === "vi" ? "trích dẫn" : "quote")} className={tbBtn} title="> Blockquote"><Quote className="h-3.5 w-3.5" /></button>
            <button onClick={mdInsertTable} className={tbBtn} title="Insert table"><Table className="h-3.5 w-3.5" /></button>
            <button onClick={mdInsertHr} className={tbBtn} title="--- Horizontal rule"><Minus className="h-3.5 w-3.5" /></button>
          </div>

          <textarea
            ref={mdEditorRef}
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            onScroll={handleEditorScroll}
            className="flex-1 w-full p-4 bg-white dark:bg-[#0d1117] text-slate-800 dark:text-slate-200 font-mono text-sm leading-relaxed resize-none focus:outline-none"
            placeholder={lang === "vi" ? "Nhập hoặc dán nội dung Markdown tại đây..." : "Type or paste Markdown here..."}
            spellCheck={false}
          />

          {/* Footer: bộ đếm Markdown */}
          <div className="flex-shrink-0 px-4 py-1.5 bg-slate-50/80 dark:bg-[#0B0F1A]/60 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono">
            <span>{mdCounts.chars.toLocaleString()} {lang === "vi" ? "ký tự" : "chars"} · {mdCounts.words.toLocaleString()} {lang === "vi" ? "từ" : "words"}</span>
            <span>{mdCounts.lines.toLocaleString()} {lang === "vi" ? "dòng" : "lines"}</span>
          </div>
        </div>

        {/* ═══ Phải: WYSIWYG / Word Editor ═══ */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Sub-header: label + Upload .docx + Copy */}
          <div className="flex-shrink-0 px-4 py-2 bg-white dark:bg-[#111827] border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Eye className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-[11px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400">
                {t("markdownEditor.wordEditor")}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <input ref={docxFileInputRef} type="file" accept=".docx,.doc" onChange={handleUploadDocx} className="hidden" />
              <button onClick={() => docxFileInputRef.current?.click()} className={subBtn}>
                <Upload className="h-3 w-3" />
                <span>{t("markdownEditor.uploadDocx")}</span>
              </button>
              <button onClick={handleCopyWord} className={subBtn}>
                {copied === "word" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                <span>{copied === "word" ? (lang === "vi" ? "Đã chép" : "Copied") : (lang === "vi" ? "Sao chép" : "Copy")}</span>
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex-shrink-0 px-3 py-1.5 bg-white dark:bg-[#111827] border-b border-slate-100 dark:border-slate-800/60 flex items-center gap-0.5 flex-wrap overflow-x-auto">
            <button onClick={() => execFormat("bold")} className={tbBtn} title="Bold (Ctrl+B)"><Bold className="h-3.5 w-3.5" /></button>
            <button onClick={() => execFormat("italic")} className={tbBtn} title="Italic (Ctrl+I)"><Italic className="h-3.5 w-3.5" /></button>
            <button onClick={() => execFormat("strikeThrough")} className={tbBtn} title="Strikethrough"><Strikethrough className="h-3.5 w-3.5" /></button>
            <div className={tbSep} />
            <button onClick={() => execFormat("formatBlock", "h1")} className={tbBtn} title="Heading 1"><Heading1 className="h-3.5 w-3.5" /></button>
            <button onClick={() => execFormat("formatBlock", "h2")} className={tbBtn} title="Heading 2"><Heading2 className="h-3.5 w-3.5" /></button>
            <button onClick={() => execFormat("formatBlock", "h3")} className={tbBtn} title="Heading 3"><Heading3 className="h-3.5 w-3.5" /></button>
            <div className={tbSep} />
            <button onClick={() => execFormat("insertUnorderedList")} className={tbBtn} title="Bullet List"><List className="h-3.5 w-3.5" /></button>
            <button onClick={() => execFormat("insertOrderedList")} className={tbBtn} title="Numbered List"><ListOrdered className="h-3.5 w-3.5" /></button>
            <div className={tbSep} />
            <button onClick={insertCode} className={tbBtn} title="Inline Code"><Code2 className="h-3.5 w-3.5" /></button>
            <button onClick={insertLink} className={tbBtn} title="Insert Link"><Link className="h-3.5 w-3.5" /></button>
            <button onClick={() => execFormat("formatBlock", "blockquote")} className={tbBtn} title="Blockquote"><Quote className="h-3.5 w-3.5" /></button>
            <button onClick={() => execFormat("insertHorizontalRule")} className={tbBtn} title="Horizontal Rule"><Minus className="h-3.5 w-3.5" /></button>
          </div>

          {/* WYSIWYG Content Area */}
          <div
            ref={previewContainerRef}
            className="flex-1 overflow-auto bg-white dark:bg-[#0d1117]"
            onScroll={handlePreviewScroll}
          >
            <div
              ref={previewRef}
              contentEditable
              onInput={syncFromPreview}
              onClick={handlePreviewClick}
              className="markdown-preview outline-none min-h-full p-6 text-slate-800 dark:text-slate-200 text-[15px] leading-relaxed"
              suppressContentEditableWarning
            />
          </div>

          {/* Footer: bộ đếm Word + hint Ctrl+Click */}
          <div className="flex-shrink-0 px-4 py-1.5 bg-slate-50/80 dark:bg-[#0B0F1A]/60 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono">
            <span>{wordCounts.chars.toLocaleString()} {lang === "vi" ? "ký tự" : "chars"} · {wordCounts.words.toLocaleString()} {lang === "vi" ? "từ" : "words"}</span>
            <span className="text-[9px] text-slate-400/70 dark:text-slate-500/70 hidden md:inline">
              {t("markdownEditor.ctrlClickHint")}
            </span>
            <span>{wordCounts.lines.toLocaleString()} {lang === "vi" ? "dòng" : "lines"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
