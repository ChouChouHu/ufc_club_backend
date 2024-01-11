import express from 'express';
import * as path from 'path';
import { InteractionResponseType, InteractionType } from 'discord-interactions';
import { setSchedule, isTimeEarlierThanNow } from './utils';
import { isPRValid, postComment } from './external_services/github_api';
import { getResponseFromGPT } from './external_services/openai_api';
import {
  VerifyDiscordRequest,
  sendMessage,
  sendTestMessage,
  setDailyMessage,
} from './external_services/discord_api';
import schedule_messages from './data/schedule_messages';
import { TOO_MUCH_TOKEN } from './data/comments';

const app = express();
const roleTester = '<@&1193794222269136938>';

app.use('/assets', express.static(path.join(__dirname, 'assets')));
// app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));

app.post(
  '/pull_request',
  express.json({ type: 'application/json' }),
  async (req, res) => {
    res.status(202).send('Accepted');
    const githubEvent = req.headers['x-github-event'];
    if (githubEvent === 'pull_request') {
      const data = req.body;
      const action = data.action;
      const pr = data.pull_request;

      if (action === 'opened') {
        if (isPRValid(pr) === false) return;
        console.log(`An pull_request was opened with this title: ${pr.title}`);
        sendTestMessage(
          `**${pr.user.login}** 交作業囉：[${pr.title}](${pr.html_url})`
        );

        const assignmentName = pr.head.ref.toLowerCase().split('-')[1];
        if (assignmentName === 'w0p1') return; // first assignment is not required to be checked by GPT
        if (assignmentName === 'w2p1') {
          postComment(
            pr.issue_url + '/comments',
            'initial react 的程式碼太多了，我們還是不要壓榨機器人吧：）⋯⋯by Alban'
          );
          return;
        }

        const res = await getResponseFromGPT(pr.url, assignmentName);
        if (assignmentName === 'w0p2' && res === TOO_MUCH_TOKEN) return; // no need to send comment when w0p2 is too long
        postComment(pr.issue_url + '/comments', res);
      } else if (action === 'reopened') {
        console.log(
          `An pull_request was reopened with this title: ${pr.title}`
        );
        sendTestMessage(
          `**${pr.user.login}** 補交作業囉：[${pr.title}](${pr.html_url})}`
        );
      } else if (action === 'closed') {
        if (pr.merged) return;
        sendTestMessage(
          `**${pr.user.login}** close 他的 ${pr.title} PR 了，看來是決定要再改改了`
        );
      } else {
        console.log(`Unhandled action for the pull_request event: ${action}`);
      }
    } else if (githubEvent === 'ping') {
      console.log('GitHub sent the ping event');
    } else {
      console.log(`Unhandled event: ${githubEvent}`);
    }
  }
);

app.post(
  '/interactions',
  VerifyDiscordRequest(process.env.PUBLIC_KEY),
  (req, res) => {
    const { type } = req.body;
    /**
     * Handle verification requests
     */
    if (type === InteractionType.PING) {
      return res.send({ type: InteractionResponseType.PONG });
    }
  }
);

app.post('/', (req, res) => {
  res.send('Alban: hello!');
});

const port = process.env.PORT || 3333;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
  (async () => {
    try {
      await setDailyMessage();
      schedule_messages.forEach((message) => {
        if (isTimeEarlierThanNow(message.time)) return;
        setSchedule(message.time, sendMessage, message.content);
      });
      await sendTestMessage(`${roleTester} Bot is up and running!`);
    } catch (e) {
      console.log(e);
      sendTestMessage('Bot is down!');
    }
  })();
});
server.on('error', console.error);
