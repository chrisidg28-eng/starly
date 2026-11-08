/* ================= Efectos de sonido =================
   Se generan con Web Audio (sin archivos que descargar).
   SFX.play("ok" | "bad" | "win" | "lose"), SFX.toggle(), SFX.on() */
window.SFX = (function(){
  const KEY = "starly.sound";
  let on = true, ctx = null, master = null;
  try { on = localStorage.getItem(KEY) !== "off"; } catch (e) {}

  function audio(){
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.18;   // volumen general bajito
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // Una nota con ataque rápido y caída suave.
  function note(freq, start, dur, type = "triangle", vol = 1, slideTo = 0){
    const t = ctx.currentTime + start;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  const SOUNDS = {
    // acierto: dos notas que suben
    ok(){ note(784, 0, .12, "triangle", .9); note(1175, .09, .22, "triangle", .9); note(2350, .09, .18, "sine", .15); },
    // error: zumbido corto que baja
    bad(){ note(220, 0, .28, "square", .35, 140); note(110, 0, .3, "triangle", .6, 80); },
    // ganar: arpegio alegre y un brillo al final
    win(){
      [523, 659, 784, 1047].forEach((f, i) => note(f, i * .1, .25, "triangle", .8));
      note(1319, .42, .5, "triangle", .7); note(1568, .42, .5, "sine", .35);
      [2093, 2637, 3136].forEach((f, i) => note(f, .55 + i * .07, .2, "sine", .15));
    },
    // corte de espada / shuriken: silbido rápido que baja
    slash(){ note(2400, 0, .12, "sawtooth", .12, 500); note(1600, .02, .1, "sine", .2, 300); },
    // rugido del kaiju: grave y rasposo
    roar(){ note(90, 0, .5, "sawtooth", .35, 55); note(130, .05, .45, "square", .15, 70); },
    // claxon del coche (diagnóstico del pollo)
    honk(){ [0, .18].forEach(t => { note(370, t, .14, "square", .3); note(466, t, .14, "square", .25); }); },
    // perder: tres notas lentas que bajan
    lose(){ note(392, 0, .3, "triangle", .7); note(330, .28, .3, "triangle", .7); note(262, .56, .6, "triangle", .7, 220); }
  };

  return {
    on: () => on,
    play(name){
      if (!on || !SOUNDS[name]) return;
      try { if (audio()) SOUNDS[name](); } catch (e) {}
    },
    toggle(){
      on = !on;
      try { localStorage.setItem(KEY, on ? "on" : "off"); } catch (e) {}
      if (on) this.play("ok");
      return on;
    }
  };
})();
