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

export async function crawlEventInfoFromUFC(eventNumber) {
    // source: UFC official website
    const url = `https://www.ufc.com/event/ufc-${eventNumber}`;
    try {
        const response = await fetch(url);
        const body = await response.text();
        const $ = cheerio.load(body);
        const section = $('#main-card');
        const ul = section.find('.l-listing__group--bordered');

        const names = ul.find('.c-listing-fight__corner-name');
        let players = [];
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
                });
            } else {
                name = link.text().trim();
            }
            // Remove common special characters and normalize the string
            name = name.replace(/['’]/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            players.push(name);
        });

        const imgs = ul.find('.layout__region--content');
        let images = [];
        imgs.each(function () {
            const img = $(this).find('img');
            images.push(img.attr('src'));
        });

        return { players, images };
    } catch (err) {
        console.error(err);
    }
}


export async function crawlOddsByPlayerNameFromCover(eventNumber, playerNames, attempt = 0) {
    // source: covers.com
    const formatName = (nameParts, useLastTwo) => {
        return useLastTwo && nameParts.length > 1
            ? `${nameParts[nameParts.length - 2].toLowerCase()}-${nameParts[nameParts.length - 1].toLowerCase()}`
            : nameParts[nameParts.length - 1].toLowerCase();
    };

    const getFormattedNames = (playerNames, useLastTwoForPlayerOne, useLastTwoForPlayerTwo) => {
        const playerOne = formatName(playerNames[0].split(' '), useLastTwoForPlayerOne);
        const playerTwo = formatName(playerNames[1].split(' '), useLastTwoForPlayerTwo);
        return [playerOne, playerTwo];
    };

    const combinations = [
        { isReverse: false, useLastTwoForPlayerOne: false, useLastTwoForPlayerTwo: false },
        { isReverse: true, useLastTwoForPlayerOne: false, useLastTwoForPlayerTwo: false },
        { isReverse: false, useLastTwoForPlayerOne: true, useLastTwoForPlayerTwo: false },
        { isReverse: false, useLastTwoForPlayerOne: false, useLastTwoForPlayerTwo: true },
        { isReverse: false, useLastTwoForPlayerOne: true, useLastTwoForPlayerTwo: true },
        { isReverse: true, useLastTwoForPlayerOne: true, useLastTwoForPlayerTwo: false },
        { isReverse: true, useLastTwoForPlayerOne: false, useLastTwoForPlayerTwo: true },
        { isReverse: true, useLastTwoForPlayerOne: true, useLastTwoForPlayerTwo: true },
        { isReverse: false, useLastTwoForPlayerOne: false, useLastTwoForPlayerTwo: false, addDash: true },
    ];

    const { isReverse, useLastTwoForPlayerOne, useLastTwoForPlayerTwo, addDash } = combinations[attempt];
    const formattedPlayerNames = getFormattedNames(isReverse ? [playerNames[1], playerNames[0]] : playerNames, useLastTwoForPlayerOne, useLastTwoForPlayerTwo);
    const url = `https://www.covers.com/ufc/${eventNumber}-${formattedPlayerNames[0]}-vs-${formattedPlayerNames[1]}-odds-picks-predictions${addDash ? '-' : ''}`;
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

        if (!firstPlayer || !secondPlayer) {
            if (attempt < combinations.length - 1) {
                console.log(`Attempt ${attempt + 1} failed, trying next combination...`);
                return crawlOddsByPlayerNameFromCover(eventNumber, playerNames, attempt + 1);
            } else {
                throw new Error('Failed to fetch data after trying all combinations');
            }
        }

        const tbody = table.find('tbody');
        const rows = tbody.find('tr');

        let data = {};

        rows.each(function () {
            const cells = $(this).find('td');
            if ($(cells[1]).find('a').length > 0) {
                let method = $(cells[0]).text().trim();
                data[method] = {
                    [firstPlayer]: $(cells[1]).find('a').text().trim(),
                    [secondPlayer]: $(cells[2]).find('a').text().trim()
                };
            }
        });

        return data;
    } catch (err) {
        console.error(err);
        throw err; // Rethrow to outside to stop the process
    }
}


