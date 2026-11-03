// Gera public/licoes.js a partir do arquivo de revisão do professor (Markdown).
//   node scripts/sincronizar.mjs "../Resumo — Os Heróis do Antigo Testamento.md"
// O arquivo de revisão fica fora do repositório. Marcas "=> OK" e linhas de aviso (⚠️) são ignoradas.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const origem = process.argv[2];
if (!origem) { console.error("Uso: node scripts/sincronizar.mjs <arquivo de revisão .md>"); process.exit(1); }
const destino = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "licoes.js");

const linhas = readFileSync(origem, "utf8").split(/\r?\n/)
  .map(l => l.replace(/\s*=>\s*OK\b.*$/i, "").trimEnd());   // tira as marcas de revisão
const erros = [], licoes = [];

// Separa os blocos "## Lição N — Título"
let atual = null;
for (const l of linhas) {
  const m = l.match(/^## Lição (\d+)\s*[—–-]\s*(.+)$/);
  if (m) { atual = { n: +m[1], titulo: m[2].trim(), corpo: [] }; licoes.push(atual); continue; }
  if (atual) atual.corpo.push(l);
}

const semAspas = s => s.replace(/^["“]|["”]$/g, "");
const resultado = licoes.map(({ n, titulo, corpo }) => {
  const L = `Lição ${n}`;
  const idx = rotulo => corpo.findIndex(l => l.startsWith(rotulo));
  const paragrafoApos = rotulo => {
    const i = idx(rotulo); if (i < 0) return "";
    const out = [];
    for (let k = i + 1; k < corpo.length; k++) {
      const l = corpo[k].trim();
      if (!l) { if (out.length) break; else continue; }
      if (l.startsWith("**") || l.startsWith("⚠️")) break;
      out.push(l);
    }
    return out.join(" ");
  };
  const lic = { n, titulo };
  const ref = corpo.find(l => /^\*\(.+\)\*$/.test(l.trim()));
  lic.ref = ref ? ref.trim().slice(2, -2) : "";

  const iv = idx("**Versículo:**");
  const vers = iv >= 0 ? corpo.slice(iv + 1).find(l => l.startsWith("> ")) : null;
  const vm = vers && vers.slice(2).match(/^(.*?)\s*[—–]\s*([^—–]+)$/);
  lic.versiculo = vm ? { texto: semAspas(vm[1].trim()), ref: vm[2].trim() } : { texto: "", ref: "" };

  lic.resumo = paragrafoApos("**Resumo:**");

  const ip = idx("**Pontos principais:**");
  lic.pontos = [];
  if (ip >= 0) for (let k = ip + 1; k < corpo.length; k++) {
    const m = corpo[k].match(/^\s*\d+\.\s+(.+)$/);
    if (m) lic.pontos.push(m[1].trim()); else if (corpo[k].trim() && lic.pontos.length) break;
  }

  const vida = corpo.find(l => l.startsWith("**Para a vida:**"));
  lic.vida = vida ? vida.replace("**Para a vida:**", "").trim() : "";

  lic.desafio = corpo.filter(l => /^\|\s*(SEG|TER|QUA|QUI|SEX|SÁB)\s*\|/.test(l))
    .map(l => l.split("|").slice(1, -1).map(c => c.trim()));

  const iq = idx("**Pergunta do quiz");
  const quiz = { p: "", op: [], pq: "" };
  if (iq >= 0) {
    for (let k = iq + 1; k < corpo.length; k++) {
      const l = corpo[k].trim();
      if (!l) { if (quiz.p) continue; else continue; }
      if (l.startsWith("*Explicação")) { quiz.pq = l.replace(/^\*Explicação[^*]*\*\s*/, "").trim(); break; }
      if (l.startsWith("- ✅")) quiz.op.unshift(l.slice(3).trim());     // correta sempre na 1ª posição
      else if (l.startsWith("- ")) quiz.op.push(l.slice(2).trim());
      else if (!quiz.p) quiz.p = l;
      if (l === "---") break;
    }
    if (!corpo.slice(iq).some(l => l.trim().startsWith("- ✅"))) erros.push(`${L}: nenhuma alternativa marcada com ✅`);
  }
  lic.quiz = quiz;
  return lic;
});

if (erros.length) { console.error("✗ " + erros.join("\n✗ ")); process.exit(1); }
const js = `// GERADO por scripts/sincronizar.mjs a partir do arquivo de revisão do professor.
// Não edite à mão: edite o Resumo (.md) e rode o sincronizador de novo.
// quiz.op: a primeira alternativa é a correta; o site embaralha na tela.
window.TOTAL_LICOES = 16;

window.LICOES = ${JSON.stringify(resultado, null, 2)};
`;
writeFileSync(destino, js);
console.log(`✓ ${resultado.length} lição(ões) sincronizada(s) em public/licoes.js: ${resultado.map(l => l.n).join(", ")}`);
