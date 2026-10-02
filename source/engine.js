// Mental Math Masters engine: pure logic, no DOM, no storage.
// Inlined into index.html by build.py and loaded directly by the Node tests.
//
// The course: four modules, then a final check.
//   Learn     fill in each table in order (known facts marked), then its trick
//   Practice  the module's tables, shuffled
//   Test      any table learned so far, both orders, with fix-it steps
//   Gate      20 of the last 25 test answers right, and every new fact right once
//   Final     all 66 facts, random order, pass at 60
// Separately, every fact keeps a spaced-repetition box (every day, every 3 days,
// weekly, then chalked in). The boxes fill the progress board and steer which
// facts the test asks; they never block a gate.
const Engine = (() => {
  const MODULES = [[2, 10, 5], [3, 4, 6], [7, 8, 9], [11, 12]];
  const WINDOW = 25, GATE = 20, FINAL_PASS = 60;
  const INTERVAL = { 1: 1, 2: 3, 3: 7 };
  const MASTERED = 4;

  const key = (a, b) => (a <= b ? `${a}x${b}` : `${b}x${a}`);
  const parts = (k) => k.split('x').map(Number);
  const ALL = [];
  for (let a = 2; a <= 12; a++) for (let b = a; b <= 12; b++) ALL.push(key(a, b));

  // Facts each module brings in: any fact with one of its tables, not already met.
  const NEW = [];
  const MODULE_OF = {};
  MODULES.forEach((tables, m) => {
    NEW[m] = [];
    for (const t of tables) {
      for (let n = 2; n <= 12; n++) {
        const k = key(t, n);
        if (!(k in MODULE_OF)) { MODULE_OF[k] = m; NEW[m].push(k); }
      }
    }
  });
  const factsUpTo = (m) => ALL.filter((k) => MODULE_OF[k] <= m);
  // Facts known before walking table t in module m (earlier modules, earlier tables here).
  function knownBefore(m, t) {
    const tabs = MODULES.slice(0, m).flat().concat(MODULES[m].slice(0, MODULES[m].indexOf(t)));
    return (k) => { const [a, b] = parts(k); return tabs.includes(a) || tabs.includes(b); };
  }

  const addDays = (d, n) => {
    const [y, m, dd] = d.split('-').map(Number);
    const x = new Date(y, m - 1, dd + n);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  };

  // ---------- words on the board ----------
  // Learn hint: always adds up the first number. 2 × 3 is 2 + 2 + 2.
  const hint = (n, b) => Array.from({ length: b }, () => n).join(' + ');
  // The trick for each table, shown after filling it in.
  function trick(t) {
    const b = t === 7 ? 8 : 7;
    const T = {
      2: ['Twos are doubles.', `2 × ${b} = ${b} + ${b} = ${2 * b}`],
      10: ['Tens: add a zero.', `10 × ${b} = ${b}0`],
      5: ['Fives are half of tens.', `5 × ${b} = half of ${10 * b} = ${5 * b}`],
      3: ['Threes: the twos, plus one more.', `3 × ${b} = ${2 * b} + ${b} = ${3 * b}`],
      4: ['Fours: double the twos.', `4 × ${b} = ${2 * b} doubled = ${4 * b}`],
      6: ['Sixes: the fives, plus one more.', `6 × ${b} = ${5 * b} + ${b} = ${6 * b}`],
      7: ['Sevens: the fives plus the twos.', `7 × ${b} = ${5 * b} + ${2 * b} = ${7 * b}`],
      8: ['Eights: double the fours.', `8 × ${b} = ${4 * b} doubled = ${8 * b}`],
      9: ['Nines: the tens, minus one.', `9 × ${b} = ${10 * b} − ${b} = ${9 * b}`],
      11: ['Elevens: repeat the digit, up to 9.', `11 × ${b} = ${11 * b}`],
      12: ['Twelves: the tens plus the twos.', `12 × ${b} = ${10 * b} + ${2 * b} = ${12 * b}`],
    }[t];
    return { line: T[0], example: T[1] };
  }
  // Fix-it: build the fact from ones already known, using the first number's trick.
  // 7 × 8 → 5 × 8 = 40, plus 2 more 8s = 56.
  function build(a, b) {
    const p = a * b;
    switch (a) {
      case 2: return [`${b} + ${b} = ${p}`];
      case 10: return [`${b} with a zero = ${p}`];
      case 5: return [`10 × ${b} = ${10 * b}`, `half of that = ${p}`];
      case 3: return [`2 × ${b} = ${2 * b}`, `plus one more ${b} = ${p}`];
      case 4: return [`2 × ${b} = ${2 * b}`, `doubled = ${p}`];
      case 6: return [`5 × ${b} = ${5 * b}`, `plus one more ${b} = ${p}`];
      case 7: return [`5 × ${b} = ${5 * b}`, `plus 2 more ${b}s = ${p}`];
      case 8: return [`4 × ${b} = ${4 * b}`, `doubled = ${p}`];
      case 9: return [`10 × ${b} = ${10 * b}`, `minus one ${b} = ${p}`];
      case 11: return b <= 9 ? [`repeat the ${b}: ${p}`] : [`10 × ${b} = ${10 * b}`, `plus one more ${b} = ${p}`];
      case 12: return [`10 × ${b} = ${10 * b}`, `plus 2 × ${b} = ${2 * b}`, `together ${p}`];
    }
    return [`${a} × ${b} = ${p}`];
  }

  // Which tables count as learned right now: everything up to this module, or all
  // of them once the modules are done.
  const learnedTables = (s) => (s.phase === 'learn' ? MODULES.slice(0, s.module).flat() : MODULES.slice(0, s.module + 1).flat());
  // Build from a table the learner has actually learned: 7 × 8 uses the sevens if
  // they're learned; 9 × 2 in Module 1 is built as 2 × 9 instead.
  function buildFor(s, a, b) {
    const learned = s.phase === 'final' || s.phase === 'review' || s.phase === 'done' ? MODULES.flat() : learnedTables(s);
    if (learned.includes(a) || !learned.includes(b)) return { table: a, lines: build(a, b) };
    return { table: b, lines: [`same as ${b} × ${a}`].concat(build(b, a)) };
  }

  // ---------- state ----------
  function freshState(today) {
    const s = { v: 3, created: today, facts: {}, cur: null, finalBest: null };
    startModule(s, 0);
    return s;
  }
  function startModule(s, m) {
    s.module = m; s.phase = 'learn'; s.q = []; s.sched = [];
    s.learn = { ti: 0 };
    s.walk = null; s.fixWalk = null;
    s.test = { count: 0, window: [], newRight: [], misses: {}, wrongRun: 0, recent: [] };
  }

  // Spaced-repetition boxes. Only the first attempt of the day on a due fact moves
  // it up; a miss always sends it back to Box 1.
  function record(s, k, correct, today, opts = {}) {
    let f = s.facts[k];
    if (!f) f = s.facts[k] = { box: 1, due: addDays(today, 1), introduced: today, misses: 0, seenOn: null, promotedOn: null };
    const firstToday = f.seenOn !== today;
    f.seenOn = today;
    if (!correct) { f.misses++; f.box = 1; f.due = addDays(today, 1); f.promotedOn = null; return; }
    if (opts.noPromote) return;
    if (firstToday && f.box < MASTERED && f.due <= today && f.promotedOn !== today && f.introduced !== today) {
      f.box++; f.promotedOn = today;
      if (f.box === MASTERED) { f.masteredOn = today; f.due = null; } else f.due = addDays(today, INTERVAL[f.box]);
    }
  }
  const boxOf = (s, k) => (s.facts[k] ? s.facts[k].box : 0);

  function shuffle(arr, rng) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  // A question screen. Without a given order, it's shown either way round.
  function q(k, mode, rng, a, b) {
    if (a == null) { [a, b] = parts(k); if (rng() < 0.5) [a, b] = [b, a]; }
    return { kind: 'q', mode, k, a, b };
  }
  const tableAll = (t) => { const f = {}; for (let b = 1; b <= 12; b++) f[b] = t * b; return f; };

  // ---------- what comes next ----------
  function current(s, today, rng) {
    if (!s.cur) s.cur = nextScreen(s, today, rng);
    return s.cur;
  }
  function nextScreen(s, today, rng) {
    if (s.q.length) return s.q.shift();
    const m = s.module;
    switch (s.phase) {
      case 'learn': {
        const tables = MODULES[m];
        if (s.learn.ti >= tables.length) { s.phase = 'practice'; s.q = practiceList(s, rng); return nextScreen(s, today, rng); }
        const t = tables[s.learn.ti];
        if (!s.walk || s.walk.t !== t) {
          const known = knownBefore(m, t);
          const pre = {};
          for (let b = 1; b <= 12; b++) if ((b === 1 && m > 0) || (b > 1 && known(key(t, b)))) pre[b] = t * b;
          s.walk = { t, filled: { ...pre }, known: Object.keys(pre).map(Number) };
        }
        for (let b = 1; b <= 12; b++) if (s.walk.filled[b] == null) return { kind: 'walk', t, b };
        // table filled in: the pattern question (Module 1 only), then the trick
        s.learn.ti++;
        s.walk = null;
        if (m === 0) { s.q.push({ kind: 'trick', t }); return { kind: 'pattern', t }; }
        return { kind: 'trick', t };
      }
      case 'practice':
        s.phase = 'test';
        s.firstTest = true;
        return nextScreen(s, today, rng);
      case 'test': {
        const due = s.sched.findIndex((x) => x.at <= s.test.count);
        if (due >= 0) return s.sched.splice(due, 1)[0].screen;
        const sc = q(pickTest(s, today, rng), 'test', rng);
        if (s.firstTest) { sc.note = 'test'; s.firstTest = false; }
        return sc;
      }
      case 'final': {
        if (!s.final.queue) beginFinal(s, rng);
        if (s.final.queue.length) return s.final.queue.shift();
        const right = s.final.results.filter(Boolean).length, of = s.final.results.length;
        const passed = right >= FINAL_PASS;
        s.finalBest = Math.max(s.finalBest || 0, right);
        if (passed) { s.phase = 'done'; return { kind: 'finalResult', right, of, passed }; }
        // practise the ones that slipped, then offer the check again
        s.phase = 'review';
        s.q = s.final.missed.map((k) => q(k, 'review', rng));
        s.q.push({ kind: 'finalReady' });
        return { kind: 'finalResult', right, of, passed };
      }
      case 'review':
      case 'done': {
        // keep facts sharp: shaky ones come up more
        const pool = ALL.map((k) => ({ k, w: boxOf(s, k) === MASTERED ? 1 : 5 - boxOf(s, k) }));
        let r = rng() * pool.reduce((t, x) => t + x.w, 0);
        for (const x of pool) { r -= x.w; if (r <= 0) return q(x.k, 'review', rng); }
        return q(ALL[0], 'review', rng);
      }
    }
    return null;
  }

  function practiceList(s, rng) {
    const m = s.module;
    let list = shuffle(NEW[m], rng).slice(0, 20);
    if (list.length < 12) {
      const extra = shuffle(ALL.filter((k) => !list.includes(k) && parts(k).some((x) => MODULES[m].includes(x))), rng);
      list = list.concat(extra.slice(0, 12 - list.length));
    }
    const out = list.map((k) => q(k, 'practice', rng));
    out[0].note = 'practice';
    return out;
  }

  // The test asks new facts not yet answered right first (two in every three
  // questions), so the gate never waits on chance; the rest are weighted toward
  // missed, due and newer facts.
  function pickTest(s, today, rng) {
    const m = s.module, T = s.test;
    const pool = factsUpTo(m).filter((k) => !T.recent.includes(k));
    const needed = pool.filter((k) => MODULE_OF[k] === m && !T.newRight.includes(k));
    if (needed.length && (T.count % 3 !== 2 || pool.length === needed.length)) return needed[Math.floor(rng() * needed.length)];
    const w = (k) => {
      let x = MODULE_OF[k] === m ? 2 : 1;
      if (T.misses[k]) x += 3;
      const f = s.facts[k];
      if (f && f.box < MASTERED && f.due <= today) x += 2;
      return x;
    };
    let total = 0; for (const k of pool) total += w(k);
    let r = rng() * total;
    for (const k of pool) { r -= w(k); if (r <= 0) return k; }
    return pool[pool.length - 1];
  }

  // ---------- answering ----------
  // Call once, on the first attempt at the current screen. Returns what the
  // learner should see next.
  function attempt(s, correct, today, rng) {
    const c = s.cur, out = { correct };
    if (c.kind === 'walk') {
      const k = c.b > 1 ? key(c.t, c.b) : null;
      if (k && (!correct || !s.facts[k])) record(s, k, correct, today, { noPromote: true });
      return out;
    }
    if (c.kind !== 'q') return out;
    if (c.mode !== 'retry' && c.mode !== 'easy') record(s, c.k, correct, today);
    const bf = buildFor(s, c.a, c.b);
    out.build = bf.lines;
    if (c.mode === 'practice' && !correct) s.q.splice(Math.min(4, s.q.length), 0, q(c.k, 'practice', rng, c.b, c.a));
    // a new fact answered right in practice counts as "right at least once"
    if (c.mode === 'practice' && correct && MODULE_OF[c.k] === s.module && !s.test.newRight.includes(c.k)) s.test.newRight.push(c.k);
    if (c.mode === 'review' && !correct && s.phase === 'review') s.q.splice(Math.max(0, Math.min(3, s.q.length - 1)), 0, q(c.k, 'review', rng, c.b, c.a));
    if (c.mode === 'final') { s.final.results.push(correct); if (!correct) s.final.missed.push(c.k); }
    if (c.mode === 'test') testAnswer(s, c, correct, rng, out, bf.table);
    return out;
  }

  function testAnswer(s, c, correct, rng, out, table) {
    const T = s.test, m = s.module;
    T.count++;
    T.window.push(correct ? 1 : 0);
    if (T.window.length > WINDOW) T.window.shift();
    T.recent.push(c.k); if (T.recent.length > 3) T.recent.shift();
    if (correct) {
      T.wrongRun = 0;
      if (MODULE_OF[c.k] === m && !T.newRight.includes(c.k)) T.newRight.push(c.k);
      if (gateMet(s)) { passModule(s); out.moduleDone = m; }
      return;
    }
    T.wrongRun++;
    T.misses[c.k] = (T.misses[c.k] || 0) + 1;
    if (T.misses[c.k] >= 2) {
      // missed again: fill out the learned table up to it; its last rung is the re-ask
      const other = table === c.a ? c.b : c.a;
      for (let b = 1; b <= other; b++) s.q.push({ kind: 'walk', t: table, b, fix: true, upTo: other });
      out.fillOut = true;
    } else s.q.push(q(c.k, 'retry', rng, c.a, c.b)); // ask it again right away
    // the flip a few problems later, the same again later still
    s.sched.push({ at: T.count + 3, screen: q(c.k, 'test', rng, c.b, c.a) });
    s.sched.push({ at: T.count + 8, screen: q(c.k, 'test', rng, c.a, c.b) });
    if (T.wrongRun >= 3) {
      // three wrong in a row: a quick easy run to reset, then back to the test
      T.wrongRun = 0;
      for (let i = 0; i < 4; i++) {
        const t = rng() < 0.5 ? 2 : 10, n = 2 + Math.floor(rng() * 9);
        const e = q(key(t, n), 'easy', rng, t, n);
        if (i === 0) e.note = 'easy';
        s.q.push(e);
      }
      out.easyRun = true;
    }
  }

  function gateMet(s) {
    const T = s.test;
    return T.window.length >= WINDOW && T.window.reduce((a, b) => a + b, 0) >= GATE && NEW[s.module].every((k) => T.newRight.includes(k));
  }
  function passModule(s) {
    const done = s.module;
    if (done + 1 < MODULES.length) startModule(s, done + 1);
    else { s.phase = 'final'; s.q = []; s.sched = []; s.final = { queue: null, results: [], missed: [] }; }
    s.q.unshift({ kind: 'moduleDone', m: done });
  }
  function beginFinal(s, rng) {
    s.phase = 'final';
    s.final = { queue: shuffle(ALL, rng).map((k) => q(k, 'final', rng)), results: [], missed: [] };
    s.final.queue[0].note = 'final';
  }

  // Call when the learner is finished with the current screen.
  function finish(s, rng) {
    const c = s.cur;
    if (c && c.kind === 'walk') {
      if (c.fix) {
        if (!s.fixWalk || s.fixWalk.t !== c.t || c.b === 1) s.fixWalk = { t: c.t, filled: {} };
        s.fixWalk.filled[c.b] = c.t * c.b;
        if (c.b === c.upTo) s.fixWalk = null;
      } else if (s.walk) s.walk.filled[c.b] = c.t * c.b;
    }
    if (c && c.kind === 'finalReady') beginFinal(s, rng);
    s.cur = null;
  }

  // ---------- read-outs ----------
  function status(s) {
    const T = s.test;
    return {
      module: s.module, phase: s.phase, tables: MODULES[s.module],
      windowRight: T.window.reduce((a, b) => a + b, 0), windowSize: T.window.length,
      newLeft: NEW[s.module].filter((k) => !T.newRight.includes(k)).length, newTotal: NEW[s.module].length,
      finalBest: s.finalBest, finalDone: s.final ? s.final.results.length : 0,
    };
  }
  // The ladder beside a walk screen: rungs filled so far, and which were already known.
  function ladder(s, c) {
    if (c.fix) return { filled: s.fixWalk && s.fixWalk.t === c.t && c.b > 1 ? s.fixWalk.filled : {}, known: [], upTo: c.upTo };
    return { filled: s.walk ? s.walk.filled : {}, known: s.walk ? s.walk.known : [], upTo: 12 };
  }
  // Tester shortcut: pass the current module as if its gate was met.
  function devPass(s, today) {
    if (s.phase === 'final' || s.phase === 'review' || s.phase === 'done') return false;
    for (const k of NEW[s.module]) if (!s.facts[k]) record(s, k, true, today, { noPromote: true });
    passModule(s); s.cur = null;
    return true;
  }

  return {
    MODULES, NEW, MODULE_OF, ALL, MASTERED, WINDOW, GATE, FINAL_PASS,
    key, parts, addDays, hint, trick, build, buildFor, freshState, record, boxOf,
    current, attempt, finish, status, ladder, gateMet, devPass,
  };
})();
if (typeof module !== 'undefined') module.exports = Engine;
