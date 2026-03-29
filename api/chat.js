const KNOWLEDGE_BASE = `
================================================================
SAMRUK-KAZYNA TRUST — ТОЛЫҚ АҚПАРАТ БАЗАСЫ
================================================================

[1] ҚОР ТУРАЛЫ
Атауы: Корпоративный фонд «Samruk-Kazyna Trust»
Қазақша: «Samruk-Kazyna Trust» Корпоративтік Қоры
Құрылған жылы: 2016 жылғы қаңтар
Құрылтайшы: АО «Самрук-Қазына»
Мақсаты: АО «Самрук-Қазына» тобының бірыңғай қайырымдылық операторы

Миссия:
Қазақстан халқының әлеуметтік-экономикалық жағдайын жақсартуға
және Қазақстан Республикасының өркендеуіне ықпал ету.

Негізгі нәтижелер:
- 400+ жоба
- 4 500 000+ бенефициар
- 500 000+ адам жыл сайын қолдау алады
- 18 қызметкер

Жұмыс бағыттары:
- білім беру
- денсаулық сақтау
- бұқаралық спорт
- мәдениет
- инклюзия
- әлеуметтік кәсіпкерлік
- өңірлік бағдарламалар

[2] БАЙЛАНЫС
Сайт: www.sk-trust.kz
Email: info@sk-trust.kz
Телефон: +7 (7172) 57 68 98
Сенім телефоны: +7 (7172) 57 69 37 / 57 64 97 / 57 66 02
Мекенжай: Астана қ., Сығанақ к-сі, 17/10, 11-қабат

[3] ӨТІНІМ БЕРУ
Кім бере алады:
- тек тіркелген ҮЕҰ/НКО
- кемінде 1 жыл жұмыс тәжірибесі
- тек қазақстандық ұйымдар
- жеке тұлғалар ЖОҚ
- шетелдік ҮЕҰ ЖОҚ
- коммерциялық ұйымдар ЖОҚ

Тәсілдері:
1. Онлайн — www.sk-trust.kz
2. Email — info@sk-trust.kz
3. Пошта арқылы
4. Кеңсеге жеке апару
Мессенджер арқылы — ЖОҚ

Қарастыру мерзімі:
- 10–15 жұмыс күні
- әрі қарай Қамқоршылық кеңес шешімі

[4] ҚАЖЕТТІ ҚҰЖАТТАР
1. Бас директор атына хат-өтініш
2. Қайырымдылық көмек туралы өтініш (Қосымша №2)
3. Жарғы және өзгерістер
4. Құрылтай шарты (бар болса)
5. Egov анықтамасы (10 күннен аспаған)
6. Қол қоюшының жеке куәлігі
7. Өкілеттілікті растайтын құжат
8. Банктік шот анықтамасы
9. Шығыстар сметасы (Қосымша №3)
10. Сметаға түсіндірме жазба
11. Смета баптарының есептеулері
12. Кемінде 3 баға ұсынысы
13. Жобаны іске асыру жоспары
14. Ақпараттық сүйемелдеу жоспары
15. НПО анкетасы
16. Комплаенс құжаттары
17. Жобаның презентациясы немесе видеосы

[5] БАСШЫЛЫҚ
Бас директор: Альфия Даулеткалиевна Адиева
Бас директор орынбасары: Аман Жақсыбайұлы Түрегелдин
Бас бухгалтер: Айгүл Темірханқызы Джусупова

[6] ҚҰЖАТТАРҒА СІЛТЕМЕЛЕР
Жалпы құжаттар бөлімі:
https://sk-trust.kz/documents

Категориялар:
- Закупки: https://sk-trust.kz/documents?category=procurement
- Публичный годовой отчет: https://sk-trust.kz/documents?category=public-annual-report
- Корпоративные документы: https://sk-trust.kz/documents?category=corporate-documents
- Архив: https://sk-trust.kz/documents?category=archive
- Отчеты: https://sk-trust.kz/documents?category=reports
`;

function normalizeText(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[^a-zа-яёәіңғүұқөһ0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getDocLinks(lang) {
  if (lang === 'ru') {
    return `
<div class="doc-links">
  <div class="doc-card">
    <div class="doc-title">Документы фонда</div>
    <div class="doc-desc">Ниже доступны быстрые ссылки на основные разделы документов фонда.</div>
    <a class="doc-btn" href="https://sk-trust.kz/documents" target="_blank" rel="noopener noreferrer">Открыть все документы</a>
  </div>

  <div class="doc-grid">
    <a class="doc-item" href="https://sk-trust.kz/documents?category=procurement" target="_blank" rel="noopener noreferrer">
      <span class="doc-name">Закупки</span>
      <span class="doc-open">Открыть</span>
    </a>

    <a class="doc-item" href="https://sk-trust.kz/documents?category=public-annual-report" target="_blank" rel="noopener noreferrer">
      <span class="doc-name">Публичный годовой отчет</span>
      <span class="doc-open">Открыть</span>
    </a>

    <a class="doc-item" href="https://sk-trust.kz/documents?category=corporate-documents" target="_blank" rel="noopener noreferrer">
      <span class="doc-name">Корпоративные документы</span>
      <span class="doc-open">Открыть</span>
    </a>

    <a class="doc-item" href="https://sk-trust.kz/documents?category=archive" target="_blank" rel="noopener noreferrer">
      <span class="doc-name">Архив</span>
      <span class="doc-open">Открыть</span>
    </a>

    <a class="doc-item" href="https://sk-trust.kz/documents?category=reports" target="_blank" rel="noopener noreferrer">
      <span class="doc-name">Отчеты</span>
      <span class="doc-open">Открыть</span>
    </a>
  </div>
</div>`;
  }

  return `
<div class="doc-links">
  <div class="doc-card">
    <div class="doc-title">Қор құжаттары</div>
    <div class="doc-desc">Төменде қор құжаттарының негізгі бөлімдеріне жылдам сілтемелер берілген.</div>
    <a class="doc-btn" href="https://sk-trust.kz/documents" target="_blank" rel="noopener noreferrer">Барлық құжаттарды ашу</a>
  </div>

  <div class="doc-grid">
    <a class="doc-item" href="https://sk-trust.kz/documents?category=procurement" target="_blank" rel="noopener noreferrer">
      <span class="doc-name">Сатып алулар</span>
      <span class="doc-open">Ашу</span>
    </a>

    <a class="doc-item" href="https://sk-trust.kz/documents?category=public-annual-report" target="_blank" rel="noopener noreferrer">
      <span class="doc-name">Жария жылдық есеп</span>
      <span class="doc-open">Ашу</span>
    </a>

    <a class="doc-item" href="https://sk-trust.kz/documents?category=corporate-documents" target="_blank" rel="noopener noreferrer">
      <span class="doc-name">Корпоративтік құжаттар</span>
      <span class="doc-open">Ашу</span>
    </a>

    <a class="doc-item" href="https://sk-trust.kz/documents?category=archive" target="_blank" rel="noopener noreferrer">
      <span class="doc-name">Архив</span>
      <span class="doc-open">Ашу</span>
    </a>

    <a class="doc-item" href="https://sk-trust.kz/documents?category=reports" target="_blank" rel="noopener noreferrer">
      <span class="doc-name">Есептер</span>
      <span class="doc-open">Ашу</span>
    </a>
  </div>
</div>`;
}

function directAnswer(message, lang) {
  const q = normalizeText(message);
  const isRu = lang === 'ru';

  const kk = {
    about: `## Қор туралы

**Samruk-Kazyna Trust** — 2016 жылғы қаңтарда құрылған корпоративтік қор.  
Құрылтайшысы — **«Самұрық-Қазына» АҚ**.

**Негізгі мәліметтер:**
- 400-ден астам жоба жүзеге асырылған
- 4 500 000-нан астам бенефициар
- Жыл сайын 500 000-нан астам адам қолдау алады
- Қорда 18 қызметкер бар

**Негізгі бағыттары:**
- білім беру
- денсаулық сақтау
- спорт
- мәдениет
- инклюзия
- әлеуметтік кәсіпкерлік
- өңірлік бағдарламалар`,

    apply: `## Өтінім беру тәртібі

**Өтінім бере алады:**
- тек тіркелген ҮЕҰ/НКО
- кемінде 1 жыл жұмыс тәжірибесі бар ұйымдар
- тек қазақстандық ұйымдар

**Өтінім беру тәсілдері:**
1. Онлайн — www.sk-trust.kz
2. Email — info@sk-trust.kz
3. Пошта арқылы
4. Кеңсеге жеке апару

**Маңызды:**
- жеке тұлғалар өтінім бере алмайды
- мессенджер арқылы қабылданбайды

**Қарастыру мерзімі:**
- 10–15 жұмыс күні
- кейін Қамқоршылық кеңестің шешімі қажет`,

    docs: `## Қажетті құжаттар

**Міндетті құжаттар:**
1. Бас директор атына хат-өтініш
2. Қайырымдылық көмек туралы өтініш
3. Жарғы және барлық өзгерістер
4. Құрылтай шарты (бар болса)
5. Egov анықтамасы
6. Қол қоюшының жеке куәлігі
7. Өкілеттілікті растайтын құжат
8. Банктік шот анықтамасы
9. Шығыстар сметасы
10. Сметаға түсіндірме жазба
11. Есептеулер
12. Кемінде 3 баға ұсынысы
13. Іске асыру жоспары
14. Ақпараттық сүйемелдеу жоспары
15. НПО анкетасы
16. Комплаенс құжаттары
17. Презентация немесе видео

## Құжат сілтемелері
${getDocLinks('kk')}`,

    contacts: `## Байланыс

- Сайт: www.sk-trust.kz
- Email: info@sk-trust.kz
- Телефон: +7 (7172) 57 68 98
- Сенім телефоны: +7 (7172) 57 69 37 / 57 64 97 / 57 66 02
- Мекенжай: Астана қ., Сығанақ к-сі, 17/10, 11-қабат`,

    management: `## Басшылық

- Бас директор: Альфия Даулеткалиевна Адиева
- Бас директор орынбасары: Аман Жақсыбайұлы Түрегелдин
- Бас бухгалтер: Айгүл Темірханқызы Джусупова`,

    docsOnly: `## Қор құжаттарына сілтемелер

${getDocLinks('kk')}`
  };

  const ru = {
    about: `## О фонде

**Samruk-Kazyna Trust** — корпоративный фонд, созданный в январе 2016 года.  
Учредитель — **АО «Самрук-Казына»**.

**Основные данные:**
- реализовано более 400 проектов
- более 4 500 000 бенефициаров
- ежегодно поддержку получают более 500 000 человек
- в фонде 18 сотрудников

**Основные направления:**
- образование
- здравоохранение
- спорт
- культура
- инклюзия
- социальное предпринимательство
- региональные программы`,

    apply: `## Подача заявки

**Кто может подать:**
- только зарегистрированные НПО
- организации с опытом работы не менее 1 года
- только казахстанские организации

**Способы подачи:**
1. Онлайн — www.sk-trust.kz
2. Email — info@sk-trust.kz
3. Почтой
4. Лично в офисе

**Важно:**
- физические лица не могут подать заявку
- через мессенджеры заявки не принимаются

**Срок рассмотрения:**
- 10–15 рабочих дней
- далее решение Попечительского совета`,

    docs: `## Необходимые документы

**Обязательные документы:**
1. Письмо-обращение на имя Генерального директора
2. Обращение об оказании благотворительной помощи
3. Устав и изменения
4. Учредительный договор (при наличии)
5. Справка с Egov
6. Удостоверение личности подписанта
7. Документ о полномочиях
8. Справка о банковском счёте
9. Смета расходов
10. Пояснительная записка к смете
11. Расчёты по статьям сметы
12. Не менее 3 ценовых предложений
13. План реализации проекта
14. План информационного сопровождения
15. Анкета НПО
16. Документы для комплаенс-проверки
17. Презентация или видео проекта

## Ссылки на документы
${getDocLinks('ru')}`,

    contacts: `## Контакты

- Сайт: www.sk-trust.kz
- Email: info@sk-trust.kz
- Телефон: +7 (7172) 57 68 98
- Горячая линия: +7 (7172) 57 69 37 / 57 64 97 / 57 66 02
- Адрес: г. Астана, ул. Сыганак, 17/10, 11 этаж`,

    management: `## Руководство

- Генеральный директор: Альфия Даулеткалиевна Адиева
- Заместитель генерального директора: Аман Жақсыбайұлы Түрегелдин
- Главный бухгалтер: Айгүл Темірханқызы Джусупова`,

    docsOnly: `## Ссылки на документы фонда

${getDocLinks('ru')}`
  };

  const t = isRu ? ru : kk;

  if ((q.includes('қор') && q.includes('туралы')) || (q.includes('о') && q.includes('фонде'))) return t.about;
  if (q.includes('өтінім') || q.includes('заявк')) return t.apply;
  if (q.includes('қажетті') && q.includes('құжат')) return t.docs;
  if (q.includes('құжат') || q.includes('документ')) return t.docsOnly;
  if (q.includes('байланыс') || q.includes('контакт')) return t.contacts;
  if (q.includes('басшылық') || q.includes('руковод')) return t.management;

  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, lang } = req.body || {};
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY жоқ' });
    }

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Хабарлама бос болмауы керек' });
    }

    const fast = directAnswer(message, lang);
    if (fast) {
      return res.status(200).json({ reply: fast });
    }

    const isRu = lang === 'ru';

    const system = isRu
      ? `Ты официальный ассистент Корпоративного фонда «Samruk-Kazyna Trust».
Отвечай ТОЛЬКО по базе знаний ниже.
Если информации нет, отвечай дословно:
"Эта информация отсутствует в базе. Обратитесь напрямую: info@sk-trust.kz или +7 (7172) 57 68 98"
Отвечай только на русском языке.
Если пользователь просит документы или ссылки на документы, обязательно дай ссылки из базы.`
      : `Сен «Samruk-Kazyna Trust» корпоративтік қорының ресми ассистентісің.
ТЕК төмендегі база бойынша жауап бер.
Егер ақпарат жоқ болса, дәл былай жаз:
"Бұл ақпарат базада жоқ. Тікелей хабарласыңыз: info@sk-trust.kz немесе +7 (7172) 57 68 98"
ТЕК қазақ тілінде жауап бер.
Егер пайдаланушы құжаттар не құжат сілтемелерін сұраса, міндетті түрде базадағы сілтемелерді бер.`;

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        system: `${system}

БІЛІМ БАЗАСЫ / БАЗА ЗНАНИЙ:
${KNOWLEDGE_BASE}`,
        messages: [
          {
            role: 'user',
            content: String(message).trim()
          }
        ]
      })
    });

    const data = await anthropicResponse.json();

    if (!anthropicResponse.ok) {
      console.error('Anthropic error:', data);
      return res.status(500).json({
        error: data?.error?.message || 'AI сервис қатесі'
      });
    }

    const reply =
      data?.content?.find?.((item) => item.type === 'text')?.text ||
      data?.content?.[0]?.text ||
      (lang === 'ru' ? 'Ответ не получен.' : 'Жауап алынбады.');

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Server crash:', err);
    return res.status(500).json({
      error: 'Сервер қатесі: ' + err.message
    });
  }
}
