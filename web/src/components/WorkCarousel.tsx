import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { useNavigate } from "react-router-dom";
import { useRef, useEffect, useState } from "react";
import type { NavigationOptions } from 'swiper/types';
import { useLanguage } from "../contexts/LanguageContext";

interface Highlight {
  id: number;
  target_type: "activity" | "work";
  target_id: number;
  title_ko: string;
  title_ja: string;
  image_url?: string;
}

interface WorkCarouselProps {
  onImageLoad: () => void;
  onTotalImages: (count: number) => void;
}

export default function WorkCarousel({ onImageLoad, onTotalImages }: WorkCarouselProps) {
  const navigate = useNavigate();
  const prevRef = useRef<HTMLDivElement | null>(null);
  const nextRef = useRef<HTMLDivElement | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const { language } = useLanguage();
  useEffect(() => {
    if (prevRef.current && nextRef.current) {
      // 강제로 리렌더 트리거 가능 (Swiper 내부에서 인식)
    }
  }, []);
  useEffect(() => {
    fetch("/api/user/home-highlights")
      .then((res) => res.json())
      .then((data) => {
        setHighlights(data);
        onTotalImages(data.length); // ✨ 총 이미지 개수 부모(Home)에 전달
      })
      .catch((err) => console.error("홈 하이라이트 불러오기 실패:", err));
  }, []);



  return (
    <div className="relative w-full max-w-4xl mx-auto mt-10">
    {/* 좌우 네비 */}
      <div
        ref={prevRef}
        className="custom-prev absolute top-1/2 left-3 -translate-y-1/2 text-white text-8xl z-10 hover:scale-110 hover:text-gray-400 transition cursor-pointer"
      >
        ‹
      </div>
      <div
        ref={nextRef}
        className="custom-next absolute top-1/2 right-3 -translate-y-1/2 text-white text-8xl z-10 hover:scale-110 hover:text-gray-400 transition cursor-pointer"
      >
        ›
      </div>

    {/* 화면 */}
      <Swiper
        spaceBetween={30}
        slidesPerView={1}
        loop={highlights.length > 1}
        autoplay={{
          delay: 5000,
          disableOnInteraction: false,
        }}
        modules={[Navigation, Autoplay]}
        onBeforeInit={(swiper) => {
          const nav = swiper.params.navigation as NavigationOptions;
          nav.prevEl = prevRef.current;
          nav.nextEl = nextRef.current;
        }}
      >
        {highlights.map((h) => (
          <SwiperSlide key={h.id}>
            <div
              className="cursor-pointer group h-[500px] flex flex-col transition duration-300"
              onClick={() =>
                navigate(
                  h.target_type === "activity"
                    ? `/activity/${h.target_id}`
                    : `/works/${h.target_id}`
                )
              }
            >
              <div className="h-[450px] w-full overflow-hidden rounded-xl">
                <img
                  src={h.image_url}
                  alt={language === "ko" ? h.title_ko : h.title_ja}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onLoad={onImageLoad}
                />
              </div>
              <p className="text-center mt-3 text-lg font-semibold">{language === "ko" ? h.title_ko : h.title_ja}</p>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
