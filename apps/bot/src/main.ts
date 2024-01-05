/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import express from 'express';
import * as path from 'path';
import { InteractionResponseType, InteractionType } from 'discord-interactions';
import {
  VerifyDiscordRequest,
  sendScheduledMessage,
  sendDailyMessage,
  sendTestMessage,
} from './utils';
import {
  remote_week_1,
  remote_week_2,
  remote_week_3,
  remote_week_4,
} from './messages';

const app = express();

app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));

app.get('/api', (req, res) => {
  (async () => {
    try {
      sendDailyMessage();
      sendScheduledMessage('1-10 9:00', remote_week_1);
      sendScheduledMessage('1-17 9:00', remote_week_2);
      sendScheduledMessage('1-24 9:00', remote_week_3);
      sendScheduledMessage('1-31 9:00', remote_week_4);
      sendTestMessage('Bot is up and running!');
    } catch (e) {
      console.log(e);
      sendTestMessage('Error: ' + e + '\n' + 'Stack: ' + e.stack + '\n');
    }
  })();
  res.send({ message: 'Welcome to bot!' });
});

app.post('/interactions', (req, res) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { type, id, data } = req.body;
  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }
});

const port = process.env.PORT || 3333;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
});
server.on('error', console.error);
