import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { getToken, clearToken, isAuthenticated as checkAuth } from "@/lib/api";

interface AuthContextType {
  isAuthenticated: boolean;
  userId: string | null;
  username: string | null;
  logout: () => void;
  setAuthenticated: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userId: null,
  username: null,
  logout: () => {},
  setAuthenticated: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuth, setIsAuth] = useState(checkAuth());
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUserId(payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || null);
        setUsername(payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] || null);
      } catch {
        setUserId(null);
        setUsername(null);
      }
    }
  }, [isAuth]);

  const logout = () => {
    clearToken();
    setIsAuth(false);
    setUserId(null);
    setUsername(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: isAuth,
        userId,
        username,
        logout,
        setAuthenticated: setIsAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
