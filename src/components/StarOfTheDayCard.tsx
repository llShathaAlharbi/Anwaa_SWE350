import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStarOfTheDay } from '../data/anwaaData';
import { useApp } from '../context/AppContext';
import { askAssistantAboutStar } from '../utils/starChatHelper';

interface StarOfTheDayCardProps {
  id?: string;
  className?: string;
}

export const StarOfTheDayCard: React.FC<StarOfTheDayCardProps> = ({ id, className = '' }) => {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useApp();
  const nowDate = useMemo(() => new Date(), []);
  const starOfTheDay = useMemo(() => getStarOfTheDay(nowDate), [nowDate]);
  const isFav = isFavorite(starOfTheDay.n);

  return (
    <section
      id={id}
      className={`bg-[var(--panel)] border border-[var(--line)] rounded-[10px] p-[20px] flex flex-col justify-between space-y-4 shadow-sm ${className}`}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
          <span className="text-sm font-semibold text-[var(--muted)]">نجم اليوم</span>
          <span
            className={`text-xs px-3 py-1 rounded-[8px] font-medium border bg-transparent ${
              starOfTheDay.type === 'mansion'
                ? 'border-[var(--gold)] text-[var(--gold)]'
                : 'border-[var(--sky)] text-[var(--sky)]'
            }`}
          >
            {starOfTheDay.type === 'mansion' ? 'منزلة' : 'من مشاهير الكواكب'}
          </span>
        </div>

        <div>
          <h2
            className="text-[32px] font-bold text-[var(--gold)] leading-snug mb-1"
            style={{ fontFamily: "'Amiri', serif" }}
          >
            {starOfTheDay.name}
          </h2>
          <p className="text-xs sm:text-sm text-[var(--muted)]">
            الكوكبة التي يقع فيها:{' '}
            <span className="text-[var(--ink)] font-medium">{starOfTheDay.constellation}</span>
          </p>
        </div>

        {/* FULL "المعنى" field */}
        <div className="bg-[var(--panel2)] border border-[var(--line)] rounded-[8px] p-3.5 space-y-1.5">
          <div className="text-xs font-semibold text-[var(--gold)]">المعنى</div>
          <p className="text-sm text-[var(--ink)] leading-relaxed whitespace-pre-line">
            {starOfTheDay.meaning}
          </p>
        </div>

        {/* "الموقع" field */}
        <div className="bg-[var(--panel2)] border border-[var(--line)] rounded-[8px] p-3.5 space-y-1.5">
          <div className="text-xs font-semibold text-[var(--gold)]">الموقع</div>
          <p className="text-sm text-[var(--ink)] leading-relaxed whitespace-pre-line">
            {starOfTheDay.location}
          </p>
        </div>
      </div>

      {/* Action buttons: Map, Favorite, Ask Smart Assistant */}
      <div className="pt-3 border-t border-[var(--line)] flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => navigate(`/map?star=${starOfTheDay.n}`)}
          className="px-4 py-2 rounded-[8px] bg-[var(--gold-fill)] text-[#1a1405] font-semibold text-xs sm:text-sm hover:opacity-90 transition-opacity cursor-pointer"
        >
          اعرضها على الخريطة
        </button>

        <button
          type="button"
          onClick={() => toggleFavorite(starOfTheDay.n)}
          className={`px-3.5 py-2 rounded-[8px] border text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
            isFav
              ? 'bg-[var(--panel2)] border-[var(--gold)] text-[var(--gold)]'
              : 'bg-[var(--panel2)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--gold)]'
          }`}
        >
          {isFav ? '★ في المفضلة' : '☆ أضف للمفضلة'}
        </button>

        <button
          type="button"
          onClick={() => askAssistantAboutStar(navigate, starOfTheDay.name, starOfTheDay.n)}
          className="px-4 py-2 rounded-[8px] bg-transparent border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--panel2)] hover:border-[var(--gold)] hover:text-[var(--gold)] text-xs sm:text-sm font-medium transition-colors cursor-pointer"
        >
          اسأل المساعد الذكي
        </button>
      </div>
    </section>
  );
};

export default StarOfTheDayCard;
