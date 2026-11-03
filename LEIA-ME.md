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
   - Build → **Authentication**: ativar o login por E-mail/senha. Em Usuários, criar uma conta para cada pessoa da equipe.
   - Firestore → **Dados**: criar a coleção `equipe` com um documento por pessoa. O **ID do documento é o e-mail** e pode ter um campo `nome`. Quem não estiver aí não vê os leads.
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
