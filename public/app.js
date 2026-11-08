const TOTAL = window.TOTAL_LICOES || 16;
const LICOES = window.LICOES || [];
const byN = Object.fromEntries(LICOES.map(l => [l.n, l]));
const ZONAS = [
  { nome: "Estrada de Terra", cls: "z1" },
  { nome: "Lamaçal", cls: "z2" },
  { nome: "Dunas de Areia", cls: "z3" },
  { nome: "Montanha de Neve", cls: "z4" }
];
const zonaDe = n => ZONAS[Math.floor((n - 1) / 4)];
const LOCAL = location.protocol === "file:" || ["localhost", "127.0.0.1"].includes(location.hostname); // teste no computador: quiz liberado
const app = document.getElementById("app"), topEl = document.getElementById("top");
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ---------- Armazenamento (só neste aparelho) ----------
const get = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
let visitadas = new Set(get("g252-visitadas", []));
let ultima = get("g252-ultima", 0);
function visitar(n) { visitadas.add(n); ultima = n; put("g252-visitadas", [...visitadas]); put("g252-ultima", n); }
const quizLiberado = () => LOCAL || visitadas.size >= TOTAL;

// ---------- Código de progresso ----------
// Cada etapa visitada é 1 bit (16 etapas = 16 bits), embaralhado com uma máscara
// e seguido de 1 dígito verificador, para pegar erro de digitação: RALLY-XXXXC
const MASCARA = 0xA5C3;
const verificador = hex => ([...hex].reduce((s, ch, i) => s + parseInt(ch, 16) * (i + 3), 0) % 16).toString(16).toUpperCase();
function gerarCodigo() {
  let bits = 0;
  visitadas.forEach(n => { bits |= 1 << (n - 1); });
  const hex = ((bits ^ MASCARA) & 0xFFFF).toString(16).toUpperCase().padStart(4, "0");
  return "RALLY-" + hex + verificador(hex);
}
function lerCodigo(txt) {
  const s = txt.toUpperCase().replace(/[^0-9A-Z]/g, "").replace(/^RALLY/, "");
  if (!/^[0-9A-F]{5}$/.test(s)) return null;
  const hex = s.slice(0, 4);
  if (verificador(hex) !== s[4]) return null;
  const bits = (parseInt(hex, 16) ^ MASCARA) & 0xFFFF, etapas = [];
  for (let n = 1; n <= TOTAL; n++) if (bits & (1 << (n - 1))) etapas.push(n);
  return etapas;
}

// ---------- Abertura ----------
const intro = document.getElementById("intro");
function fecharIntro() { intro.classList.add("out"); setTimeout(() => intro.remove(), 550); }
intro.querySelectorAll("[data-go]").forEach(b => b.onclick = fecharIntro);
if (location.hash) intro.remove();
// A animação espera o toque em "Ligar o motor": só depois de um toque o celular deixa tocar som
intro.querySelector("#ligar").onclick = () => {
  Som.musica("abertura"); Som.destravar(); Som.tocar("motor");
  intro.classList.remove("wait");
  setTimeout(() => document.getElementById("icar") && document.getElementById("icar").classList.add("stop"), 1500);
};

// ---------- Topo ----------
function topo(voltar) {
  topEl.innerHTML = (voltar ? `<button class="back" type="button" data-hash="">← Mapa</button>` : `<img src="logo-g252.png" alt="">`) +
    `<div class="t-name">Rally<small>Geração 252</small></div><span class="pill">${visitadas.size}/${TOTAL}<span class="pw"> etapas</span></span>` +
    `<button class="snd${Som.fundo ? "" : " off"}" type="button" id="musica" aria-label="Música de fundo" aria-pressed="${Som.fundo}">🎵</button>` +
    `<button class="snd" type="button" id="snd" aria-label="${Som.ligado ? "Desligar o som" : "Ligar o som"}">${Som.ligado ? "🔊" : "🔇"}</button>`;
}

// ---------- Mapa ----------
const COLS = [1, 2, 3, 2]; // zigue-zague dentro de cada zona
function mapa() {
  topo(false);
  let html = `<section class="hero">
      <h1>Os Heróis do Antigo Testamento</h1>
      <p>Percorra as ${TOTAL} etapas do Rally. Cada etapa é uma lição. Abra todas para liberar o <b>Quiz da Chegada</b>!</p>
      <div class="pais"><span class="ph">Aviso aos pais</span>O progresso fica salvo <b>só neste celular</b>, e nenhum dado é enviado para a igreja nem para ninguém. Para não perder o avanço, use sempre o mesmo aparelho e o mesmo navegador (sem aba anônima) e <b>instale o Rally na tela inicial</b>.
        <details><summary>Como instalar na tela inicial</summary>
          <ol><li><b>iPhone:</b> abra este link no <b>Safari</b>, toque em <b>Compartilhar</b> (o quadrado com a seta para cima) e depois em <b>Adicionar à Tela de Início</b>.</li>
          <li><b>Android:</b> abra no <b>Chrome</b>, toque no menu <b>⋮</b> e depois em <b>Adicionar à tela inicial</b> ou <b>Instalar app</b>.</li></ol>
          <p>Depois de instalar, abra sempre pelo ícone do Rally. Se o avanço não aparecer lá, use o código de progresso abaixo.</p>
        </details>
      </div>
      <div class="codebox">
        ${visitadas.size
          ? `<span class="lbl">Seu código de progresso</span><div class="code-row"><span class="code" id="code">${gerarCodigo()}</span><button class="mini" type="button" id="copy">Copiar</button></div><span>Tire um print ou anote. Se o avanço sumir, é só digitar o código aqui.</span>`
          : `<span class="lbl">Código de progresso</span><span>Abra a primeira etapa para ganhar o seu código.</span>`}
        <button class="mini alt" type="button" id="openRestore" style="justify-self:start">Recuperar meu progresso</button>
        <div id="restoreBox" hidden><div class="restore"><input id="codeIn" placeholder="RALLY-XXXXX" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Código de progresso"><button class="mini" type="button" id="doRestore">Recuperar</button></div></div>
        <p class="msg" id="restoreMsg" hidden></p>
      </div>
    </section>
    <div class="map" id="map"><svg class="road" id="road"></svg>
    <div class="start" data-pt><span class="flagstrip">LARGADA</span></div>`;
  ZONAS.forEach((z, zi) => {
    html += `<section class="zone ${z.cls}"><h2>${z.nome}<small>Etapas ${zi * 4 + 1}-${zi * 4 + 4}</small></h2><div class="stops">`;
    for (let k = 0; k < 4; k++) {
      const n = zi * 4 + k + 1, l = byN[n];
      const st = !l ? "soon" : visitadas.has(n) ? "done" : "next";
      html += `<div class="stop ${st}" style="grid-column:${COLS[k]};grid-row:${k + 1}">
        <button type="button" data-pt data-n="${n}" ${l ? "" : "disabled"} aria-label="Etapa ${n}${l ? ": " + esc(l.titulo) : ", em breve"}">${n}</button>
        <span class="name">${l ? esc(l.titulo) : "Em breve"}</span></div>`;
    }
    html += `</div></section>`;
  });
  const pct = Math.round(visitadas.size / TOTAL * 100);
  html += `<div class="finish"><div class="finish-card" data-pt>
      <h2>🏁 Chegada</h2>
      ${quizLiberado()
        ? `<p>Você completou o percurso! Agora é a hora do Quiz.</p><button class="btn" type="button" data-hash="quiz">Abrir o Quiz</button>${LOCAL && visitadas.size < TOTAL ? `<span class="testmode">Modo de teste no computador: Quiz liberado</span>` : ""}`
        : `<p>🔒 O Quiz libera quando você abrir as ${TOTAL} etapas.</p><div class="bar"><i style="width:${pct}%"></i></div><p><b>${visitadas.size} de ${TOTAL}</b> etapas abertas</p>`}
    </div></div></div>`;
  app.innerHTML = html;
  app.querySelectorAll(".stop button[data-n]").forEach(b => b.onclick = () => location.hash = "licao-" + b.dataset.n);
  ligarCodigo();
  desenharEstrada();
}
function ligarCodigo() {
  const copy = document.getElementById("copy");
  const aviso = (txt, ok) => { const msg = document.getElementById("restoreMsg"); msg.hidden = false; msg.className = "msg " + (ok ? "ok" : "no"); msg.textContent = txt; };
  if (copy) copy.onclick = () => {
    const code = document.getElementById("code").textContent;
    const selecionar = () => { const r = document.createRange(); r.selectNodeContents(document.getElementById("code")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
    try {
      navigator.clipboard.writeText(code).then(() => { copy.textContent = "Copiado!"; setTimeout(() => copy.textContent = "Copiar", 1800); }, selecionar);
    } catch (e) { selecionar(); }
  };
  document.getElementById("openRestore").onclick = () => { const box = document.getElementById("restoreBox"); box.hidden = !box.hidden; if (!box.hidden) document.getElementById("codeIn").focus(); };
  const recuperar = () => {
    const etapas = lerCodigo(document.getElementById("codeIn").value);
    if (!etapas) { aviso("Esse código não confere. Confira as letras e os números e tente de novo.", false); return; }
    const antes = visitadas.size;
    etapas.forEach(n => visitadas.add(n));
    put("g252-visitadas", [...visitadas]);
    if (etapas.length) { ultima = Math.max(...etapas, ultima); put("g252-ultima", ultima); }
    mapa();
    aviso(`Pronto! ${visitadas.size - antes} etapa(s) recuperada(s). Você tem ${visitadas.size} de ${TOTAL}.`, true);
  };
  document.getElementById("doRestore").onclick = recuperar;
  document.getElementById("codeIn").onkeydown = e => { if (e.key === "Enter") recuperar(); };
}
function desenharEstrada() {
  const map = document.getElementById("map"), road = document.getElementById("road");
  if (!map) return;
  const mr = map.getBoundingClientRect();
  const pts = [...map.querySelectorAll("[data-pt]")].map(el => {
    const r = el.getBoundingClientRect();
    return [r.left - mr.left + r.width / 2, r.top - mr.top + r.height / 2, el];
  });
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], dy = (y1 - y0) / 2;
    d += ` C${x0},${y0 + dy} ${x1},${y1 - dy} ${x1},${y1}`;
  }
  road.setAttribute("viewBox", `0 0 ${mr.width} ${mr.height}`);
  road.innerHTML = `<path d="${d}" fill="none" stroke="#3b2a1a" stroke-width="30" stroke-linecap="round" opacity=".75"/>
    <path d="${d}" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="10 12" stroke-linecap="round" opacity=".8"/>`;
  // carrinho na última etapa aberta (ou na largada)
  const alvo = pts.find(p => p[2].dataset.n == ultima) || pts[0];
  let car = map.querySelector(".car-on-map");
  if (!car) { car = document.createElement("div"); car.className = "car-on-map"; car.innerHTML = `<svg viewBox="0 0 120 64"><use href="#car"/></svg>`; map.appendChild(car); }
  // carro à direita da etapa; se a etapa estiver na metade direita, vai para a esquerda
  car.style.left = (alvo[0] > mr.width / 2 ? alvo[0] - 30 - 64 : alvo[0] + 30) + "px";
  car.style.top = (alvo[1] - 52) + "px";
}

// ---------- Lição ----------
function licao(n) {
  const l = byN[n];
  if (!l) { location.hash = ""; return; }
  const nova = !visitadas.has(n);
  visitar(n);
  Som.tocar("vrum");
  if (nova) setTimeout(() => Som.tocar("etapa"), 650);
  topo(true);
  const z = zonaDe(n), prox = byN[n + 1];
  app.innerHTML = `<article class="page">
    <div class="etapa"><div class="num">${n}</div><div class="meta">
      <div class="zl">Etapa ${n} · ${z.nome}</div><h1>${esc(l.titulo)}</h1><div class="ref">${esc(l.ref)}</div></div></div>

    <section><h2>Versículo</h2><div class="verse">
      <div class="vt" id="vt"></div><cite>${esc(l.versiculo.ref)}</cite>
      <div class="row"><button class="sbtn main" type="button" id="hide">Esconder uma palavra</button><button class="sbtn" type="button" id="show">Mostrar tudo</button></div>
      <p class="note">Leia em voz alta. A cada rodada, esconda mais uma palavra e tente falar de memória. Toque na lacuna para ver a palavra.</p>
    </div></section>

    <section class="resumo"><h2>Resumo</h2><p>${esc(l.resumo)}</p></section>

    <section><h2>Pontos principais</h2><ol class="pontos">${l.pontos.map((p, i) => `<li><span>${i + 1}</span>${esc(p)}</li>`).join("")}</ol></section>

    <div class="vida"><b>Para a vida:</b> ${esc(l.vida)}</div>

    <section><h2>Desafio da semana</h2><div class="days" id="days"></div></section>

    <nav class="nav"><button class="btn ghost" type="button" data-hash="">← Mapa</button>
      ${prox ? `<button class="btn" type="button" data-hash="licao-${n + 1}">Próxima etapa →</button>` : ""}</nav>
  </article>`;
  // versículo
  const vt = document.getElementById("vt");
  vt.innerHTML = l.versiculo.texto.split(" ").map(w => `<span class="w">${esc(w)}</span>`).join(" ");
  const ws = [...vt.querySelectorAll(".w")];
  document.getElementById("hide").onclick = () => { const v = ws.filter(s => !s.classList.contains("hid")); if (v.length) v[Math.floor(Math.random() * v.length)].classList.add("hid"); };
  document.getElementById("show").onclick = () => ws.forEach(s => s.classList.remove("hid"));
  vt.onclick = e => e.target.classList.remove("hid");
  // desafio
  const key = "g252-desafio-" + n, store = get(key, {}), days = document.getElementById("days");
  l.desafio.forEach(([tag, ref, q, a], i) => {
    const d = document.createElement("div");
    d.className = "day";
    d.innerHTML = `<div class="dh"><span class="tag">${tag}</span><span class="lr">Leia ${esc(ref)}</span></div><p>${esc(q)}</p>
      <textarea id="t${n}-${i}" aria-label="Sua resposta de ${tag}" placeholder="Escreva sua resposta"></textarea>
      <div class="dbar"><label class="chk"><input type="checkbox" id="c${n}-${i}"> Li e respondi</label><button class="link" type="button">Ver resposta</button></div>
      <p class="ans" hidden>${esc(a)}</p>`;
    days.appendChild(d);
    const t = d.querySelector("textarea"), c = d.querySelector("input"), b = d.querySelector(".link"), an = d.querySelector(".ans");
    t.value = store["t" + i] || ""; c.checked = !!store["d" + i];
    t.oninput = () => { store["t" + i] = t.value; put(key, store); };
    c.onchange = () => {
      store["d" + i] = c.checked; put(key, store);
      if (c.checked) Som.tocar(l.desafio.every((_, k) => store["d" + k]) ? "fanfarra" : "item");
    };
    b.onclick = () => { an.hidden = !an.hidden; b.textContent = an.hidden ? "Ver resposta" : "Esconder resposta"; };
  });
  scrollTo(0, 0);
}

// ---------- Quiz ----------
const TIME = 20;
let timerId;
function quiz() {
  topo(true);
  scrollTo(0, 0);
  if (!quizLiberado()) {
    const falta = [];
    for (let n = 1; n <= TOTAL; n++) if (!visitadas.has(n)) falta.push(n);
    app.innerHTML = `<div class="page"><div class="game locked"><div class="lk">🔒</div><h2>Quiz da Chegada</h2>
      <p class="lead">Abra todas as ${TOTAL} etapas para liberar o Quiz. Faltam estas:</p>
      <div class="missing">${falta.map(n => `<span>${n}</span>`).join("")}</div>
      <button class="btn" type="button" data-hash="">Voltar ao mapa</button></div></div>`;
    return;
  }
  const Q = LICOES.filter(l => l.quiz).map(l => ({ n: l.n, ...l.quiz }));
  app.innerHTML = `<div class="page"><div class="game" id="game"></div></div>`;
  const game = document.getElementById("game");
  const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(p => p[1]);
  let idx, total, log;
  const comecar = () => { idx = 0; total = 0; log = []; Som.musica("quiz"); perguntar(); };
  game.innerHTML = `<h2>Quiz da Chegada</h2><p class="lead">${Q.length} pergunta${Q.length > 1 ? "s" : ""}, uma de cada etapa · ${TIME} segundos cada.<br>Quanto mais rápido você acertar, mais pontos ganha! As respostas aparecem no final.</p>
    <div><button class="btn" type="button" id="go">Começar</button></div>`;
  document.getElementById("go").onclick = comecar;
  function perguntar() {
    const q = Q[idx], ordem = shuffle(q.op);
    game.innerHTML = `<div class="hud"><span>Pergunta ${idx + 1} de ${Q.length}</span><span id="secs">${TIME}s</span><span>${total} pts</span></div>
      <div class="timer"><i id="bar"></i></div><p class="qtext">${esc(q.p)}</p>
      <div class="grid4">${ordem.map((o, i) => `<button type="button" class="ch c${i}"><b>${"ABCD"[i]}</b><span>${esc(o)}</span></button>`).join("")}</div>`;
    const btns = [...game.querySelectorAll(".ch")], bar = document.getElementById("bar"), secs = document.getElementById("secs"), t0 = Date.now();
    let fim = false;
    const responder = (escolha, btn) => {
      if (fim) return; fim = true;
      clearInterval(timerId);
      btns.forEach(b => b.disabled = true);
      if (btn) btn.classList.add("pick");
      Som.tocar("trava"); // som neutro: não entrega se acertou
      const resta = Math.max(0, TIME - (Date.now() - t0) / 1000);
      const pts = escolha === q.op[0] ? Math.round(500 + 500 * resta / TIME) : 0;
      total += pts; log.push({ escolha, pts });
      setTimeout(() => { idx++; idx < Q.length ? perguntar() : final(); }, 700);
    };
    btns.forEach((b, i) => b.onclick = () => responder(ordem[i], b));
    clearInterval(timerId);
    let ultimoSeg = TIME;
    timerId = setInterval(() => {
      const resta = TIME - (Date.now() - t0) / 1000, seg = Math.max(0, Math.ceil(resta));
      bar.style.width = Math.max(0, resta / TIME * 100) + "%";
      secs.textContent = seg + "s";
      if (seg !== ultimoSeg) { ultimoSeg = seg; if (seg > 0 && seg <= 5) Som.tocar("tique"); }
      if (resta <= 0) responder(null);
    }, 100);
  }
  function final() {
    Som.musica("chegada");
    const acertos = log.filter(l => l.pts > 0).length;
    const msg = acertos === Q.length ? "Perfeito! Você está pronto para o Rally!" : acertos >= Q.length * .7 ? "Muito bem! Você estudou as lições." : "Bom começo! Releia as etapas e tente de novo.";
    game.innerHTML = `<div class="big">${total}</div><p class="lead">pontos · ${acertos} de ${Q.length} acertos</p>
      <h2>${msg}</h2><div><button class="btn" type="button" id="again">Jogar de novo</button></div>
      <div class="review">${Q.map((q, i) => {
        const l = log[i], ok = l.pts > 0;
        return `<div class="rv ${ok ? "" : "no"}"><p class="rq">Etapa ${q.n}. ${esc(q.p)}</p>
          <p>${ok ? "✓ Você acertou: " + esc(q.op[0]) + ` (+${l.pts})` : (l.escolha ? "✗ Você respondeu: " + esc(l.escolha) : "✗ O tempo acabou") + "<br>Resposta certa: <b>" + esc(q.op[0]) + "</b>"}</p>
          <small>${esc(q.pq)}</small></div>`;
      }).join("")}</div>`;
    document.getElementById("again").onclick = comecar;
  }
}

// ---------- Rotas ----------
function rota() {
  clearInterval(timerId);
  Som.musica("mapa"); // música calma no mapa, nas lições e na tela inicial do quiz
  const h = location.hash.slice(1);
  if (h === "quiz") quiz();
  else if (h.startsWith("licao-")) licao(+h.slice(6));
  else mapa();
}
addEventListener("hashchange", rota);
addEventListener("resize", () => { if (!location.hash) desenharEstrada(); });
rota();
if (document.fonts) document.fonts.ready.then(() => { if (!location.hash.slice(1)) desenharEstrada(); });

// Botões de navegação usam data-hash (sem onclick inline, por causa da CSP)
document.addEventListener("click", e => {
  const t = e.target.closest("[data-hash]");
  if (t) location.hash = t.dataset.hash;
});
