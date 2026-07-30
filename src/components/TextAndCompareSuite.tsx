import React from "react";
import { TextUtilsState, CompareMergeState, ActiveModule } from "../types";
import { useI18n } from "../utils/i18n";
import TextUtilities from "./TextUtilities";
import CompareMerge from "./CompareMerge";
import { MAIN_MENU_ITEMS } from "../utils/navigation";

interface TextAndCompareSuiteProps {
  textState: TextUtilsState;
  onTextChange: (newState: Partial<TextUtilsState>) => void;
  compareState: CompareMergeState;
  onCompareChange: (newState: Partial<CompareMergeState>) => void;
  subSlug?: string;
}

export default function TextAndCompareSuite({
  textState,
  onTextChange,
  compareState,
  onCompareChange,
  subSlug = "chuyen-doi-kieu-chu",
}: TextAndCompareSuiteProps) {
  const { lang } = useI18n();

  // Find active sub-item info from MAIN_MENU_ITEMS
  const mainItem = MAIN_MENU_ITEMS.find((m) => m.mainSlug === "text-suite" || m.mainSlug === "xu-ly-van-ban" || m.module === ActiveModule.TEXT_SUITE);
  const activeSub = mainItem?.submenus.find((s) => s.subSlug === subSlug) || mainItem?.submenus[0];

  const SubIcon = activeSub?.icon;
  const subTitle = lang === "vi" ? activeSub?.labelVi : activeSub?.labelEn;
  const subDesc = lang === "vi" ? activeSub?.descriptionVi : activeSub?.descriptionEn;

  // Determine component view
  const isCompareMerge = 
    subSlug === "so-sanh-ma-diff" || 
    subSlug === "ghep-cot" || 
    subSlug === "tu-dong-tang-so" ||
    subSlug === "diff-checker" ||
    subSlug === "column-joiner" ||
    subSlug === "auto-increasement-generator";

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-[#0B0F1A]">
      {/* Unified Single Header Bar for Text Utilities Suite (Indigo color) */}
      <div className="bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800/80 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
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

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        {!isCompareMerge ? (
          <TextUtilities hideInnerHeader subSlug={subSlug} state={textState} onChange={onTextChange} />
        ) : (
          <CompareMerge hideInnerHeader subSlug={subSlug} state={compareState} onChange={onCompareChange} />
        )}
      </div>
    </div>
  );
}
