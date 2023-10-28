const Imap = require('imap')
const { simpleParser } = require('mailparser')
const TelegramBot = require('node-telegram-bot-api')
const fs = require('fs');
const archiver = require('archiver');
const zlib = require('zlib')


process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

//Add email with id and password
const imapConfig = [{
    user: "devtar28k@outlook.com",
    password: "Devgan@2003",
    host: "imap-mail.outlook.com",
    port: 993,
    tls: true
},
{
    user: "augierthomas.audrey@outlook.com",
    password: "@Zerty2016",
    host: "imap-mail.outlook.com",
    port: 993,
    tls: true
},]


// Create a Telegram bot

// Channel id 
const chatId = -1002118992993;

// Bot on 
const bot = new TelegramBot("6645214107:AAEeJ9tPM8uLV54JPvATTdfRuKdtIFXGgpA", {
    polling: true,
});

let processedEmailIds = new Set(); // Initialize an empty Set

// Load processed email IDs from a file (if it exists)
try {
    const data = fs.readFileSync('processedEmailIds.txt', 'utf-8');
    processedEmailIds = new Set(data.trim().split('\n'));
} catch (err) {
    console.error('Error loading processed email IDs:', err);
}


const getEmails = async (imapConfig) => {
    try {

        const imap = new Imap(imapConfig)

        imap.once('ready', () => {
            imap.openBox('INBOX', false, () => {
                imap.search(['UNSEEN', ['SINCE', new Date()]], (err, results) => {
                    const f = imap.fetch(results, { bodies: "" });
                    f.on('message', msg => {
                        msg.on('body', stream => {
                            simpleParser(stream, async (err, parsed) => {
                                const emailId = parsed.messageId;

                                if (!processedEmailIds.has(emailId)) {
                                    console.log('----------------');
                                    const emailData = `From : ${parsed.from.text}\n To : ${parsed.to.text} \n Subject : ${parsed.subject}\n Body :  ${parsed.text}\n Date : ${parsed.date}`;
                                    console.log(emailData);

                                    // Process attachments, if any

                                    if (parsed.attachments && parsed.attachments.length > 0) {

                                        for (const attachment of parsed.attachments) {

                                            await bot.sendDocument(chatId, attachment.content, {
                                                caption: `From : ${parsed.from.text}\n To: ${parsed.to.text}\n Subject : ${parsed.subject}\n Body : ${parsed.text}\n Date : ${parsed.date}`,
                                            });

                                        }
                                    }
                                    else {
                                        bot.sendMessage(chatId, emailData);
                                    }

                                    processedEmailIds.add(emailId); // Add to the list of processed emails

                                    // Save the updated list of processed email IDs to a file
                                    fs.writeFileSync('processedEmailIds.txt', Array.from(processedEmailIds).join('\n'));
                                }

                            })
                        });
                        msg.once('attribute', attr => {
                            const { uid } = attr;
                            imap.addFlags(uid, ['\\SEEN'], () => {
                                console.log('Marked as read')
                            })
                        })

                    })
                    f.once('error', err => {
                        console.log(err)
                        return Promise.reject(err);
                    })
                    f.once('end', () => {
                        console.log('Done fetching all emails')
                        imap.end();
                    })
                })
            })
        })
        imap.once('error', err => {
            console.log(err)
        })
        imap.once('end', () => {
            console.log('Connection ended')
        })
        imap.connect()
    } catch (error) {
        console.log('error occured while getting emails')
    }
}


// Fetch emails for each configured Outlook account
for (const imapConfigs of imapConfig) {
    getEmails(imapConfigs);
}
