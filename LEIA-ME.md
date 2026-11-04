# Conecta Fatec — Aulão de Redação + Sorteio ENEM

Site estático (HTML/JS puro, sem instalar nada) + Firebase próprio, separado do Órbita.
Visual do KV Vest Connect 2027.

| Página | Para quem | O que faz |
|---|---|---|
| `/aulao/` | público | Inscrição no aulão Redação Descomplicada (07/11, 14h–17h). Depois de inscrever, mostra o link do Zoom e o botão para salvar na agenda. |
| `/enem/` | público (QR) | Cadastro para concorrer ao brinde. `?local=Nome da escola` diz de qual barraca veio; `?dia=08` ou `?dia=15` força o dia (sem isso, usa a data). |
| `/enem/?barraca=1` | equipe logada | Modo barraca: a equipe cadastra quem está sem celular, com botão "Cadastrar próxima pessoa"; grava quem cadastrou. |
| `/equipe/` | equipe | Login, lista por ação (só carrega depois de escolher), presença do aulão, sorteio, planilha (CSV/Excel) e gerador de QR para imprimir. |

Mesmo WhatsApp não entra duas vezes na mesma ação (o id do registro é `origem_whatsapp`).
Não há validação por código: só o formato (DDD + 9 + 8 dígitos).

## Pôr no ar (uma vez)

1. **Criar o Firebase**: em console.firebase.google.com, adicione um projeto (ex.: `conecta-fatec`).
   - Build → **Firestore Database**: criar, em modo produção, na região `southamerica-east1`.
   - Firestore → **Regras**: colar o conteúdo de `firestore.rules` e clicar em Publicar.
   - Build → **Authentication** → Método de login: ativar **Google**. Só o admin entra (e-mail definido em ADMINS no equipe/index.html e na regra isEquipe do firestore.rules).
   - Configurações do projeto → Seus apps → Web (`</>`): registrar o app e copiar o `firebaseConfig`.
2. Colar o `firebaseConfig` em `js/config.js`. No mesmo arquivo, preencher `AULAO.zoomLink`, `AULAO.bioProfessor`, `ENEM.premio` e conferir `ENEM.cursos`.
3. **Vercel**: subir a pasta (repositório no GitHub → importar na Vercel, sem build, framework "Other").
   Domínio sugerido: `conecta.fatecivaipora.com.br` (CNAME no DNS para `cname.vercel-dns.com`).
4. Authentication → Configurações → **Domínios autorizados**: adicionar o domínio do site.

## Testar no PC

```
cd Conecta_Fatec
python -m http.server 8080
```
Abrir http://localhost:8080/aulao/. Atenção: com a config real, o teste grava no banco de verdade.

## Cruzar leads × matrículas do Órbita (para o Comercial não ligar para quem já é aluno)

```
node scripts/cruzar-matriculas.cjs                         # todos os leads × Órbita 2026.2 e 2027.1
node scripts/cruzar-matriculas.cjs --semestres 2027.1      # escolher semestres
node scripts/cruzar-matriculas.cjs --extra lista-lucas.xlsx # juntar outra lista (nome, whatsapp/telefone, cidade)
```
Gera `relatorios/leads-x-matriculas-AAAA-MM-DD-HH-MM.xlsx` com as abas **Para contatar**, **Já é aluno - não contatar**,
**Conferir** (bateu só pelo nome, ou ex-aluno que cancelou/desistiu) e **Resumo**.
Compara por WhatsApp padronizado (completa DDD 43/42/44 e o 9) e por nome (sem acento). Só lê os bancos.
Precisa das chaves `serviceAccountKey.json` do Conecta e do Órbita (nunca sobem para o GitHub).
`relatorios/`, `backup/` e `scripts/` não são publicados no site (`.vercelignore`).
