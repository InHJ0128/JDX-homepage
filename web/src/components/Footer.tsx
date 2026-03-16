import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";

interface NavItem {
  id: number;
  label_ko: string;
  label_ja: string;
  url: string;
}

export default function Footer() {
  const { language } = useLanguage();
  const [items, setItems] = useState<NavItem[]>([]);

  useEffect(() => {
    fetch("/api/user/footer-nav")
      .then((res) => res.json())
      .then(setItems)
      .catch(console.error);
  }, []);

  return (
    <footer className="bg-gray-400 text-black py-4">
      <div className="flex flex-wrap justify-start gap-2 divide-x divide-gray-500">
        {items.map((i) => {
          const label = language === "ko" ? i.label_ko : i.label_ja;
          const isExternal = /^https?:\/\//i.test(i.url);

          if (isExternal) {
            return (
              <a
                key={i.id}
                href={i.url}
                className="w-[120px] text-center py-2 rounded transition hover:bg-gray-500 cursor-pointer"
                target="_blank"
                rel="noreferrer"
              >
                {label}
              </a>
            );
          }

          return (
            <Link
              key={i.id}
              to={i.url}
              className="w-[120px] text-center py-2 rounded transition hover:bg-gray-500 cursor-pointer"
            >
              {label}
            </Link>
          );
        })}
      </div>
    </footer>
  );
}
