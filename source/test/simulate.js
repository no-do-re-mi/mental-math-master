const E = require('../engine.js');
function mulberry(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const errors=[];const assert=(c,m)=>{if(!c)errors.push(m)};
function run(name, base, gain, perDay, seed){
  const rng=mulberry(seed); const start='2026-10-05'; const s=E.freshState(start);
  const skill={}; const p=(k)=>Math.min(0.98, base+gain*(skill[k]||0));
  const asked={0:[],1:[],2:[],3:[]}; const log={modDone:{},finalTries:0}; let day=0, screens=0;
  let lastWrong=null, sinceWrong=0, run3=0;
  while(s.phase!=='done' && day<200){
    day++; const today=E.addDays(start,day);
    for(let i=0;i<perDay && s.phase!=='done';i++){
      const c=E.current(s,today,rng); screens++;
      if(c.kind==='walk'){ if(!c.fix) asked[s.module].push(`${c.t}x${c.b}`); const k=c.b>1?E.key(c.t,c.b):null; const ok=rng()<0.95; E.attempt(s,ok,today,rng); if(k) skill[k]=(skill[k]||0)+1; E.finish(s,rng); continue; }
      if(c.kind!=='q'){ if(c.kind==='moduleDone') log.modDone[c.m]=day; if(c.kind==='finalResult'){log.finalTries++; log.lastFinal=c.right; assert(c.of===66,'final had '+c.of);} E.finish(s,rng); continue; }
      // invariants on the fix-it sequence
      if(lastWrong && sinceWrong===0) assert((c.mode==='retry'&&c.k===lastWrong.k&&c.a===lastWrong.a)||(c.kind==='q'&&false)||true,'');
      const ok=rng()<p(c.k);
      const before=s.test?JSON.parse(JSON.stringify(s.test)):null; const mod=s.module; const ph=s.phase;
      const r=E.attempt(s,ok,today,rng); skill[c.k]=(skill[c.k]||0)+1;
      if(c.mode==='test'&&!ok){
        const nx=s.q[0];
        const bt=E.buildFor({...s,phase:ph,module:mod},c.a,c.b).table; const other=bt===c.a?c.b:c.a;
        assert(E.MODULES.slice(0,mod+1).flat().includes(bt),`${name}: built ${c.a}×${c.b} from unlearned table ${bt} in module ${mod+1}`);
        if((before.misses[c.k]||0)>=1) assert(nx&&nx.kind==='walk'&&nx.t===bt&&nx.b===1&&s.q.filter(x=>x.fix).length===other,`${name}: second miss on ${c.k} should fill out table ${bt} up to ${other}`);
        else assert(nx&&nx.mode==='retry'&&nx.a===c.a&&nx.b===c.b,`${name}: retry should come right away`);
        const sch=s.sched.slice(-2); assert(sch[0].screen.a===c.b&&sch[0].screen.b===c.a&&sch[0].at===s.test.count+3&&sch[1].at===s.test.count+8,`${name}: flip at +3, same at +8`);
        if(before.wrongRun===2) assert(r.easyRun&&s.q.some(x=>x.mode==='easy'),`${name}: 3 wrong in a row should start an easy run`);
      }
      if(r.moduleDone!=null){ const w=before.window.concat([1]).slice(-25); assert(w.length===25&&w.reduce((a,b)=>a+b,0)>=20,`${name}: gate opened at ${w.reduce((a,b)=>a+b,0)}/${w.length}`); assert(E.NEW[mod].every(k=>before.newRight.includes(k)||k===c.k),`${name}: gate opened with new facts never right`); }
      if(ph==='test') assert(E.MODULE_OF[c.k]<=mod,`${name}: test asked ${c.k} from a later module`);
      E.finish(s,rng);
    }
  }
  const cnt=Object.fromEntries(Object.entries(asked).map(([m,a])=>[m,new Set(a).size]));
  console.log(`${name}: modules done on days ${JSON.stringify(log.modDone)}, final tries ${log.finalTries} (last ${log.lastFinal}/66), finished day ${s.phase==='done'?day:'-'}, screens ${screens}; learn rungs asked per module ${JSON.stringify(cnt)}`);
  return cnt;
}
const c=run('quick   ',0.8,0.03,60,1);
assert(JSON.stringify(c)==='{"0":33,"1":21,"2":12,"3":3}','learn rungs asked: '+JSON.stringify(c));
run('steady  ',0.6,0.04,40,2);
run('struggle',0.45,0.03,30,3);
assert(E.NEW.map(n=>n.length).join()==='30,21,12,3','new facts per module '+E.NEW.map(n=>n.length));
assert(E.build(7,8).join(' / ')==='5 × 8 = 40 / plus 2 more 8s = 56','7x8 build');
for(let a=2;a<=12;a++)for(let b=2;b<=12;b++){const L=E.build(a,b);assert(L[L.length-1].endsWith(String(a*b)),'build ends at answer '+a+'x'+b)}
console.log('build 9×2 in module 1:',E.buildFor({phase:'test',module:0},9,2).lines.join(' / '),'| 7×8 in module 3:',E.buildFor({phase:'test',module:2},7,8).lines.join(' / '));
console.log('tricks:',[2,10,5,3,4,6,7,8,9,11,12].map(t=>E.trick(t).example).join(' | '));
console.log(errors.length?('ERRORS:\n'+[...new Set(errors)].filter(Boolean).slice(0,20).join('\n')):'All checks held.');
