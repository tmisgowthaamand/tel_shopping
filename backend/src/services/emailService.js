const SibApiV3Sdk = require('sib-api-v3-sdk');
const config = require('../config');
const logger = require('../utils/logger');

class EmailService {
    constructor() {
        if (config.brevo.apiKey) {
            this.defaultClient = SibApiV3Sdk.ApiClient.instance;
            this.apiKey = this.defaultClient.authentications['api-key'];
            this.apiKey.apiKey = config.brevo.apiKey;
            this.apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
        } else {
            logger.warn('BREVO_API_KEY not found. Email notifications disabled.');
        }
    }

    async sendOrderConfirmation(order, user) {
        if (!this.apiInstance) return;

        try {
            const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
            sendSmtpEmail.subject = `Order Confirmed - ${order.orderId}`;
            sendSmtpEmail.htmlContent = `
                <html>
                    <body>
                        <h1>Thank you for your order, ${user.getFullName()}!</h1>
                        <p>Your order <strong>${order.orderId}</strong> has been confirmed.</p>
                        <p>Total amount: ₹${order.total}</p>
                        <p>Items: ${order.items.map(i => `${i.productName} (x${i.quantity})`).join(', ')}</p>
                        <p>Delivery to: ${order.deliveryAddress.address}</p>
                    </body>
                </html>
            `;
            sendSmtpEmail.sender = { name: "ATZ Store", email: "noreply@atzstore.com" };
            sendSmtpEmail.to = [{ email: user.email || 'customer@example.com', name: user.getFullName() }];

            await this.apiInstance.sendTransacEmail(sendSmtpEmail);
            logger.info(`Order confirmation email sent to ${user.email || 'customer'}`);
        } catch (error) {
            logger.error('Error sending email:', error);
        }
    }
}

module.exports = new EmailService();
