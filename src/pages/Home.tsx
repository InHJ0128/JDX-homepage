// src/pages/Home.tsx
import { useState } from "react";
import WorkCarousel from "../components/WorkCarousel";
import { useLanguage } from "../contexts/LanguageContext";
import Footer from "../components/Footer";
import ClubIntro from "../components/ClubIntro"; 

export default function Home() {
  const { language } = useLanguage();
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [totalImages, setTotalImages] = useState(0);

  const handleTotalImages = (count: number) => {
    setTotalImages(count);
  };

  const handleImageLoad = () => {
    setLoadedCount((prev) => {
      const newCount = prev + 1;
      if (newCount >= totalImages && totalImages > 0) {
        setImagesLoaded(true);
      }
      if (loadedCount!=0) console.log(loadedCount);
      return newCount;
    });
  };

  return (
    <div>
      {imagesLoaded &&
      <h1 className="text-2xl font-bold text-center mt-8">
        {language === "ko" ? "JDX 소개" : "JDX 紹介"}
      </h1>
      }
      <WorkCarousel
        onImageLoad={handleImageLoad}
        onTotalImages={handleTotalImages}
      />
      <div className="mt-12">
        {imagesLoaded && <Footer />}
      </div>
      {imagesLoaded &&
      <div className="mt-12 font-bold text-center">
        SCROLL
        <span>↓</span> 
      </div>
      }
      <div className="mt-12">
        {imagesLoaded && <ClubIntro />}
      </div>
    </div>
  );
}
