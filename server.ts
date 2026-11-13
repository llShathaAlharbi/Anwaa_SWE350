import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface StarsTableData {
  hdr: string[];
  rows: (string | number)[][];
}

const starsJsonPath = path.join(__dirname, 'src', 'anwaa_stars_data.json');
const starsData: StarsTableData = JSON.parse(fs.readFileSync(starsJsonPath, 'utf-8'));

const SYSTEM_INSTRUCTION =
  'أنت مساعد فلكي تراثي اسمه "أنواء". أجب بالعربية اعتماداً حصرياً على الصفوف المزوّدة من جدول بيانات أنواء. لا تضف أي معلومة من خارجها. إذا لم تجد الجواب في النص المزوّد فقل حرفياً: المصادر التي بين يدي لا تذكر ذلك.';

const REFUSAL_TEXT = 'المصادر التي بين يدي لا تذكر ذلك.';

function normalizeArabic(text: string): string {
  return text
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const STOP_WORDS = new Set(
  [
    'ما',
    'هو',
    'هي',
    'هل',
    'في',
    'من',
    'عن',
    'على',
    'الى',
    'إلى',
    'متى',
    'اين',
    'أين',
    'وين',
    'كيف',
    'لماذا',
    'ليش',
    'سموا',
    'سمي',
    'سميت',
    'بهذا',
    'الاسم',
    'نجم',
    'منزله',
    'كوكبه',
    'انواء',
    'حدثني',
    'اخبرني',
    'اذكر',
    'قيل',
    'الذي',
    'التي',
    'معنى',
    'موقع',
    'شكل',
    'وقت',
    'طلوع',
    'سقوط',
    'نوء',
    'مطر',
    'شعر',
    'امثال',
    'اقوال',
    'العرب',
    'كم',
    'عدد',
  ].map(normalizeArabic)
);

function retrieveMatchingRows(query: string): { index: number; row: (string | number)[]; score: number }[] {
  const normQ = normalizeArabic(query);
  if (!normQ) return [];

  const tokens = normQ
    .split(' ')
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
  const strippedTokens = tokens.map((t) => (t.startsWith('ال') && t.length > 3 ? t.slice(2) : t));

  const scored: { index: number; row: (string | number)[]; score: number }[] = [];

  for (let i = 0; i < starsData.rows.length; i++) {
    const row = starsData.rows[i];
    const fullName = normalizeArabic(String(row[1] || ''));
    const nameParts = String(row[1] || '')
      .split(/[،()\-]/)
      .map((p) => normalizeArabic(p))
      .filter(Boolean);
    const constellation = normalizeArabic(String(row[2] || ''));
    const scientific = normalizeArabic(String(row[3] || ''));
    const allRowText = normalizeArabic(row.map((c) => String(c || '')).join(' '));

    let score = 0;

    // Direct name match
    for (const part of nameParts) {
      if (!part) continue;
      const barePart = part.startsWith('ال') && part.length > 3 ? part.slice(2) : part;
      if (normQ.includes(part) || (barePart.length >= 3 && normQ.includes(barePart))) {
        score += 30;
      }
    }

    // Constellation or scientific match
    if (constellation && normQ.includes(constellation)) {
      score += 15;
    }
    if (scientific && normQ.includes(scientific)) {
      score += 15;
    }

    // Token overlap
    for (let tIdx = 0; tIdx < tokens.length; tIdx++) {
      const tok = tokens[tIdx];
      const bare = strippedTokens[tIdx];
      if (fullName.includes(tok) || (bare.length >= 3 && fullName.includes(bare))) {
        score += 20;
      } else if (constellation.includes(tok) || (bare.length >= 3 && constellation.includes(bare))) {
        score += 10;
      } else if (allRowText.includes(tok) || (bare.length >= 3 && allRowText.includes(bare))) {
        score += 4;
      }
    }

    if (score > 0) {
      scored.push({ index: i, row, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 5);
}

function buildDeterministicAnswer(query: string, matchedRows: (string | number)[][]): string {
  if (matchedRows.length === 0) {
    return REFUSAL_TEXT;
  }

  const normQ = normalizeArabic(query);
  const row = matchedRows[0];
  const hdr = starsData.hdr;

  const asksNaw = normQ.includes('نو') || normQ.includes('مطر');
  const asksPoetry = normQ.includes('شعر') || normQ.includes('قصيد') || normQ.includes('بيت');
  const asksMeaning =
    normQ.includes('معن') ||
    normQ.includes('سمو') ||
    normQ.includes('سمي') ||
    normQ.includes('تسمي') ||
    normQ.includes('ليش');
  const asksLocation = normQ.includes('موقع') || normQ.includes('وين') || normQ.includes('اين') || normQ.includes('كوكب');
  const asksShape = normQ.includes('شكل') || normQ.includes('هيئ');
  const asksTime = normQ.includes('وقت') || normQ.includes('طلوع') || normQ.includes('سقوط') || normQ.includes('متي');
  const asksProverbs = normQ.includes('امثال') || normQ.includes('اقوال') || normQ.includes('مثل');

  const parts: string[] = [`**${row[1]}** (${hdr[2]}: ${row[2]} — ${hdr[3]}: ${row[3]})`];

  if (asksNaw) {
    parts.push(`• **${hdr[8]}:** ${row[8]}`);
    parts.push(`• **${hdr[7]}:** ${row[7]}`);
  } else if (asksPoetry) {
    parts.push(`• **${hdr[10]}:**\n${row[10]}`);
  } else if (asksMeaning) {
    parts.push(`• **${hdr[4]}:** ${row[4]}`);
  } else if (asksLocation) {
    parts.push(`• **${hdr[2]}:** ${row[2]}`);
    parts.push(`• **${hdr[5]}:** ${row[5]}`);
  } else if (asksShape) {
    parts.push(`• **${hdr[6]}:** ${row[6]}`);
  } else if (asksTime) {
    parts.push(`• **${hdr[7]}:** ${row[7]}`);
  } else if (asksProverbs) {
    parts.push(`• **${hdr[9]}:** ${row[9]}`);
  } else {
    parts.push(`• **${hdr[4]}:** ${row[4]}`);
    parts.push(`• **${hdr[5]}:** ${row[5]}`);
    parts.push(`• **${hdr[6]}:** ${row[6]}`);
    parts.push(`• **${hdr[7]}:** ${row[7]}`);
    parts.push(`• **${hdr[8]}:** ${row[8]}`);
    if (row[9] && !String(row[9]).includes('لم يرد')) {
      parts.push(`• **${hdr[9]}:** ${row[9]}`);
    }
    if (row[10] && !String(row[10]).includes('لم يرد')) {
      parts.push(`• **${hdr[10]}:**\n${row[10]}`);
    }
  }

  return parts.join('\n\n');
}

const DIFY_APP_CODE = 'oFMhqUD2KODKFveV';
let cachedDifyToken = '';
let difyTokenExpiry = 0;

async function getDifyPassportToken(): Promise<string> {
  const now = Date.now();
  if (cachedDifyToken && now < difyTokenExpiry) {
    return cachedDifyToken;
  }
  const res = await fetch('https://udify.app/api/passport', {
    method: 'GET',
    headers: {
      'X-App-Code': DIFY_APP_CODE,
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch Dify passport: ${res.statusText}`);
  }
  const data = (await res.json()) as { access_token: string };
  cachedDifyToken = data.access_token;
  difyTokenExpiry = now + 45 * 60 * 1000;
  return cachedDifyToken;
}

async function queryDify(query: string, conversationId?: string) {
  const token = await getDifyPassportToken();
  const makeRequest = async (passport: string) => {
    return await fetch('https://udify.app/api/chat-messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Code': DIFY_APP_CODE,
        'X-App-Passport': passport,
      },
      body: JSON.stringify({
        query,
        inputs: {},
        response_mode: 'blocking',
        conversation_id: conversationId || null,
      }),
    });
  };

  let res = await makeRequest(token);
  if (res.status === 401) {
    cachedDifyToken = '';
    difyTokenExpiry = 0;
    const freshToken = await getDifyPassportToken();
    res = await makeRequest(freshToken);
  }

  if (!res.ok) {
    throw new Error(`Dify chat failed with status ${res.status}`);
  }

  return (await res.json()) as {
    answer: string;
    conversation_id?: string;
    message_id?: string;
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post('/api/chat', async (req, res) => {
    try {
      const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
      const conversationId =
        typeof req.body?.conversation_id === 'string' ? req.body.conversation_id.trim() : undefined;

      if (!query) {
        res.status(400).json({ error: 'Empty query' });
        return;
      }

      // 1. Try Dify chatbot integration first
      try {
        const difyResponse = await queryDify(query, conversationId);
        if (difyResponse?.answer && difyResponse.answer.trim().length > 0) {
          res.json({
            text: difyResponse.answer.trim(),
            conversation_id: difyResponse.conversation_id,
            message_id: difyResponse.message_id,
            source: 'dify',
          });
          return;
        }
      } catch (difyErr) {
        console.warn('Dify proxy error, falling back to local/Gemini:', difyErr);
      }

      // 2. Fallback to local table / Gemini RAG
      const matches = retrieveMatchingRows(query);
      if (matches.length === 0) {
        res.json({
          text: REFUSAL_TEXT,
          matchedCount: 0,
        });
        return;
      }

      const matchedRows = matches.map((m) => m.row);
      const formattedRows = matchedRows
        .map((row) =>
          starsData.hdr.map((header, idx) => `${header}: ${row[idx] ?? ''}`).join('\n')
        )
        .join('\n\n---\n\n');

      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              },
            },
          });

          const prompt = `الصفوف المزوّدة من جدول بيانات أنواء:\n\n${formattedRows}\n\nسؤال المستخدم: ${query}`;

          const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: prompt,
            config: {
              systemInstruction: SYSTEM_INSTRUCTION,
              temperature: 0.1,
            },
          });

          const answerText = response.text?.trim() || buildDeterministicAnswer(query, matchedRows);
          res.json({
            text: answerText,
            matchedCount: matchedRows.length,
            source: 'gemini',
          });
          return;
        } catch (geminiErr) {
          console.error('Gemini API fallback to table row formatter:', geminiErr);
        }
      }

      // Deterministic table-only response when API key is not configured or fails
      res.json({
        text: buildDeterministicAnswer(query, matchedRows),
        matchedCount: matchedRows.length,
        source: 'table',
      });
    } catch (err) {
      console.error('/api/chat error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Anwaa server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
