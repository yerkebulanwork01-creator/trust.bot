export async function POST(req) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== 'string') {
      return Response.json(
        { error: 'Message дұрыс берілмеген' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: 'ANTHROPIC_API_KEY табылмады' },
        { status: 500 }
      );
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
      return Response.json(
        {
          error: d?.error?.message || 'Anthropic сұрауы сәтсіз аяқталды',
          details: d
        },
        { status: r.status }
      );
    }

    return Response.json({
      reply: d?.content?.[0]?.text || 'Жауап жоқ'
    });
  } catch (error) {
    return Response.json(
      {
        error: 'Server error',
        details: error?.message || 'Белгісіз қате'
      },
      { status: 500 }
    );
  }
}
