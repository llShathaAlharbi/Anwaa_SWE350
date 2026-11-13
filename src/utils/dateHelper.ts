/**
 * Utility functions for Arabic Hijri date formatting and grammatical star counting
 */

export const ARABIC_GREGORIAN_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

export const ARABIC_MONTHS = ARABIC_GREGORIAN_MONTHS;

export function toArabicDigits(num: number): string {
  return num.toLocaleString('ar-EG');
}

/**
 * Formats a full date into Arabic Hijri with the corresponding Gregorian date:
 * e.g., «الاثنين، ٢٩ جمادى الأولى ١٤٤٨ هـ (الموافق ٩ نوفمبر ٢٠٢٦ م)»
 */
export function formatFullTodayHijriWithGregorian(date: Date = new Date()): {
  hijri: string;
  gregorian: string;
  combined: string;
} {
  let hijri = '';
  let gregorian = '';

  try {
    hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    try {
      hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(date);
    } catch {
      hijri = date.toLocaleDateString('ar-SA', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
  }

  try {
    gregorian = new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    gregorian = `${toArabicDigits(date.getDate())} ${ARABIC_GREGORIAN_MONTHS[date.getMonth()]} ${toArabicDigits(date.getFullYear())}`;
  }

  // Ensure "هـ" suffix on the Hijri year if not already present
  if (!hijri.includes('هـ') && !hijri.includes('ه')) {
    hijri = `${hijri} هـ`;
  }

  return {
    hijri,
    gregorian,
    combined: `${hijri} (الموافق ${gregorian} م)`,
  };
}

/**
 * Formats an annual month & day into Arabic Hijri with the corresponding Gregorian date:
 * e.g., «١٤ ذو القعدة (الموافق ١ مايو)»
 */
export function formatMonthDayWithHijri(
  month: number,
  day: number,
  referenceYear: number = new Date().getFullYear()
): {
  hijri: string;
  gregorian: string;
  combined: string;
} {
  const gregorian = `${toArabicDigits(day)} ${ARABIC_GREGORIAN_MONTHS[month - 1] || ''}`;
  let hijri = '';

  try {
    const d = new Date(referenceYear, month - 1, day);
    hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
    }).format(d);
  } catch {
    try {
      const d = new Date(referenceYear, month - 1, day);
      hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
        day: 'numeric',
        month: 'long',
      }).format(d);
    } catch {
      hijri = gregorian;
    }
  }

  return {
    hijri,
    gregorian,
    combined: `${hijri} (الموافق ${gregorian})`,
  };
}

/**
 * Grammatically correct Arabic star counter:
 * 0: «لا توجد نجوم»
 * 1: «نجم واحد»
 * 2: «نجمان»
 * 3-10: «٣ نجوم»
 * 11+: «١١ نجمًا»
 */
export function formatStarsCountArabic(count: number): string {
  if (count <= 0) {
    return 'لا توجد نجوم';
  }
  if (count === 1) {
    return 'نجم واحد';
  }
  if (count === 2) {
    return 'نجمان';
  }
  if (count >= 3 && count <= 10) {
    return `${toArabicDigits(count)} نجوم`;
  }
  return `${toArabicDigits(count)} نجمًا`;
}
