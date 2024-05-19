import admin from "firebase-admin";
import serviceAccount from "../ultimately friendly club firebase-admin.json"

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

export async function postEventToFirestore(eventNumber, odds, players, images) {
    const eventsCollection = db.collection('events');
    const snapshot = await eventsCollection.where('id', '==', eventNumber).get();
    let info = [];
    for (let i = 4; i >= 0; i--) {
        info.push({
            "player1": {
                name: players[i * 2],
                image: images[i * 2]
            },
            "player2": {
                name: players[i * 2 + 1],
                image: images[i * 2 + 1]
            }
        })
    }
    if (snapshot.empty) {
        console.log(`No matching document found with id = ${eventNumber}. Creating new document.`);
        createNewEventInFirestore(eventsCollection, eventNumber, odds, info);
    }
    else {
        snapshot.forEach(doc => {
            console.log('update odds')
            doc.ref.update({
                odds,
                info
            })
        })
    }
}


function createNewEventInFirestore(collection, eventNumber, odds, info) {
    collection.add({
        id: eventNumber,
        name: eventNumber,
        odds,
        info
    })
}