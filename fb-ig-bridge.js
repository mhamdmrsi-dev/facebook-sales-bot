import express from 'express';
import axios from 'axios';

const app = express();
app.use(express.json());

// ✅ الإعدادات
const FACEBOOK_TOKEN = "EAAZAIZCWAtHGUBSAljRWVsnz0lTdgdu9PYlzXC6ZAZBpG4elRlw4aj5iK0ycEeQpmNiv5KKMSyC8mB5rBOqVxsadtupstokkkvCs7kiWqf7YP83NRk0SZAf3G2dPDfiBaUZCHfUgNiolZAXh1lsk2PsHnYO1SdClDnq3IFosw5ABjZCxCiIY7TYXF8m2GWtVZCN2tJnLPqAZDZD";
const VERIFY_TOKEN = "VERIFY_TOKEN_123";
const GROQ_API_KEY = "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";

const NAMES = ["رنا", "ساره", "يمني", "ولاء", "هدير", "مني"];
let currentNameIndex = 0;

// ✅ التحقق من Facebook
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verified');
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Unauthorized');
  }
});

// ✅ استقبال الرسايل من Facebook
app.post('/webhook', async (req, res) => {
  try {
    const entries = req.body.entry;

    for (const entry of entries) {
      for (const messaging of entry.messaging) {
        if (messaging.message && messaging.message.text) {
          const senderId = messaging.sender.id;
          const messageText = messaging.message.text;

          console.log(`📩 رسالة من ${senderId}: ${messageText}`);

          // ✅ احصل على رد من Groq
          const botName = NAMES[currentNameIndex];
          const response = await getGroqResponse(messageText, botName);

          // ✅ أرسل الرد على Facebook
          await sendFacebookMessage(senderId, response);
        }
      }
    }

    res.status(200).send({ status: 'ok' });
  } catch (error) {
    console.error('❌ خطأ:', error.message);
    res.status(200).send({ status: 'ok' });
  }
});

// ✅ احصل على رد من Groq
async function getGroqResponse(messageText, botName) {
  try {
    const systemPrompt = `أنتِ موظفة مبيعات مصرية احترافية وودية باسم ${botName}. ردي على العملاء بالعامية المصرية فقط. كوني لطيفة ومحترمة وخدومة.`;

    console.log(`🤖 البوت: ${botName} - الرسالة: ${messageText}`);

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'mixtral-8x7b-32768',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: messageText }
        ],
        max_tokens: 300,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const reply = response.data.choices[0].message.content;
    console.log(`✅ رد Groq: ${reply}`);
    return reply;
  } catch (error) {
    console.error('❌ خطأ في Groq:', error.response?.status, error.response?.data?.error || error.message);
    return `مرحبا! أنا ${botName} 😊 شنو أخبارك؟ اسأل عن أي حاجة تحتاجها!`;
  }
}

// ✅ أرسل رسالة على Facebook
async function sendFacebookMessage(recipientId, messageText) {
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/me/messages`,
      {
        recipient: { id: recipientId },
        message: { text: messageText },
        access_token: FACEBOOK_TOKEN
      }
    );

    console.log(`✅ تم إرسال الرسالة إلى ${recipientId}`);
  } catch (error) {
    console.error('❌ خطأ في إرسال الرسالة:', error.response?.data || error.message);
  }
}

// ✅ غيّر اسم البوت كل 8 ساعات
setInterval(() => {
  currentNameIndex = (currentNameIndex + 1) % NAMES.length;
  console.log(`✨ تم تغيير اسم البوت إلى: ${NAMES[currentNameIndex]}`);
}, 8 * 60 * 60 * 1000);

// ✅ شغّل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 السيرفر يعمل على http://localhost:${PORT}`);
});

export default app;
