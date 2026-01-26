const axios = require('axios');
const token = '8334730747:AAH2n75NKzz-5Cuco_MzBktZi73CalKFhTw';

async function checkBot() {
    try {
        const response = await axios.get(`https://api.telegram.org/bot${token}/getWebhookInfo`);
        console.log('Webhook Info:', JSON.stringify(response.data, null, 2));

        const me = await axios.get(`https://api.telegram.org/bot${token}/getMe`);
        console.log('Bot Info:', JSON.stringify(me.data, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkBot();
