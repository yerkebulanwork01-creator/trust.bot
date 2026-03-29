const KNOWLEDGE_BASE = `
МҰНДА ӨЗІҢНІҢ ТОЛЫҚ БІЛІМ БАЗАҢ ТҰРУЫ КЕРЕК.

Маңызды:
1) Егер сенде бұрыннан үлкен KNOWLEDGE_BASE бар болса, соны осы жерге қой.
2) Тырнақшаны (\`) бұзба.
3) Барлық мәтін осы шаблонның ішінде болсын.
`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, lang } = req.body || {};
    const apiKey = process.env.ANTHROPIC_API_KEY;

    console.log('API route hit');
    console.log('Has API key:', !!apiKey);
    console.log('Lang:', lang);
    console.log('Message length:', message?.length || 0);

    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY missing');
      return res.status(500).json({
        error: 'ANTHROPIC_API_KEY орнатылмаған'
      });
    }

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        error: 'Хабарлама бос болмауы керек'
      });
    }

    const isRu = lang === 'ru';

    const system = isRu
      ? `Ты официальный ассистент Корпоративного фонда «Samruk-Kazyna Trust».

СТРОГИЕ ПРАВИЛА:
1. Отвечай ТОЛЬКО на основе БАЗЫ ЗНАНИЙ ниже.
2. Если информации нет в базе, отвечай:
"Эта информация отсутствует в базе. Обратитесь напрямую: info@sk-trust.kz или +7 (7172) 57 68 98"
3. Отвечай только на русском языке.
4. Отвечай кратко, понятно и официально.
5. Если просят список документов, оформляй ответ списком.

БАЗА ЗНАНИЙ:
---
${KNOWLEDGE_BASE}
---`
      : `Сен «Samruk-Kazyna Trust» корпоративтік қорының ресми ассистентісің.

ҚАТАҢ ЕРЕЖЕЛЕР:
1. ТЕК төмендегі білім базасына сүйеніп жауап бер.
2. Егер ақпарат базада жоқ болса, былай жауап бер:
"Бұл ақпарат базада жоқ. Тікелей хабарласыңыз: info@sk-trust.kz немесе +7 (7172) 57 68 98"
3. ТЕК қазақ тілінде жауап бер.
4. Жауап қысқа, түсінікті және ресми болсын.
5. Егер құжаттар тізімі сұралса, тізіммен бер.

БІЛІМ БАЗАСЫ:
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
        model: 'claude-3-haiku-20240307',
        max_tokens: 1200,
        system,
        messages: [
          {
            role: 'user',
            content: String(message)
          }
        ]
      })
    });

    const data = await response.json();

    console.log('Anthropic status:', response.status);
    console.log('Anthropic data:', JSON.stringify(data));

    if (!response.ok) {
      return res.status(500).json({
        error: data?.error?.message || 'AI сервис қатесі'
      });
    }

    const reply =
      data?.content?.find?.(item => item.type === 'text')?.text ||
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
