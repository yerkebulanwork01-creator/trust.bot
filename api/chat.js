import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "knowledge_files");
const VECTORS_FILE = path.join(process.cwd(), "vectors.json");

let TEXT_CACHE = null;
let VECTOR_CACHE = null;

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

function buildTextKnowledge() {
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

function getTextKnowledge() {
  if (!TEXT_CACHE) {
    TEXT_CACHE = buildTextKnowledge();
    console.log("Text knowledge loaded:", TEXT_CACHE.length);
  }
  return TEXT_CACHE;
}

function getVectors() {
  if (!VECTOR_CACHE) {
    if (!fs.existsSync(VECTORS_FILE)) {
      throw new Error("vectors.json табылмады");
    }
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

  if (!Array.isArray(data?.data) || !data.data[0]?.embedding) {
    throw new Error("Voyage query embedding қатесі");
  }

  return data.data[0].embedding;
}

function scoreTextChunk(text, query) {
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

  if ((q.includes("басшы") || q.includes("директор") || q.includes("руковод")) &&
      (t.includes("бас директор") || t.includes("генеральный директор") || t.includes("басшы"))) {
    score += 15;
  }

  if ((q.includes("құжат") || q.includes("документ")) &&
      (t.includes("өтінім") || t.includes("заяв") || t.includes("құжат"))) {
    score += 10;
  }

  if ((q.includes("байланыс") || q.includes("контакт") || q.includes("телефон")) &&
      (t.includes("телефон") || t.includes("email") || t.includes("байланыс") || t.includes("контакт"))) {
    score += 10;
  }

  return score;
}

function textSearch(chunks, query, limit = 8) {
  return chunks
    .map((c) => ({
      ...c,
      score: scoreTextChunk(c.text, query)
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

function buildDocumentAnswer(lang) {
  if (lang === "ru") {
    return `## Необходимые документы

1. Письмо-обращение на имя Генерального директора
Шаблон: https://disk.yandex.kz/i/29uaNvDAxxdUBA

2. Обращение об оказании благотворительной помощи (Приложение №2)
Шаблон: https://disk.yandex.kz/i/yjL8GMbizjWr9Q

3. Устав со всеми изменениями и дополнениями к нему

4. Учредительный договор (при наличии)

5. Справка о зарегистрированном (перерегистрированном) юридическом лице с Egov, полученная не позднее 10 календарных дней до даты подачи заявки

6. Копия документа, удостоверяющего личность подписанта

7. Документ, подтверждающий полномочия на подписание договора от имени пользователя / копия решения уполномоченного органа пользователя о назначении первого руководителя / доверенность

8. Справка с банка второго уровня, подтверждающая открытие/наличие банковского счета в тенге

9. Смета расходов (Приложение №3 согласно Правилам КФ)
Шаблон: https://disk.yandex.kz/i/2GBmP7qkgscHAQ

10. Пояснительная записка к смете расходов

11. Расшифровка (расчеты) статей расходов к смете расходов

12. Не менее 3 ценовых предложений по приобретению товаров, работ и услуг / скриншотов с интернет-магазинов

13. План реализации проекта (Приложение №6 согласно Правилам КФ)
Шаблон: https://disk.yandex.kz/i/-oRyDDR9SdSSWw

14. План информационного сопровождения проекта (Приложение №7 согласно Правилам КФ)
Шаблон: https://disk.yandex.kz/i/XDK97aqfrNOd7g

15. Анкета для потенциальных пользователей (Приложение 20)
Шаблон: https://disk.yandex.kz/i/PLQcP0DBhHRwnQ

16. Перечень документов, запрашиваемых у потенциальных пользователей (НПО) благотворительности для комплаенс проверки (Приложение 21)
Шаблон: https://disk.yandex.kz/i/oKHZGhaVxpuegw

17. Визуальное предоставление проекта в виде презентации (не более 5 страниц) или видеоролика (не более 3 минут)
Шаблон/требование: https://disk.yandex.kz/i/k5zG6-hsR9Qp3w

Важно:
- Все документы и приложения к заявке должны быть с подписью и печатью заявителя.`;
  }

  return `## Қажетті құжаттар

1. Бас директор атына хат-өтініш
Үлгісі: https://disk.yandex.kz/i/29uaNvDAxxdUBA

2. Қайырымдылық көмек туралы өтініш (Қосымша №2)
Үлгісі: https://disk.yandex.kz/i/yjL8GMbizjWr9Q

3. Жарғы және барлық өзгерістер

4. Құрылтай шарты (бар болса)

5. Egov-тен заңды тұлға туралы анықтама (өтінім берген күнге дейін 10 күннен аспауы керек)

6. Қол қоюшы тұлғаның жеке куәлігі көшірмесі

7. Пайдаланушы атынан шартқа қол қою өкілеттігін растайтын құжат / бірінші басшыны тағайындау туралы шешім көшірмесі / сенімхат

8. Екінші деңгейлі банктен теңгедегі шоттың ашылғанын немесе бар екенін растайтын анықтама

9. Шығыстар сметасы (Қосымша №3)
Үлгісі: https://disk.yandex.kz/i/2GBmP7qkgscHAQ

10. Шығыстар сметасына түсіндірме жазба

11. Шығыстар сметасы баптарының расшифровкасы (есептеулері)

12. Кемінде 3 баға ұсынысы немесе интернет-дүкендерден скриншоттар

13. Жобаны іске асыру жоспары (Қосымша №6)
Үлгісі: https://disk.yandex.kz/i/-oRyDDR9SdSSWw

14. Жобаны ақпараттық сүйемелдеу жоспары (Қосымша №7)
Үлгісі: https://disk.yandex.kz/i/XDK97aqfrNOd7g

15. Әлеуетті пайдаланушыларға арналған анкета (Қосымша 20)
Үлгісі: https://disk.yandex.kz/i/PLQcP0DBhHRwnQ

16. Комплаенс тексеруге арналған құжаттар тізімі (Қосымша 21)
Үлгісі: https://disk.yandex.kz/i/oKHZGhaVxpuegw

17. Жобаны визуалды ұсыну: презентация (5 бетке дейін) немесе видеоролик (3 минутқа дейін)
Талап/үлгі: https://disk.yandex.kz/i/k5zG6-hsR9Qp3w

Маңызды:
- Өтінімге қоса берілетін барлық құжаттар мен қосымшалар өтініш берушінің қолы және мөрімен болуы керек.`;
}

async function vectorSearch(query, intent = null, limit = 8) {
  const vectors = getVectors();
  const queryEmbedding = await embedQuery(query);
  const q = normalize(query);

  let pool = vectors;

  if (intent) {
    const filtered = vectors.filter((x) => x.source.includes(intent));
    if (filtered.length) pool = filtered;
  }

  const ranked = pool
    .map((item) => {
      let score = cosine(queryEmbedding, item.embedding);

      const t = normalize(item.text);

      if ((q.includes("басшы") || q.includes("директор")) &&
          (t.includes("бас директор") || t.includes("генеральный директор"))) {
        score += 0.15;
      }

      if ((q.includes("құжат") || q.includes("документ")) &&
          (t.includes("өтінім") || t.includes("заяв") || t.includes("құжат"))) {
        score += 0.1;
      }

      if ((q.includes("байланыс") || q.includes("телефон") || q.includes("контакт")) &&
          (t.includes("телефон") || t.includes("email") || t.includes("контакт"))) {
        score += 0.1;
      }

      return {
        source: item.source,
        text: item.text,
        score
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked;
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

    if (!process.env.VOYAGE_API_KEY) {
      return res.status(500).json({ error: "VOYAGE_API_KEY жоқ" });
    }

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: "Хабарлама бос" });
    }

    const q = normalize(message);

    // exact document answer
    if (
      (q.includes("өтінім") && q.includes("құжат")) ||
      (q.includes("какие") && q.includes("документ")) ||
      (q.includes("документ") && q.includes("заяв")) ||
      (q.includes("қажет") && q.includes("құжат"))
    ) {
      return res.status(200).json({
        reply: buildDocumentAnswer(safeLang)
      });
    }

    const intent = detectIntent(q);

    let top = [];
    let vectorWorked = true;

    try {
      top = await vectorSearch(String(message).trim(), intent, 8);
      console.log(
        "VECTOR TOP:",
        top.map((x) => ({
          source: x.source,
          score: x.score,
          preview: x.text.slice(0, 140)
        }))
      );
    } catch (err) {
      vectorWorked = false;
      console.error("Vector search failed:", err.message);
    }

    // vector fallback to txt
    if (!top.length || (top[0] && top[0].score < 0.12)) {
      const knowledge = getTextKnowledge();
      let candidates = knowledge;

      if (intent) {
        const intentChunks = knowledge.filter((x) => x.source.includes(intent));
        if (intentChunks.length) candidates = intentChunks;
      }

      top = textSearch(candidates, message, 8);

      if (!top.length && candidates !== knowledge) {
        top = textSearch(knowledge, message, 8);
      }

      console.log(
        "TEXT TOP:",
        top.map((x) => ({
          source: x.source,
          score: x.score,
          preview: x.text.slice(0, 140)
        }))
      );
    }

    if (!top.length) {
      return res.status(200).json({ reply: fallback(safeLang) });
    }

    const context = top
      .map((x, i) => `[${i + 1}] SOURCE: ${x.source}\n${x.text}`)
      .join("\n\n---\n\n");

    const system =
      safeLang === "ru"
        ? `Ты официальный помощник фонда Samruk-Kazyna Trust.

Отвечай на основе контекста ниже.

ПРАВИЛА:
1. Дай точный и полезный ответ.
2. Не копируй контекст целиком.
3. Если вопрос короткий, отвечай коротко.
4. Если вопрос про документы или этапы, используй список.
5. Если есть шаблон или ссылка в контексте, покажи ее.
6. Не придумывай факты.
7. Если ответа нет даже близко, напиши дословно:
"${fallback("ru")}"

КОНТЕКСТ:
${context}`
        : `Сен Samruk-Kazyna Trust қорының ресми көмекшісісің.

Төмендегі контекстке сүйеніп жауап бер.

ЕРЕЖЕЛЕР:
1. Нақты әрі пайдалы жауап бер.
2. Контекстті сол күйі көшіріп берме.
3. Сұрақ қысқа болса, жауап та қысқа болсын.
4. Егер сұрақ құжаттар не кезеңдер туралы болса, тізім қолдан.
5. Егер контекстте үлгі не сілтеме болса, оны көрсет.
6. Ойдан факт қоспа.
7. Егер жауап тіпті табылмаса, дәл былай жаз:
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
        model: "claude-haiku-4-5",
        max_tokens: 700,
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

    return res.status(200).json({
      reply,
      debug: vectorWorked ? undefined : "vector_fallback_to_text"
    });
  } catch (err) {
    console.error("Server crash:", err);
    return res.status(500).json({
      error: "Сервер қатесі: " + err.message
    });
  }
}
