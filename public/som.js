// Sons do Rally: tudo é gerado pelo navegador (Web Audio). Não há arquivo de áudio,
// então não há direito autoral, o site continua leve e a CSP não muda.
// O celular só libera som depois de um toque na tela; antes disso, nada toca.
(() => {
  const CHAVE = "g252-som", CHAVE_FUNDO = "g252-fundo";
  let ligado = true, fundo = true; // fundo = música calma que toca enquanto nada acontece
  try { ligado = localStorage.getItem(CHAVE) !== "0"; fundo = localStorage.getItem(CHAVE_FUNDO) !== "0"; } catch (e) {}
  let ctx = null, mestre, busMus, busFx, BRANCO, desejada = null, atual = null, seq = null;

  // ---------- Partituras ----------
  // Cada palavra é um passo (colcheia): nota (C5, F#4, Bb2), "-" segura a anterior, "." é pausa,
  // "x" é batida (ruído). A barra "|" só serve para organizar os compassos.
  const MUSICAS = {
    abertura: { bpm: 150, depois: "mapa", vozes: [
      { tipo: "square", vol: .14, notas: "C5 E5 G5 C6 - . G5 C6 | E6 - - D6 C6 - G5 - | A5 - C6 - G5 E5 C5 E5 | G5 - - - C6 - - -" },
      { tipo: "triangle", vol: .3, notas: "C3 . C3 . C3 . G2 . | A2 . A2 . F2 . G2 . | F2 . F2 . C3 . C3 . | G2 . G2 . C3 - - -" },
      { tipo: "ruido", vol: .1, notas: "x . x . x . x . | x . x . x . x x | x . x . x . x . | x . x x x - - -" }] },
    // calma, para quando nada está acontecendo (mapa e lições)
    mapa: { bpm: 84, vozes: [
      { tipo: "triangle", vol: .11, notas: "A4 - C5 - F5 - . . | E5 - - - C5 - . . | D5 - F5 - A5 - G5 - | F5 - - - . . . . | C5 - A4 - F4 - . . | G4 - - - E4 - . . | F4 - A4 - D5 - C5 - | F4 - - - . . . ." },
      { tipo: "sine", vol: .16, notas: "F2 - - - - - - - | C3 - - - - - - - | D3 - - - Bb2 - - - | C3 - - - F2 - - - | F2 - - - - - - - | C3 - - - - - - - | D3 - - - Bb2 - - - | C3 - - - F2 - - -" }] },
    // tensa, durante as perguntas do quiz
    quiz: { bpm: 132, vozes: [
      { tipo: "square", vol: .07, notas: "A2 A2 A3 A2 A2 A2 A3 A2 | A2 A2 A3 A2 A2 A2 A3 A2 | F2 F2 F3 F2 F2 F2 F3 F2 | E2 E2 E3 E2 G#2 G#2 G#3 G#2" },
      { tipo: "square", vol: .05, notas: "E5 . . E5 . . F5 . | E5 . . . . . . . | C5 . . C5 . . D5 . | B4 . . . G#4 . . ." },
      { tipo: "ruido", vol: .04, notas: "x x x x x x x x | x x x x x x x x | x x x x x x x x | x x x x x x x x" }] },
    // fanfarra de chegada, no fim do quiz
    chegada: { bpm: 160, depois: "mapa", vozes: [
      { tipo: "square", vol: .13, notas: "G4 C5 E5 G5 - E5 G5 - | - - . . A5 G5 A5 B5 | C6 - - - - - - -" },
      { tipo: "triangle", vol: .3, notas: "C3 . . . . . C3 . | . . . . F3 . G3 . | C3 - - - - - - -" },
      { tipo: "ruido", vol: .1, notas: "x . . . x . x . | . . . . x x x x | x - - - - - - -" }] }
  };

  const NOTAS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const hz = m => 440 * 2 ** ((m - 69) / 12);
  const midi = s => { const m = s.match(/^([A-G])(#|b)?(\d)$/); return 12 * (+m[3] + 1) + NOTAS[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0); };
  function partitura(txt) {
    const ev = []; let p = 0;
    for (const tk of txt.split(/\s+/).filter(t => t && t !== "|")) {
      const ult = ev[ev.length - 1];
      if (tk === "-") { if (ult && ult.passo + ult.dur === p) ult.dur++; }
      else if (tk !== ".") ev.push({ passo: p, nota: tk === "x" ? 0 : midi(tk), dur: 1 });
      p++;
    }
    return { ev, passos: p };
  }

  // ---------- Instrumentos ----------
  function tom(t, f, dur, tipo, vol, destino, f2) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tipo; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .008);
    g.gain.setValueAtTime(vol, Math.max(t + .01, t + dur - .05)); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g).connect(destino); o.start(t); o.stop(t + dur + .02);
  }
  function ruido(t, dur, vol, destino, corte = 5000) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = BRANCO; f.type = "highpass"; f.frequency.value = corte;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    s.connect(f).connect(g).connect(destino); s.start(t); s.stop(t + dur + .02);
  }
  // ronco do carro: dente de serra grave, abafado, com tremido; "curva" = rotação ao longo do tempo
  function motor(t, dur, curva, vol = .2) {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    o.type = "sawtooth"; f.type = "lowpass"; f.frequency.value = 800;
    curva.forEach((v, i) => i ? o.frequency.linearRampToValueAtTime(v, t + dur * i / (curva.length - 1)) : o.frequency.setValueAtTime(v, t));
    lfo.frequency.value = 26; lg.gain.value = vol * .35; lfo.connect(lg).connect(g.gain);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .06);
    g.gain.setValueAtTime(vol, t + dur - .2); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(f).connect(g).connect(busFx);
    o.start(t); lfo.start(t); o.stop(t + dur + .05); lfo.stop(t + dur + .05);
  }
  const arpejo = (t, notas, passo, dur, tipo, vol) => notas.forEach((n, i) => tom(t + i * passo, hz(n), dur, tipo, vol, busFx));
  const EFEITOS = {
    clique: t => tom(t, 1400, .035, "square", .04, busFx),
    tique: t => tom(t, 1050, .06, "sine", .2, busFx),
    trava: t => { tom(t, 660, .07, "square", .07, busFx); tom(t + .07, 990, .1, "square", .07, busFx); },
    item: t => arpejo(t, [72, 76, 79, 84], .07, .12, "square", .06),
    etapa: t => { arpejo(t, [67, 72, 76, 79], .09, .14, "triangle", .22); tom(t + .36, hz(84), .45, "triangle", .22, busFx); },
    fanfarra: t => { arpejo(t, [72, 76, 79], .1, .12, "square", .07); [72, 76, 79, 84].forEach(n => tom(t + .32, hz(n), .7, "square", .045, busFx)); },
    motor: t => { ruido(t, .18, .25, busFx, 800); motor(t + .05, 2, [42, 55, 150, 75, 110, 60]); },
    vrum: t => motor(t, .75, [70, 190, 95], .16)
  };

  // ---------- Sequenciador (agenda as notas um pouco à frente, para o ritmo não atrasar) ----------
  function parar() { clearInterval(seq); seq = null; }
  function musica(nome) {
    desejada = nome;
    if (!ctx) return;
    const alvo = nome === "mapa" && !fundo ? null : nome; // música de fundo desligada = silêncio
    if (atual === alvo) return;
    atual = alvo; parar();
    if (!alvo) return;
    const m = MUSICAS[nome], passo = 60 / m.bpm / 2;
    const vozes = m.vozes.map(v => ({ ...v, ...partitura(v.notas) }));
    const total = Math.max(...vozes.map(v => v.passos));
    let p = 0, t = ctx.currentTime + .06;
    seq = setInterval(() => {
      while (t < ctx.currentTime + .15) {
        if (p >= total) {
          if (m.depois) { parar(); atual = null; setTimeout(() => { if (desejada === nome) musica(m.depois); }, Math.max(0, (t - ctx.currentTime) * 1000)); return; }
          p = 0;
        }
        for (const v of vozes) for (const e of v.ev) if (e.passo === p) {
          if (v.tipo === "ruido") ruido(t, Math.min(e.dur * passo, .4), v.vol, busMus);
          else tom(t, hz(e.nota), e.dur * passo * .92, v.tipo, v.vol, busMus);
        }
        p++; t += passo;
      }
    }, 30);
  }
  function tocar(nome) { if (ctx && ligado) EFEITOS[nome](ctx.currentTime + .01); }

  function destravar() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      mestre = ctx.createGain(); mestre.gain.value = ligado ? 1 : 0; mestre.connect(ctx.destination);
      busMus = ctx.createGain(); busMus.gain.value = .6; busMus.connect(mestre);
      busFx = ctx.createGain(); busFx.connect(mestre);
      BRANCO = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = BRANCO.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === "suspended") ctx.resume();
    // espera o resto do toque: quem tocou pode estar pedindo outra música (ex.: "Ligar o motor")
    setTimeout(() => { if (desejada && atual !== desejada) musica(desejada); }, 0);
  }

  function alternar() {
    ligado = !ligado;
    try { localStorage.setItem(CHAVE, ligado ? "1" : "0"); } catch (e) {}
    if (mestre) mestre.gain.setTargetAtTime(ligado ? 1 : 0, ctx.currentTime, .05);
    const b = document.getElementById("snd");
    if (b) { b.textContent = ligado ? "🔊" : "🔇"; b.setAttribute("aria-label", ligado ? "Desligar o som" : "Ligar o som"); }
  }
  function alternarFundo() {
    fundo = !fundo;
    try { localStorage.setItem(CHAVE_FUNDO, fundo ? "1" : "0"); } catch (e) {}
    musica(desejada); // liga ou silencia a música de fundo na hora; a do quiz não é afetada
    const b = document.getElementById("musica");
    if (b) { b.classList.toggle("off", !fundo); b.setAttribute("aria-pressed", fundo); }
  }

  // Qualquer toque libera o som; botões fazem "clique" (as respostas do quiz têm som próprio)
  document.addEventListener("click", e => {
    destravar();
    if (e.target.closest("#snd")) { alternar(); tocar("clique"); return; }
    if (e.target.closest("#musica")) { alternarFundo(); tocar("clique"); return; }
    const b = e.target.closest("button, summary");
    if (b && !b.closest(".ch")) tocar("clique");
  }, true);
  // Celular bloqueado ou outro app aberto: a música pausa
  document.addEventListener("visibilitychange", () => { if (ctx) document.hidden ? ctx.suspend() : ctx.resume(); });

  window.Som = { musica, tocar, destravar, get ligado() { return ligado; }, get fundo() { return fundo; }, get tocando() { return atual; } };
})();
