const db = require('./firebase');
const XLSX = require('xlsx');
const fs = require('fs');

async function gerarRelatorio() {
  try {
    const snapshot = await db.collection('tickets').get();

    const dados = [];

    snapshot.forEach(doc => {
      const t = doc.data();

      const ativado = t.activated_at
        ? new Date(t.activated_at._seconds * 1000)
        : null;

      const entrada = t.checkin_time
        ? new Date(t.checkin_time._seconds * 1000)
        : null;

      dados.push({
        id: doc.id,
        ativo: t.active || false,
        usado: t.used || false,

        data_ativacao: ativado
          ? ativado.toLocaleString('pt-PT')
          : '',

        data_entrada: entrada
          ? entrada.toLocaleString('pt-PT')
          : ''
      });
    });

    // criar excel
    const workbook = XLSX.utils.book_new();

    // filtrar por dias
    const dias = ['2026-05-15', '2026-05-16', '2026-05-17'];

    dias.forEach(dia => {
      const filtrados = dados.filter(x => {
        if (!x.data_entrada) return false;

        const d = new Date(x.data_entrada);

		if (isNaN(d.getTime())) return false;

	const iso = d.toISOString().split('T')[0];
        return iso === dia;
      });

      const sheet = XLSX.utils.json_to_sheet(filtrados);

      XLSX.utils.book_append_sheet(
        workbook,
        sheet,
        dia
      );
    });

    XLSX.writeFile(workbook, 'relatorio_maio.xlsx');

    // CSV
    const csv = XLSX.utils.sheet_to_csv(
      XLSX.utils.json_to_sheet(dados)
    );

    fs.writeFileSync('relatorio_maio.csv', csv);

    console.log('✅ Relatórios criados!');

  } catch (err) {
    console.error(err);
  }
}

gerarRelatorio();