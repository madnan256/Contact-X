import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LayoutProvider } from "@/contexts/LayoutContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import Login from "./pages/Login";
import Index from "./pages/Index";
import ContactsList from "./pages/ContactsList";
import ContactDetail from "./pages/ContactDetail";
import ContactForm from "./pages/ContactForm";
import EntitiesList from "./pages/EntitiesList";
import EntityDetail from "./pages/EntityDetail";
import EntityForm from "./pages/EntityForm";
import DuplicateResolution from "./pages/DuplicateResolution";
import Analytics from "./pages/Analytics";
import MoreMenu from "./pages/MoreMenu";
import SearchPage from "./pages/Search";
import AuditLogs from "./pages/AuditLogs";
import NotFound from "./pages/NotFound";
import type { ReactNode } from "react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><AppLayout><Index /></AppLayout></ProtectedRoute>} />
      <Route path="/contacts" element={<ProtectedRoute><AppLayout><ContactsList /></AppLayout></ProtectedRoute>} />
      <Route path="/contacts/new" element={<ProtectedRoute><AppLayout><ContactForm /></AppLayout></ProtectedRoute>} />
      <Route path="/contacts/:id" element={<ProtectedRoute><AppLayout><ContactDetail /></AppLayout></ProtectedRoute>} />
      <Route path="/contacts/:id/edit" element={<ProtectedRoute><AppLayout><ContactForm /></AppLayout></ProtectedRoute>} />
      <Route path="/entities" element={<ProtectedRoute><AppLayout><EntitiesList /></AppLayout></ProtectedRoute>} />
      <Route path="/entities/new" element={<ProtectedRoute><AppLayout><EntityForm /></AppLayout></ProtectedRoute>} />
      <Route path="/entities/:id" element={<ProtectedRoute><AppLayout><EntityDetail /></AppLayout></ProtectedRoute>} />
      <Route path="/entities/:id/edit" element={<ProtectedRoute><AppLayout><EntityForm /></AppLayout></ProtectedRoute>} />
      <Route path="/duplicates" element={<ProtectedRoute><AppLayout><DuplicateResolution /></AppLayout></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><AppLayout><Analytics /></AppLayout></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute><AppLayout><SearchPage /></AppLayout></ProtectedRoute>} />
      <Route path="/audit-logs" element={<ProtectedRoute><AppLayout><AuditLogs /></AppLayout></ProtectedRoute>} />
      <Route path="/more" element={<ProtectedRoute><AppLayout><MoreMenu /></AppLayout></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <LayoutProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </LayoutProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
