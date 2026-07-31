// Session Storage and Memory Cache Helper for AIO Tool
// Data stored in window cache and sessionStorage persists across tab/menu navigation
// but is automatically cleared when the browser tab/session is closed.

if (typeof window !== "undefined") {
  (window as any).__session_file_cache = (window as any).__session_file_cache || {};
}

// Helper to recursively strip out huge Uint8Array / ArrayBuffer / DOM objects before JSON.stringify
function sanitizeForSessionStorage(obj: any, depth = 0): any {
  if (depth > 5 || obj === null || obj === undefined) return obj;
  if (obj instanceof Uint8Array || obj instanceof ArrayBuffer) {
    return null; // Omit raw byte arrays from sessionStorage
  }
  if (typeof HTMLCanvasElement !== "undefined" && obj instanceof HTMLCanvasElement) {
    return null;
  }
  if (typeof HTMLImageElement !== "undefined" && obj instanceof HTMLImageElement) {
    return null;
  }
  if (obj instanceof File) {
    return { name: obj.name, size: obj.size, type: obj.type, lastModified: obj.lastModified };
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForSessionStorage(item, depth + 1));
  }
  if (typeof obj === "object") {
    const sanitized: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      if (
        key === "originalPdfBytes" ||
        key === "pdfBytes" ||
        key === "originalCanvas" ||
        key === "processedCanvas" ||
        key === "warpedCanvas" ||
        key === "originalImage"
      ) {
        continue; // Exclude heavy DOM elements / canvas / bytes from sessionStorage stringification
      }
      sanitized[key] = sanitizeForSessionStorage(obj[key], depth + 1);
    }
    return sanitized;
  }
  return obj;
}

// Generic Data Session Helper
export function saveSessionData<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    // Keep full rich object reference in fast in-memory cache
    (window as any).__session_file_cache[key] = data;

    // Sanitize heavy binary buffers before writing to sessionStorage
    const lightData = sanitizeForSessionStorage(data);
    sessionStorage.setItem(key, JSON.stringify(lightData));
  } catch (e) {
    console.warn(`Error saving session data for ${key}:`, e);
  }
}

export function getSessionData<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const mem = (window as any).__session_file_cache[key];
    if (mem !== undefined && mem !== null) return mem as T;

    const stored = sessionStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      (window as any).__session_file_cache[key] = parsed;
      return parsed as T;
    }
  } catch (e) {
    console.warn(`Error reading session data for ${key}:`, e);
  }
  return fallback;
}

export function clearSessionData(key: string): void {
  if (typeof window === "undefined") return;
  delete (window as any).__session_file_cache[key];
  sessionStorage.removeItem(key);
}

// PDF Utilities Suite Specific Session Store Wrappers using sessionHelper
export const pdfSessionStore = {
  getMerge: () => getSessionData<any>("pdf_merge_data", null),
  setMerge: (data: any) => saveSessionData("pdf_merge_data", data),
  clearMerge: () => clearSessionData("pdf_merge_data"),

  getSplit: () => getSessionData<any>("pdf_split_data", null),
  setSplit: (data: any) => saveSessionData("pdf_split_data", data),
  clearSplit: () => clearSessionData("pdf_split_data"),

  getEdit: () => getSessionData<any>("pdf_edit_data", null),
  setEdit: (data: any) => saveSessionData("pdf_edit_data", data),
  clearEdit: () => clearSessionData("pdf_edit_data"),

  getScanner: () => getSessionData<any>("pdf_scanner_data", null),
  setScanner: (data: any) => saveSessionData("pdf_scanner_data", data),
  clearScanner: () => clearSessionData("pdf_scanner_data"),
};
