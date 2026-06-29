const admin = require("firebase-admin");

const serviceAccount =
  require("./serviceAccountKey.json");

admin.initializeApp({
  credential:
    admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function test(){

  const snap =
    await db.collection("tickets")
    .limit(1)
    .get();

  console.log(
    "Tickets encontrados:",
    snap.size
  );
}

test();