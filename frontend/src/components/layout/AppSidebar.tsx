import { useLocation, Link, useNavigate } from "react-router-dom";
import { useLayout } from "@/contexts/LayoutContext";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Users,
  Building2,
  GitCompare,
  Search,
  ClipboardList,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { labelKey: "nav.dashboard", icon: LayoutDashboard, path: "/" },
  { labelKey: "nav.contacts", icon: Users, path: "/contacts" },
  { labelKey: "nav.entities", icon: Building2, path: "/entities" },
  { labelKey: "nav.duplicates", icon: GitCompare, path: "/duplicates" },
  { labelKey: "nav.search", icon: Search, path: "/search" },
  { labelKey: "audit.title", icon: ClipboardList, path: "/audit-logs" },
];

export default function AppSidebar() {
  const { sidebarOpen, sidebarCollapsed, toggleSidebar, dir } = useLayout();
  const { t } = useTranslation();
  const location = useLocation();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      {/* Sidebar - desktop only */}
      <aside
        className={cn(
          "hidden lg:sticky lg:top-0 lg:flex h-screen flex-col border-border bg-sidebar transition-all duration-300",
          dir === "rtl" ? "right-0 border-l" : "left-0 border-r",
          sidebarCollapsed ? "w-20" : "w-[280px]"
        )}
      >
        {/* Logo area */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
          {!sidebarCollapsed && (
            <span className="text-lg font-bold text-foreground">Contacts X</span>
          )}
          {sidebarCollapsed && (
            <span className="mx-auto text-lg font-bold text-primary">CX</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const active = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => sidebarOpen && toggleSidebar()}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-foreground",
                  sidebarCollapsed && "justify-center px-2"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!sidebarCollapsed && <span>{t(item.labelKey)}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-border p-3">
          <button
            onClick={handleLogout}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-hover hover:text-foreground transition-colors",
              sidebarCollapsed && "justify-center px-2"
            )}
            data-testid="button-logout"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
