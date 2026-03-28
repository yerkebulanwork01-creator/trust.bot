const fs = require('fs');
const path = require('path');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { message } = JSON.parse(event.body);
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'API key конфигурацияланбаған' }) };
    }
    let knowledgeBase = '';
    try {
      knowledgeBase = fs.readFileSync(path.join(__dirname, 'docs.txt'), 'utf8');
    } catch (e) {
      knowledgeBase = 'Құжат базасы бос.';
    }
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: `Сен қордың ресми ассистентісің. Тек қор құжаттарындағы ақпаратқа сүйен. Қазақша және орысша жауап бер. Ақпарат жоқ болса "Бұл туралы ақпарат базада жоқ, қор менеджерімен байланысыңыз" деп айт.\n\nҚҰЖАТ БАЗАСЫ:\n---\n${knowledgeBase}\n---` },
          { role: 'user', content: message }
        ],
        temperature: 0.3,
        max_tokens: 1024
      })
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('Groq error:', JSON.stringify(data));
      return { statusCode: 500, body: JSON.stringify({ error: 'AI сервис қатесі' }) };
    }
    const reply = data.choices?.[0]?.message?.content || 'Жауап алынбады.';
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reply }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Сервер қатесі орын алды' }) };
  }
};
