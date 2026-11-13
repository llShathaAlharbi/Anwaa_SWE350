import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SkyMap, SkyMapHandle, TonightSkyParams } from '../components/SkyMap';
import {
  ANWAA_STARS,
  ANWAA_STARS_BY_N,
  TABLE_HEADERS,
  SAUDI_CITIES,
  CityLocation,
  computeLST,
  getOverheadAnwaaStars,
  OverheadStarItem,
} from '../data/anwaaData';
import { useApp } from '../context/AppContext';
import { askAssistantAboutStar } from '../utils/starChatHelper';
import { formatStarsCountArabic } from '../utils/dateHelper';

type FilterType = 'all' | 'mansion' | 'famous' | 'favorites';

export const MapPage: React.FC = () => {
  const skyMapRef = useRef<SkyMapHandle>(null);
  const { favorites, toggleFavorite } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedN, setSelectedN] = useState<number>(3); // Default الثريا
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Tonight's Sky ("سماء الآن") state
  const [tonightActive, setTonightActive] = useState(false);
  const [locationCoords, setLocationCoords] = useState<{
    lat: number;
    lon: number;
    label: string;
  } | null>(null);
  const [isCityPickerOpen, setIsCityPickerOpen] = useState(false);
  const [nowDate, setNowDate] = useState<Date>(() => new Date());

  // Select star helper that both updates state and flies the canvas
  const handleSelectFromUI = useCallback((n: number) => {
    setSelectedN(n);
    setTimeout(() => {
      skyMapRef.current?.selectStar(n);
    }, 30);
  }, []);

  // Check ?star=N query param on mount / param change
  useEffect(() => {
    const starParam = searchParams.get('star');
    if (starParam) {
      const parsed = Number(starParam);
      if (!Number.isNaN(parsed) && ANWAA_STARS_BY_N.has(parsed)) {
        setSelectedN(parsed);
        const timer = setTimeout(() => {
          skyMapRef.current?.selectStar(parsed);
        }, 120);
        searchParams.delete('star');
        setSearchParams(searchParams, { replace: true });
        return () => clearTimeout(timer);
      }
    }
  }, [searchParams, setSearchParams]);

  // Refresh Tonight's Sky every 60 seconds when active
  useEffect(() => {
    if (!tonightActive || !locationCoords) return;
    const interval = setInterval(() => {
      const updatedNow = new Date();
      setNowDate(updatedNow);
      const { LST } = computeLST(locationCoords.lon, updatedNow.getTime());
      skyMapRef.current?.setCustomView(LST, locationCoords.lat, 60);
    }, 60000);
    return () => clearInterval(interval);
  }, [tonightActive, locationCoords]);

  const activateLocation = useCallback((lat: number, lon: number, label: string) => {
    const current = new Date();
    setNowDate(current);
    setLocationCoords({ lat, lon, label });
    setTonightActive(true);
    setIsCityPickerOpen(false);
    const { LST } = computeLST(lon, current.getTime());
    setTimeout(() => {
      skyMapRef.current?.setCustomView(LST, lat, 60);
    }, 40);
  }, []);

  const handleToggleTonight = useCallback(() => {
    if (tonightActive) {
      setTonightActive(false);
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          activateLocation(pos.coords.latitude, pos.coords.longitude, 'موقعك الحالي');
        },
        () => {
          setIsCityPickerOpen(true);
        },
        { timeout: 6000 }
      );
    } else {
      setIsCityPickerOpen(true);
    }
  }, [tonightActive, activateLocation]);

  const tonightParams: TonightSkyParams | null = useMemo(() => {
    if (!tonightActive || !locationCoords) return null;
    const { LST } = computeLST(locationCoords.lon, nowDate.getTime());
    return {
      active: true,
      lat: locationCoords.lat,
      lon: locationCoords.lon,
      LST,
    };
  }, [tonightActive, locationCoords, nowDate]);

  const overheadStars: OverheadStarItem[] = useMemo(() => {
    if (!tonightActive || !locationCoords) return [];
    const { starsAbove5Deg } = getOverheadAnwaaStars(
      locationCoords.lat,
      locationCoords.lon,
      nowDate.getTime()
    );
    return starsAbove5Deg;
  }, [tonightActive, locationCoords, nowDate]);

  const filteredStars = useMemo(() => {
    const q = searchQuery.trim();
    return ANWAA_STARS.filter((s) => {
      if (filter === 'mansion' && s.type !== 'mansion') return false;
      if (filter === 'famous' && s.type !== 'famous') return false;
      if (filter === 'favorites' && !favorites.includes(s.n)) return false;
      if (!q) return true;
      return (
        s.name.includes(q) ||
        s.constellation.includes(q) ||
        s.scientificName.toLowerCase().includes(q.toLowerCase()) ||
        s.meaning.includes(q) ||
        String(s.n) === q
      );
    });
  }, [filter, searchQuery, favorites]);

  const selectedStar = useMemo(() => {
    return ANWAA_STARS_BY_N.get(selectedN) || ANWAA_STARS[0];
  }, [selectedN]);

  const isSelectedFav = favorites.includes(selectedStar.n);

  const verbatimFields: { label: string; value: string }[] = [
    { label: TABLE_HEADERS[0] || 'رقم النجم', value: selectedStar.rawNumber || String(selectedStar.n) },
    { label: TABLE_HEADERS[1] || 'الاسم', value: selectedStar.name },
    { label: TABLE_HEADERS[2] || 'الكوكبة التي يقع فيها', value: selectedStar.constellation },
    { label: TABLE_HEADERS[3] || 'الاسم العلمي', value: selectedStar.scientificName },
    { label: TABLE_HEADERS[4] || 'المعنى', value: selectedStar.meaning },
    { label: TABLE_HEADERS[5] || 'الموقع', value: selectedStar.location },
    { label: TABLE_HEADERS[6] || 'الشكل', value: selectedStar.shape },
    { label: TABLE_HEADERS[7] || 'وقت الطلوع والسقوط', value: selectedStar.riseSetTime },
    { label: TABLE_HEADERS[8] || 'النوء والمطر', value: selectedStar.nawAndRain },
    { label: TABLE_HEADERS[9] || 'أقوال العرب والأمثال', value: selectedStar.arabSayings },
    { label: TABLE_HEADERS[10] || 'الشعر', value: selectedStar.poetry },
  ];

  const topMetaFields = verbatimFields
    .slice(0, 4)
    .filter((item) => item.value && String(item.value).trim().length > 0);
  const detailFields = verbatimFields
    .slice(4)
    .filter((item) => item.value && String(item.value).trim().length > 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-[24px]" dir="rtl" lang="ar">
      {/* Sky Map Canvas Section: reduced width by 5% (w-[95%]), centered with mx-auto */}
      <div className="w-[95%] mx-auto bg-[var(--panel)] border border-[var(--line)] rounded-[10px] p-[14px]">
        <SkyMap
          ref={skyMapRef}
          initialSelected={selectedN}
          favorites={favorites}
          tonightSky={tonightParams}
          onToggleTonightSky={handleToggleTonight}
          onSelect={(n) => setSelectedN(n)}
        />
      </div>

      {/* 8. "فوقك الآن" Panel when Tonight's Sky is active */}
      {tonightActive && locationCoords && (
        <div className="bg-[var(--panel)] border border-[var(--gold)] rounded-[10px] p-[14px] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
            <div>
              <h2
                className="text-xl font-bold text-[var(--gold)]"
                style={{ fontFamily: "'Amiri', serif" }}
              >
                فوقك الآن — نجوم أنواء الظاهرة في سمائك
              </h2>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                الموقع: <span className="text-[var(--ink)]">{locationCoords.label}</span> (
                {locationCoords.lat.toFixed(2)}°، {locationCoords.lon.toFixed(2)}°) • الوقت المحلي:{' '}
                <span className="text-[var(--ink)]">
                  {nowDate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCityPickerOpen(true)}
                className="px-3 py-1.5 rounded-[8px] bg-[var(--panel2)] border border-[var(--line)] text-[var(--ink)] text-xs hover:border-[var(--gold)] transition-colors cursor-pointer"
              >
                تغيير المدينة
              </button>
              <button
                type="button"
                onClick={() => setTonightActive(false)}
                className="px-3 py-1.5 rounded-[8px] bg-[var(--panel2)] border border-[var(--ember)] text-[var(--ember)] text-xs hover:opacity-85 transition-opacity cursor-pointer"
              >
                إيقاف سماء الآن
              </button>
            </div>
          </div>

          {overheadStars.length === 0 ? (
            <p className="text-sm text-[var(--muted)] py-2">
              لا توجد نجوم من القائمة بارتفاع أكبر من 5° فوق الأفق في هذه اللحظة.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto pr-1">
              {overheadStars.map((item) => {
                const shortName = item.star.name.split(/[،,]/)[0].trim();
                return (
                  <button
                    key={item.star.n}
                    type="button"
                    onClick={() => handleSelectFromUI(item.star.n)}
                    className={`text-right p-2.5 rounded-[8px] border transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                      selectedN === item.star.n
                        ? 'bg-[var(--panel2)] border-[var(--gold)]'
                        : 'bg-[var(--panel2)] border-[var(--line)] hover:border-[var(--muted)]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[var(--ink)] truncate">
                        {shortName}
                      </div>
                      <div className="text-xs text-[var(--muted)]">{item.compass}</div>
                    </div>
                    <div className="text-left shrink-0">
                      <span className="inline-block px-2 py-0.5 rounded-[8px] bg-[var(--panel)] border border-[var(--line)] text-xs font-mono text-[var(--gold)]">
                        {Math.round(item.alt)}°
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Bottom Grid: Searchable Star List + Verbatim Star Info Card (24px gap) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[24px] items-start">
        {/* Searchable Star List */}
        <div
          id="tour-star-list"
          className="lg:col-span-5 bg-[var(--panel)] border border-[var(--line)] rounded-[10px] p-[14px] flex flex-col max-h-[680px]"
        >
          <div className="flex items-center justify-between mb-3">
            <h2
              className="text-xl font-bold text-[var(--gold)]"
              style={{ fontFamily: "'Amiri', serif" }}
            >
              قائمة النجوم والمنازل
            </h2>
            <span className="text-xs text-[var(--muted)]">
              {formatStarsCountArabic(filteredStars.length)}
            </span>
          </div>

          {/* Search Input */}
          <div className="mb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم النجم، الكوكبة، أو المعنى..."
              className="w-full bg-[var(--input-bg)] border border-[var(--line)] rounded-[8px] px-3 py-2 text-sm text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--gold)]"
            />
          </div>

          {/* Filter Chips: الكل (40) / المنازل (28) / مشاهير الكواكب (12) / المفضلة (N) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-3">
            {[
              { id: 'all' as FilterType, label: 'الكل (40)' },
              { id: 'mansion' as FilterType, label: 'المنازل (28)' },
              { id: 'famous' as FilterType, label: 'مشاهير الكواكب (12)' },
              { id: 'favorites' as FilterType, label: `المفضلة (${favorites.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`py-1.5 px-2 rounded-[8px] text-xs font-medium border transition-colors cursor-pointer ${
                  filter === tab.id
                    ? 'bg-[var(--gold-fill)] text-[#1a1405] border-[var(--gold)] font-semibold'
                    : 'bg-[var(--panel2)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Scrollable List */}
          <div className="overflow-y-auto space-y-1.5 pr-0.5 flex-1">
            {filteredStars.length === 0 ? (
              <div className="text-center py-8 text-sm text-[var(--muted)]">
                {filter === 'favorites'
                  ? 'لم تضف نجوماً للمفضلة بعد.'
                  : 'لا توجد نتائج مطابقة للبحث.'}
              </div>
            ) : (
              filteredStars.map((star) => {
                const isSelected = star.n === selectedN;
                const isFav = favorites.includes(star.n);
                const shortName = star.name.split(/[،,]/)[0].trim();
                return (
                  <div
                    key={star.n}
                    onClick={() => handleSelectFromUI(star.n)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectFromUI(star.n);
                      }
                    }}
                    className={`w-full text-right p-2.5 rounded-[8px] border transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-[var(--panel2)] border-[var(--gold)] text-[var(--ink)]'
                        : 'bg-[var(--panel)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--panel2)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          star.type === 'mansion' ? 'bg-[var(--gold)]' : 'bg-[var(--sky)]'
                        }`}
                      />
                      <div className="truncate">
                        <div className="font-semibold text-sm truncate">
                          {star.n}. {shortName}
                        </div>
                        <div className="text-xs text-[var(--muted)] truncate">
                          {star.constellation}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-[8px] border bg-transparent ${
                          star.type === 'mansion'
                            ? 'border-[var(--gold)] text-[var(--gold)]'
                            : 'border-[var(--sky)] text-[var(--sky)]'
                        }`}
                      >
                        {star.type === 'mansion' ? 'منزلة' : 'مشهور'}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(star.n);
                        }}
                        title={isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                        className={`w-7 h-7 rounded-[8px] flex items-center justify-center text-base transition-colors cursor-pointer ${
                          isFav
                            ? 'text-[var(--gold)] bg-[var(--panel2)]'
                            : 'text-[var(--muted)] hover:text-[var(--gold)]'
                        }`}
                      >
                        {isFav ? '★' : '☆'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Star Info Card (All 11 columns verbatim, hiding empty fields) */}
        <div className="lg:col-span-7 bg-[var(--panel)] border border-[var(--line)] rounded-[10px] p-[14px] space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-[var(--muted)]">رقم النجم #{selectedStar.n}</span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-[8px] font-medium border bg-transparent ${
                    selectedStar.type === 'mansion'
                      ? 'border-[var(--gold)] text-[var(--gold)]'
                      : 'border-[var(--sky)] text-[var(--sky)]'
                  }`}
                >
                  {selectedStar.type === 'mansion' ? 'منزلة' : 'من مشاهير الكواكب'}
                </span>
              </div>
              <h2
                className="text-2xl sm:text-3xl font-bold text-[var(--gold)]"
                style={{ fontFamily: "'Amiri', serif" }}
              >
                {selectedStar.name}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => toggleFavorite(selectedStar.n)}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-medium border transition-colors cursor-pointer ${
                  isSelectedFav
                    ? 'bg-[var(--panel2)] border-[var(--gold)] text-[var(--gold)]'
                    : 'bg-[var(--panel2)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--gold)]'
                }`}
              >
                {isSelectedFav ? '★ في المفضلة' : '☆ أضف للمفضلة'}
              </button>

              <button
                type="button"
                onClick={() => askAssistantAboutStar(navigate, selectedStar.name, selectedStar.n)}
                className="px-3.5 py-1.5 rounded-[8px] bg-[var(--gold-fill)] text-[#1a1405] font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer"
              >
                اسأل المساعد الذكي
              </button>
            </div>
          </div>

          {/* Muted note on stars 38, 39, 40 per spec #5 */}
          {(selectedStar.n === 38 || selectedStar.n === 39 || selectedStar.n === 40) && (
            <div className="bg-[var(--panel2)] border border-[var(--line)] rounded-[8px] px-3 py-2 text-xs text-[var(--muted)]">
              الخطوط المتقطعة للتجميع فقط
            </div>
          )}

          {/* All non-empty fields from anwaa_stars_data.json verbatim */}
          {topMetaFields.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {topMetaFields.map((item) => (
                <div
                  key={item.label}
                  className="bg-[var(--panel2)] border border-[var(--line)] rounded-[8px] p-3"
                >
                  <div className="text-xs text-[var(--muted)] mb-1">{item.label}</div>
                  <div className="text-sm font-medium text-[var(--ink)] whitespace-pre-line">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {detailFields.length > 0 && (
            <div className="space-y-2.5">
              {detailFields.map((item) => (
                <div
                  key={item.label}
                  className="bg-[var(--panel2)] border border-[var(--line)] rounded-[8px] p-3"
                >
                  <div className="text-xs font-semibold text-[var(--gold)] mb-1">{item.label}</div>
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
          )}
        </div>
      </div>

      {/* 8. City Selector Dialog for Tonight's Sky ("سماء الآن") */}
      {isCityPickerOpen && (
        <div
          className="fixed inset-0 z-50 bg-[var(--tour-backdrop)] flex items-center justify-center p-4"
          onClick={() => setIsCityPickerOpen(false)}
        >
          <div
            className="bg-[var(--panel)] border border-[var(--line)] rounded-[10px] p-[18px] w-full max-w-md space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
              <h3
                className="text-xl font-bold text-[var(--gold)]"
                style={{ fontFamily: "'Amiri', serif" }}
              >
                اختر المدينة لعرض سماء الآن
              </h3>
              <button
                type="button"
                onClick={() => setIsCityPickerOpen(false)}
                className="text-xs text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
              >
                إغلاق
              </button>
            </div>

            <p className="text-xs text-[var(--muted)]">
              اختر إحدى المدن لحساب الوقت النجمي المحلي وعرض النجوم الظاهرة فوق الأفق الآن:
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              {SAUDI_CITIES.map((city: CityLocation) => (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => activateLocation(city.lat, city.lon, city.nameAr)}
                  className="p-2.5 rounded-[8px] bg-[var(--panel2)] border border-[var(--line)] hover:border-[var(--gold)] text-right transition-colors cursor-pointer"
                >
                  <div className="text-sm font-semibold text-[var(--ink)]">{city.nameAr}</div>
                  <div className="text-[11px] text-[var(--muted)]">
                    {city.lat.toFixed(2)}° ش، {city.lon.toFixed(2)}° ق
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
