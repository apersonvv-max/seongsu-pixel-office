'use strict';
(()=>{
 const C=OfficeCore,A=OfficeArt,$=s=>document.querySelector(s),clone=v=>JSON.parse(JSON.stringify(v));
 const isQA=new URLSearchParams(location.search).has('qa'),KEY='seongsu.office.dev001.'+(isQA?'qa.':'')+'demo.v1',RECORD_KEY='seongsu.office.dev001.'+(isQA?'qa.':'')+'records.v1';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let records=clone(window.LEGACY_RECORDS),recordOrigin='공개 시연 직원 5명 · 업무 3개',saved={},saveOK=true;
 try{const raw=localStorage.getItem(RECORD_KEY);if(raw){records=C.validateImport(JSON.parse(raw));recordOrigin='가져온 원본 JSON 사본 · 별도 저장';}else{const legacy=localStorage.getItem('seongsu_jihyun_office_v1');if(legacy){records=C.validateImport(JSON.parse(legacy));recordOrigin='같은 주소의 기존 저장 데이터 사본 · 원본 키는 읽기만 함';}}const rawDemo=localStorage.getItem(KEY);if(rawDemo){const parsed=JSON.parse(rawDemo);if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))saved=parsed;}}catch(e){saveOK=false;}
 let selected=C.roster.some(p=>p.id===saved.selected)?saved.selected:'emp_yoo',paused=false,showGrid=false,showLabels=true,time=0,last=0,toastTimer,drawTrace=[],targetRipple=null;
 const demoStates=Object.fromEntries(C.roster.map(p=>[p.id,C.states[saved.demoStates?.[p.id]]?saved.demoStates[p.id]:'IDLE']));
 const demoTasks=saved.demoTasks&&typeof saved.demoTasks==='object'?saved.demoTasks:{};
 const actors=C.roster.map(p=>{const home=C.nearest(p.home);return {...p,x:home[0],y:home[1],path:[],visual:'idle',facing:1,moving:false,arrived:true};});
 const canvas=$('#world'),ctx=canvas.getContext('2d'),zoom=$('#zoom-world').getContext('2d');ctx.imageSmoothingEnabled=false;zoom.imageSmoothingEnabled=false;
 function notify(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2600);}
 function save(){try{localStorage.setItem(KEY,JSON.stringify({schema:1,selected,demoStates,demoTasks}));$('#save-state').textContent='시연 상태만 이 브라우저에 저장';saveOK=true;}catch(e){saveOK=false;$('#save-state').textContent='저장 불가 · 이번 화면에서만 유지';}}
 function route(a){a.path=C.pathfind([a.x,a.y],C.destination(a,demoStates[a.id],actors.indexOf(a)));if(a.path.length&&Math.hypot(a.path[0][0]-a.x,a.path[0][1]-a.y)<1)a.path.shift();a.arrived=!a.path.length;}
 function setDemoState(id,state){if(!C.states[state]||!demoStates.hasOwnProperty(id))return;demoStates[id]=state;const a=actors.find(a=>a.id===id);route(a);save();renderDetail();renderTeam();renderTasks();renderDirector();}
 function choose(id){if(!actors.some(a=>a.id===id))return;selected=id;save();renderDetail();renderDirector();$('#actors').querySelectorAll('button').forEach(b=>{b.classList.toggle('active',b.dataset.id===id);b.setAttribute('aria-pressed',String(b.dataset.id===id));});}
 function portrait(id,element){
  const a=actors.find(a=>a.id===id);if(!a||!element)return;
  const c=element.getContext('2d');
  c.clearRect(0,0,72,72);
  c.imageSmoothingEnabled=true;
  c.imageSmoothingQuality='high';
  const pImg=A.portrait(id);
  if(pImg&&pImg.complete&&pImg.naturalWidth>0){
   c.drawImage(pImg,4,4,64,64);
  }else{
   try{
    const sp=A.sprite(a.species,'idle',0);
    if(sp)c.drawImage(sp,4,4,64,64);
   }catch(err){console.error('Portrait fallback error:',err);}
  }
 }
 function refreshPortraits(){
  const p=actors.find(p=>p.id===selected);
  if(p&&$('#selected-portrait'))portrait(p.id,$('#selected-portrait'));
  for(const r of C.roster){
   const el=$('#portrait-'+r.id);
   if(el)portrait(r.id,el);
  }
 }
 function renderDetail(){
  const p=actors.find(p=>p.id===selected),legacy=records.employees.find(e=>e.id===p.id);
  $('#detail').innerHTML=`<div class="detail-eyebrow">OUR COLLEAGUE <span>●</span></div><div class="portrait"><canvas width="72" height="72" id="selected-portrait"></canvas></div><h3>${esc(p.name)}</h3><span class="species">${esc(p.speciesName)}</span><p class="role">${esc(p.role)}</p><span class="record-pill">고정 외형 · 시연</span><button id="open-chat-btn" class="chat-open-btn">💬 동료와 이야기하기 (Gemini)</button><div class="detail-block"><label class="small-label" for="demo-state">시연 업무 상태</label><select id="demo-state">${Object.entries(C.states).map(([key,label])=>`<option value="${key}" ${demoStates[p.id]===key?'selected':''}>${label}</option>`).join('')}</select><div class="motion-state"><span>화면 동작</span><b id="visual-state">${p.visual}</b></div><p class="help">검수 요청은 이팀장 검수 구역으로, 완료는 휴게 공간으로 이동해요. 오피스 바닥을 직접 클릭해 이동시킬 수도 있어요.</p></div><div class="detail-block"><span class="small-label">보존된 원본 기록</span><p class="help">직원 ID: ${esc(p.id)}<br>${legacy?'원본 이름: '+esc(legacy.name)+'<br>원본 상태: '+esc(legacy.state):'새 시각 역할 · 기존 직원의 기록을 덮어쓰지 않음'}</p></div><p class="demo-reminder">시연 상태와 실제 업무·승인은 별개예요.<br>이 화면에는 승인·발행 기능이 없어요.</p>`;
  portrait(p.id,$('#selected-portrait'));
  $('#demo-state').onchange=e=>setDemoState(p.id,e.target.value);
  $('#open-chat-btn').onclick=()=>openChatDialog(p);
 }
 function renderTeam(){$('#team-list').innerHTML=C.roster.map(p=>`<button class="team-card" data-person="${p.id}"><div class="portrait"><canvas id="portrait-${p.id}" width="72" height="72"></canvas></div><h3>${esc(p.name)}</h3><span class="species">${esc(p.speciesName)}</span><p>${esc(p.role)}</p><span class="record-pill">시연 · ${C.states[demoStates[p.id]]}</span></button>`).join('');for(const p of C.roster)portrait(p.id,$('#portrait-'+p.id));$('#team-list').querySelectorAll('button').forEach(b=>b.onclick=()=>{choose(b.dataset.person);view('office');});}
 function renderTasks(){const groups=[['WORKING','REVISING'],['REVIEW','BLOCKED','IDLE'],['DONE']],titles=['시연 작업','시연 검수 · 대기','시연 완료'];$('#task-board').innerHTML=groups.map((g,i)=>`<section class="board-column"><h3>${titles[i]}</h3>${records.tasks.filter(t=>g.includes(demoTasks[t.id]||t.state||'IDLE')).map(t=>`<article class="task-card"><small>${esc(t.id)}</small><h4>${esc(t.title)}</h4><p>${esc(t.desc||'')}</p><p>원본 담당 ID: ${esc(t.assigneeId||'미기록')}<br>원본 상태: ${esc(t.state||'미기록')}</p><label class="small-label" for="task-${esc(t.id)}">시연 상태만 변경</label><select id="task-${esc(t.id)}" data-task="${esc(t.id)}">${Object.entries(C.states).map(([k,v])=>`<option value="${k}" ${(demoTasks[t.id]||t.state)===k?'selected':''}>${v}</option>`).join('')}</select></article>`).join('')}</section>`).join('');$('#task-board').querySelectorAll('select').forEach(s=>s.onchange=()=>{demoTasks[s.dataset.task]=s.value;const t=records.tasks.find(t=>t.id===s.dataset.task);if(demoStates.hasOwnProperty(t.assigneeId))setDemoState(t.assigneeId,s.value);else{save();renderTasks();notify('기존 직원의 시연 상태만 저장했어요. 원본은 그대로예요.');}});}
 function renderRecords(){$('#record-origin').textContent=recordOrigin;$('#records-json').textContent=JSON.stringify(records,null,2);}
 function renderDirector(){
  const cont=$('#director-colleagues');if(!cont)return;
  cont.innerHTML=C.roster.map(p=>`<button class="colleague-pill ${selected===p.id?'active':''}" data-director-id="${p.id}">● ${esc(p.name)}</button>`).join('');
  cont.querySelectorAll('button').forEach(b=>b.onclick=()=>{choose(b.dataset.directorId);renderDirector();});
 }
 function view(name){for(const v of ['office','team','tasks','records'])$('#'+v+'-panel').classList.toggle('hidden',v!==name);document.querySelectorAll('.tabs button').forEach(b=>{b.classList.toggle('active',b.dataset.tab===name);b.setAttribute('aria-current',b.dataset.tab===name?'page':'false');});}
 function step(dt){
  if(paused)return;time+=dt;
  if(targetRipple){targetRipple.time+=dt;if(targetRipple.time>=targetRipple.duration)targetRipple=null;}
  for(const a of actors){let distance=dt*(a.species==='treefrog'?48:a.species==='bullfrog'?34:a.species==='capybara'?39:a.species==='lunamoth'?42:32);while(distance>0&&a.path.length){const p=a.path[0],dx=p[0]-a.x,dy=p[1]-a.y,d=Math.hypot(dx,dy);if(dx)a.facing=dx<0?-1:1;if(d<=distance){a.x=p[0];a.y=p[1];a.path.shift();distance-=d;}else{a.x+=dx/d*distance;a.y+=dy/d*distance;distance=0;}}
   a.moving=a.path.length>0;a.arrived=!a.moving;a.visual=C.visualState(demoStates[a.id],a.moving);
  }
 }
 function renderWorld(){ctx.clearRect(0,0,1024,576);ctx.drawImage(A.floor,0,0);for(const o of C.furniture)if(o.kind==='desk')A.chair(ctx,o);
  const items=C.furniture.flatMap((o,i)=>o.kind==='desk'?[{kind:'furniture',o,part:'back',depth:o.y+2,order:i},{kind:'furniture',o,part:'front',depth:o.y+o.h,order:i}]:[{kind:'furniture',o,depth:o.y+o.h,order:i}]);
  for(const a of actors){const seated=a.desk&&a.arrived&&!['REVIEW','DONE'].includes(demoStates[a.id]);items.push({kind:'actor',a,seated,depth:a.y+(seated?24:0),order:100+actors.indexOf(a)});}
  drawTrace=[];for(const item of C.sortDepth(items)){drawTrace.push({id:item.o?(item.o.id+(item.part==='back'?'-back':'')):item.a.id,depth:item.depth,kind:item.kind});if(item.kind==='furniture'){A.furniture(ctx,item.o,item.part);continue;}const{a,seated}=item;const moving=a.moving,phase=time*8;let dy=0;if(!paused){if(a.species.includes('frog')&&moving)dy=-Math.abs(Math.sin(phase))*5;else if(a.species==='lunamoth')dy=Math.sin(time*3)*2;else if(a.species==='capybara'&&moving)dy=Math.sin(phase)*.7;else if(a.species==='octopus'&&moving)dy=Math.sin(phase)*.5;}
   const x=Math.round(a.x),y=Math.round(a.y)+(seated?24:0),frame=Math.floor(time*(moving?9:a.visual==='working'?6:2))%A.frameCounts[a.visual];
   const isCeo=a.species==='bullfrog';
   const dw=isCeo?64:58,dh=isCeo?64:58;
   const ox=-Math.round(dw/2),oy=-Math.round(dh*(118/128));
   if(a.id===selected){ctx.strokeStyle='#c1a562';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,isCeo?22:21,isCeo?6:5,0,0,Math.PI*2);ctx.stroke();}
   A.ellipse(ctx,x,y-1,isCeo?18:16,isCeo?4:3,'#75624738');ctx.save();ctx.translate(x,y+dy);if(a.facing<0)ctx.scale(-1,1);
   ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
   ctx.drawImage(A.sprite(a.species,a.visual,frame),ox,oy,dw,dh);
   ctx.restore();ctx.imageSmoothingEnabled=false;
  }
  if(targetRipple){
   const prog=targetRipple.time/targetRipple.duration,r=6+prog*18,alpha=(1-prog)*0.85;
   ctx.save();ctx.strokeStyle=`rgba(212,175,55,${alpha})`;ctx.lineWidth=2;
   ctx.beginPath();ctx.ellipse(targetRipple.x,targetRipple.y,r,r*0.45,0,0,Math.PI*2);ctx.stroke();
   ctx.beginPath();ctx.ellipse(targetRipple.x,targetRipple.y,r*0.5,r*0.22,0,0,Math.PI*2);ctx.stroke();
   ctx.restore();
  }
  if(showGrid){ctx.fillStyle='#5e8d8370';for(let y=152;y<552;y+=16)for(let x=24;x<1000;x+=16)if(!C.walkable(x,y))ctx.fillRect(x-2,y-2,4,4);for(const a of actors){ctx.strokeStyle=a.id===selected?'#c79c48':'#8aa77a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x,a.y);for(const p of a.path)ctx.lineTo(...p);ctx.stroke();}}
  for(const a of actors){const b=$(`#actors [data-id="${a.id}"]`);b.style.left=(a.x/1024*100)+'%';b.style.top=((a.y+(a.desk&&a.arrived&&!['REVIEW','DONE'].includes(demoStates[a.id])?54:14))/576*100)+'%';b.dataset.animation=a.visual;}
  const vs=$('#visual-state');if(vs)vs.textContent=paused?'멈춤':({idle:'대기',move:'이동',working:'업무 동작',review_request:'검수 요청',relaxing:'휴식'})[actors.find(a=>a.id===selected).visual];
  if($('#zoom-dialog').open){zoom.clearRect(0,0,1024,576);zoom.drawImage(canvas,0,0);}
 }
 function frame(t){const dt=Math.min((t-last)/1000||0,.04);last=t;step(dt);renderWorld();requestAnimationFrame(frame);}
 $('#actors').innerHTML=C.roster.map(p=>`<button class="actor-label ${selected===p.id?'active':''}" data-id="${p.id}" aria-label="${p.name} 선택" aria-pressed="${selected===p.id}">${esc(p.name)}</button>`).join('');$('#actors').querySelectorAll('button').forEach(b=>b.onclick=()=>choose(b.dataset.id));
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>view(b.dataset.tab));
 
 // Canvas click-to-move
 canvas.addEventListener('click',e=>{
  const rect=canvas.getBoundingClientRect();
  const mx=(e.clientX-rect.left)*(1024/rect.width);
  const my=(e.clientY-rect.top)*(576/rect.height);
  for(const a of actors){
   if(Math.hypot(a.x-mx,a.y-my)<28){choose(a.id);notify(`${a.name} 선택됨`);return;}
  }
  const current=actors.find(a=>a.id===selected);if(!current)return;
  const target=C.nearest([mx,my]);
  if(!target){notify('이동할 수 없는 위치예요 (벽 또는 가구).');return;}
  const path=C.pathfind([current.x,current.y],target);
  if(path&&path.length){
   current.path=path;current.moving=true;current.arrived=false;
   targetRipple={x:target[0],y:target[1],time:0,duration:0.9};
   notify(`${current.name}이(가) 지정 위치로 걸어갑니다.`);
  }else{
   notify('그곳으로 가는 경로를 찾을 수 없어요.');
  }
 });

 // Director controls
 document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{
  const action=b.dataset.action;setDemoState(selected,action);
  const a=actors.find(a=>a.id===selected);
  notify(`${a.name}의 시연 동작을 [${C.states[action]}]로 전환했습니다.`);
 });

 const destMap={
  desk:a=>a.home,
  board:()=>[440,340],
  meeting:()=>[600,470],
  stove:()=>[80,160],
  sofa:()=>[820,480],
  coffee:()=>[860,160]
 };
 document.querySelectorAll('[data-dest]').forEach(b=>b.onclick=()=>{
  const fn=destMap[b.dataset.dest],a=actors.find(a=>a.id===selected);
  if(!fn||!a)return;
  const dest=fn(a),target=C.nearest(dest);
  if(target){
   a.path=C.pathfind([a.x,a.y],target);a.moving=a.path.length>0;a.arrived=!a.moving;
   targetRipple={x:target[0],y:target[1],time:0,duration:0.9};
   notify(`${a.name}이(가) ${b.textContent} (으)로 이동합니다.`);
  }
 });

 // Gemini Chat Dialog
 const colleagueSuggestions={
  emp_ceo:['오늘 오피스 분위기와 사업 방향 어때요?','이번 주 주요 안건 승인 검토 부탁드려요','대표님의 리더십 한마디 들려주세요'],
  emp_miki:['오늘 팀 분위기 음악 추천해줘!','현재 업무 배정 상황 알려줘','새로운 기능 기획 아이디어 있나요?'],
  emp_karina:['오늘 칸반 보드 진행률 점검해줘','다음에 회의할 안건이 뭐야?','팀원들 스케줄 조율 부탁해'],
  emp_son:['새 픽셀 디자인 톤앤매너 어때요?','따뜻한 오피스 컬러 팔레트 피드백 줘','시각 디테일에서 보완할 점 있어?'],
  emp_yoo:['최신 시연 데이터 지표 요약해줘','보고서 초안 검증 완료됐어?','멀티태스킹 팁 하나 알려줘!']
 };
 function openChatDialog(p){
  $('#chat-colleague-name').textContent=p.name;
  $('#chat-colleague-role').textContent=p.role;
  const sugCont=$('#chat-suggestions');
  const sugs=colleagueSuggestions[p.id]||colleagueSuggestions.emp_ceo;
  sugCont.innerHTML=sugs.map(s=>`<button type="button" class="suggestion-chip">${esc(s)}</button>`).join('');
  sugCont.querySelectorAll('button').forEach(btn=>{
   btn.onclick=()=>{
    $('#chat-input').value=btn.textContent;
    sendChatMessage(btn.textContent);
   };
  });
  $('#chat-dialog').showModal();
 }
 $('#close-chat').onclick=()=>$('#chat-dialog').close();
 async function sendChatMessage(msg){
  if(!msg||!msg.trim())return;
  const p=actors.find(a=>a.id===selected);
  const cont=$('#chat-messages');
  cont.innerHTML+=`<div class="chat-bubble user"><p>${esc(msg)}</p></div>`;
  const thinkingBubble=document.createElement('div');
  thinkingBubble.className='chat-bubble ai thinking';
  thinkingBubble.innerHTML=`<p>${esc(p.name)}이(가) 답변을 준비하고 있어요... 💭</p>`;
  cont.appendChild(thinkingBubble);
  cont.scrollTop=cont.scrollHeight;
  $('#chat-input').value='';

  try{
   const res=await fetch('/api/chat',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({employeeId:p.id,message:msg})
   });
   const data=await res.json();
   thinkingBubble.remove();
   cont.innerHTML+=`<div class="chat-bubble ai"><p>${esc(data.text||'오늘도 함께 힘내봐요!')}</p></div>`;
  }catch(err){
   thinkingBubble.remove();
   cont.innerHTML+=`<div class="chat-bubble ai"><p>안녕하세요! 오늘 하루도 작은 동료들과 함께 보람찬 시간을 보내봐요.</p></div>`;
  }
  cont.scrollTop=cont.scrollHeight;
 }
 $('#chat-form').onsubmit=e=>{
  e.preventDefault();
  const val=$('#chat-input').value;
  sendChatMessage(val);
 };

 $('#pause').onclick=()=>{paused=!paused;$('#pause').textContent=paused?'▶ 움직임 이어가기':'Ⅱ 움직임 멈추기';$('#pause').setAttribute('aria-pressed',String(paused));};$('#labels').onclick=()=>{showLabels=!showLabels;$('#viewport').classList.toggle('no-labels',!showLabels);$('#labels').setAttribute('aria-pressed',String(showLabels));};$('#grid').onclick=()=>{showGrid=!showGrid;$('#grid').setAttribute('aria-pressed',String(showGrid));};$('#zoom').onclick=()=>$('#zoom-dialog').showModal();$('#close-zoom').onclick=()=>$('#zoom-dialog').close();
 const cBtn=$('#compare-btn'),cDlg=$('#compare-dialog'),cClose=$('#close-compare');if(cBtn&&cDlg){cBtn.onclick=()=>cDlg.showModal();if(cClose)cClose.onclick=()=>cDlg.close();}
 $('#export-records').onclick=()=>{const blob=new Blob([JSON.stringify(records,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='seongsu-preserved-records.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 $('#import-records').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>2000000)throw Error('2MB 이하의 원본 JSON을 선택해 주세요.');const imported=C.validateImport(JSON.parse(await file.text()));localStorage.setItem(RECORD_KEY,JSON.stringify(imported));records=imported;recordOrigin='가져온 원본 JSON 사본 · 기존 키와 백업 파일은 변경 없음';renderRecords();renderTasks();renderDetail();notify('기존 기록을 새 저장 공간에 사본으로 보관했어요.');}catch(error){notify(error.message);}e.target.value='';};
 for(const a of actors)route(a);renderDetail();renderTeam();renderTasks();renderRecords();renderDirector();save();
 window.OfficeDev={setDemoState,choose,step,renderWorld,view,actors,records:()=>clone(records),demo:()=>clone({demoStates,demoTasks,selected}),trace:()=>clone(drawTrace),keys:{KEY,RECORD_KEY},canvas,art:A,core:C,refreshPortraits};
 requestAnimationFrame(frame);
 if(isQA){const s=document.createElement('script');s.src='browser-qa.js';document.body.append(s);}
})();
