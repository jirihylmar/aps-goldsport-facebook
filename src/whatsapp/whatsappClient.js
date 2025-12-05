// src/whatsapp/whatsappClient.js
const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

class WhatsAppClient {
    constructor() {
        this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        this.accessToken = process.env.FB_PROD_ACCESS_TOKEN;
        this.apiVersion = 'v18.0';

        if (!this.phoneNumberId || !this.accessToken) {
            console.error('Environment variables status:');
            console.error('WHATSAPP_PHONE_NUMBER_ID:', this.phoneNumberId ? 'Set' : 'Not set');
            console.error('FB_PROD_ACCESS_TOKEN:', this.accessToken ? 'Set' : 'Not set');
            throw new Error('Missing required environment variables');
        }
    }

    async sendTemplate(to, templateName, languageCode = 'en', components = []) {
        // WhatsApp API expects number without + sign
        const cleanNumber = to.replace(/^\+/, '');

        const body = {
            messaging_product: 'whatsapp',
            to: cleanNumber,
            type: 'template',
            template: {
                name: templateName,
                language: { code: languageCode },
                components: components
            }
        };

        return this._makeRequest(body);
    }

    async sendText(to, text) {
        const cleanNumber = to.replace(/^\+/, '');

        const body = {
            messaging_product: 'whatsapp',
            to: cleanNumber,
            type: 'text',
            text: { body: text }
        };

        return this._makeRequest(body);
    }

    _makeRequest(body) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify(body);

            const options = {
                hostname: 'graph.facebook.com',
                port: 443,
                path: `/${this.apiVersion}/${this.phoneNumberId}/messages`,
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data)
                }
            };

            console.log(`Sending to: ${body.to}`);

            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(responseData);
                        if (parsed.error) {
                            console.error('WhatsApp API Error:', parsed.error.message);
                            reject(parsed.error);
                        } else {
                            resolve(parsed);
                        }
                    } catch (e) {
                        reject(new Error(`Failed to parse response: ${responseData}`));
                    }
                });
            });

            req.on('error', (error) => {
                console.error('Request error:', error.message);
                reject(error);
            });

            req.write(data);
            req.end();
        });
    }
}

module.exports = WhatsAppClient;
