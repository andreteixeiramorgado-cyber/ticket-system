const xlsx = require('xlsx');
const { PDFDocument } = require('pdf-lib');
const QRCode = require('qrcode');
const fs = require('fs');
const db = require('./firebase');

function gerarID() {
  return "BOSS -" + Math.random().toString(36).substring(2, 10).toUpperCase();
}


async function gerarBilhetes() {
  const workbook = xlsx.readFile('bilhetes.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const dados = xlsx.utils.sheet_to_json(sheet);

  for (const pessoa of dados) {
    const id = gerarID();
    const url = `https://ticket-system-ow17.onrender.com/t/${id}`; // ⚠️ mete o teu IP

    // guardar no Firebase
    await db.collection("tickets").doc(id).set({
      active: false,   // 🔥 novo
      used: false,
      nome: pessoa.nome || "",
      email: pessoa.email || "",
      tipo: pessoa.tipo || "Geral",
      created_at: new Date()
    });

    // gerar QR
    const qrBase64 = await QRCode.toDataURL(url);

    // carregar template
    const templateBytes = fs.readFileSync('./ticket.png');

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([1200, 600]);

    const bg = await pdfDoc.embedPng(templateBytes);
    page.drawImage(bg, { x: 0, y: 0, width: 1200, height: 600 });

    // QR
    const qrBytes = Buffer.from(qrBase64.split(',')[1], 'base64');
    const qrImage = await pdfDoc.embedPng(qrBytes);

    page.drawImage(qrImage, {
      x: 860,
      y: 270,
      width: 300,
      height: 300
    });

    // nome (opcional)
    // page.drawText(pessoa.nome || "", {
    //   x: 910,
    //   y: 300,
    //   size: 20
    //   });

    // código
    page.drawText(id, {
      x: 940,
      y: 260,
      size: 20
    });

    // guardar PDF
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(`tickets/ticket-${id}.pdf`, pdfBytes);

    console.log("🎟️ Gerado:", pessoa.nome, id);
  }

  console.log("✅ Todos os bilhetes gerados!");
}

gerarBilhetes();