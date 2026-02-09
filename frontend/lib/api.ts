type ApiError = {
  error: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api";
const AUTH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const AUTH_STORAGE_KEY = "auth";

// Debug: log the API base URL
if (typeof window !== "undefined") {
  console.log("🔗 API Base URL:", API_BASE);
}

type AuthState = {
  token: string;
  expiresAt: number;
};

function readAuthState(): AuthState | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    const legacy = window.localStorage.getItem("token");
    if (legacy) {
      const fallback: AuthState = {
        token: legacy,
        expiresAt: Date.now() + AUTH_TTL_MS
      };
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(fallback));
      window.localStorage.removeItem("token");
      return fallback;
    }
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as AuthState;
    if (!parsed.token || !parsed.expiresAt) {
      return null;
    }
    if (Date.now() > parsed.expiresAt) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function getAuthToken(): string | null {
  const auth = readAuthState();
  return auth?.token ?? null;
}

export function getAuthExpiry(): number | null {
  const auth = readAuthState();
  return auth?.expiresAt ?? null;
}

export function clearAuth() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  const token = getAuthToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
      cache: 'no-store',
      mode: 'cors',
      credentials: 'same-origin'
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const body = (await response.json()) as ApiError;
      throw new Error(body?.error || "Request failed");
    }

    return (await response.json()) as T;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - please check your connection');
    }
    throw error;
  }
}

export async function login(username: string, password: string) {
  const result = await apiFetch<{ token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
  if (typeof window !== "undefined") {
    const authState: AuthState = {
      token: result.token,
      expiresAt: Date.now() + AUTH_TTL_MS
    };
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
  }
  return result.token;
}
