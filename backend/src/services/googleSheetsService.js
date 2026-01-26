const { google } = require('googleapis');
const config = require('../config');
const logger = require('../utils/logger');

class GoogleSheetsService {
    constructor() {
        this.spreadsheetId = config.googleSheets.spreadsheetId;
        this.serviceAccountEmail = config.googleSheets.serviceAccountEmail;
        this.privateKey = config.googleSheets.privateKey?.replace(/\\n/g, '\n');

        if (this.spreadsheetId && this.serviceAccountEmail && this.privateKey) {
            this.auth = new google.auth.JWT(
                this.serviceAccountEmail,
                null,
                this.privateKey,
                ['https://www.googleapis.com/auth/spreadsheets']
            );
            this.sheets = google.sheets({ version: 'v4', auth: this.auth });
        } else {
            logger.warn('Google Sheets configuration missing. Sheet sync will be disabled.');
        }
    }

    /**
     * Append order to sheet
     */
    async syncOrder(order) {
        if (!this.sheets) return;

        try {
            const values = [[
                order.orderId,
                order.createdAt.toISOString(),
                order.user.toString(),
                order.items.map(i => `${i.productName} (x${i.quantity})`).join(', '),
                order.total,
                order.paymentMethod,
                order.paymentStatus,
                order.status,
                order.deliveryAddress.address
            ]];

            await this.sheets.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: 'Orders!A2',
                valueInputOption: 'USER_ENTERED',
                resource: { values }
            });

            logger.info(`Order ${order.orderId} synced to Google Sheets`);
        } catch (error) {
            logger.error('Error syncing order to Google Sheets:', error);
        }
    }

    /**
     * Update order status in sheet
     */
    async updateOrderStatus(orderId, status) {
        if (!this.sheets) return;

        try {
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: 'Orders!A:H',
            });

            const rows = response.data.values;
            if (!rows) return;

            const rowIndex = rows.findIndex(row => row[0] === orderId);
            if (rowIndex === -1) return;

            const range = `Orders!H${rowIndex + 1}`;
            await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [[status]] }
            });

            logger.info(`Order ${orderId} status updated in Google Sheets: ${status}`);
        } catch (error) {
            logger.error('Error updating status in Google Sheets:', error);
        }
    }
}

module.exports = new GoogleSheetsService();
