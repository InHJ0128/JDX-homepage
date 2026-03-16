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
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      alert("세션이 만료되었거나 권한이 없습니다. 다시 로그인해 주세요.");
      
      if (window.location.pathname.startsWith('/m')) {
        window.location.href = '/m/login';
      } else {
        window.location.href = '/login';
      }
    }
    throw new Error(await res.text());
  }
  return res.json();
}
