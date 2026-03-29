export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { message, lang } = req.body || {};
    const apiKey = process.env.ANTHROPIC_API_KEY;

    console.log('API route hit');
    console.log('Has API key:', !!apiKey);
    console.log('Lang:', lang);
    console.log('Message length:', message?.length || 0);

    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY missing');
      return res.status(500).json({ error: 'API key конфигурацияланбаған' });
    }

    const isRu = lang === 'ru';

    const system = isRu
      ? `...`
      : `...`;

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
    console.log('Anthropic status:', response.status);
    console.log('Anthropic data:', JSON.stringify(data));

    if (!response.ok) {
      return res.status(500).json({
        error: data?.error?.message || 'AI сервис қатесі'
      });
    }

    return res.status(200).json({
      reply: data?.content?.[0]?.text || 'Жауап алынбады.'
    });
  } catch (err) {
    console.error('Server crash:', err);
    return res.status(500).json({ error: 'Сервер қатесі: ' + err.message });
  }
}
