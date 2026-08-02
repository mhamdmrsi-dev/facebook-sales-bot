import express from 'express';
import axios from 'axios';

const app = express();
app.use(express.json());

// ✅ الإعدادات
const FACEBOOK_TOKEN = "EAAZAIZCWAtHGUBSAljRWVsnz0lTdgdu9PYlzXC6ZAZBpG4elRlw4aj5iK0ycEeQpmNiv5KKMSyC8mB5rBOqVxsadtupstokkkvCs7kiWqf7YP83NRk0SZAf3G2dPDfiBaUZCHfUgNiolZAXh1lsk2PsHnYO1SdClDnq3IFosw5ABjZCxCiIY7TYXF8m2GWtVZCN2tJnLPqAZDZD";
const VERIFY_TOKEN = "VERIFY_TOKEN_123";
const GROQ_API_KEY = "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";
const GOOGLE_SHEETS_PRODUCTS = "136ZIwwnSReRvyTW-qo1zjIjd7fxvRqFvWuEr3W3GNwU";
const GOOGLE_SHEETS_SHIPPING = "1ze8i1VH09CEQgqgwT2j9ocPySRIXIcK_tuiHvnFvAI0";

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

          // ✅ احصل على البيانات من Google Sheets
          const productsData = await getSheetData(GOOGLE_SHEETS_PRODUCTS, "Sheet1!A:E");
          const shippingData = await getSheetData(GOOGLE_SHEETS_SHIPPING, "Sheet1!A:C");

          // ✅ احصل على رد من Groq
          const botName = NAMES[currentNameIndex];
          const response = await getGroqResponse(messageText, productsData, shippingData, botName);

          // ✅ أرسل الرد على Facebook
          await sendFacebookMessage(senderId, response);
        }
      }
    }

    res.status(200).send({ status: 'ok' });
  } catch (error) {
    console.error('❌ خطأ:', error.message);
    res.status(500).send({ error: error.message });
  }
});

// ✅ احصل على البيانات من Google Sheets
async function getSheetData(sheetId, range) {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&range=${range}`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('خطأ في قراءة Sheets:', error.message);
    return 'بيانات المنتجات غير متاحة الآن';
  }
}

// ✅ احصل على رد من Groq
async function getGroqResponse(messageText, productsData, shippingData, botName) {
  try {
    const systemPrompt = `أنتِ موظفة مبيعات مصرية احترافية وودية باسم ${botName}. 
ردي على العملاء بالعامية المصرية فقط بدون فصحى. 
كوني لطيفة ومحترمة وخدومة. 
حاولي قفل الأوردر بطريقة احترافية وبدون ضغط على العميل.

المنتجات والأسعار:
${productsData}

تكاليف الشحن:
${shippingData}`;

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'mixtral-8x7b-32768',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: messageText }
        ],
        max_tokens: 500,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('خطأ في Groq:', error.message);
    return 'معذرة، حدث خطأ في الرد. حاول مرة أخرى!';
  }
}

// ✅ أرسل رسالة على Facebook
async function sendFacebookMessage(recipientId, messageText) {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/me/messages`,
      {
        recipient: { id: recipientId },
        message: { text: messageText },
        access_token: FACEBOOK_TOKEN
      }
    );

    console.log('✅ تم إرسال الرسالة بنجاح');
    return response.data;
  } catch (error) {
    console.error('❌ خطأ في إرسال الرسالة:', error.message);
    throw error;
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
