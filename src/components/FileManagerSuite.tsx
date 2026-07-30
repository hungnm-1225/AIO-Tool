import React from "react";
import { FileRenamerState, FileMetadataState } from "../types";
import { useI18n } from "../utils/i18n";
import FileRenamer from "./FileRenamer";
import FileMetadataEditor from "./FileMetadataEditor";
import FileConverter from "./FileConverter";
import { MAIN_MENU_ITEMS } from "../utils/navigation";

interface FileManagerSuiteProps {
  renamerState: FileRenamerState;
  onRenamerChange: (newState: Partial<FileRenamerState>) => void;
  metadataState?: FileMetadataState;
  onMetadataChange?: (newState: Partial<FileMetadataState>) => void;
  subSlug?: string;
}

export default function FileManagerSuite({
  renamerState,
  onRenamerChange,
  metadataState,
  onMetadataChange,
  subSlug = "batch-file-renamer",
}: FileManagerSuiteProps) {
  const { lang } = useI18n();

  // Find active sub-item info from MAIN_MENU_ITEMS
  const mainItem = MAIN_MENU_ITEMS.find((m) => m.mainSlug === "file-manager");
  const activeSub = mainItem?.submenus.find((s) => s.subSlug === subSlug) || mainItem?.submenus[0];

  const SubIcon = activeSub?.icon;
  const subTitle = lang === "vi" ? activeSub?.labelVi : activeSub?.labelEn;
  const subDesc = lang === "vi" ? activeSub?.descriptionVi : activeSub?.descriptionEn;

  const isRenamer = subSlug === "batch-file-renamer";
  const isMetadata = subSlug === "metadata-timestamp-editor";
  const isConverter = subSlug === "universal-file-converter";

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-[#0B0F1A]">
      {/* Unified Single Header Bar for File Manager Suite (Amber color) */}
      <div className="bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800/80 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
            {SubIcon && <SubIcon className="h-5 w-5" />}
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{subTitle}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {subDesc}
            </p>
          </div>
        </div>
      </div>

      {/* Active Sub-Component View */}
      <div className="flex-1 overflow-auto">
        {isRenamer && (
          <FileRenamer hideInnerHeader state={renamerState} onChange={onRenamerChange} />
        )}
        {isMetadata && (
          <FileMetadataEditor hideInnerHeader state={metadataState} onChange={onMetadataChange} />
        )}
        {isConverter && (
          <FileConverter hideInnerHeader subSlug={subSlug} />
        )}
      </div>
    </div>
  );
}
