import React from "react";
import { ExcelSplitterState, ExcelMergerState, DirAggregatorState, ActiveModule } from "../types";
import { useI18n } from "../utils/i18n";
import ExcelSplitterValidator from "./ExcelSplitterValidator";
import ExcelMergerExtractor from "./ExcelMergerExtractor";
import DirectoryAggregator from "./DirectoryAggregator";
import { MAIN_MENU_ITEMS } from "../utils/navigation";

interface ExcelSuiteProps {
  splitterState: ExcelSplitterState;
  onSplitterChange: (newState: Partial<ExcelSplitterState>) => void;
  mergerState: ExcelMergerState;
  onMergerChange: (newState: Partial<ExcelMergerState>) => void;
  dirAggregatorState?: DirAggregatorState;
  onDirAggregatorChange?: (newState: Partial<DirAggregatorState>) => void;
  subSlug?: string;
}

export default function ExcelSuite({
  splitterState,
  onSplitterChange,
  mergerState,
  onMergerChange,
  dirAggregatorState,
  onDirAggregatorChange,
  subSlug = "tach-va-kiem-tra-loi",
}: ExcelSuiteProps) {
  const { lang } = useI18n();

  // Find active sub-item info from MAIN_MENU_ITEMS
  const mainItem = MAIN_MENU_ITEMS.find((m) => m.mainSlug === "excel-suite" || m.mainSlug === "bo-cong-cu-excel" || m.module === ActiveModule.EXCEL_SUITE);
  const activeSub = mainItem?.submenus.find((s) => s.subSlug === subSlug) || mainItem?.submenus[0];

  const SubIcon = activeSub?.icon;
  const subTitle = lang === "vi" ? activeSub?.labelVi : activeSub?.labelEn;
  const subDesc = lang === "vi" ? activeSub?.descriptionVi : activeSub?.descriptionEn;

  const isMerger = subSlug === "merge-and-extract-account" || subSlug === "gop-va-trich-xuat-account";
  const isAggregator = subSlug === "directory-aggregator" || subSlug === "gop-thu-muc-xlsx-csv";
  const isSplitter = subSlug === "split-and-validate" || subSlug === "tach-va-kiem-tra-loi" || (!isMerger && !isAggregator);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-[#0B0F1A]">
      {/* Unified Single Header Bar for Excel Suite (Emerald color) */}
      <div className="bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800/80 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
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

      {/* Active Component Container */}
      <div className="flex-1 overflow-auto">
        {isSplitter && (
          <ExcelSplitterValidator hideInnerHeader state={splitterState} onChange={onSplitterChange} />
        )}
        {isMerger && (
          <ExcelMergerExtractor hideInnerHeader state={mergerState} onChange={onMergerChange} />
        )}
        {isAggregator && (
          <DirectoryAggregator hideInnerHeader state={dirAggregatorState} onChange={onDirAggregatorChange} />
        )}
      </div>
    </div>
  );
}
