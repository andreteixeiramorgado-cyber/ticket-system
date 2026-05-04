const db = require("./firebase");

async function test() {
  try {
    console.log("A iniciar...");

    await db.collection("test").doc("hello").set({
      message: "funciona 🔥"
    });

    console.log("✅ Dados enviados com sucesso!");
  } catch (err) {
    console.error("❌ ERRO:", err);
  }
}

test();