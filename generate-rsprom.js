const db = require("./firebase");

const { PDFDocument } = require("pdf-lib");

const QRCode = require("qrcode");

const fs = require("fs");

const path = require("path");

const TOTAL = 30;

const OUTPUT = "./tickets/RSprom";

const TEMPLATE = "./ticket Rally Series.png";

if (!fs.existsSync(OUTPUT)) {
  fs.mkdirSync(OUTPUT, { recursive: true });
}

function gerarID(numero){

  return "RSprom-" +

    String(numero).padStart(4,"0");

}

async function apagarRSprom(){

  const snapshot =

    await db.collection("tickets").get();

  let total = 0;

  for(const doc of snapshot.docs){

    if(doc.id.startsWith("RSprom-")){

      await doc.ref.delete();

      total++;

    }

  }

  console.log("🗑️ Apagados:",total);

}

async function gerarPDF(id){

  const url =
    `https://ticket-system-ow17.onrender.com/t/${id}`;

  const qrBase64 =
    await QRCode.toDataURL(url);

  const pdfDoc =
    await PDFDocument.create();

  const page =
    pdfDoc.addPage([1200,600]);

  const imageBytes =
    fs.readFileSync(TEMPLATE);

  const bg =
    await pdfDoc.embedPng(imageBytes);

  page.drawImage(bg,{

    x:0,
    y:0,

    width:1200,
    height:600

  });

  const qrBytes =
    Buffer.from(
      qrBase64.split(",")[1],
      "base64"
    );

  const qr =
    await pdfDoc.embedPng(qrBytes);

  page.drawImage(qr,{

    x:860,
    y:270,

    width:305,
    height:305

  });

  page.drawText(id,{

    x:945,
    y:265,

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

async function criarTickets(){

  for(let i=1;i<=TOTAL;i++){

    const id = gerarID(i);

    await db
      .collection("tickets")
      .doc(id)
      .set({

        created_at:new Date(),

        active:true,

        activated_at:new Date(),

        meal_limit:3,

        used_meals:[],

        last_meal_time:null

      });

    await gerarPDF(id);

    console.log("✅",id);

  }

}

async function start(){

  try{

    console.log("🗑️ A apagar RSprom antigos...");

    await apagarRSprom();

    console.log("🎟️ A criar novos RSprom...");

    await criarTickets();

    console.log("");

    console.log("✅ Processo concluído.");

    console.log("📁 PDFs:", OUTPUT);

    console.log("🎉 30 RSprom gerados com sucesso!");

  }

  catch(err){

    console.error(err);

  }

}

start();
