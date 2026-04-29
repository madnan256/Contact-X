const API_BASE = "/api";

export function getToken(): string | null {
  return localStorage.getItem("contactsx_token");
}

export function setToken(token: string): void {
  localStorage.setItem("contactsx_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("contactsx_token");
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (options.body && typeof options.body === "string") {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }

  return response.json();
}

export async function login(username: string, password: string): Promise<{ token: string; user: { id: string; username: string; role: string } }> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Login failed" }));
    throw new Error(error.error || "Login failed");
  }

  const data = await response.json();
  setToken(data.token);
  return data;
}
