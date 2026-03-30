export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("OK");
  }

  try {
    const body = req.body;

    const message = body?.message?.text;
    const chatId = body?.message?.chat?.id;

    if (!message || !chatId) {
      return res.status(200).send("OK");
    }

    // 👉 СЕНІҢ БОТҚА СҰРАҚ ЖІБЕРЕМІЗ
    const aiRes = await fetch(process.env.APP_URL + "/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message,
        lang: "ru" // немесе auto detection жасаймыз кейін
      })
    });

    const aiData = await aiRes.json();

    const reply = aiData.reply || "Қате болды";

    // 👉 Telegram-ға жауап жіберу
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: reply
      })
    });

    return res.status(200).send("OK");

  } catch (err) {
    console.error(err);
    return res.status(200).send("OK");
  }
}
