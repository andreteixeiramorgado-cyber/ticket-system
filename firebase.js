const admin = require("firebase-admin");

let db;

if (process.env.FIREBASE_PRIVATE_KEY) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
  });

  db = admin.firestore();
  console.log("🔥 Firebase ligado");
} else {
  console.log("⚠️ Firebase NÃO configurado (modo teste)");
}

module.exports = db;
