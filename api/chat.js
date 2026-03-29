import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DATA_DIR = path.join(process.cwd(), "knowledge_files");

let CACHE = null;

// ---------- utils ----------
function chunkText(text, size = 800, overlap = 150) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    chunks.push(text.slice(start, end));
    start += size - overlap;
  }

  return chunks;
}

// ---------- load knowledge ----------
function loadKnowledge() {
  if (CACHE) return CACHE;

  const files = fs.readdirSync(DATA_DIR);
  const chunks = [];

  for (const file of files) {
    const text = fs.readFileSync(path.join(DATA_DIR, file), "utf-8");
    const parts = chunkText(text);

    for (const part of parts) {
      chunks.push({
        text: part,
        source: file,
      });
    }
  }

  console.log("Loaded chunks:", chunks.length);

  CACHE = chunks;
  return chunks;
}

// ---------- cosine ----------
function cosine(a, b) {
  let sum = 0, aMag = 0, bMag = 0;

  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
    aMag += a[i] * a[i];
    bMag += b[i] * b[i];
  }

  return sum / (Math.sqrt(aMag) * Math.sqrt(bMag));
}

// ---------- embedding search ----------
async function search(query, chunks) {
  const qEmb = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });

  const q = qEmb.data[0].embedding;

  // әр chunk үшін embedding жасаймыз (lazy cache)
  for (const chunk of chunks) {
    if (!chunk.embedding) {
      const emb = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk.text,
      });
      chunk.embedding = emb.data[0].embedding;
    }
  }

  const scored = chunks.map(c => ({
    ...c,
    score: cosine(q, c.embedding),
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

// ---------- fallback ----------
function fallback(lang) {
  return lang === "ru"
    ? "Эта информация отсутствует в базе. Обратитесь: info@sk-trust.kz"
    : "Бұл ақпарат базада жоқ. info@sk-trust.kz";
}

// ---------- handler ----------
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  try {
    const { message, lang } = req.body || {};
    const safeLang = lang === "ru" ? "ru" : "kk";

    if (!message) {
      return res.status(400).json({ error: "empty message" });
    }

    const knowledge = loadKnowledge();

    const top = await search(message, knowledge);

    if (!top.length) {
      return res.status(200).json({ reply: fallback(safeLang) });
    }

    const context = top.map(x => x.text).join("\n\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "content-type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-latest",
        max_tokens: 500,
        system: safeLang === "ru"
          ? `Отвечай только по базе:\n\n${context}`
          : `Тек база бойынша жауап бер:\n\n${context}`,
        messages: [
          {
            role: "user",
            content: message,
          },
        ],
      }),
    });

    const data = await response.json();

    return res.status(200).json({
      reply: data?.content?.[0]?.text || fallback(safeLang),
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
