const admin = require("firebase-admin");

const serviceAccount =
  require("./serviceAccountKey.json");

admin.initializeApp({

  credential:
    admin.credential.cert(
      serviceAccount
    )
});

const db =
  admin.firestore();

async function cleanup(){

  try{

    const FieldValue =
      admin.firestore.FieldValue;

    const snapshot =
      await db.collection("tickets")
      .get();

    let total = 0;

    for(const doc of snapshot.docs){

      await doc.ref.update({

        checkin_time:
          FieldValue.delete(),

        used:
          FieldValue.delete(),

        refeicoes:
          FieldValue.delete()
      });

      total++;


console.log(
  `[${total}]`,
  doc.id
);


      console.log(
        "Atualizado:",
        doc.id
      );
    }

    console.log(
      "\n✅ Limpeza concluída:",
      total,
      "tickets"
    );

    process.exit();

  }

  catch(err){

    console.error(err);

    process.exit(1);
  }
}

cleanup();