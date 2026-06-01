const express = require("express");
const path = require("path");
const session = require("express-session");
const db = require("./firebase");
const XLSX = require("xlsx");

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

app.post("/login",(req,res)=>{

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

async(req,res)=>{

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


    // ======================================================
    // EVT / RSC NOVO SISTEMA
    // ======================================================

    if(
      !rsProm &&
      !boss
    ){

      const allowed =
        ticket.allowed_meals || [];

      const used =
        ticket.used_meals || [];

      const lastMeal =
        ticket.last_meal_time || null;


      // tem direito?

      if(

        !allowed.includes(
          refeicao
        )

      ){

        return res.json({

          status:"meal_not_allowed"
        });
      }


      // já usou?

      if(

        used.includes(
          refeicao
        )

      ){

        return res.json({

          status:"meal_used"
        });
      }


      // regra 4 horas

      if(lastMeal){

        const diffHours =

          (

            Date.now() -

            new Date(lastMeal)
            .getTime()

          )

          /

          1000

          /

          60

          /

          60;


        if(diffHours < 4){

          return res.json({

            status:"wait_4_hours"
          });
        }
      }


      used.push(refeicao);

      await docRef.update({

        used_meals:used,

        last_meal_time:
          new Date()
      });

      return res.json({

        status:"valid"
      });
    }


    // ======================================================
    // RSPROM
    // ======================================================

    if(

      rsProm &&
      entradas >= 3

    ){

      return res.json({

        status:"limit"
      });
    }


    if(rsProm){

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

      return res.json({

        status:"valid"
      });
    }


    // ======================================================
    // BOSS
    // ======================================================

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
    // RSPROM
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

async(req,res)=>{

  try{

    const id =
      req.params.id;

    const cliente =
      req.query.cliente || "Sem Nome";

    const nrRefeicoes =
      parseInt(
        req.query.refeicoes || "1"
      );

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

    let allowed_meals = [];

    if(nrRefeicoes >= 1)
      allowed_meals.push("dia1_almoco");

    if(nrRefeicoes >= 2)
      allowed_meals.push("dia1_jantar");

    if(nrRefeicoes >= 3)
      allowed_meals.push("dia2_almoco");

    if(nrRefeicoes >= 4)
      allowed_meals.push("dia2_jantar");

    if(nrRefeicoes >= 5)
      allowed_meals.push("dia3_almoco");


    await docRef.update({

      active:true,

      activated_at:
        new Date(),

      cliente,

      allowed_meals,

      used_meals:[],

      last_meal_time:null
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
// DASHBOARD API
// ======================================================

app.get(

  "/api/dashboard",

  checkAuth,

async(req,res)=>{

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

    let evtResumo = {};
    let rscResumo = {};


    snapshot.forEach(doc=>{

      const id =
        doc.id;

      const t =
        doc.data();


      // ======================================================
      // EVT
      // ======================================================

      if(id.includes("EVT")){

        if(t.active){

          evtVendidos++;
        }

        evtEntradas +=
          t.used ? 1 : 0;


        const cliente =
          t.cliente || "Sem Nome";

        const refeicao =
          (t.refeicoes || [])[0] || "-";

        const key =
          cliente + "|" + refeicao;


        if(!evtResumo[key]){

          evtResumo[key] = {

            cliente,
            refeicao,
            quantidade:0
          };
        }

        evtResumo[key].quantidade +=
          t.used ? 1 : 0;
      }


      // ======================================================
      // RSC
      // ======================================================

      if(id.includes("RSC")){

        if(t.active){

          rscAtivados++;
        }

        rscEntradas +=
          t.used ? 1 : 0;


        const cliente =
          t.cliente || "Sem Nome";

        const refeicao =
          (t.refeicoes || [])[0] || "-";

        const key =
          cliente + "|" + refeicao;


        if(!rscResumo[key]){

          rscResumo[key] = {

            cliente,
            refeicao,
            quantidade:0
          };
        }

        rscResumo[key].quantidade +=
          t.used ? 1 : 0;
      }


      // ======================================================
      // RSPROM
      // ======================================================

      if(id.includes("RSprom")){

        if(t.active){

          promAtivados++;
        }

        promEntradas +=
          (t.historico_refeicoes || []).length;
      }


      // ======================================================
      // BOSS
      // ======================================================

      if(id.includes("BOSS")){

        if(t.active){

          bossAtivados++;
        }

        bossEntradas +=
          (t.historico_refeicoes || []).length;
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
      bossEntradas,

      evtTabela:
        Object.values(evtResumo),

      rscTabela:
        Object.values(rscResumo)
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
// EXPORT CSV
// ======================================================

app.get(

  "/api/export/:tipo",

async(req,res)=>{

  const tipo =
    req.params.tipo;

  const snapshot =
    await db.collection("tickets")
    .get();

  let rows = [];


  snapshot.forEach(doc=>{

    const id =
      doc.id;

    const t =
      doc.data();


    // EVT
    if(
      tipo === "csv_evt" &&
      id.includes("EVT")
    ){

      rows.push({

        ID:id,

        Cliente:
          t.cliente || "",

        Ativo:
          t.active || false,

        Entradas:
          t.used ? 1 : 0,

        Refeicao:
          (t.refeicoes || [])
          .join(" | ")
      });
    }


    // VIP
    if(
      tipo === "csv_vip" &&
      (
        id.includes("RSprom") ||
        id.includes("BOSS")
      )
    ){

      rows.push({

        ID:id,

        Cliente:
          t.cliente || "",

        Entradas:
          t.entradas || 0,

        Refeicao:
          (t.historico_refeicoes || [])
          .join(" | ")
      });
    }


    // RSC
    if(
      tipo === "csv_rsc" &&
      id.includes("RSC")
    ){

      rows.push({

        ID:id,

        Cliente:
          t.cliente || "",

        Ativo:
          t.active || false,

        Entradas:
          t.used ? 1 : 0,

        Refeicao:
          (t.refeicoes || [])
          .join(" | ")
      });
    }

  });


  const ws =
    XLSX.utils.json_to_sheet(rows);

  const wb =
    XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    ws,
    "Relatorio"
  );

  const buffer =
    XLSX.write(wb,{

      type:"buffer",

      bookType:"csv"
    });

  res.setHeader(

    "Content-Disposition",

    `attachment; filename=${tipo}.csv`
  );

  res.send(buffer);
});


// ======================================================
// EXPORT EXCEL
// ======================================================

app.get(

  "/api/excel/:tipo",

async(req,res)=>{

  const tipo =
    req.params.tipo;

  const snapshot =
    await db.collection("tickets")
    .get();

  let rows = [];


  snapshot.forEach(doc=>{

    const id =
      doc.id;

    const t =
      doc.data();


    // EVT
    if(
      tipo === "excel_evt" &&
      id.includes("EVT")
    ){

      rows.push({

        ID:id,

        Cliente:
          t.cliente || "",

        Ativo:
          t.active || false,

        Entradas:
          t.used ? 1 : 0,

        Refeicao:
          (t.refeicoes || [])
          .join(" | ")
      });
    }


    // VIP
    if(
      tipo === "excel_vip" &&
      (
        id.includes("RSprom") ||
        id.includes("BOSS")
      )
    ){

      rows.push({

        ID:id,

        Cliente:
          t.cliente || "",

        Entradas:
          t.entradas || 0,

        Refeicao:
          (t.historico_refeicoes || [])
          .join(" | ")
      });
    }


    // RSC
    if(
      tipo === "excel_rsc" &&
      id.includes("RSC")
    ){

      rows.push({

        ID:id,

        Cliente:
          t.cliente || "",

        Ativo:
          t.active || false,

        Entradas:
          t.used ? 1 : 0,

        Refeicao:
          (t.refeicoes || [])
          .join(" | ")
      });
    }

  });


  const ws =
    XLSX.utils.json_to_sheet(rows);

  const wb =
    XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    ws,
    "Relatorio"
  );

  const buffer =
    XLSX.write(wb,{

      type:"buffer",

      bookType:"xlsx"
    });

  res.setHeader(

    "Content-Disposition",

    `attachment; filename=${tipo}.xlsx`
  );

  res.send(buffer);
});


// ======================================================
// ADMIN
// ======================================================

app.get(

  "/api/admin/:tipo",

async(req,res)=>{

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

  const snapshot =
    await db.collection("tickets")
    .get();

  let total = 0;


  // RESET EVT
  if(tipo === "reset_evt"){

    for(const doc of snapshot.docs){

      if(doc.id.includes("EVT")){

        await doc.ref.update({

          active:false,
          used:false,
          refeicoes:[]
        });

        total++;
      }
    }

    return res.json({

      message:
        "♻️ EVT resetados: " +
        total
    });
  }


  // RESET VIP
  if(tipo === "reset_vip"){

    for(const doc of snapshot.docs){

      if(

        doc.id.includes("RSprom") ||

        doc.id.includes("BOSS")

      ){

        await doc.ref.update({

          active:false,
          entradas:0,
          historico_refeicoes:[]
        });

        total++;
      }
    }

    return res.json({

      message:
        "♻️ VIP resetados: " +
        total
    });
  }


  // RESET RSC
  if(tipo === "reset_rsc"){

    for(const doc of snapshot.docs){

      if(doc.id.includes("RSC")){

        await doc.ref.update({

          active:false,
          used:false,
          refeicoes:[]
        });

        total++;
      }
    }

    return res.json({

      message:
        "♻️ RSC resetados: " +
        total
    });
  }


  // DESATIVAR RSC NÃO USADOS
  if(tipo === "desativar_rsc_unused"){

    for(const doc of snapshot.docs){

      if(doc.id.includes("RSC")){

        const t =
          doc.data();

        if(!t.used){

          await doc.ref.update({

            active:false
          });

          total++;
        }
      }
    }

    return res.json({

      message:
        "❌ RSC desativados: " +
        total
    });
  }


  // ATIVAR RSPROM
  if(tipo === "ativar_rsprom"){

    for(const doc of snapshot.docs){

      if(doc.id.includes("RSprom")){

        await doc.ref.update({

          active:true
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


  // ATIVAR RSC
  if(tipo === "ativar_rsc"){

    for(const doc of snapshot.docs){

      if(doc.id.includes("RSC")){

        await doc.ref.update({

          active:true
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


  return res.json({

    message:"OK"
  });
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

app.get("/t/:id",(req,res)=>{

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

app.get("/logout",(req,res)=>{

  req.session.destroy();

  res.redirect("/");
});


// ======================================================
// SERVER
// ======================================================

app.listen(PORT,()=>{

  console.log(
    "🚀 Server running on port",
    PORT
  );
});
