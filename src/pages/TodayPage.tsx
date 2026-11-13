import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ANWAA_STARS_BY_N,
  MANSIONS_CALENDAR,
  getNawaNow,
  monthDayToDoy,
} from '../data/anwaaData';
import {
  formatFullTodayHijriWithGregorian,
  formatMonthDayWithHijri,
  toArabicDigits,
  ARABIC_MONTHS,
} from '../utils/dateHelper';
import { openDifyChatbot } from '../components/DifyChatBubble';
import { StarOfTheDayCard } from '../components/StarOfTheDayCard';

export const TodayPage: React.FC = () => {
  const navigate = useNavigate();
  const nowDate = useMemo(() => new Date(), []);

  const nawaNow = useMemo(() => getNawaNow(nowDate), [nowDate]);
  const todayDoy = useMemo(
    () => monthDayToDoy(nowDate.getMonth() + 1, nowDate.getDate()),
    [nowDate]
  );

  // Selected and hovered mansion on the inline timeline
  const [selectedTimelineN, setSelectedTimelineN] = useState<number>(
    () => nawaNow.settingNow.mansion.n
  );
  const [hoveredTimelineN, setHoveredTimelineN] = useState<number | null>(null);

  // Hijri date display in Arabic with corresponding actual date
  const formattedTodayArabic = useMemo(() => {
    return formatFullTodayHijriWithGregorian(nowDate).combined;
  }, [nowDate]);

  const activeTimelineMansion = useMemo(() => {
    return (
      MANSIONS_CALENDAR.find((m) => m.n === selectedTimelineN) || nawaNow.settingNow.mansion
    );
  }, [selectedTimelineN, nawaNow]);

  const hoveredMansionObj = useMemo(() => {
    if (hoveredTimelineN === null) return null;
    return MANSIONS_CALENDAR.find((m) => m.n === hoveredTimelineN) || null;
  }, [hoveredTimelineN]);

  const selectedTimelineStar = useMemo(() => {
    return ANWAA_STARS_BY_N.get(activeTimelineMansion.n);
  }, [activeTimelineMansion]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-[24px]" dir="rtl" lang="ar">
      {/* Page Header sitting directly on the sky background */}
      <div className="border-b border-[var(--sky-line)] pb-4">
        <h1
          className="text-[34px] font-bold text-[var(--sky-gold)] leading-tight"
          style={{ fontFamily: "'Amiri', serif" }}
        >
          اليوم في السماء
        </h1>
        <p className="text-sm text-[var(--sky-muted)] mt-1">{formattedTodayArabic}</p>
      </div>

      {/* Top Two Large Panels Grid: 2 columns >1020px, 1 column <=1020px, gap 24px */}
      <div className="grid grid-cols-1 min-[1021px]:grid-cols-2 gap-[24px] items-stretch">
        {/* a) Panel "نجم اليوم" */}
        <StarOfTheDayCard />

        {/* b) Panel "النوء الآن" */}
        <section className="bg-[var(--panel)] border border-[var(--line)] rounded-[10px] p-[20px] flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="border-b border-[var(--line)] pb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--muted)]">النوء الآن</span>
              <span className="text-xs text-[var(--muted)]">بحسب تقويم منازل القمر</span>
            </div>

            {/* Block 1: ساقطة الآن */}
            <div className="bg-[var(--panel2)] border border-[var(--line)] rounded-[8px] p-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[var(--sky)]">ساقطة الآن</span>
                <span className="text-xs text-[var(--muted)]">
                  سقوطها:{' '}
                  {formatMonthDayWithHijri(
                    nawaNow.settingNow.mansion.set.month,
                    nawaNow.settingNow.mansion.set.day
                  ).combined}
                </span>
              </div>

              <h3
                className="text-[26px] font-bold text-[var(--gold)] leading-snug"
                style={{ fontFamily: "'Amiri', serif" }}
              >
                {nawaNow.settingNow.mansion.name}
              </h3>

              <div className="text-sm text-[var(--ink)] leading-relaxed whitespace-pre-line">
                {nawaNow.settingNow.star.nawAndRain}
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate(`/map?star=${nawaNow.settingNow.mansion.n}`)}
                  className="px-3.5 py-1.5 rounded-[8px] bg-[var(--gold-fill)] text-[#1a1405] font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer"
                >
                  اعرضها على الخريطة
                </button>
              </div>
            </div>

            {/* Block 2: طالعة الآن */}
            <div className="bg-[var(--panel2)] border border-[var(--line)] rounded-[8px] p-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[var(--sky)]">طالعة الآن</span>
                <span className="text-xs text-[var(--muted)]">
                  طلوعها:{' '}
                  {formatMonthDayWithHijri(
                    nawaNow.risingNow.mansion.rise.month,
                    nawaNow.risingNow.mansion.rise.day
                  ).combined}
                </span>
              </div>

              <h3
                className="text-[26px] font-bold text-[var(--gold)] leading-snug"
                style={{ fontFamily: "'Amiri', serif" }}
              >
                {nawaNow.risingNow.mansion.name}
              </h3>

              <div className="text-sm text-[var(--ink)] leading-relaxed whitespace-pre-line">
                {nawaNow.risingNow.star.nawAndRain}
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate(`/map?star=${nawaNow.risingNow.mansion.n}`)}
                  className="px-3.5 py-1.5 rounded-[8px] bg-[var(--gold-fill)] text-[#1a1405] font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer"
                >
                  اعرضها على الخريطة
                </button>
              </div>
            </div>

            {/* Block 3: التالية: بعد N يوماً */}
            <div className="bg-[var(--panel2)] border border-[var(--line)] rounded-[8px] p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="inline-block text-xs font-semibold text-[var(--sky)]">
                  التالية: بعد {toArabicDigits(nawaNow.nextSetting.daysUntilSet)} يوماً
                </span>
                <h3
                  className="text-[26px] font-bold text-[var(--gold)] leading-snug"
                  style={{ fontFamily: "'Amiri', serif" }}
                >
                  {nawaNow.nextSetting.mansion.name}
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  موعد سقوطها:{' '}
                  {formatMonthDayWithHijri(
                    nawaNow.nextSetting.mansion.set.month,
                    nawaNow.nextSetting.mansion.set.day
                  ).combined}
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/map?star=${nawaNow.nextSetting.mansion.n}`)}
                className="px-3.5 py-1.5 rounded-[8px] bg-[var(--gold-fill)] text-[#1a1405] font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer"
              >
                اعرضها على الخريطة
              </button>
            </div>
          </div>

          <p className="text-xs text-[var(--muted)] border-t border-[var(--line)] pt-3">
            التواريخ تقريبية بحسب تقويم ابن قتيبة في الكتاب، وقد تختلف عن التقويم الحالي.
          </p>
        </section>
      </div>

      {/* c) Full-width panel "تقويم المنازل" (Inline 12-month RTL horizontal timeline) */}
      <section className="bg-[var(--panel)] border border-[var(--line)] rounded-[10px] p-[20px] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
          <div>
            <h2
              className="text-2xl font-bold text-[var(--gold)]"
              style={{ fontFamily: "'Amiri', serif" }}
            >
              تقويم المنازل
            </h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              الشريط الزمني لسقوط المنازل الثماني والعشرين على مدار اثني عشر شهراً (اضغط على أي منزلة لعرض تفاصيلها)
            </p>
          </div>

          {hoveredMansionObj && (
            <div className="text-xs bg-[var(--panel2)] border border-[var(--gold)] rounded-[8px] px-3 py-1.5 text-[var(--ink)]">
              <span className="font-bold text-[var(--gold)] ml-2">{hoveredMansionObj.name}</span>
              <span className="text-[var(--muted)]">
                السقوط: {formatMonthDayWithHijri(hoveredMansionObj.set.month, hoveredMansionObj.set.day).combined}{' '}
                • الطلوع:{' '}
                {formatMonthDayWithHijri(hoveredMansionObj.rise.month, hoveredMansionObj.rise.day).combined}
              </span>
            </div>
          )}
        </div>

        {/* Horizontally scrollable timeline container on small screens (min-width 900px inside) */}
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[900px] bg-[var(--panel2)] border border-[var(--line)] rounded-[8px] p-4 space-y-2">
            {/* 12 Month Labels on top */}
            <div className="grid grid-cols-12 text-center text-xs font-medium text-[var(--muted)] border-b border-[var(--line)] pb-2">
              {ARABIC_MONTHS.map((monthName, idx) => (
                <div key={idx} className="px-1">
                  {monthName}
                </div>
              ))}
            </div>

            {/* Timeline Track */}
            <div className="relative h-44 bg-[var(--panel)] border border-[var(--line)] rounded-[8px] mt-3 overflow-hidden">
              {/* Subtle vertical month dividers */}
              <div className="absolute inset-0 grid grid-cols-12 pointer-events-none">
                {ARABIC_MONTHS.map((_, idx) => (
                  <div
                    key={idx}
                    className="border-l border-[var(--line)]/50 first:border-r-0 h-full"
                  />
                ))}
              </div>

              {/* Today as a vertical indicator line */}
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-[var(--ink)] z-20 pointer-events-none"
                style={{
                  right: `${((todayDoy - 1) / 365) * 100}%`,
                }}
              >
                <span className="absolute top-1.5 -translate-x-1/2 bg-[var(--ink)] text-[var(--panel)] text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap shadow">
                  اليوم
                </span>
              </div>

              {/* 28 Mansions as small gold markers at their set date with their name */}
              {MANSIONS_CALENDAR.map((m, idx) => {
                const setDoy = monthDayToDoy(m.set.month, m.set.day);
                const pctRight = Math.min(98.5, Math.max(1.5, ((setDoy - 1) / 365) * 100));
                const isSelected = selectedTimelineN === m.n;
                const isHovered = hoveredTimelineN === m.n;
                const shortMansionName = m.name.split('،')[0].trim();
                const rowTops = ['top-8', 'top-18', 'top-27', 'top-35'];
                const topClass = rowTops[idx % 4];

                return (
                  <button
                    key={m.n}
                    type="button"
                    onMouseEnter={() => setHoveredTimelineN(m.n)}
                    onMouseLeave={() => setHoveredTimelineN(null)}
                    onFocus={() => setHoveredTimelineN(m.n)}
                    onClick={() => setSelectedTimelineN(m.n)}
                    style={{ right: `${pctRight}%` }}
                    className={`absolute ${topClass} translate-x-1/2 flex flex-col items-center group cursor-pointer transition-transform ${
                      isSelected || isHovered ? 'z-30 scale-110' : 'z-10'
                    }`}
                    title={`${m.name} — السقوط: ${formatMonthDayWithHijri(m.set.month, m.set.day).combined} | الطلوع: ${formatMonthDayWithHijri(m.rise.month, m.rise.day).combined}`}
                  >
                    <span
                      className={`w-3 h-3 rounded-full transition-colors ${
                        isSelected
                          ? 'bg-[var(--ink)] ring-2 ring-[var(--gold)]'
                          : isHovered
                          ? 'bg-[var(--gold)] ring-2 ring-[var(--ink)]'
                          : 'bg-[var(--gold)]'
                      }`}
                    />
                    <span
                      className={`mt-0.5 text-[10px] leading-tight whitespace-nowrap px-1 rounded ${
                        isSelected
                          ? 'bg-[var(--gold-fill)] text-[#1a1405] font-bold'
                          : 'text-[var(--ink)] bg-[var(--panel)]/90 group-hover:text-[var(--gold)]'
                      }`}
                    >
                      {shortMansionName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Mansion Details Below Timeline */}
        <div className="bg-[var(--panel2)] border border-[var(--line)] rounded-[8px] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h3
                  className="text-2xl font-bold text-[var(--gold)]"
                  style={{ fontFamily: "'Amiri', serif" }}
                >
                  {activeTimelineMansion.name}
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-[8px] bg-transparent border border-[var(--sky)] text-[var(--sky)]">
                  السقوط (النوء):{' '}
                  {formatMonthDayWithHijri(
                    activeTimelineMansion.set.month,
                    activeTimelineMansion.set.day
                  ).combined}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-[8px] bg-transparent border border-[var(--gold)] text-[var(--gold)]">
                  الطلوع:{' '}
                  {formatMonthDayWithHijri(
                    activeTimelineMansion.rise.month,
                    activeTimelineMansion.rise.day
                  ).combined}
                </span>
              </div>
              <p className="text-xs text-[var(--muted)] mt-1">{activeTimelineMansion.source_text}</p>
            </div>

            <button
              type="button"
              onClick={() => navigate(`/map?star=${activeTimelineMansion.n}`)}
              className="px-4 py-2 rounded-[8px] bg-[var(--gold-fill)] text-[#1a1405] font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer"
            >
              اعرضها على الخريطة
            </button>
          </div>

          {selectedTimelineStar && (
            <div className="space-y-2 text-sm text-[var(--ink)] leading-relaxed">
              <div>
                <span className="text-xs font-semibold text-[var(--gold)] ml-1">النوء والمطر:</span>
                <span className="whitespace-pre-line">{selectedTimelineStar.nawAndRain}</span>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
