const QRCode = require("qrcode");
const db = require("./firebase");

function gerarID() {
  return "EVT-" + Math.random().toString(36).substring(2, 10).toUpperCase();
}

async function criarBilhete() {
  try {
    const id = gerarID();

    // guardar no Firebase
    await db.collection("tickets").doc(id).set({
      used: false,
      created_at: new Date()
    });

    // gerar QR
    const url = `http://192.168.1.193:3000/t/${id}`;
    await QRCode.toFile(`${id}.png`, url);

    console.log("🎟️ Bilhete criado:", id);
  } catch (err) {
    console.error("Erro:", err);
  }
}

criarBilhete();