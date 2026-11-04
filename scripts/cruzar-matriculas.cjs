/*
 * Cruza os leads do Conecta Fatec com as matrículas do Órbita, para o Comercial
 * (Rafa) NÃO ligar para quem já é aluno.
 *
 * Como rodar (na pasta Conecta_Fatec):
 *   node scripts/cruzar-matriculas.cjs                       → todos os leads × semestres 2026.2 e 2027.1
 *   node scripts/cruzar-matriculas.cjs --semestres 2027.1    → escolhe os semestres do Órbita
 *   node scripts/cruzar-matriculas.cjs --origem aulao-redacao-2026
 *   node scripts/cruzar-matriculas.cjs --extra lucas.xlsx    → (depois) junta outra lista de leads
 *                                                              (colunas: nome, whatsapp/telefone, cidade)
 *
 * Só LÊ os dois bancos. Gera a planilha em relatorios/ (fora do GitHub e do site: dados pessoais).
 *
 * Como compara (não temos CPF nem e-mail):
 *   1) WhatsApp padronizado (completa DDD 43 e o 9 do celular, como no site) → "mesmo número"
 *   2) Nome normalizado (sem acento/maiúscula) igual, ou muito parecido     → "mesmo nome"
 *   Número igual = certeza. Só nome = vai para a aba "Conferir".
 */
const ORBITA = "C:/Users/metat/OneDrive/Documentos/CLAUDE/Orbita_Fatec/";
const CONECTA = "C:/Users/metat/OneDrive/Documentos/CLAUDE/Conecta_Fatec/";
const admin = require(ORBITA + "node_modules/firebase-admin");
const XLSX = require(ORBITA + "node_modules/xlsx");
const fs = require("fs");
const path = require("path");

// ---------- parâmetros ----------
const arg = (nome, padrao) => {
  const i = process.argv.indexOf("--" + nome);
  return i > -1 ? process.argv[i + 1] : padrao;
};
const SEMESTRES = arg("semestres", "2026.2,2027.1").split(",").map(s => s.trim()).filter(Boolean);
const ORIGEM = arg("origem", "");          // vazio = todas as ações do Conecta
const EXTRA = arg("extra", "");            // planilha extra (ex.: sistema do Lucas)
const LIMITE = Number(arg("limite", 0));   // só para teste: limita leitura do Órbita

// Situações do Órbita que contam como "já é aluno" (não contatar).
// As de saída (Cancelou, Desistente, Evasão…) vão para "Conferir": o Comercial decide.
const SAIU = ["Cancelou", "Trancou", "1ª Evasão", "2ª Evasão", "Transferência",
  "Desistente — Calouro", "Desistente — Veterano", "Desistente", "Reprovado"];

// ---------- normalização (mesma regra do site: js/base.js) ----------
const DDDS = ["43", "42", "44"];
function soDigitos(v) {
  let d = String(v || "").replace(/\D/g, "");
  if (d.length === 13 && d.startsWith("55")) d = d.slice(2);
  if (d.length === 12 && d.startsWith("0")) d = d.slice(1);
  return d;
}
/** Todas as formas completas possíveis de um telefone (para casar mesmo incompleto). */
function telefones(v) {
  const d = soDigitos(v), out = new Set();
  const cel = s => /^[6-9]/.test(s);
  if (d.length === 11) out.add(d);
  if (d.length === 10) out.add(cel(d.slice(2)) ? d.slice(0, 2) + "9" + d.slice(2) : d); // fixo fica como está
  if (d.length === 9 && d[0] === "9") DDDS.forEach(x => out.add(x + d));
  if (d.length === 8) DDDS.forEach(x => out.add(x + (cel(d) ? "9" : "") + d));
  return [...out];
}
const normNome = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toUpperCase().replace(/[^A-Z ]/g, " ").replace(/\s+/g, " ").trim();
const LIGA = new Set(["DA", "DE", "DO", "DAS", "DOS", "E"]);
const partes = n => normNome(n).split(" ").filter(p => p && !LIGA.has(p));
function levenshtein(a, b) {
  const m = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return m[a.length][b.length];
}
/** "igual" | "parecido" | null */
function compararNomes(a, b) {
  const na = partes(a).join(" "), nb = partes(b).join(" ");
  if (!na || !nb) return null;
  if (na === nb) return "igual";
  const pa = partes(a), pb = partes(b);
  if (pa.length >= 2 && pb.length >= 2 && pa[0] === pb[0] && pa.at(-1) === pb.at(-1)) return "parecido";
  if (na.length > 10 && levenshtein(na, nb) <= 2) return "parecido";
  return null;
}

const ROTULO = { "aulao-redacao-2026": "Aulão Redação 07/11", "enem-08-11": "ENEM 08/11", "enem-15-11": "ENEM 15/11" };

// exporta as funções para teste (sem conectar em banco)
module.exports = { telefones, compararNomes, normNome };
if (require.main !== module) return;

// ---------- conexões (dois projetos Firebase) ----------
const appConecta = admin.initializeApp({ credential: admin.credential.cert(require(CONECTA + "serviceAccountKey.json")) }, "conecta");
const appOrbita = admin.initializeApp({ credential: admin.credential.cert(require(ORBITA + "serviceAccountKey.json")) }, "orbita");

(async () => {
  // 1) Leads do Conecta
  let q = appConecta.firestore().collection("leads");
  if (ORIGEM) q = q.where("origem", "==", ORIGEM);
  const leads = (await q.get()).docs.map(d => ({ fonte: ROTULO[d.get("origem")] || d.get("origem"), ...d.data() }));

  // 1b) Lista extra (ex.: sistema do Lucas), se vier
  if (EXTRA) {
    const wb = XLSX.readFile(path.resolve(EXTRA));
    const linhas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
    const pega = (l, ...nomes) => { const k = Object.keys(l).find(c => nomes.includes(normNome(c))); return k ? l[k] : ""; };
    linhas.forEach(l => leads.push({
      fonte: "Extra: " + path.basename(EXTRA),
      nome: pega(l, "NOME", "NOME COMPLETO", "ALUNO", "LEAD"),
      whatsapp: soDigitos(pega(l, "WHATSAPP", "TELEFONE", "CELULAR", "CONTATO", "FONE")),
      cidade: pega(l, "CIDADE", "MUNICIPIO"), curso: pega(l, "CURSO", "CURSOS", "INTERESSE"),
    }));
  }

  // 2) Matrículas do Órbita (só os semestres escolhidos: economiza leitura)
  const mats = [];
  for (const sem of SEMESTRES) {
    let mq = appOrbita.firestore().collection("matriculas_alunos").where("semestre", "==", sem);
    if (LIMITE) mq = mq.limit(LIMITE);
    (await mq.get()).docs.forEach(d => mats.push({ id: d.id, ...d.data() }));
  }
  const porTelefone = new Map();
  mats.forEach(m => telefones(m.telefone).forEach(t => {
    if (!porTelefone.has(t)) porTelefone.set(t, []);
    porTelefone.get(t).push(m);
  }));

  // 3) Cruzamento
  const contatar = [], naoContatar = [], conferir = [];
  for (const l of leads) {
    const base = {
      Fonte: l.fonte, Nome: l.nome, WhatsApp: l.whatsapp, Cidade: l.cidade || "",
      "Curso de interesse": l.curso || "", Escola: l.escola || "", Barraca: l.local || "",
    };
    // a) pelo número
    const porNum = [...new Set(telefones(l.whatsapp).flatMap(t => porTelefone.get(t) || []))];
    // b) pelo nome (só se o número não achou)
    const porNome = porNum.length ? [] : mats
      .map(m => ({ m, tipo: compararNomes(l.nome, m.nome) }))
      .filter(x => x.tipo);
    const achados = porNum.length ? porNum.map(m => ({ m, tipo: "mesmo WhatsApp" + (compararNomes(l.nome, m.nome) ? " e nome" : "") }))
      : porNome.map(x => ({ m: x.m, tipo: "só nome (" + x.tipo + ")" }));

    if (!achados.length) { contatar.push(base); continue; }
    const m = achados[0].m;
    const linha = {
      ...base, "Como bateu": achados[0].tipo,
      "Nome no Órbita": m.nome, "Telefone no Órbita": m.telefone || "", "Curso no Órbita": m.curso || "",
      "Semestre": m.semestre, "Situação no Órbita": m.situacao || "",
      "Outros registros": achados.length > 1 ? achados.length - 1 : "",
    };
    const saiu = SAIU.includes(m.situacao);
    if (porNum.length && !saiu) naoContatar.push(linha);
    else conferir.push({ ...linha, "Por que conferir": saiu ? "Saiu da Fatec (" + m.situacao + ")" : "Bateu só pelo nome" });
  }

  // 4) Planilha
  fs.mkdirSync(CONECTA + "relatorios", { recursive: true });
  const agora = new Date().toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" }).slice(0, 16).replace(/[: ]/g, "-");
  const arq = CONECTA + `relatorios/leads-x-matriculas-${agora}.xlsx`;
  const wb = XLSX.utils.book_new();
  const aba = (dados, nome, vazio) => XLSX.utils.book_append_sheet(wb,
    XLSX.utils.json_to_sheet(dados.length ? dados : [{ Aviso: vazio }]), nome);
  aba(contatar, "Para contatar", "Nenhum lead novo.");
  aba(naoContatar, "Já é aluno - não contatar", "Nenhum lead já matriculado.");
  aba(conferir, "Conferir", "Nada para conferir.");
  aba([{
    "Leads analisados": leads.length, "Matrículas lidas no Órbita": mats.length, "Semestres": SEMESTRES.join(", "),
    "Para contatar": contatar.length, "Já é aluno": naoContatar.length, "Conferir": conferir.length,
    "Gerado em": agora,
  }], "Resumo", "");
  XLSX.writeFile(wb, arq);

  console.log(`Leads: ${leads.length} | Matrículas (${SEMESTRES.join(", ")}): ${mats.length}`);
  console.log(`Para contatar: ${contatar.length} | Já é aluno: ${naoContatar.length} | Conferir: ${conferir.length}`);
  console.log("Planilha:", arq);
})().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
