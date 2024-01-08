import fetch from 'node-fetch';
import { verifyKey } from 'discord-interactions';
import schedule from 'node-schedule';

const channelID = '1189445973445976064'; // 公布欄
const testChannelID = '1192389879905140820';

export function sendScheduledMessage(time, content) {
    const timeArray = convertStringToArray(time);
    const scheduledTime = new Date(
        2024,
        timeArray[0] - 1,
        timeArray[1],
        timeArray[2],
        timeArray[3]
    );
    const reminderTime = new Date(scheduledTime.getTime() - 5 * 60000);

    schedule.scheduleJob(reminderTime, function () {
        // console.log(`提醒：將於5分鐘後發送訊息：${content}`);
        sendTestMessage(`提醒：將於5分鐘後發送訊息：

${content}`);
    });

    schedule.scheduleJob(scheduledTime, async function () {
        const endpoint = `/channels/${channelID}/messages`;
        try {
            const res = await DiscordRequest(endpoint, {
                method: 'POST',
                body: {
                    content,
                    allowed_mentions: {
                        parse: ['roles'],
                        // "roles": ["123456"]
                    },
                    // <@&123456> 123456 是 role id
                },
            });
            const data = await res.json();
            if (data) {
                console.log('發送成功');
            }
        } catch (err) {
            console.error('發送出錯:', err);
        }
    });
    console.log(`已排程 ${formatDate(scheduledTime)}`);
}

export function sendDailyMessage() {
    const rule = new schedule.RecurrenceRule();
    rule.hour = 8;
    rule.minute = 0;

    schedule.scheduleJob(rule, function () {
        console.log("我還活著");
        sendTestMessage("我還活著");
    });

    console.log('已排程每日早上八點發送訊息');
    // sendTestMessage('已排程每日早上八點發送訊息');
}

export async function sendTestMessage(content) {
    const endpoint = `/channels/${testChannelID}/messages`;
    try {
        await DiscordRequest(endpoint, {
            method: 'POST',
            body: {
                content,
            },
        });
        // const data = await res.json();
        console.log('測試訊息發送成功');
    } catch (err) {
        console.error('測試訊息發送出錯:', err);
    }
}

export async function DiscordRequest(endpoint, options) {
    // append endpoint to root API URL
    const url = 'https://discord.com/api/v10' + endpoint;
    // Stringify payloads
    if (options.body) options.body = JSON.stringify(options.body);
    // Use node-fetch to make requests
    const res = await fetch(url, {
        headers: {
            Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
            'Content-Type': 'application/json; charset=UTF-8',
            'User-Agent':
                'DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)',
        },
        ...options,
    });
    // throw API errors
    if (!res.ok) {
        const data = await res.json();
        console.log(res.status);
        throw new Error(JSON.stringify(data));
    }
    // return original response
    return res;
}

export function VerifyDiscordRequest(clientKey) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return function (req, res, buf, encoding) {
        const signature = req.get('X-Signature-Ed25519');
        const timestamp = req.get('X-Signature-Timestamp');

        const isValidRequest = verifyKey(buf, signature, timestamp, clientKey);
        if (!isValidRequest) {
            res.status(401).send('Bad request signature');
            throw new Error('Bad request signature');
        }
    };
}

function convertStringToArray(str) {
    const matches = str.match(/\d+/g);
    return matches.map(Number);
}

function formatDate(date) {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${month}-${day} ${hours}:${minutes}`;
}
