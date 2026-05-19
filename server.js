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


    // inválido
    if(!doc.exists){

      return res.json({
        status:"invalid"
      });
    }

    const ticket =
      doc.data();


    // não ativado
    if(!ticket.active){

      return res.json({
        status:"not_active"
      });
    }


    // tipos especiais
    const rsProm =
      id.includes("RSprom");

    const boss =
      id.includes("BOSS");

    const entradas =
      ticket.entradas || 0;


    // EVT já usado
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
    // EVT NORMAL
    // ======================================================

    if(!rsProm && !boss){

      await docRef.update({

        used:true,

        checkin_time:
          new Date(),

        ultima_refeicao:
          refeicao
      });
    }


    // ======================================================
    // RSprom
    // ======================================================

    else if(rsProm){

      await docRef.update({

        entradas:
          entradas + 1,

        last_checkin:
          new Date(),

        ultima_refeicao:
          refeicao
      });
    }


    // ======================================================
    // BOSS
    // ======================================================

    else if(boss){

      await docRef.update({

        entradas:
          entradas + 1,

        last_checkin:
          new Date(),

        ultima_refeicao:
          refeicao
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
// ATIVAR
// ======================================================

app.get(

  "/api/activate/:id",

  checkAuth,

async (req,res)=>{

  try{

    const id =
      req.params.id;

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
        new Date()
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
// STATUS
// ======================================================

app.get(

  "/api/status/:id",

async (req,res)=>{

  const id =
    req.params.id;

  const doc =
    await db.collection("tickets")
    .doc(id)
    .get();

  if(!doc.exists){

    return res.json({
      status:"invalid"
    });
  }

  const ticket =
    doc.data();

  if(ticket.used){

    return res.json({
      status:"used"
    });
  }

  return res.json({
    status:"valid"
  });
});


// ======================================================
// STATS POR REFEIÇÃO
// ======================================================

app.get(

  "/api/stats/:grupo/:refeicao",

  checkAuth,

async (req,res)=>{

  try{

    const grupo =
      req.params.grupo;

    const refeicao =
      req.params.refeicao;

    const snapshot =
      await db.collection("tickets")
      .get();

    let total = 0;

    snapshot.forEach(doc => {

      const id =
        doc.id;

      const t =
        doc.data();


      // ======================================================
      // RACE READY
      // ======================================================

      if(grupo === "evt"){

        if(

          id.includes("EVT") &&

          t.ultima_refeicao === refeicao

        ){

          total++;
        }
      }


      // ======================================================
      // RALLY SERIES
      // ======================================================

      if(grupo === "rally"){


        // RSprom
        if(

          id.includes("RSprom") &&

          t.ultima_refeicao === refeicao

        ){

          total +=
            t.entradas || 0;
        }


        // BOSS
        if(

          id.includes("BOSS") &&

          t.ultima_refeicao === refeicao

        ){

          total +=
            t.entradas || 0;
        }


        // RSC
        if(

          id.includes("RSC") &&

          t.ultima_refeicao === refeicao

        ){

          total++;
        }
      }

    });

    res.json({
      total
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

    let total = 0;

    let ativos = 0;

    let usados = 0;

    snapshot.forEach(doc => {

      total++;

      const t =
        doc.data();

      if(t.active){
        ativos++;
      }

      if(

        t.used ||

        (
          t.entradas &&
          t.entradas > 0
        )

      ){
        usados++;
      }
    });

    res.json({

      total,
      ativos,
      usados
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
// ADMIN
// ======================================================

app.get(

  "/api/admin/:tipo",

async (req,res)=>{

  const key =
    req.query.key;

  if(key !== "admin2468"){

    return res.status(401)
    .json({

      message:"Sem acesso"
    });
  }

  const tipo =
    req.params.tipo;

  try{

    const snapshot =
      await db.collection("tickets")
      .get();

    let total = 0;

    for(const doc of snapshot.docs){

      const id =
        doc.id;


      // EVT
      if(

        tipo === "reset_evt" &&
        id.includes("EVT")

      ){

        await db.collection("tickets")
        .doc(id)
        .update({

          active:false,
          used:false,
          entradas:0,

          activated_at:null,
          checkin_time:null,
          last_checkin:null,
          ultima_refeicao:null
        });

        total++;
      }


      // VIP
      if(

        tipo === "reset_vip" &&

        (
          id.includes("RSprom") ||
          id.includes("BOSS")
        )

      ){

        await db.collection("tickets")
        .doc(id)
        .update({

          active:false,
          used:false,
          entradas:0,

          activated_at:null,
          checkin_time:null,
          last_checkin:null,
          ultima_refeicao:null
        });

        total++;
      }


      // RSC
      if(

        tipo === "reset_rsc" &&
        id.includes("RSC")

      ){

        await db.collection("tickets")
        .doc(id)
        .update({

          active:false,
          used:false,
          entradas:0,

          activated_at:null,
          checkin_time:null,
          last_checkin:null,
          ultima_refeicao:null
        });

        total++;
      }
    }

    res.json({

      message:
        "✅ Reset concluído: " +
        total
    });

  }

  catch(err){

    console.error(err);

    res.status(500).json({

      message:"Erro interno"
    });
  }
});


// ======================================================
// PÁGINAS
// ======================================================

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


// ======================================================
// QR PAGE
// ======================================================

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