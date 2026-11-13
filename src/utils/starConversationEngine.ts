import { ANWAA_STARS, AnwaaStarRecord } from '../data/anwaaData';

export interface ActiveStarState {
  name: string;
  cleanName: string;
  number?: number;
}

export interface ProcessingResult {
  displayUserMessage: string;
  enrichedQuery: string;
  updatedActiveStar?: ActiveStarState | null;
  multipleStarsDetected?: string[];
  requiresClarification?: boolean;
  clarificationMessage?: string;
}

// Arabic normalization helper
export function normalizeAr(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // remove tashkeel and tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanStarName(rawName: string): string {
  if (!rawName) return '';
  return rawName
    .replace(/\s*\([^)]*\)/g, '')
    .split(/[،,]/)[0]
    .trim();
}

export interface StarDictionaryEntry {
  n: number;
  cleanName: string;
  fullName: string;
  aliases: string[];
}

// Pre-computed dictionary of all 40 Arab heritage stars with their primary and secondary names
export const STAR_DICTIONARY: StarDictionaryEntry[] = ANWAA_STARS.map((star: AnwaaStarRecord) => {
  const cName = cleanStarName(star.name);
  const rawParts = star.name
    .split(/[،,()\-]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const extraAliases: string[] = [];

  // Known heritage aliases & common spellings for each star
  switch (star.n) {
    case 1:
      extraAliases.push('الشرطان', 'النطح');
      break;
    case 2:
      extraAliases.push('البطين');
      break;
    case 3:
      // Note: do not include 'النجم' to avoid false positives on questions like "ما اسم هذا النجم"
      extraAliases.push('الثريا');
      break;
    case 4:
      extraAliases.push('الشعرى اليمانية', 'الشعرى اليمانيه', 'العبور', 'المرزم');
      break;
    case 5:
      extraAliases.push('الدبران', 'المجدح', 'التابع');
      break;
    case 6:
      extraAliases.push('الهقعة', 'الهقعه', 'الأثافي', 'الاثافي');
      break;
    case 7:
      extraAliases.push('الهنعة', 'الهنعه', 'التحايي');
      break;
    case 8:
      extraAliases.push('الذراع المبسوطة', 'الذراع المبسوطه', 'الذراع');
      break;
    case 9:
      extraAliases.push('الشعرى الشامية', 'الشعرى الشاميه', 'الغميصاء', 'الغميصا');
      break;
    case 10:
      extraAliases.push('النثرة', 'النثره');
      break;
    case 11:
      extraAliases.push('سهيل اليماني', 'سهيل اليمن', 'سهيل');
      break;
    case 12:
      extraAliases.push('الطرفة', 'الطرفه', 'الطرف');
      break;
    case 13:
      extraAliases.push('قلب العقرب', 'الأحيمر', 'الاحيمر');
      break;
    case 14:
      extraAliases.push('السماك الرامح', 'الرامح');
      break;
    case 15:
      extraAliases.push('السماك الأعزل', 'السماك الاعزل', 'الأعزل', 'الاعزل');
      break;
    case 16:
      extraAliases.push('الجبهة', 'الجبهه');
      break;
    case 17:
      extraAliases.push('قلب الأسد الملكي', 'قلب الاسد الملكي', 'قلب الأسد', 'قلب الاسد', 'المليك');
      break;
    case 18:
      extraAliases.push('الزبرة', 'الزبره', 'الخراتان');
      break;
    case 19:
      extraAliases.push('الصرفة', 'الصرفه');
      break;
    case 20:
      extraAliases.push('منكب الجوزاء', 'يد الجوزاء', 'إبط الجوزاء', 'ابط الجوزاء');
      break;
    case 21:
      extraAliases.push('العواء');
      break;
    case 22:
      extraAliases.push('رجل الجوزاء', 'رجل الجبار');
      break;
    case 23:
      extraAliases.push('زبانا العقرب', 'الزباني');
      break;
    case 24:
      extraAliases.push('الإكليل', 'الاكليل');
      break;
    case 25:
      extraAliases.push('النسر الواقع');
      break;
    case 26:
      extraAliases.push('الجدي');
      break;
    case 27:
      extraAliases.push('الشولة', 'الشوله');
      break;
    case 28:
      extraAliases.push('النعائم');
      break;
    case 29:
      extraAliases.push('البلدة', 'البلده');
      break;
    case 30:
      extraAliases.push('سعد الذابح');
      break;
    case 31:
      extraAliases.push('سعد بلع');
      break;
    case 32:
      extraAliases.push('سعد السعود');
      break;
    case 33:
      extraAliases.push('سعد الأخبية', 'سعد الاخبيه', 'سعد الاخبية');
      break;
    case 34:
      extraAliases.push('الفرغ الأول', 'الفرغ الاول', 'الفرغ المقدم');
      break;
    case 35:
      extraAliases.push('الفرغ الثاني', 'الفرغ المؤخر');
      break;
    case 36:
      extraAliases.push('بطن الحوت', 'الرشاء');
      break;
    case 37:
      extraAliases.push('الغفر');
      break;
    case 38:
      extraAliases.push('الفرقدان', 'الفرقدين');
      break;
    case 39:
      extraAliases.push('بنات نعش الصغرى');
      break;
    case 40:
      extraAliases.push('بنات نعش الكبرى', 'بنات نعش');
      break;
  }

  const allAliases = Array.from(new Set([cName, ...rawParts, ...extraAliases])).filter(Boolean);
  return {
    n: star.n,
    cleanName: cName,
    fullName: star.name,
    aliases: allAliases,
  };
});

// Build regex supporting Arabic prefixes (و, ف, ب, ك, ل, لل)
function buildStarRegex(aliasNorm: string): RegExp {
  const parts = aliasNorm.split(' ');
  const first = parts[0];
  const rest = parts.slice(1).join(' ');

  let firstPattern: string;
  if (first.startsWith('ال') && first.length > 2) {
    const withoutAl = first.slice(2);
    // matches: الثريا, والثريا, للثريا, وللثريا, بالثريا, فالثريا, كالثريا
    firstPattern = `(?:و|ف|ب|ك)?(?:ال|لل)${withoutAl}`;
  } else {
    // for names not starting with ال, e.g. سهيل, بنات نعش, سعد الذابح
    firstPattern = `(?:و|ف|ب|ك|ل|لل)?${first}`;
  }

  const fullPatternStr = rest ? `${firstPattern}\\s+${rest}` : firstPattern;
  return new RegExp(`(^|\\s|[،,\\.!?؟])${fullPatternStr}($|\\s|[،,\\.!?؟])`);
}

// Detect all stars mentioned in text, sorted so longer names match first
export function detectMentionedStars(text: string): StarDictionaryEntry[] {
  if (!text || !text.trim()) return [];
  const normText = ' ' + normalizeAr(text) + ' ';

  const matched: StarDictionaryEntry[] = [];
  const seenN = new Set<number>();

  // Sort candidate aliases by length descending so longer specific names match first
  const candidates: { entry: StarDictionaryEntry; aliasNorm: string; len: number }[] = [];
  for (const entry of STAR_DICTIONARY) {
    for (const alias of entry.aliases) {
      const aliasNorm = normalizeAr(alias);
      if (aliasNorm.length >= 3) {
        candidates.push({ entry, aliasNorm, len: aliasNorm.length });
      }
    }
  }

  candidates.sort((a, b) => b.len - a.len);

  for (const c of candidates) {
    if (seenN.has(c.entry.n)) continue;

    const pattern = buildStarRegex(c.aliasNorm);
    if (pattern.test(normText)) {
      matched.push(c.entry);
      seenN.add(c.entry.n);
    }
  }

  return matched;
}

// Format preposition for Arabic nouns (e.g. للهقعة، للثريا، لـ سهيل)
export function formatArabicPreposition(starName: string): string {
  const trimmed = starName.trim();
  if (trimmed.startsWith('ال') && trimmed.length > 2) {
    return 'لل' + trimmed.slice(2);
  }
  return 'لـ ' + trimmed;
}

// Check if query is a greeting or polite opening
function isGreetingOrGeneralPolite(normText: string): boolean {
  const greetings = [
    'السلام عليكم',
    'سلام عليكم',
    'مرحبا',
    'مرحبا بك',
    'اهلين',
    'اهلًا',
    'اهلا',
    'صباح الخير',
    'مساء الخير',
    'شكرا',
    'شكرا لك',
    'يعطيك العافيه',
    'تسلم',
    'جزاك الله خير',
    'هلا',
    'هلا والله',
    'حياك الله',
  ];
  return greetings.some((g) => normText === normalizeAr(g) || normText.startsWith(normalizeAr(g) + ' '));
}

// Check if query is a broad astronomical question unrelated to an individual star
function isBroadHeritageQuestion(normText: string): boolean {
  const broadTopics = [
    'منازل القمر',
    'كم عدد منازل',
    'كم عدد النجوم',
    'ما هي الانواء',
    'ما هو النوء',
    'علم الانواء',
    'علم الفلك',
    'كتاب الانواء',
    'ما الفرق بين النوء والمنزله',
    'ما الفرق بين النوء والبرج',
    'ما هو مشروع انواء',
    'من هو ابن قتيبه',
    'فصول السنه عند العرب',
    'تقويم المنازل',
    'طوالع النجوم',
  ];
  return broadTopics.some((topic) => normText.includes(normalizeAr(topic)));
}

// Check if query is an inquiry containing pronouns or elliptical reference
function isFollowUpInquiry(rawText: string, normText: string): boolean {
  // 1. Specific astronomical follow-up questions
  const followUpRegex =
    /(اسمها|اسمه|الاسم العلمي|العلمي|معناها|معناه|موقعها|موقعه|وينها|وينه|كوكبتها|كوكبه|شكلها|شكله|طلوعها|طلوعه|سقوطها|سقوطه|نوءها|نوءه|مطرها|مطره|شعرها|شعره|امثالها|امثاله|اقوالها|اقواله|نجومها|نجومه|ترتيبها|ترتيبه)/;
  if (followUpRegex.test(normText)) return true;

  // 2. Short pronoun/verb questions
  const shortQueries = [
    'اين يقع',
    'اين تقع',
    'وين يقع',
    'وين تقع',
    'متي يظهر',
    'متى يظهر',
    'متي يطلع',
    'متى يطلع',
    'متي تطلع',
    'متى تطلع',
    'متي يسقط',
    'متى يسقط',
    'متي تغيب',
    'متى يغيب',
    'هل له مطر',
    'هل لها مطر',
    'هل فيه مطر',
    'هل فيها مطر',
    'هل له نوء',
    'هل لها نوء',
    'هل هو من المنازل',
    'هل هي منزله',
    'في اي كوكبه',
    'في اي برج',
    'في اي فصل',
    'حدثني عنه',
    'حدثني عنها',
    'وضح اكثر',
    'اشرح اكثر',
    'ما قيل فيه',
    'ما قيل فيها',
    'وش قالوا عنه',
    'وش قالوا عنها',
  ];
  if (shortQueries.some((sq) => normText.includes(normalizeAr(sq)))) return true;

  // 3. Pronoun words in an inquiry context
  const pronounTokens = ['عنه', 'عنها', 'فيه', 'فيها', 'له', 'لها', 'به', 'بها', 'منه', 'منها', 'هو', 'هي'];
  const words = normText.split(/\s+/);
  if (words.some((w) => pronounTokens.includes(w))) {
    return true;
  }

  // 4. Words with attached pronoun suffix
  if (words.some((w) => (w.endsWith('ها') || w.endsWith('ه')) && w.length >= 4 && !['هذه', 'هذا', 'الله', 'سنه', 'فتره'].includes(w))) {
    return true;
  }

  return false;
}

// Main logic to process each incoming user query
export function processUserQuery(
  rawQuery: string,
  activeStar: ActiveStarState | null,
  previousStars: string[] = []
): ProcessingResult {
  const trimmedQuery = rawQuery.trim();
  const normQuery = normalizeAr(trimmedQuery);

  // 1. Check if greeting or polite phrase
  if (isGreetingOrGeneralPolite(normQuery)) {
    return {
      displayUserMessage: trimmedQuery,
      enrichedQuery: trimmedQuery,
      updatedActiveStar: activeStar, // preserve active star
    };
  }

  // 2. Detect any mentioned stars in current query
  const mentionedStars = detectMentionedStars(trimmedQuery);

  // Case A: Multiple stars mentioned in the question (e.g. "قارن بين الثريا وسهيل")
  if (mentionedStars.length > 1) {
    const starNames = mentionedStars.map((s) => s.cleanName);
    return {
      displayUserMessage: trimmedQuery,
      enrichedQuery: trimmedQuery,
      updatedActiveStar: null, // clear single active star to prevent false bias
      multipleStarsDetected: starNames,
    };
  }

  // Case B: Exactly one star mentioned clearly in the question
  if (mentionedStars.length === 1) {
    const found = mentionedStars[0];
    const newActiveStar: ActiveStarState = {
      name: found.fullName,
      cleanName: found.cleanName,
      number: found.n,
    };
    return {
      displayUserMessage: trimmedQuery,
      enrichedQuery: trimmedQuery,
      updatedActiveStar: newActiveStar,
    };
  }

  // Case C: No star mentioned directly in the current question
  // Check if it's a broad heritage question not related to a specific star
  if (isBroadHeritageQuestion(normQuery)) {
    return {
      displayUserMessage: trimmedQuery,
      enrichedQuery: trimmedQuery,
      updatedActiveStar: activeStar, // do not attach star to broad topic
    };
  }

  // Check if this is a follow-up inquiry with pronouns or elided questions
  const isFollowUp = isFollowUpInquiry(trimmedQuery, normQuery);

  // If follow-up, but multiple stars were discussed previously and no single active star
  if (isFollowUp && !activeStar && previousStars.length > 1) {
    return {
      displayUserMessage: trimmedQuery,
      enrichedQuery: trimmedQuery,
      requiresClarification: true,
      clarificationMessage: `عن أي نجم منهما تقصد السؤال؟ (${previousStars.join(' أم ')})؟ يرجى تحديد النجم المقصود لنتمكن من إفادتك بدقة.`,
    };
  }

  // If follow-up, but absolutely no active star is known
  if (isFollowUp && !activeStar) {
    return {
      displayUserMessage: trimmedQuery,
      enrichedQuery: trimmedQuery,
      requiresClarification: true,
      clarificationMessage: 'عن أي نجم تقصد السؤال؟ يرجى ذكر اسم النجم لنتمكن من تزويدك بمعلوماته التراثية بدقة.',
    };
  }

  // If we have an active star and this is a follow-up inquiry: enrich for Dify
  if (activeStar && isFollowUp) {
    const starName = activeStar.cleanName;
    const prep = formatArabicPreposition(starName);

    let enriched = trimmedQuery;

    // 1. Scientific name: «وش اسمها العلمي؟» / «ما هو الاسم العلمي؟» -> «وش الاسم العلمي للهقعة؟»
    if (/(وش|ما هو|ما|ماهو|ماذا عن)?\s*(الاسم|اسمها|اسمه|اسم هذا النجم)?\s*العلمي/i.test(normQuery) || /العلمي/.test(normQuery)) {
      enriched = `وش الاسم العلمي ${prep}؟`;
    }
    // 2. Meaning: «ما معناها؟» / «وش معناه؟» -> «ما معنى {starName}؟»
    else if (/(وش|ما هو|ما|ماهو)?\s*(معناها|معناه)/i.test(normQuery)) {
      enriched = `ما معنى ${starName}؟`;
    }
    // 3. Location: «أين يقع؟» -> «أين يقع {starName} في السماء؟»
    else if (/(اين|وين)\s*(يقع|تقع|موقعه|موقعها)/i.test(normQuery)) {
      enriched = `أين يقع ${starName} في السماء؟`;
    }
    // 4. Constellation: «ما هي كوكبته؟» -> «ما هي كوكبة {starName}؟»
    else if (/(ما هي|ما)?\s*(كوكبتها|كوكبه|كوكبتها التي يقع فيها)/i.test(normQuery)) {
      enriched = `ما هي الكوكبة التي يقع فيها ${starName}؟`;
    }
    // 5. Rise time: «متى يطلع؟» -> «متى وقت طلوع {starName}؟»
    else if (/(متي|متى)\s*(يطلع|تطلع|طلوعها|طلوعه|يظهر|تظهر)/i.test(normQuery)) {
      enriched = `متى وقت طلوع ${starName}؟`;
    }
    // 6. Set time: «متى يسقط؟» -> «متى وقت سقوط {starName}؟»
    else if (/(متي|متى)\s*(يسقط|تسقط|سقوطها|سقوطه|يغيب|تغيب)/i.test(normQuery)) {
      enriched = `متى وقت سقوط ${starName}؟`;
    }
    // 7. Naw & Rain: «هل له مطر؟» -> «ما هو نوء ومطر {starName}؟»
    else if (/هل\s*(له|لها|فيه|فيها)\s*(مطر|نوء)/i.test(normQuery)) {
      enriched = `ما هو نوء ومطر ${starName}؟`;
    }
    // 8. Poetry: «ما شعره؟» -> «ما هو الشعر الوارد في {starName}؟»
    else if (/(ما|وش)?\s*(شعرها|شعره|شعر فيه|شعر فيها)/i.test(normQuery)) {
      enriched = `ما هو الشعر الوارد في ${starName}؟`;
    }
    // 9. Proverbs: «ما أمثاله؟» -> «ما هي أقوال العرب وأمثالهم في {starName}؟»
    else if (/(ما|وش)?\s*(اقوال|امثال)\s*(العرب)?\s*(فيه|فيها|عنه|عنها)/i.test(normQuery)) {
      enriched = `ما هي أقوال العرب وأمثالهم في ${starName}؟`;
    }
    // 10. Direct replacement for «حدثني عنه» / «اخبرني عنها»
    else if (/(حدثني|اخبرني|كلمني)\s*(عنه|عنها)/i.test(normQuery)) {
      enriched = trimmedQuery.replace(/(حدثني|اخبرني|كلمني)\s*(عنه|عنها)/i, `$1 عن ${starName}`);
    }
    // 11. General pronoun substitution for «عنه» / «عنها» / «فيه» / «فيها»
    else if (/\b(عنه|عنها)\b/.test(trimmedQuery)) {
      enriched = trimmedQuery.replace(/\b(عنه|عنها)\b/g, `عن ${starName}`);
    }
    else if (/\b(فيه|فيها)\b/.test(trimmedQuery)) {
      enriched = trimmedQuery.replace(/\b(فيه|فيها)\b/g, `في ${starName}`);
    }
    // 12. Fallback: append star context cleanly
    else {
      const cleanQ = trimmedQuery.replace(/[؟?]/g, '').trim();
      enriched = `${cleanQ} (عن نجم ${starName})؟`;
    }

    return {
      displayUserMessage: trimmedQuery,
      enrichedQuery: enriched,
      updatedActiveStar: activeStar,
    };
  }

  // Not a follow up and no star mentioned: send as-is
  return {
    displayUserMessage: trimmedQuery,
    enrichedQuery: trimmedQuery,
    updatedActiveStar: activeStar,
  };
}
