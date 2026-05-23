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

          t.refeicoes &&

          t.refeicoes.includes(refeicao)

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

          t.historico_refeicoes

        ){

          total +=
            t.historico_refeicoes.filter(

              r => r === refeicao

            ).length;
        }


        // BOSS
        if(

          id.includes("BOSS") &&

          t.historico_refeicoes

        ){

          total +=
            t.historico_refeicoes.filter(

              r => r === refeicao

            ).length;
        }


        // RSC
        if(

          id.includes("RSC") &&

          t.refeicoes &&

          t.refeicoes.includes(refeicao)

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
// RELATÓRIOS
// ======================================================

app.get(

  "/api/relatorios",

  checkAuth,

async (req,res)=>{

  try{

    const snapshot =
      await db.collection("tickets")
      .get();

    let vendidos = 0;

    let entradas = 0;


    const evt = {

      dia1_almoco:0,
      dia1_jantar:0,
      dia2_almoco:0,
      dia2_jantar:0,
      dia3_almoco:0
    };

    const rally = {

      dia1_almoco:0,
      dia1_jantar:0,
      dia2_almoco:0
    };


    const boss = [];

    const prom = [];


    snapshot.forEach(doc => {

      const id =
        doc.id;

      const t =
        doc.data();


      // vendidos
      if(t.active){

        vendidos++;
      }


      // EVT
      if(

        id.includes("EVT") &&

        t.refeicoes

      ){

        t.refeicoes.forEach(r=>{

          if(evt[r] !== undefined){

            evt[r]++;
            entradas++;
          }
        });
      }


      // RSC
      if(

        id.includes("RSC") &&

        t.refeicoes

      ){

        t.refeicoes.forEach(r=>{

          if(rally[r] !== undefined){

            rally[r]++;
            entradas++;
          }
        });
      }


      // RSprom
      if(

        id.includes("RSprom")

      ){

        const hist =
          t.historico_refeicoes || [];

        hist.forEach(r=>{

          if(rally[r] !== undefined){

            rally[r]++;
            entradas++;
          }
        });

        prom.push({

          id,

          total:
            hist.length
        });
      }


      // BOSS
      if(

        id.includes("BOSS")

      ){

        const hist =
          t.historico_refeicoes || [];

        hist.forEach(r=>{

          if(rally[r] !== undefined){

            rally[r]++;
            entradas++;
          }
        });

        boss.push({

          id,

          total:
            hist.length
        });
      }

    });


    const evtArray = [

      {
        nome:"Dia 1 Almoço",
        total:evt.dia1_almoco
      },

      {
        nome:"Dia 1 Jantar",
        total:evt.dia1_jantar
      },

      {
        nome:"Dia 2 Almoço",
        total:evt.dia2_almoco
      },

      {
        nome:"Dia 2 Jantar",
        total:evt.dia2_jantar
      },

      {
        nome:"Dia 3 Almoço",
        total:evt.dia3_almoco
      }
    ];


    const rallyArray = [

      {
        nome:"Dia 1 Almoço",
        total:rally.dia1_almoco
      },

      {
        nome:"Dia 1 Jantar",
        total:rally.dia1_jantar
      },

      {
        nome:"Dia 2 Almoço",
        total:rally.dia2_almoco
      }
    ];


    boss.sort((a,b)=>

      b.total - a.total
    );

    prom.sort((a,b)=>

      b.total - a.total
    );


    const percentagem =

      vendidos > 0

      ?

      Math.round(
        (entradas / vendidos) * 100
      )

      :

      0;


    res.json({

      vendidos,

      entradas,

      percentagem,

      evt:evtArray,

      rally:rallyArray,

      boss,

      prom
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

    let vendidos = 0;

    let usados = 0;

    snapshot.forEach(doc => {

      total++;

      const t =
        doc.data();

      if(t.active){
        vendidos++;
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
      vendidos,
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


  // ======================================================
  // ATIVAR TODOS RSprom
  // ======================================================

  if(tipo === "ativar_rsprom"){

    const snapshot =
      await db.collection("tickets")
      .get();

    let total = 0;

    for(const doc of snapshot.docs){

      const id =
        doc.id;

      if(id.includes("RSprom")){

        await db.collection("tickets")
        .doc(id)
        .update({

          active:true,

          activated_at:
            new Date()
        });

        total++;
      }
    }

    return res.json({

      message:
        "🔥 RSprom ativados: " +
        total
    });
  }


  // ======================================================
  // ATIVAR TODOS RSC
  // ======================================================

  if(tipo === "ativar_rsc"){

    const snapshot =
      await db.collection("tickets")
      .get();

    let total = 0;

    for(const doc of snapshot.docs){

      const id =
        doc.id;

      if(id.includes("RSC")){

        await db.collection("tickets")
        .doc(id)
        .update({

          active:true,

          activated_at:
            new Date()
        });

        total++;
      }
    }

    return res.json({

      message:
        "🔥 RSC ativados: " +
        total
    });
  }


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

          refeicoes:[],
          historico_refeicoes:[]
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

          refeicoes:[],
          historico_refeicoes:[]
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

          refeicoes:[],
          historico_refeicoes:[]
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

app.get(

  "/relatorios.html",

  checkAuth,

(req,res)=>{

  res.sendFile(

    path.join(
      __dirname,
      "public/relatorios.html"
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
