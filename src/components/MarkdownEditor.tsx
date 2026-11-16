import React, { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { useI18n } from "../utils/i18n";
import { marked } from "marked";
import { htmlToMarkdown } from "../utils/htmlToMarkdown";
import {
  FileText,
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
} from "lucide-react";

const DEFAULT_MARKDOWN = `# Chào mừng đến với Markdown Editor 📝

Đây là trình soạn thảo Markdown **trực quan** với khả năng chỉnh sửa song song. Bạn có thể viết Markdown ở bên trái hoặc chỉnh sửa trực tiếp như Word ở bên phải!

## Tính Năng Chính

- **Chỉnh sửa hai chiều** — Viết Markdown hoặc chỉnh sửa văn bản trực quan
- **Cuộn đồng bộ** — Cả hai bên cuộn cùng nhau
- **Tải file** — Import file \`.md\` từ máy tính
- **Xuất file** — Tải về file \`.md\`
- **Thanh công cụ** — Định dạng nhanh: Bold, Italic, Heading, List…

## Ví Dụ Định Dạng

**Chữ in đậm**, *chữ nghiêng*, ~~chữ gạch ngang~~

Kết hợp: ***in đậm và nghiêng***, **chữ đậm với \`code inline\`**

### Liên Kết & Hình Ảnh

[Trang chủ Google](https://google.com) — Click để mở liên kết

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

export default function MarkdownEditor() {
  const { t, lang } = useI18n();
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
  const [copied, setCopied] = useState<string | null>(null);
  const [fileName, setFileName] = useState("document.md");

  const mdEditorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const skipPreviewUpdateRef = useRef(false);
  const isScrollingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Markdown → HTML: cập nhật preview khi markdown thay đổi từ phía textarea
  useEffect(() => {
    if (skipPreviewUpdateRef.current) {
      skipPreviewUpdateRef.current = false;
      return;
    }
    if (previewRef.current) {
      const html = marked.parse(markdown) as string;
      previewRef.current.innerHTML = html;
    }
  }, [markdown]);

  // WYSIWYG → Markdown: đồng bộ ngược khi người dùng edit bên Word Editor
  const syncFromPreview = useCallback(() => {
    skipPreviewUpdateRef.current = true;
    const html = previewRef.current?.innerHTML || "";
    const md = htmlToMarkdown(html);
    setMarkdown(md);
  }, []);

  // --- Scroll đồng bộ (percentage-based, chống vòng lặp vô hạn) ---
  const handleEditorScroll = () => {
    if (isScrollingRef.current) return;
    isScrollingRef.current = true;
    const editor = mdEditorRef.current;
    const preview = previewContainerRef.current;
    if (editor && preview) {
      const maxScroll = editor.scrollHeight - editor.clientHeight;
      const pct = maxScroll > 0 ? editor.scrollTop / maxScroll : 0;
      const previewMax = preview.scrollHeight - preview.clientHeight;
      preview.scrollTop = pct * previewMax;
    }
    setTimeout(() => { isScrollingRef.current = false; }, 30);
  };

  const handlePreviewScroll = () => {
    if (isScrollingRef.current) return;
    isScrollingRef.current = true;
    const editor = mdEditorRef.current;
    const preview = previewContainerRef.current;
    if (editor && preview) {
      const maxScroll = preview.scrollHeight - preview.clientHeight;
      const pct = maxScroll > 0 ? preview.scrollTop / maxScroll : 0;
      const editorMax = editor.scrollHeight - editor.clientHeight;
      editor.scrollTop = pct * editorMax;
    }
    setTimeout(() => { isScrollingRef.current = false; }, 30);
  };

  // --- File upload ---
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) || "";
      setMarkdown(text);
      toast.success(
        lang === "vi"
          ? `Đã tải file "${file.name}" thành công!`
          : `Loaded "${file.name}" successfully!`
      );
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // --- Download .md ---
  const handleDownload = () => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(
      lang === "vi" ? `Đã tải xuống "${fileName}"!` : `Downloaded "${fileName}"!`
    );
  };

  // --- Download Word (.doc) từ rendered HTML ---
  const handleDownloadWord = () => {
    const html = previewRef.current?.innerHTML || "";
    if (!html.trim()) {
      toast.warning(lang === "vi" ? "Không có nội dung để xuất!" : "No content to export!");
      return;
    }
    // HTML với Word XML namespaces — Word/LibreOffice/Google Docs mở native
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
    toast.success(
      lang === "vi" ? `Đã xuất Word "${docName}"!` : `Exported "${docName}"!`
    );
  };

  // --- Copy ---
  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      toast.success(lang === "vi" ? "Đã sao chép!" : "Copied!");
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  // --- WYSIWYG formatting (document.execCommand) ---
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

  // --- Toolbar button style ---
  const tbBtn =
    "p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer transition-colors";
  const tbSep = "h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1 flex-shrink-0";

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-[#0B0F1A]">
      {/* ─── Header ─── */}
      <div className="flex-shrink-0 p-4 md:p-5 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="h-9 w-9 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-md shadow-sky-600/20">
                <FileText className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {t("markdownEditor.title")}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("markdownEditor.subtitle")}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.markdown,.mdx,.txt"
              onChange={handleUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
            >
              <Upload className="h-3.5 w-3.5" /> {t("markdownEditor.upload")}
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
            >
              <Download className="h-3.5 w-3.5" /> {t("markdownEditor.download")}
            </button>
            <button
              onClick={handleDownloadWord}
              className="px-3 py-2 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
            >
              <FileDown className="h-3.5 w-3.5" /> {t("markdownEditor.exportWord")}
            </button>
            <button
              onClick={() => handleCopy(markdown, "md")}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
            >
              {copied === "md" ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied === "md"
                ? lang === "vi" ? "Đã chép" : "Copied"
                : "Copy MD"}
            </button>
            <button
              onClick={() => {
                setMarkdown("");
                toast.success(lang === "vi" ? "Đã xóa nội dung!" : "Content cleared!");
              }}
              className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
            >
              <Trash2 className="h-3.5 w-3.5" /> {t("common.clear")}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Editor Body — Split View ─── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* === Left: Markdown Source Editor === */}
        <div className="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-800/80 min-w-0">
          <div className="flex-shrink-0 px-4 py-2.5 bg-white dark:bg-[#111827] border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Edit3 className="h-3.5 w-3.5 text-indigo-500" />
              <span className="text-[11px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400">
                {t("markdownEditor.markdownSource")}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {markdown.split("\n").length} {lang === "vi" ? "dòng" : "lines"}
            </span>
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
        </div>

        {/* === Right: WYSIWYG / Word Editor === */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="flex-shrink-0 px-3 py-1.5 bg-white dark:bg-[#111827] border-b border-slate-100 dark:border-slate-800/60 flex items-center gap-0.5 flex-wrap overflow-x-auto">
            <div className="flex items-center gap-1.5 mr-2">
              <Eye className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-[11px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400">
                {t("markdownEditor.wordEditor")}
              </span>
            </div>

            <div className={tbSep} />

            <button onClick={() => execFormat("bold")} className={tbBtn} title="Bold (Ctrl+B)">
              <Bold className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => execFormat("italic")} className={tbBtn} title="Italic (Ctrl+I)">
              <Italic className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => execFormat("strikeThrough")} className={tbBtn} title="Strikethrough">
              <Strikethrough className="h-3.5 w-3.5" />
            </button>

            <div className={tbSep} />

            <button onClick={() => execFormat("formatBlock", "h1")} className={tbBtn} title="Heading 1">
              <Heading1 className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => execFormat("formatBlock", "h2")} className={tbBtn} title="Heading 2">
              <Heading2 className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => execFormat("formatBlock", "h3")} className={tbBtn} title="Heading 3">
              <Heading3 className="h-3.5 w-3.5" />
            </button>

            <div className={tbSep} />

            <button onClick={() => execFormat("insertUnorderedList")} className={tbBtn} title="Bullet List">
              <List className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => execFormat("insertOrderedList")} className={tbBtn} title="Numbered List">
              <ListOrdered className="h-3.5 w-3.5" />
            </button>

            <div className={tbSep} />

            <button onClick={insertCode} className={tbBtn} title="Inline Code">
              <Code2 className="h-3.5 w-3.5" />
            </button>
            <button onClick={insertLink} className={tbBtn} title="Insert Link">
              <Link className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => execFormat("formatBlock", "blockquote")} className={tbBtn} title="Blockquote">
              <Quote className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => execFormat("insertHorizontalRule")} className={tbBtn} title="Horizontal Rule">
              <Minus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* WYSIWYG Content Area (scrollable container + contentEditable) */}
          <div
            ref={previewContainerRef}
            className="flex-1 overflow-auto bg-white dark:bg-[#0d1117]"
            onScroll={handlePreviewScroll}
          >
            <div
              ref={previewRef}
              contentEditable
              onInput={syncFromPreview}
              className="markdown-preview outline-none min-h-full p-6 text-slate-800 dark:text-slate-200 text-[15px] leading-relaxed"
              suppressContentEditableWarning
            />
          </div>
        </div>
      </div>
    </div>
  );
}
