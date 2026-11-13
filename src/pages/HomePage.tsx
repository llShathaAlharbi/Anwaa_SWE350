import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { StarOfTheDayCard } from '../components/StarOfTheDayCard';

interface FaqItem {
  id: number;
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 1,
    question: 'ما هو مشروع أنواء؟',
    answer:
      'أنواء منصة تفاعلية تجمع بين خريطة النجوم ومساعد ذكي، لاستكشاف النجوم والتعرّف على ارتباطها بالتاريخ والتراث السعودي والعربي.',
  },
  {
    id: 2,
    question: 'كيف أستكشف النجوم في الخريطة؟',
    answer:
      'انتقل إلى صفحة «الخريطة»، ثم اضغط على النجم للاطلاع على معلوماته، واستخدم أدوات التكبير والتصغير لاستكشاف الخريطة.',
  },
  {
    id: 3,
    question: 'كيف أسأل عن نجم أو معلومة تراثية؟',
    answer:
      'افتح «اسأل أنواء» واكتب سؤالك، أو استخدم زر «اسأل المساعد الذكي» الموجود في بطاقة النجم.',
  },
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [openFaqIds, setOpenFaqIds] = useState<number[]>([]);

  // If a star parameter is passed to root (e.g. /?star=12), redirect seamlessly to the map page
  useEffect(() => {
    const star = searchParams.get('star');
    if (star) {
      navigate(`/map?star=${encodeURIComponent(star)}`, { replace: true });
    }
  }, [searchParams, navigate]);

  const toggleFaq = (id: number) => {
    setOpenFaqIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div
      className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-10 sm:space-y-12 select-none"
      dir="rtl"
      lang="ar"
    >
      {/* Hero Section: Centered prominent project title & slogan */}
      <section
        id="tour-hero-brand"
        className="text-center pt-2 sm:pt-4 pb-2 flex flex-col items-center justify-center space-y-3"
      >
        <h1
          className="font-amiri text-5xl sm:text-6xl md:text-7xl font-bold text-[var(--gold)] tracking-wide leading-tight drop-shadow-md"
        >
          أنواء
        </h1>
        <p
          className="text-base sm:text-xl md:text-2xl text-[var(--sky-muted)] font-medium max-w-3xl mx-auto leading-relaxed px-2"
          style={{ fontFamily: "'Year of the Camel', 'Amiri', serif" }}
        >
          إِذَا مَا جَهِلْتَ الشَّيْءَ فَانْظُرْ إِلَى السَّمَا .. فَفِيهَا دَلِيلٌ لِلَّبِيبِ وَمُرْشِدُ
        </p>
      </section>

      {/* Section 1: بطاقة «نجم اليوم» */}
      <section className="space-y-3">
        <StarOfTheDayCard id="tour-star-of-the-day" />
      </section>

      {/* Section 2: قسم «الأسئلة الأكثر شيوعًا» */}
      <section
        id="tour-faq-section"
        className="bg-[var(--panel)] border border-[var(--line)] rounded-[10px] p-5 sm:p-6 space-y-4 shadow-sm"
      >
        <div className="border-b border-[var(--line)] pb-3">
          <h2
            className="text-2xl sm:text-3xl font-bold text-[var(--gold)]"
            style={{ fontFamily: "'Amiri', serif" }}
          >
            الأسئلة الأكثر شيوعاً
          </h2>
          <p className="text-xs sm:text-sm text-[var(--muted)] mt-1">
            إجابات مبسطة لأهم الاستفسارات حول منصة أنواء واستخدامها
          </p>
        </div>

        <div className="space-y-2.5 pt-1">
          {FAQ_ITEMS.map((item) => {
            const isOpen = openFaqIds.includes(item.id);
            return (
              <div
                key={item.id}
                className="bg-[var(--panel2)] border border-[var(--line)] rounded-[8px] transition-colors overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(item.id)}
                  aria-expanded={isOpen}
                  className="w-full text-right p-3.5 sm:p-4 flex items-center justify-between gap-3 font-semibold text-sm sm:text-base text-[var(--ink)] hover:text-[var(--gold)] cursor-pointer transition-colors"
                >
                  <span className="leading-snug">{item.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-[var(--gold)] shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-3.5 sm:px-4 pb-4 pt-1 border-t border-[var(--line)]/50 text-xs sm:text-sm text-[var(--ink)]/90 leading-relaxed">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
