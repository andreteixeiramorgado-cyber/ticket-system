const express = require("express");
const path = require("path");
const db = require("./firebase");

const app = express();
const PORT = process.env.PORT || 3000;
const QRCode = require("qrcode");
const { PDFDocument } = require("pdf-lib");
const fs = require("fs");

async function criarBilhete() {
  const id = gerarID();
  const url = `http://192.168.1.193:3000/t/${id}`; // ⚠️ mete o teu IP

  // guardar no Firebase
  await db.collection("tickets").doc(id).set({
    used: false,
    created_at: new Date()
  });

  // gerar QR em base64
  const qrBase64 = await QRCode.toDataURL(url);

  // carregar imagem do template
  const existingImageBytes = fs.readFileSync('./ticket.png');

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([1200, 600]); // ajusta se necessário

  const bgImage = await pdfDoc.embedPng(existingImageBytes);

  // desenhar fundo (teu design)
  page.drawImage(bgImage, {
    x: 0,
    y: 0,
    width: 1200,
    height: 600
  });

  // converter QR
  const qrImageBytes = Buffer.from(qrBase64.split(',')[1], 'base64');
  const qrImage = await pdfDoc.embedPng(qrImageBytes);

  // 📍 POSIÇÃO DO QR (ajusta fino aqui)
  page.drawImage(qrImage, {
    x: 400,
    y: 110,
    width: 360,
    height: 360
  });

  // 🔢 Código visível
  page.drawText(id, {
    x: 500,
    y: 70,
    size: 20
  });

  // guardar PDF
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(`ticket-${id}.pdf`, pdfBytes);

  console.log("🎟️ Bilhete criado:", id);
}
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
app.use(express.static("public"));

// validar bilhete
app.get("/api/check/:id", async (req, res) => {
  const id = req.params.id;

  const doc = await db.collection("tickets").doc(id).get();

  if (!doc.exists) {
    return res.json({ status: "invalid" });
  }

  const ticket = doc.data();

  if (ticket.used) {
    return res.json({ status: "used" });
  }

  // marcar como usado
  await db.collection("tickets").doc(id).update({
    used: true,
    checkin_time: new Date()
  });

  return res.json({ status: "valid" });
});

// página do QR
app.get("/t/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.listen(3000, () => console.log("🚀 Running on http://localhost:3000"));
