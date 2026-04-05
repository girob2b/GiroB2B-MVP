/**
 * Base HTTP client para chamar o backend GiroB2B.
 *
 * Uso em Server Components (passa token Bearer):
 *   import { apiClient } from "@/lib/api-client";
 *   const client = apiClient(token);
 *   const supplier = await client.get("/supplier/me");
 *
 * Uso em Client Components (token via Supabase browser client):
 *   const { data: { session } } = await supabase.auth.getSession();
 *   const client = apiClient(session?.access_token);
 */

const BACKEND_URL =
  typeof window === "undefined"
    ? (process.env.BACKEND_URL ?? "http://localhost:3001")
    : (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001");

export function apiClient(accessToken?: string | null) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
      throw new Error(err.error ?? `HTTP ${res.status}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  return {
    get:    <T>(path: string)                    => request<T>("GET",    path),
    post:   <T>(path: string, body?: unknown)    => request<T>("POST",   path, body),
    patch:  <T>(path: string, body?: unknown)    => request<T>("PATCH",  path, body),
    delete: <T>(path: string)                    => request<T>("DELETE", path),
  };
}
