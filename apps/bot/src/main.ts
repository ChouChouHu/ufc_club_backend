import express from 'express';
// import fetch from 'node-fetch';
import * as path from 'path';
import { InteractionResponseType, InteractionType } from 'discord-interactions';
import {
  VerifyDiscordRequest,
  setSchedule,
  sendMessage,
  sendTestMessage,
  setDailyMessage,
  getResponseFromGPTByDiff,
  postComment,
} from './utils';
import {
  remote_week_1,
  remote_week_2,
  remote_week_3,
  remote_week_4,
} from './messages';

const app = express();
// const githubToken = process.env.GITHUB_TOKEN;

const roleFrontend = '<@&1189113826243792956>';
const roleTester = '<@&1193794222269136938>';

app.use('/assets', express.static(path.join(__dirname, 'assets')));
// app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));

app.get('/set_schedule', (req, res) => {
  (async () => {
    try {
      await setDailyMessage();
      await setSchedule('1-9 11:44', sendTestMessage, `${roleTester} hi`);
      await setSchedule(
        '1-10 9:00',
        sendMessage,
        `${roleFrontend} ${remote_week_1}`
      );
      await setSchedule(
        '1-17 9:00',
        sendMessage,
        `${roleFrontend} ${remote_week_2}`
      );
      await setSchedule(
        '1-24 9:00',
        sendMessage,
        `${roleFrontend} ${remote_week_3}`
      );
      await setSchedule(
        '1-31 9:00',
        sendMessage,
        `${roleFrontend} ${remote_week_4}`
      );
      await sendTestMessage(`${roleTester} Bot is up and running!`);
      res.status(200).send({ message: 'Welcome to bot!' });
    } catch (e) {
      console.log(e);
      res.status(500).send('Something wrong!');
      // sendTestMessage('Error: ' + e + '\n' + 'Stack: ' + e.stack + '\n');
    }
  })();
});

app.post(
  '/pull_request',
  express.json({ type: 'application/json' }),
  (req, res) => {
    res.status(202).send('Accepted');
    const githubEvent = req.headers['x-github-event'];
    if (githubEvent === 'pull_request') {
      const data = req.body;
      const action = data.action;
      const pr = data.pull_request;

      if (action === 'opened') {
        const baseBranch = pr.base.ref.toLowerCase();
        const compareBranch = pr.head.ref.toLowerCase();

        if (baseBranch === 'main') {
          postComment(
            pr.issue_url + '/comments',
            '不准發 PR 到 main 分支喔！by Alban'
          );
          return;
        } else if (baseBranch !== 'develop') {
          postComment(
            pr.issue_url + '/comments',
            '你把 PR 發到哪裡了？⋯⋯by Alban'
          );
          return;
        }

        if (!/^feature\/[a-zA-Z]+-w\d+p\d+$/.test(compareBranch)) {
          postComment(
            pr.issue_url + '/comments',
            '請檢查你的 compare branch 命名是否為 feature/[your_name]-w[week number]p[part number] 格式喔！by Alban'
          );
          return;
        }

        const assignmentName = compareBranch.split('-')[1];
        if (assignmentName === 'w0p1' || assignmentName === 'w0p2') {
          return;
        }

        console.log(`An pull_request was opened with this title: ${pr.title}`);
        sendTestMessage(`${pr.user.login} 交作業囉：${pr.title}`);

        (async () => {
          const res = await getResponseFromGPTByDiff(pr.url, assignmentName);
          postComment(pr.issue_url + '/comments', res);
        })();
      } else if (action === 'reopened') {
        console.log(
          `An pull_request was reopened with this title: ${pr.title}`
        );
        sendTestMessage(`${pr.user.login} 補交作業囉：${pr.title}`);
        sendTestMessage(
          `An pull_request was reopened by ${pr.user.login} with this title: ${pr.title}`
        );
      } else if (action === 'closed') {
        if (pr.merged) return;
        sendTestMessage(`${pr.user.login} close 他的 ${pr.title} PR 了`);
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

const port = process.env.PORT || 3333;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
  // sendTestMessage('死者甦醒！');
  // (async () => {
  //   const res = await getResponseFromGPTByDiff(
  //     'https://api.github.com/repos/okokschool/Alphateam/pulls/20'
  //   );
  //   console.log(res);
  // })();
});
server.on('error', console.error);

// function fetchAndSendDiff(pr) {
//   const url = pr.diff_url;
//   console.log(url);
//   console.log(githubToken);
//   fetch(url, {
//     headers: {
//       Authorization: `bearer ${githubToken}`,
//     },
//   })
//     .then((response) => response.json())
//     .then((data) => {
//       console.log('Success:', data);
//       // sendTestMessage(data);
//       return data;
//     })
//     .catch((error) => {
//       console.error('Error:', error);
//       sendTestMessage('這次失敗');
//     });
//   return;
// }

// app.get('/test', async (req, res) => {
//   const data = await fetchAndSendDiff({
//     diff_url:
//       'https://api.github.com/repos/ChouChouHu/Alphateam_Test/contents/',
//   });
//   res.send(data);
// });
