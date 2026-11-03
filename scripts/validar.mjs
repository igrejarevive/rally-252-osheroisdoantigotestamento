// Valida o site antes de publicar. Roda no GitHub a cada envio e também localmente:
//   node scripts/validar.mjs
// Se encontrar erro, sai com código 1 e a publicação NÃO acontece.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const PUB = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const erros = [];
const erro = msg => erros.push(msg);
const ler = f => readFileSync(join(PUB, f), "utf8");

// 1. Os scripts compilam
for (const f of ["licoes.js", "app.js"]) {
  try { new vm.Script(ler(f), { filename: f }); } catch (e) { erro(`${f}: erro de sintaxe: ${e.message}`); }
}

// 2. Conteúdo das lições
const ctx = { window: {} };
try { vm.runInNewContext(ler("licoes.js"), ctx); } catch (e) { erro(`licoes.js não executa: ${e.message}`); }
const TOTAL = ctx.window.TOTAL_LICOES, LICOES = ctx.window.LICOES || [];
if (TOTAL !== 16) erro(`TOTAL_LICOES deveria ser 16 (está ${TOTAL})`);
const texto = (v, onde) => { if (typeof v !== "string" || !v.trim()) erro(`${onde}: texto vazio ou ausente`); };
const vistos = new Set();
LICOES.forEach((l, i) => {
  const L = `Lição ${l.n ?? "(sem número, posição " + (i + 1) + ")"}`;
  if (!Number.isInteger(l.n) || l.n < 1 || l.n > 16) erro(`${L}: número deve ser de 1 a 16`);
  if (vistos.has(l.n)) erro(`${L}: número repetido`);
  vistos.add(l.n);
  if (i > 0 && l.n <= LICOES[i - 1].n) erro(`${L}: lições fora de ordem`);
  texto(l.titulo, `${L} título`); texto(l.ref, `${L} referência`); texto(l.resumo, `${L} resumo`); texto(l.vida, `${L} "para a vida"`);
  texto(l.versiculo?.texto, `${L} versículo`); texto(l.versiculo?.ref, `${L} referência do versículo`);
  if (!Array.isArray(l.pontos) || !l.pontos.length) erro(`${L}: sem pontos principais`);
  else l.pontos.forEach((p, k) => texto(p, `${L} ponto ${k + 1}`));
  if (!Array.isArray(l.desafio) || l.desafio.length !== 6) erro(`${L}: desafio da semana deve ter 6 dias`);
  else l.desafio.forEach((d, k) => { if (!Array.isArray(d) || d.length !== 4) erro(`${L} desafio dia ${k + 1}: deve ter [dia, leitura, pergunta, resposta]`); else d.forEach(c => texto(c, `${L} desafio ${d[0]}`)); });
  // Quiz = pergunta do Kahoot: limites do Kahoot (120 / 75 caracteres)
  const q = l.quiz;
  if (!q) { erro(`${L}: sem pergunta do quiz`); return; }
  texto(q.p, `${L} pergunta do quiz`); texto(q.pq, `${L} explicação do quiz`);
  if (q.p && q.p.length > 120) erro(`${L}: pergunta do quiz com ${q.p.length} caracteres (Kahoot aceita 120)`);
  if (!Array.isArray(q.op) || q.op.length !== 4) erro(`${L}: o quiz deve ter 4 alternativas`);
  else {
    q.op.forEach((o, k) => { texto(o, `${L} alternativa ${k + 1}`); if (o && o.length > 75) erro(`${L}: alternativa "${o}" com ${o.length} caracteres (Kahoot aceita 75)`); });
    if (new Set(q.op).size !== 4) erro(`${L}: alternativas repetidas no quiz`);
  }
});

// 3. Arquivos referenciados existem
const html = ler("index.html");
for (const [, ref] of html.matchAll(/(?:href|src)="([^"#:][^"]*)"/g)) if (!existsSync(join(PUB, ref))) erro(`index.html aponta para "${ref}", que não existe`);
for (const [, ref] of html.matchAll(/url\(([^)"']+)\)/g)) if (!existsSync(join(PUB, ref))) erro(`index.html usa a fonte "${ref}", que não existe`);
const manifest = JSON.parse(ler("manifest.webmanifest"));
for (const ic of manifest.icons || []) if (!existsSync(join(PUB, ic.src))) erro(`manifest aponta para "${ic.src}", que não existe`);

// 4. Segurança: CSP presente, nada inline executável, nenhum endereço externo
if (!/http-equiv="Content-Security-Policy"/.test(html)) erro("index.html sem Content-Security-Policy");
if (/<script>(?!\s*<\/script>)/.test(html)) erro("index.html tem <script> inline (a CSP bloqueia): mova para app.js");
for (const f of ["index.html", "app.js", "licoes.js"]) {
  const src = ler(f);
  if (/\son[a-z]+="/i.test(src)) erro(`${f}: atributo de evento inline (ex.: onclick="..."). Use data-hash ou addEventListener`);
  const ext = src.match(/https?:\/\/[^\s"'`)]+/g);
  if (ext) erro(`${f}: endereço externo encontrado (${ext[0]}). O site não deve depender de terceiros`);
}

// 5. Só arquivos esperados vão ao ar (evita publicar PDF/transcrição por engano)
const permitidos = /\.(html|js|png|woff2|webmanifest)$/;
const andar = d => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? andar(join(d, e.name)) : [join(d, e.name)]);
for (const f of andar(PUB)) if (!permitidos.test(f)) erro(`arquivo inesperado em public/: ${f.slice(PUB.length + 1)}`);

if (erros.length) {
  console.error(`✗ ${erros.length} problema(s) encontrado(s):\n` + erros.map(e => "  - " + e).join("\n"));
  process.exit(1);
}
console.log(`✓ Site válido: ${LICOES.length} de ${TOTAL} lições publicadas, ${LICOES.length} pergunta(s) do quiz dentro dos limites do Kahoot.`);
