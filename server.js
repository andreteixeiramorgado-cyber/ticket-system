const express = require("express");
const path = require("path");
const session = require("express-session");
const db = require("./firebase");

const app = express();
const PORT = process.env.PORT || 3000;

// 🔐 sessão
app.use(session({
  secret: "segredo_super_forte_123",
  resave: false,
  saveUninitialized: true
}));

app.use(express.json());
app.use(express.static("public"));

// 👤 login
const USER = "Admin";
const PASS = "3764";

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (password !== "3764") {
    return res.status(401).json({ success: false });
  }

  // 👇 definir tipo de utilizador
  if (username === "Ativar") {
    req.session.auth = true;
    req.session.role = "ativar";
    return res.json({ success: true, role: "ativar" });
  }

  if (username === "refeicao") {
    req.session.auth = true;
    req.session.role = "scanner";
    return res.json({ success: true, role: "scanner" });
  }

  res.status(401).json({ success: false });
});

// 🔒 proteção
function checkAuth(req, res, next) {
  if (req.session.auth) return next();
  res.status(401).send("Não autorizado");
}

// 📊 VER ESTADO (QR)
app.get("/api/status/:id", async (req, res) => {
  const id = req.params.id;

  const doc = await db.collection("tickets").doc(id).get();

  if (!doc.exists) return res.json({ status: "invalid" });

  const ticket = doc.data();

  if (ticket.used) return res.json({ status: "used" });

  return res.json({ status: "valid" });
});

app.get("/api/activate/:id", checkAuth, async (req, res) => {
  const id = req.params.id;

  const doc = await db.collection("tickets").doc(id).get();

  if (!doc.exists) return res.json({ status: "invalid" });

  await db.collection("tickets").doc(id).update({
    active: true,
    activated_at: new Date()
  });

  return res.json({ status: "activated" });
});

// ✅ VALIDAR (scanner)
app.get("/api/check/:id", checkAuth, async (req, res) => {
  try {
    const id = req.params.id;

    const docRef = db.collection("tickets").doc(id);
    const doc = await docRef.get();

    // ❌ não existe
    if (!doc.exists) {
      return res.json({ status: "invalid" });
    }

    const ticket = doc.data();

    // ❌ NÃO ATIVADO (🔥 importante)
    if (!ticket.active) {
      return res.json({ status: "not_active" });
    }

    // ❌ já usado
    if (ticket.used) {
      return res.json({ status: "used" });
    }

    // ✅ marcar como usado
    await docRef.update({
      used: true,
      checkin_time: new Date()
    });

    return res.json({ status: "valid" });

  } catch (err) {
    console.error("Erro no check:", err);
    return res.status(500).json({ status: "error" });
  }
});
// 🎟️ página do bilhete
app.get("/t/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "public/ticket.html"));
});

// 🔒 scanner protegido
app.get("/scanner.html", checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public/scanner.html"));
});

// logout
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

// 🚀 servidor
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
