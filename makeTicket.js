const db = require("./firebase");

const { PDFDocument } =
  require("pdf-lib");

const QRCode =
  require("qrcode");

const fs =
  require("fs");


// ======================================================
// GERAR ID
// ======================================================

function gerarID(){

  return (
    "EVT-" +
    Math.random()
      .toString(36)
      .substring(2,10)
      .toUpperCase()
  );
}


// ======================================================
// CRIAR BILHETE
// ======================================================

async function criarBilhete(){

  try{

    const id = gerarID();

    const url =
      `https://ticket-system-ow17.onrender.com/t/${id}`;


    // guardar firebase
    await db.collection("tickets")
    .doc(id)
    .set({

      active:false,
      used:false,
      entradas:0,

      created_at:new Date()
    });


    // gerar QR
    const qrBase64 =
      await QRCode.toDataURL(url);


    // template imagem
    const existingImageBytes =
      fs.readFileSync("./ticket.png");


    // pdf
    const pdfDoc =
      await PDFDocument.create();

    const page =
      pdfDoc.addPage([1200,600]);


    // fundo
    const bgImage =
      await pdfDoc.embedPng(existingImageBytes);

    page.drawImage(bgImage,{

      x:0,
      y:0,

      width:1200,
      height:600
    });


    // qr
    const qrImageBytes =
      Buffer.from(
        qrBase64.split(",")[1],
        "base64"
      );

    const qrImage =
      await pdfDoc.embedPng(qrImageBytes);

    page.drawImage(qrImage,{

      x:400,
      y:110,

      width:360,
      height:360
    });


    // texto ID
    page.drawText(id,{

      x:500,
      y:70,

      size:20
    });


    // guardar pdf
    const pdfBytes =
      await pdfDoc.save();

    fs.writeFileSync(

      `ticket-${id}.pdf`,

      pdfBytes
    );

    console.log(
      "🎟️ Bilhete criado:",
      id
    );
  }

  catch(err){

    console.error(err);
  }
}


// ======================================================
// START
// ======================================================

criarBilhete();