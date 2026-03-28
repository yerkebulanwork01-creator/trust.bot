const fs = require('fs');
const path = require('path');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { message } = JSON.parse(event.body);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'API key конфигурацияланбаған' })
      };
    }

    let knowledgeBase = '';
    try {
      const docsPath = path.join(__dirname, 'docs.txt');
      knowledgeBase = fs.readFileSync(docsPath, 'utf8');
    } catch (e) {
      knowledgeBase = 'Құжат базасы бос.';
    }

    const fullPrompt = `Сен қордың ресми ассистентісің. Тек қор құжаттарындағы ақпаратқа сүйен. Қазақша және орысша жауап бер. Ақпарат жоқ болса "Бұл туралы ақпарат базада жоқ" деп айт.

ҚҰЖАТ БАЗАСЫ:
---
${knowledgeBase}
---

Сұрақ: ${message}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024 }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini error:', JSON.stringify(data));
      return { statusCode: 500, body: JSON.stringify({ error: 'AI сервис қатесі' }) };
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Жауап алынбады.';
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply })
    };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Сервер қатесі орын алды' }) };
  }
};
