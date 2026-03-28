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

    // Load knowledge base
    let knowledgeBase = '';
    try {
      const docsPath = path.join(__dirname, 'docs.txt');
      knowledgeBase = fs.readFileSync(docsPath, 'utf8');
    } catch (e) {
      knowledgeBase = 'Құжат базасы бос.';
    }

    const systemPrompt = `Сен қордың ресми ассистентісің. Сенің міндетің — қордың құжаттары мен ережелері негізінде нақты, анық жауап беру.

ЕРЕЖЕЛЕР:
- Тек қор құжаттарындағы ақпаратқа сүйен
- Қазақша және орысша сұрақтарға жауап бер
- Егер жауап тапсаң — нақты айт, дерек кез-де ескерт
- Егер ақпарат жоқ болса — "Бұл туралы ақпарат базада жоқ, қор менеджерімен байланысыңыз" деп айт
- Жауаптарды қысқа және нақты жаз
- Кәсіби, сыпайы тонда жазылуын сақта

ҚОРДЫҢ ҚҰЖАТ БАЗАСЫ:
---
${knowledgeBase}
---`;

    const response = await fetch(
`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: message }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024,
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini error:', data);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'AI сервис қатесі' })
      };
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Жауап алынбады.';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply })
    };

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Сервер қатесі орын алды' })
    };
  }
};
