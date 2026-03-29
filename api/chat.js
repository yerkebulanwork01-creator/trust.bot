import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "knowledge_files");
let CACHE = null;

// ===== NORMALIZE =====
function normalize(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/[^a-zа-яәіңғүұқөһ0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ===== LOAD FILES =====
function buildKnowledge() {
  if (!fs.existsSync(DATA_DIR)) return [];

  const files = fs.readdirSync(DATA_DIR);

  let chunks = [];

  for (const file of files) {
    if (!file.endsWith(".txt")) continue;

    const full = path.join(DATA_DIR, file);
    const text = fs.readFileSync(full, "utf-8");

    chunks.push({
      source: file,
      text
    });
  }

  return chunks;
}

function getKnowledge() {
  if (!CACHE) {
    CACHE = buildKnowledge();
    console.log("Knowledge loaded:", CACHE.length);
  }
  return CACHE;
}

// ===== SEARCH =====
function search(chunks, query) {
  const q = normalize(query);

  return chunks
    .map(c => {
      const t = normalize(c.text);

      let score = 0;

      if (t.includes(q)) score += 10;

      const words = q.split(" ");
      for (const w of words) {
        if (w.length < 2) continue;
        if (t.includes(w)) score += 3;
      }

      return { ...c, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

// ===== INTENT SYSTEM =====
function detectIntent(q) {
  if (
    q.includes("басшы") ||
    q.includes("директор") ||
    q.includes("руковод") ||
    q.includes("кім басшы")
  ) return "management";

  if (q.includes("өтінім") || q.includes("заяв")) return "application";

  if (q.includes("құжат") || q.includes("документ")) return "documents";

  if (
    q.includes("байланыс") ||
    q.includes("телефон") ||
    q.includes("контакт")
  ) return "contacts";

  if (q.includes("қор") || q.includes("о фонде")) return "about";

  return null;
}

// ===== FALLBACK =====
function fallback(lang) {
  return lang === "ru"
    ? "Эта информация отсутствует в базе. Обратитесь напрямую: info@sk-trust.kz или +7 (7172) 57 68 98"
    : "Бұл ақпарат базада жоқ. Тікелей хабарласыңыз: info@sk-trust.kz немесе +7 (7172) 57 68 98";
}

// ===== MAIN =====
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, lang } = req.body || {};
    const safeLang = lang === "ru" ? "ru" : "kk";

    if (!message) {
      return res.status(400).json({ error: "message жоқ" });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "API key жоқ" });
    }

    const knowledge = getKnowledge();
    const q = normalize(message);

    // ===== INTENT FIRST =====
    const intent = detectIntent(q);

    if (intent) {
      const filtered = knowledge.filter(x =>
        x.source.includes(intent)
      );

      if (filtered.length) {
        return res.status(200).json({
          reply: filtered.map(x => x.text).join("\n\n")
        });
      }
    }

    // ===== SEARCH =====
    const top = search(knowledge, message);

    if (!top.length || top[0].score < 1) {
      return res.status(200).json({
        reply: fallback(safeLang)
      });
    }

    const context = top.map(x => x.text).join("\n\n");

    // ===== SMART PROMPT =====
    const system =
      safeLang === "ru"
        ? `Ты помощник фонда Samruk-Kazyna Trust.

Отвечай по контексту.
Если нет точного ответа — дай максимально близкий и полезный ответ.
Не придумывай факты.
Отвечай кратко и по делу.

Контекст:
${context}`
        : `Сен Samruk-Kazyna Trust қорының көмекшісісің.

Контекстке сүйеніп жауап бер.
Егер нақты жауап болмаса — ең жақын пайдалы жауап бер.
Ойдан факт қоспа.
Жауап қысқа әрі нақты болсын.

Контекст:
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
        max_tokens: 800,
        system,
        messages: [
          {
            role: "user",
            content: message
          }
        ]
      })
    });

    const data = await response.json();

    const reply =
      data?.content?.[0]?.text || fallback(safeLang);

    return res.status(200).json({ reply });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
