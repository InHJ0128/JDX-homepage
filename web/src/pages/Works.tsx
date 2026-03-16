// src/pages/ActivityPage.tsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { useNavigate } from "react-router-dom";

interface Work {
  id: number;
  title: string;
  content: string;
  image_url?: string;
  thumbnail_url?: string;
  created_at: string;
}

export default function Works() {
  const { id } = useParams();
  const { language } = useLanguage();
  const [works, setWorks] = useState<Work[]>([]);
  const [work, setWork] = useState<Work | null>(null);
  const navigate = useNavigate();

  // 📌 목록 불러오기
  useEffect(() => {
    if (!id) {
      fetch(`/api/user/work?lang=${language}`)
        .then(res => res.json())
        .then(setWorks)
        .catch(err => console.error("작품 목록 불러오기 실패:", err));
    }
  }, [id, language]);

  // 📌 상세 불러오기
  useEffect(() => {
    if (id) {
      fetch(`/api/user/work/${id}?lang=${language}`)
        .then(res => res.json())
        .then(setWork)
        .catch(err => console.error("작품 상세 불러오기 실패:", err));
    }
  }, [id, language]);

  // 📌 상세 페이지
  if (id && work) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-5xl font-bold mb-4">{work.title}</h1>
        <div
          className="prose"
          dangerouslySetInnerHTML={{ __html: work.content }}
        />
        <Link to="/works" className="text-blue-600 hover:underline block mt-6">
          {language === "ko" ? "← 목록으로" : "← 一覧へ"}
        </Link>
      </div>
    );
  }
  function stripHtml(html: string): string {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  }

  // 📌 목록 페이지
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h2 className="text-3xl font-bold mb-6">
        {language === "ko" ? "동아리 작품 목록" : "クラブ作品リスト"}
      </h2>

      <ul className="space-y-6">
        {works.map((act) => (
          <li
            key={act.id}
            onClick={() => navigate(`/works/${act.id}`)}
            className="cursor-pointer bg-white shadow-md rounded-xl p-4 flex gap-4 hover:shadow-xl transition"
          >
            {act.thumbnail_url && (
              <img
                src={act.thumbnail_url}
                alt={act.title}
                className="w-32 h-32 object-cover rounded-lg"
              />
            )}
            <div>
              <h3 className="text-xl font-semibold">
                {act.title}{" "}
                <span className="text-sm text-gray-500">
                  ({new Date(act.created_at).getFullYear()})
                </span>
              </h3>
              <p className="text-gray-700 mt-2">{stripHtml(act.content).slice(0, 100)}...</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
