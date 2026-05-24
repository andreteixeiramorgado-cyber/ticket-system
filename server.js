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
