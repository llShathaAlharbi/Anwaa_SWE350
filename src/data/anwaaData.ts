import rawMapData from '../anwaa_map_data.json';
import rawStarsData from '../anwaa_stars_data.json';
import rawCalendarData from '../anwaa_nawa_calendar.json';

export const MANSION_NUMBERS = new Set([
  1, 2, 3, 5, 6, 7, 8, 10, 12, 13, 15, 16, 18, 19, 21, 23, 24, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37,
]);

export interface CalendarDate {
  month: number;
  day: number;
}

export interface MansionCalendarEntry {
  n: number;
  name: string;
  rise: CalendarDate;
  set: CalendarDate;
  source_text: string;
}

export interface AnwaaStarRecord {
  n: number;
  type: 'mansion' | 'famous';
  points: [number, number][];
  centroidRA: number;
  centroidDec: number;
  // Verbatim 11 columns from anwaa_stars_data.json:
  rawNumber: string;       // 0: رقم النجم
  name: string;            // 1: الاسم
  constellation: string;   // 2: الكوكبة التي يقع فيها
  scientificName: string;  // 3: الاسم العلمي
  meaning: string;         // 4: المعنى
  location: string;        // 5: الموقع
  shape: string;           // 6: الشكل
  riseSetTime: string;     // 7: وقت الطلوع والسقوط
  nawAndRain: string;      // 8: النوء والمطر
  arabSayings: string;     // 9: أقوال العرب والأمثال
  poetry: string;          // 10: الشعر
  calendar?: MansionCalendarEntry;
}

export const TABLE_HEADERS: string[] = rawStarsData.hdr;

const calendarByN = new Map<number, MansionCalendarEntry>();
for (const m of rawCalendarData.mansions as MansionCalendarEntry[]) {
  calendarByN.set(m.n, m);
}

const mapOursByN = new Map<
  number,
  { n: number; name: string; type: 'mansion' | 'famous'; points: [number, number][] }
>();
for (const item of rawMapData.ours as Array<{
  n: number;
  name: string;
  type: 'mansion' | 'famous';
  points: [number, number][];
}>) {
  mapOursByN.set(item.n, item);
}

function computeSphericalCentroid(points: [number, number][]): { ra: number; dec: number } {
  if (!points || points.length === 0) return { ra: 0, dec: 0 };
  let sx = 0;
  let sy = 0;
  let sz = 0;
  for (const [ra, dec] of points) {
    const r = (ra * Math.PI) / 180;
    const d = (dec * Math.PI) / 180;
    sx += Math.cos(d) * Math.cos(r);
    sy += Math.cos(d) * Math.sin(r);
    sz += Math.sin(d);
  }
  const len = Math.hypot(sx, sy, sz);
  if (len === 0) return { ra: points[0][0], dec: points[0][1] };
  const dec = (Math.asin(Math.max(-1, Math.min(1, sz / len))) * 180) / Math.PI;
  const ra = (((Math.atan2(sy, sx) * 180) / Math.PI) % 360 + 360) % 360;
  return { ra, dec };
}

export const ANWAA_STARS: AnwaaStarRecord[] = (rawStarsData.rows as string[][]).map((row) => {
  const n = Math.round(parseFloat(row[0]));
  const mapEntry = mapOursByN.get(n);
  const points: [number, number][] = mapEntry ? mapEntry.points : [];
  const { ra, dec } = computeSphericalCentroid(points);
  const type: 'mansion' | 'famous' = MANSION_NUMBERS.has(n) ? 'mansion' : 'famous';

  return {
    n,
    type,
    points,
    centroidRA: ra,
    centroidDec: dec,
    rawNumber: row[0] ?? '',
    name: row[1] ?? mapEntry?.name ?? '',
    constellation: row[2] ?? '',
    scientificName: row[3] ?? '',
    meaning: row[4] ?? '',
    location: row[5] ?? '',
    shape: row[6] ?? '',
    riseSetTime: row[7] ?? '',
    nawAndRain: row[8] ?? '',
    arabSayings: row[9] ?? '',
    poetry: row[10] ?? '',
    calendar: calendarByN.get(n),
  };
});

export const ANWAA_STARS_BY_N: Map<number, AnwaaStarRecord> = new Map(
  ANWAA_STARS.map((s) => [s.n, s])
);

export const MANSIONS_CALENDAR: MansionCalendarEntry[] = rawCalendarData.mansions as MansionCalendarEntry[];

// Day of year helper (1..366) in local time
export function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff =
    date.getTime() -
    start.getTime() +
    (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000;
  return Math.floor(diff / 86400000);
}

// Convert {month, day} (1-indexed month) to day-of-year (non-leap 365 basis for calendar matching)
const MONTH_DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export function monthDayToDoy(month: number, day: number): number {
  let doy = 0;
  for (let m = 1; m < month; m++) {
    doy += MONTH_DAYS[m] || 30;
  }
  return doy + day;
}

// #9 Star of the Day: index = (dayOfYear + year) mod 40 over the table order
export function getStarOfTheDay(now: Date = new Date()): AnwaaStarRecord {
  const dayOfYear = getDayOfYear(now);
  const year = now.getFullYear();
  const idx = ((dayOfYear + year) % 40 + 40) % 40;
  return ANWAA_STARS[idx];
}

// #10 Naw' Now ("النوء الآن")
export interface NawaNowResult {
  settingNow: {
    mansion: MansionCalendarEntry;
    star: AnwaaStarRecord;
    daysSinceSet: number;
  };
  risingNow: {
    mansion: MansionCalendarEntry;
    star: AnwaaStarRecord;
    daysSinceRise: number;
  };
  nextSetting: {
    mansion: MansionCalendarEntry;
    star: AnwaaStarRecord;
    daysUntilSet: number;
  };
}

export function getNawaNow(now: Date = new Date()): NawaNowResult {
  const todayMonth = now.getMonth() + 1;
  const todayDay = now.getDate();
  const todayDoy = monthDayToDoy(todayMonth, todayDay);

  let bestSet: MansionCalendarEntry = MANSIONS_CALENDAR[0];
  let minDaysSinceSet = 9999;

  let bestRise: MansionCalendarEntry = MANSIONS_CALENDAR[0];
  let minDaysSinceRise = 9999;

  let bestNextSet: MansionCalendarEntry = MANSIONS_CALENDAR[0];
  let minDaysUntilSet = 9999;

  for (const m of MANSIONS_CALENDAR) {
    const setDoy = monthDayToDoy(m.set.month, m.set.day);
    const riseDoy = monthDayToDoy(m.rise.month, m.rise.day);

    // Cyclic days since set (0..364): on or before today
    const daysSinceSet = (todayDoy - setDoy + 365) % 365;
    if (daysSinceSet < minDaysSinceSet) {
      minDaysSinceSet = daysSinceSet;
      bestSet = m;
    }

    // Cyclic days since rise (0..364): on or before today
    const daysSinceRise = (todayDoy - riseDoy + 365) % 365;
    if (daysSinceRise < minDaysSinceRise) {
      minDaysSinceRise = daysSinceRise;
      bestRise = m;
    }

    // Next mansion to set (strictly after today: 1..365)
    let daysUntilSet = (setDoy - todayDoy + 365) % 365;
    if (daysUntilSet === 0) daysUntilSet = 365;
    if (daysUntilSet < minDaysUntilSet) {
      minDaysUntilSet = daysUntilSet;
      bestNextSet = m;
    }
  }

  return {
    settingNow: {
      mansion: bestSet,
      star: ANWAA_STARS_BY_N.get(bestSet.n)!,
      daysSinceSet: minDaysSinceSet,
    },
    risingNow: {
      mansion: bestRise,
      star: ANWAA_STARS_BY_N.get(bestRise.n)!,
      daysSinceRise: minDaysSinceRise,
    },
    nextSetting: {
      mansion: bestNextSet,
      star: ANWAA_STARS_BY_N.get(bestNextSet.n)!,
      daysUntilSet: minDaysUntilSet,
    },
  };
}

// #8 Tonight's Sky ("سماء الآن") Astronomical Calculations
export interface CityLocation {
  id: string;
  nameAr: string;
  lat: number;
  lon: number;
}

export const SAUDI_CITIES: CityLocation[] = [
  { id: 'riyadh', nameAr: 'الرياض', lat: 24.71, lon: 46.68 },
  { id: 'jeddah', nameAr: 'جدة', lat: 21.54, lon: 39.17 },
  { id: 'dammam', nameAr: 'الدمام', lat: 26.43, lon: 50.10 },
  { id: 'alula', nameAr: 'العلا', lat: 26.61, lon: 37.92 },
  { id: 'mecca', nameAr: 'مكة المكرمة', lat: 21.39, lon: 39.86 },
  { id: 'medina', nameAr: 'المدينة المنورة', lat: 24.47, lon: 39.61 },
  { id: 'abha', nameAr: 'أبها', lat: 18.22, lon: 42.50 },
  { id: 'tabuk', nameAr: 'تبوك', lat: 28.38, lon: 36.57 },
];

export function getArabicCompass(azDeg: number): string {
  const az = ((azDeg % 360) + 360) % 360;
  const dirs = [
    'شمال',
    'شمال شرق',
    'شرق',
    'جنوب شرق',
    'جنوب',
    'جنوب غرب',
    'غرب',
    'شمال غرب',
  ];
  const idx = Math.round(az / 45) % 8;
  return dirs[idx];
}

export function computeLST(lonDeg: number, unixMillis: number = Date.now()): {
  JD: number;
  d: number;
  GMST: number;
  LST: number;
} {
  // JD = unixMillis/86400000 + 2440587.5
  const JD = unixMillis / 86400000 + 2440587.5;
  // d = JD − 2451545.0
  const d = JD - 2451545.0;
  // GMST = (280.46061837 + 360.98564736629·d) mod 360
  const GMST = (((280.46061837 + 360.98564736629 * d) % 360) + 360) % 360;
  // LST = (GMST + lon) mod 360
  const LST = (((GMST + lonDeg) % 360) + 360) % 360;
  return { JD, d, GMST, LST };
}

export function computeAltAz(
  raDeg: number,
  decDeg: number,
  latDeg: number,
  LSTDeg: number
): { alt: number; az: number; compass: string } {
  // hour angle H = LST − ra
  const H = ((LSTDeg - raDeg) * Math.PI) / 180;
  const lat = (latDeg * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;

  // sin(alt) = sin(lat)sin(dec) + cos(lat)cos(dec)cos(H)
  const sinAlt =
    Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H);
  const alt = (Math.asin(Math.max(-1, Math.min(1, sinAlt))) * 180) / Math.PI;

  // az = atan2(−cos(dec)sin(H), sin(dec)cos(lat) − cos(dec)cos(H)sin(lat))
  const y = -Math.cos(dec) * Math.sin(H);
  const x =
    Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.cos(H) * Math.sin(lat);
  const az = (((Math.atan2(y, x) * 180) / Math.PI) % 360 + 360) % 360;

  return {
    alt,
    az,
    compass: getArabicCompass(az),
  };
}

// Convert horizon point (alt = 0, az = 0..360) to equatorial (ra, dec)
export function getHorizonCircleRADec(latDeg: number, LSTDeg: number, steps = 90): [number, number][] {
  const lat = (latDeg * Math.PI) / 180;
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const az = (i / steps) * 2 * Math.PI;
    // For alt = 0:
    // sin(dec) = cos(lat) * cos(az)
    const sinDec = Math.cos(lat) * Math.cos(az);
    const dec = Math.asin(Math.max(-1, Math.min(1, sinDec)));
    // sin(H) = -sin(az) / cos(dec), cos(H) = -sin(lat)*cos(az) / cos(dec)
    const y = -Math.sin(az);
    const x = -Math.sin(lat) * Math.cos(az);
    const H = Math.atan2(y, x);
    const raDeg = (((LSTDeg - (H * 180) / Math.PI) % 360) + 360) % 360;
    const decDeg = (dec * 180) / Math.PI;
    pts.push([raDeg, decDeg]);
  }
  return pts;
}

export interface OverheadStarItem {
  star: AnwaaStarRecord;
  alt: number;
  az: number;
  compass: string;
}

export function getOverheadAnwaaStars(
  latDeg: number,
  lonDeg: number,
  unixMillis: number = Date.now()
): {
  LST: number;
  starsAbove5Deg: OverheadStarItem[];
} {
  const { LST } = computeLST(lonDeg, unixMillis);
  const list: OverheadStarItem[] = [];

  for (const star of ANWAA_STARS) {
    const { alt, az, compass } = computeAltAz(
      star.centroidRA,
      star.centroidDec,
      latDeg,
      LST
    );
    if (alt > 5) {
      list.push({ star, alt, az, compass });
    }
  }

  list.sort((a, b) => b.alt - a.alt);
  return { LST, starsAbove5Deg: list };
}
