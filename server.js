const express = require("express");
const path = require("path");
const db = require("./firebase");

const app = express();
const PORT = process.env.PORT || 3000;
const QRCode = require("qrcode");
const { PDFDocument } = require("pdf-lib");
const fs = require("fs");

function gerarID() {
  return "EVT-" + Math.random().toString(36).substring(2, 10).toUpperCase();
}

app.get("/create", async (req, res) => {
  try {
    const id = gerarID();
    const url = `https://ticket-system-ow17.onrender.com/t/${id}`;

    // guardar no Firebase
    if (db) {
      await db.collection("tickets").doc(id).set({
        used: false,
        created_at: new Date()
      });
    }

    // gerar QR
    const qrBase64 = await QRCode.toDataURL(url);

    // carregar template
    const templateBytes = fs.readFileSync('./ticket.png');

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([800, 400]);

    const bg = await pdfDoc.embedPng(templateBytes);
    page.drawImage(bg, { x: 0, y: 0, width: 800, height: 400 });

    const qrBytes = Buffer.from(qrBase64.split(',')[1], 'base64');
    const qrImage = await pdfDoc.embedPng(qrBytes);

    page.drawImage(qrImage, {
      x: 320,
      y: 110,
      width: 160,
      height: 160
    });

    page.drawText(id, {
      x: 350,
      y: 80,
      size: 10
    });

    const pdfBytes = await pdfDoc.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=ticket-${id}.pdf`);
    res.send(pdfBytes);

  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao criar bilhete");
  }
});
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
