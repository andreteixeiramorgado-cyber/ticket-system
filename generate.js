const QRCode = require("qrcode");
const db = require("./firebase");


// ======================================================
// GERAR ID
// ======================================================

function gerarID() {

  return (
    "EVT-" +
    Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase()
  );
}


// ======================================================
// CRIAR BILHETE
// ======================================================

async function criarBilhete() {

  try {

    const id = gerarID();

    // guardar no Firebase
    await db.collection("tickets")
    .doc(id)
    .set({

      active:false,
      used:false,
      entradas:0,

      created_at:new Date()
    });


    // QR URL
    const url =
      `https://ticket-system-ow17.onrender.com/t/${id}`;


    // gerar QR
    await QRCode.toFile(

      `${id}.png`,

      url
    );

    console.log(
      "🎟️ Bilhete criado:",
      id
    );

  }

  catch(err){

    console.error(
      "Erro:",
      err
    );
  }
}


// ======================================================
// START
// ======================================================

criarBilhete();