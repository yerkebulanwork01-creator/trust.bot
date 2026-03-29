export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: 'ANTHROPIC_API_KEY жоқ'
      });
    }

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: 'Hello'
          }
        ]
      })
    });

    const data = await anthropicResponse.json();

    if (!anthropicResponse.ok) {
      return res.status(500).json({
        error: JSON.stringify(data)
      });
    }

    return res.status(200).json({
      reply:
        data?.content?.find?.((item) => item.type === 'text')?.text ||
        data?.content?.[0]?.text ||
        'OK, бірақ reply бос'
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
}
