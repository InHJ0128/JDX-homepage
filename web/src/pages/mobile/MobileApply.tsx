// src/pages/mobile/MobileApply.tsx
import Apply from "../Apply";
import MobileLayout from "../../components/mobile/MobileLayout";

export default function MobileApply() {
  // 데스크톱 Apply를 그대로 재사용 (모바일 레이아웃만 감싸기)
  return (
    <MobileLayout title="Apply">
      {/* Apply가 max-width를 잡고 있어서 모바일에서도 보기 괜찮게 동작함 */}
      <Apply />
    </MobileLayout>
  );
}
