const KNOWLEDGE_BASE = `
МҰНДА ӨЗІҢНІҢ ТОЛЫҚ БІЛІМ БАЗАҢ БОЛУЫ КЕРЕК.

Егер сенде бұрыннан үлкен база болса, соны осы жерге толық қой.
Мысалы:
- Қор туралы ақпарат
- Байланыс нөмірлері
- Өтінім беру тәртібі
- Қажетті құжаттар
- Бағдарламалар
- Жиі қойылатын сұрақтар

Маңызды:
1. Бүкіл мәтін осы backtick (\`) ішіне салынуы керек
2. Backtick-ті кездейсоқ бұзба
3. Егер мәтінде backtick болса, оны алып таста немесе жай тырнақшаға ауыстыр
`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed'
    });
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
        error: 'Сервер конфигурациясында API key жоқ'
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
2. Если информации нет в базе, отвечай дословно:
"Эта информация отсутствует в базе. Обратитесь напрямую: info@sk-trust.kz или +7 (7172) 57 68 98"
3. Отвечай только на русском языке.
4. Отвечай кратко, понятно и официально.
5. Если пользователь просит список документов, оформляй ответ списком.
6. Не придумывай факты.
7. Не ссылайся на внешние источники, если этого нет в базе.

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
5. Егер құжаттар тізімі сұралса, жауапты тізіммен бер.
6. Ойдан ештеңе қоспа.
7. Базада жоқ нәрсені бар сияқты жазба.

БІЛІМ БАЗАСЫ:
---
${KNOWLEDGE_BASE}
---`;

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
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
            content: String(message).trim()
          }
        ]
      })
    });

    const data = await anthropicResponse.json();

    console.log('Anthropic status:', anthropicResponse.status);
    console.log('Anthropic data:', JSON.stringify(data));

    if (!anthropicResponse.ok) {
      console.error('Anthropic error:', data);

      return res.status(500).json({
        error: 'AI сервисінде уақытша қате пайда болды. Қайтадан көріңіз.'
      });
    }

    const reply =
      data?.content?.find?.((item) => item.type === 'text')?.text ||
      data?.content?.[0]?.text ||
      'Жауап алынбады.';

    return res.status(200).json({
      reply
    });
  } catch (err) {
    console.error('Server crash:', err);

    return res.status(500).json({
      error: 'Сервер қатесі. Қайтадан көріңіз.'
    });
  }
}
