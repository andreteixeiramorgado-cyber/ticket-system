const express = require("express");
const path = require("path");
const db = require("./firebase");

const app = express();
const PORT = process.env.PORT || 3000;
const QRCode = require("qrcode");
const { PDFDocument } = require("pdf-lib");
const fs = require("fs");


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
