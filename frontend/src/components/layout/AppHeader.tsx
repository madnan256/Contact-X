import { useLayout } from "@/contexts/LayoutContext";
import { useTranslation } from "@/hooks/useTranslation";
import { Sun, Moon, Globe, ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useLocation } from "react-router-dom";

const pageTitleKeys: Record<string, string> = {
  "/": "page.dashboard",
  "/contacts": "page.contacts",
  "/entities": "page.entities",
  "/duplicates": "page.duplicates",
  "/analytics": "page.analytics",
  "/executive": "page.executive",
  "/governance": "page.governance",
};

export default function AppHeader() {
  const { toggleSidebar, toggleDir, toggleTheme, toggleCollapse, sidebarCollapsed, theme, dir, pageTitle: contextPageTitle } = useLayout();
  const { t } = useTranslation();
  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const titleKey = pageTitleKeys[location.pathname] || "";
  const pageTitle = contextPageTitle || (titleKey ? t(titleKey) : pathSegments[pathSegments.length - 1] || t("page.dashboard"));

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        {/* Collapse toggle - desktop only */}
        <button
          onClick={toggleCollapse}
          className="hidden rounded-lg p-2 text-muted-foreground hover:bg-muted lg:inline-flex"
          title={t("header.collapse")}
        >
          {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="hidden sm:inline">{t("header.home")}</span>
          <ChevronRight className="hidden h-3.5 w-3.5 sm:inline rtl:rotate-180" />
          <span className="font-medium text-foreground">{pageTitle}</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title={t("header.toggleTheme")}
        >
          {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </button>
        <button
          onClick={toggleDir}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title={t("header.toggleDir")}
        >
          <Globe className="h-4 w-4" />
          <span>{dir === "ltr" ? "AR" : "EN"}</span>
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          AD
        </div>
      </div>
    </header>
  );
}
