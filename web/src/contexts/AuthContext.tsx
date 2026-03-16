import React, {
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";
import type { ReactNode } from "react";


// 사용자 타입 정의
export type User = {
  id: string;
  nickname: string;
  is_admin: number;
};

// Context 타입
type AuthContextType = {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
};

// Context 생성
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider 컴포넌트
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // 앱 시작 시 localStorage에서 사용자 정보 로드
  useEffect(() => {
  const loadUser = () => {
    const stored = localStorage.getItem("user");
    if (stored && stored !== "undefined") {
      try {
        setUser(JSON.parse(stored) as User);
      } catch (err) {
        console.error("Error parsing user from localStorage:", err);
        localStorage.removeItem("user");
        setUser(null);
      }
    } else {
      setUser(null);
    }
  };



  loadUser(); // 초기 로드
  window.addEventListener("storage", loadUser);
  return () => window.removeEventListener("storage", loadUser);
}, []);
  useEffect(() => {
    fetch("/api/session", {
      method: "GET",
      credentials: "include",        // ← 크로스-사이트 쿠키 전송을 위해 필수
    })
      .then(res => res.json())
      .then(data => {
        if (data.session?.user) {
          setUser(data.session.user);
          localStorage.setItem("user", JSON.stringify(data.session.user));
        }
      })
      .catch(err => console.error("세션 동기화 실패:", err));
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// Context 사용 커스텀 훅
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
