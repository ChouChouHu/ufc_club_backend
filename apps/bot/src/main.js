import express from 'express';
import * as path from 'path';
import { crawlAllOddsFromCover } from './utils';
import { postEventToFirestore } from './utils/firestore';
import { crawlEventInfoFromUFC } from './utils/crawler';

const app = express();

app.use('/assets', express.static(path.join(__dirname, 'assets')));
// app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));


app.get(
  '/test',
  (req, res) => {
    (async () => {
      // await getGameResultByPlayersName(300);
      const info = await crawlEventInfoFromUFC(300);
      res.send(info);
    })()
  }
);

app.get(
  '/odds/:event_id',
  (req, res) => {
    (async () => {
      const eventId = req.params.event_id;
      try {
        const { players, images } = await crawlEventInfoFromUFC(eventId);
        const allOdds = await crawlAllOddsFromCover(eventId, players);
        await postEventToFirestore(eventId, allOdds, players, images);
        res.send(allOdds);
      } catch (error) {
        console.error(error);
        res.send("404 Not Found");
      }

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
