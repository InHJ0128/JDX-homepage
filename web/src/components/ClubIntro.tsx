import { useMemo, type ReactNode } from "react";
import { useLanguage } from "../contexts/LanguageContext";

type Lang = "ko" | "ja";

type Slide = {
  key: string;
  bg: string;
  title: { ko: string; ja: string };
  subtitle?: { ko: string; ja: string };
  // ✅ lang 파라미터 제거 (TS6133 방지)
  body: (t: (ko: string, ja: string) => string) => ReactNode;
};

type ClubIntroProps = {
  pageCount?: number;
  pageHeight?: number; // Home에서 측정한 "한 페이지 높이(px)"
};

export default function ClubIntro({ pageCount, pageHeight }: ClubIntroProps) {
  const { language } = useLanguage();
  const lang = (language as Lang) ?? "ko";
  const t = (ko: string, ja: string) => (lang === "ko" ? ko : ja);

  const slides: Slide[] = useMemo(
    () => [
      {
        key: "hero",
        bg: "from-slate-50 to-white",
        title: {
          ko: "IT가 어렵게 느껴져도 괜찮아요",
          ja: "ITが難しく感じても大丈夫",
        },
        subtitle: {
          ko: "JDX는 ‘성장’을 만드는 일본 IT 동아리",
          ja: "JDXは「成長」をつくる日本ITサークル",
        },
        body: (t) => (
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
                {t(
                  "일본어는 할 수 있는데 IT는 낯설고 어렵게 느껴지는 학생들이 많아요. JDX는 그런 분들이 ‘같이 시작해서’ ‘결과물’까지 만들어보는 곳이에요.",
                  "日本語はできるけどITが難しく感じる学生は多いです。JDXは「一緒に始めて」「成果物」まで作れる場所です。"
                )}
              </p>

              <div className="flex flex-wrap gap-2">
                <Badge>{t("초보 환영", "初心者歓迎")}</Badge>
                <Badge>{t("경험자 환영", "経験者歓迎")}</Badge>
                <Badge accent>{t("항시 모집", "常時募集")}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <MiniCard title={t("같이 공부", "一緒に勉強")} desc={t("질문하고 공유", "質問・共有")} />
                <MiniCard title={t("성장 루틴", "成長ルーティン")} desc={t("기초→프로젝트", "基礎→制作")} />
              </div>
            </div>

            <VisualPanel
              label={t("JDX", "JDX")}
              headline={t("혼자서 막히면,\n함께 해결해요.", "一人で詰まったら、\n一緒に解決。")}
              icons={["📚", "🤝", "🚀"]}
              subcards={[
                t("같이 공부", "一緒に勉強"),
                t("서로 도와줌", "助け合い"),
                t("성장 체감", "成長実感"),
              ]}
            />
          </div>
        ),
      },

      {
        key: "together",
        bg: "from-blue-50 to-slate-50",
        title: { ko: "같이 공부하는 장소", ja: "一緒に勉強する場所" },
        subtitle: {
          ko: "혼자서 포기하지 않게, 서로 끌어주는 분위기",
          ja: "一人で諦めないために、お互いに支える雰囲気",
        },
        body: (t) => (
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <VisualGrid
              label={t("스터디", "勉強会")}
              title={t("함께 공부하는 분위기", "一緒に勉強する雰囲気")}
              icons={["🧑‍💻", "👩‍💻", "💬", "✅"]}
            />
            <div className="space-y-5">
              <Bullet>{t("모르는 건 바로 질문하고, 같이 찾아보고, 서로 설명해요", "分からないことはすぐ質問して、一緒に調べて説明し合います")}</Bullet>
              <Bullet>{t("‘어렵다’는 감정이 줄어들면, IT가 재밌어지기 시작해요", "「難しい」という感情が減ると、ITが楽しくなります")}</Bullet>
              <Bullet>{t("작은 목표를 자주 달성하며 ‘성장 체감’을 만들어요", "小さな目標を積み重ねて「成長実感」を作ります")}</Bullet>
            </div>
          </div>
        ),
      },

      {
        key: "beginner",
        bg: "from-emerald-50 to-slate-50",
        title: { ko: "초심자도 알려주는 문화", ja: "初心者にも教える文化" },
        subtitle: { ko: "기초부터 천천히, 페이스에 맞춰 같이", ja: "基礎からゆっくり、ペースに合わせて" },
        body: (t) => (
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-5">
              <Bullet>{t("질문 환영: ‘이걸 물어봐도 되나?’ 걱정하지 마요", "質問歓迎：「こんなこと聞いていいの？」は不要")}</Bullet>
              <Bullet>{t("기초 개념을 ‘이해되는 언어’로 다시 풀어줘요", "基礎概念を「分かる言葉」で噛み砕いて説明します")}</Bullet>
              <Bullet>{t("처음엔 따라오기만 해도 OK, 조금씩 손에 익게 만들어요", "最初は真似するだけでもOK。少しずつ身につけます")}</Bullet>
            </div>

            <VisualPanel
              label={t("멘토링", "メンタリング")}
              headline={t("처음이라서\n더 환영해요.", "初めてだからこそ\n大歓迎。")}
              icons={["🙋", "🧩", "🧠"]}
              subcards={[
                t("질문 환영", "質問歓迎"),
                t("같이 풀이", "一緒に解く"),
                t("이해될 때까지", "理解できるまで"),
              ]}
            />
          </div>
        ),
      },

      {
        key: "roadmap",
        bg: "from-purple-50 to-slate-50",
        title: { ko: "한 학기 성장 로드맵", ja: "1学期の成長ロードマップ" },
        subtitle: { ko: "기초 → 연습 → 프로젝트 → 발표(포트폴리오)", ja: "基礎 → 演習 → 制作 → 発表（ポートフォリオ）" },
        body: (t) => (
          <div className="space-y-8">
            <Timeline
              items={[
                { step: "STEP 1", title: t("기초 학습", "基礎学習"), desc: t("기초 문법/개념 + 작은 실습", "基礎文法/概念 + 小さな実習") },
                { step: "STEP 2", title: t("연습/문제", "演習/問題"), desc: t("손에 익히는 반복 학습", "手に馴染ませる反復") },
                { step: "STEP 3", title: t("팀 프로젝트", "チーム制作"), desc: t("협업으로 결과물 만들기", "協力して成果物を作る") },
                { step: "STEP 4", title: t("발표/정리", "発表/整理"), desc: t("포트폴리오로 남기기", "ポートフォリオに残す") },
              ]}
            />
            <div className="grid md:grid-cols-3 gap-4">
              <BigStat title={t("성장", "成長")} desc={t("할 수 있는 게 늘어남", "できることが増える")} />
              <BigStat title={t("결과물", "成果物")} desc={t("눈에 보이는 프로젝트", "見えるプロジェクト")} />
              <BigStat title={t("자신감", "自信")} desc={t("IT가 덜 무섭다", "ITが怖くなくなる")} />
            </div>
          </div>
        ),
      },

      {
        key: "project",
        bg: "from-slate-50 to-white",
        title: { ko: "프로젝트로 성장", ja: "制作で成長" },
        subtitle: { ko: "만들어본 경험이 실력을 남깁니다", ja: "作った経験が実力になります" },
        body: (t) => (
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <VisualPanel
              label={t("프로젝트", "プロジェクト")}
              headline={t("결과물이 남는 성장", "成果物が残る成長")}
              icons={["🌐", "⚙️", "📊"]}
              subcards={[
                t("협업 경험", "協働経験"),
                t("Git/커뮤니케이션", "Git/連携"),
                t("발표/정리", "発表/整理"),
              ]}
            />
            <div className="space-y-5">
              <Bullet>{t("웹/자동화/데이터 등 관심 분야로 결과물을 만들어요", "Web/自動化/データなど興味分野で成果物を作ります")}</Bullet>
              <Bullet>{t("협업(역할 분담, 깃, 커뮤니케이션) 경험이 쌓여요", "協働（役割分担・Git・コミュニケーション）の経験が積めます")}</Bullet>
              <Bullet>{t("발표/정리까지 해서 포트폴리오로 남겨요", "発表/整理までしてポートフォリオに残します")}</Bullet>
            </div>
          </div>
        ),
      },

      {
        key: "career",
        bg: "from-amber-50 to-slate-50",
        title: { ko: "일본 취업 관심자도 환영", ja: "日本就職に興味ある方も歓迎" },
        subtitle: { ko: "팁/상담/조언을 구할 수 있는 환경", ja: "Tips/相談/アドバイスを得られる環境" },
        body: (t) => (
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-5">
              <Bullet>{t("일본 취업/인턴 준비 팁 공유", "日本就職/インターン準備のTips共有")}</Bullet>
              <Bullet>{t("이력서/면접/포트폴리오 방향 조언", "履歴書/面接/ポートフォリオの方向性アドバイス")}</Bullet>
              <Bullet>{t("성장을 목표로 하는 사람에게 현실적인 길잡이", "成長を目指す人への現実的ガイド")}</Bullet>
            </div>
            <VisualPanel
              label={t("일본 진로", "日本キャリア")}
              headline={t("성장 + 진로\n둘 다 챙기자", "成長 + 進路\nどちらも")}
              icons={["📝", "🗣️", "🧭"]}
              subcards={[
                t("팁 공유", "Tips"),
                t("상담/조언", "相談"),
                t("방향 설정", "方向性"),
              ]}
            />
          </div>
        ),
      },

      {
        key: "cta",
        bg: "from-blue-50 to-white",
        title: { ko: "부담 없이 시작해요", ja: "気軽に始めよう" },
        subtitle: { ko: "항시 모집 · 지금부터 천천히 성장하면 됩니다", ja: "常時募集 · 今からゆっくり成長すればOK" },
        body: (t) => (
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
              {t(
                "지원은 언제든지 가능해요. ‘관심은 있는데 어렵다’는 마음 그대로 와도 괜찮습니다.",
                "応募はいつでもOK。「興味はあるけど難しい」そのまま来ても大丈夫です。"
              )}
            </p>
            <div className="flex justify-center flex-wrap gap-2">
              <Badge accent>{t("항시 모집", "常時募集")}</Badge>
              <Badge>{t("초보 환영", "初心者歓迎")}</Badge>
              <Badge>{t("경험자 환영", "経験者歓迎")}</Badge>
            </div>
            <p className="text-sm text-gray-600">
              {t("오른쪽 아래 ‘지원하기’ 버튼으로 바로 지원할 수 있어요.", "右下の「応募」ボタンからすぐ応募できます。")}
            </p>
          </div>
        ),
      },
    ],
    []
  );

  const visibleSlides = pageCount ? slides.slice(0, pageCount) : slides;

  return (
    <>
      {visibleSlides.map((s) => (
        <section
          key={s.key}
          className="relative w-full flex items-center justify-center px-6 overflow-hidden snap-start"
          style={{
            height: pageHeight ? `${pageHeight}px` : "100dvh",
            scrollSnapStop: "always",
          }}
        >
          <div className={`absolute inset-0 bg-gradient-to-b ${s.bg}`} />
          <div className="relative w-full max-w-6xl">
            <div className="text-center">
              <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight">
                {s.title[lang]}
              </h2>
              {s.subtitle && (
                <p className="mt-4 text-base md:text-lg text-gray-600">
                  {s.subtitle[lang]}
                </p>
              )}
            </div>
            <div className="mt-10">{s.body(t)}</div>
          </div>
        </section>
      ))}
    </>
  );
}

/* ---------- UI pieces ---------- */

function Badge({ children, accent }: { children: ReactNode; accent?: boolean }) {
  return (
    <span
      className={[
        "inline-flex items-center px-3 py-1 rounded-full border text-sm",
        accent ? "bg-blue-600 text-white border-blue-600" : "bg-white/70 text-gray-700",
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 items-start text-gray-800">
      <span className="mt-2 h-2 w-2 rounded-full bg-blue-600 shrink-0" />
      <div className="text-lg md:text-xl leading-relaxed">{children}</div>
    </div>
  );
}

function MiniCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border bg-white/80 backdrop-blur p-4 shadow-sm">
      <div className="font-extrabold">{title}</div>
      <div className="text-sm text-gray-600 mt-1">{desc}</div>
    </div>
  );
}

function BigStat({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border bg-white/80 backdrop-blur p-5 shadow-sm text-center">
      <div className="text-2xl font-extrabold">{title}</div>
      <div className="text-sm text-gray-600 mt-2">{desc}</div>
    </div>
  );
}

function Timeline({
  items,
}: {
  items: { step: string; title: string; desc: string }[];
}) {
  return (
    <div className="rounded-2xl border bg-white/80 backdrop-blur p-6 shadow-sm">
      <div className="grid md:grid-cols-4 gap-4">
        {items.map((it, i) => (
          <div key={i} className="rounded-xl border bg-white p-4">
            <div className="text-xs text-gray-500">{it.step}</div>
            <div className="mt-1 font-extrabold">{it.title}</div>
            <div className="mt-2 text-sm text-gray-600">{it.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Visual blocks ---------- */

function VisualPanel({
  label,
  headline,
  icons,
  subcards,
}: {
  label: string;
  headline: string;
  icons: string[];
  subcards?: string[];
}) {
  return (
    <div className="rounded-3xl border bg-white/70 backdrop-blur p-8 shadow-sm">
      <div className="text-sm text-gray-500 mb-3">{label}</div>

      <div className="text-2xl md:text-3xl font-extrabold whitespace-pre-line text-gray-800">
        {headline}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {icons.map((ic, i) => (
          <div
            key={i}
            className="rounded-2xl bg-slate-100 h-24 flex items-center justify-center text-3xl"
          >
            {ic}
          </div>
        ))}
      </div>

      {subcards && (
        <div className="mt-5 grid grid-cols-3 gap-3">
          {subcards.map((s, i) => (
            <div
              key={i}
              className="rounded-xl border bg-white px-3 py-2 text-sm text-gray-700 text-center"
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VisualGrid({
  label,
  title,
  icons,
}: {
  label: string;
  title: string;
  icons: string[];
}) {
  return (
    <div className="rounded-3xl border bg-white/70 backdrop-blur p-8 shadow-sm">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-3 text-2xl font-extrabold text-gray-800">{title}</div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {icons.map((ic, i) => (
          <div
            key={i}
            className="rounded-2xl bg-slate-100 h-28 flex items-center justify-center text-3xl"
          >
            {ic}
          </div>
        ))}
      </div>
    </div>
  );
}