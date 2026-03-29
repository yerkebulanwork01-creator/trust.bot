const KNOWLEDGE_BASE = `... сенің базаң осы жерде ...`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, lang } = req.body || {};
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY орнатылмаған' });
    }

    const isRu = lang === 'ru';

    const system = isRu
      ? `Ты официальный ассистент Корпоративного фонда «Samruk-Kazyna Trust».
СТРОГИЕ ПРАВИЛА:
1. Отвечай ТОЛЬКО на основе БАЗЫ ЗНАНИЙ ниже.
2. Если информации нет в базе: "Эта информация отсутствует в базе. Обратитесь напрямую: info@sk-trust.kz или +7(7172)57-68-98"
3. Отвечай только на русском языке.

БАЗА ЗНАНИЙ:
---
${KNOWLEDGE_BASE}
---`
      : `Сен «Samruk-Kazyna Trust» корпоративтік қорының ресми ассистентісің.
ҚАТАҢ ЕРЕЖЕЛЕР:
1. ТЕК төмендегі БАЗАДАҒЫ ақпаратқа сүйен.
2. Базада жоқ болса: "Бұл ақпарат базада жоқ. Тікелей хабарласыңыз: info@sk-trust.kz немесе +7(7172)57-68-98"
3. ТЕК қазақ тілінде жауап бер.

АҚПАРАТ БАЗАСЫ:
---
${KNOWLEDGE_BASE}
---`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-latest',
        max_tokens: 1500,
        system,
        messages: [{ role: 'user', content: message || '' }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic error:', data);
      return res.status(500).json({
        error: data?.error?.message || 'AI сервис қатесі'
      });
    }

    const reply = data?.content?.[0]?.text || 'Жауап алынбады.';
    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Сервер қатесі: ' + err.message });
  }
}
