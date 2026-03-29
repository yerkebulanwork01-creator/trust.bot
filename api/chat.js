import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "knowledge_files");
let KNOWLEDGE_CACHE = null;

function normalizeText(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/[^a-zа-яёәіңғүұқөһ0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function chunkText(text, size = 1200, overlap = 200) {
  const chunks = [];
  const clean = String(text || "").trim();

  if (!clean) return chunks;

  let start = 0;

  while (start < clean.length) {
    const end = Math.min(start + size, clean.length);
    const chunk = clean.slice(start, end).trim();

    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= clean.length) break;
    start += size - overlap;
  }

  return chunks;
}

function buildKnowledgeBase() {
  if (!fs.existsSync(DATA_DIR)) {
    return [];
  }

  const files = fs.readdirSync(DATA_DIR).filter((file) => {
    const full = path.join(DATA_DIR, file);
    return fs.statSync(full).isFile() && file.toLowerCase().endsWith(".txt");
  });

  const allChunks = [];

  for (const file of files) {
    const fullPath = path.join(DATA_DIR, file);
    const content = fs.readFileSync(fullPath, "utf-8");
    const chunks = chunkText(content);

    for (const chunk of chunks) {
      allChunks.push({
        source: file,
        text: chunk
      });
    }
  }

  return allChunks;
}

function getKnowledge() {
  if (!KNOWLEDGE_CACHE) {
    KNOWLEDGE_CACHE = buildKnowledgeBase();
    console.log("Knowledge loaded:", KNOWLEDGE_CACHE.length);
  }
  return KNOWLEDGE_CACHE;
}

function scoreChunk(chunkTextRaw, query) {
  const chunk = normalizeText(chunkTextRaw);
  const q = normalizeText(query);

  if (!q) return 0;

  let score = 0;

  if (chunk.includes(q)) score += 50;

  const words = q.split(" ").filter(Boolean);
  const uniqueWords = [...new Set(words)];

  for (const word of uniqueWords) {
    if (word.length < 2) continue;
    if (chunk.includes(word)) score += 5;
  }

  return score;
}

function searchKnowledge(chunks, query, limit = 6) {
  return chunks
    .map((item) => ({
      ...item,
      score: scoreChunk(item.text, query)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function getFallback(lang) {
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
      return res.status(200).json({
        reply: getFallback(safeLang)
      });
    }

    const topChunks = searchKnowledge(knowledge, String(message), 6);
    console.log("TOP CHUNKS:", topChunks.map(x => ({
      source: x.source,
      score: x.score,
      preview: x.text.slice(0, 120)
    })));

    if (!topChunks.length || (topChunks[0] && topChunks[0].score < 1)) {
      return res.status(200).json({
        reply: getFallback(safeLang)
      });
    }

    const context = topChunks
      .map((item, index) => {
        return `[${index + 1}] SOURCE: ${item.source}\n${item.text}`;
      })
      .join("\n\n---\n\n");

    const system =
      safeLang === "ru"
        ? `Ты официальный помощник фонда Samruk-Kazyna Trust.

ТВОЯ ЗАДАЧА:
Отвечать пользователю на основе контекста ниже.

ПРАВИЛА:
1. Отвечай, опираясь в первую очередь на предоставленный контекст.
2. Если в контексте нет точной формулировки, но есть близкая и полезная информация, используй ее и дай максимально полезный ответ.
3. Не говори сразу "информации нет", если можно дать частичный, близкий или логически вытекающий ответ из контекста.
4. Не придумывай новые факты, которых нет в контексте.
5. Можно:
   - кратко перефразировать,
   - объединять несколько фрагментов контекста,
   - делать осторожный логический вывод, если он прямо следует из контекста.
6. Если вопрос про документы, требования, этапы, контакты, сроки или порядок подачи:
   - отвечай списком,
   - делай ответ структурированным и удобным для чтения.
7. Если в контексте есть ссылка, можно показать ее в ответе.
8. Только если в контексте вообще нет даже близкой информации, ответь дословно:
"${getFallback("ru")}"

СТИЛЬ ОТВЕТА:
- официальный
- понятный
- короткий, но полезный
- только на русском языке

КОНТЕКСТ:
${context}`
        : `Сен Samruk-Kazyna Trust қорының ресми көмекшісісің.

СЕНІҢ МІНДЕТІҢ:
Төмендегі контекстке сүйеніп пайдаланушының сұрағына жауап беру.

ЕРЕЖЕЛЕР:
1. Жауапты ең алдымен берілген контекстке сүйеніп бер.
2. Егер контекстте дәлме-дәл жауап болмаса, бірақ соған жақын әрі пайдалы ақпарат болса, соны пайдаланып, барынша пайдалы жауап бер.
3. Бірден "базада жоқ" деп жазба, егер контексттен ішінара, жақын немесе логикалық түрде шығатын жауап беруге болса.
4. Контекстте жоқ жаңа факт ойдан қоспа.
5. Мына әрекеттерге болады:
   - қысқаша өз сөзіңмен түсіндіру,
   - бірнеше контекст бөлігін біріктіру,
   - егер қорытынды контексттен тікелей шығатын болса, абайлап логикалық қорытынды жасау.
6. Егер сұрақ құжаттар, талаптар, кезеңдер, байланыс, мерзімдер немесе өтінім беру тәртібі туралы болса:
   - тізіммен жауап бер,
   - жауапты құрылымды әрі оқуға ыңғайлы қыл.
7. Егер контекстте сілтеме болса, оны жауапта көрсетуге болады.
8. Тек контекстте мүлде жақын ақпарат жоқ болған жағдайда ғана дәл былай жаз:
"${getFallback("kk")}"

ЖАУАП СТИЛІ:
- ресми
- түсінікті
- қысқа, бірақ пайдалы
- тек қазақ тілінде

КОНТЕКСТ:
${context}`;

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "content-type": "application/json",
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        system: system,
        messages: [
          {
            role: "user",
            content: String(message).trim()
          }
        ]
      })
    });

    const data = await anthropicResponse.json();

    if (!anthropicResponse.ok) {
      console.error("Anthropic error:", data);
      return res.status(500).json({
        error: data?.error?.message || "AI сервис қатесі"
      });
    }

    const reply =
      data?.content?.find?.((item) => item.type === "text")?.text ||
      data?.content?.[0]?.text ||
      getFallback(safeLang);

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Server crash:", err);
    return res.status(500).json({
      error: "Сервер қатесі: " + err.message
    });
  }
}
