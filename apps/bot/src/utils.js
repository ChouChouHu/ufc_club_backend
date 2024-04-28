
import cheerio from 'cheerio';
import admin from "firebase-admin";
import serviceAccount from "./ultimately friendly club firebase-admin.json"

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

function createNewEventInFirestore(collection, eventNumber, odds) {
  collection.add({
    id: eventNumber,
    name: eventNumber,
    odds
  })
}

export async function getOddsByEventNumberAndOrder(eventNumber, order) {
  const players = await getPlayersNameByEventNumber(eventNumber);
  const playerOne = players[order * 2].split(' ')[1].toLowerCase()
  const playerTwo = players[order * 2 + 1].split(' ')[1].toLowerCase()
  // console.log(playerOne, playerTwo);
  const odds = await getOddsByPlayerName([playerOne, playerTwo], eventNumber);
  // console.log(odds)
  return odds;
}

async function getPlayersNameByEventNumber(eventNumber) {
  // source: UFC official website
  const url = `https://www.ufc.com/event/ufc-${eventNumber}`;
  try {
    const response = await fetch(url, {
    });
    const body = await response.text();
    const $ = cheerio.load(body);
    const section = $('#main-card');
    const ul = section.find('.l-listing__group--bordered');
    const names = ul.find('.c-listing-fight__corner-name');

    let data = [];

    names.each(function () {
      const link = $(this).find('a');
      const span = link.find('span');
      let name = '';
      if (span.length > 0) {
        span.each(function (index) {
          name += $(this).text().trim();
          if (index < span.length - 1) {
            name += ' ';
          }
        })
      }
      else {
        name = link.text().trim();
      }
      data.push(name);
    })
    return data;
  } catch (err) {
    console.error(err);
  }
}

export async function getOddsByPlayerName(playerNames, eventNumber) {
  // source: covers.com
  const url = `https://www.covers.com/ufc/${eventNumber}-${playerNames[0]}-vs-${playerNames[1]}-odds-picks-predictions`
  console.log(url)
  try {
    const response = await fetch(url, {
    });
    const body = await response.text();
    const $ = cheerio.load(body);
    const table = $('.Covers-CoversArticles-AdminArticleTable');
    const thead = table.find('thead');
    const headerRow = thead.find('tr').eq(1);
    const firstPlayer = headerRow.find('th').eq(1).text().trim();
    const secondPlayer = headerRow.find('th').eq(2).text().trim();

    const tbody = table.find('tbody');
    const rows = tbody.find('tr');

    let data = {};

    rows.each(function () {
      const cells = $(this).find('td');
      if ($(cells[1]).find('a').length > 0) {
        let method = $(cells[0]).text().trim()
        data[method] = {
          [firstPlayer]: $(cells[1]).find('a').text().trim(),
          [secondPlayer]: $(cells[2]).find('a').text().trim()
        }
      }
    });

    return data;
  } catch (err) {
    console.error(err);
  }
}

export async function postOddsToFirestore(eventNumber, odds) {
  const eventsCollection = db.collection('events');
  const snapshot = await eventsCollection.where('id', '==', eventNumber).get();
  if (snapshot.empty) {
    console.log(`No matching document found with id = ${eventNumber}. Creating new document.`);
    createNewEventInFirestore(eventsCollection, eventNumber, odds);
  }
  else {
    snapshot.forEach(doc => {
      console.log('update odds')
      doc.ref.update({
        odds
      })
    })
  }
}