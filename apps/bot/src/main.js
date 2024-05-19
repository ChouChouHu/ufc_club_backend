import express from 'express';
import * as path from 'path';
import { getAllOddsByEventNumber } from './utils';
import { postOddsToFirestore } from './utils/firestore';

const app = express();

app.use('/assets', express.static(path.join(__dirname, 'assets')));
// app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));


app.get(
  '/test',
  (req, res) => {
    (async () => {
      // await getGameResultByPlayersName(300);
    })()
  }
);

app.get(
  '/odds/:event_id',
  (req, res) => {
    (async () => {
      const eventId = req.params.event_id;
      const allOdds = await getAllOddsByEventNumber(eventId);
      await postOddsToFirestore(eventId, allOdds);
      res.send(allOdds);
    })()
  }
);

app.get('/', (req, res) => {
  res.send('Alban: hello!');
});

const port = process.env.PORT || 3333;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});
server.on('error', console.error);
