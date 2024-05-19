import admin from "firebase-admin";
import serviceAccount from "../ultimately friendly club firebase-admin.json"

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

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


function createNewEventInFirestore(collection, eventNumber, odds) {
    collection.add({
        id: eventNumber,
        name: eventNumber,
        odds
    })
}