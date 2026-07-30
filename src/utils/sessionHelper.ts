// Keep actual File objects and related complex assets in a global memory cache that persists across component unmounts
if (typeof window !== "undefined") {
  (window as any).__session_file_cache = (window as any).__session_file_cache || {};
}

export function saveSessionFiles(key: string, files: File[]) {
  if (typeof window === "undefined") return;
  const cache = (window as any).__session_file_cache;
  cache[key] = files;
  
  // Save serializable metadata to sessionStorage
  const metadata = files.map(f => ({
    name: f.name,
    type: f.type,
    size: f.size,
    lastModified: f.lastModified
  }));
  sessionStorage.setItem(`${key}_metadata`, JSON.stringify(metadata));
}

export function getSessionFiles(key: string): File[] {
  if (typeof window === "undefined") return [];
  const cache = (window as any).__session_file_cache;
  if (cache[key] && cache[key].length > 0) {
    return cache[key];
  }
  
  // Fallback: If memory cache is lost (e.g. reload) but metadata exists, we can reconstruct File objects
  const metaStr = sessionStorage.getItem(`${key}_metadata`);
  if (metaStr) {
    try {
      const metadata = JSON.parse(metaStr);
      return metadata.map((m: any) => {
        const blob = new Blob([""], { type: m.type });
        return new File([blob], m.name, { type: m.type, lastModified: m.lastModified });
      });
    } catch (e) {
      return [];
    }
  }
  return [];
}

export function clearSessionFiles(key: string) {
  if (typeof window === "undefined") return;
  const cache = (window as any).__session_file_cache;
  delete cache[key];
  sessionStorage.removeItem(`${key}_metadata`);
}

export function saveSessionData<T>(key: string, data: T) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(key, JSON.stringify(data));
}

export function getSessionData<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const val = sessionStorage.getItem(key);
  if (val) {
    try {
      return JSON.parse(val);
    } catch (e) {
      return fallback;
    }
  }
  return fallback;
}

export function clearSessionData(key: string) {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(key);
}
