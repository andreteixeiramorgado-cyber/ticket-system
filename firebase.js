
const admin = require("firebase-admin");

let db;

if (!admin.apps.length) {

  if (process.env.FIREBASE_PRIVATE_KEY) {

    admin.initializeApp({

      credential: admin.credential.cert({

        projectId:
          process.env.FIREBASE_PROJECT_ID,

        clientEmail:
          process.env.FIREBASE_CLIENT_EMAIL,

        privateKey:
          process.env.FIREBASE_PRIVATE_KEY
          .replace(/\\n/g, '\n')
      })
    });

    console.log("🔥 Firebase ligado");
  }

  else {

    const serviceAccount =
      require("./serviceAccountKey.json");

    admin.initializeApp({

      credential:
        admin.credential.cert(serviceAccount)
    });

    console.log("🔥 Firebase local ligado");
  }
}

db = admin.firestore();

module.exports = db;
