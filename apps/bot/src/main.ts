import express from 'express';
import * as path from 'path';
import { InteractionResponseType, InteractionType } from 'discord-interactions';
import { setSchedule, isTimeEarlierThanNow } from './utils';
import { isPRUnvalid, postComment } from './external_services/github_api';
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

app.use('/assets', express.static(path.join(__dirname, 'assets')));
// app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));

app.post(
  '/pull_request',
  express.json({ type: 'application/json' }),
  async (req, res) => {
    res.status(202).send('Accepted');
    const githubEvent = req.headers['x-github-event'];
    if (githubEvent === 'issue_comment') {
      try {
        const data = req.body;
        const action = data.action;
        const comment = data.comment;
        const message = comment.body;
        const issue = data.issue;
        const title = issue.title;

        if (action === 'created') {
          sendTestMessage(`${title} 有新的留言：${message}`);
        }
      } catch (e) {
        console.log(e);
        sendTestMessage('Bot is down!');
      }
    }
    if (githubEvent === 'pull_request') {
      const data = req.body;
      const action = data.action;
      const pr = data.pull_request;
      const unvalidMessage = isPRUnvalid(pr);

      try {
        if (action === 'opened') {
          sendTestMessage(
            `**${pr.user.login}** 交作業囉：[${pr.title}](${pr.html_url})`
          );
          if (unvalidMessage) {
            postComment(pr.issue_url + '/comments', unvalidMessage);
            return;
          }

          console.log(
            `An pull_request was opened with this title: ${pr.title}`
          );

          const assignmentName = pr.head.ref.toLowerCase().split('-')[1];
          if (assignmentName === 'w0p1') return; // first assignment is not required to be checked by GPT
          if (assignmentName === 'w2p1') {
            postComment(
              pr.issue_url + '/comments',
              'initial react 的程式碼太多了，機器人公休⋯⋯by Alban'
            );
            return;
          }

          const res = await getResponseFromGPT(pr.url, assignmentName);
          if (assignmentName === 'w0p2' && res === TOO_MUCH_TOKEN) return; // no need to send comment when w0p2 is too long
          postComment(pr.issue_url + '/comments', res);
        } else if (action === 'reopened') {
          if (unvalidMessage) return;
          console.log(
            `An pull_request was reopened with this title: ${pr.title}`
          );
          sendTestMessage(
            `**${pr.user.login}** 補交作業囉：[${pr.title}](${pr.html_url}}`
          );
        } else if (action === 'closed') {
          if (pr.merged || unvalidMessage) return;
          sendTestMessage(
            `**${pr.user.login}** close 他的 ${pr.title} PR 了，看來是決定要再改改了`
          );
        } else {
          console.log(`Unhandled action for the pull_request event: ${action}`);
        }
      } catch (e) {
        console.log(e);
        sendTestMessage('Bot is down!');
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
      // const classChannelID = '1189446040168960090'; // #班級頻道
      // const lifeChannelID = '1189446109563727903'; // #生活頻道
      // const dataChannelID = '1189498873404727326'; // #班級頻道 ( DATA )
      const roleFrontend = '<@&1189113826243792956>'; // @Front-End
      const roleTester = '<@&1193794222269136938>'; // @Tester

      await setDailyMessage();

      schedule_messages.forEach((message) => {
        if (isTimeEarlierThanNow(message.time)) return;
        setSchedule(message.time, sendMessage, message.content);
      });

      //       const ePortfolioMeme = '[E-Portfolio](https://i.imgur.com/JFhO1au.png)';
      //       setSchedule('1-23 12:00', sendMessage, ePortfolioMeme, classChannelID);
      //       setSchedule('1-30 12:00', sendMessage, ePortfolioMeme, classChannelID);
      //       setSchedule('2-6 12:00', sendMessage, ePortfolioMeme, classChannelID);
      //       setSchedule('1-23 12:00', sendMessage, ePortfolioMeme, dataChannelID);
      //       setSchedule('1-30 12:00', sendMessage, ePortfolioMeme, dataChannelID);
      //       setSchedule('2-6 12:00', sendMessage, ePortfolioMeme, dataChannelID);

      //       setSchedule(
      //         '1-26 09:00',
      //         sendMessage,
      //         `早安～需要一點智慧嗎？
      // - [那些可以問得更好的程式問題](https://hulitw.medium.com/ask-better-questions-19f01b02f436)
      // - [提問的智慧](https://github.com/ryanhanwu/How-To-Ask-Questions-The-Smart-Way#清楚明確地表達你的問題以及需求)`,
      //         classChannelID
      //       );

      //       setSchedule(
      //         '2-7 09:00',
      //         sendMessage,
      //         `${roleFrontend} 恭喜各位完成遠距學習～年後就是駐點學習的開始，難度會更高、步調會更緊湊，但同時也會有同學和導師們可以互相討論與解惑，所以不用太焦慮，過年期間好好陪家人，也記得先停止訂閱 Treehouse（超過一個月的費用不予以補助）。

      // 好奇前端技能樹的可以看這個 [Frontend Developer Roadmap: Learn to become a modern frontend developer](https://roadmap.sh/frontend)
      // 我們目前的階段大約是到 Javascript，然後有碰一點點 Git 跟 Package Managers，同學可以往回檢查有沒有什麼概念還有點矇懂，有餘力的也可以往後預習。

      // 另外預告一下，進來駐點後就會大量的使用 Git，還不熟悉的人一定要把握時間再練習過，尤其是 Git 指令的操作，在這邊分享一個練習 Git 的互動小網站: [LearnGit](https://learngitbranching.js.org/)

      // Remote 期間自覺比較緊繃的同學，可以趁這段時間回頭複習，確保自己有確實理解每個觀念。進度比較超前的同學，如果想要預習未來的東西，可以去搜尋 [FreeCodeCamp](https://www.freecodecamp.org/learn/)（一題一題解，適合零碎時間）跟 [React 官方文件](https://react.dev/learn)裡的練習題。

      // 預祝各位新年快樂～`
      //       );

      //       setSchedule(
      //         '2-15 09:00',
      //         sendMessage,
      //         `${roleFrontend} 春節假期結束囉，下週三就要開學了，這段期間有什麼自學的問題可以找我（抽抽）討論～`
      //       );

      setSchedule(
        '2-21 11:00',
        sendMessage,
        `${roleFrontend} 前端班下午 13:30 在 9F Microsoft 會議室集合，這段時間不知道要做什麼的人，可以先預習這幾題：

- \`git push\` 實際上會發生什麼事？
- \`git add\` 實際上是在 add 什麼？add 到哪？
- 多久 commit 一次比較適當？每次 commit 代表的意涵？
- 什麼是 PR (Pull Request)？`
      );

      await sendTestMessage(`${roleTester} Bot is up and running!`);
    } catch (e) {
      console.log(e);
      sendTestMessage('Bot is down!');
    }
  })();
});
server.on('error', console.error);
