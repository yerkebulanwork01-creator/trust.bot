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

  if (!Array.isArray(data?.data)) {
    throw new Error("Voyage embedding response қате");
  }

  return data.data.map((item) => item.embedding);
}

async function main() {
  if (!process.env.VOYAGE_API_KEY) {
    throw new Error("VOYAGE_API_KEY жоқ");
  }

  if (!fs.existsSync(DATA_DIR)) {
    throw new Error("knowledge_files папкасы табылмады");
  }

  const files = fs.readdirSync(DATA_DIR).filter((file) => {
    const full = path.join(DATA_DIR, file);
    return fs.statSync(full).isFile() && file.endsWith(".txt");
  });

  if (!files.length) {
    throw new Error("knowledge_files ішінде .txt файл жоқ");
  }

  const rows = [];

  for (const file of files) {
    const full = path.join(DATA_DIR, file);
    const text = fs.readFileSync(full, "utf-8");
    const chunks = chunkText(text);

    console.log(`Файл: ${file}, chunk саны: ${chunks.length}`);

    const batchSize = 10;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const embeddings = await embedTexts(batch);

      for (let j = 0; j < batch.length; j++) {
        rows.push({
          source: file,
          text: batch[j],
          embedding: embeddings[j]
        });
      }

      console.log(`  → ${Math.min(i + batchSize, chunks.length)}/${chunks.length}`);
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(rows));
  console.log(`DONE: ${OUTPUT_FILE}`);
  console.log(`Жалпы vector саны: ${rows.length}`);
}

main().catch((err) => {
  console.error("BUILD ERROR:", err.message);
  process.exit(1);
});
