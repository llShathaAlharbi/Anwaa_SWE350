import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ANWAA_STARS, AnwaaStarRecord } from '../data/anwaaData';
import { useApp } from '../context/AppContext';
import { askAssistantAboutStar } from '../utils/starChatHelper';

import { formatStarsCountArabic } from '../utils/dateHelper';

export const FavoritesPage: React.FC = () => {
  const { favorites, toggleFavorite } = useApp();
  const navigate = useNavigate();

  const favoriteStars: AnwaaStarRecord[] = useMemo(() => {
    return ANWAA_STARS.filter((s) => favorites.includes(s.n));
  }, [favorites]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6" dir="rtl" lang="ar">
      {/* Page Header sitting directly on sky background */}
      <div className="border-b border-[var(--sky-line)] pb-4 flex items-center justify-between">
        <div>
          <h1
            className="text-3xl sm:text-4xl font-bold text-[var(--sky-gold)]"
            style={{ fontFamily: "'Amiri', serif" }}
          >
            المفضلة
          </h1>
          <p className="text-sm text-[var(--sky-muted)] mt-1">
            نجومك ومنازلك المحفوظة للوصول السريع
          </p>
        </div>
        <span className="text-xs px-3 py-1 rounded-[8px] bg-[var(--panel)] border border-[var(--line)] text-[var(--gold)]">
          {formatStarsCountArabic(favoriteStars.length)}
        </span>
      </div>

      {favoriteStars.length === 0 ? (
        <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[10px] p-8 text-center space-y-4">
          <p className="text-base text-[var(--ink)]">
            لم تضف نجوماً بعد. افتح الخريطة واضغط على النجمة.
          </p>
          <div>
            <button
              type="button"
              onClick={() => navigate('/map')}
              className="px-5 py-2.5 rounded-[8px] bg-[var(--gold-fill)] text-[#1a1405] font-semibold text-sm hover:opacity-90 transition-opacity cursor-pointer"
            >
              اذهب للخريطة
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 min-[701px]:grid-cols-2 min-[1021px]:grid-cols-3 gap-4">
          {favoriteStars.map((star) => {
            const snippet =
              star.meaning.length > 120
                ? `${star.meaning.slice(0, 120)}...`
                : `${star.meaning}...`;
            return (
              <div
                key={star.n}
                className="bg-[var(--panel)] border border-[var(--line)] rounded-[10px] p-[14px] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs text-[var(--muted)]">الكوكبة: {star.constellation}</span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-[8px] font-medium border bg-transparent ${
                        star.type === 'mansion'
                          ? 'border-[var(--gold)] text-[var(--gold)]'
                          : 'border-[var(--sky)] text-[var(--sky)]'
                      }`}
                    >
                      {star.type === 'mansion' ? 'منزلة' : 'من مشاهير الكواكب'}
                    </span>
                  </div>

                  <h3
                    className="text-[22px] font-bold text-[var(--gold)] mb-2 leading-snug"
                    style={{ fontFamily: "'Amiri', serif" }}
                  >
                    {star.name}
                  </h3>

                  <p className="text-sm text-[var(--ink)] leading-relaxed mb-4">{snippet}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/map?star=${star.n}`)}
                    className="flex-1 min-w-[100px] py-2 px-3 rounded-[8px] bg-[var(--gold-fill)] text-[#1a1405] font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    اعرضها على الخريطة
                  </button>

                  <button
                    type="button"
                    onClick={() => askAssistantAboutStar(navigate, star.name, star.n)}
                    className="py-2 px-3 rounded-[8px] bg-[var(--panel2)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--gold)] hover:text-[var(--gold)] text-xs transition-colors cursor-pointer"
                  >
                    اسأل المساعد الذكي
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleFavorite(star.n)}
                    className="py-2 px-3 rounded-[8px] bg-[var(--panel2)] border border-[var(--line)] text-[var(--ember)] hover:border-[var(--ember)] text-xs transition-colors cursor-pointer"
                  >
                    إزالة
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
