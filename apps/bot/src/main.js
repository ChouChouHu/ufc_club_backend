import express from 'express';
import * as path from 'path';
import { getOddsByEventNumberAndOrder, getPlayersNameByEventNumber, postOddsToFirestore, test } from './utils';

const app = express();

app.use('/assets', express.static(path.join(__dirname, 'assets')));
// app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));


app.get(
  '/event',
  (req, res) => {
    (async () => {
      const players = await getPlayersNameByEventNumber(301);
      res.send(players);
    })()
  }
);

// app.get('/test', (req, res) => {
//   test();
//   res.send('hi');
// })

app.get(
  '/odds/:event_id',
  (req, res) => {
    (async () => {
      const eventId = req.params.event_id;
      const allOdds = [];
      for (let order = 4; order >= 0; order--) {
        const oddsForEachGame = await getOddsByEventNumberAndOrder(eventId, order);
        allOdds.push(oddsForEachGame);
      }
      await postOddsToFirestore(eventId, allOdds);
      res.send(allOdds);
    })()
  }
);

app.post('/', (req, res) => {
  res.send('Alban: hello!');
});

const port = process.env.PORT || 3333;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
});
server.on('error', console.error);
