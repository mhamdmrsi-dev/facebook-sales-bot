import express from 'express';
import axios from 'axios';

const app = express();
app.use(express.json());

const FACEBOOK_TOKEN = "EAAZAIZCWAtHGUBSAljRWVsnz0lTdgdu9PYlzXC6ZAZBpG4elRlw4aj5iK0ycEeQpmNiv5KKMSyC8mB5rBOqVxsadtupstokkkvCs7kiWqf7YP83NRk0SZAf3G2dPDfiBaUZCHfUgNiolZAXh1lsk2PsHnYO1SdClDnq3IFosw5ABjZCxCiIY7TYXF8m2GWtVZCN2tJnLPqAZDZD";
const VERIFY_TOKEN = "VERIFY_TOKEN_123";
const GROQ_API_KEY = "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";

const NAMES = ["رنا", "ساره", "يمني", "ولاء", "هدير", "مني"];
let currentNameIndex = 0;

// ✅ Verify Facebook Webhook
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log(`🔍 Verification request - mode: ${mode}, token: ${token}`);

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook Verified!');
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Unauthorized');
  }
});

// ✅ Handle incoming messages
app.post('/webhook', async (req, res) => {
  res.status(200).send({ status: 'received' });

  try {
    const body = req.body;
    console.log('📥 Webhook received:', JSON.stringify(body, null, 2));

    if (body.object !== 'page') {
      console.log('⚠️ Not a page object');
      return;
    }

    for (const entry of body.entry) {
      for (const messaging of entry.messaging) {
        if (messaging.message && messaging.message.text) {
          const sender = messaging.sender.id;
          const text = messaging.message.text;

          console.log(`\n💬 Message from ${sender}: "${text}"`);

          const botName = NAMES[currentNameIndex];
          const reply = await getGroqResponse(text, botName);

          console.log(`🤖 Replying with: "${reply}"`);
          await sendMessage(sender, reply);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
});

// ✅ Get response from Groq
async function getGroqResponse(messageText, botName) {
  try {
    console.log(`\n🚀 Calling Groq API...`);
    console.log(`   Bot: ${botName}`);
    console.log(`   Message: ${messageText}`);

    const systemMessage = `أنتِ موظفة مبيعات مصرية احترافية وودية باسم ${botName}. ردي بالعامية المصرية فقط. كوني لطيفة ومحترمة.`;

    const payload = {
      model: "mixtral-8x7b-32768",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: messageText }
      ],
      temperature: 0.7,
      max_tokens: 200
    };

    console.log(`📤 Sending to Groq...`);

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      payload,
      {
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 15000
      }
    );

    const reply = response.data.choices[0].message.content;
    console.log(`✅ Groq Response: ${reply}`);
    return reply;

  } catch (error) {
    console.error(`\n❌ Groq Error:`);
    console.error(`   Status: ${error.response?.status}`);
    console.error(`   Data: ${JSON.stringify(error.response?.data)}`);
    console.error(`   Message: ${error.message}`);

    return `أهلا وسهلا! أنا ${botName} 😊 تفضل اسأل عن أي حاجة تحتاجها!`;
  }
}

// ✅ Send message to Facebook
async function sendMessage(recipientId, text) {
  try {
    console.log(`\n📨 Sending message to ${recipientId}...`);

    const response = await axios.post(
      `https://graph.facebook.com/v18.0/me/messages`,
      {
        recipient: { id: recipientId },
        message: { text: text },
        access_token: FACEBOOK_TOKEN
      },
      { timeout: 10000 }
    );

    console.log(`✅ Message sent successfully`);
    return response.data;

  } catch (error) {
    console.error(`❌ Facebook Send Error:`);
    console.error(`   Status: ${error.response?.status}`);
    console.error(`   Data: ${JSON.stringify(error.response?.data)}`);
    console.error(`   Message: ${error.message}`);
  }
}

// ✅ Change bot name every 8 hours
setInterval(() => {
  currentNameIndex = (currentNameIndex + 1) % NAMES.length;
  console.log(`\n✨ Bot name changed to: ${NAMES[currentNameIndex]}`);
}, 8 * 60 * 60 * 1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📊 Webhook URL: https://facebook-sales-bot.vercel.app/webhook`);
});

export default app;
