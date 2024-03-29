import express from 'express';
import * as path from 'path';
import { InteractionResponseType, InteractionType } from 'discord-interactions';
import {
  setSchedule,
  isTimeEarlierThanNow,
  formatMessageAsBlockquote,
} from './utils';
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
    if (githubEvent === 'push') {
      try {
        const data = req.body;
        const commit = data.head_commit;
        const message = commit.message;
        sendTestMessage(
          `✅ 有人完成作業囉\n ${formatMessageAsBlockquote(message)}`
        );
      } catch (e) {
        console.log(e);
        sendTestMessage('Bot is down!');
      }
    }
    if (githubEvent === 'issue_comment') {
      try {
        const data = req.body;
        const action = data.action;
        const comment = data.comment;
        const message = comment.body;
        const username = comment.user.login;
        const issue = data.issue;
        const title = issue.title;

        console.log(`${username} this message: ${message}`);

        if (action === 'created' && username !== 'ChouChouHu') {
          sendTestMessage(
            `💬 ${title} 有新的留言：\n${formatMessageAsBlockquote(message)}`
          );
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
            `📪 **${pr.user.login}** 交作業囉：[${pr.title}](${pr.html_url})`
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
          if (res === TOO_MUCH_TOKEN) return; // 0311: no need to send comment when the response is too long
          postComment(pr.issue_url + '/comments', res);
        } else if (action === 'reopened') {
          if (unvalidMessage) return;
          console.log(
            `An pull_request was reopened with this title: ${pr.title}`
          );
          // sendTestMessage(
          //   `**${pr.user.login}** 補交作業囉：[${pr.title}](${pr.html_url}}`
          // );
        } else if (action === 'closed') {
          if (pr.merged || unvalidMessage) return;
          // sendTestMessage(
          //   `**${pr.user.login}** close 他的 ${pr.title} PR 了，看來是決定要再改改了`
          // );
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
      // const roleTester = '<@&1193794222269136938>'; // @Tester

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

      //       setSchedule(
      //         '2-21 11:00',
      //         sendMessage,
      //         `${roleFrontend} 前端班下午 13:30 在 9F Microsoft 會議室集合，這段時間不知道要做什麼的人，可以先預習這幾題：

      // - \`git push\` 實際上會發生什麼事？
      // - \`git add\` 實際上是在 add 什麼？add 到哪？
      // - 多久 commit 一次比較適當？每次 commit 代表的意涵？
      // - 什麼是 PR (Pull Request)？`
      //       );

      // setSchedule(
      //   '2-27 9:00',
      //   sendMessage,
      //   `${roleFrontend} 早上 recap: [簡報連結](https://drive.google.com/drive/folders/1GiN7PQY4ASxy1XgnEwuxkJYD1IT5PMad?usp=sharing)，請選到自己的組別進行編輯`
      // );
      // setSchedule(
      //   '2-27 15:50',
      //   sendMessage,
      //   `${roleFrontend} 提醒：16:00（10 min 後）要進行放假前的 recap 哦～`
      // );
      // setSchedule(
      //   '2-27 16:00',
      //   sendMessage,
      //   `${roleFrontend} 下午 recap: [簡報連結](https://drive.google.com/drive/folders/13l4lmBwmuRtB5ATL9sbZa6TjK-AHN2eQ?usp=sharing)，請選到自己的組別進行編輯`
      // );

      // setSchedule(
      //   '3-20 09:00',
      //   sendMessage,
      //   `${roleFrontend} 今天下午 Firebase 驗收完後，17:00 @ Microsoft 集合，會發送 Topic Discussion 的題目`
      // );
      
      // setSchedule(
      //   '3-28 12:00',
      //   sendMessage,
      //   `${roleFrontend} 今天下午 15:00 Dive Into Topics 環節結束，我們在 Microsoft 進行 Recap，請在 15:00 前填妥 [FAQ](https://docs.google.com/spreadsheets/d/1BvtVA38JDSdnjdb6j3g7k8FfBlDqSGAvj2tuFlExWqQ/edit?usp=sharing)`
      // );

      const midtermMessage = `
${roleFrontend} [期中考題目](https://docs.google.com/document/d/1iYzOEoe_3hoHd8pPWHQJrb8gxaCZDD4nwu5md6NtTlc/edit?usp=sharing)
### Rules
1. 此考試需獨立完成，禁止與他人以口頭對話、文字、螢幕截圖以及任何形式的方式討論題目或是做法。
2. 可以 Google，但**不能使用 ChatGPT 或者 Co-pilot 等任何生成式 AI**，另可以先檢視一下自己面對未知的題目，要怎麼下手解題，不要浪費可以檢視自己學習狀況的機會。
3. 17:00 前的 commit 才算數

請簡單自我紀錄一下作答過程，例如「10 點完成第一題，第二題卡了半個小時先跳過去做第三題，第四題找到 xxx 網站有完整的範例可以參考」等等，方便後續回顧和檢討。
請盡力寫，不要放棄，這個期中考成績不會影響學員在學程內的評分。
      `;

      setSchedule(
        '4-3 9:00',
        sendMessage,
        midtermMessage
      );

      await sendTestMessage(midtermMessage);
      // await sendTestMessage(`${roleTester} Bot is up and running!`);
    } catch (e) {
      console.log(e);
      sendTestMessage('Bot is down!');
    }
  })();
});
server.on('error', console.error);
