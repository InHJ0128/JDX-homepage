// === 클라이언트 사이드: src/pages/Logout.tsx ===
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { http } from "../api/http";

export default function LogoutPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        // 서버에 로그아웃 요청
        await http<{ success: boolean }>("/logout", { method: "POST" });
      } catch (err) {
        console.warn("로그아웃 요청 중 오류:", err);
      }
      // 클라이언트 측 데이터 초기화
      localStorage.removeItem("user");
      setUser(null);
      navigate("/");
    })();
  }, [navigate, setUser]);

  return null; // 화면 표시 없이 즉시 처리
}