import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface LayoutContextType {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  dir: "ltr" | "rtl";
  theme: "light" | "dark";
  pageTitle: string | null;
  toggleSidebar: () => void;
  toggleCollapse: () => void;
  toggleDir: () => void;
  toggleTheme: () => void;
  setPageTitle: (title: string | null) => void;
}

const LayoutContext = createContext<LayoutContextType | null>(null);

export function useLayout() {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error("useLayout must be used within LayoutProvider");
  return ctx;
}

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [pageTitle, setPageTitle] = useState<string | null>(null);
  const [dir, setDir] = useState<"ltr" | "rtl">(() => {
    const saved = localStorage.getItem("contactsx-dir") as "ltr" | "rtl" | null;
    if (saved === "rtl") document.documentElement.dir = "rtl";
    return saved === "rtl" ? "rtl" : "ltr";
  });
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("contactsx-theme") as "light" | "dark" | null;
    if (saved === "dark") document.documentElement.classList.add("dark");
    return saved === "dark" ? "dark" : "light";
  });

  const toggleSidebar = useCallback(() => setSidebarOpen((o) => !o), []);
  const toggleCollapse = useCallback(() => setSidebarCollapsed((c) => !c), []);
  const toggleDir = useCallback(() => {
    setDir((d) => {
      const next = d === "ltr" ? "rtl" : "ltr";
      document.documentElement.dir = next;
      localStorage.setItem("contactsx-dir", next);
      return next;
    });
  }, []);
  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === "light" ? "dark" : "light";
      document.documentElement.classList.toggle("dark", next === "dark");
      localStorage.setItem("contactsx-theme", next);
      return next;
    });
  }, []);

  return (
    <LayoutContext.Provider
      value={{ sidebarOpen, sidebarCollapsed, dir, theme, pageTitle, toggleSidebar, toggleCollapse, toggleDir, toggleTheme, setPageTitle }}
    >
      {children}
    </LayoutContext.Provider>
  );
}
