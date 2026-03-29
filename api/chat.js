const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { message } = req.body;
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'API key конфигурацияланбаған' });
    }

    let knowledgeBase = '';
    try {
      const docsPath = path.join(process.cwd(), 'docs.txt');
      knowledgeBase = fs.readFileSync(docsPath, 'utf8');
    } catch (e) {
      knowledgeBase = 'Құжат базасы бос.';
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: `Сен «Samruk-Kazyna Trust» қорының ресми ассистентісің. Тек қор құжаттарындағы ақпаратқа сүйен. Қазақша және орысша жауап бер. Ақпарат жоқ болса "Бұл туралы ақпарат базада жоқ, қор менеджерімен байланысыңыз: info@sk-trust.kz" деп айт.\n\nҚҰЖАТ БАЗАСЫ:\n---\n${knowledgeBase}\n---`
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.3,
        max_tokens: 1024
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Groq error:', JSON.stringify(data));
      return res.status(500).json({ error: 'AI сервис қатесі' });
    }

    const reply = data.choices?.[0]?.message?.content || 'Жауап алынбады.';
    return res.status(200).json({ reply });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Сервер қатесі орын алды' });
  }
};
