import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { X, Search, Sparkles, MapPin, MessageSquare, Star as StarIcon } from 'lucide-react';
import { ANWAA_STARS, AnwaaStarRecord, ANWAA_STARS_BY_N } from '../data/anwaaData';
import { useApp } from '../context/AppContext';
import { askAssistantAboutStar } from '../utils/starChatHelper';
import { formatStarsCountArabic } from '../utils/dateHelper';

type FilterType = 'all' | 'mansion' | 'famous' | 'favorites';

export const SuggestionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { favorites, toggleFavorite, isFavorite } = useApp();

  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModalStar, setSelectedModalStar] = useState<AnwaaStarRecord | null>(null);

  // Check URL query param ?star=N or ?detail=N to auto-open star details modal
  useEffect(() => {
    const starParam = searchParams.get('star') || searchParams.get('detail');
    if (starParam) {
      const starNum = parseInt(starParam, 10);
      if (!isNaN(starNum)) {
        const found = ANWAA_STARS_BY_N.get(starNum);
        if (found) {
          setSelectedModalStar(found);
        }
      }
    }
  }, [searchParams]);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedModalStar(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtered stars based on search query & active category
  const filteredStars = useMemo(() => {
    return ANWAA_STARS.filter((s) => {
      if (filter === 'mansion' && s.type !== 'mansion') return false;
      if (filter === 'famous' && s.type !== 'famous') return false;
      if (filter === 'favorites' && !favorites.includes(s.n)) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.constellation.toLowerCase().includes(q) ||
        s.scientificName.toLowerCase().includes(q) ||
        s.meaning.toLowerCase().includes(q) ||
        String(s.n) === q
      );
    });
  }, [filter, searchQuery, favorites]);

  // Random suggestion: pick a random star from the database and open its details inside the library
  const handleRandomSuggestion = () => {
    const randomIndex = Math.floor(Math.random() * ANWAA_STARS.length);
    const chosen = ANWAA_STARS[randomIndex];
    setSelectedModalStar(chosen);
    setSearchParams({ star: String(chosen.n) }, { replace: true });
  };

  const handleCloseModal = () => {
    setSelectedModalStar(null);
    if (searchParams.has('star') || searchParams.has('detail')) {
      searchParams.delete('star');
      searchParams.delete('detail');
      setSearchParams(searchParams, { replace: true });
    }
  };

  const getVerbatimFields = (star: AnwaaStarRecord) => {
    const fields = [
      { label: 'الكوكبة التي يقع فيها', value: star.constellation },
      { label: 'الاسم العلمي', value: star.scientificName },
      { label: 'المعنى', value: star.meaning },
      { label: 'الموقع', value: star.location },
      { label: 'الشكل', value: star.shape },
      { label: 'وقت الطلوع والسقوط', value: star.riseSetTime },
      { label: 'النوء والمطر', value: star.nawAndRain },
      { label: 'أقوال العرب والأمثال', value: star.arabSayings },
      { label: 'الشعر', value: star.poetry },
    ];
    return fields.filter((f) => f.value && f.value.trim().length > 0);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 select-none" dir="rtl" lang="ar">
      {/* Header with Page Title and Random Suggestion Button in its original prominent position */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--sky-line)] pb-5">
        <div>
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--sky-gold)] leading-tight"
            style={{ fontFamily: "'Amiri', serif" }}
          >
            مكتبة النجوم
          </h1>
          <p className="text-sm sm:text-base text-[var(--sky-muted)] mt-1.5 max-w-2xl leading-relaxed">
            استكشف جميع نجوم العرب ومنازل القمر الأربعين مع تفاصيل أسمائها ومعانيها وسياقها التراثي
          </p>
        </div>

        <button
          type="button"
          onClick={handleRandomSuggestion}
          className="px-4 py-2.5 rounded-[8px] bg-[var(--gold-fill)] text-[#1a1405] font-semibold text-sm hover:opacity-90 transition-opacity cursor-pointer shadow-md flex items-center gap-2 shrink-0"
        >
          <Sparkles className="w-4 h-4 text-[#1a1405]" />
          <span>اقتراح عشوائي</span>
        </button>
      </div>

      {/* Search Bar & Category Filters */}
      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[10px] p-4 sm:p-5 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم النجم، الكوكبة، أو المعنى..."
              className="w-full bg-[var(--input-bg)] border border-[var(--line)] rounded-[8px] pr-10 pl-3 py-2.5 text-sm text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--gold)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
              >
                مسح
              </button>
            )}
          </div>

          {/* Counter Badge */}
          <span className="text-xs px-3 py-1.5 rounded-[8px] bg-[var(--panel2)] border border-[var(--line)] text-[var(--gold)] font-medium self-start md:self-auto shrink-0">
            {formatStarsCountArabic(filteredStars.length)}
          </span>
        </div>

        {/* Filter Segmented Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-[var(--line)]/50">
          {[
            { id: 'all' as FilterType, label: 'الكل (٤٠)' },
            { id: 'mansion' as FilterType, label: 'المنازل (٢٨)' },
            { id: 'famous' as FilterType, label: 'مشاهير الكواكب (١٢)' },
            { id: 'favorites' as FilterType, label: `المفضلة (${favorites.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`py-2 px-3 rounded-[8px] text-xs sm:text-sm font-medium border transition-colors cursor-pointer text-center ${
                filter === tab.id
                  ? 'bg-[var(--gold-fill)] text-[#1a1405] border-[var(--gold)] font-semibold shadow-xs'
                  : 'bg-[var(--panel2)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)] hover:border-[var(--muted)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stars Cards Grid (All 40 stars in database) */}
      {filteredStars.length === 0 ? (
        <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[10px] p-12 text-center space-y-3">
          <p className="text-base text-[var(--ink)]">
            {filter === 'favorites'
              ? 'لم تضف نجوماً إلى المفضلة بعد. اضغط على رمز النجمة لحفظ أي نجم.'
              : 'لا توجد نجوم مطابقة لبحثك في المكتبة.'}
          </p>
          {filter === 'favorites' && (
            <button
              type="button"
              onClick={() => setFilter('all')}
              className="px-4 py-2 rounded-[8px] bg-[var(--gold-fill)] text-[#1a1405] font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer"
            >
              عرض جميع النجوم
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStars.map((star) => {
            const isFav = isFavorite(star.n);
            const snippet =
              star.meaning.length > 130
                ? `${star.meaning.slice(0, 130)}...`
                : star.meaning || 'من النجوم الموثقة في كتب الأنواء التراثية.';

            return (
              <div
                key={star.n}
                className="bg-[var(--panel)] border border-[var(--line)] rounded-[10px] p-4 sm:p-5 flex flex-col justify-between hover:border-[var(--gold)]/50 transition-colors shadow-sm"
              >
                <div>
                  {/* Top Meta: Number, Type Badge & Favorite button */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--muted)]">#{star.n}</span>
                      <span
                        className={`text-[11px] px-2.5 py-0.5 rounded-[8px] font-medium border bg-transparent ${
                          star.type === 'mansion'
                            ? 'border-[var(--gold)] text-[var(--gold)]'
                            : 'border-[var(--sky)] text-[var(--sky)]'
                        }`}
                      >
                        {star.type === 'mansion' ? 'منزلة' : 'من مشاهير الكواكب'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleFavorite(star.n)}
                      title={isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                      className={`w-7 h-7 rounded-[8px] flex items-center justify-center text-sm transition-colors cursor-pointer ${
                        isFav
                          ? 'text-[var(--gold)] bg-[var(--panel2)] border border-[var(--gold)]'
                          : 'text-[var(--muted)] hover:text-[var(--gold)] border border-[var(--line)]'
                      }`}
                    >
                      {isFav ? '★' : '☆'}
                    </button>
                  </div>

                  {/* Star Name */}
                  <h3
                    className="text-[24px] font-bold text-[var(--gold)] leading-snug mb-1"
                    style={{ fontFamily: "'Amiri', serif" }}
                  >
                    {star.name}
                  </h3>

                  {/* Constellation & Scientific Name */}
                  <p className="text-xs text-[var(--muted)] mb-3">
                    الكوكبة: <span className="text-[var(--ink)] font-medium">{star.constellation}</span>
                    {star.scientificName && (
                      <span className="mr-2 text-[var(--muted)] font-mono">({star.scientificName})</span>
                    )}
                  </p>

                  {/* Meaning & Context Snippet */}
                  <div className="bg-[var(--panel2)] border border-[var(--line)] rounded-[8px] p-3 mb-4">
                    <div className="text-[11px] font-semibold text-[var(--gold)] mb-1">المعنى والتراث</div>
                    <p className="text-xs sm:text-sm text-[var(--ink)] leading-relaxed line-clamp-3">
                      {snippet}
                    </p>
                  </div>
                </div>

                {/* Unified Action Buttons */}
                <div className="space-y-2 pt-2 border-t border-[var(--line)]/60">
                  <div className="flex items-center gap-2">
                    {/* Unified 'اعرضها على الخريطة' Button */}
                    <button
                      type="button"
                      onClick={() => navigate(`/map?star=${star.n}`)}
                      className="flex-1 py-2 px-3 rounded-[8px] bg-[var(--gold-fill)] text-[#1a1405] font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer text-center"
                    >
                      اعرضها على الخريطة
                    </button>

                    {/* Details Button inside the library */}
                    <button
                      type="button"
                      onClick={() => setSelectedModalStar(star)}
                      className="py-2 px-3 rounded-[8px] bg-[var(--panel2)] border border-[var(--line)] text-[var(--gold)] hover:border-[var(--gold)] text-xs font-medium transition-colors cursor-pointer"
                    >
                      التفاصيل
                    </button>
                  </div>

                  {/* Ask Smart Assistant Button */}
                  <button
                    type="button"
                    onClick={() => askAssistantAboutStar(navigate, star.name, star.n)}
                    className="w-full py-2 px-3 rounded-[8px] bg-[var(--panel2)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--gold)] hover:text-[var(--gold)] text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[var(--gold)]" />
                    <span>اسأل المساعد الذكي</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Star Details Modal inside the Library */}
      {selectedModalStar && (
        <div
          className="fixed inset-0 z-50 bg-[var(--tour-backdrop)] flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={handleCloseModal}
        >
          <div
            className="bg-[var(--panel)] border border-[var(--line)] rounded-[10px] p-5 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] pb-3.5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-[var(--muted)]">رقم النجم #{selectedModalStar.n}</span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-[8px] font-medium border bg-transparent ${
                      selectedModalStar.type === 'mansion'
                        ? 'border-[var(--gold)] text-[var(--gold)]'
                        : 'border-[var(--sky)] text-[var(--sky)]'
                    }`}
                  >
                    {selectedModalStar.type === 'mansion' ? 'منزلة' : 'من مشاهير الكواكب'}
                  </span>
                </div>
                <h2
                  className="text-2xl sm:text-3xl font-bold text-[var(--gold)]"
                  style={{ fontFamily: "'Amiri', serif" }}
                >
                  {selectedModalStar.name}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-8 h-8 rounded-[8px] bg-[var(--panel2)] border border-[var(--line)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--gold)] cursor-pointer"
                  title="إغلاق"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Actions Bar inside Modal */}
            <div className="flex flex-wrap items-center gap-2 pt-1 pb-1 border-b border-[var(--line)]">
              {/* Unified 'اعرضها على الخريطة' Button */}
              <button
                type="button"
                onClick={() => {
                  handleCloseModal();
                  navigate(`/map?star=${selectedModalStar.n}`);
                }}
                className="px-4 py-2 rounded-[8px] bg-[var(--gold-fill)] text-[#1a1405] font-semibold text-xs sm:text-sm hover:opacity-90 transition-opacity cursor-pointer"
              >
                اعرضها على الخريطة
              </button>

              {/* Ask Smart Assistant */}
              <button
                type="button"
                onClick={() => {
                  handleCloseModal();
                  askAssistantAboutStar(navigate, selectedModalStar.name, selectedModalStar.n);
                }}
                className="px-3.5 py-2 rounded-[8px] bg-[var(--panel2)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--gold)] hover:text-[var(--gold)] text-xs sm:text-sm font-medium transition-colors cursor-pointer"
              >
                اسأل المساعد الذكي
              </button>

              {/* Favorite Toggle */}
              <button
                type="button"
                onClick={() => toggleFavorite(selectedModalStar.n)}
                className={`px-3.5 py-2 rounded-[8px] border text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                  isFavorite(selectedModalStar.n)
                    ? 'bg-[var(--panel2)] border-[var(--gold)] text-[var(--gold)]'
                    : 'bg-[var(--panel2)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--gold)]'
                }`}
              >
                {isFavorite(selectedModalStar.n) ? '★ في المفضلة' : '☆ أضف للمفضلة'}
              </button>
            </div>

            {/* All Verbatim Fields from Heritage Source */}
            <div className="space-y-3 pt-2">
              {getVerbatimFields(selectedModalStar).map((item) => (
                <div
                  key={item.label}
                  className="bg-[var(--panel2)] border border-[var(--line)] rounded-[8px] p-3.5 space-y-1"
                >
                  <div className="text-xs font-semibold text-[var(--gold)]">{item.label}</div>
                  <div
                    className={`text-sm text-[var(--ink)] leading-relaxed whitespace-pre-line ${
                      item.label === 'الشعر' ? 'text-base leading-loose' : ''
                    }`}
                    style={item.label === 'الشعر' ? { fontFamily: "'Amiri', serif" } : undefined}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuggestionsPage;
