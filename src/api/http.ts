// src/api/http.ts
export async function http<T = any>(
  input: RequestInfo,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(
    typeof input === "string" && input.startsWith("/api")
      ? input
      : `/api${input}`,           // baseURL 역할
    {
      credentials: "include",      // 쿠키 자동 전송
      headers: { "Content-Type": "application/json" },
      ...init,
    }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
