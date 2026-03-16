// src/components/TagSelector.tsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext'; // ✅ 언어 컨텍스트 추가

type Props = { value: string[]; onChange: (v: string[]) => void };

export default function TagSelector({ value, onChange }: Props) {
  const [all, setAll] = useState<{ id: number; name: string }[]>([]);
  const [input, setInput] = useState('');
  const { language } = useLanguage(); // ✅ 현재 언어 가져오기

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get('/api/tags');
        setAll(data);
      } catch (err) {
        console.error("태그 목록을 불러오는 중 오류가 발생했습니다.", err);
      }
    })();
  }, []);

  const addTag = (t: string) => {
    if (!t) return;
    if (!value.includes(t)) onChange([...value, t]);
    setInput('');
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* 선택된 태그 목록 (디자인 개선) */}
      {value.map((t) => (
        <span 
          key={t} 
          className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full flex items-center shadow-sm"
        >
          #{t}
          <button 
            type="button"
            onClick={() => onChange(value.filter((v) => v !== t))} 
            className="ml-2 text-blue-400 hover:text-blue-800 focus:outline-none transition-colors"
            aria-label="태그 삭제"
          >
            ✕
          </button>
        </span>
      ))}

      {/* 태그 입력창 */}
      <input 
        list="taglist" 
        value={input} 
        onChange={(e) => setInput(e.target.value)} 
        onKeyDown={(e) => { 
          if (e.key === 'Enter') { 
            e.preventDefault(); // 폼 제출 방지 (엔터 누를 때 새로고침 방지)
            addTag(input.trim()); 
          } 
        }} 
        className="border border-gray-300 px-3 py-1.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-shadow" 
        placeholder={language === 'ko' ? "태그 입력" : "タグを入力"} // ✅ 다국어 적용
      />
      <datalist id="taglist">
        {all.map((t) => (
          <option key={t.id} value={t.name} />
        ))}
      </datalist>

      {/* 태그 추가 버튼 */}
      <button 
        type="button"
        onClick={() => addTag(input.trim())} 
        className="px-4 py-1.5 border-2 border-blue-500 text-blue-600 hover:bg-blue-50 text-sm font-bold rounded-lg transition-colors"
      >
        {language === 'ko' ? "태그 추가" : "タグ追加"} {/* ✅ 명확한 텍스트 및 다국어 적용 */}
      </button>
    </div>
  );
}