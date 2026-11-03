# Decisões

Registro curto das decisões do projeto, no espírito de ADR: cada decisão diz o contexto, o que
foi decidido e as consequências. Decisões não são reescritas; quando mudarem, uma nova entrada
diz o que substitui a anterior.

## 1. Site estático, sem servidor — 02/11/2026
**Contexto:** 20 crianças e pais acessando pelo celular, sem login.
**Decisão:** HTML, CSS e JS publicados no GitHub Pages, sem backend.
**Consequências:** gratuito, sem manutenção de servidor, sem dados pessoais coletados.
O preço é que não há como o professor ver quem fez o quê.

## 2. Progresso salvo só no aparelho — 02/11/2026
**Decisão:** etapas visitadas e respostas do Desafio ficam no `localStorage`.
**Consequências:** o progresso não passa de um celular (ou navegador) para outro, e o Safari
do iPhone apaga dados de sites sem uso por 7 dias. Mitigado pelas decisões 3 e 4.
O aviso aos pais explica isso.

## 3. Instalação na tela inicial — 02/11/2026
**Decisão:** o site tem manifest e ícones para ser instalado como app.
**Consequências:** o app instalado não sofre a limpeza de 7 dias do Safari. No iPhone, o app
instalado tem um armazenamento separado do Safari: quem já tinha progresso usa o código (4).

## 4. Código de progresso — 02/11/2026
**Decisão:** `RALLY-XXXXC`, com 16 bits (uma etapa por bit) embaralhados por máscara e 1
dígito verificador. Recupera só as etapas; as respostas escritas do Desafio não entram.
**Consequências:** recupera progresso perdido sem servidor. Impede perda, não trapaça: quem
entendesse o formato poderia gerar um código que libera tudo. Aceito para o público (Juniores).

## 5. Quiz do site = perguntas do Kahoot — 02/11/2026
**Decisão:** uma pergunta por lição, idêntica à do Kahoot do Rally, com a resposta mostrada no
final. Libera só após abrir as 16 etapas.
**Consequências:** premia quem estudou. As perguntas respeitam os limites do Kahoot (120/75),
e o validador garante isso.

## 6. Repositório público só com o site — 02/11/2026
**Decisão:** o repositório contém apenas o site, o validador e esta documentação. PDFs,
transcrições e o arquivo de revisão ficam fora (`.gitignore` + validador).
**Consequências:** o GitHub Pages gratuito exige repositório público; como o conteúdo do
repositório é o mesmo que qualquer visitante já vê no site, não há exposição adicional.
O Desafio da Semana reproduz perguntas curtas da revista; decisão consciente do professor.

## 7. Segurança da página — 02/11/2026
**Decisão:** Content-Security-Policy restritiva (só arquivos do próprio site, nenhuma conexão
externa), fontes hospedadas no site, sem scripts nem `onclick` inline, `referrer` desligado,
textos sempre escapados antes de virar HTML.
**Consequências:** mesmo que algum texto malicioso entrasse no conteúdo, o navegador não o
executaria nem enviaria dados para fora.

## 8. Publicação só depois da validação — 02/11/2026
**Decisão:** o GitHub Actions roda `scripts/validar.mjs` e só publica se passar. As ações
oficiais são fixadas por SHA, versões com mais de 2 semanas de lançamento, e com permissões mínimas.
**Consequências:** um erro de digitação em `licoes.js` não derruba o site das crianças.
