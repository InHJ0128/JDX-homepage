// src/pages/LoginPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { type User } from "../contexts/AuthContext";
import { http } from "../api/http";


export default function LoginPage() {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await http<{
        user?: User;
        needInit?: boolean;
        id?: string;
        message?: string;
      }>("/login", {
        method: "POST",
        body: JSON.stringify({ id, password }),
      });
      if (data.message) {
        alert(data.message);
        if (data.needInit) {
          localStorage.setItem(
            "user",
            JSON.stringify({ userId: data.id, nickname: data.id })
          );
          setUser({ id: data.id!, nickname: data.id!, is_admin: 0 });
          navigate("/init");
          return;
        }
        return;
      }
      
      if (!data.user) {
        alert("로그인된 사용자 정보가 없습니다.");
        return;
      }
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      navigate("/");
    } catch (err) {
      console.error(err);
      alert("서버 연결 실패");
    }
  };

  return (
    <div className="flex justify-center items-center h-[80vh]">
      <form
        onSubmit={handleLogin}
        className="bg-white shadow-md rounded-lg p-8 w-full max-w-sm"
      >
        <h2 className="text-2xl font-bold mb-6 text-center">로그인</h2>
        <input
          id="login-id"
          name="id"
          type="text"
          placeholder="아이디"
          value={id}
          onChange={(e) => setId(e.target.value)}
          className="w-full mb-4 px-4 py-2 border rounded"
          required
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 px-4 py-2 border rounded"
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          로그인
        </button>
      </form>
    </div>
  );
}
