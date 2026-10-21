import { useEffect, useState, DragEvent } from "react";
import { toast } from "react-toastify";

export interface UseFilePasteOptions {
  /**
   * Accepted file extensions (e.g. [".xlsx", ".xls", ".csv"] or ["pdf"] or ["*"])
   */
  acceptedExtensions?: string[];
  /**
   * Callback invoked when valid files are pasted
   */
  onFilesPasted: (files: File[]) => void;
  /**
   * Whether the paste listener is currently enabled (default: true)
   */
  enabled?: boolean;
  /**
   * Language for toast notification ("vi" | "en")
   */
  lang?: "vi" | "en";
}

/**
 * Checks if a file matches the allowed extensions
 */
export function isFileAccepted(file: File, acceptedExtensions?: string[]): boolean {
  if (!acceptedExtensions || acceptedExtensions.length === 0 || acceptedExtensions.includes("*")) {
    return true;
  }
  const fileName = file.name.toLowerCase();
  return acceptedExtensions.some((ext) => {
    const cleanExt = ext.toLowerCase().startsWith(".") ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
    return fileName.endsWith(cleanExt);
  });
}

/**
 * Custom React hook that listens for Ctrl+V / Command+V file pasting from Windows Explorer or Clipboard
 */
export function useFilePaste({
  acceptedExtensions,
  onFilesPasted,
  enabled = true,
  lang = "vi",
}: UseFilePasteOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handlePaste = (e: ClipboardEvent) => {
      // Don't intercept if clipboard has no files
      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      const items = clipboardData.items;
      const fileList = clipboardData.files;

      const extractedFiles: File[] = [];

      // Check clipboard files first
      if (fileList && fileList.length > 0) {
        for (let i = 0; i < fileList.length; i++) {
          const file = fileList[i];
          if (file) extractedFiles.push(file);
        }
      } else if (items && items.length > 0) {
        // Fallback to clipboard items
        for (let i = 0; i < items.length; i++) {
          if (items[i].kind === "file") {
            const file = items[i].getAsFile();
            if (file) extractedFiles.push(file);
          }
        }
      }

      // If no files in clipboard, ignore and let normal text paste proceed
      if (extractedFiles.length === 0) return;

      // Filter files if acceptedExtensions is provided
      const validFiles = extractedFiles.filter((f) => isFileAccepted(f, acceptedExtensions));

      if (validFiles.length === 0 && extractedFiles.length > 0 && acceptedExtensions) {
        toast.warning(
          lang === "vi"
            ? `Định dạng tệp dán không phù hợp! Chỉ chấp nhận: ${acceptedExtensions.join(", ")}`
            : `Pasted file format not accepted! Supported: ${acceptedExtensions.join(", ")}`
        );
        return;
      }

      if (validFiles.length > 0) {
        e.preventDefault();
        e.stopPropagation();

        toast.success(
          lang === "vi"
            ? `📋 Đã dán ${validFiles.length} tệp từ clipboard!`
            : `📋 Pasted ${validFiles.length} file(s) from clipboard!`
        );

        onFilesPasted(validFiles);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [acceptedExtensions, onFilesPasted, enabled, lang]);
}

/**
 * Helper hook for standardizing Drag & Drop zones with visual state
 */
export function useDropzone({
  onFilesDropped,
  acceptedExtensions,
  lang = "vi",
  disabled = false,
}: {
  onFilesDropped: (files: File[]) => void;
  acceptedExtensions?: string[];
  lang?: "vi" | "en";
  disabled?: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    if (!isDragging) setIsDragging(true);
  };

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only deactivate if leaving the container element entirely
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    const dataTransfer = e.dataTransfer;
    if (!dataTransfer || !dataTransfer.files || dataTransfer.files.length === 0) return;

    const files = Array.from(dataTransfer.files) as File[];
    const validFiles = files.filter((f) => isFileAccepted(f, acceptedExtensions));

    if (validFiles.length === 0 && files.length > 0 && acceptedExtensions) {
      toast.warning(
        lang === "vi"
          ? `Định dạng tệp kéo thả không phù hợp! Chỉ chấp nhận: ${acceptedExtensions.join(", ")}`
          : `Dropped file format not accepted! Supported: ${acceptedExtensions.join(", ")}`
      );
      return;
    }

    if (validFiles.length > 0) {
      onFilesDropped(validFiles);
    }
  };

  return {
    isDragging,
    dropzoneProps: {
      onDragOver: handleDragOver,
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}
