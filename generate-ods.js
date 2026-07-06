const fs = require("fs");
const path = require("path");

const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

const db = require("./firebase");

const TOTAL = 500;

const PREFIXO = "ODS";

const PASTA = path.join(
  __dirname,
  "tickets",
  "ODS"
);

const IMAGEM = path.join(
  __dirname,
  "ticket odisseia.png"
);

if(!fs.existsSync(PASTA)){

  fs.mkdirSync(PASTA,{
    recursive:true
  });

}

const fs = require("fs");
const path = require("path");

const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

const db = require("./firebase");

const TOTAL = 500;

const PREFIXO = "ODS";

const PASTA = path.join(
  __dirname,
  "tickets",
  "ODS"
);

const IMAGEM = path.join(
  __dirname,
  "ticket odisseia.png"
);

if(!fs.existsSync(PASTA)){

  fs.mkdirSync(PASTA,{
    recursive:true
  });

}

// ======================================================
// GERAR CÓDIGO
// ======================================================

function gerarCodigo(){

  const chars =

    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  let codigo = PREFIXO + "-";

  for(let i=0;i<8;i++){

    codigo +=

      chars.charAt(

        Math.floor(

          Math.random() * chars.length

        )

      );

  }

  return codigo;

}

// ======================================================
// GERAR PDF
// ======================================================

async function gerarPDF(codigo){

  const pdf = new PDFDocument({

    size:[1200,600],

    margin:0

  });

  const ficheiro = path.join(

    PASTA,

    `${codigo}.pdf`

  );

  const stream =

    fs.createWriteStream(ficheiro);

  pdf.pipe(stream);

  // Fundo

  pdf.image(

    IMAGEM,

    0,

    0,

    {

      width:1200,

      height:600

    }

  );

  // QR Code

  const qr =

    await QRCode.toDataURL(codigo);

  const base64 =

    qr.replace(

      /^data:image\/png;base64,/,

      ""

    );

  const buffer =

    Buffer.from(

      base64,

      "base64"

    );

  pdf.image(

    buffer,

    885,

    145,

    {

      width:215,

      height:215

    }

  );

  // Código visível

  pdf.fontSize(24);

  pdf.fillColor("black");

  pdf.text(

    codigo,

    820,

    520,

    {

      width:320,

      align:"center"

    }

  );

  pdf.end();

  return new Promise(resolve=>{

    stream.on(

      "finish",

      resolve

    );

  });

}

// ======================================================
// APAGAR ODS ANTIGOS
// ======================================================

async function limparODS(){

  console.log("🗑️ A apagar ODS antigos...");

  const snapshot =
    await db.collection("tickets").get();

  const batch =
    db.batch();

  snapshot.forEach(doc=>{

    if(doc.id.startsWith("ODS-")){

      batch.delete(doc.ref);

    }

  });

  await batch.commit();

  if(fs.existsSync(PASTA)){

    fs.readdirSync(PASTA).forEach(f=>{

      fs.unlinkSync(

        path.join(PASTA,f)

      );

    });

  }

  console.log("✅ ODS antigos apagados.");

}

// ======================================================
// GERAR TICKETS
// ======================================================

async function gerarTickets(){

  await limparODS();

  console.log("");

  console.log("A gerar bilhetes ODS...");

  const usados = new Set();

  for(let i=1;i<=TOTAL;i++){

    let codigo;

while(true){

  codigo = gerarCodigo();

  if(usados.has(codigo))
    continue;

  const existe =

    await db
      .collection("tickets")
      .doc(codigo)
      .get();

  if(existe.exists)
    continue;

  usados.add(codigo);

  break;

}

await db
  .collection("tickets")
  .doc(codigo)
  .set({

        active:false,

        cliente:"",

        meal_limit:1,

        used_meals:[],

        last_meal_time:null,

        activated_at:null

      });

    await gerarPDF(codigo);

    console.log(

      `${i}/${TOTAL}  ${codigo}`

    );

  }

  console.log("");

  console.log("✅ 500 bilhetes ODS criados.");

}

gerarTickets();


