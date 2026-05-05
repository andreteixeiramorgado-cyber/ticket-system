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
const USER = "admin";
const PASS = "3764";

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === USER && password === PASS) {
    req.session.auth = true;
    return res.json({ success: true });
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

// ✅ VALIDAR (scanner)
app.get("/api/check/:id", checkAuth, async (req, res) => {
  const id = req.params.id;

  const doc = await db.collection("tickets").doc(id).get();

  if (!doc.exists) return res.json({ status: "invalid" });

  const ticket = doc.data();

  if (ticket.used) return res.json({ status: "used" });

  await db.collection("tickets").doc(id).update({
    used: true,
    checkin_time: new Date()
  });

  return res.json({ status: "valid" });
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
