'use strict';
(async()=>{
 const D=OfficeDev,C=D.core,results=[],before=JSON.stringify(D.records()),originalKey=localStorage.getItem('seongsu_jihyun_office_v1');
 const check=(name,pass,detail='')=>results.push({name,pass:!!pass,detail});
 try{
  check('five fixed species',new Set(D.actors.map(a=>a.species)).size===5);
  let collisions=0,arrivals=0;
  for(const p of C.roster)for(const state of ['IDLE','WORKING','REVIEW','REVISING','DONE','BLOCKED']){D.setDemoState(p.id,state);for(let i=0;i<4200;i++){D.step(1/60);if(!C.walkable(...D.actors.filter(a=>a.id===p.id).map(a=>[a.x,a.y])[0]))collisions++;if(!D.actors.find(a=>a.id===p.id).path.length)break;}if(!D.actors.find(a=>a.id===p.id).path.length)arrivals++;}
  check('all 30 state routes arrive',arrivals===30,arrivals+' / 30');check('continuous movement avoids furniture',collisions===0,collisions+' collisions');
  D.setDemoState('emp_ceo','WORKING');for(let i=0;i<4200;i++)D.step(1/60);D.renderWorld();let trace=D.trace(),actor=trace.findIndex(v=>v.id==='emp_ceo'),desk=trace.findIndex(v=>v.id==='ceo-desk');check('seated actor behind desk front',actor>=0&&desk>actor);
  const select=document.querySelector('#demo-state');select.value='REVIEW';select.dispatchEvent(new Event('change',{bubbles:true}));check('state select executes actual handler',D.demo().demoStates[D.demo().selected]==='REVIEW');
  document.querySelector('[data-tab="team"]').click();check('team tab shown',!document.querySelector('#team-panel').classList.contains('hidden'));document.querySelector('[data-tab="tasks"]').click();check('task board retains original IDs',D.records().tasks.every(t=>document.querySelector('#task-board').textContent.includes(t.id)));
  document.querySelector('[data-tab="office"]').click();document.querySelector('#zoom').click();check('zoom dialog opens',document.querySelector('#zoom-dialog').open);document.querySelector('#close-zoom').click();check('zoom dialog closes',!document.querySelector('#zoom-dialog').open);
  document.querySelector('#pause').click();const t=D.actors.map(a=>[a.x,a.y]);D.step(1);check('pause stops movement',JSON.stringify(t)===JSON.stringify(D.actors.map(a=>[a.x,a.y])));document.querySelector('#pause').click();
  check('original records unchanged',JSON.stringify(D.records())===before);check('legacy localStorage key unchanged',localStorage.getItem('seongsu_jihyun_office_v1')===originalKey);check('new storage namespace only',D.keys.KEY!=='seongsu_jihyun_office_v1');
  check('no horizontal overflow',document.documentElement.scrollWidth<=innerWidth);
  const exportAssets={};for(const p of C.roster){const atlas=D.art.atlas(p.species);exportAssets[p.species]={png:atlas.canvas.toDataURL('image/png'),frames:atlas.entries};check(p.species+' has 24 native frames',atlas.entries.length===24);}
  check('1024x576 logical canvas',D.canvas.width===1024&&D.canvas.height===576);
  check('state and animation separate',D.actors.every(a=>typeof a.visual==='string')&&Object.keys(D.demo().demoStates).length===5);
  for(const p of C.roster)D.setDemoState(p.id,'IDLE');D.choose('emp_yoo');D.renderWorld();
  const report={at:new Date().toISOString(),viewport:{width:innerWidth,height:innerHeight},passed:results.filter(t=>t.pass).length,failed:results.filter(t=>!t.pass).length,results,assets:exportAssets,world:D.canvas.toDataURL('image/png')};
  const response=await fetch('/qa-report',{method:'POST',headers:{'Content-Type':'application/json','X-Office-QA':'dev001'},body:JSON.stringify(report)});check('QA report saved',response.ok);
  const panel=document.createElement('aside');panel.id='qa-result';panel.style='position:fixed;bottom:12px;right:12px;z-index:50;background:#fff7db;padding:14px;border:2px solid #a99758;border-radius:9px;font:12px monospace;max-width:90vw;';panel.textContent='QA: '+report.passed+' passed / '+report.failed+' failed · '+innerWidth+'×'+innerHeight;document.body.append(panel);
 }catch(error){const p=document.createElement('pre');p.id='qa-result';p.textContent=error.stack;document.body.prepend(p);}
})();
