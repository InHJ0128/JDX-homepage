import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import axios from "axios";

type UserDetail = {
  original_id: string;
  id: string;
  student_id: string;
  name: string;
  nickname: string;
  department: string;
  grade: string | number;
  status: string;
  phone: string;
  is_admin: boolean | number;
  admin_memo: string;
};

const UserList = () => {
  const [users, setUsers] = useState<any[]>([]);
  
  // ✅ 새 유저 추가 폼 상태
  const [addForm, setAddForm] = useState({ nickname: "", is_admin: false, status: "enrolled" });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  
  const { user: currentUser } = useAuth();
  const { language } = useLanguage();
  const ko = language === "ko";
  const t = (k: string, j: string) => (ko ? k : j);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get("/api/admin/users", { withCredentials: true });
      setUsers(res.data);
    } catch (err) {
      console.error("유저 목록 불러오기 실패", err);
    }
  };

  // ✅ 새 유저 수동 추가 로직 복구
  const handleAddFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setAddForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAddUser = async () => {
    if (!addForm.nickname.trim()) {
      alert(t("닉네임을 입력해주세요.", "ニックネームを入力してください。"));
      return;
    }
    try {
      // ✅ 서버가 요구하는 id와 password를 닉네임과 똑같이 채워서 보냅니다!
      const payload = {
        ...addForm,
        id: addForm.nickname.trim(),
        password: addForm.nickname.trim()
      };

      await axios.post("/api/admin/users", payload, { withCredentials: true });
      alert(t("유저 추가 완료", "ユーザー追加完了"));
      setAddForm({ nickname: "", is_admin: false, status: "enrolled" });
      fetchUsers();
    } catch (err) {
      alert(t("유저 추가 실패", "追加失敗"));
      console.error(err);
    }
  };

  const openModal = (user: any) => {
    // admin 계정은 원천 차단 (버튼도 막아뒀지만 이중 방어)
    if (user.id === 'admin') {
      alert(t("최고 관리자(admin) 계정은 마이페이지에서만 수정할 수 있습니다.", "管理者アカウントはマイページでのみ修正可能です。"));
      return;
    }

    setSelectedUser({
      original_id: user.id || "",
      id: user.id || "",
      student_id: user.student_id || "",
      name: user.name || "",
      nickname: user.nickname || "",
      department: user.department || "",
      grade: user.grade || "",
      status: user.status || "enrolled",
      phone: user.phone || "",
      is_admin: user.is_admin ? true : false,
      admin_memo: user.admin_memo || "",
    });
  };

  const closeModal = () => setSelectedUser(null);

  const handleModalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (!selectedUser) return;
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setSelectedUser(prev => prev ? {
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    } : null);
  };

  const saveUserDetail = async () => {
    if (!selectedUser) return;
    try {
      // ✅ 학년(grade)이 빈칸이면 null로 처리해서 DB 무결성 에러 방지!
      const parsedGrade = selectedUser.grade === "" ? null : Number(selectedUser.grade);

      await axios.patch(`/api/admin/users/${selectedUser.original_id}`, {
        ...selectedUser,
        grade: parsedGrade, // ✅ 안전하게 변환된 학년 데이터 덮어쓰기
        is_admin: selectedUser.is_admin ? 1 : 0
      }, { withCredentials: true });
      
      alert(t("정보가 성공적으로 수정되었습니다.", "情報が修正されました。"));
      fetchUsers();
      closeModal();
    } catch (err: any) {
      console.error("수정 실패", err);
      let errMsg = t("수정 실패", "修正失敗");
      if (err.response && err.response.data && err.response.data.message) {
        errMsg = err.response.data.message;
      }
      alert(errMsg);
    }
  };

  const resetPassword = async () => {
    if (!selectedUser) return;
    if (!window.confirm(t("비밀번호를 '1234'로 초기화하시겠습니까?", "パスワードを初期化しますか？"))) return;
    try {
      await axios.patch(`/api/admin/users/${selectedUser.original_id}/reset-password`, {}, { withCredentials: true });
      alert(t("비밀번호가 초기화되었습니다.", "パスワードが初期化されました。"));
    } catch (err) {
      alert(t("초기화 실패", "初期化失敗"));
    }
  };

  const deleteUser = async (id: string) => {
    if (id === 'admin') return alert(t("admin 계정은 삭제할 수 없습니다.", "adminは削除できません。"));
    if (!window.confirm(t(`${id} 계정을 정말 삭제하시겠습니까?`, "本当に削除しますか？"))) return;
    try {
      await axios.delete(`/api/admin/users/${id}`, { withCredentials: true });
      alert(t("계정이 삭제되었습니다.", "削除されました。"));
      fetchUsers();
      closeModal();
    } catch (err) {
      console.error("삭제 실패", err);
      alert(t("삭제 중 오류 발생", "エラー発生"));
    }
  };

  const filteredUsers = useMemo(() => {
    return users
      .filter((user: any) => {
        const isEnrolled = !user.status || user.status === "enrolled";
        const isAlumni = user.status === "alumni";
        const isAdmin = !!user.is_admin;

        if (statusFilter === "enrolled" && !isEnrolled) return false;
        if (statusFilter === "alumni" && !isAlumni) return false;
        if (roleFilter === "admin" && !isAdmin) return false;
        if (roleFilter === "general" && isAdmin) return false;
        if (gradeFilter !== "all" && String(user.grade) !== gradeFilter) return false;

        const term = searchTerm.toLowerCase().trim();
        if (!term) return true;

        const matchId = String(user.id || "").toLowerCase().includes(term);
        const matchName = String(user.name || "").toLowerCase().includes(term);
        const matchNickname = String(user.nickname || "").toLowerCase().includes(term);

        return matchId || matchName || matchNickname;
      })
      .sort((a: any, b: any) => {
        if (a.id === 'admin' && b.id !== 'admin') return -1;
        if (a.id !== 'admin' && b.id === 'admin') return 1;
        if (a.is_admin && !b.is_admin) return -1;
        if (!a.is_admin && b.is_admin) return 1;
        return String(a.id).localeCompare(String(b.id));
      });
  }, [users, statusFilter, roleFilter, gradeFilter, searchTerm]);

  return (
    <div className="pb-10">
      <h2 className="text-2xl font-bold mb-6">{t("사용자 목록", "ユーザーリスト")}</h2>

      {/* ✅ 유저 수동 추가 폼 복구 */}
      <div className="mb-6 p-5 border border-gray-200 rounded-lg bg-gray-50 shadow-sm">
        <h3 className="font-bold mb-3 text-gray-800">{t("새 유저 수동 추가", "新しいユーザー手動追加")}</h3>
        <div className="flex flex-wrap gap-4 items-center">
          <input
            name="nickname"
            placeholder={t("닉네임", "ニックネーム")}
            value={addForm.nickname}
            onChange={handleAddFormChange}
            className="border border-gray-300 p-2.5 rounded flex-1 min-w-[150px] focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <select 
            name="status" 
            value={addForm.status} 
            onChange={handleAddFormChange}
            className="border border-gray-300 p-2.5 rounded bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="enrolled">{t("재학생", "在学生")}</option>
            <option value="alumni">{t("졸업생", "卒業生")}</option>
          </select>

          <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
            <input
              type="checkbox"
              name="is_admin"
              checked={addForm.is_admin}
              onChange={handleAddFormChange}
              className="w-4 h-4 accent-blue-600"
            />
            {t("관리자", "管理者")}
          </label>
          <button onClick={handleAddUser} className="bg-blue-600 text-white font-bold px-6 py-2.5 rounded hover:bg-blue-700 transition">
            {t("추가", "追加")}
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {t("※ 수동 추가 시 ID와 비밀번호는 자동으로 닉네임과 동일하게 임시 설정됩니다.", "※ IDとパスワードは自動的にニックネームに設定されます。")}
        </p>
      </div>

      <div className="flex justify-end mb-4">
        <input
          type="text"
          placeholder={t("ID, 이름, 닉네임 검색", "検索")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 p-2.5 rounded-lg w-72 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="overflow-x-auto shadow-sm border border-gray-200 rounded-lg">
        <table className="w-full text-left table-auto whitespace-nowrap">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-3 border-b font-semibold">ID</th>
              <th className="p-3 border-b font-semibold">{t("이름", "氏名")}</th>
              <th className="p-3 border-b font-semibold">{t("전공", "専攻")}</th>
              
              <th className="p-3 border-b font-semibold">
                <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} className="bg-transparent border-none focus:ring-0 p-0 hover:text-blue-600 font-semibold cursor-pointer">
                  <option value="all">{t("학년(전체)", "学年(全体)")}</option>
                  {[1, 2, 3, 4, 5].map(g => <option key={g} value={String(g)}>{g}{t("학년", "年生")}</option>)}
                </select>
              </th>

              <th className="p-3 border-b font-semibold">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-transparent border-none focus:ring-0 p-0 hover:text-blue-600 font-semibold cursor-pointer">
                  <option value="all">{t("소속상태(전체)", "状態(全体)")}</option>
                  <option value="enrolled">{t("재학생", "在学生")}</option>
                  <option value="alumni">{t("졸업생", "卒業生")}</option>
                </select>
              </th>

              <th className="p-3 border-b font-semibold">
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="bg-transparent border-none focus:ring-0 p-0 hover:text-blue-600 font-semibold cursor-pointer">
                  <option value="all">{t("권한(전체)", "権限(全体)")}</option>
                  <option value="admin">{t("관리자", "管理者")}</option>
                  <option value="general">{t("일반", "一般")}</option>
                </select>
              </th>

              <th className="p-3 border-b font-semibold text-center">{t("설정", "設定")}</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {filteredUsers.map((u: any) => (
              <tr key={u.id} className="hover:bg-blue-50 border-b transition">
                <td className="p-3 text-gray-700 font-medium">{u.id}</td>
                <td className="p-3">{u.name || "-"}</td>
                <td className="p-3 text-gray-600">{u.department || "-"}</td>
                <td className="p-3">{u.grade ? `${u.grade}${t("학년", "年生")}` : "-"}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.status === 'alumni' ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}>
                    {u.status === 'alumni' ? t("졸업생", "卒業生") : t("재학생", "在学生")}
                  </span>
                </td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.is_admin ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                    {u.is_admin ? t("관리자", "管理者") : t("일반", "一般")}
                  </span>
                </td>
                <td className="p-3 text-center">
                  {/* ✅ admin 계정은 상세 수정 버튼 아예 비활성화! */}
                  <button
                    onClick={() => openModal(u)}
                    disabled={u.id === 'admin'}
                    className={`px-4 py-1.5 rounded-md border text-sm font-semibold transition ${
                      u.id === 'admin' 
                        ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'border-gray-300 bg-white hover:bg-gray-50 text-gray-800'
                    }`}
                  >
                    {u.id === 'admin' ? t("수정 불가", "修正不可") : t("상세 수정", "詳細修正")}
                  </button>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  {t("표시할 유저가 없습니다.", "ユーザーがいません。")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ✅ 모달 (팝업창) */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-bold">{t("유저 상세 설정", "ユーザー設定")}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-700 font-bold text-xl">✕</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">ID</label>
                  <input type="text" name="id" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" value={selectedUser.id} onChange={handleModalChange} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">{t("학번", "学籍番号")}</label>
                  <input type="text" name="student_id" className="w-full border p-2 rounded" value={selectedUser.student_id} onChange={handleModalChange} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">{t("이름", "氏名")}</label>
                  <input type="text" name="name" className="w-full border p-2 rounded" value={selectedUser.name} onChange={handleModalChange} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">{t("닉네임", "ニックネーム")}</label>
                  <input type="text" name="nickname" className="w-full border p-2 rounded" value={selectedUser.nickname} onChange={handleModalChange} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">{t("전공(학과)", "専攻")}</label>
                  <input type="text" name="department" className="w-full border p-2 rounded" value={selectedUser.department} onChange={handleModalChange} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">{t("학년", "学年")}</label>
                  <input type="number" name="grade" className="w-full border p-2 rounded" value={selectedUser.grade} onChange={handleModalChange} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">{t("전화번호", "電話番号")}</label>
                  <input type="text" name="phone" className="w-full border p-2 rounded" value={selectedUser.phone} onChange={handleModalChange} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">{t("소속 상태", "所属状態")}</label>
                  <select name="status" className="w-full border p-2 rounded" value={selectedUser.status} onChange={handleModalChange}>
                    <option value="enrolled">{t("재학생", "在学生")}</option>
                    <option value="alumni">{t("졸업생", "卒業生")}</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t mt-4">
                <label className="flex items-center gap-2 cursor-pointer mt-2">
                  <input 
                    type="checkbox" 
                    name="is_admin" 
                    checked={Boolean(selectedUser.is_admin)} 
                    onChange={handleModalChange} 
                    className="w-5 h-5 accent-purple-600"
                    disabled={selectedUser.id === 'admin' || currentUser?.id === selectedUser.id}
                  />
                  <span className="font-bold text-gray-800">{t("관리자 권한 부여", "管理者権限付与")}</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">{t("※ 본인 계정이나 최고 관리자(admin) 권한은 여기서 변경할 수 없습니다.", "※ 自身の権限は変更できません。")}</p>
              </div>

              <div className="pt-4">
                <label className="block text-sm font-bold text-gray-700 mb-1">{t("학생 기록 (관리자 메모)", "学生記録 (管理者メモ)")}</label>
                <textarea 
                  name="admin_memo" 
                  rows={4} 
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" 
                  placeholder={t("학생의 활동 내역이나 평가를 자유롭게 기록하세요.", "活動履歴などを記録してください。")}
                  value={selectedUser.admin_memo} 
                  onChange={handleModalChange} 
                />
              </div>

              <div className="p-4 mt-2 bg-red-50 rounded-lg border border-red-100 flex justify-between items-center">
                <p className="text-sm text-red-700 font-bold">{t("위험 구역", "危険領域")}</p>
                <div className="flex gap-2">
                  <button onClick={resetPassword} className="px-4 py-2 bg-white border border-red-300 text-red-600 rounded hover:bg-red-100 text-sm font-bold transition">
                    {t("비밀번호 초기화", "PW初期化")}
                  </button>
                  <button onClick={() => deleteUser(selectedUser.original_id)} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-bold transition">
                    {t("계정 삭제", "アカウント削除")}
                  </button>
                </div>
              </div>

            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
              <button onClick={closeModal} className="px-5 py-2 rounded border bg-white hover:bg-gray-100 font-semibold text-gray-700">
                {t("취소", "キャンセル")}
              </button>
              <button onClick={saveUserDetail} className="px-5 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold">
                {t("저장하기", "保存")}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default UserList;