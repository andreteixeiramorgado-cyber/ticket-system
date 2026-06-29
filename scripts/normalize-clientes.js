const admin = require("firebase-admin");

const serviceAccount =
  require("../serviceAccountKey.json");

admin.initializeApp({

  credential:
    admin.credential.cert(
      serviceAccount
    )
});

const db =
  admin.firestore();

async function normalizeClientes(){

  try{

    const snapshot =
      await db.collection("tickets")
      .get();

    let total = 0;

    for(const doc of snapshot.docs){

      const data =
        doc.data();

      if(!data.cliente)
        continue;

      const clienteNormalizado =

        data.cliente

        .trim()

        .toUpperCase()

        .normalize("NFD")

        .replace(
          /[\u0300-\u036f]/g,
          ""
        );

      if(
        clienteNormalizado !==
        data.cliente
      ){

        await doc.ref.update({

          cliente:
            clienteNormalizado
        });

        total++;

        console.log(
          `[${total}]`,
          data.cliente,
          "→",
          clienteNormalizado
        );
      }
    }

    console.log(
      "\n✅ Clientes normalizados:",
      total
    );

    process.exit();

  }

  catch(err){

    console.error(err);

    process.exit(1);
  }
}

normalizeClientes();