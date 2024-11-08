const fs = require('fs-extra');
const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// נתיבים לתיקיות שיש למחוק
const directoriesToDelete = [
    path.join(__dirname, '.wwebjs_auth'),
    path.join(__dirname, '.wwebjs_cache')
];

// פונקציה למחיקת תיקיות
async function deleteDirectories(directories) {
    for (const dir of directories) {
        try {
            const exists = await fs.pathExists(dir);
            if (exists) {
                await fs.remove(dir);
                console.log(`התיקייה ${dir} נמחקה בהצלחה.`);
            } else {
                console.log(`התיקייה ${dir} לא קיימת.`);
            }
        } catch (err) {
            console.error(`שגיאה במחיקת התיקייה ${dir}:`, err);
        }
    }
}

// קריאה לפונקציה למחיקת תיקיות ואז השהייה והפעלת הקוד הראשי
deleteDirectories(directoriesToDelete).then(() => {
    console.log("התיקיות נמחקו. ממתין 10 שניות לפני הפעלת הלקוח...");
    
    // השהייה של 10 שניות
    setTimeout(() => {
        // אתחול לקוח WhatsApp
        const client = new Client({
            authStrategy: new LocalAuth(), // שימוש באימות מקומי לשמירת הסשן
        });

        client.on('qr', (qr) => {
            // יצירת קוד QR לסריקה
            console.log('QR RECEIVED:', qr);
            qrcode.generate(qr, { small: true });
        });

        client.on('ready', () => {
            console.log('Client is ready!');
        });

        client.on('message', async (message) => {
            console.log(`Received message: ${message.body}`);
            try {
                if (message.body.startsWith('!createGroup')) {
                    console.log('Create group command received.');
                    const args = message.body.split('\n').slice(1);
                    const groupName = args[0];
                    const numbers = args.slice(1);

                    if (groupName && numbers.length > 0) {
                        console.log(`Creating group: ${groupName} and adding numbers: ${numbers}`);
                        await createOrAddToGroup(groupName, numbers);
                        message.reply(`הצלחנו`);
                    } else {
                        message.reply("Please provide a valid group name and phone numbers.");
                    }
                }
            } catch (error) {
                console.error('Error processing message:', error);
            }
        });

        async function createOrAddToGroup(groupName, numbers) {
            try {
                console.log(`Group "${groupName}" does not exist. Creating group...`);
                await createGroup(groupName, numbers);
            } catch (error) {
                console.error('Error while creating or adding to group:', error);
                message.reply('Error while creating or adding to group:', error);
            }
        }

        async function createGroup(groupName, numbers) {
            try {
                const formattedNumbers = numbers.map(number => {
                    if (number.startsWith('0')) {
                        return `972${number.slice(1)}@c.us`;
                    }
                });
                console.log(`Creating group "${groupName}" and adding numbers: ${formattedNumbers.join(', ')}`);
                const newGroup = await client.createGroup(groupName, formattedNumbers);
                console.log(`Group "${groupName}" created successfully with participants: ${formattedNumbers.join(', ')}`);
            } catch (error) {
                console.error('Error while creating group:', error);
                message.reply('Error while creating group:', error);
            }
        }

        client.initialize();
    }, 3000); // השהייה של 10 שניות
}).catch(error => {
    console.error("Error during directory deletion:", error);
});
