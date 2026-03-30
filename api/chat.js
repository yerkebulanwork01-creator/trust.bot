import fs from "fs";
import path from "path";

const VECTORS_FILE = path.join(process.cwd(), "vectors.json");
let VECTOR_CACHE = null;

function getVectors() {
  if (!VECTOR_CACHE) {
    VECTOR_CACHE = JSON.parse(fs.readFileSync(VECTORS_FILE, "utf-8"));
    console.log("Vectors loaded:", VECTOR_CACHE.length);
  }
  return VECTOR_CACHE;
}

function cosine(a, b) {
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

async function embedQuery(query) {
  const response = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.VOYAGE_API_KEY}`
    },
    body: JSON.stringify({
      input: [query],
      model: "voyage-3-lite",
      input_type: "query"
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.detail || data?.message || JSON.stringify(data));
  }

  return data.data[0].embedding;
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

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: "ANTHROPIC_API_KEY жоқ" });
    }

    if (!process.env.VOYAGE_API_KEY) {
      return res.status(500).json({ error: "VOYAGE_API_KEY жоқ" });
    }

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: "Хабарлама бос" });
    }

    if (!fs.existsSync(VECTORS_FILE)) {
      return res.status(500).json({ error: "vectors.json табылмады" });
    }

    const vectors = getVectors();
    const queryEmbedding = await embedQuery(String(message).trim());

    const top = vectors
      .map((item) => ({
        ...item,
        score: cosine(queryEmbedding, item.embedding)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (!top.length || top[0].score < 0.05) {
      return res.status(200).json({ reply: fallback(safeLang) });
    }

    const context = top
      .map((item, index) => `[${index + 1}] SOURCE: ${item.source}\n${item.text}`)
      .join("\n\n---\n\n");

    const system =
      safeLang === "ru"
        ? `Ты официальный помощник фонда Samruk-Kazyna Trust.
Отвечай только на основе контекста ниже.
Не копируй весь контекст, дай краткий и точный ответ.
Если ответа нет даже близко, напиши дословно:
"${fallback("ru")}"

КОНТЕКСТ:
${context}`
        : `Сен Samruk-Kazyna Trust қорының ресми көмекшісісің.
Тек төмендегі контекст бойынша жауап бер.
Контекстті көшірмей, қысқа және нақты жауап бер.
Егер жауап мүлде табылмаса, дәл былай жаз:
"${fallback("kk")}"

КОНТЕКСТ:
${context}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "content-type": "application/json",
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
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
      return res.status(500).json({
        error: data?.error?.message || "AI сервис қатесі"
      });
    }

    const reply =
      data?.content?.find?.((x) => x.type === "text")?.text ||
      data?.content?.[0]?.text ||
      fallback(safeLang);

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Server crash:", err);
    return res.status(500).json({ error: "Сервер қатесі: " + err.message });
  }
}
