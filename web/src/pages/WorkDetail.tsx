// src/pages/WorkDetail.tsx
import { useParams } from "react-router-dom";

export default function WorkDetail() {
  const { id } = useParams();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">작품 상세 페이지 - {id}번</h1>
      <p>여기에 작품 설명을 넣을 수 있어요.</p>
    </div>
  );
}
