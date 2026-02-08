type ApiError = {
  error: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api";

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("token");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const body = (await response.json()) as ApiError;
    throw new Error(body?.error || "Request failed");
  }

  return (await response.json()) as T;
}

export async function login(username: string, password: string) {
  const result = await apiFetch<{ token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
  if (typeof window !== "undefined") {
    window.localStorage.setItem("token", result.token);
  }
  return result.token;
}
