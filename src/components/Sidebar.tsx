import React, { useState } from "react";
import { ActiveModule } from "../types";
import { 
  FileText, 
  GitCompare, 
  Terminal, 
  FileSpreadsheet,
  Layers,
  Sun, 
  Moon, 
  Sliders,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X
} from "lucide-react";

interface SidebarProps {
  activeModule: ActiveModule;
  setActiveModule: (module: ActiveModule) => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
  onCloseMobileDrawer?: () => void;
}

export default function Sidebar({
  activeModule,
  setActiveModule,
  theme,
  toggleTheme,
  onCloseMobileDrawer,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("sidebar-collapsed") === "true";
  });

  const handleToggleCollapse = () => {
    const nextVal = !isCollapsed;
    setIsCollapsed(nextVal);
    localStorage.setItem("sidebar-collapsed", String(nextVal));
  };

  const menuItems = [
    {
      id: ActiveModule.TEXT_UTILS,
      label: "Text & Duplicates",
      description: "Counter, filters, sorting & regex search",
      icon: FileText,
      hashId: "case-converter",
    },
    {
      id: ActiveModule.COMPARE_MERGE,
      label: "Compare & Merge",
      description: "Diff checker, column joiner & auto-inc",
      icon: GitCompare,
      hashId: "compare-text",
    },
    {
      id: ActiveModule.DATA_CONVERTER,
      label: "Data & HTML Runner",
      description: "Format, JSON-Grid, HTML Live Preview",
      icon: Terminal,
      hashId: "formatter",
    },
    {
      id: ActiveModule.EXCEL_SPLITTER,
      label: "Excel Account Suite",
      description: "Split, validate, merge & extract credentials",
      icon: FileSpreadsheet,
      hashId: "excel-splitter",
    }
  ];

  return (
    <aside className={`${isCollapsed ? "w-[76px]" : "w-80"} transition-all duration-200 flex-shrink-0 border-r border-slate-200 bg-white dark:border-slate-800/80 dark:bg-[#111827] flex flex-col justify-between h-full`}>
      {/* Top Brand Block */}
      <div>
        {isCollapsed ? (
          <div className="p-4 flex flex-col items-center gap-5">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <Sliders className="h-5 w-5" />
            </div>
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
          <div className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold font-sans tracking-tight text-slate-800 dark:text-slate-100">
                    Vibe Code AIO
                  </h1>
                  <span className="text-xs font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
                    Dev Workspace v1.0.0
                  </span>
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
          </div>
        )}

        {/* Navigation Items */}
        <div className={`px-4 ${isCollapsed ? "mt-2 space-y-2 flex flex-col items-center" : "mt-2 space-y-1.5"}`}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeModule === item.id ||
              (item.id === ActiveModule.EXCEL_SPLITTER &&
                activeModule === ActiveModule.EXCEL_MERGER);
                        if (isCollapsed) {
              return (
                <button
                  key={item.id}
                  id={item.hashId}
                  onClick={() => setActiveModule(item.id)}
                  className={`h-11 w-11 flex items-center justify-center rounded-xl transition-all duration-200 group relative cursor-pointer ${
                    isActive
                      ? "bg-indigo-50 dark:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent"
                  }`}
                  title={item.label}
                >
                  <Icon className="h-5 w-5" />
                </button>
              );
            }

            return (
              <button
                key={item.id}
                id={item.hashId}
                onClick={() => setActiveModule(item.id)}
                className={`w-full flex items-start gap-3.5 p-3.5 rounded-xl text-left transition-all duration-200 group cursor-pointer ${
                  isActive
                    ? "bg-indigo-50 dark:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent"
                }`}
              >
                <div className={`mt-0.5 p-1 rounded-lg transition-colors ${
                  isActive 
                    ? "text-indigo-600 dark:text-indigo-400" 
                    : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                }`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-none mb-1 text-slate-800 dark:text-slate-200">
                    {item.label}
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 truncate leading-normal">
                    {item.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer / Settings Section */}
      {isCollapsed ? (
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20 flex flex-col items-center justify-center">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-sm cursor-pointer"
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
        <div className="p-6 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-mono font-medium tracking-wide uppercase">
                {theme === "dark" ? "Dark Workspace" : "Light Workspace"}
              </span>
            </div>

            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-sm cursor-pointer"
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
