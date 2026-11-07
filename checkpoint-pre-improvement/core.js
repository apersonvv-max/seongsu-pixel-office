(function(root,factory){const value=factory();if(typeof module==='object'&&module.exports)module.exports=value;else root.OfficeCore=value;})(typeof window!=='undefined'?window:globalThis,()=>{
 'use strict';
 const TILE=16,WIDTH=1024,HEIGHT=576;
 const furniture=[
  {id:'ceo-desk',kind:'desk',x:96,y:170,w:160,h:64,color:'cream',owner:'emp_ceo'},
  {id:'miki-desk',kind:'desk',x:432,y:170,w:144,h:64,color:'blue',owner:'emp_miki'},
  {id:'yoo-desk',kind:'desk',x:784,y:170,w:144,h:64,color:'cream',owner:'emp_yoo'},
  {id:'son-desk',kind:'desk',x:96,y:386,w:160,h:64,color:'cream',owner:'emp_son'},
  {id:'coordination',kind:'board',x:424,y:290,w:112,h:62},
  {id:'meeting',kind:'table',x:576,y:444,w:112,h:64},
  {id:'sofa',kind:'sofa',x:832,y:424,w:144,h:76},
  {id:'bookshelf',kind:'shelf',x:768,y:434,w:48,h:62},
  {id:'cabinet',kind:'cabinet',x:336,y:122,w:112,h:42},
  {id:'coffee',kind:'coffee',x:880,y:120,w:96,h:44},
  {id:'stove',kind:'stove',x:32,y:118,w:40,h:64}
 ];
 const roster=[
  {id:'emp_ceo',name:'대표',role:'최종 사업·예산·고객 발행 승인',species:'bullfrog',speciesName:'황소개구리',color:'#46744a',home:[176,176],desk:'ceo-desk'},
  {id:'emp_miki',name:'이팀장 미키',role:'운영 총괄 · 업무 배정 · AI 1차 검수',species:'treefrog',speciesName:'청개구리',color:'#82a94e',home:[512,176],desk:'miki-desk'},
  {id:'emp_karina',name:'카리나 과장',role:'확정 지시 중계 · 진행 확인 · 결과 회수',species:'capybara',speciesName:'카피바라',color:'#ae8051',home:[400,320],desk:null},
  {id:'emp_son',name:'손지현 부장',role:'디자인 · 시각 제작 · 시각 품질 검수',species:'lunamoth',speciesName:'루나모스',color:'#9ebd91',home:[176,392],desk:'son-desk'},
  {id:'emp_yoo',name:'유민철 대리',role:'사업분석 · 자료 검증 · 보고서 초안',species:'octopus',speciesName:'문어',color:'#d8806e',home:[864,176],desk:'yoo-desk'}
 ];
 const states={IDLE:'대기',WORKING:'작업 중',REVIEW:'검수 요청',REVISING:'수정 중',DONE:'완료',BLOCKED:'보류·차단'};
 function rect(o){return {x:o.x,y:o.y+(o.kind==='desk'?16:0),w:o.w,h:o.h-(o.kind==='desk'?16:0)};}
 function walkable(x,y,objects=furniture){if(x<24||x>1000||y<152||y>552)return false;return !objects.some(o=>{const r=rect(o);return x>r.x-7&&x<r.x+r.w+7&&y>r.y-7&&y<r.y+r.h+7;});}
 const center=(n)=>Math.floor(n/TILE)*TILE+8;
 function nearest(point){const x=center(point[0]),y=center(point[1]);if(walkable(x,y))return [x,y];for(let ring=1;ring<20;ring++)for(let dx=-ring;dx<=ring;dx++)for(let dy=-ring;dy<=ring;dy++){if(Math.abs(dx)!==ring&&Math.abs(dy)!==ring)continue;const p=[x+dx*TILE,y+dy*TILE];if(walkable(...p))return p;}return null;}
 function pathfind(start,end){const a=nearest(start),b=nearest(end);if(!a||!b)return [];const key=p=>p.join(','),goal=key(b),open=[a],seen=new Set([key(a)]),prev=new Map();let head=0;
  while(head<open.length){const p=open[head++],k=key(p);if(k===goal){const path=[p];while(prev.has(key(path[0])))path.unshift(prev.get(key(path[0])));return path;}
   for(const [dx,dy]of [[16,0],[-16,0],[0,16],[0,-16]]){const n=[p[0]+dx,p[1]+dy],nk=key(n);if(!seen.has(nk)&&walkable(...n)){seen.add(nk);prev.set(nk,p);open.push(n);}}
  }return [];
 }
 function destination(person,state,index=0){if(state==='REVIEW')return [376+(index%2)*16,248+(index%3)*16];if(state==='DONE')return [744+(index%3)*16,520];return person.home;}
 function visualState(work,moving){if(moving)return 'move';if(work==='WORKING'||work==='REVISING')return 'working';if(work==='REVIEW')return 'review_request';if(work==='DONE')return 'relaxing';return 'idle';}
 function sortDepth(items){return [...items].sort((a,b)=>a.depth-b.depth||a.order-b.order);}
 function validateImport(value){if(!value||!Array.isArray(value.employees)||!Array.isArray(value.tasks))throw Error('직원·업무 배열이 있는 원본 JSON이 필요해요.');if(value.employees.some(e=>!e.id||!e.name)||value.tasks.some(t=>!t.id))throw Error('고유 ID가 없는 기록이에요.');return JSON.parse(JSON.stringify(value));}
 return {TILE,WIDTH,HEIGHT,furniture,roster,states,rect,walkable,nearest,pathfind,destination,visualState,sortDepth,validateImport};
});
