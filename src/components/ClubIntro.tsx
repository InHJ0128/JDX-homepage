import { motion } from "framer-motion";
import { useLanguage } from "../contexts/LanguageContext";

export default function ClubIntro() {
  const { language } = useLanguage();
  const variants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 },
  };
  const bubbleVariants = {
    hidden: { opacity: 0, scale: 0.5 },
    visible: { opacity: 1, scale: 1 },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
    };
  const steps = {
    ko: [
      { period: "4월 ~ 6월", sub: "(1학기)", title: "기초 학습", desc: "프로그래밍 기초와 문제 풀이" },
      { period: "7월 ~ 8월", sub: "(방학)", title: "프로젝트 준비", desc: "아이디어 구상과 팀 빌딩" },
      { period: "9월 ~ 12월", sub: "(2학기)", title: "프로젝트 제작", desc: "팀별 개발 및 구현" },
      { period: "1월 ~ 3월", sub: "(방학)", title: "프로젝트 발표", desc: "성과 공유 및 발표" },
    ],
    ja: [
      { period: "4月 ~ 6月", sub: "(前期)", title: "基礎学習", desc: "プログラミング基礎と問題演習" },
      { period: "7月 ~ 8月", sub: "(夏休み)", title: "プロジェクト準備", desc: "アイデア企画とチーム編成" },
      { period: "9月 ~ 12月", sub: "(後期)", title: "プロジェクト制作", desc: "チームごとの開発と実装" },
      { period: "1月 ~ 3月", sub: "(冬休み)", title: "プロジェクト発表", desc: "成果共有と発表会" },
    ],
  };

  return (
    <section className="bg-gray-100 py-12">
      <div className="max-w-4xl mx-auto text-center px-4">
        <motion.h1
            variants={variants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            >
          {language === "ko" ? "동아리 소개" : "クラブ紹介"}
        </motion.h1>
        <motion.div
            className="mt-12"
            variants={variants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            >
            {language === "ko" ? 
                <p>JDX동아리는 학생들이 주도적으로 공부하고 서로 도와주고 같이 성장하는 장소입니다.</p> 
            : <p>JDXサークルは学生たちが主導的に勉強して お互いに助け合って 一緒に成長する場所です。</p>}
        </motion.div>
        

        <motion.h2
            className="mt-12"
            variants={variants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            >
          {language === "ko" ? "🌱 체계적인 커리큘럼" : "🌱 体系的なカリキュラム"}
        </motion.h2>
        <motion.div  
            className="mt-3"
            variants={variants}
            initial="hidden"
            whileInView="visible"
            transition={{ delay: 0.2, duration: 0.6 }}
            viewport={{ once: false, amount: 0.2 }}
        >
        <ul className="list-disc list-inside border rounded-xl p-4 bg-white shadow text-left">
            <li className="text-lg leading-relaxed text-gray-700">
                {language === "ko"
                    ? "프로그래밍 기초부터 차근차근 학습"
                    : "プログラミングの基礎から丁寧に学習"}
            </li>
            <li className="text-lg leading-relaxed text-gray-700">
                {language === "ko"
                    ? "프로그래밍 문제 풀이로 실전 연습"
                    : "問題演習を通じて実戦練習"}
            </li>
            <li className="text-lg leading-relaxed text-gray-700">
                {language === "ko"
                    ? "조별 활동으로 혼자 공부하기 어려운 부분도 쉽게 이해"
                    : "グループ活動で独学では難しい部分も理解しやすく"}
            </li>
        </ul>
        </motion.div>
        
        <motion.h2
            className="mt-12"
            variants={variants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            >
          {language === "ko" ? "🤝 팀 프로젝트 경험" : "🤝 チームプロジェクト経験"}
        </motion.h2>
        <motion.div  
            className="mt-3"
            variants={variants}
            initial="hidden"
            whileInView="visible"
            transition={{ delay: 0.2, duration: 0.6 }}
            viewport={{ once: false, amount: 0.2 }}
        >
        <ul className="list-disc list-inside border rounded-xl p-4 bg-white shadow text-left">
            <li className="text-lg leading-relaxed text-gray-700">
                {language === "ko"
                    ? "기획 → 개발 → 발표까지 전 과정을 함께 경험"
                    : "企画 → 開発 → 発表まで全過程を体験"}
            </li>
            <li className="text-lg leading-relaxed text-gray-700">
                {language === "ko"
                    ? "협업 능력과 문제 해결력을 기르는 실전 훈련"
                    : "協力力と問題解決力を養う実践的なトレーニング"}
            </li>
            <li className="text-lg leading-relaxed text-gray-700">
                {language === "ko"
                    ? "실무에 가까운 프로젝트 경험 제공"
                    : "実務に近いプロジェクト経験を積むことが可能"}
            </li>
        </ul>
        </motion.div>
        <motion.h2
            className="mt-12"
            variants={variants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            >
          {language === "ko" ? "💼 일본 취업 상담 & 조언" : "💼 日本就職の相談 & アドバイス"}
        </motion.h2>
        <motion.div  
            className="mt-3"
            variants={variants}
            initial="hidden"
            whileInView="visible"
            transition={{ delay: 0.2, duration: 0.6 }}
            viewport={{ once: false, amount: 0.2 }}
        >
        <ul className="list-disc list-inside border rounded-xl p-4 bg-white shadow text-left">
            <li className="text-lg leading-relaxed text-gray-700">
                {language === "ko"
                    ? "일본 취업 희망자를 위한 맞춤형 상담"
                    : "日本就職を希望する方への情報共有と相談"}
            </li>
            <li className="text-lg leading-relaxed text-gray-700">
                {language === "ko"
                    ? "실제 경험자의 취업 노하우와 면접 대비 팁"
                    : "実体験に基づいた面接対策やノウハウ"}
            </li>
            <li className="text-lg leading-relaxed text-gray-700">
                {language === "ko"
                    ? "개별 진로 방향에 맞춘 가이드 제공"
                    : "個別のキャリアに合わせたガイダンスを提供"}
            </li>
        </ul>
        </motion.div>
        <motion.h2
            className="mt-20"
            variants={variants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            >
          {language === "ko" ? "동아리 활동 예정표" : "クラブ活動予定表"}
        </motion.h2>
        <div className="flex items-center border rounded-xl p-6 bg-white shadow justify-between w-full max-w-5xl mx-auto mt-4">
            {steps[language].map((s, i) => (
                <motion.div
                key={i}
                className="flex-1 text-center"
                variants={itemVariants}
                initial="hidden"
                whileInView="visible"
                custom={i}
                viewport={{ once: false, amount: 0.3 }}
                >
                <div
                    className={`w-6 h-6 mx-auto rounded-full ${
                    i === 0 ? "bg-indigo-500" : i === 1 ? "bg-blue-500" : i === 2 ? "bg-teal-500" : "bg-green-500"
                    }`}
                ></div>
                <p className="mt-2 font-medium">{s.period}</p>
                <p className="text-gray-600 text-sm">{s.sub}</p>
                <p className="mt-2 font-semibold">{s.title}</p>
                <p className="text-gray-500 text-sm">{s.desc}</p>
                </motion.div>
            ))}
        </div>
        <motion.h2
            className="mt-10"
            variants={variants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            >
            {language === "ko" ? "언어별 공부" : "言語別の勉強"}
        </motion.h2>
        <div className="flex justify-center gap-10 mt-4 border rounded-xl p-6 bg-white shadow">
            {/* Java */}
            <motion.div
                className="text-center"
                variants={bubbleVariants}
                initial="hidden"
                whileInView="visible"
                transition={{ duration: 0.6, type: "spring" }}
                viewport={{ once: false, amount: 0.3 }}
            >
                <div className="w-28 h-28 flex items-center justify-center border-2 border-orange-600 rounded-full bg-orange-100 text-orange-700 font-bold">
                JAVA
                </div>
                <p className="mt-2 text-sm text-gray-600">{language === "ko" ? "- 객체지향 언어":"オブジェクト指向言語"}</p>
            </motion.div>

            {/* Python */}
            <motion.div
                className="text-center"
                variants={bubbleVariants}
                initial="hidden"
                whileInView="visible"
                transition={{ duration: 0.6, type: "spring", delay: 0.2 }}
                viewport={{ once: false, amount: 0.3 }}
            >
                <div className="w-28 h-28 flex items-center justify-center border-2 border-blue-600 rounded-full bg-blue-100 text-blue-700 font-bold">
                Python
                </div>
                <p className="mt-2 text-sm text-gray-600">{language === "ko" ? "- 데이터/AI 활용":"データ分析・AI活用"}</p>
            </motion.div>

            {/* Web */}
            <motion.div
                className="text-center"
                variants={bubbleVariants}
                initial="hidden"
                whileInView="visible"
                transition={{ duration: 0.6, type: "spring", delay: 0.4 }}
                viewport={{ once: false, amount: 0.3 }}
            >
                <div className="w-28 h-28 flex items-center justify-center border-2 border-teal-600 rounded-full bg-teal-100 text-teal-700 font-bold">
                Web
                </div>
                <p className="mt-2 text-sm text-gray-600">{language === "ko" ? "- Web 사이트 제작":"- Web サイト制作"}</p>
            </motion.div>

            {/* 기타 */}
            <motion.div
                className="text-center"
                variants={bubbleVariants}
                initial="hidden"
                whileInView="visible"
                transition={{ duration: 0.6, type: "spring", delay: 0.6 }}
                viewport={{ once: false, amount: 0.3 }}
            >
                <div className="w-28 h-28 flex items-center justify-center border-2 border-gray-500 rounded-full bg-gray-100 text-gray-700 font-bold mx-auto">
                {language === "ko" ? "기타등등":"その他"}
                </div>
                <p className="mt-2 text-sm text-gray-600">{language === "ko" ? "배우고 싶은 언어가 있으면 알려주세요":"学びたい言語があれば教えてください"}</p>
                
            </motion.div>
            
        </div>
        <motion.div
                className="text-center"
                variants={bubbleVariants}
                initial="hidden"
                whileInView="visible"
                transition={{ duration: 0.6, type: "spring", delay: 0.2 }}
                viewport={{ once: false, amount: 0.3 }}
            >
            <p className="mt-2 text-sm"> 
                {language === "ko" ?
                    "언어별로 조를 나눠 한가지의 언어를 배우고 그 언어를 사용하여 프로젝트를 진행합니다.":
                    "言語別にグループを分けて一つの言語を学び、その言語を使ってプロジェクトを進めます。"}
            </p>
            <p className="mt-2 text-sm"> 
                {language === "ko" ?
                    "방학에 언어별로 특강을 진행하며 조별로 공부한 언어외 배우고 싶은 언어를 공부 할 수 있습니다.":
                    "休みに言語別に特別講義を行い、グループ別に勉強した言語以外に学びたい言語を勉強することができます。"}
            </p>
        </motion.div>
      
        <motion.h2
            className="mt-10"
            variants={variants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            >
            {language === "ko" ? "주요 동아리 행사" : "主なサークル行事"}
        </motion.h2>
    </div>
    </section>
  );
}
