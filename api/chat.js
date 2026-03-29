const KNOWLEDGE_BASE = `
МҰНДА ӨЗІҢНІҢ ТОЛЫҚ БІЛІМ БАЗАҢ БОЛУЫ КЕРЕК.
`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, lang } = req.body || {};
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY жоқ' });
    }

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Хабарлама бос болмауы керек' });
    }

    const isRu = lang === 'ru';

    const system = isRu
      ? `Ты официальный ассистент Корпоративного фонда «Samruk-Kazyna Trust».

СТРОГИЕ ПРАВИЛА:
1. Отвечай ТОЛЬКО на основе БАЗЫ ЗНАНИЙ ниже.
2. Если информации нет в базе, отвечай дословно:
"Эта информация отсутствует в базе. Обратитесь напрямую: info@sk-trust.kz или +7 (7172) 57 68 98"
3. Отвечай только на русском языке.
4. Отвечай кратко, понятно и официально.
5. Не придумывай факты.

БАЗА ЗНАНИЙ:
---
${KNOWLEDGE_BASE}
---`
      : `Сен «Samruk-Kazyna Trust» корпоративтік қорының ресми ассистентісің.

ҚАТАҢ ЕРЕЖЕЛЕР:
1. ТЕК төмендегі білім базасына сүйеніп жауап бер.
2. Егер ақпарат базада жоқ болса, дәл былай жауап бер:
"Бұл ақпарат базада жоқ. Тікелей хабарласыңыз: info@sk-trust.kz немесе +7 (7172) 57 68 98"
3. ТЕК қазақ тілінде жауап бер.
4. Жауап қысқа, түсінікті және ресми болсын.
5. Ойдан ештеңе қоспа.

БІЛІМ БАЗАСЫ:
---
${KNOWLEDGE_BASE}
---`;

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        system,
        messages: [
          {
            role: 'user',
            content: String(message).trim()
          }
        ]
      })
    });

    const data = await anthropicResponse.json();

    if (!anthropicResponse.ok) {
      console.error('Anthropic error:', data);
      return res.status(500).json({
        error: data?.error?.message || 'AI сервисінде уақытша қате пайда болды. Қайталап көріңіз.'
      });
    }

    const reply =
      data?.content?.find?.((item) => item.type === 'text')?.text ||
      data?.content?.[0]?.text ||
      'Жауап алынбады.';

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Server crash:', err);
    return res.status(500).json({
      error: 'Сервер қатесі: ' + err.message
    });
  }
}
