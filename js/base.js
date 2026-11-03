// Base compartilhada: Firebase, máscara de WhatsApp e gravação do lead.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, doc, setDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "./config.js";
import { ESCOLAS, SEM_ESCOLA } from "./escolas.js";

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

/**
 * Sugestões enquanto digita (ignora acento e maiúscula). Continua aceitando
 * texto livre: a lista só ajuda a preencher.
 */
export function autocompletar(input, lista, { prioridade } = {}) {
  const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  // Aceita "Nome" ou { n: "Nome", extra: "Cidade" }; busca no nome e no extra.
  const itens = lista.map(i => typeof i === "string" ? { n: i } : i)
    .map(i => ({ ...i, k: norm(i.n), ke: norm(i.extra || "") }));
  const box = document.createElement("ul");
  box.className = "sugestoes oculto";
  box.id = `${input.name}-sugestoes`;
  box.setAttribute("role", "listbox");
  input.parentElement.style.position = "relative";
  input.after(box);
  input.setAttribute("autocomplete", "off");
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", box.id);
  input.setAttribute("aria-expanded", "false");

  let vis = [], atual = -1;
  const fechar = () => { box.classList.add("oculto"); input.setAttribute("aria-expanded", "false"); atual = -1; };
  const marcar = () => [...box.children].forEach((li, i) => li.classList.toggle("ativo", i === atual));
  const escolher = i => { input.value = vis[i].n; fechar(); input.classList.remove("invalido"); };

  function abrir() {
    const q = norm(input.value.trim());
    if (!q) return fechar();
    const pri = prioridade ? norm(prioridade() || "") : "";
    // Palavras soltas: "idalia ivaipora" acha "Colégio Estadual Idália Rocha · Ivaiporã"
    const termos = q.split(/\s+/).filter(Boolean);
    vis = itens.filter(i => termos.every(t => i.k.includes(t) || i.ke.includes(t)))
      .sort((a, b) =>
        ((pri && b.ke === pri) - (pri && a.ke === pri)) ||
        (b.k.startsWith(q) - a.k.startsWith(q)) ||
        a.k.localeCompare(b.k))
      .slice(0, 8);
    if (!vis.length || (vis.length === 1 && vis[0].k === q)) return fechar();
    atual = -1;
    box.innerHTML = vis.map((i, ix) => {
      const p = i.k.indexOf(termos[0]);
      const nome = p < 0 ? i.n
        : i.n.slice(0, p) + "<b>" + i.n.slice(p, p + termos[0].length) + "</b>" + i.n.slice(p + termos[0].length);
      return `<li role="option" data-i="${ix}">${nome}${i.extra ? `<small>${i.extra}</small>` : ""}</li>`;
    }).join("");
    box.classList.remove("oculto");
    input.setAttribute("aria-expanded", "true");
  }

  input.addEventListener("input", abrir);
  input.addEventListener("focus", abrir);
  input.addEventListener("blur", () => setTimeout(fechar, 150));
  input.addEventListener("keydown", e => {
    if (box.classList.contains("oculto")) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      atual = (atual + (e.key === "ArrowDown" ? 1 : -1) + vis.length) % vis.length;
      marcar();
    } else if (e.key === "Enter" && atual >= 0) {
      e.preventDefault(); escolher(atual);
    } else if (e.key === "Escape") fechar();
  });
  box.addEventListener("mousedown", e => e.preventDefault()); // não tira o foco do campo
  box.addEventListener("click", e => {
    const li = e.target.closest("li");
    if (li) escolher(+li.dataset.i);
  });
}

/**
 * Campo "Escola": sugestões dos colégios (os da cidade escolhida primeiro)
 * + atalhos "Não estou estudando" / "Já terminei o ensino médio".
 */
export function campoEscola(form) {
  const input = form.escola;
  autocompletar(input, ESCOLAS, { prioridade: () => form.cidade?.value });
  const div = document.createElement("div");
  div.className = "atalhos";
  div.innerHTML = SEM_ESCOLA.map(t => `<button type="button" class="atalho">${t}</button>`).join("");
  input.closest("label").after(div);
  const botoes = [...div.children];
  div.addEventListener("click", e => {
    const b = e.target.closest(".atalho"); if (!b) return;
    const ligar = !b.classList.contains("on");
    botoes.forEach(x => x.classList.remove("on"));
    if (ligar) { b.classList.add("on"); input.value = b.textContent; input.classList.remove("invalido"); }
    else { input.value = ""; input.focus(); }
  });
  input.addEventListener("input", () => botoes.forEach(x => x.classList.remove("on")));
  form.addEventListener("reset", () => botoes.forEach(x => x.classList.remove("on")));
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
