# Rally Geração 252 — Os Heróis do Antigo Testamento

Site de revisão das lições da EBD Juniores para as crianças e os pais acessarem pelo celular.
São 16 etapas (uma por lição) num mapa de rally; depois que a criança abre todas, libera o
**Quiz da Chegada**, com as mesmas 16 perguntas usadas no Kahoot do Rally.

## Estrutura

```text
public/            ← SÓ esta pasta vai ao ar (GitHub Pages)
  index.html       página e estilos
  app.js           comportamento (mapa, lições, quiz, código de progresso)
  licoes.js        conteúdo das lições  ← é o que muda toda semana
  fonts/           fontes Rubik e Rubik Dirt (SIL Open Font License)
  *.png, manifest  logo e ícones do app (tela inicial do celular)
scripts/sincronizar.mjs  gera licoes.js a partir do arquivo de revisão do professor
scripts/validar.mjs  confere o site antes de publicar
.github/workflows/   valida e publica a cada envio para a branch main
DECISOES.md          decisões tomadas e por quê
```

## Como adicionar uma lição

1. O texto é escrito e revisado em `Resumo — Os Heróis do Antigo Testamento.md` (fora deste
   repositório, junto com os PDFs da revista).
2. Gerar o `public/licoes.js` a partir do arquivo de revisão (não editar o `licoes.js` à mão):
   `node scripts/sincronizar.mjs "../Resumo — Os Heróis do Antigo Testamento.md"`.
   As marcas `=> OK` e as linhas de aviso (⚠️) são ignoradas.
3. Rodar `node scripts/validar.mjs`. Precisa terminar com ✓.
4. Testar localmente: `python3 -m http.server 8252 --directory public` e abrir
   <http://127.0.0.1:8252/>. No computador o Quiz vem liberado (modo de teste).
5. Fazer o commit (uma lição por commit, ex.: `Adiciona Etapa 4 — Título da lição`) e enviar.
   O GitHub valida de novo e publica em ~1 minuto. Se a validação falhar, o site no ar não muda.

## O que o validador barra

- erro de sintaxe em `app.js` ou `licoes.js`;
- lição sem título, resumo, versículo, pontos, desafio com 6 dias ou pergunta do quiz;
- pergunta do quiz acima de 120 caracteres ou alternativa acima de 75 (limites do Kahoot);
- alternativas repetidas, lições fora de ordem ou com número repetido;
- arquivo referenciado que não existe;
- falta da política de segurança (CSP), script inline, `onclick="..."` ou endereço externo;
- qualquer arquivo em `public/` que não seja do site (ex.: um PDF esquecido).

## Segurança e privacidade

- Nenhum dado sai do celular: sem servidor, cadastro, cookies ou analytics.
  O progresso fica no `localStorage` do aparelho.
- O site não carrega nada de terceiros (fontes incluídas), e a CSP proíbe isso.
- Material da revista (PDFs e transcrições) nunca entra no repositório (`.gitignore`).
- **Regra de conteúdo:** nunca colocar nome, foto ou qualquer dado de criança no site.
- No GitHub: a branch `main` não pode ser apagada nem ter o histórico reescrito, a detecção
  de segredos bloqueia envio de senha por engano, e o Dependabot avisa sobre versões novas
  das ações (só depois de 14 dias de lançamento).
