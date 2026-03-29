export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message } = req.body || {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Message дұрыс берілмеген'
      });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: 'ANTHROPIC_API_KEY табылмады'
      });
    }

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-latest',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: message
          }
        ]
      })
    });

    const d = await r.json();

    if (!r.ok) {
      return res.status(r.status).json({
        error: d?.error?.message || 'Anthropic сұрауы сәтсіз аяқталды',
        details: d
      });
    }

    return res.status(200).json({
      reply: d?.content?.[0]?.text || 'Жауап жоқ'
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Server error',
      details: error?.message || 'Белгісіз қате'
    });
  }
}
