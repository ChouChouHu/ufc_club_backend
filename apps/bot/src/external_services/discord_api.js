import { verifyKey } from 'discord-interactions';
import fetch from 'node-fetch';
import schedule from 'node-schedule';

const testChannelID = '1192389879905140820';

export async function sendMessage(content, channelID = '1189445973445976064') {
  // default Channel ID: #公布欄
  const endpoint = `/channels/${channelID}/messages`;
  try {
    const res = await DiscordRequest(endpoint, {
      method: 'POST',
      body: {
        content,
        allowed_mentions: {
          // parse: ['roles'],
          roles: ['1189113826243792956'],
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
          roles: ['1193794222269136938'],
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
    console.log('我還活著');
    sendTestMessage('我還活著');
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
