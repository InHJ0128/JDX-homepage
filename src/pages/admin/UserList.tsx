import React, { useEffect, useState } from 'react';
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import axios from "axios";

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ nickname: "", is_admin: false });
  const { user: currentUser } = useAuth();
  const { language } = useLanguage();


  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get("/api/admin/users", {
        withCredentials: true
      });
      setUsers(res.data);
    } catch (err) {
      console.error("유저 목록 불러오기 실패", err);
    }
  };



  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAddUser = async () => {
    if (!form.nickname.trim()) {
      alert("닉네임을 입력해주세요.");
      return;
    }
    try {
      await axios.post("/api/admin/users", form,{
        withCredentials: true
      });
      alert("유저 추가 완료");
      setForm({ nickname: "", is_admin: false });
      fetchUsers();
    } catch (err) {
      alert("유저 추가 실패");
      console.error(err);
    }
  };

  const toggleAdmin = async (id: string, current: boolean) => {
    if (id === 'admin') {
      alert("admin 계정은 권한을 변경할 수 없습니다.");
      return;
    }

    try {
      await axios.patch(
        `/api/admin/users/${id}/admin`,
        { isAdmin: !current },
      );
      fetchUsers();
    } catch (err) {
      console.error("관리자 변경 실패", err);
    }
  };

  const deleteUser = async (id: string) => {
    if (id === 'admin') {
      alert("admin 계정은 삭제할 수 없습니다.");
      return;
    }

    if (!window.confirm(`${id} 계정을 삭제하시겠습니까?`)) return;

    try {
      await axios.delete(`/api/admin/users/${id}`);
      fetchUsers();
    } catch (err) {
      console.error("삭제 실패", err);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">{language === "ko" ? "사용자 목록":"ユーザーリスト"}</h2>
      {/* 유저 추가 폼 */}
      <div className="mb-6 p-4 border rounded">
        <h3 className="font-semibold mb-2">{language === "ko" ? "새 유저 추가":"新しいユーザー追加"}</h3>
        <div className="flex gap-4 items-center">
          <input
            name="nickname"
            placeholder={language === "ko" ? "닉네임":"ニックネーム"}
            value={form.nickname}
            onChange={handleChange}
            className="border p-2 rounded"
          />
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              name="is_admin"
              checked={form.is_admin}
              onChange={handleChange}
            />
            {language === "ko" ? "관리자":"管理者"}
          </label>
          <button onClick={handleAddUser} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            {language === "ko" ? "추가":"追加."}
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {language === "ko" ? "※ ID와 비밀번호는 자동으로 닉네임으로 설정됩니다.":
          "※ IDとパスワードは自動的にニックネームに設定されます。"}</p>
      </div>
      <table className="w-full border table-fixed">
        <thead className="bg-gray-200">
          <tr>
            <th className="p-2 border">ID</th>
            <th className="p-2 border">{language === "ko" ? "닉네임":"ニックネーム"}</th>
            <th className="p-2 border">{language === "ko" ? "관리자":"管理者"}</th>
            <th className="px-4 py-2 border">{language === "ko" ? "설정":"設定"}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user: any) => (
            <tr key={user.id}>
              <td className="p-2 border">{user.id}</td>
              <td className="p-2 border">{user.nickname}</td>
              <td className="p-2 border">
                <button
                  onClick={() => toggleAdmin(user.id, user.is_admin)}
                  className={`px-2 py-1 rounded ${
                    user.id === 'admin' || currentUser?.id === user.id
                      ? "bg-gray-300 text-gray-600"
                      : "bg-gray-200 hover:bg-gray-400"}
                  disabled:opacity-50 disabled:cursor-not-allowed`}
                  disabled={user.id === 'admin' || currentUser?.id === user.id}
                >
                  {user.is_admin ? language === "ko" ? "해제" : "解除" :  language === "ko" ? "관리자 지정" : "管理者指定"}
                </button></td>
              <td className="p-2 border">
                <button
                  onClick={() => deleteUser(user.id)}
                  className={`px-2 py-1 rounded ${
                    user.id === 'admin' || currentUser?.id === user.id
                      ? "bg-gray-300 text-gray-600"
                      : "bg-red-500 hover:bg-red-600"}
                  disabled:opacity-50 disabled:cursor-not-allowed`}
                  disabled={user.id === 'admin' || currentUser?.id === user.id}
                >
                  {language === "ko" ? "삭제":"削除"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserList;
