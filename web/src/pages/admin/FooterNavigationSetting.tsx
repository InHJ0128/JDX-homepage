import { useState, useEffect } from "react";
import axios from "axios";

export default function FooterNavigationSetting() {
  const [items, setItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({ label_ko: "", label_ja: "", url: "" });
  const [editingId, setEditingId] = useState<number | null>(null); // ✨ 현재 수정 중인 id
  const [editForm, setEditForm] = useState({ label_ko: "", label_ja: "", url: "" });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const res = await axios.get("/api/admin/footer-nav", { withCredentials: true });
    setItems(res.data);
  };

  const addItem = async () => {
    await axios.post("/api/admin/footer-nav", newItem, { withCredentials: true });
    setNewItem({ label_ko: "", label_ja: "", url: "" });
    fetchItems();
  };

  const deleteItem = async (id: number) => {
    await axios.delete(`/api/admin/footer-nav/${id}`, { withCredentials: true });
    setItems(prev => prev.filter(x => x.id !== id));
  };

  const moveItem = async (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;

    const updated = [...items];
    [updated[from], updated[to]] = [updated[to], updated[from]];
    setItems(updated);
    // 서버에 순서 반영
    await axios.patch(
      "/api/admin/footer-nav/order",
      { orderedIds: updated.map((i) => i.id) },
      { withCredentials: true }
    );
  };

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setEditForm({
      label_ko: item.label_ko,
      label_ja: item.label_ja,
      url: item.url,
    });
  };
  const saveEdit = async () => {
    if (!editingId) return;
    await axios.patch(
      `/api/admin/footer-nav/${editingId}`,
      editForm,
      { withCredentials: true }
    );
    setEditingId(null);
    fetchItems();
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">하단 네비 설정</h2>

      {/* 새 링크 추가 */}
      <div className="flex gap-2 mb-4">
        <input
          value={newItem.label_ko}
          onChange={e => setNewItem({ ...newItem, label_ko: e.target.value })}
          placeholder="한국어 라벨"
          className="border p-1"
        />
        <input
          value={newItem.label_ja}
          onChange={e => setNewItem({ ...newItem, label_ja: e.target.value })}
          placeholder="日本語 ラベル"
          className="border p-1"
        />
        <input
          value={newItem.url}
          onChange={e => setNewItem({ ...newItem, url: e.target.value })}
          placeholder="링크 URL"
          className="border p-1 flex-1"
        />
        <button onClick={addItem} className="bg-blue-500 text-white px-3 rounded">
          추가
        </button>
      </div>

      {/* 목록 */}
      <ul className="space-y-2">
        {items.map((item, idx) => (
          <li
            key={item.id}
            className="flex justify-between items-center border p-2 rounded"
          >
            {editingId === item.id ? (
              // ✨ 수정 모드
              <div className="flex gap-2 flex-1">
                <input
                  value={editForm.label_ko}
                  onChange={e => setEditForm({ ...editForm, label_ko: e.target.value })}
                  className="border p-1 flex-1"
                />
                <input
                  value={editForm.label_ja}
                  onChange={e => setEditForm({ ...editForm, label_ja: e.target.value })}
                  className="border p-1 flex-1"
                />
                <input
                  value={editForm.url}
                  onChange={e => setEditForm({ ...editForm, url: e.target.value })}
                  className="border p-1 flex-1"
                />
              </div>
            ) : (
              // 보기 모드
              <div>
                <p>🇰🇷 {item.label_ko}</p>
                <p>🇯🇵 {item.label_ja}</p>
                <a href={item.url} className="text-blue-600 underline">{item.url}</a>
              </div>
            )}

            <div className="flex gap-2 items-center">
              <div className="flex flex-col">
                <button
                  disabled={idx === 0}
                  onClick={() => moveItem(idx, idx - 1)}
                  className="px-2 py-1 bg-gray-200 rounded disabled:opacity-40"
                >
                  ▲
                </button>
                <button
                  disabled={idx === items.length - 1}
                  onClick={() => moveItem(idx, idx + 1)}
                  className="px-2 py-1 bg-gray-200 rounded disabled:opacity-40"
                >
                  ▼
                </button>
              </div>

              {editingId === item.id ? (
                <button
                  onClick={saveEdit}
                  className="px-2 py-1 bg-green-500 text-white rounded"
                >
                  저장
                </button>
              ) : (
                <button
                  onClick={() => startEdit(item)}
                  className="px-2 py-1 bg-yellow-500 text-white rounded"
                >
                  수정
                </button>
              )}
              {/* 숨기기/노출 토글 버튼 ✨ */}
              <button
                onClick={async () => {
                  const newHidden = item.hidden ? 0 : 1;
                  await axios.patch(
                    `/api/admin/footer-nav/${item.id}/hidden`,
                    { hidden: newHidden },
                    { withCredentials: true }
                  );
                  setItems(prev =>
                    prev.map(i =>
                      i.id === item.id ? { ...i, hidden: newHidden } : i
                    )
                  );
                }}
                className={`px-2 py-1 rounded text-white ${
                  item.hidden ? "bg-yellow-500" : "bg-green-500"
                }`}
              >
                {item.hidden ? "노출" : "숨기기"}
              </button>
              <button
                onClick={() => deleteItem(item.id)}
                className="px-2 py-1 bg-red-500 text-white rounded"
              >
                삭제
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
