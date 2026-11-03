// ============================================================
// CONFIGURAÇÃO — é só este arquivo que precisa ser editado
// ============================================================

// 1) Firebase: console.firebase.google.com → Configurações do projeto → Seus apps → Web
// (é pública por natureza: só identifica o projeto; quem protege os dados são as regras do Firestore)
export const firebaseConfig = {
  apiKey: "AIzaSyCgSCWpz0XL_GakC1Abh4gBUzNIyNS1I1M",
  authDomain: "conecta-fatec.firebaseapp.com",
  projectId: "conecta-fatec",
  storageBucket: "conecta-fatec.firebasestorage.app",
  messagingSenderId: "108889184231",
  appId: "1:108889184231:web:0746082eaa5149f4608f42",
};

// 2) Aulão de Redação
export const AULAO = {
  origem: "aulao-redacao-2026",
  // Link do Zoom: aparece para a pessoa logo depois que ela se inscreve.
  // Se ficar vazio, a tela avisa que o link será enviado pelo WhatsApp.
  zoomLink: "https://us02web.zoom.us/j/83670217677?pwd=cXo5LzlvK2IweXJQYVVpOW93VWtmUT09",
  // Mini bio do prof. Carlos Durlo (pegar com ele). Vazio = mostra só o nome.
  bioProfessor: "",
  inicio: "2026-11-07T14:00:00-03:00",
  fim: "2026-11-07T17:00:00-03:00",
};

// 3) Sorteio nas barracas do ENEM — um sorteio por dia
export const ENEM = {
  dias: [
    { origem: "enem-08-11", data: "2026-11-08", rotulo: "ENEM · 08/11" },
    { origem: "enem-15-11", data: "2026-11-15", rotulo: "ENEM · 15/11" },
  ],
  // O que a pessoa concorre (aparece no formulário). Ex.: "uma garrafa térmica da Fatec"
  premio: "um brinde exclusivo da Fatec Ivaiporã",
  // Sugestões do campo "Curso de interesse" (a pessoa também pode digitar outro).
  // CONFERIR a lista oficial de cursos do Vestibular 2027.
  cursos: [
    "Agronomia", "Análise e Desenvolvimento de Sistemas", "Direito", "Medicina", "Ainda não sei",
  ],
};

// Todas as origens (usado no painel da equipe)
export const ORIGENS = [
  { origem: AULAO.origem, rotulo: "Aulão de Redação · 07/11" },
  ...ENEM.dias.map(d => ({ origem: d.origem, rotulo: d.rotulo })),
];
