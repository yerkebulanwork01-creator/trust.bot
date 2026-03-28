export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { message } = req.body;
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'API key конфигурацияланбаған' });

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'Сен қордың ресми ассистентісің. Қазақша және орысша жауап бер. Ақпарат жоқ болса "Бұл туралы ақпарат базада жоқ" деп айт.' },
          { role: 'user', content: message }
        ],
        temperature: 0.3,
        max_tokens: 1024
      })
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'Жауап алынбады.';
    res.status(200).json({ reply });
  } catch (err) {
    res.status(500).json({ error: 'Сервер қатесі' });
  }
}
