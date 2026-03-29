import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "knowledge_files");
const OUTPUT_FILE = path.join(process.cwd(), "vectors.json");

function chunkText(text, size = 800, overlap = 150) {
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function embedTexts(texts) {
  const response = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.VOYAGE_API_KEY}`
    },
    body: JSON.stringify({
      input: texts,
      model: "voyage-3-lite",
      input_type: "document"
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.detail || data?.message || JSON.stringify(data));
  }

  return data.data.map(item => item.embedding);
}

async function main() {
  if (!process.env.VOYAGE_API_KEY) {
    throw new Error("VOYAGE_API_KEY жоқ");
  }

  if (!fs.existsSync(DATA_DIR)) {
    throw new Error("knowledge_files папкасы табылмады");
  }

  let rows = [];
  if (fs.existsSync(OUTPUT_FILE)) {
    rows = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf-8"));
    console.log(`Бұрынғы vectors loaded: ${rows.length}`);
  }

  const doneSet = new Set(rows.map(r => `${r.source}:::${r.text}`));

  const files = fs.readdirSync(DATA_DIR).filter((file) => {
    const full = path.join(DATA_DIR, file);
    return fs.statSync(full).isFile() && file.endsWith(".txt");
  });

  for (const file of files) {
    const full = path.join(DATA_DIR, file);
    const text = fs.readFileSync(full, "utf-8");
    const chunks = chunkText(text);

    console.log(`Файл: ${file}, chunk саны: ${chunks.length}`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const key = `${file}:::${chunk}`;

      if (doneSet.has(key)) {
        console.log(`  ↷ skip ${i + 1}/${chunks.length}`);
        continue;
      }

      try {
        const embeddings = await embedTexts([chunk]);

        rows.push({
          source: file,
          text: chunk,
          embedding: embeddings[0]
        });

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(rows));
        doneSet.add(key);

        console.log(`  ✔ ${i + 1}/${chunks.length}`);
        await sleep(22000);
      } catch (err) {
        console.error(`  ✖ ${file} chunk ${i + 1}: ${err.message}`);
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(rows));
        throw err;
      }
    }
  }

  console.log(`DONE: ${OUTPUT_FILE}`);
  console.log(`Жалпы vector саны: ${rows.length}`);
}

main().catch((err) => {
  console.error("BUILD ERROR:", err.message);
  process.exit(1);
});
