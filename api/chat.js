import fs from "fs";
import path from "path";

const MAX_CONTEXT_CHUNKS = 6;
const MAX_CHUNK_CHARS = 1200;
const CHUNK_OVERLAP = 180;
const FALLBACK_MESSAGE = "Кешіріңіз, база ішінде нақты жауап табылмады. Сұрақты нақтылап жазыңыз немесе құжатқа жаңа ақпарат қосыңыз.";

const STOPWORDS = new Set([
  "және", "мен", "да", "де", "та", "те", "не", "немесе", "үшін", "туралы", "қалай", "қандай", "қай", "қашан", "қайда",
  "это", "как", "что", "где", "когда", "какой", "какая", "какие", "для", "или", "про", "об", "о", "на", "по",
  "the", "a", "an", "and", "or", "for", "of", "to", "in", "on", "is", "are", "what", "how", "when", "where"
]);

const SYNONYMS = {
  өтінім: ["заявка", "request", "appeal", "обращение"],
  заявка: ["өтінім", "request", "обращение"],
  келісімшарт: ["договор", "contract", "шарт"],
  договор: ["келісімшарт", "contract", "шарт"],
  төлем: ["оплата", "payment", "төлеу"],
  оплата: ["төлем", "payment", "төлеу"],
  қызметкер: ["сотрудник", "employee", "персонал"],
  сотрудник: ["қызметкер", "employee", "персонал"],
  жоба: ["проект", "project", "initiative"],
  проект: ["жоба", "project", "initiative"],
  қор: ["фонд", "foundation", "trust"],
  фонд: ["қор", "foundation", "trust"],
  білім: ["образование", "education"],
  образование: ["білім", "education"],
  денсаулық: ["здравоохранение", "health", "медицина"],
  здравоохранение: ["денсаулық", "health", "медицина"],
  спорт: ["спорт", "sports"],
  инклюзия: ["inclusive", "инклюзив", "ерекше қажеттілік"],
  реабилитация: ["оңалту", "rehabilitation"],
  оңалту: ["реабилитация", "rehabilitation"],
  абай: ["область абай", "семей"],
  семей: ["семей", "абай"],
  samruk: ["samruk-kazyna trust", "самрук", "самұрық"],
  trust: ["samruk-kazyna trust", "қор", "фонд"]
};

let cachedKB = null;

function normalizeText(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/ұ/g, "у")
    .replace(/ү/g, "у")
    .replace(/қ/g, "к")
    .replace(/ғ/g, "г")
    .replace(/ң/g, "н")
    .replace(/ә/g, "а")
    .replace(/ө/g, "о")
    .replace(/һ/g, "х")
    .replace(/[“”«»"'`]/g, " ")
    .replace(/[^\p{L}\p{N}\s.,:;!?/-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text = "") {
  return normalizeText(text)
    .split(/\s+/)
    .filter((token) => token && token.length > 1 && !STOPWORDS.has(token));
}

function expandTokens(tokens) {
  const expanded = new Set(tokens);
  for (const token of tokens) {
    const variants = SYNONYMS[token];
    if (variants) {
      for (const variant of variants) {
        expanded.add(normalizeText(variant));
      }
    }
  }
  return [...expanded];
}

function splitByHeadings(text) {
  const lines = text.split(/\r?\n/);
  const sections = [];
  let currentTitle = "Жалпы ақпарат";
  let buffer = [];

  const flush = () => {
    const content = buffer.join("\n").trim();
    if (content) {
      sections.push({ title: currentTitle, content });
    }
    buffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const isHeading =
      line.length > 0 &&
      (line === line.toUpperCase() || /^#{1,6}\s+/.test(line) || /^\d+[.)]\s+/.test(line)) &&
      line.length < 140;

    if (isHeading) {
      flush();
      currentTitle = line.replace(/^#{1,6}\s+/, "");
    } else {
      buffer.push(rawLine);
    }
  }

  flush();
  return sections.length ? sections : [{ title: "Жалпы ақпарат", content: text }];
}

function chunkSection(section, sectionIndex) {
  const clean = section.content.replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];

  const paragraphs = clean.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let current = "";
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length <= MAX_CHUNK_CHARS) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(makeChunk(section.title, current, sectionIndex, chunkIndex++));
    }

    if (paragraph.length <= MAX_CHUNK_CHARS) {
      current = paragraph;
      continue;
    }

    let start = 0;
    while (start < paragraph.length) {
      const end = Math.min(start + MAX_CHUNK_CHARS, paragraph.length);
      const slice = paragraph.slice(start, end).trim();
      if (slice) {
        chunks.push(makeChunk(section.title, slice, sectionIndex, chunkIndex++));
      }
      if (end >= paragraph.length) break;
      start = Math.max(end - CHUNK_OVERLAP, start + 1);
    }
    current = "";
  }

  if (current) {
    chunks.push(makeChunk(section.title, current, sectionIndex, chunkIndex++));
  }

  return chunks;
}

function makeChunk(title, content, sectionIndex, chunkIndex) {
  const normalized = normalizeText(`${title} ${content}`);
  const tokens = tokenize(normalized);
  return {
    id: `s${sectionIndex}_c${chunkIndex}`,
    title,
    content,
    normalized,
    tokens,
    tokenSet: new Set(tokens)
  };
}

function loadKnowledgeBase() {
  if (cachedKB) return cachedKB;

  const docsPath = path.join(process.cwd(), "api", "docs.txt");
  if (!fs.existsSync(docsPath)) {
    cachedKB = [];
    return cachedKB;
  }

  const raw = fs.readFileSync(docsPath, "utf8");
  const sections = splitByHeadings(raw);
  const chunks = sections.flatMap((section, index) => chunkSection(section, index));
  cachedKB = chunks;
  return cachedKB;
}

function scoreChunk(chunk, queryTokens, expandedTokens) {
  let score = 0;
  const contentLower = chunk.normalized;

  for (const token of queryTokens) {
    if (chunk.tokenSet.has(token)) score += 8;
    if (chunk.title && normalizeText(chunk.title).includes(token)) score += 10;
    const regex = new RegExp(`\\b${escapeRegExp(token)}\\b`, "g");
    const matches = contentLower.match(regex);
    if (matches) score += Math.min(matches.length, 4) * 2;
  }

  for (const token of expandedTokens) {
    if (chunk.tokenSet.has(token)) score += 3;
  }

  const queryPhrase = queryTokens.join(" ");
  if (queryPhrase && contentLower.includes(queryPhrase)) score += 15;

  return score;
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function retrieveRelevantChunks(query) {
  const kb = loadKnowledgeBase();
  if (!kb.length) return [];

  const queryTokens = tokenize(query);
  const expandedTokens = expandTokens(queryTokens);

  const scored = kb
    .map((chunk) => ({
      ...chunk,
      score: scoreChunk(chunk, queryTokens, expandedTokens)
    }))
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CONTEXT_CHUNKS);

  if (scored.length) return scored;

  return kb.slice(0, Math.min(3, kb.length)).map((chunk) => ({ ...chunk, score: 1 }));
}

function buildContext(chunks) {
  return chunks
    .map((chunk, index) => {
      return `[SOURCE ${index + 1}]\nTitle: ${chunk.title}\nContent: ${chunk.content}`;
    })
    .join("\n\n");
}

function buildCitations(chunks) {
  return chunks.map((chunk) => `• ${chunk.title} (${chunk.id})`).join("\n");
}

async function callOpenAI(question, context) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1/chat/completions";

  const system = [
    "Сен Samruk-Kazyna Trust үшін ішкі knowledge-base ассистентісің.",
    "Жауапты тек берілген контекстке сүйеніп жаз.",
    "Егер контекстте жауап жоқ болса, оны ашық айт.",
    "Жауап тілі қолданушы сұрағына сай болсын.",
    "Жауап ықшам, нақты, структуралы болсын.",
    "Факт ойлап қоспа."
  ].join(" ");

  const payload = {
    model,
    temperature: 0.2,
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: `Контекст:\n${context}\n\nСұрақ: ${question}\n\nЕреже: жауапты тек контекст негізінде бер. Егер жауап толық болмаса, нақты қай ақпарат жетіспейтінін айт.`
      }
    ]
  };

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI error: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() || null;
}

function makeFallbackAnswer(question, chunks) {
  if (!chunks.length) return FALLBACK_MESSAGE;

  const first = chunks[0];
  const shortText = first.content.length > 900 ? `${first.content.slice(0, 900)}...` : first.content;

  return [
    `Сұрағыңызға ең жақын ақпарат төмендегідей:`,
    shortText,
    chunks.length > 1 ? `\nҚосымша байланысты бөлімдер саны: ${chunks.length - 1}` : ""
  ].join("\n\n").trim();
}

function parseRequestBody(event) {
  try {
    if (!event?.body) return {};
    return typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  } catch {
    return {};
  }
}

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    },
    body: JSON.stringify(payload)
  };
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return json(200, { ok: true });
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Only POST is allowed" });
  }

  try {
    const body = parseRequestBody(event);
    const question = String(body?.message || body?.question || "").trim();

    if (!question) {
      return json(400, { error: "message is required" });
    }

    const relevantChunks = retrieveRelevantChunks(question);
    const context = buildContext(relevantChunks);

    let answer;
    try {
      answer = await callOpenAI(question, context);
    } catch (error) {
      console.error("LLM call failed:", error);
      answer = null;
    }

    if (!answer) {
      answer = makeFallbackAnswer(question, relevantChunks);
    }

    return json(200, {
      ok: true,
      question,
      answer,
      sources: relevantChunks.map((chunk) => ({
        id: chunk.id,
        title: chunk.title,
        score: chunk.score,
        excerpt: chunk.content.slice(0, 220)
      })),
      citations: buildCitations(relevantChunks)
    });
  } catch (error) {
    console.error("chat handler error:", error);
    return json(500, {
      ok: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
