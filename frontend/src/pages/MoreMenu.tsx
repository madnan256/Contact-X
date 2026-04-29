import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { Search, ChevronRight, ClipboardList, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const moreItems = [
  { labelKey: "nav.search", icon: Search, path: "/search" },
  { labelKey: "audit.title", icon: ClipboardList, path: "/audit-logs" },
];

export default function MoreMenu() {
  const { t, dir } = useTranslation();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="page-container">
      <h1 className="mb-4 text-xl font-semibold text-foreground">{t("nav.more")}</h1>
      <div className="space-y-2">
        {moreItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <item.icon className="h-5 w-5" />
            </div>
            <span className="flex-1 text-sm font-medium text-foreground">{t(item.labelKey)}</span>
            <ChevronRight className={cn("h-4 w-4 text-muted-foreground", dir === "rtl" && "rotate-180")} />
          </Link>
        ))}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted"
          data-testid="button-logout-mobile"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <LogOut className="h-5 w-5" />
          </div>
          <span className="flex-1 text-left text-sm font-medium text-foreground">Logout</span>
        </button>
      </div>
    </div>
  );
}
