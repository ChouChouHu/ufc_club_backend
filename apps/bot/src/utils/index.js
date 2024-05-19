import { crawlOddsByPlayerNameFromCover, crawlAllPlayersByEventNumberFromUFC } from "./crawler";



export async function getAllOddsByEventNumber(eventNumber) {
    const players = await crawlAllPlayersByEventNumberFromUFC(eventNumber);
    const allOdds = [];
    for (let order = 0; order < 5; order++) {
        const playerOne = players[order * 2].split(' ')[1].toLowerCase()
        const playerTwo = players[order * 2 + 1].split(' ')[1].toLowerCase()
        const odds = await crawlOddsByPlayerNameFromCover(eventNumber, [playerOne, playerTwo]);
        allOdds.push(odds);
    }
    return allOdds;
}
