const db = require("./firebase");

const { PDFDocument } = require("pdf-lib");

const QRCode = require("qrcode");

const fs = require("fs");

const path = require("path");

const TOTAL_DIR = 4;

const TOTAL_VIP = 10;

const OUTPUT =
  "./tickets/CAL";

const TEMPLATE_DIR =
  "./ticket CAL - DIRETOR.PNG";

const TEMPLATE_VIP =
  "./ticket CAL - VIP.PNG";

if(!fs.existsSync(OUTPUT)){

  fs.mkdirSync(

    OUTPUT,

    { recursive:true }

  );
}


async function apagarCAL(){

  const snapshot =
    await db.collection("tickets").get();

  let total = 0;

  for(const doc of snapshot.docs){

    if(

      doc.id.startsWith("CAL.DIR-") ||

      doc.id.startsWith("CAL.VIP-")

    ){

      await doc.ref.delete();

      total++;
    }
  }

  console.log(

    "🗑️ CAL apagados:",

    total

  );
}

function gerarID_DIR(numero){

  return "CAL.DIR-" +

    String(numero)

      .padStart(4,"0");

}

function gerarID_VIP(numero){

  return "CAL.VIP-" +

    String(numero)

      .padStart(4,"0");

}

async function gerarPDF(id, template){

  const url =
    `https://ticket-system-ow17.onrender.com/t/${id}`;

  const qrBase64 =
    await QRCode.toDataURL(url);

  const pdfDoc =
    await PDFDocument.create();

  const page =
    pdfDoc.addPage([500,1000]);

  const imageBytes =
    fs.readFileSync(template);

  const bg =
    await pdfDoc.embedPng(imageBytes);

  page.drawImage(bg,{

    x:0,
    y:0,

    width:500,
    height:1000

  });

  const qrBytes =
    Buffer.from(

      qrBase64.split(",")[1],

      "base64"

    );

  const qr =
    await pdfDoc.embedPng(qrBytes);

  page.drawImage(qr,{

    x:120,
    y:260,

    width:260,
    height:260

  });

  page.drawText(id,{

    x:165,
    y:240,

    size:20

  });

  const pdfBytes =
    await pdfDoc.save();

  fs.writeFileSync(

    path.join(

      OUTPUT,

      `${id}.pdf`

    ),

    pdfBytes

  );

}

async function criarDiretores(){

  for(let i=1;i<=TOTAL_DIR;i++){

    const id =
      gerarID_DIR(i);

    await db
      .collection("tickets")
      .doc(id)
      .set({

        created_at:
          new Date(),

        active:true,

        activated_at:
          new Date(),

        meal_limit:999,

        used_meals:[],

        last_meal_time:null

      });

    await gerarPDF(

      id,

      TEMPLATE_DIR

    );

    console.log(

      "✅",

      id

    );

  }

}

async function criarVIP(){

  for(let i=1;i<=TOTAL_VIP;i++){

    const id =
      gerarID_VIP(i);

    await db
      .collection("tickets")
      .doc(id)
      .set({

        created_at:
          new Date(),

        active:true,

        activated_at:
          new Date(),

        meal_limit:3,

        used_meals:[],

        last_meal_time:null

      });

    await gerarPDF(

      id,

      TEMPLATE_VIP

    );

    console.log(

      "✅",

      id

    );

  }

}

async function start(){

  try{

    console.log(
      "🗑️ A apagar CAL antigos..."
    );

    await apagarCAL();

    console.log(
      "👑 A criar CAL.DIR..."
    );

    await criarDiretores();

    console.log(
      "🎟️ A criar CAL.VIP..."
    );

    await criarVIP();

    console.log("");

    console.log(
      "✅ Processo concluído."
    );

    console.log(
      "📁 PDFs:",
      OUTPUT
    );

    console.log(
      "🎉 14 bilhetes CAL gerados com sucesso!"
    );

  }

  catch(err){

    console.error(err);

  }

}

start();

