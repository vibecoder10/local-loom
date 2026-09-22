// Shared panel kit: builds one 'split' scene panel (kicker, kinetic title, points, stat, icons, image, keycap, timeline) and
// schedules every animation on the given GSAP timeline. Used by talking-head-9x16 and tutorial-16x9 (inlined by the builders).
// env: { root, before, tl, T, EASE, DATA, rect:{x,y,w,h}, innerW, startX, sfx:{title,count,lock,cut} }. Pure function of time: no timers, no randomness.
const esc = (v) => String(v).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
// The 4 "house" sound effects (Kenney CC0, via the RoboNuggets pack) with the gains already mastered in
// references/reel-production.md - do not re-derive gain/processing, just play the file at this volume.
// title: hero title landing (switch_001). count: a number finishing its count-up (glass_001). lock: a scene's
// resolution beat - match found, path chosen, tiles merged (confirmation_001). cut: scene-to-scene transition (click_003).
const SFX = {
  title: { file: 'switch_001.wav', dur: 0.62, gain: 1 },
  count: { file: 'glass_001.wav', dur: 0.292, gain: 1 },
  lock: { file: 'confirmation_001.wav', dur: 0.295, gain: 0.3 },
  cut: { file: 'click_003.wav', dur: 0.019, gain: 0.8 },
};
// A cue is a plain <audio class="clip"> element with a fixed start/duration, exactly like the camera/voice tracks
// already in every template - the renderer schedules playback from that declaration, no GSAP tween needed. `track`
// is the recipe's next free data-track-index for this role (recipes already use 0/1/2 for video+voice); no sfx
// scheduled if the caller didn't pass one (keeps this optional/backward compatible per template).
const playSfx = (root, before, role, at, track) => {
  const cfg = SFX[role]; if (!cfg || track == null || at < 0) return;
  const el = document.createElement('audio');
  el.className = 'clip'; el.src = 'assets/' + cfg.file; el.volume = cfg.gain;
  el.dataset.start = at.toFixed(3); el.dataset.duration = String(cfg.dur); el.dataset.trackIndex = String(track);
  root.insertBefore(el, before);
};
  const GLYPHS = {
    camera: ['....####....', '############', '#..........#', '#...####...#', '#..######..#', '#..######..#', '#...####...#', '#.........o#', '############'],
    tab: ['############', '#o.o.o.....#', '############', '#..........#', '#.########.#', '#..........#', '#.####.....#', '#..........#', '############'],
    film: ['############', '#..........#', '#..#.......#', '#..###.....#', '#..#####...#', '#..###.....#', '#..#.......#', '#..........#', '############'],
  };
  const glyphSvg = (name) => {
    const g = GLYPHS[name]; const rects = [];
    g.forEach((row, y) => [...row].forEach((c, x) => { if (c === '#' || c === 'o') rects.push('<rect x="' + x + '" y="' + y + '" width="1.03" height="1.03" fill="' + (c === 'o' ? '#E65D20' : '#161819') + '"/>'); }));
    return '<svg viewBox="0 0 ' + g[0].length + ' ' + g.length + '" shape-rendering="crispEdges">' + rects.join('') + '</svg>';
  };
  const tileFace = (it, tint) => {
    if (it.icon.startsWith('text:')) return '<div class="ttxt">' + esc(it.icon.slice(5)) + '</div>';
    if (GLYPHS[it.icon]) return glyphSvg(it.icon);
    const ic = DATA.icons[it.icon];
    return '<svg viewBox="' + ic.viewBox + '"><path d="' + ic.d + '" fill="' + ((it.tint || tint) === 'ink' ? '#161819' : (it.color || ic.color)) + '"/></svg>';
  };
const bare = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, '');
// Deterministic word splitter for the 'tokenize' visual: same input always yields the same pieces (no randomness).
const splitWord = (word, n) => {
  const w = word.toUpperCase(); const count = Math.max(2, Math.min(4, n || (w.length > 7 ? 3 : 2)));
  const size = Math.ceil(w.length / count); const pieces = [];
  for (let k = 0; k < w.length; k += size) pieces.push(w.slice(k, k + size));
  return pieces;
};

function buildPanel(scene, i, env) {
  const { root, before, tl, T, EASE, DATA, rect, innerW, startX, sfx } = env;
  const $ = (id) => document.getElementById(id);
  const el = document.createElement('div');
  const hasBody = (scene.points || []).length || scene.stat || scene.visual || scene.icons || scene.image;
  el.className = 'panel' + (hasBody ? '' : ' solo'); el.id = 'panel' + i;
  Object.assign(el.style, { left: rect.x + 'px', top: rect.y + 'px', width: rect.w + 'px', height: rect.h + 'px' });
  const pts = scene.points || [];
  const tw = (scene.title || '').replace(/\.$/, '').split(/\s+/).filter(Boolean);
  let body = '';
  if (pts.length) body += '<ul' + (scene.numbered ? ' class="numbered"' : '') + '>' + pts.map((p, k) => '<li id="p' + i + '_' + k + '">' + (scene.numbered ? '<span class="num">' + (k + 1) + '</span>' : '') + esc(p.text) + '</li>').join('') + '</ul>';
  if (scene.stat) body += '<div class="stat" id="stat' + i + '"><div class="v"' + (scene.stat.size ? ' style="font-size:' + Number(scene.stat.size) + 'px"' : '') + '><span id="cnt' + i + '">' + esc(scene.stat.value) + '</span><i>.</i></div><div class="l">' + esc(scene.stat.label || '') + '</div></div>';
  if (scene.visual === 'keycap') body += '<div class="stage"><div class="key" id="key' + i + '">' + esc(scene.key || 'M') + '</div><div class="keylbl" id="keylbl' + i + '">' + esc((scene.keyLabel || 'MARK MISTAKE').toUpperCase()) + '</div>' + Array.from({ length: 12 }, (_, k) => '<div class="px' + (k % 3 === 0 ? ' k' : '') + '" id="px' + i + '_' + k + '"></div>').join('') + '</div>';
  if (scene.visual === 'timeline') body += '<div class="stage"><div class="tl" id="tl' + i + '"></div><div class="tllbl" id="tllbl' + i + '">Cut. Gap closed.</div></div>';
  if (scene.visual === 'tokenize') {
    const word = (scene.word || 'TOKENIZE').toUpperCase();
    const pieces = (scene.pieces && scene.pieces.length ? scene.pieces : splitWord(word, scene.pieceCount)).map((p) => p.toUpperCase());
    body += '<div class="stage"><div class="tokword" id="tokword' + i + '">' + esc(word) + '</div><div class="tokrow" id="tokrow' + i + '">' + pieces.map((p, k) => '<div class="tokchip" id="tokc' + i + '_' + k + '">' + esc(p) + '</div>').join('') + '</div><div class="toklbl" id="toklbl' + i + '"><span id="tokcnt' + i + '">0</span> TOKENS</div></div>';
  }
  if (scene.visual === 'window') body += '<div class="stage"><div class="winframe" id="winframe' + i + '">' + Array.from({ length: 10 }, (_, k) => '<div class="wincell" id="wc' + i + '_' + k + '"></div>').join('') + '</div><div class="winlbl" id="winlbl' + i + '">CONTEXT FULL</div></div>';
  if (scene.visual === 'diskfiles') {
    const files = (scene.files && scene.files.length ? scene.files : ['who you are', 'what you tried', 'what failed']).slice(0, 4);
    body += '<div class="stage"><div class="diskstage"><div class="diskbase"></div>' + files.map((f, k) => '<div class="filetile" id="filet' + i + '_' + k + '"><div class="filelbl">' + esc((f || '').toUpperCase()) + '</div></div>').join('') + '</div></div>';
  }
  if (scene.visual === 'flow') {
    const steps = (scene.steps && scene.steps.length ? scene.steps : ['INPUT', 'PROCESS', 'OUTPUT']).slice(0, 4);
    const n = steps.length, arrowW = 70;
    const size = Math.min(190, Math.floor((innerW - arrowW * (n - 1)) / n));
    body += '<div class="stage"><div class="flowrow" id="flowrow' + i + '">' + steps.map((s, k) =>
      (k ? '<div class="flowarrow" id="fa' + i + '_' + k + '">&rarr;</div>' : '') +
      '<div class="flowbox" id="fb' + i + '_' + k + '" style="width:' + size + 'px;height:' + size + 'px"><div class="flowlbl">' + esc((s || '').toUpperCase()) + '</div></div>').join('') + '</div></div>';
  }
  if (scene.visual === 'beforeafter') {
    const before = scene.before || 'OLD'; const after = scene.after || 'NEW';
    body += '<div class="stage"><div class="bastage">' +
      '<div class="baside ba-before" id="babefore' + i + '"><div class="balbl">BEFORE</div><div class="baval">' + esc(before.toUpperCase()) + '</div></div>' +
      '<div class="baarrow" id="baarrow' + i + '">&rarr;</div>' +
      '<div class="baside ba-after" id="baafter' + i + '"><div class="balbl">AFTER</div><div class="baval">' + esc(after.toUpperCase()) + '</div></div>' +
      '</div></div>';
  }
  if (scene.visual === 'compare') {
    const L = scene.left || { label: 'A', items: [] }, R = scene.right || { label: 'B', items: [] };
    const col = (side, d) => '<div class="cmpcol cmp-' + side + '" id="cmp' + side + i + '"><div class="cmphead">' + esc((d.label || '').toUpperCase()) + '</div><ul>' + (d.items || []).slice(0, 4).map((t, k) => '<li id="cmp' + side + i + '_' + k + '">' + esc(t) + '</li>').join('') + '</ul></div>';
    body += '<div class="stage"><div class="cmpstage">' + col('l', L) + '<div class="cmpvs" id="cmpvs' + i + '">VS</div>' + col('r', R) + '</div></div>';
  }
  if (scene.visual === 'cycle') {
    const steps = (scene.steps && scene.steps.length ? scene.steps : ['PLAN', 'BUILD', 'SHIP']).slice(0, 4);
    const n = steps.length, cx = innerW / 2, cy = 190, r = 130;
    const nodeHtml = steps.map((s, k) => {
      const ang = -Math.PI / 2 + (k * 2 * Math.PI / n);
      const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r;
      return '<div class="cyclenode" id="cn' + i + '_' + k + '" style="left:' + (x - 70) + 'px;top:' + (y - 70) + 'px"><div class="cyclelbl">' + esc((s || '').toUpperCase()) + '</div></div>';
    }).join('');
    body += '<div class="stage"><div class="cyclestage">' + nodeHtml + '<div class="cyclearrow" id="cyclearrow' + i + '">&#8635;</div></div></div>';
  }
  if (scene.visual === 'searchfilter') {
    const items = (scene.items && scene.items.length ? scene.items : ['OPTION A', 'OPTION B', 'OPTION C']).slice(0, 6);
    const matchIndex = Number.isInteger(scene.matchIndex) ? Math.min(Math.max(scene.matchIndex, 0), items.length - 1) : items.length - 1;
    body += '<div class="stage"><div class="sfrow">' + items.map((t, k) => '<div class="sfitem' + (k === matchIndex ? ' match' : '') + '" id="sfi' + i + '_' + k + '">' + esc(t) + '</div>').join('') + '</div><div class="sflbl" id="sflbl' + i + '">' + esc((scene.label || 'MATCH FOUND').toUpperCase()) + '</div></div>';
  }
  if (scene.visual === 'network') {
    // same fan-out geometry as 'branch' (hub on top, spokes in a row below) - proven to leave a visible line, unlike a
    // tight circle where square boxes overlap the hub at diagonal angles.
    const nodes = (scene.nodes && scene.nodes.length ? scene.nodes : ['HUB', 'A', 'B', 'C']).slice(0, 6);
    const hub = nodes[0], spokes = nodes.slice(1);
    const n = spokes.length, cx = innerW / 2, top = 40;
    const spread = Math.min(220, Math.max(140, Math.floor((innerW - 40) / Math.max(1, n))));
    const nodeW = Math.min(190, spread - 30);
    let linesHtml = '', spokesHtml = '';
    spokes.forEach((s, k) => {
      const x = cx + (k - (n - 1) / 2) * spread;
      const dx = x - cx, dy = 220, dist = Math.sqrt(dx * dx + dy * dy), deg = Math.atan2(dy, dx) * 180 / Math.PI;
      linesHtml += '<div class="netline" id="netl' + i + '_' + k + '" style="left:' + cx + 'px;top:' + (top + 46) + 'px;width:' + dist + 'px;transform:rotate(' + deg + 'deg)"></div>';
      spokesHtml += '<div class="netnode" id="netn' + i + '_' + (k + 1) + '" style="left:' + (x - nodeW / 2) + 'px;top:' + (top + 220) + 'px;width:' + nodeW + 'px"><div class="netlbl">' + esc((s || '').toUpperCase()) + '</div></div>';
    });
    body += '<div class="stage"><div class="netstage">' +
      '<div class="netnode nethub" id="netn' + i + '_0" style="left:' + (cx - 90) + 'px;top:' + top + 'px;width:180px"><div class="netlbl">' + esc((hub || '').toUpperCase()) + '</div></div>' +
      linesHtml + spokesHtml + '</div></div>';
  }
  if (scene.visual === 'merge') {
    const a = scene.a || 'A', b = scene.b || 'B', result = scene.result || (a + '+' + b);
    body += '<div class="stage"><div class="mgstage">' +
      '<div class="mgsrc mgsrc-a" id="mga' + i + '"><div class="mgval">' + esc(a.toUpperCase()) + '</div></div>' +
      '<div class="mgsrc mgsrc-b" id="mgb' + i + '"><div class="mgval">' + esc(b.toUpperCase()) + '</div></div>' +
      '<div class="mgresult" id="mgr' + i + '"><div class="mgval">' + esc(result.toUpperCase()) + '</div></div>' +
      '</div></div>';
  }
  if (scene.visual === 'branch') {
    const from = scene.from || 'START';
    const paths = (scene.paths && scene.paths.length ? scene.paths : ['OPTION A', 'OPTION B']).slice(0, 3);
    const chosen = Number.isInteger(scene.chosen) ? Math.min(Math.max(scene.chosen, 0), paths.length - 1) : 0;
    const cx = innerW / 2, top = 40, n = paths.length;
    let linesHtml = '', pathsHtml = '';
    paths.forEach((p, k) => {
      const spread = 220, x = cx + (k - (n - 1) / 2) * spread;
      const dx = x - cx, dy = 220, dist = Math.sqrt(dx * dx + dy * dy), deg = Math.atan2(dy, dx) * 180 / Math.PI;
      linesHtml += '<div class="brline" id="brl' + i + '_' + k + '" style="left:' + cx + 'px;top:' + (top + 70) + 'px;width:' + dist + 'px;transform:rotate(' + deg + 'deg)"></div>';
      pathsHtml += '<div class="brnode' + (k === chosen ? ' chosen' : '') + '" id="brn' + i + '_' + k + '" style="left:' + (x - 110) + 'px;top:' + (top + 220) + 'px"><div class="brlbl">' + esc((p || '').toUpperCase()) + '</div></div>';
    });
    body += '<div class="stage"><div class="brstage">' +
      '<div class="brnode brstart" id="brstart' + i + '" style="left:' + (cx - 90) + 'px;top:' + top + 'px"><div class="brlbl">' + esc(from.toUpperCase()) + '</div></div>' +
      linesHtml + pathsHtml + '</div></div>';
  }
  if (scene.icons) {
    const ic = scene.icons, n = ic.items.length, linked = ic.connector === 'plus' || ic.connector === 'arrow';
    const size = Math.min(230, Math.floor((innerW - (linked ? 72 : 34) * (n - 1)) / n));
    body += '<div class="icons' + (linked ? ' linked' : '') + '">' + ic.items.map((it, k) =>
      (k && linked ? '<div class="conn" id="cn' + i + '_' + k + '">' + (ic.connector === 'plus' ? '+' : '&rarr;') + '</div>' : '') +
      '<div class="tw"><div class="tile" id="tile' + i + '_' + k + '" style="width:' + size + 'px;height:' + size + 'px">' + tileFace(it, ic.tint) + '</div><div class="tlab" id="tlab' + i + '_' + k + '" style="width:' + (size + 30) + 'px">' + esc((it.label || '').toUpperCase()) + '</div></div>').join('') + '</div>';
  }
  if (scene.image) body += '<div class="imgp" id="img' + i + '"><img src="' + esc(scene.image.src) + '"><div class="imgcap">' + esc((scene.image.caption || '').toUpperCase()) + '</div></div>';
  const hot = bare(scene.accent || '');
  el.innerHTML = '<div class="kicker" id="kick' + i + '">' + esc((scene.kicker || '').toUpperCase()) + '</div><h1>' +
    tw.map((w, k) => '<span class="kw' + (hot && bare(w) === hot ? ' hot' : '') + '" id="kw' + i + '_' + k + '">' + esc(w) + (k === tw.length - 1 ? '<span class="dot" id="kwdot' + i + '" style="display:inline-block">.</span>' : '') + '</span>').join(' ') + '</h1>' + body;
  root.insertBefore(el, before); scene.panel = el;
  gsap.set(el, { x: startX }); // initial states via gsap.set: a tl.set at 0 does not render while the playhead sits exactly at 0
  const open = scene.start + T; // the panel has landed

  // kicker types in (stepped), title words slam in on the spoken word (titleAt) or stagger fast
  gsap.set($('kick' + i), { clipPath: 'inset(0 100% 0 0)' });
  tl.to($('kick' + i), { clipPath: 'inset(0 0% 0 0)', duration: 0.4, ease: 'steps(10)' }, Math.max(scene.start + 0.1, 0));
  tw.forEach((w, k) => {
    const kw = $('kw' + i + '_' + k); const at = Math.max(scene.start + 0.25, (scene.titleAt || [])[k] ?? open + 0.05 + k * 0.09);
    gsap.set(kw, { opacity: 0, y: 70, scale: 1.35, rotation: -5 });
    tl.to(kw, { opacity: 1, y: 0, scale: 1, rotation: 0, duration: 0.38, ease: 'back.out(1.8)' }, at);
  });
  const lastAt = Math.max(scene.start + 0.25, (scene.titleAt || [])[tw.length - 1] ?? open + 0.05 + tw.length * 0.09);
  gsap.set($('kwdot' + i), { opacity: 0, scale: 0 }); tl.to($('kwdot' + i), { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(3)' }, lastAt + 0.12);
  if (sfx) playSfx(root, before, 'title', lastAt + 0.12, sfx.title);

  pts.forEach((p, k) => {
    const li = $('p' + i + '_' + k);
    gsap.set(li, { opacity: 0, x: 70, scale: 0.9, transformOrigin: '0 50%' }); tl.to(li, { opacity: 1, x: 0, scale: 1, duration: 0.4, ease: 'back.out(2)' }, Math.max(open, p.at));
  });

  if (scene.stat) {
    const st = $('stat' + i); const at = scene.stat.at ?? open + 0.3;
    gsap.set(st, { opacity: 0, y: 40, scale: 0.9, transformOrigin: '0 50%' }); tl.to(st, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'back.out(2)' }, at);
    if (scene.stat.count && /^\d+$/.test(String(scene.stat.value))) {
      const cnt = $('cnt' + i), o = { v: 0 }, N = Number(scene.stat.value); cnt.textContent = '0';
      tl.to(o, { v: N, duration: 0.9, ease: 'power2.out', onUpdate: () => { cnt.textContent = String(Math.round(o.v)); } }, at);
      if (sfx) playSfx(root, before, 'count', at + 0.9, sfx.count);
    }
  }

  if (scene.icons) {
    const ic = scene.icons;
    ic.items.forEach((it, k) => {
      const tile = $('tile' + i + '_' + k), lab = $('tlab' + i + '_' + k); const at = Math.max(open, it.at ?? open + 0.3 + k * 0.35);
      gsap.set(tile, { scale: 0, rotation: -14, opacity: 0 }); gsap.set(lab, { opacity: 0, y: 14 });
      tl.to(tile, { scale: 1, rotation: 0, opacity: 1, duration: 0.5, ease: 'back.out(2.2)' }, at).to(lab, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, at + 0.15);
      const cn = k ? $('cn' + i + '_' + k) : null;
      if (cn) { gsap.set(cn, { scale: 0, opacity: 0 }); tl.to(cn, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(3)' }, Math.max(open, at - 0.12)); }
      // idle bob after landing: an odd repeat count ends back at rest
      let r = Math.floor((scene.end - at - 0.7) / 0.45) - 1; if (r % 2 === 0) r -= 1;
      if (r >= 1) tl.to(tile, { y: -12, duration: 0.45, yoyo: true, repeat: r, ease: 'sine.inOut' }, at + 0.55 + (k % 3) * 0.12);
    });
  }

  if (scene.image) {
    const box = $('img' + i), im = box.querySelector('img'); const at = scene.image.at ?? open + 0.3;
    gsap.set(box, { clipPath: 'inset(0 100% 0 0)' });
    tl.to(box, { clipPath: 'inset(0 0% 0 0)', duration: 0.5, ease: 'steps(8)' }, at).fromTo(im, { scale: 1.02 }, { scale: 1.16, duration: Math.max(1, scene.end - at), ease: 'none' }, at);
  }

  if (scene.visual === 'keycap') {
    const key = $('key' + i), lbl = $('keylbl' + i); const at = scene.visualAt ?? scene.start + 1;
    gsap.set(key, { y: 90, opacity: 0, scale: 0.7 }); gsap.set(lbl, { opacity: 0 });
    tl.to(key, { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(2.2)' }, Math.min(open + 0.1, at - 0.5)).to(lbl, { opacity: 1, duration: 0.2, ease: 'steps(3)' }, Math.min(open + 0.4, at - 0.3));
    tl.to(key, { y: 18, boxShadow: '0 4px 0 #161819', duration: 0.1, ease: 'power2.in' }, at).to(key, { y: 0, boxShadow: '0 22px 0 #161819', duration: 0.25, ease: 'power2.out' }, at + 0.18);
    // pixel burst on the press: twelve squares fly out on fixed angles, stepped so they read as pixels
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2, d = 150 + (k % 3) * 55; const px = $('px' + i + '_' + k);
      tl.set(px, { opacity: 1, x: 0, y: 0, scale: 1 }, at + 0.06).to(px, { x: Math.cos(a) * d, y: Math.sin(a) * d * 0.8, scale: 0.3, opacity: 0, duration: 0.55, ease: 'steps(6)' }, at + 0.06);
    }
  }

  if (scene.visual === 'timeline') {
    const host = $('tl' + i); const at = scene.visualAt ?? scene.start + 1;
    // 808 px track: five clips, the third is the mistake. Pure geometry, so the gap-closing move is exact.
    const gap = 12, widths = [150, 190, 150, 130, 120]; const xs = []; let x = 0;
    widths.forEach((w) => { xs.push(x); x += w + gap; });
    const blocks = widths.map((w, k) => { const b = document.createElement('div'); b.className = 'blk' + (k === 2 ? ' bad' : ''); b.style.left = xs[k] + 'px'; b.style.width = w + 'px'; host.appendChild(b); gsap.set(b, { scaleY: 0, transformOrigin: '50% 100%' }); tl.to(b, { scaleY: 1, duration: 0.3, ease: 'back.out(2)' }, open + 0.05 + k * 0.08); return b; });
    const ph = document.createElement('div'); ph.className = 'ph'; host.appendChild(ph); gsap.set(ph, { x: 0, opacity: 0 });
    const t0 = Math.min(open + 0.5, at - 0.4), mx = xs[2] + 20, speed = mx / Math.max(0.4, at - t0);
    tl.set(ph, { opacity: 1 }, t0).to(ph, { x: innerW, duration: innerW / speed, ease: 'none' }, t0).set(ph, { opacity: 0 }, at + 1.2);
    tl.to(host, { x: 7, duration: 0.05, yoyo: true, repeat: 5, ease: 'none' }, at);
    tl.to(blocks[2], { scaleX: 0, opacity: 0, duration: 0.3, ease: 'steps(5)' }, at);
    [3, 4].forEach((k) => tl.to(blocks[k], { x: -(widths[2] + gap), duration: T, ease: EASE }, at + 0.3));
    const lbl = $('tllbl' + i); gsap.set(lbl, { scale: 0.6 });
    tl.to(lbl, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2.5)' }, at + 0.6);
  }
  if (scene.visual === 'tokenize') {
    const word = (scene.word || 'TOKENIZE').toUpperCase();
    const pieces = (scene.pieces && scene.pieces.length ? scene.pieces : splitWord(word, scene.pieceCount)).map((p) => p.toUpperCase());
    const wordEl = $('tokword' + i), row = $('tokrow' + i), lbl = $('toklbl' + i), cntEl = $('tokcnt' + i);
    const chips = pieces.map((_, k) => $('tokc' + i + '_' + k));
    const at = scene.visualAt ?? scene.start + 1;
    gsap.set(wordEl, { opacity: 0, scale: 0.85 }); gsap.set(row, { opacity: 0 }); gsap.set(chips, { opacity: 0, scale: 0.4 }); gsap.set(lbl, { opacity: 0, y: 14 });
    // the whole word lands solid, then - on the beat - visibly breaks into its token pieces
    tl.to(wordEl, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' }, Math.min(open, at - 0.6))
      .to(wordEl, { opacity: 0, scale: 1.25, duration: 0.18, ease: 'power2.in' }, at)
      .set(row, { opacity: 1 }, at);
    chips.forEach((chip, k) => { tl.fromTo(chip, { scale: 0.3, rotation: (k % 2 ? 10 : -10) }, { opacity: 1, scale: 1, rotation: 0, duration: 0.35, ease: 'back.out(2.6)' }, at + 0.06 + k * 0.1); });
    const o = { v: 0 };
    tl.to(o, { v: pieces.length, duration: Math.max(0.3, pieces.length * 0.12), ease: 'steps(' + pieces.length + ')', onUpdate: () => { cntEl.textContent = String(Math.round(o.v)); } }, at + 0.1)
      .to(lbl, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }, at + 0.15 + chips.length * 0.1);
  }

  if (scene.visual === 'window') {
    const N = 10; const at = scene.visualAt ?? scene.start + 1; const step = 0.14;
    const frame = $('winframe' + i), lbl = $('winlbl' + i);
    const cells = Array.from({ length: N }, (_, k) => $('wc' + i + '_' + k));
    gsap.set(cells, { backgroundColor: 'rgba(167,173,178,.35)' }); gsap.set(lbl, { opacity: 0, y: 14 });
    // fills one cell at a time - a context window literally filling up - then visibly has no room left
    cells.forEach((c, k) => { tl.to(c, { backgroundColor: '#E65D20', duration: 0.14, ease: 'steps(1)' }, at + k * step); });
    tl.to(frame, { x: -6, duration: 0.05, yoyo: true, repeat: 5, ease: 'none' }, at + N * step + 0.05);
    tl.to(lbl, { opacity: 1, y: 0, duration: 0.3, ease: 'back.out(2.5)' }, at + N * step + 0.15);
  }

  if (scene.visual === 'diskfiles') {
    const files = (scene.files && scene.files.length ? scene.files : ['who you are', 'what you tried', 'what failed']).slice(0, 4);
    const at = scene.visualAt ?? scene.start + 1;
    files.forEach((f, k) => {
      // yOff spacing must clear a 2-line wrapped label (real filenames run long) or stacked tiles' text overlaps illegibly.
      const tile = $('filet' + i + '_' + k); const rot = (k - (files.length - 1) / 2) * 7; const yOff = -k * 34;
      gsap.set(tile, { y: -260, rotation: 0, opacity: 0 });
      tl.to(tile, { y: yOff, rotation: rot, opacity: 1, duration: 0.55, ease: 'bounce.out' }, at + k * 0.45);
    });
  }

  if (scene.visual === 'flow') {
    const steps = (scene.steps && scene.steps.length ? scene.steps : ['INPUT', 'PROCESS', 'OUTPUT']).slice(0, 4);
    const at = scene.visualAt ?? scene.start + 1;
    const boxes = steps.map((_, k) => $('fb' + i + '_' + k));
    const arrows = steps.map((_, k) => k ? $('fa' + i + '_' + k) : null);
    gsap.set(boxes, { scale: 0, opacity: 0 }); gsap.set(arrows.filter(Boolean), { opacity: 0, x: -14 });
    boxes.forEach((b, k) => {
      const bt = at + k * 0.5;
      tl.to(b, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2.4)' }, bt);
      if (k) tl.to(arrows[k], { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }, bt - 0.18);
    });
    // arrows chase-blink after the pipeline lands, reading as flow still moving through it
    const lastAt = at + (steps.length - 1) * 0.5 + 0.4;
    const liveArrows = arrows.filter(Boolean);
    let r = Math.floor((scene.end - lastAt - 0.4) / 0.6) - 1; if (r % 2 === 0) r -= 1;
    if (r >= 1 && liveArrows.length) tl.to(liveArrows, { opacity: 0.35, duration: 0.3, yoyo: true, repeat: r, stagger: 0.15, ease: 'sine.inOut' }, lastAt + 0.2);
  }

  if (scene.visual === 'beforeafter') {
    const bEl = $('babefore' + i), aEl = $('baafter' + i), arr = $('baarrow' + i);
    const at = scene.visualAt ?? scene.start + 1;
    gsap.set(bEl, { opacity: 0, x: -40 }); gsap.set(aEl, { opacity: 0, x: 40, scale: 0.8 }); gsap.set(arr, { opacity: 0, scale: 0.5 });
    tl.to(bEl, { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' }, at)
      .to(arr, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2.4)' }, at + 0.35)
      .to(bEl.querySelector('.baval'), { opacity: 0.4, duration: 0.3, ease: 'power2.in' }, at + 0.55)
      .to(aEl, { opacity: 1, x: 0, scale: 1, duration: 0.45, ease: 'back.out(2.2)' }, at + 0.65)
      .to(arr, { x: 14, duration: 0.12, yoyo: true, repeat: 3, ease: 'power1.inOut' }, at + 0.65);
  }

  if (scene.visual === 'compare') {
    const L = scene.left || { items: [] }, R = scene.right || { items: [] };
    const at = scene.visualAt ?? scene.start + 1;
    const lCol = $('cmpl' + i), rCol = $('cmpr' + i), vs = $('cmpvs' + i);
    gsap.set(lCol, { opacity: 0, x: -60 }); gsap.set(rCol, { opacity: 0, x: 60 }); gsap.set(vs, { opacity: 0, scale: 0 });
    tl.to(lCol, { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' }, at)
      .to(rCol, { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' }, at)
      .to(vs, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(3)' }, at + 0.3)
      .to(vs, { rotation: 8, duration: 0.3, yoyo: true, repeat: 5, ease: 'sine.inOut' }, at + 0.65);
    (L.items || []).slice(0, 4).forEach((_, k) => { const li = $('cmpl' + i + '_' + k); gsap.set(li, { opacity: 0, y: 14 }); tl.to(li, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, at + 0.45 + k * 0.12); });
    (R.items || []).slice(0, 4).forEach((_, k) => { const li = $('cmpr' + i + '_' + k); gsap.set(li, { opacity: 0, y: 14 }); tl.to(li, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, at + 0.45 + k * 0.12); });
  }

  if (scene.visual === 'cycle') {
    const steps = (scene.steps && scene.steps.length ? scene.steps : ['PLAN', 'BUILD', 'SHIP']).slice(0, 4);
    const at = scene.visualAt ?? scene.start + 1;
    const nodes = steps.map((_, k) => $('cn' + i + '_' + k));
    const arrow = $('cyclearrow' + i);
    gsap.set(nodes, { scale: 0, opacity: 0 }); gsap.set(arrow, { opacity: 0, rotation: 0 });
    nodes.forEach((nd, k) => { tl.to(nd, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2.4)' }, at + k * 0.35); });
    const landAt = at + (nodes.length - 1) * 0.35 + 0.4;
    // the loop arrow spins continuously for the rest of the scene - literally a cycle in motion
    tl.to(arrow, { opacity: 1, duration: 0.3, ease: 'power2.out' }, landAt)
      .to(arrow, { rotation: 360, duration: Math.max(1, scene.end - landAt), ease: 'none' }, landAt);
    nodes.forEach((nd, k) => { tl.to(nd, { y: -14, duration: 0.16, ease: 'power1.out' }, landAt + 0.2 + k * 0.3).to(nd, { y: 0, duration: 0.2, ease: 'bounce.out' }, landAt + 0.36 + k * 0.3); });
  }

  if (scene.visual === 'searchfilter') {
    const items = (scene.items && scene.items.length ? scene.items : ['OPTION A', 'OPTION B', 'OPTION C']).slice(0, 6);
    const matchIndex = Number.isInteger(scene.matchIndex) ? Math.min(Math.max(scene.matchIndex, 0), items.length - 1) : items.length - 1;
    const at = scene.visualAt ?? scene.start + 1;
    const rows = items.map((_, k) => $('sfi' + i + '_' + k));
    const lbl = $('sflbl' + i);
    const matchEl = rows[matchIndex];
    gsap.set(rows, { opacity: 0, x: -30 }); gsap.set(lbl, { opacity: 0, y: 12 });
    // the match's accent border/shadow is baked into its markup class (see buildPanel above) as the resting state -
    // hold it at the neutral ink/grey look until the scanner locks on, so it doesn't give itself away early. Plain
    // borderColor/boxShadow color tweens (not a class toggle) so this doesn't depend on GSAP's className plugin.
    gsap.set(matchEl, { borderColor: '#161819', boxShadow: '6px 6px 0 #A7ADB2' });
    rows.forEach((r, k) => tl.to(r, { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }, at + k * 0.12));
    // a scanner passes down the list, dimming everything except the match it locks onto
    const scanStart = at + rows.length * 0.12 + 0.15;
    rows.forEach((r, k) => { tl.to(r, { opacity: k === matchIndex ? 1 : 0.3, duration: 0.14, ease: 'steps(1)' }, scanStart + k * 0.16); });
    const matchAt = scanStart + matchIndex * 0.16;
    tl.to(matchEl, { borderColor: '#E65D20', boxShadow: '8px 8px 0 #E65D20', scale: 1.06, duration: 0.2, ease: 'power2.out' }, matchAt + 0.02)
      .to(matchEl, { scale: 1, duration: 0.22, ease: 'bounce.out' }, matchAt + 0.22)
      .to(lbl, { opacity: 1, y: 0, duration: 0.3, ease: 'back.out(2.4)' }, matchAt + 0.2);
    if (sfx) playSfx(root, before, 'lock', matchAt + 0.02, sfx.lock);
  }

  if (scene.visual === 'network') {
    const nodes = (scene.nodes && scene.nodes.length ? scene.nodes : ['HUB', 'A', 'B', 'C']).slice(0, 6);
    const spokesN = nodes.length - 1;
    const at = scene.visualAt ?? scene.start + 1;
    const hubEl = $('netn' + i + '_0');
    gsap.set(hubEl, { scale: 0, opacity: 0 });
    tl.to(hubEl, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2.4)' }, at);
    for (let k = 0; k < spokesN; k++) {
      const line = $('netl' + i + '_' + k), node = $('netn' + i + '_' + (k + 1));
      gsap.set(line, { scaleX: 0, transformOrigin: '0 50%', opacity: 0.7 }); gsap.set(node, { scale: 0, opacity: 0 });
      const lt = at + 0.3 + k * 0.25;
      tl.to(line, { scaleX: 1, duration: 0.3, ease: 'power2.out' }, lt).to(node, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2.6)' }, lt + 0.15);
    }
    // a signal bobs outward along each spoke once the network is fully connected
    const landAt = at + 0.3 + spokesN * 0.25 + 0.5;
    for (let k = 0; k < spokesN; k++) tl.to($('netn' + i + '_' + (k + 1)), { y: -8, duration: 0.15, yoyo: true, repeat: 3, ease: 'sine.inOut' }, landAt + k * 0.2);
  }

  if (scene.visual === 'merge') {
    const aEl = $('mga' + i), bEl = $('mgb' + i), rEl = $('mgr' + i);
    const at = scene.visualAt ?? scene.start + 1;
    gsap.set(aEl, { x: -60, opacity: 0 }); gsap.set(bEl, { x: 60, opacity: 0 }); gsap.set(rEl, { opacity: 0, scale: 0.6 });
    tl.to(aEl, { x: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }, at)
      .to(bEl, { x: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }, at)
      .to(aEl, { x: 70, y: 120, scale: 0.7, opacity: 0, duration: 0.45, ease: 'power2.in' }, at + 0.55)
      .to(bEl, { x: -70, y: 120, scale: 0.7, opacity: 0, duration: 0.45, ease: 'power2.in' }, at + 0.55)
      .to(rEl, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2.6)' }, at + 0.9)
      .to(rEl, { y: -10, duration: 0.4, yoyo: true, repeat: 3, ease: 'sine.inOut' }, at + 1.3);
    if (sfx) playSfx(root, before, 'lock', at + 0.9, sfx.lock);
  }

  if (scene.visual === 'branch') {
    const paths = (scene.paths && scene.paths.length ? scene.paths : ['OPTION A', 'OPTION B']).slice(0, 3);
    const chosen = Number.isInteger(scene.chosen) ? Math.min(Math.max(scene.chosen, 0), paths.length - 1) : 0;
    const at = scene.visualAt ?? scene.start + 1;
    const startEl = $('brstart' + i);
    gsap.set(startEl, { scale: 0, opacity: 0 });
    tl.to(startEl, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2.4)' }, at);
    const nodes = paths.map((_, k) => $('brn' + i + '_' + k));
    paths.forEach((_, k) => {
      const line = $('brl' + i + '_' + k), node = nodes[k];
      gsap.set(line, { scaleX: 0, opacity: 0.6 }); gsap.set(node, { opacity: 0, y: -20 });
      const lt = at + 0.35 + k * 0.15;
      tl.to(line, { scaleX: 1, duration: 0.3, ease: 'power2.out' }, lt).to(node, { opacity: k === chosen ? 1 : 0.5, y: 0, duration: 0.35, ease: 'power2.out' }, lt + 0.1);
    });
    // the chosen path decisively pops while the others fade further - the fork resolves
    const lockAt = at + 0.35 + paths.length * 0.15 + 0.3;
    const others = nodes.filter((_, k) => k !== chosen);
    if (others.length) tl.to(others, { opacity: 0.25, duration: 0.3, ease: 'power2.out' }, lockAt);
    tl.to(nodes[chosen], { scale: 1.08, duration: 0.2, ease: 'power2.out' }, lockAt).to(nodes[chosen], { scale: 1, duration: 0.25, ease: 'bounce.out' }, lockAt + 0.2);
    if (sfx) playSfx(root, before, 'lock', lockAt, sfx.lock);
  }

  return el;
}
