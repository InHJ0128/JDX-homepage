import { useEffect, useState } from "react";
import axios from "axios";

export default function HomeHighlightSetting() {
  const [highlights, setHighlights] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [works, setWorks] = useState<any[]>([]);
  const [targetType, setTargetType] = useState("activity");
  const [targetId, setTargetId] = useState<number | null>(null);

  useEffect(() => {
    axios.get("/api/admin/home-highlights", { withCredentials: true })
      .then(res => setHighlights(res.data));
    axios.get("/api/admin/activities", { withCredentials: true })
      .then(res => setActivities(res.data));
    axios.get("/api/admin/work", { withCredentials: true })
      .then(res => setWorks(res.data));
  }, []);

  const addHighlight = async () => {
    if (!targetId) return;
    await axios.post("/api/admin/home-highlights",
      { target_type: targetType, target_id: targetId },
      { withCredentials: true });
    const res = await axios.get("/api/admin/home-highlights", { withCredentials: true });
    setHighlights(res.data);
  };
  const moveHighlight = async (from: number, to: number) => {
    if (to < 0 || to >= highlights.length) return;

    // 상태에서 swap
    const updated = [...highlights];
    [updated[from], updated[to]] = [updated[to], updated[from]];
    setHighlights(updated);

    // 서버에 순서 반영
    await axios.patch("/api/admin/home-highlights/order", {
      orderedIds: updated.map((h) => h.id),
    }, { withCredentials: true });
  };
  const handleDelete = async (id: number) => {
    await axios.delete(`/api/admin/home-highlights/${id}`, { withCredentials: true });
    // 새로고침 대신 상태만 갱신
    setHighlights(prev => prev.filter(h => h.id !== id));
  };


  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">홈 메인 노출 관리</h2>
      <div className="mb-4 flex space-x-2">
        <select value={targetType} onChange={e => setTargetType(e.target.value)}>
          <option value="activity">동아리 활동</option>
          <option value="work">작품</option>
        </select>
        <select onChange={e => setTargetId(Number(e.target.value))}>
          <option value="">선택하세요</option>
          {(targetType === "activity" ? activities : works).map(item => (
            <option key={item.id} value={item.id}>{item.title}</option>
          ))}
        </select>
        <button onClick={addHighlight} className="px-3 py-1 bg-blue-500 text-white rounded">추가</button>
      </div>

      <ul className="space-y-2">
        {highlights.map((h, idx) => (
          <li key={h.id} className="flex items-center justify-between border p-2 rounded">
            {/* 순서 번호 */}
            <span className="w-6 text-center font-bold">{idx + 1}</span>

            {/* 썸네일 & 제목 */}
            <div className="flex items-center gap-3 flex-1">
              <img src={h.thumbnail_url} alt={h.title} className="w-20 h-16 object-cover rounded" />
              <span>{h.title}</span>
            </div>

            {/* 순서 변경 버튼 */}
            <div className="flex flex-col space-y-1">
              <button
                disabled={idx === 0}
                onClick={() => moveHighlight(idx, idx - 1)}
                className="px-2 py-1 bg-gray-200 rounded disabled:opacity-40"
              >
                ▲
              </button>
              <button
                disabled={idx === highlights.length - 1}
                onClick={() => moveHighlight(idx, idx + 1)}
                className="px-2 py-1 bg-gray-200 rounded disabled:opacity-40"
              >
                ▼
              </button>
            </div>
            {/* ❌ 삭제 버튼 */}
            <button
              onClick={() => handleDelete(h.id)}
              className="px-2 py-1 bg-red-500 text-white rounded"
            >
              삭제
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
