import { crawlOddsByPlayerNameFromCover, crawlAllPlayersByEventNumberFromUFC } from "./crawler";



export async function getOddsByEventNumberAndOrder(eventNumber, order) {
    const players = await crawlAllPlayersByEventNumberFromUFC(eventNumber);
    const playerOne = players[order * 2].split(' ')[1].toLowerCase()
    const playerTwo = players[order * 2 + 1].split(' ')[1].toLowerCase()
    // console.log(playerOne, playerTwo);
    const odds = await crawlOddsByPlayerNameFromCover(eventNumber, [playerOne, playerTwo]);
    // console.log(odds)
    return odds;
}
