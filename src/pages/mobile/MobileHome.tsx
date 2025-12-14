
import MobileLayout from '../../components/mobile/MobileLayout';
import MobileCarousel from '../../components/mobile/MobileCarousel';

export default function MobileHome() {
  return (
    <MobileLayout title="JDX">
      {/* ✅ PC처럼 자동 순환 캐러셀 */}
      <MobileCarousel />

      {/* 이어서 홈 본문 */}
      <section style={{ marginTop: 12 }}>

      </section>
    </MobileLayout>
  );
}
