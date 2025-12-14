import { createContext, useContext, useState, type ReactNode } from "react";

// 타입 정의
type Language = "ko" | "ja";

type LanguageContextType = {
  language: Language;
  toggleLanguage: () => void;
};

// 기본값 생성 (초기화용)
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Provider 컴포넌트
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("ko");

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "ko" ? "ja" : "ko"));
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

// 훅으로 사용
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within a LanguageProvider");
  return context;
}
