import cheerio from 'cheerio';


export async function crawlGameResultByPlayersName(eventNumber, playerNames) {
    // source: UFC official website
    const url = `https://www.ufc.com/event/ufc-${eventNumber}`;
    try {
        const response = await fetch(url, {
        });
        const body = await response.text();
        const $ = cheerio.load(body);
        const section = $('#main-card');
        const ul = section.find('.l-listing__group--bordered');
        const wins = ul.find('.c-listing-fight__outcome--win');

        wins.each(function () {
            const corner = $(this).closest('.c-listing-fight__corner--red').length ? 'Red Corner' : 'Blue Corner';
            console.log(corner);
        });

    } catch (err) {
        console.error(err);
    }
}

export async function crawlAllPlayersByEventNumberFromUFC(eventNumber) {
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

export async function crawlOddsByPlayerNameFromCover(eventNumber, playerNames, isReverse = false) {
    // source: covers.com
    const url = `https://www.covers.com/ufc/${eventNumber}-${playerNames[0]}-vs-${playerNames[1]}-odds-picks-predictions`
    console.log(url);
    try {
        const response = await fetch(url);
        const body = await response.text();
        const $ = cheerio.load(body);
        const table = $('.Covers-CoversArticles-AdminArticleTable');
        const thead = table.find('thead');
        const headerRow = thead.find('tr').eq(1);
        const firstPlayer = headerRow.find('th').eq(1).text().trim();
        const secondPlayer = headerRow.find('th').eq(2).text().trim();

        const is404 = !firstPlayer || !secondPlayer;
        if (is404 && !isReverse) {
            console.log('First attempt failed, retrying with reversed player names...');
            return crawlOddsByPlayerNameFromCover(eventNumber, [playerNames[1], playerNames[0]], true);
        } else if (is404) {
            throw new Error('Failed to fetch data after trying both player name orders');
        }

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
