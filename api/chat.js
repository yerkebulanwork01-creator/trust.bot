module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message } = req.body || {};

    if (!message) {
      return res.status(400).json({ error: 'No message' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'No API key' });
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
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: message
          }
        ]
      })
    });

    const d = await r.json();

    return res.status(200).json({
      reply: d?.content?.[0]?.text || 'No reply'
    });

  } catch (e) {
    return res.status(500).json({
      error: e.message
    });
  }
};
