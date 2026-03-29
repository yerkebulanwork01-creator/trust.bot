import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "knowledge_files");
let CACHE = null;

function normalize(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/[^a-zа-яёәіңғүұқөһ0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function chunkText(text, size = 900, overlap = 150) {
  const clean = String(text || "").trim();
  if (!clean) return [];

  const chunks = [];
  let start = 0;

  while (start < clean.length) {
    const end = Math.min(start + size, clean.length);
    const chunk = clean.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= clean.length) break;
    start += size - overlap;
  }

  return chunks;
}

function buildKnowledge() {
  if (!fs.existsSync(DATA_DIR)) return [];

  const files = fs.readdirSync(DATA_DIR).filter((file) => {
    const full = path.join(DATA_DIR, file);
    return fs.statSync(full).isFile() && file.endsWith(".txt");
  });

  const result = [];

  for (const file of files) {
    const full = path.join(DATA_DIR, file);
    const text = fs.readFileSync(full, "utf-8");
    const chunks = chunkText(text);

    for (const chunk of chunks) {
      result.push({
        source: file,
        text: chunk
      });
    }
  }

  return result;
}

function getKnowledge() {
  if (!CACHE) {
    CACHE = buildKnowledge();
    console.log("Knowledge loaded:", CACHE.length);
  }
  return CACHE;
}

function scoreChunk(text, query) {
  const t = normalize(text);
  const q = normalize(query);

  if (!q) return 0;

  let score = 0;

  if (t.includes(q)) score += 20;

  const words = q.split(" ").filter(Boolean);
  for (const w of words) {
    if (w.length < 2) continue;
    if (t.includes(w)) score += 4;
  }

  return score;
}

function search(chunks, query, limit = 5) {
  return chunks
    .map((c) => ({
      ...c,
      score: scoreChunk(c.text, query)
    }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function detectIntent(q) {
  if (
    q.includes("басшы") ||
    q.includes("директор") ||
    q.includes("руковод") ||
    q.includes("генеральный") ||
    q.includes("кім басшы")
  ) return "management";

  if (
    q.includes("өтінім") ||
    q.includes("заяв") ||
    q.includes("подать") ||
    q.includes("тапсыру")
  ) return "application";

  if (
    q.includes("құжат") ||
    q.includes("документ") ||
    q.includes("анықтама") ||
    q.includes("справка")
  ) return "documents";

  if (
    q.includes("байланыс") ||
    q.includes("телефон") ||
    q.includes("контакт") ||
    q.includes("email") ||
    q.includes("мекенжай") ||
    q.includes("адрес")
  ) return "contacts";

  if (
    q.includes("қор туралы") ||
    q.includes("о фонде") ||
    q.includes("қор жайлы")
  ) return "about";

  if (
    q.includes("бағдарлама") ||
    q.includes("программ") ||
    q.includes("жоба") ||
    q.includes("проект")
  ) return "programs";

  if (
    q.includes("сілтеме") ||
    q.includes("ссылка") ||
    q.includes("link")
  ) return "links";

  return null;
}

function fallback(lang) {
  return lang === "ru"
    ? "Эта информация отсутствует в базе. Обратитесь напрямую: info@sk-trust.kz или +7 (7172) 57 68 98"
    : "Бұл ақпарат базада жоқ. Тікелей хабарласыңыз: info@sk-trust.kz немесе +7 (7172) 57 68 98";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, lang } = req.body || {};
    const safeLang = lang === "ru" ? "ru" : "kk";
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "ANTHROPIC_API_KEY жоқ" });
    }

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: "Хабарлама бос" });
    }

    const knowledge = getKnowledge();
    if (!knowledge.length) {
      return res.status(200).json({ reply: fallback(safeLang) });
    }

    const q = normalize(message);
    const intent = detectIntent(q);

    let candidates = knowledge;

    if (intent) {
      const intentChunks = knowledge.filter((x) => x.source.includes(intent));
      if (intentChunks.length) {
        candidates = intentChunks;
      }
    }

    let top = search(candidates, message, 5);

    if (!top.length && candidates !== knowledge) {
      top = search(knowledge, message, 5);
    }

    console.log(
      "TOP CHUNKS:",
      top.map((x) => ({
        source: x.source,
        score: x.score,
        preview: x.text.slice(0, 140)
      }))
    );

    if (!top.length || top[0].score < 1) {
      return res.status(200).json({ reply: fallback(safeLang) });
    }

    const context = top
      .map((x, i) => `[${i + 1}] SOURCE: ${x.source}\n${x.text}`)
      .join("\n\n---\n\n");

    const system =
      safeLang === "ru"
        ? `Ты официальный помощник фонда Samruk-Kazyna Trust.

Отвечай ТОЛЬКО на основе контекста ниже.

ПРАВИЛА:
1. Не копируй контекст целиком.
2. Не пересказывай весь документ.
3. Дай только прямой ответ на вопрос пользователя.
4. Если пользователь задал короткий вопрос, ответ тоже должен быть коротким.
5. Если спрашивают "кто", "что", "где", "когда", отвечай одной-двумя фразами.
6. Если вопрос про документы или этапы, можно использовать список.
7. Не придумывай факты.
8. Если в контексте нет даже близкого ответа, напиши дословно:
"${fallback("ru")}"

КОНТЕКСТ:
${context}`
        : `Сен Samruk-Kazyna Trust қорының ресми көмекшісісің.

ТЕК төмендегі контекст бойынша жауап бер.

ЕРЕЖЕЛЕР:
1. Контекстті сол күйі көшіріп берме.
2. Бүкіл құжатты қайталап жіберме.
3. Пайдаланушының сұрағына тек тура жауап бер.
4. Егер сұрақ қысқа болса, жауап та қысқа болсын.
5. "кім", "не", "қайда", "қашан" сияқты сұрақтарға 1-2 сөйлеммен жауап бер.
6. Егер сұрақ құжаттар немесе кезеңдер туралы болса, тізім қолдануға болады.
7. Ойдан факт қоспа.
8. Егер контекстте тіпті жақын жауап болмаса, дәл былай жаз:
"${fallback("kk")}"

КОНТЕКСТ:
${context}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "content-type": "application/json",
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system,
        messages: [
          {
            role: "user",
            content: String(message).trim()
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Anthropic error:", data);
      return res.status(500).json({
        error: data?.error?.message || "AI сервис қатесі"
      });
    }

    const reply =
      data?.content?.find?.((item) => item.type === "text")?.text ||
      data?.content?.[0]?.text ||
      fallback(safeLang);

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Server crash:", err);
    return res.status(500).json({ error: "Сервер қатесі: " + err.message });
  }
}
