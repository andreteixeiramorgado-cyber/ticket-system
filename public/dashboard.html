const express = require("express");
const path = require("path");
const session = require("express-session");
const db = require("./firebase");

const app = express();

const PORT =
  process.env.PORT || 3000;


// ======================================================
// SESSION
// ======================================================

app.use(session({

  secret:"segredo_super_forte_123",

  resave:false,

  saveUninitialized:false
}));


app.use(express.json());

app.use(express.static("public"));


// ======================================================
// LOGIN
// ======================================================

app.post("/login", (req,res)=>{

  const {
    username,
    password
  } = req.body;


  if(
    username === "Odisseia" &&
    password === "3764"
  ){

    req.session.auth = true;

    return res.json({
      success:true
    });
  }

  res.status(401).json({
    success:false
  });
});


// ======================================================
// AUTH
// ======================================================

function checkAuth(req,res,next){

  if(req.session.auth){
    return next();
  }

  res.status(401)
  .send("Não autorizado");
}


// ======================================================
// VALIDAR QR
// ======================================================

app.get(

  "/api/check/:id",

  checkAuth,

async (req,res)=>{

  try{

    const id =
      req.params.id;

    const refeicao =
      req.query.refeicao || null;

    const docRef =
      db.collection("tickets")
      .doc(id);

    const doc =
      await docRef.get();


    if(!doc.exists){

      return res.json({
        status:"invalid"
      });
    }

    const ticket =
      doc.data();


    if(!ticket.active){

      return res.json({
        status:"not_active"
      });
    }


    const rsProm =
      id.includes("RSprom");

    const boss =
      id.includes("BOSS");

    const entradas =
      ticket.entradas || 0;


    // EVT / RSC
    if(

      !rsProm &&
      !boss &&
      ticket.used

    ){

      return res.json({
        status:"used"
      });
    }


    // RSprom limite 3
    if(

      rsProm &&
      entradas >= 3

    ){

      return res.json({
        status:"limit"
      });
    }


    // ======================================================
    // EVT / RSC
    // ======================================================

    if(
      !rsProm &&
      !boss
    ){

      const refeicoes =
        ticket.refeicoes || [];

      if(
        !refeicoes.includes(refeicao)
      ){

        refeicoes.push(refeicao);
      }

      await docRef.update({

        used:true,

        checkin_time:
          new Date(),

        refeicoes
      });
    }


    // ======================================================
    // RSprom
    // ======================================================

    else if(rsProm){

      const historico =
        ticket.historico_refeicoes || [];

      historico.push(refeicao);

      await docRef.update({

        entradas:
          entradas + 1,

        last_checkin:
          new Date(),

        historico_refeicoes:
          historico
      });
    }


    // ======================================================
    // BOSS
    // ======================================================

    else if(boss){

      const historico =
        ticket.historico_refeicoes || [];

      historico.push(refeicao);

      await docRef.update({

        entradas:
          entradas + 1,

        last_checkin:
          new Date(),

        historico_refeicoes:
          historico
      });
    }

    return res.json({
      status:"valid"
    });

  }

  catch(err){

    console.error(err);

    res.status(500).json({
      status:"error"
    });
  }
});


// ======================================================
// ATIVAR BILHETE
// ======================================================

app.get(

  "/api/activate/:id",

  checkAuth,

async (req,res)=>{

  try{

    const id =
      req.params.id;

    const cliente =
      req.query.cliente || "Sem Nome";

    const docRef =
      db.collection("tickets")
      .doc(id);

    const doc =
      await docRef.get();

    if(!doc.exists){

      return res.json({
        status:"invalid"
      });
    }

    await docRef.update({

      active:true,

      activated_at:
        new Date(),

      cliente
    });

    return res.json({
      status:"activated"
    });

  }

  catch(err){

    console.error(err);

    res.status(500).json({
      status:"error"
    });
  }
});


// ======================================================
// DASHBOARD
// ======================================================

app.get(

  "/api/dashboard",

  checkAuth,

async (req,res)=>{

  try{

    const snapshot =
      await db.collection("tickets")
      .get();


    let evtVendidos = 0;
    let evtEntradas = 0;

    let rscAtivados = 0;
    let rscEntradas = 0;

    let promAtivados = 0;
    let promEntradas = 0;

    let bossAtivados = 0;
    let bossEntradas = 0;


    snapshot.forEach(doc => {

      const id =
        doc.id;

      const t =
        doc.data();


      // EVT
      if(id.includes("EVT")){

        if(t.active){

          evtVendidos++;
        }

        if(t.refeicoes){

          evtEntradas +=
            t.refeicoes.length;
        }
      }


      // RSC
      if(id.includes("RSC")){

        if(t.active){

          rscAtivados++;
        }

        if(t.refeicoes){

          rscEntradas +=
            t.refeicoes.length;
        }
      }


      // RSprom
      if(id.includes("RSprom")){

        if(t.active){

          promAtivados++;
        }

        if(t.historico_refeicoes){

          promEntradas +=
            t.historico_refeicoes.length;
        }
      }


      // BOSS
      if(id.includes("BOSS")){

        if(t.active){

          bossAtivados++;
        }

        if(t.historico_refeicoes){

          bossEntradas +=
            t.historico_refeicoes.length;
        }
      }

    });


    res.json({

      evtVendidos,
      evtEntradas,

      rscAtivados,
      rscEntradas,

      promAtivados,
      promEntradas,

      bossAtivados,
      bossEntradas
    });

  }

  catch(err){

    console.error(err);

    res.status(500).json({
      error:true
    });
  }
});


// ======================================================
// PÁGINAS
// ======================================================

app.get(
  "/dashboard.html",
  checkAuth,
(req,res)=>{

  res.sendFile(
    path.join(
      __dirname,
      "public/dashboard.html"
    )
  );
});

app.get(
  "/scanner.html",
  checkAuth,
(req,res)=>{

  res.sendFile(
    path.join(
      __dirname,
      "public/scanner.html"
    )
  );
});

app.get(
  "/ativar.html",
  checkAuth,
(req,res)=>{

  res.sendFile(
    path.join(
      __dirname,
      "public/ativar.html"
    )
  );
});

app.get(
  "/admin.html",
  checkAuth,
(req,res)=>{

  res.sendFile(
    path.join(
      __dirname,
      "public/admin.html"
    )
  );
});

app.get("/t/:id", (req,res)=>{

  res.sendFile(
    path.join(
      __dirname,
      "public/ticket.html"
    )
  );
});


// ======================================================
// LOGOUT
// ======================================================

app.get("/logout", (req,res)=>{

  req.session.destroy();

  res.redirect("/");
});


// ======================================================
// SERVER
// ======================================================

app.listen(PORT, ()=>{

  console.log(
    "🚀 Server running on port",
    PORT
  );
});
