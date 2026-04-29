import { useLocation, Link } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { LayoutDashboard, Users, Building2, GitCompare, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const bottomNavItems = [
  { labelKey: "nav.entities", icon: Building2, path: "/entities" },
  { labelKey: "nav.contacts", icon: Users, path: "/contacts" },
  { labelKey: "nav.dashboard", icon: LayoutDashboard, path: "/" },
  { labelKey: "nav.duplicates", icon: GitCompare, path: "/duplicates" },
  { labelKey: "nav.more", icon: MoreHorizontal, path: "/more" },
];

export default function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();

  // Pages accessible from "More"
  const morePages = ["/analytics", "/search"];
  const isMoreActive = morePages.some((p) => location.pathname.startsWith(p)) || location.pathname === "/more";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border bg-card lg:hidden">
      {bottomNavItems.map((item) => {
        const isMore = item.path === "/more";
        const active = isMore
          ? isMoreActive
          : item.path === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(item.path);

        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
