import React, { useState, useEffect, useRef } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-json";
import "prismjs/components/prism-markup"; // HTML
import "prismjs/components/prism-css";
import "prismjs/components/prism-javascript";
import { Copy, Check, Download, FileCode, FileJson, Trash2 } from "lucide-react";
import { toast } from "react-toastify";

export interface CodeEditorProps {
  value: string;
  onChange?: (val: string) => void;
  language?: "json" | "html" | "css" | "javascript" | "text";
  readOnly?: boolean;
  placeholder?: string;
  height?: string;
  title?: string;
  showDownload?: boolean;
  showCopy?: boolean;
  showClear?: boolean;
  defaultFilename?: string;
  className?: string;
}

export default function CodeEditor({
  value,
  onChange,
  language = "text",
  readOnly = false,
  placeholder = "Type or paste code here...",
  height = "h-[400px]",
  title,
  showDownload = true,
  showCopy = true,
  showClear = true,
  defaultFilename,
  className = "",
}: CodeEditorProps) {
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  // Sync scroll between textarea and pre highlight layer
  const handleScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const lines = value ? value.split(/\r?\n/) : [""];
  const lineCount = Math.max(1, lines.length);

  // Get grammar for Prism
  const getGrammar = () => {
    if (language === "json") return Prism.languages.json;
    if (language === "html") return Prism.languages.markup;
    if (language === "css") return Prism.languages.css;
    if (language === "javascript") return Prism.languages.javascript;
    return null;
  };

  const grammar = getGrammar();
  const highlightedCode = grammar
    ? Prism.highlight(value || "", grammar, language)
    : (value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Style attributes based on language type
  const getLanguageBadge = () => {
    switch (language) {
      case "javascript":
        return {
          label: "JavaScript",
          ext: ".js",
          bg: "bg-amber-500/10 dark:bg-amber-500/20",
          text: "text-amber-600 dark:text-amber-400",
          border: "border-amber-500/30",
          buttonBg: "bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold",
          icon: <FileCode className="h-3.5 w-3.5 text-amber-500" />,
        };
      case "css":
        return {
          label: "CSS",
          ext: ".css",
          bg: "bg-sky-500/10 dark:bg-sky-500/20",
          text: "text-sky-600 dark:text-sky-400",
          border: "border-sky-500/30",
          buttonBg: "bg-sky-600 hover:bg-sky-700 text-white font-bold",
          icon: <FileCode className="h-3.5 w-3.5 text-sky-500" />,
        };
      case "html":
        return {
          label: "HTML",
          ext: ".html",
          bg: "bg-orange-500/10 dark:bg-orange-500/20",
          text: "text-orange-600 dark:text-orange-400",
          border: "border-orange-500/30",
          buttonBg: "bg-orange-600 hover:bg-orange-700 text-white font-bold",
          icon: <FileCode className="h-3.5 w-3.5 text-orange-500" />,
        };
      case "json":
        return {
          label: "JSON",
          ext: ".json",
          bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
          text: "text-emerald-600 dark:text-emerald-400",
          border: "border-emerald-500/30",
          buttonBg: "bg-emerald-600 hover:bg-emerald-700 text-white font-bold",
          icon: <FileJson className="h-3.5 w-3.5 text-emerald-500" />,
        };
      default:
        return {
          label: "TEXT",
          ext: ".txt",
          bg: "bg-indigo-500/10 dark:bg-indigo-500/20",
          text: "text-indigo-600 dark:text-indigo-400",
          border: "border-indigo-500/30",
          buttonBg: "bg-indigo-600 hover:bg-indigo-700 text-white font-bold",
          icon: <FileCode className="h-3.5 w-3.5 text-indigo-500" />,
        };
    }
  };

  const badgeInfo = getLanguageBadge();

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copied code to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      toast.error("Failed to copy code.");
    }
  };

  const handleDownload = () => {
    if (!value) {
      toast.error("Nothing to download!");
      return;
    }
    const name = defaultFilename || `formatted_code${badgeInfo.ext}`;
    const blob = new Blob([value], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${name}!`);
  };

  return (
    <div className={`bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col ${height} ${className}`}>
      {/* Editor Header */}
      <div className="p-3 px-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/70 dark:bg-[#0B0F1A]/70 rounded-t-2xl">
        <div className="flex items-center gap-2.5 overflow-hidden">
          {badgeInfo.icon}
          {title ? (
            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200 truncate">
              {title}
            </span>
          ) : (
            <span className="text-xs font-mono font-bold uppercase text-slate-700 dark:text-slate-300">
              VS Code Editor
            </span>
          )}
          {/* Badge indicator */}
          <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${badgeInfo.bg} ${badgeInfo.text} ${badgeInfo.border}`}>
            {badgeInfo.label}
          </span>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {showDownload && (
            <button
              onClick={handleDownload}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer ${badgeInfo.buttonBg}`}
              title={`Download file as ${defaultFilename || 'code' + badgeInfo.ext}`}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download {badgeInfo.ext}</span>
            </button>
          )}

          {showCopy && (
            <button
              onClick={handleCopy}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors flex items-center gap-1 text-xs cursor-pointer"
              title="Copy code to clipboard"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-500 font-semibold text-[11px]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span className="text-[11px]">Copy</span>
                </>
              )}
            </button>
          )}

          {showClear && !readOnly && onChange && (
            <button
              onClick={() => {
                onChange("");
                toast.info("Cleared code editor!");
              }}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
              title="Clear editor"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Editor Body: Line numbers + Code text */}
      <div className="flex-1 relative flex overflow-hidden font-mono text-xs leading-relaxed bg-[#f8fafc] dark:bg-[#0B0F1A]">
        {/* Line Numbers Column */}
        <div className="w-10 py-3 select-none text-right pr-2 text-slate-300 dark:text-slate-600 bg-slate-100/50 dark:bg-slate-900/30 border-r border-slate-200/50 dark:border-slate-800/50 overflow-hidden font-mono text-[11px] leading-[1.6rem]">
          {Array.from({ length: lineCount }).map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Text Area + Highlight Overlay */}
        <div className="flex-1 relative overflow-hidden">
          {/* Syntax Highlight Layer */}
          <pre
            ref={preRef}
            className="absolute inset-0 p-3 m-0 pointer-events-none overflow-hidden font-mono text-xs leading-[1.6rem] whitespace-pre tab-size-2"
            aria-hidden="true"
          >
            <code
              className={`language-${language}`}
              dangerouslySetInnerHTML={{ __html: highlightedCode + "\n" }}
            />
          </pre>

          {/* Real Input Textarea */}
          <textarea
            ref={textareaRef}
            readOnly={readOnly}
            value={value}
            onChange={(e) => onChange && onChange(e.target.value)}
            onScroll={handleScroll}
            placeholder={placeholder}
            spellCheck={false}
            className="absolute inset-0 w-full h-full p-3 m-0 bg-transparent text-transparent caret-slate-800 dark:caret-indigo-400 font-mono text-xs leading-[1.6rem] whitespace-pre tab-size-2 resize-none focus:outline-none overflow-auto"
          />
        </div>
      </div>
    </div>
  );
}
