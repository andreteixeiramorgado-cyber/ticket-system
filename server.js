const express = require("express");
const path = require("path");
const session = require("express-session");
const admin = require("firebase-admin");
const db = require("./firebase");
const XLSX = require("xlsx");
const { exec } = require("child_process");

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

    const isODS = id.startsWith("ODS-");

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


// EVT / RSC / ODS

if(
  !rsProm &&
  !boss
){

  const mealLimit =
    ticket.meal_limit || 1;

  const used =
    ticket.used_meals || [];

  const lastMeal =
    ticket.last_meal_time || null;


  // refeição repetida

  if(

    used.includes(
      refeicao
    )

  ){

    return res.json({

      status:"meal_used"
    });
  }


  // limite atingido

  if(

    used.length >=
    mealLimit

  ){

    return res.json({

      status:"limit"
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

if(rsProm){

  const mealLimit =
    ticket.meal_limit || 3;

  const used =
    ticket.used_meals || [];

  if(

    used.length >=
    mealLimit

  ){

    return res.json({

      status:"limit"
    });
  }

  used.push(refeicao);

  await docRef.update({

    used_meals:
      used,

    last_meal_time:
      new Date()
  });

  return res.json({

    status:"valid"
  });
}

// ======================================================
// BOSS
// ======================================================

const mealLimit =
  ticket.meal_limit || 999;

const used =
  ticket.used_meals || [];

if(

  used.length >=
  mealLimit

){

  return res.json({

    status:"limit"
  });
}

used.push(refeicao);

await docRef.update({

  used_meals:
    used,

  last_meal_time:
    new Date()
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

      (req.query.cliente || "Sem Nome")

      .trim()

      .toUpperCase()

      .normalize("NFD")

      .replace(/[\u0300-\u036f]/g,"");

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

    const ticket =
      doc.data();

    // ======================================================
// ODS
// ======================================================

const ods =

  id.startsWith("ODS-");

    // ======================================================
    // JÁ ATIVADO?
    // ======================================================

    if(ticket.active){

      return res.json({

        status:"already_active"
      });
    }

    await docRef.update({

      active:true,

      activated_at:
        new Date(),

      cliente,

      meal_limit:
        nrRefeicoes,

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

    let odsAtivados = 0;
    let odsEntradas = 0;
    
    let vipTabela=[];

let vipTotais={

  ativados:0,

  a1:0,
  j1:0,
  a2:0,
  j2:0,
  a3:0

};

    let calResumo = {};

let calTotais = {

  ativados:0,

  a1:0,
  j1:0,
  a2:0,
  j2:0,
  a3:0

};

    let evtResumo = {};

    let evtTotais = {

  ativados:0,

  a1:0,
  j1:0,
  a2:0,
  j2:0,
  a3:0
};
    
    let rscResumo = {};

    let rscTotais = {

  ativados:0,

  a1:0,
  j1:0,
  a2:0,
  j2:0,
  a3:0

};

    // ======================================================
// ODS
// ======================================================

let odsResumo = {};

let odsTabela = [];

let odsTotais = {

  ativados:0,

  a1:0,

  j1:0,

  a2:0,

  j2:0,

  a3:0,

  j3:0,

    a4:0,

    j4:0

};

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
    (t.used_meals || []).length;

  const cliente =
    t.cliente || "Sem Nome";

  if(!evtResumo[cliente]){

   evtResumo[cliente] = {

  cliente,

  ativados:0,

  a1:0,
  j1:0,
  a2:0,
  j2:0,
  a3:0
};
  }

if(t.active){

  evtResumo[cliente].ativados++;

  evtTotais.ativados++;
}

  (t.used_meals || []).forEach(meal=>{

    if(meal === "dia1_almoco"){

      evtResumo[cliente].a1++;
      evtTotais.a1++;
    }

    if(meal === "dia1_jantar"){

      evtResumo[cliente].j1++;
      evtTotais.j1++;
    }

    if(meal === "dia2_almoco"){

      evtResumo[cliente].a2++;
      evtTotais.a2++;
    }

    if(meal === "dia2_jantar"){

      evtResumo[cliente].j2++;
      evtTotais.j2++;
    }

    if(meal === "dia3_almoco"){

      evtResumo[cliente].a3++;
      evtTotais.a3++;
    }

  });

}
      

// ======================================================
// RSC
// ======================================================

if(id.includes("RSC")){

  if(t.active){

    rscAtivados++;

  }

  rscEntradas +=
    (t.used_meals || []).length;

  const cliente =
    t.cliente || "Sem Nome";

  if(!rscResumo[cliente]){

    rscResumo[cliente]={

      cliente,

      ativados:0,

      a1:0,
      j1:0,
      a2:0,
      j2:0,
      a3:0

    };

  }

  if(t.active){

    rscResumo[cliente].ativados++;

    rscTotais.ativados++;

  }

  (t.used_meals || []).forEach(meal=>{

    if(meal==="dia1_almoco"){

      rscResumo[cliente].a1++;

      rscTotais.a1++;

    }

    if(meal==="dia1_jantar"){

      rscResumo[cliente].j1++;

      rscTotais.j1++;

    }

    if(meal==="dia2_almoco"){

      rscResumo[cliente].a2++;

      rscTotais.a2++;

    }

    if(meal==="dia2_jantar"){

      rscResumo[cliente].j2++;

      rscTotais.j2++;

    }

    if(meal==="dia3_almoco"){

      rscResumo[cliente].a3++;

      rscTotais.a3++;

    }

  });

}
      
   
// ======================================================
// CAL
// ======================================================

if(

  id.startsWith("CAL.DIR-") ||

  id.startsWith("CAL.VIP-")

){

  const cliente =
    t.cliente || "Sem Nome";

  if(!calResumo[cliente]){

    calResumo[cliente]={

      cliente,

      ativados:0,

      a1:0,
      j1:0,
      a2:0,
      j2:0,
      a3:0

    };

  }

  if(t.active){

    calResumo[cliente].ativados++;

    calTotais.ativados++;

  }

  (t.used_meals || []).forEach(meal=>{

    if(meal==="dia1_almoco"){

      calResumo[cliente].a1++;

      calTotais.a1++;

    }

    if(meal==="dia1_jantar"){

      calResumo[cliente].j1++;

      calTotais.j1++;

    }

    if(meal==="dia2_almoco"){

      calResumo[cliente].a2++;

      calTotais.a2++;

    }

    if(meal==="dia2_jantar"){

      calResumo[cliente].j2++;

      calTotais.j2++;

    }

    if(meal==="dia3_almoco"){

      calResumo[cliente].a3++;

      calTotais.a3++;

    }

  });

}

      // ======================================================
// ODS
// ======================================================

if(id.startsWith("ODS-")){

  if(t.active)
    odsAtivados++;

  odsEntradas += (t.used_meals || []).length;

  const cliente =
    t.cliente || "Sem Nome";

  if(!odsResumo[cliente]){

    odsResumo[cliente]={

      cliente,

      ativados:0,

      a1:0,

      j1:0,

      a2:0,

      j2:0,

      a3:0,

      j3:0,

    a4:0,

    j4:0

    };

  }

  if(t.active){

    odsResumo[cliente].ativados++;

    odsTotais.ativados++;

  }

  (t.used_meals || []).forEach(meal=>{

    if(meal==="dia1_almoco"){

      odsResumo[cliente].a1++;

      odsTotais.a1++;

    }

    if(meal==="dia1_jantar"){

      odsResumo[cliente].j1++;

      odsTotais.j1++;

    }

    if(meal==="dia2_almoco"){

      odsResumo[cliente].a2++;

      odsTotais.a2++;

    }

    if(meal==="dia2_jantar"){

      odsResumo[cliente].j2++;

      odsTotais.j2++;

    }

    if(meal==="dia3_almoco"){

      odsResumo[cliente].a3++;

      odsTotais.a3++;

    }

     if(meal==="dia3_jantar"){

      odsResumo[cliente].j3++;

      odsTotais.j3++;

    }

     if(meal==="dia4_almoco"){

      odsResumo[cliente].a4++;

      odsTotais.a4++;

    }

     if(meal==="dia4_jantar"){

      odsResumo[cliente].j4++;

      odsTotais.j4++;

    }

  });

}

  // ======================================================
// VIP
// ======================================================

if(

id.startsWith("RSprom") ||

id.startsWith("BOSS")

){

if(t.active){

if(id.startsWith("RSprom"))

promAtivados++;

else

bossAtivados++;

}

const cliente=

t.cliente ||

"Sem Nome";

const tipo=

id.startsWith("BOSS")

?

"BOSS"

:

"PROM";

const row={

ticket:id,

tipo,

cliente,

a1:0,

j1:0,

a2:0,

j2:0,

a3:0

};

(t.used_meals || []).forEach(meal=>{

if(meal==="dia1_almoco"){

row.a1++;

vipTotais.a1++;

}

if(meal==="dia1_jantar"){

row.j1++;

vipTotais.j1++;

}

if(meal==="dia2_almoco"){

row.a2++;

vipTotais.a2++;

}

if(meal==="dia2_jantar"){

row.j2++;

vipTotais.j2++;

}

if(meal==="dia3_almoco"){

row.a3++;

vipTotais.a3++;

}

});

if(t.active)

vipTotais.ativados++;

if(
    t.active ||
    row.a1 ||
    row.j1 ||
    row.a2 ||
    row.j2 ||
    row.a3
){
    vipTabela.push(row);
}

if(id.startsWith("RSprom"))

promEntradas+=(t.used_meals||[]).length;

else

bossEntradas+=(t.used_meals||[]).length;

}

    });

const resumoGeral = {

  ativados:

    rscTotais.ativados +

    vipTotais.ativados +

    calTotais.ativados,

  a1:

    rscTotais.a1 +

    vipTotais.a1 +

    calTotais.a1,

  j1:

    rscTotais.j1 +

    vipTotais.j1 +

    calTotais.j1,

  a2:

    rscTotais.a2 +

    vipTotais.a2 +

    calTotais.a2,

  j2:

    rscTotais.j2 +

    vipTotais.j2 +

    calTotais.j2,

  a3:

    rscTotais.a3 +

    vipTotais.a3 +

    calTotais.a3

};

resumoGeral.total =

  resumoGeral.a1 +

  resumoGeral.j1 +

  resumoGeral.a2 +

  resumoGeral.j2 +

  resumoGeral.a3;
    
    res.json({

      evtVendidos,
      evtEntradas,

      rscAtivados,
      rscEntradas,

      promAtivados,
      promEntradas,

      bossAtivados,
      bossEntradas,

            odsTabela,
      odsTotais,

      resumoGeral,

  evtTabela:

  Object.values(evtResumo)

  .filter(c =>

    c.ativados > 0 ||

    c.a1 > 0 ||

    c.j1 > 0 ||

    c.a2 > 0 ||

    c.j2 > 0 ||

    c.a3 > 0
  )

  .sort(
    (a,b)=>
      b.ativados - a.ativados
  ),
evtTotais,

    rscTabela:

Object.values(rscResumo)

.filter(c =>

  c.ativados > 0 ||

  c.a1 > 0 ||

  c.j1 > 0 ||

  c.a2 > 0 ||

  c.j2 > 0 ||

  c.a3 > 0

)

.sort(

  (a,b)=>

    b.ativados - a.ativados

),

rscTotais,

       odsTabela:

  Object.values(odsResumo)

  .filter(c =>

    c.ativados > 0 ||

    c.a1 > 0 ||

    c.j1 > 0 ||

    c.a2 > 0 ||

    c.j2 > 0 ||

    c.a3 > 0 ||

    c.j3 > 0 ||

    c.a4 > 0 ||

    c.j4 > 0
  )

  .sort(
    (a,b)=>
      b.ativados - a.ativados
  ),
odsTotais,


calTabela:

Object.values(calResumo)

.filter(c =>

  c.ativados > 0 ||

  c.a1 > 0 ||

  c.j1 > 0 ||

  c.a2 > 0 ||

  c.j2 > 0 ||

  c.a3 > 0

)

.sort(

  (a,b)=>

    b.ativados - a.ativados

),

calTotais,

      vipTabela,

vipTotais,
      
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

        Refeicoes_Compradas:
          t.meal_limit || 0,

        Refeicoes_Consumidas:
          (t.used_meals || []).length,

        Historico:
          (t.used_meals || [])
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
  (t.used_meals || []).length,

Historico:
  (t.used_meals || [])
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

        Refeicoes_Compradas:
          t.meal_limit || 0,

        Refeicoes_Consumidas:
          (t.used_meals || []).length,

        Historico:
          (t.used_meals || [])
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

        Refeicoes_Compradas:
          t.meal_limit || 0,

        Refeicoes_Consumidas:
          (t.used_meals || []).length,

        Historico:
          (t.used_meals || [])
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
  (t.used_meals || []).length,

Historico:
  (t.used_meals || [])
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

        Refeicoes_Compradas:
          t.meal_limit || 0,

        Refeicoes_Consumidas:
          (t.used_meals || []).length,

        Historico:
          (t.used_meals || [])
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

// GERAR RSPROM
if(tipo==="gerar_rsprom"){

  exec("node generate-rsprom.js",(err)=>{

    if(err){

      console.error(err);

      return res.json({

        message:"❌ Erro a gerar RSprom"

      });

    }

    return res.json({

      message:"✅ 30 RSprom gerados com sucesso"

    });

  });

  return;
}
  
// RESET EVT
if(tipo === "reset_evt"){

  for(const doc of snapshot.docs){

    if(doc.id.includes("EVT")){

      await doc.ref.update({

        active:false,

        activated_at:
          admin.firestore.FieldValue.delete(),

        cliente:
          admin.firestore.FieldValue.delete(),

        meal_limit:
          admin.firestore.FieldValue.delete(),

        used_meals:
          admin.firestore.FieldValue.delete(),

        last_meal_time:
          admin.firestore.FieldValue.delete()
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

        activated_at:
          admin.firestore.FieldValue.delete(),

        cliente:
          admin.firestore.FieldValue.delete(),

        meal_limit:
          admin.firestore.FieldValue.delete(),

        used_meals:
          admin.firestore.FieldValue.delete(),

        last_meal_time:
          admin.firestore.FieldValue.delete(),

        entradas:
          admin.firestore.FieldValue.delete(),

        historico_refeicoes:
          admin.firestore.FieldValue.delete(),

        last_checkin:
          admin.firestore.FieldValue.delete()
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

        activated_at:
          admin.firestore.FieldValue.delete(),

        cliente:
          admin.firestore.FieldValue.delete(),

        meal_limit:
          admin.firestore.FieldValue.delete(),

        used_meals:
          admin.firestore.FieldValue.delete(),

        last_meal_time:
          admin.firestore.FieldValue.delete()
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

      if(

        !t.used_meals ||

        t.used_meals.length === 0

      ){

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

// REATIVAR BOSS
if(tipo === "reativar_boss"){

  for(const doc of snapshot.docs){

    if(doc.id.startsWith("BOSS")){

      await doc.ref.update({

        active: true,

        activated_at: new Date(),

        meal_limit: 999,

        used_meals: [],

        last_meal_time: null

      });

      total++;
    }
  }

  return res.json({

    message: "👑 BOSS reativados: " + total

  });
}
  
  // ATIVAR RSPROM
  if(tipo === "ativar_rsprom"){

    for(const doc of snapshot.docs){

      if(doc.id.includes("RSprom")){

       await doc.ref.update({

  active:true,

  activated_at:
    new Date(),

  meal_limit:3,

  used_meals:[],

  last_meal_time:null
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

  // GERAR CAL
if(tipo==="gerar_cal"){

  exec("node generate-cal.js",(err)=>{

    if(err){

      console.error(err);

      return res.json({

        message:"❌ Erro a gerar CAL"

      });

    }

    return res.json({

      message:"✅ CAL gerado com sucesso"

    });

  });

  return;
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
// STATUS TICKET
// ======================================================

app.get(

  "/api/status/:id",

async(req,res)=>{

  try{

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

    const t =
      doc.data();

    // não ativado

    if(!t.active){

      return res.json({

        status:"not_active"
      });
    }

    // EVT / RSC

    if(

      !id.includes("RSprom") &&

      !id.includes("BOSS")

    ){

      const usados =
        (t.used_meals || []).length;

      const limite =
        t.meal_limit || 0;

      return res.json({

        status:"active",

        cliente:
          t.cliente || "",

        usados,

        limite
      });
    }

    // VIP

    return res.json({

      status:"active",

      cliente:
        t.cliente || "",

     entradas:
  (t.used_meals || []).length
    });

  }

  catch(err){

    console.error(err);

    res.json({

      status:"error"
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
