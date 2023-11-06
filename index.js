const Imap = require('imap')
const { simpleParser } = require('mailparser')
const TelegramBot = require('node-telegram-bot-api')
const fs = require('fs');


process.env.NODE_TLS_REJECT_UNAUTHORIZED = 1;

//Add email with id and password
const imapConfig = [{
    user: "devtar28k@outlook.com",
    password: "YOUR_PASS",
    host: "imap-mail.outlook.com",
    port: 993,
    tls: true
},
{
    user: "ADD_MULTIPLE_EMAIL",
    password: "YOUR_PASS",
    host: "imap-mail.outlook.com",
    port: 993,
    tls: true
},] //add accounts in form of object


// Create a Telegram bot

// Channel id 
const chatId = CHAT_ID;

// Bot on 
const bot = new TelegramBot(CHAT_BOT_ID, {
    polling: true,
});


// for already sended emails 
let processedEmailIds = new Set(); // Initialize an empty Set

// Load processed email IDs from a file (if it exists) then khatam tata bye bye
try {
    const data = fs.readFileSync('processedEmailIds.txt', 'utf-8');
    processedEmailIds = new Set(data.trim().split('\n'));
} catch (err) {
    console.error('Error loading processed email IDs:', err);
}


// main function 

const getEmails = async (imapConfig) => {
    try {

        const imap = new Imap(imapConfig)

        // Once its ready 
        imap.once('ready', () => {
            imap.openBox('INBOX', false, () => {
                // Unseen mails 
                imap.search(['UNSEEN', ['SINCE', new Date()]], (err, results) => {
                    const f = imap.fetch(results, { bodies: "" });
                    f.on('message', msg => {
                        msg.on('body', stream => {
                            simpleParser(stream, async (err, parsed) => {
                                const emailId = parsed.messageId;

                                // Checking if email already sended  

                                if (!processedEmailIds.has(emailId)) {
                                    // console.log('----------------');
                                    const emailData = `From : ${parsed.from.text}\n To : ${parsed.to.text} \n Subject : ${parsed.subject}\n Body :  ${parsed.text}\n Date : ${parsed.date}`;
                                    // console.log(emailData);

                                    // Process attachments, if any
                                    if (parsed.attachments && parsed.attachments.length > 0) {

                                        for (const attachment of parsed.attachments) {
                                            // Sending attachment 
                                            await bot.sendDocument(chatId, attachment.content, {
                                                caption: `From : ${parsed.from.text}\n To: ${parsed.to.text}\n Subject : ${parsed.subject}\n Body : ${parsed.text}\n Date : ${parsed.date}`,
                                            });

                                        }
                                    }
                                    else {
                                        // sending if no attachment 
                                        bot.sendMessage(chatId, emailData);
                                    }

                                    // adding email id to show its loaded already 
                                    
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


// Too get all emails mails 
function getEmailsPeriodically() {
    for (const config of imapConfig) {
        getEmails(config);
    }
}

// Call getEmailsPeriodically every 1 minute (60,000 milliseconds)
setInterval(getEmailsPeriodically, 60000);
