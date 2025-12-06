// src/whatsapp/webhookServer.js
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.WEBHOOK_PORT || 3000;
const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'classicskischool_verify_token';
const LOG_DIR = path.join(process.cwd(), '_scratch', 'whatsapp_webhooks');

// Ensure log directory exists
fs.mkdirSync(LOG_DIR, { recursive: true });

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    // Webhook verification (GET)
    if (req.method === 'GET' && url.pathname === '/webhook') {
        const mode = url.searchParams.get('hub.mode');
        const token = url.searchParams.get('hub.verify_token');
        const challenge = url.searchParams.get('hub.challenge');

        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('Webhook verified');
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(challenge);
        } else {
            res.writeHead(403);
            res.end('Forbidden');
        }
        return;
    }

    // Webhook events (POST)
    if (req.method === 'POST' && url.pathname === '/webhook') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                processWebhook(data);
                res.writeHead(200);
                res.end('OK');
            } catch (e) {
                console.error('Error processing webhook:', e);
                res.writeHead(500);
                res.end('Error');
            }
        });
        return;
    }

    res.writeHead(404);
    res.end('Not found');
});

function processWebhook(data) {
    const timestamp = new Date().toISOString();

    // Log raw webhook
    const logFile = path.join(LOG_DIR, `webhook_${timestamp.replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(logFile, JSON.stringify(data, null, 2));

    // Process message statuses
    if (data.entry) {
        data.entry.forEach(entry => {
            if (entry.changes) {
                entry.changes.forEach(change => {
                    if (change.value && change.value.statuses) {
                        change.value.statuses.forEach(status => {
                            logStatus(status, timestamp);
                        });
                    }
                });
            }
        });
    }
}

function logStatus(status, timestamp) {
    const statusLine = `${timestamp} | ${status.recipient_id} | ${status.status} | ${status.id}\n`;

    console.log(`Status: ${status.recipient_id} → ${status.status}`);

    // Append to status log
    const statusLogFile = path.join(LOG_DIR, 'status_log.txt');
    fs.appendFileSync(statusLogFile, statusLine);

    // Update delivery tracking CSV
    updateDeliveryLog(status, timestamp);
}

function updateDeliveryLog(status, timestamp) {
    const csvFile = path.join(LOG_DIR, 'delivery_status.csv');

    // Create header if file doesn't exist
    if (!fs.existsSync(csvFile)) {
        fs.writeFileSync(csvFile, 'timestamp,phone,status,message_id,error_code,error_title\n');
    }

    const errorCode = status.errors?.[0]?.code || '';
    const errorTitle = status.errors?.[0]?.title || '';
    const line = `${timestamp},${status.recipient_id},${status.status},${status.id},${errorCode},${errorTitle}\n`;

    fs.appendFileSync(csvFile, line);
}

server.listen(PORT, () => {
    console.log(`Webhook server running on port ${PORT}`);
    console.log(`Verify token: ${VERIFY_TOKEN}`);
    console.log(`\nConfigure in Meta Developer Console:`);
    console.log(`  Callback URL: https://YOUR_DOMAIN/webhook`);
    console.log(`  Verify Token: ${VERIFY_TOKEN}`);
    console.log(`\nLogs saved to: ${LOG_DIR}`);
});
