import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { message } = req.body;
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'API key конфигурацияланбаған' });

    let knowledgeBase = 'Құжат базасы бос.';
    try {
      knowledgeBase = readFileSync(join(__dirname, 'docs.txt'), 'utf8');
    } catch (e) {
      console.error('docs.txt оқылмады:', e.message);
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: `Сен «Samruk-Kazyna Trust» қорының ресми ассистентісің.
ҚАТАҢ ЕРЕЖЕЛЕР:
1. ТЕК төмендегі ҚҰЖАТ БАЗАСЫНДАҒЫ ақпаратқа сүйен.
2. Базада жоқ ақпаратты ЕШҚАШАН ойдан шығарма.
3. Базада жоқ болса: "Бұл туралы ақпарат базада жоқ. Қорға хабарласыңыз: info@sk-trust.kz немесе +7 (7172) 57 68 98" деп айт.
4. Қазақша сұраққа қазақша, орысша сұраққа орысша жауап бер.
5. Нақты қысқа жауап бер.

ҚҰЖАТ БАЗАСЫ:
---
${knowledgeBase}
---`
          },
          { role: 'user', content: message }
        ],
        temperature: 0.1,
        max_tokens: 1024
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Groq error:', JSON.stringify(data));
      return res.status(500).json({ error: 'AI сервис қатесі' });
    }
    const reply = data.choices?.[0]?.message?.content || 'Жауап алынбады.';
    res.status(200).json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Сервер қатесі: ' + err.message });
  }
}
