import fetch from 'node-fetch';
import { verifyKey } from 'discord-interactions';
import schedule from 'node-schedule';
import OpenAI from "openai";
import rp from "request-promise";

const openai = new OpenAI();


const channelID = '1189445973445976064'; // 公布欄
const testChannelID = '1192389879905140820';

export async function getResponseFromGPTByDiff(url) {
    try {
        const diff = await fetchDiff(
            url
        );
        const assignmentRequirements =
            '重複操作 DOM、未正確使用 ES6 語法、命名是否良好、程式結構是否良好、是否有冗余的程式';
        const prompt = `您是資深工程師，你正在幫下屬 code review，這是一份 github pull request 的 diff

${diff}

請幫我著重在程式是否有遵照 Best pratice，並檢查一些常見問題，如${assignmentRequirements}

給予回饋時，盡量直接把程式引用出來或是把你的建議用程式寫出來，不要給一些通用性的原則

開頭請先簡單條列出你在這個程式發現的問題，之後再詳細解釋`;

        const res = await queryOpenAIGPT4(prompt);
        return `> 我是 Alban，我只是一台機器人而已，我說的話參考就好，一切還是依導師的回饋為主  
  
${res}`;
    } catch (err) {
        if (err.status === 429) {
            console.log('OpenAI API 限制，請稍後再試');
            return `我只是個機器人，Code 太長了我吃不下！救命哪 @ChouChouHu`;
        }
        console.error(err.message);
        return '機器人公休';
    }
}

export async function postComment(uri, content) {
    console.log("post comment to uri:", uri);
    const headers = {
        'User-Agent': 'request',
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
    }
    const body = JSON.stringify({
        "body": content
    });
    await rp({ method: 'POST', uri, body: body, headers });
}

export function setSchedule(time, callback, content) {
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

    schedule.scheduleJob(scheduledTime, () => callback(content));
    console.log(`已排程 ${formatDate(scheduledTime)}`);
}

export async function sendMessage(content) {
    const endpoint = `/channels/${channelID}/messages`;
    try {
        const res = await DiscordRequest(endpoint, {
            method: 'POST',
            body: {
                content,
                allowed_mentions: {
                    // parse: ['roles'],
                    "roles": ["1189113826243792956"]
                },
            },
        });
        const data = await res.json();
        if (data) {
            console.log('發送成功');
        }
    } catch (err) {
        console.error('發送出錯:', err);
    }
}

export async function sendTestMessage(content) {
    const endpoint = `/channels/${testChannelID}/messages`;
    try {
        await DiscordRequest(endpoint, {
            method: 'POST',
            body: {
                content,
                allowed_mentions: {
                    // parse: ['roles'],
                    roles: ["1193794222269136938"]
                },
            },
        });
        // const data = await res.json();
        console.log('測試訊息發送成功');
    } catch (err) {
        console.error('測試訊息發送出錯:', err);
    }
}


export function setDailyMessage() {
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

async function fetchDiff(url) {
    try {
        const res = await fetch(url, {
            headers: {
                'Accept': 'application/vnd.github.v3.diff',
                Authorization: `token ${process.env.GITHUB_TOKEN}`,
            },
        });
        const data = await res.text();
        return data;
    }
    catch (err) {
        console.error(err);
    }
}

async function queryOpenAIGPT4(promptText, model = "gpt-4") {
    const response = await openai.chat.completions.create({
        messages: [{ role: "user", content: promptText }],
        model
    });

    if (response.status !== 200) {
        throw new Error(response);
    }

    return response.choices[0].message.content;
}

async function DiscordRequest(endpoint, options) {
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
