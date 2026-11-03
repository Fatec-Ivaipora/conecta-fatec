// Base compartilhada: Firebase, máscara de WhatsApp e gravação do lead.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, doc, setDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "./config.js";

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const configurado = !String(firebaseConfig.apiKey).startsWith("COLE_AQUI");

/** Só dígitos. Tira +55 / 0 inicial se a pessoa digitou. */
export function soDigitos(v) {
  let d = String(v || "").replace(/\D/g, "");
  if (d.length === 13 && d.startsWith("55")) d = d.slice(2);
  if (d.length === 12 && d.startsWith("0")) d = d.slice(1);
  return d;
}

/** Celular BR: DDD válido (11–99) + 9 + 8 dígitos. */
export function whatsappValido(v) {
  return /^[1-9][1-9]9\d{8}$/.test(soDigitos(v));
}

export function formatarWhatsapp(v) {
  const d = soDigitos(v).slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function aplicarMascara(input) {
  input.addEventListener("input", () => {
    input.value = formatarWhatsapp(input.value);
    input.classList.remove("invalido");
  });
}

/** Primeira letra de cada palavra maiúscula, tirando espaços sobrando. */
export function limparNome(v) {
  return String(v || "").trim().replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/(^|\s|-)(\p{L})/gu, (m, a, b) => a + b.toUpperCase())
    .replace(/\b(Da|De|Do|Das|Dos|E)\b/g, s => s.toLowerCase());
}

/**
 * Grava o lead. O id do documento é origem_whatsapp, então a mesma pessoa
 * não se inscreve duas vezes no mesmo evento (a regra só permite criar).
 * Retorna "novo" ou "repetido".
 */
export async function salvarLead(origem, dados) {
  const whatsapp = soDigitos(dados.whatsapp);
  const registro = {
    origem,
    nome: limparNome(dados.nome),
    whatsapp,
    cidade: limparNome(dados.cidade),
    escola: String(dados.escola || "").trim().replace(/\s+/g, " "),
    consentimento: true,
    criadoEm: serverTimestamp(),
  };
  if (dados.curso) registro.curso = String(dados.curso).trim();
  if (dados.local) registro.local = String(dados.local).trim().slice(0, 80);
  if (dados.cadastradoPor) registro.cadastradoPor = dados.cadastradoPor;

  try {
    await setDoc(doc(db, "leads", `${origem}_${whatsapp}`), registro);
    return "novo";
  } catch (e) {
    // Documento já existe → a regra nega (só permite create) → já estava inscrito.
    if (e && e.code === "permission-denied" && configurado) return "repetido";
    throw e;
  }
}

/** Promise com o usuário logado (ou null). */
export function usuarioAtual() {
  return new Promise(res => {
    const off = onAuthStateChanged(auth, u => { off(); res(u); });
  });
}

/** Mostra erro amigável num elemento .msg */
export function mostrarMsg(el, texto, tipo = "erro") {
  el.textContent = texto;
  el.className = `msg ${tipo}`;
}
