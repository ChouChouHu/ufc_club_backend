import { crawlOddsByPlayerNameFromCover, crawlAllPlayersByEventNumberFromUFC } from "./crawler";



export async function getAllOddsByEventNumber(eventNumber) {
    const players = await crawlAllPlayersByEventNumberFromUFC(eventNumber);
    // console.log(players)
    const allOdds = [];
    try {
        for (let order = 4; order >= 0; order--) {
            const playerOne = players[order * 2];
            const playerTwo = players[order * 2 + 1];
            const odds = await crawlOddsByPlayerNameFromCover(eventNumber, [playerOne, playerTwo]);
            allOdds.push(odds);
        }
        return allOdds;
    } catch (error) {
        console.error('An error occurred, stop the process:', error.message);
        throw error;  // Rethrow the error to ensure the caller is aware of the failure
    }
}


