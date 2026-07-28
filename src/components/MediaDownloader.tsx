import React, { useState, useRef, useEffect } from "react";
import {
  Download,
  Link,
  Film,
  Music,
  Sparkles,
  Check,
  Copy,
  RefreshCw,
  Video,
  Image as ImageIcon,
  AlertCircle,
  FileVideo,
  Layers,
  Sliders,
  Trash2,
  X
} from "lucide-react";
import { MediaDownloaderState } from "../types";
import { useI18n } from "../utils/i18n";
import JSZip from "jszip";

interface MediaDownloaderProps {
  state: MediaDownloaderState;
  onChange: (updates: Partial<MediaDownloaderState>) => void;
  lang: "vi" | "en";
}

export function MediaDownloader({ state, onChange, lang }: MediaDownloaderProps) {
  const { t } = useI18n();
  const [urlInput, setUrlInput] = useState(state.url || "");
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<"downloader" | "inspector" | "history">("downloader");
  const [streamError, setStreamError] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  // States for multi-media galleries & Paste Source Inspector
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [galleryLoadingText, setGalleryLoadingText] = useState<string>("");
  const [isGalleryActionLoading, setIsGalleryActionLoading] = useState<boolean>(false);
  const [rawHtmlInput, setRawHtmlInput] = useState<string>("");
  const [inspectorLoading, setInspectorLoading] = useState<boolean>(false);

  const handleScanRawHtml = () => {
    if (!rawHtmlInput.trim()) return;
    setInspectorLoading(true);
    try {
      const html = rawHtmlInput;
      const items: { type: "video" | "image"; url: string; title?: string }[] = [];
      const urlsFound = new Set<string>();

      const decodeUrl = (u: string) => {
        let clean = u;
        if (clean.includes("\\")) {
          try {
            const escaped = clean.replace(/"/g, '\\"');
            clean = JSON.parse(`"${escaped}"`);
          } catch {
            clean = clean
              .replace(/\\u0025/g, "%")
              .replace(/\\u003d/g, "=")
              .replace(/\\u0026/g, "&")
              .replace(/\\u002f/g, "/")
              .replace(/\\u003a/g, ":")
              .replace(/\\u003f/g, "?")
              .replace(/\\/g, "");
          }
        }
        return clean.replace(/&amp;/g, "&").trim();
      };

      const videoMatches = [
        ...html.matchAll(/<meta[^>]+property=["']og:video(?:_url|:secure_url)?["'][^>]+content=["']([^"']+)["']/gi),
        ...html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:video(?:_url|:secure_url)?["']/gi),
        ...html.matchAll(/(?:"browser_native_hd_url"|browser_native_hd_url|playable_url_quality_hd|hd_src|browser_native_sd_url|playable_url|sd_src)\s*:\s*["']([^"']+)["']/gi)
      ];

      for (const match of videoMatches) {
        const rawU = match[1] || match[0];
        const decoded = decodeUrl(rawU);
        if (decoded && decoded.startsWith("http") && !urlsFound.has(decoded)) {
          urlsFound.add(decoded);
          items.push({ type: "video", url: decoded, title: "Extracted HD Video Stream" });
        }
      }

      const imageMatches = [
        ...html.matchAll(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi),
        ...html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/gi),
        ...html.matchAll(/https?:\/\/[^"'\s]+(?:scontent|fbcdn|cdninstagram|tiktokcdn)[^"'\s]+/gi)
      ];

      for (const match of imageMatches) {
        const rawU = match[1] || match[0];
        const decoded = decodeUrl(rawU);
        if (decoded && decoded.startsWith("http") && !urlsFound.has(decoded)) {
          if (!decoded.endsWith(".js") && !decoded.endsWith(".css")) {
            urlsFound.add(decoded);
            items.push({ type: "image", url: decoded, title: "Extracted Scontent Photo" });
          }
        }
      }

      const resultObj = {
        title: lang === "vi" ? "Kết quả Phân Tích Mã Nguồn (Ctrl+U)" : "Source Code Inspection Result (Ctrl+U)",
        url: "",
        filename: `inspected_media_${Date.now()}`,
        type: "gallery" as const,
        gallery: items,
        platform: "inspector"
      };

      onChange({
        result: resultObj,
        error: items.length > 0 ? null : (lang === "vi" ? "Không tìm thấy URL video hoặc ảnh hợp lệ trong mã nguồn." : "No valid video or image URLs found in the source code.")
      });
    } catch (err: any) {
      onChange({ error: err.message || "Failed to parse HTML" });
    } finally {
      setInspectorLoading(false);
    }
  };

  // Initialize selected URLs when a new gallery is fetched
  useEffect(() => {
    if (state.result && state.result.type === "gallery" && state.result.gallery) {
      setSelectedUrls(state.result.gallery.map((item) => item.url));
    } else {
      setSelectedUrls([]);
    }
  }, [state.result]);

  // Detect social media platform from URL string
  const detectPlatform = (url: string) => {
    const lower = url.toLowerCase().trim();
    if (lower.includes("tiktok.com") || lower.includes("vt.tiktok.com")) return "tiktok";
    if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "youtube";
    if (lower.includes("instagram.com") || lower.includes("instagr.am")) return "instagram";
    if (lower.includes("facebook.com") || lower.includes("fb.watch") || lower.includes("fb.com")) return "facebook";
    if (lower.includes("threads.net") || lower.includes("threads.com")) return "threads";
    if (lower.includes("twitter.com") || lower.includes("x.com")) return "twitter";
    if (lower.includes("pinterest.com") || lower.includes("pin.it")) return "pinterest";
    if (lower.includes("vimeo.com")) return "vimeo";
    if (lower.includes("soundcloud.com")) return "soundcloud";
    return "unknown";
  };

  const platform = detectPlatform(urlInput);

  const getPlatformBadge = (plat: string) => {
    switch (plat) {
      case "tiktok":
        return { name: "TikTok", bg: "bg-black text-white dark:bg-slate-800 dark:text-cyan-400 border border-cyan-500/30", icon: "🎵" };
      case "youtube":
        return { name: "YouTube", bg: "bg-red-600 text-white shadow-xs shadow-red-600/20", icon: "▶" };
      case "instagram":
        return { name: "Instagram", bg: "bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white", icon: "📸" };
      case "facebook":
        return { name: "Facebook", bg: "bg-blue-600 text-white shadow-xs shadow-blue-600/20", icon: "📘" };
      case "threads":
        return { name: "Threads", bg: "bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-200 border border-slate-700", icon: "🧵" };
      case "twitter":
        return { name: "X / Twitter", bg: "bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-200", icon: "🐦" };
      case "pinterest":
        return { name: "Pinterest", bg: "bg-red-700 text-white", icon: "📌" };
      case "soundcloud":
        return { name: "SoundCloud", bg: "bg-orange-600 text-white", icon: "☁" };
      default:
        return { name: lang === "vi" ? "Tự động nhận diện" : "Auto Detected", bg: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300", icon: "🌐" };
    }
  };

  // Preset sample URLs for quick testing
  const sampleUrls = [
    { label: "TikTok Video", url: "https://www.tiktok.com/@tiktok/video/7106594312292453678" },
    { label: "YouTube Shorts", url: "https://www.youtube.com/shorts/J---aiyznGQ" },
    { label: "Instagram Reel", url: "https://www.instagram.com/reel/C3X9uQOvp2-/" },
    { label: "Facebook Reel", url: "https://www.facebook.com/watch/?v=10158312028882189" },
    { label: "Threads Post", url: "https://www.threads.net/@zuck/post/C8Y_example" },
  ];

  // Helper to trigger direct browser download of local blob: URL
  const triggerOnPageDownload = (downloadUrl: string, filename: string) => {
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = filename || `${platform}_${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Gallery Downloader: Individual download handler
  const downloadIndividualItem = async (url: string, index: number, type: "image" | "video") => {
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      if (!res.ok) throw new Error("Failed to download item");
      const blob = await res.blob();
      const ext = type === "video" ? "mp4" : "jpg";
      const blobUrl = URL.createObjectURL(blob);
      triggerOnPageDownload(blobUrl, `${platform}_item_${index + 1}.${ext}`);
    } catch (e) {
      console.error("Failed to download item:", e);
    }
  };

  // Gallery Downloader: Selected download handler
  const handleDownloadSelectedIndividually = async () => {
    if (!state.result || !state.result.gallery) return;
    const itemsToDownload = state.result.gallery.filter((item) => selectedUrls.includes(item.url));
    if (itemsToDownload.length === 0) return;

    setIsGalleryActionLoading(true);
    try {
      for (let i = 0; i < itemsToDownload.length; i++) {
        const item = itemsToDownload[i];
        setGalleryLoadingText(
          lang === "vi"
            ? `Đang tải tệp ${i + 1}/${itemsToDownload.length}...`
            : `Downloading item ${i + 1}/${itemsToDownload.length}...`
        );
        await downloadIndividualItem(item.url, i, item.type);
      }
    } finally {
      setIsGalleryActionLoading(false);
      setGalleryLoadingText("");
    }
  };

  // Gallery Downloader: ZIP compiler
  const handleDownloadAsZip = async () => {
    if (!state.result || !state.result.gallery) return;
    const itemsToDownload = state.result.gallery.filter((item) => selectedUrls.includes(item.url));
    if (itemsToDownload.length === 0) return;

    setIsGalleryActionLoading(true);
    setGalleryLoadingText(lang === "vi" ? "Đang chuẩn bị ZIP..." : "Preparing ZIP...");
    try {
      const zip = new JSZip();
      
      for (let i = 0; i < itemsToDownload.length; i++) {
        const item = itemsToDownload[i];
        setGalleryLoadingText(
          lang === "vi"
            ? `Đang tải tệp ${i + 1}/${itemsToDownload.length} vào ZIP...`
            : `Downloading item ${i + 1}/${itemsToDownload.length} into ZIP...`
        );

        try {
          const res = await fetch("/api/download", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: item.url })
          });
          if (!res.ok) throw new Error("Failed to fetch item");
          const blob = await res.blob();
          
          const ext = item.type === "video" ? "mp4" : "jpg";
          const filename = `media_${i + 1}.${ext}`;
          zip.file(filename, blob);
        } catch (e) {
          console.error(`Failed to add item ${i} to ZIP:`, e);
        }
      }

      setGalleryLoadingText(lang === "vi" ? "Đang nén dữ liệu tệp ZIP..." : "Compressing ZIP file...");
      const zipContent = await zip.generateAsync({ type: "blob" });
      const blobUrl = URL.createObjectURL(zipContent);
      const zipName = `${platform}_gallery_${Date.now()}.zip`;
      triggerOnPageDownload(blobUrl, zipName);
      
      setGalleryLoadingText(lang === "vi" ? "Tải xuống hoàn tất!" : "Download complete!");
    } catch (err) {
      console.error("ZIP Generation error:", err);
    } finally {
      setIsGalleryActionLoading(false);
      setGalleryLoadingText("");
    }
  };

  // Main fetch function calling our internal proxy /api/download and creating local blob
  const handleFetchMedia = async () => {
    const targetUrl = urlInput.trim();
    if (!targetUrl) {
      onChange({ error: lang === "vi" ? "Vui lòng dán liên kết video hoặc hình ảnh!" : "Please paste a video or image link!" });
      return;
    }

    onChange({ isLoading: true, error: null, result: null });
    setStreamError(false);
    setDownloadProgress(lang === "vi" ? "Đang tải luồng video về trang..." : "Downloading video stream on-page...");

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url: targetUrl,
          format: state.audioOnly ? "audio" : "video",
          quality: state.quality || "max",
          audioOnly: state.audioOnly
        })
      });

      if (!response.ok) {
        let errorText = lang === "vi"
          ? "Không thể tải luồng video từ đường link này. Vui lòng kiểm tra lại!"
          : "Failed to fetch video stream from link. Please verify the URL!";
        try {
          const errJson = await response.json();
          if (errJson.error) {
            errorText = errJson.error;
          }
        } catch {}
        throw new Error(errorText);
      }

      // Check if the response returned a multi-media JSON gallery
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const json = await response.json();
        if (json.type === "gallery") {
          const resultObj = {
            title: json.title || `${getPlatformBadge(json.platform).name} Gallery`,
            url: "",
            filename: `${json.platform}_gallery_${Date.now()}`,
            type: "gallery" as const,
            gallery: json.items,
            platform: json.platform,
          };

          const newHistory = [
            {
              id: `hist_${Date.now()}`,
              title: resultObj.title,
              url: "",
              originalUrl: targetUrl,
              platform: json.platform,
              type: "gallery" as const,
              gallery: json.items,
              date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
            ...(state.history || []).slice(0, 19),
          ];

          onChange({
            isLoading: false,
            result: resultObj,
            error: null,
            history: newHistory,
          });
          return;
        }
      }

      setDownloadProgress(lang === "vi" ? "Đang tạo bộ nhớ đệm video tại trang..." : "Generating local video buffer...");
      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error(lang === "vi" ? "Tệp video tải về bị rỗng!" : "Downloaded video stream file is empty!");
      }

      const blobUrl = URL.createObjectURL(blob);
      const isAudio = state.audioOnly;
      const ext = isAudio ? "mp3" : "mp4";
      const filename = `${platform}_${Date.now()}.${ext}`;
      const title = `${getPlatformBadge(platform).name} Media (${new Date().toLocaleDateString()})`;

      const resultObj = {
        title: title,
        url: blobUrl,
        filename: filename,
        type: isAudio ? ("audio" as const) : ("video" as const),
        platform: platform,
      };

      const newHistory = [
        {
          id: `hist_${Date.now()}`,
          title: resultObj.title,
          url: blobUrl,
          originalUrl: targetUrl,
          platform: platform,
          type: resultObj.type,
          date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
        ...(state.history || []).slice(0, 19),
      ];

      onChange({
        isLoading: false,
        result: resultObj,
        error: null,
        history: newHistory,
      });
    } catch (err: any) {
      console.error("Fetch media error:", err);
      onChange({
        isLoading: false,
        error: err.message || (lang === "vi" ? "Không thể kết nối đến máy chủ tải video." : "Failed to connect to download server.")
      });
    } finally {
      setDownloadProgress("");
    }
  };

  const handleCopyLink = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const clearHistory = () => {
    onChange({ history: [] });
  };

  const currentBadge = getPlatformBadge(platform);

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full font-sans">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-start gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <Download className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>{t("mediaDownloader.title")}</span>
              <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800">
                {t("mediaDownloader.noWatermark")}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t("mediaDownloader.subtitle")}
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-100 dark:bg-[#0B0F1A] p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab("downloader")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "downloader"
                ? "bg-white dark:bg-[#111827] text-cyan-600 dark:text-cyan-400 shadow-2xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            {t("mediaDownloader.tabDownloader")}
          </button>
          <button
            onClick={() => setActiveTab("inspector")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "inspector"
                ? "bg-white dark:bg-[#111827] text-cyan-600 dark:text-cyan-400 shadow-2xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            {t("mediaDownloader.tabInspector")}
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "history"
                ? "bg-white dark:bg-[#111827] text-cyan-600 dark:text-cyan-400 shadow-2xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            <span>{t("mediaDownloader.tabHistory")}</span>
            {(state.history || []).length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300">
                {(state.history || []).length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === "downloader" ? (
        <div className="space-y-6">
          {/* Main Link Input Card */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Link className="h-4 w-4 text-cyan-500" />
                <span>{t("mediaDownloader.inputPlaceholder")}</span>
              </label>

              {/* Detected badge */}
              {urlInput.trim() && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">{t("mediaDownloader.detectedPlatform")}:</span>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${currentBadge.bg}`}>
                    <span>{currentBadge.icon}</span>
                    <span>{currentBadge.name}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Input Row */}
            <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="url"
                  value={urlInput}
                  onChange={(e) => {
                    setUrlInput(e.target.value);
                    onChange({ url: e.target.value, error: null });
                  }}
                  placeholder={t("mediaDownloader.inputPlaceholder")}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all pr-12"
                />
                {urlInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setUrlInput("");
                      onChange({ url: "", result: null, error: null });
                      setStreamError(false);
                    }}
                    title={t("mediaDownloader.clear")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleFetchMedia}
                disabled={state.isLoading || !urlInput.trim()}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-cyan-600/20 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {state.isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>{t("mediaDownloader.processing")}</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>{t("mediaDownloader.fetch")}</span>
                  </>
                )}
              </button>
            </div>

            {/* On-Page Download Progress Indicator */}
            {state.isLoading && (
              <div className="p-4 bg-cyan-950/20 border border-cyan-500/30 rounded-xl space-y-2 animate-pulse">
                <div className="flex items-center justify-between text-xs font-bold text-cyan-400">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                    <span>{downloadProgress || (lang === "vi" ? "Đang tải luồng video về trang..." : "Downloading video stream on-page...")}</span>
                  </span>
                  <span className="text-[10px] uppercase font-mono tracking-wider">ON-PAGE PROXY</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full w-2/3 animate-pulse" />
                </div>
              </div>
            )}

            {/* Quick Demo Sample Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-semibold text-slate-400">{t("mediaDownloader.quickTry")}:</span>
              {sampleUrls.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setUrlInput(s.url);
                    onChange({ url: s.url, error: null });
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-800"
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Downloader Settings Panel */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Quality Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-cyan-500" />
                  <span>{t("mediaDownloader.videoQuality")}</span>
                </label>
                <select
                  value={state.quality || "max"}
                  onChange={(e) => onChange({ quality: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="max">{t("mediaDownloader.qualityMax")}</option>
                  <option value="1080">1080p Full HD</option>
                  <option value="720">720p HD</option>
                  <option value="480">480p SD</option>
                  <option value="360">360p Compact</option>
                </select>
              </div>

              {/* Audio Only Toggle */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Music className="h-3.5 w-3.5 text-cyan-500" />
                  <span>{t("mediaDownloader.audioOnlyLabel")}</span>
                </label>
                <button
                  type="button"
                  onClick={() => onChange({ audioOnly: !state.audioOnly })}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between border transition-all cursor-pointer ${
                    state.audioOnly
                      ? "bg-cyan-500/10 border-cyan-500 text-cyan-600 dark:text-cyan-400"
                      : "bg-slate-50 dark:bg-[#0B0F1A] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <span>{state.audioOnly ? t("mediaDownloader.audioOnly") : t("mediaDownloader.fullVideo")}</span>
                  <div className={`w-3.5 h-3.5 rounded-full border ${state.audioOnly ? "bg-cyan-500 border-cyan-500" : "border-slate-400"}`} />
                </button>
              </div>

              {/* Mute Audio Option */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Film className="h-3.5 w-3.5 text-cyan-500" />
                  <span>{t("mediaDownloader.muteLabel")}</span>
                </label>
                <button
                  type="button"
                  onClick={() => onChange({ muteAudio: !state.muteAudio })}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between border transition-all cursor-pointer ${
                    state.muteAudio
                      ? "bg-cyan-500/10 border-cyan-500 text-cyan-600 dark:text-cyan-400"
                      : "bg-slate-50 dark:bg-[#0B0F1A] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <span>{state.muteAudio ? t("mediaDownloader.muteAudio") : t("mediaDownloader.keepAudio")}</span>
                  <div className={`w-3.5 h-3.5 rounded-full border ${state.muteAudio ? "bg-cyan-500 border-cyan-500" : "border-slate-400"}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Clean Error Display */}
          {(state.error || streamError) && (
            <div className="bg-rose-950/40 border border-rose-500/30 rounded-2xl p-5 text-slate-100 space-y-2 animate-fade-in">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-rose-300">
                    {lang === "vi" ? "Lỗi tải video" : "Download Error"}
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {state.error || (lang === "vi" ? "Không thể phát luồng video trực tiếp. Vui lòng thử lại đường link khác." : "Could not play video stream directly. Please try another link.")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Download Result Card */}
          {state.result && (
            state.result.type === "gallery" ? (
              <div className="bg-white dark:bg-[#111827] border border-cyan-500/30 dark:border-cyan-500/20 rounded-2xl p-6 shadow-lg shadow-cyan-500/5 space-y-6 animate-fade-in">
                {/* Gallery Toolbar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-cyan-500" />
                      <span>{state.result.title}</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {state.result.gallery?.length || 0} items found
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Select All / Deselect All */}
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedUrls.length === state.result?.gallery?.length) {
                          setSelectedUrls([]);
                        } else {
                          setSelectedUrls(state.result?.gallery?.map((item) => item.url) || []);
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-all"
                    >
                      {selectedUrls.length === state.result?.gallery?.length
                        ? (lang === "vi" ? "Bỏ chọn tất cả" : "Deselect All")
                        : (lang === "vi" ? "Chọn tất cả" : "Select All")}
                    </button>

                    {/* Download Selected Individually */}
                    <button
                      type="button"
                      disabled={selectedUrls.length === 0 || isGalleryActionLoading}
                      onClick={handleDownloadSelectedIndividually}
                      className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>{lang === "vi" ? "Tải riêng lẻ" : "Download Selected"}</span>
                    </button>

                    {/* Download ZIP */}
                    <button
                      type="button"
                      disabled={selectedUrls.length === 0 || isGalleryActionLoading}
                      onClick={handleDownloadAsZip}
                      className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      <span>{lang === "vi" ? "Tải tệp ZIP (.zip)" : "Download ZIP (.zip)"}</span>
                    </button>
                  </div>
                </div>

                {/* Real-time Loader Indicator */}
                {isGalleryActionLoading && (
                  <div className="p-4 bg-cyan-950/20 border border-cyan-500/30 rounded-xl flex items-center gap-3 animate-pulse">
                    <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
                    <span className="text-xs font-bold text-cyan-400">
                      {galleryLoadingText || (lang === "vi" ? "Đang tải các tệp..." : "Processing files...")}
                    </span>
                  </div>
                )}

                {/* Grid Gallery */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {state.result.gallery?.map((item, idx) => {
                    const isSelected = selectedUrls.includes(item.url);
                    return (
                      <div
                        key={idx}
                        className={`group relative rounded-xl border transition-all overflow-hidden ${
                          isSelected
                            ? "border-cyan-500 bg-cyan-500/5 dark:bg-cyan-950/20"
                            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-[#0B0F1A]"
                        }`}
                      >
                        {/* Checkbox Overlay */}
                        <div className="absolute top-2.5 left-2.5 z-10">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setSelectedUrls(selectedUrls.filter((u) => u !== item.url));
                              } else {
                                setSelectedUrls([...selectedUrls, item.url]);
                              }
                            }}
                            className="h-4 w-4 rounded-sm border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                          />
                        </div>

                        {/* Thumbnail Preview */}
                        <div className="aspect-square bg-slate-100 dark:bg-slate-900 flex items-center justify-center relative overflow-hidden">
                          {item.type === "video" ? (
                            <>
                              <video
                                src={item.url}
                                className="w-full h-full object-cover"
                                preload="metadata"
                                muted
                              />
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                <div className="h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center">
                                  <Video className="h-4 w-4" />
                                </div>
                              </div>
                            </>
                          ) : (
                            <img
                              src={item.url}
                              referrerPolicy="no-referrer"
                              alt={`Item ${idx + 1}`}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                const parent = e.currentTarget.parentElement;
                                if (parent) {
                                  const placeholder = document.createElement("div");
                                  placeholder.className = "text-[10px] text-slate-400 p-2 text-center flex flex-col items-center gap-1";
                                  placeholder.innerHTML = `<span>🖼️</span><span>Photo ${idx + 1}</span>`;
                                  parent.appendChild(placeholder);
                                }
                              }}
                            />
                          )}
                        </div>

                        {/* Card Controls */}
                        <div className="p-2.5 flex items-center justify-between gap-1.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                            {item.type === "video" ? "Video" : "Photo"} {idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => downloadIndividualItem(item.url, idx, item.type)}
                            className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 cursor-pointer"
                            title={lang === "vi" ? "Tải xuống tệp này" : "Download this item"}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-[#111827] border border-cyan-500/30 dark:border-cyan-500/20 rounded-2xl p-6 shadow-lg shadow-cyan-500/5 space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-cyan-100 dark:bg-cyan-950/80 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                      {state.result.type === "audio" ? <Music className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-1">
                        {state.result.title}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {state.result.filename}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => triggerOnPageDownload(state.result!.url, state.result!.filename)}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-cyan-600/20 transition-all cursor-pointer"
                    >
                      <Download className="h-4 w-4" />
                      <span>{t("mediaDownloader.downloadDirect")}</span>
                    </button>
                  </div>
                </div>

                {/* On-Page Local Player */}
                <div className="bg-slate-950 rounded-xl overflow-hidden p-3 flex flex-col items-center justify-center min-h-[220px]">
                  {state.result.type === "audio" ? (
                    <div className="w-full max-w-md py-6 flex flex-col items-center space-y-4">
                      <div className="h-16 w-16 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center animate-pulse">
                        <Music className="h-8 w-8" />
                      </div>
                      <audio
                        controls
                        autoPlay
                        className="w-full"
                        src={state.result.url}
                        onError={() => setStreamError(true)}
                      >
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  ) : (
                    <video
                      controls
                      autoPlay
                      controlsList="nodownload"
                      className="w-full max-h-[380px] rounded-lg object-contain bg-black"
                      src={state.result.url}
                      onError={() => setStreamError(true)}
                    >
                      Your browser does not support the video tag.
                    </video>
                  )}
                </div>
              </div>
            )
          )}

          {/* Supported Platforms Info Grid */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-500" />
              <span>{t("mediaDownloader.supportedPlatforms")}</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { name: "TikTok", desc: "No Watermark MP4 / MP3", color: "from-black to-slate-800 text-cyan-400", badge: "🎵" },
                { name: "YouTube", desc: "Shorts, Videos, Audio", color: "from-red-600 to-red-700 text-white", badge: "▶" },
                { name: "Instagram", desc: "Reels, Posts, IGTV", color: "from-purple-600 to-pink-600 text-white", badge: "📸" },
                { name: "Facebook", desc: "Watch, Reels, Stories", color: "from-blue-600 to-blue-700 text-white", badge: "📘" },
                { name: "Threads", desc: "Posts, Videos, Photos", color: "from-slate-900 to-black text-white", badge: "🧵" },
              ].map((plat, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200/60 dark:border-slate-800/80 flex items-start gap-3"
                >
                  <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${plat.color} flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs`}>
                    {plat.badge}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{plat.name}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">{plat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === "inspector" ? (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <FileVideo className="h-4 w-4 text-cyan-500" />
                  <span>{t("mediaDownloader.pasteSourceTitle")}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t("mediaDownloader.pasteSourceDesc")}
                </p>
              </div>
              <button
                type="button"
                onClick={handleScanRawHtml}
                disabled={inspectorLoading || !rawHtmlInput.trim()}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-cyan-600/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {inspectorLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>{t("mediaDownloader.processing")}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>{t("mediaDownloader.scanHtml")}</span>
                  </>
                )}
              </button>
            </div>

            <textarea
              value={rawHtmlInput}
              onChange={(e) => setRawHtmlInput(e.target.value)}
              placeholder={t("mediaDownloader.htmlPlaceholder")}
              rows={10}
              className="w-full p-4 font-mono text-xs bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500 transition-all"
            />
          </div>

          {state.error && (
            <div className="bg-rose-950/40 border border-rose-500/30 rounded-2xl p-4 text-slate-100 space-y-1">
              <div className="flex items-center gap-2 text-rose-300 text-xs font-bold">
                <AlertCircle className="h-4 w-4" />
                <span>{state.error}</span>
              </div>
            </div>
          )}

          {state.result && state.result.type === "gallery" && state.result.platform === "inspector" && (
            <div className="bg-white dark:bg-[#111827] border border-cyan-500/30 dark:border-cyan-500/20 rounded-2xl p-6 shadow-lg shadow-cyan-500/5 space-y-6 animate-fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-cyan-500" />
                    <span>{state.result.title}</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {state.result.gallery?.length || 0} items extracted
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedUrls.length === state.result?.gallery?.length) {
                        setSelectedUrls([]);
                      } else {
                        setSelectedUrls(state.result?.gallery?.map((item) => item.url) || []);
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    {selectedUrls.length === state.result?.gallery?.length ? "Deselect All" : "Select All"}
                  </button>
                  <button
                    type="button"
                    disabled={selectedUrls.length === 0 || isGalleryActionLoading}
                    onClick={handleDownloadSelectedIndividually}
                    className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Selected</span>
                  </button>
                  <button
                    type="button"
                    disabled={selectedUrls.length === 0 || isGalleryActionLoading}
                    onClick={handleDownloadAsZip}
                    className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>Download ZIP (.zip)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {state.result.gallery?.map((item, idx) => {
                  const isSelected = selectedUrls.includes(item.url);
                  return (
                    <div
                      key={idx}
                      className={`group relative rounded-xl border transition-all overflow-hidden ${
                        isSelected
                          ? "border-cyan-500 bg-cyan-500/5 dark:bg-cyan-950/20"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0F1A]"
                      }`}
                    >
                      <div className="absolute top-2.5 left-2.5 z-10">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setSelectedUrls(selectedUrls.filter((u) => u !== item.url));
                            } else {
                              setSelectedUrls([...selectedUrls, item.url]);
                            }
                          }}
                          className="h-4 w-4 rounded-sm border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                        />
                      </div>
                      <div className="aspect-square bg-slate-100 dark:bg-slate-900 flex items-center justify-center relative overflow-hidden">
                        {item.type === "video" ? (
                          <video src={item.url} className="w-full h-full object-cover" preload="metadata" muted />
                        ) : (
                          <img
                            src={item.url}
                            referrerPolicy="no-referrer"
                            alt={`Extracted ${idx}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        )}
                      </div>
                      <div className="p-2.5 flex items-center justify-between gap-1.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{item.type} {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => downloadIndividualItem(item.url, idx, item.type)}
                          className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* History Tab */
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Layers className="h-4 w-4 text-cyan-500" />
              <span>{t("mediaDownloader.recentDownloads")}</span>
            </h3>

            {(state.history || []).length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                className="text-xs font-semibold text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{t("mediaDownloader.clearHistory")}</span>
              </button>
            )}
          </div>

          {(state.history || []).length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <FileVideo className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-xs">{t("mediaDownloader.emptyHistory")}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {(state.history || []).map((item) => (
                <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                      {item.type === "audio" ? (
                        <Music className="h-4 w-4" />
                      ) : item.type === "gallery" ? (
                        <Layers className="h-4 w-4" />
                      ) : (
                        <Video className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{item.title}</h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-md">
                        {item.originalUrl}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className="text-[10px] text-slate-400 font-mono mr-2">{item.date}</span>
                    {item.type === "gallery" ? (
                      <button
                        type="button"
                        onClick={() => {
                          onChange({ result: item as any });
                          setActiveTab("downloader");
                        }}
                        className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Layers className="h-3 w-3" />
                        <span>{lang === "vi" ? "Xem Bộ Sưu Tập" : "View Gallery"}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => triggerOnPageDownload(item.url, `${item.platform}_${Date.now()}.${item.type === "audio" ? "mp3" : "mp4"}`)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Download className="h-3 w-3" />
                        <span>{t("mediaDownloader.downloadDirect")}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
