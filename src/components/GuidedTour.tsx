import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

interface TourStep {
  targetId: string;
  text: string;
  route: string;
}

const STEPS: TourStep[] = [
  {
    targetId: 'tour-hero-brand',
    route: '/',
    text: 'مرحباً بك في أنواء: منصتك لاستكشاف تراث العرب في النجوم ومنازل القمر.',
  },
  {
    targetId: 'tour-star-of-the-day',
    route: '/',
    text: 'بطاقة نجم اليوم: تعرّف يومياً على نجم من نجوم العرب وتفاصيل معناه وموقعه في السماء.',
  },
  {
    targetId: 'tour-faq-section',
    route: '/',
    text: 'الأسئلة الأكثر شيوعاً: إجابات سريعة توضح لك كيفية الاستفادة من المنصة وخريطتها.',
  },
  {
    targetId: 'tour-map-canvas',
    route: '/map',
    text: 'خريطة السماء: اسحب لتحريك الخريطة، وقرّب أو بعّد بإصبعين لاستكشاف النجوم.',
  },
  {
    targetId: 'tour-star-target',
    route: '/map',
    text: 'النجوم المضيئة هي نجوم أنواء، اضغط على أي نجم لمعرفة قصته ومعانيه التراثية.',
  },
  {
    targetId: 'tour-tonight-btn',
    route: '/map',
    text: 'سماء الآن: شاهد نجوم أنواء الظاهرة فوق مدينتك في هذه اللحظة.',
  },
  {
    targetId: 'tour-star-list',
    route: '/map',
    text: 'قائمة النجوم: ابحث عن نجم أو صفِّ بين منازل القمر ومشاهير الكواكب.',
  },
  {
    targetId: 'tour-today-link',
    route: '/map',
    text: 'صفحة اليوم: استكشف تقويم المنازل وحالة النوء الساقط والطالع على مدار العام.',
  },
  {
    targetId: 'tour-chat-link',
    route: '/map',
    text: 'اسأل أنواء: اسأل المساعد الذكي عن أي نجم ليجيبك من أمهات كتب التراث العربي.',
  },
];

export const GuidedTour: React.FC = () => {
  const { isTourOpen, closeTour } = useApp();
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When tour opens, reset step to 0 and ensure we are on the Home page ('/')
  useEffect(() => {
    if (isTourOpen) {
      setStepIdx(0);
      if (location.pathname !== '/') {
        navigate('/');
      }
    }
  }, [isTourOpen]); // Intentionally on isTourOpen change only

  // Locate the target element and compute its bounding rectangle
  const measureTarget = useCallback(() => {
    if (!isTourOpen) return false;
    const step = STEPS[stepIdx];
    if (!step) return false;

    const el = document.getElementById(step.targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const r = el.getBoundingClientRect();
      setRect({
        top: r.top - 4,
        left: r.left - 4,
        width: r.width + 8,
        height: r.height + 8,
      });
      return true;
    }
    return false;
  }, [isTourOpen, stepIdx]);

  // Navigate to required page first before highlighting its element
  useEffect(() => {
    if (!isTourOpen) return;
    const step = STEPS[stepIdx];
    if (!step) return;

    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
    }

    if (location.pathname !== step.route) {
      setRect(null);
      navigate(step.route);
      // Wait for route change and DOM rendering, then measure with retries
      let attempts = 0;
      const checkAndMeasure = () => {
        const found = measureTarget();
        if (!found && attempts < 8) {
          attempts += 1;
          retryTimerRef.current = setTimeout(checkAndMeasure, 120);
        }
      };
      retryTimerRef.current = setTimeout(checkAndMeasure, 180);
    } else {
      // Already on the right route, measure with a small delay for smooth layout
      let attempts = 0;
      const checkAndMeasure = () => {
        const found = measureTarget();
        if (!found && attempts < 5) {
          attempts += 1;
          retryTimerRef.current = setTimeout(checkAndMeasure, 100);
        }
      };
      checkAndMeasure();
    }

    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, [isTourOpen, stepIdx, location.pathname, navigate, measureTarget]);

  // Handle window resize and scroll
  useEffect(() => {
    if (!isTourOpen) return;
    const onResizeOrScroll = () => {
      measureTarget();
    };
    window.addEventListener('resize', onResizeOrScroll);
    window.addEventListener('scroll', onResizeOrScroll, true);
    return () => {
      window.removeEventListener('resize', onResizeOrScroll);
      window.removeEventListener('scroll', onResizeOrScroll, true);
    };
  }, [isTourOpen, measureTarget]);

  // Close tour on Escape key
  useEffect(() => {
    if (!isTourOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeTour();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isTourOpen, closeTour]);

  if (!isTourOpen) return null;

  const currentStep = STEPS[stepIdx];
  const vw = typeof window !== 'undefined' ? window.innerWidth : 800;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 600;
  const tooltipWidth = Math.min(320, vw - 24);

  let tooltipTop = vh / 2 - 90;
  let tooltipLeft = (vw - tooltipWidth) / 2;

  if (rect) {
    const spaceBelow = vh - (rect.top + rect.height);
    if (spaceBelow >= 170) {
      tooltipTop = Math.min(vh - 175, Math.max(12, rect.top + rect.height + 12));
    } else {
      tooltipTop = Math.max(12, rect.top - 165);
    }
    const centeredLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
    tooltipLeft = Math.max(12, Math.min(vw - tooltipWidth - 12, centeredLeft));
  }

  const handleNext = () => {
    if (stepIdx < STEPS.length - 1) {
      setStepIdx((i) => i + 1);
    } else {
      closeTour();
    }
  };

  const handlePrev = () => {
    if (stepIdx > 0) {
      setStepIdx((i) => i - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto select-none" dir="rtl" lang="ar">
      {/* Backdrop with cutout */}
      {rect ? (
        <>
          <div
            className="fixed bg-[var(--tour-backdrop)] left-0 right-0 top-0"
            style={{ height: Math.max(0, rect.top) }}
            onClick={closeTour}
          />
          <div
            className="fixed bg-[var(--tour-backdrop)] left-0 right-0 bottom-0"
            style={{ top: Math.max(0, rect.top + rect.height) }}
            onClick={closeTour}
          />
          <div
            className="fixed bg-[var(--tour-backdrop)] left-0"
            style={{
              top: Math.max(0, rect.top),
              height: Math.max(0, rect.height),
              width: Math.max(0, rect.left),
            }}
            onClick={closeTour}
          />
          <div
            className="fixed bg-[var(--tour-backdrop)] right-0"
            style={{
              top: Math.max(0, rect.top),
              height: Math.max(0, rect.height),
              left: Math.max(0, rect.left + rect.width),
            }}
            onClick={closeTour}
          />
          {/* 2px gold border around highlighted target */}
          <div
            className="fixed border-2 border-[var(--gold)] rounded-[10px] pointer-events-none transition-all duration-200"
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            }}
          />
        </>
      ) : (
        <div className="fixed inset-0 bg-[var(--tour-backdrop)]" onClick={closeTour} />
      )}

      {/* Tooltip Card */}
      <div
        className="fixed bg-[var(--panel)] border border-[var(--line)] rounded-[10px] p-[16px] shadow-2xl transition-all duration-200"
        style={{
          top: tooltipTop,
          left: tooltipLeft,
          width: tooltipWidth,
          maxWidth: 320,
        }}
      >
        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[var(--line)]/60">
          <span className="text-xs font-semibold text-[var(--gold)]">
            جولة تعريفية ({stepIdx + 1} / {STEPS.length})
          </span>
          <button
            type="button"
            onClick={closeTour}
            className="text-xs text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
          >
            تخطّي
          </button>
        </div>

        <p className="text-sm text-[var(--ink)] leading-relaxed mb-4">
          {currentStep.text}
        </p>

        <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--line)]/60">
          <div>
            {stepIdx > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-3 py-1.5 rounded-[8px] bg-[var(--panel2)] border border-[var(--line)] text-[var(--ink)] text-xs hover:border-[var(--muted)] transition-colors cursor-pointer"
              >
                السابق
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="px-4 py-1.5 rounded-[8px] bg-[var(--gold-fill)] text-[#1a1405] font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer"
          >
            {stepIdx < STEPS.length - 1 ? 'التالي' : 'إنهاء'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuidedTour;
