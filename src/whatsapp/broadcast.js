// src/whatsapp/broadcast.js
const fs = require('fs');
const path = require('path');
const WhatsAppClient = require('./whatsappClient');

class Broadcast {
    constructor() {
        this.client = new WhatsAppClient();
        this.waitTime = 1000; // 1 second between messages (rate limiting)
    }

    async run(phonesFile, templateName, languageCode = 'en') {
        console.log(`\nBroadcast starting`);
        console.log(`Phones file: ${phonesFile}`);
        console.log(`Template: ${templateName}`);
        console.log(`Language: ${languageCode}`);

        const phones = this._loadPhones(phonesFile);
        console.log(`Loaded ${phones.length} phone numbers\n`);

        const results = {
            success: [],
            failed: [],
            startTime: new Date().toISOString()
        };

        for (let i = 0; i < phones.length; i++) {
            const phone = phones[i];
            const useTemplate = phone.template || templateName;
            const useLang = phone.language || languageCode;

            console.log(`[${i + 1}/${phones.length}] Sending to ${phone.number} (${useTemplate}, ${useLang})...`);

            try {
                const response = await this.client.sendTemplate(
                    phone.number,
                    useTemplate,
                    useLang
                );
                results.success.push({
                    phone: phone.number,
                    template: useTemplate,
                    language: useLang,
                    name: phone.name,
                    messageId: response.messages?.[0]?.id
                });
                console.log(`  ✓ Sent (${response.messages?.[0]?.id})`);
            } catch (error) {
                results.failed.push({
                    phone: phone.number,
                    template: useTemplate,
                    error: error.message || error.code
                });
                console.log(`  ✗ Failed: ${error.message || error.code}`);
            }

            // Rate limiting
            if (i < phones.length - 1) {
                await this._wait(this.waitTime);
            }
        }

        results.endTime = new Date().toISOString();
        this._saveResults(results, templateName);

        console.log(`\nBroadcast complete`);
        console.log(`Success: ${results.success.length}`);
        console.log(`Failed: ${results.failed.length}`);

        return results;
    }

    _loadPhones(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.trim().split('\n');

        // Detect format: CSV with header or plain list
        const firstLine = lines[0];
        const hasHeader = firstLine.includes('phone_number') || firstLine.includes('phone');

        if (hasHeader) {
            // CSV format - support: phone_number,language,message,name_sponsor
            const header = firstLine.split(',').map(h => h.trim().toLowerCase());
            const phoneIdx = header.findIndex(h => h.includes('phone'));
            const langIdx = header.findIndex(h => h === 'language');
            const msgIdx = header.findIndex(h => h === 'message');
            const nameIdx = header.findIndex(h => h === 'name_sponsor');

            return lines.slice(1)
                .filter(line => line.trim())
                .map(line => {
                    const cols = line.split(',').map(c => c.trim());
                    return {
                        number: cols[phoneIdx],
                        language: langIdx >= 0 ? cols[langIdx] : null,
                        template: msgIdx >= 0 ? cols[msgIdx] : null,
                        name: nameIdx >= 0 ? cols[nameIdx] : null
                    };
                });
        } else {
            // Plain list of numbers
            return lines
                .filter(line => line.trim())
                .map(line => ({ number: line.trim(), language: null, template: null, name: null }));
        }
    }

    _wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    _saveResults(results, templateName) {
        const outputDir = path.join(process.cwd(), '_scratch', 'whatsapp_broadcasts');
        fs.mkdirSync(outputDir, { recursive: true });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputPath = path.join(outputDir, `broadcast_${templateName}_${timestamp}.json`);

        fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
        console.log(`Results saved: ${outputPath}`);
    }
}

// CLI
if (require.main === module) {
    const args = process.argv.slice(2).reduce((acc, arg) => {
        const [key, value] = arg.split('=');
        if (key === '--phones') acc.phones = value;
        if (key === '--template') acc.template = value;
        if (key === '--language') acc.language = value;
        return acc;
    }, {});

    if (!args.phones || !args.template) {
        console.error('Usage: node broadcast.js --phones=<file.csv> --template=<template_name> [--language=en]');
        console.error('\nPhone file formats:');
        console.error('  CSV: phone_number,language');
        console.error('  Plain: one phone per line (+420123456789)');
        process.exit(1);
    }

    const broadcast = new Broadcast();
    broadcast.run(args.phones, args.template, args.language || 'en')
        .catch(error => {
            console.error('Broadcast failed:', error);
            process.exit(1);
        });
}

module.exports = Broadcast;
