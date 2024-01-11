import fetch from 'node-fetch';
import { verifyKey } from 'discord-interactions';
import schedule from 'node-schedule';
import OpenAI from 'openai';
import rp from 'request-promise';

const openai = new OpenAI();

const assignmentRequirements = {
  default:
    'and check for common issues such as whether naming is good, the program structure is sound, and if there are any redundant codes, etc.',
  w0p3: 'Check if CSS selectors are correctly applied, whether appropriate html tags are used, if there is repetitive html writing, whether the header has a fixed position, and focus on whether variables and class names are appropriately named (BEM naming convention can be suggested). Ignore indentation issues, and note if sass is applied or suggest its application.',
  w1p1: 'Check if DOM manipulation causes frequent redrawing due to redundancy, whether Javascript is logically written, if variables are appropriately named (ignore class names), and whether ES6 syntax is properly used. Also, as this function intends to insert HTML with JS, no need to advise on this point.',
  w1p2: 'Check if ajax related technology is used for changing pages when clicking tabs or navigation, as it helps avoid page refresh and state loss. Also, focus on whether js functions are neatly segmented to reduce coupling.',
  w1p3: 'No need to suggest using advanced frameworks (such as React.js), as the program needs to be implemented with pure HTML and JS.',
  w1p4: 'This program is implementing infinite scrolling, please focus on whether the function segmentation is clean enough.',
  w1p5: 'Whether the segmentation of files and functions is sufficiently rational and clean',
  w2p2: 'Whether it adheres to React and styled-component logic, and if Component naming is reasonable. No need to consider Redux, try to be brief.',
  w2p3: 'Whether it adheres to React logic, and if React Hook usage is reasonable. No need to consider Redux, try to be concise.',
  w2p4: 'Whether React Hook is appropriately used. Additionally, as this is an implementation of a shopping cart feature, focus on whether state operations are reasonable and if cookies or localStorage are used correctly.',
  w2p5: 'The program mainly implements the interface, so just give suggestions on layout design or variable naming.',
  w3p1: 'Focus on layout design, variable naming, and whether there are any bugs.',
  w3p2: 'Especially for this code implementing the form, please pay attention to the implementation status and try to be as concise as possible.',
  w3p3: 'Focus on the process of logging into Facebook and obtaining a token for the backend API.',
  w3p4: 'Focus on using tappay to submit credit card information for shopping verification.',
  w3p5: 'Focus on Google Analytics, SEO Consideration, Cross-Browser Testing.',
};

const channelID = '1189445973445976064'; // Announcement board
const testChannelID = '1192389879905140820';

export async function getResponseFromGPTByDiff(
  url,
  assignmentName = 'default'
) {
  try {
    const diff = await fetchDiff(url);
    const prompt = `You are a senior engineer conducting a code review for a subordinate. This is a diff from a GitHub pull request:

${diff}

Please focus on whether the program adheres to Best practices, ${assignmentRequirements[assignmentName]}

When giving feedback, try to directly quote the code or write out your suggestions in code form, rather than providing generic principles.

Start by briefly listing the issues you found in this program, then explain in detail with code.

Conclude with some encouragement.`;

    const res = await queryOpenAIGPT4(prompt);
    return `> 我是 Alban，我只是一台機器人而已，我說的話參考就好，一切還是依導師的回饋為主。  
  
${res}
  
> AI 的建議不一定正確，請保持思辨能力與求證心態，若有疑問也可以在此 Comment 展開討論哦。`;
  } catch (err) {
    if (err.status === 429) {
      console.log('OpenAI API 限制，請稍後再試');
      return `我只是個機器人，Code 太長了我吃不下！救命哪 @ChouChouHu`;
    }
    console.error(err);
    return '機器人公休';
  }
}

export async function postComment(uri, content) {
  console.log('post comment to uri:', uri);
  const headers = {
    'User-Agent': 'request',
    Authorization: `token ${process.env.GITHUB_TOKEN}`,
  };
  const body = JSON.stringify({
    body: content,
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

async function fetchDiff(url) {
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github.v3.diff',
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
      },
    });
    const data = await res.text();
    return data;
  } catch (err) {
    console.error(err);
  }
}

async function queryOpenAIGPT4(promptText, model = 'gpt-4') {
  const response = await openai.chat.completions.create({
    messages: [{ role: 'user', content: promptText }],
    model,
  });

  // console.log(response);

  if (response.status === 429) {
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
