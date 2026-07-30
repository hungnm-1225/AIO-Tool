import React, { useState, useEffect } from "react";
import { useI18n } from "../utils/i18n";
import { MAIN_MENU_ITEMS, MainMenuItem, SubMenuItem, navigateTo } from "../utils/navigation";
import { 
  Sliders,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Globe,
  X,
  Sun,
  Moon,
  Sparkles
} from "lucide-react";

interface SidebarProps {
  currentMainSlug: string;
  currentSubSlug: string;
  theme: "dark" | "light";
  toggleTheme: () => void;
  onCloseMobileDrawer?: () => void;
}

export default function Sidebar({
  currentMainSlug,
  currentSubSlug,
  theme,
  toggleTheme,
  onCloseMobileDrawer,
}: SidebarProps) {
  const { lang, setLang, t } = useI18n();

  // Collapsed sidebar state (narrow vs wide)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("sidebar-collapsed") === "true";
  });

  // Accordion state: Record of mainSlug -> boolean (Default: all closed)
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setExpandedMenus({ [currentMainSlug]: true });
  }, [currentMainSlug]);

  const handleToggleCollapse = () => {
    const nextVal = !isCollapsed;
    setIsCollapsed(nextVal);
    localStorage.setItem("sidebar-collapsed", String(nextVal));
  };

  const toggleMainAccordion = (item: MainMenuItem) => {
    const isCurrentlyOpen = !!expandedMenus[item.mainSlug];
    if (isCurrentlyOpen) {
      setExpandedMenus({});
    } else {
      setExpandedMenus({ [item.mainSlug]: true });
      if (currentMainSlug !== item.mainSlug) {
        navigateTo(`/${item.mainSlug}/${item.submenus[0].subSlug}`);
      }
    }
  };

  const handleSubmenuClick = (mainSlug: string, subSlug: string) => {
    navigateTo(`/${mainSlug}/${subSlug}`);
    if (onCloseMobileDrawer) {
      onCloseMobileDrawer();
    }
  };

  const getMainActiveStyles = (mainSlug: string) => {
    switch (mainSlug) {
      case "text-suite":
      case "xu-ly-van-ban":
        return {
          bg: "bg-indigo-50 dark:bg-indigo-600/10",
          text: "text-indigo-600 dark:text-indigo-400",
          border: "border-indigo-100 dark:border-indigo-500/20",
          subActiveBg: "bg-indigo-100/70 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 font-semibold"
        };
      case "web-data-html":
      case "du-lieu-va-html":
        return {
          bg: "bg-sky-50 dark:bg-sky-600/10",
          text: "text-sky-600 dark:text-sky-400",
          border: "border-sky-100 dark:border-sky-500/20",
          subActiveBg: "bg-sky-100/70 dark:bg-sky-600/20 text-sky-700 dark:text-sky-300 font-semibold"
        };
      case "excel-suite":
      case "bo-cong-cu-excel":
        return {
          bg: "bg-emerald-50 dark:bg-emerald-600/10",
          text: "text-emerald-600 dark:text-emerald-400",
          border: "border-emerald-100 dark:border-emerald-500/20",
          subActiveBg: "bg-emerald-100/70 dark:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 font-semibold"
        };
      case "pdf-suite":
      case "quet-tai-lieu":
        return {
          bg: "bg-rose-50 dark:bg-rose-600/10",
          text: "text-rose-600 dark:text-rose-400",
          border: "border-rose-100 dark:border-rose-500/20",
          subActiveBg: "bg-rose-100/70 dark:bg-rose-600/20 text-rose-700 dark:text-rose-300 font-semibold"
        };
      case "file-manager":
      case "quan-ly-tep":
        return {
          bg: "bg-amber-50 dark:bg-amber-600/10",
          text: "text-amber-600 dark:text-amber-400",
          border: "border-amber-100 dark:border-amber-500/20",
          subActiveBg: "bg-amber-100/70 dark:bg-amber-600/20 text-amber-700 dark:text-amber-300 font-semibold"
        };
      default:
        return {
          bg: "bg-indigo-50 dark:bg-indigo-600/10",
          text: "text-indigo-600 dark:text-indigo-400",
          border: "border-indigo-100 dark:border-indigo-500/20",
          subActiveBg: "bg-indigo-100/70 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 font-semibold"
        };
    }
  };

  return (
    <aside className={`${isCollapsed ? "w-[76px]" : "w-72"} transition-all duration-300 flex-shrink-0 border-r border-slate-200 bg-white dark:border-slate-800/80 dark:bg-[#111827] flex flex-col justify-between h-full select-none`}>
      {/* Top Header & Brand */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
        {isCollapsed ? (
          <div className="p-4 flex flex-col items-center gap-4 border-b border-slate-100 dark:border-slate-800/60">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <Sliders className="h-5 w-5" />
            </div>

            {/* Language Switcher Collapsed */}
            <button
              onClick={() => setLang(lang === "vi" ? "en" : "vi")}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={lang === "vi" ? "Switch to English" : "Chuyển sang Tiếng Việt"}
            >
              {lang === "vi" ? "🇻🇳 VI" : "🇺🇸 EN"}
            </button>

            <div className="flex flex-col items-center gap-2">
              {onCloseMobileDrawer && (
                <button
                  onClick={onCloseMobileDrawer}
                  className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
                  title="Close Menu"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              )}
              <button
                onClick={handleToggleCollapse}
                className="hidden md:inline-flex p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
                title="Expand Sidebar"
              >
                <ChevronRight className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 border-b border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold font-sans tracking-tight text-slate-800 dark:text-slate-100">
                    AIO Tool
                  </h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full font-bold">
                      v2.8.3
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {onCloseMobileDrawer && (
                  <button
                    onClick={onCloseMobileDrawer}
                    className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
                    title="Close Menu"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                )}
                <button
                  onClick={handleToggleCollapse}
                  className="hidden md:inline-flex p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
                  title="Collapse Sidebar"
                >
                  <ChevronLeft className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* Language Switcher Expanded */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Globe className="h-4 w-4 text-indigo-500" />
                <span>{t("common.language")}</span>
              </div>
              <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setLang("vi")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    lang === "vi"
                      ? "bg-white dark:bg-indigo-600 text-slate-800 dark:text-white shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  🇻🇳 VI
                </button>
                <button
                  type="button"
                  onClick={() => setLang("en")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    lang === "en"
                      ? "bg-white dark:bg-indigo-600 text-slate-800 dark:text-white shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  🇺🇸 EN
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Collapsible Accordion Navigation List */}
        <div className={`p-3 space-y-1.5 ${isCollapsed ? "flex flex-col items-center" : ""}`}>
          {MAIN_MENU_ITEMS.map((item) => {
            const MainIcon = item.icon;
            const isMainActive = currentMainSlug === item.mainSlug;
            // Expanded if manually toggled OR if active main menu
            const isExpanded = expandedMenus[item.mainSlug] !== undefined 
              ? expandedMenus[item.mainSlug] 
              : isMainActive;
            const activeColor = getMainActiveStyles(item.mainSlug);

            const mainLabel = lang === "vi" ? item.labelVi : item.labelEn;

            if (isCollapsed) {
              return (
                <div key={item.mainSlug} className="relative group">
                  <button
                    onClick={() => {
                      navigateTo(`/${item.mainSlug}/${item.submenus[0].subSlug}`);
                    }}
                    className={`h-11 w-11 flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer ${
                      isMainActive
                        ? `${activeColor.bg} ${activeColor.text} border ${activeColor.border}`
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent"
                    }`}
                    title={mainLabel}
                  >
                    <MainIcon className="h-5 w-5" />
                  </button>
                </div>
              );
            }

            return (
              <div key={item.mainSlug} className="rounded-xl border border-transparent transition-all">
                {/* Main Menu Header Button */}
                <button
                  type="button"
                  onClick={() => toggleMainAccordion(item)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all duration-200 group cursor-pointer text-left ${
                    isMainActive
                      ? `${activeColor.bg} ${activeColor.text} border ${activeColor.border}`
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div className={`p-1 rounded-lg transition-colors ${
                      isMainActive
                        ? activeColor.text
                        : "text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200"
                    }`}>
                      <MainIcon className="h-4.5 w-4.5" />
                    </div>
                    <div className="text-xs font-bold leading-tight text-slate-800 dark:text-slate-100 truncate">
                      {mainLabel}
                    </div>
                  </div>

                  {/* Accordion Arrow Toggle */}
                  <div className={`p-1 rounded-md text-slate-400 transition-transform duration-300 ${
                    isExpanded ? "rotate-180 text-slate-600 dark:text-slate-300" : ""
                  }`}>
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </button>

                {/* Submenus Accordion Grid (Smooth CSS Grid Transition) */}
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    isExpanded ? "grid-rows-[1fr] opacity-100 mt-1" : "grid-rows-[0fr] opacity-0 pointer-events-none"
                  }`}
                >
                  <div className="overflow-hidden pl-3 space-y-0.5">
                    <div className="border-l-2 border-slate-200 dark:border-slate-800 pl-2 space-y-0.5 my-1">
                      {item.submenus.map((sub: SubMenuItem) => {
                        const SubIcon = sub.icon;
                        const isSubActive = isMainActive && currentSubSlug === sub.subSlug;
                        const subLabel = lang === "vi" ? sub.labelVi : sub.labelEn;

                        return (
                          <button
                            key={sub.subSlug}
                            type="button"
                            onClick={() => handleSubmenuClick(item.mainSlug, sub.subSlug)}
                            className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all duration-150 cursor-pointer ${
                              isSubActive
                                ? activeColor.subActiveBg
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                            }`}
                          >
                            <div className={`${isSubActive ? activeColor.text : "text-slate-400 dark:text-slate-500"}`}>
                              <SubIcon className="h-3.5 w-3.5" />
                            </div>
                            <div className="text-[12px] font-medium truncate">
                              {subLabel}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer / Theme Toggle Section */}
      {isCollapsed ? (
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20 flex flex-col items-center justify-center">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-xs cursor-pointer"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-indigo-600" />
            )}
          </button>
        </div>
      ) : (
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <div className="flex flex-col">
                <span className="text-[10px] font-mono font-medium tracking-wide uppercase">
                  {theme === "dark" ? t("common.darkWorkspace") : t("common.lightWorkspace")}
                </span>
              </div>
            </div>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-xs cursor-pointer"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-indigo-600" />
              )}
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
