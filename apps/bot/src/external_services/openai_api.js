import OpenAI from 'openai';
import { getPrompt } from '../data/prompts';
import { TOO_MUCH_TOKEN } from '../data/comments';
import { getAnwer } from '../data/comments';
import { getAssignmentExpiredDate, isDatePassed } from '../utils';

const openai = new OpenAI();

export async function getResponseFromGPT(
  url,
  assignmentName = 'default',
  model = 'gpt-4'
) {
  try {
    const diff = await fetchDiff(url);
    const expiredDate = getAssignmentExpiredDate(assignmentName);
    const prompt = getPrompt(diff, assignmentName, isDatePassed(expiredDate));

    console.log('收到 PR，開始 Code Review');
    const res = await queryOpenAIGPT(prompt, model);
    return getAnwer(res);
  } catch (err) {
    if (err.status === 429 && model === 'gpt-4') {
      console.log('GPT-4 API 限制，改用 GPT-3.5');
      return getResponseFromGPT(url, assignmentName, 'gpt-3.5-turbo-1106');
    } else if (err.status === 429 || err.status === 400) {
      console.error('Token 數超過 OpenAI API 限制');
      console.error(err);
      return TOO_MUCH_TOKEN;
    }

    console.error(err);
    return '機器人公休';
  }
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

async function queryOpenAIGPT(promptText, model) {
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
