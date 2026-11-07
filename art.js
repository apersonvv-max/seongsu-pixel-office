'use strict';
window.OfficeArt=(()=>{
 const C=OfficeCore,P={ivory:'#f4e8d7',white:'#fff8ec',oak:'#ddaa72',oakLight:'#eac295',oakDark:'#a96f46',blue:'#667fa5',blueDark:'#435b7b',coral:'#d88168',yellow:'#e9c76a',sage:'#98a978',ink:'#655548'};
 const floor=document.createElement('canvas');floor.width=1024;floor.height=576;const f=floor.getContext('2d');
 const px=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);};
 function ellipse(c,cx,cy,rx,ry,color){c.fillStyle=color;for(let y=-ry;y<=ry;y++){const width=Math.floor(rx*Math.sqrt(Math.max(0,1-y*y/(ry*ry))));c.fillRect(Math.round(cx-width),Math.round(cy+y),width*2+1,1);}}
 function line(c,x1,y1,x2,y2,color,size=1){const n=Math.max(Math.abs(x2-x1),Math.abs(y2-y1));for(let i=0;i<=n;i++){const t=n?i/n:0;px(c,x1+(x2-x1)*t,y1+(y2-y1)*t,size,size,color);}}
 function box(c,x,y,w,h,base,edge=P.ink){px(c,x,y,w,h,edge);if(base)px(c,x+2,y+2,w-4,h-4,base);px(c,x+3,y+3,w-6,2,'#ffffff42');}
 function wood(c,x,y,w,h){box(c,x,y,w,h,P.oak,P.oakDark);px(c,x+3,y+3,w-6,3,'#f4d3ab');for(let r=9;r<h-3;r+=8)px(c,x+4,y+r,w-8,1,'#be8b5b66');for(let i=0;i<w/16;i++)px(c,x+6+i*16,y+5+(i*11)%Math.max(1,h-8),7,1,'#f9ddb23b');}
 function rug(c,x,y,w,h,color){px(c,x,y+3,w,h,'#8d74432a');box(c,x,y,w,h,'#f2dfb4','#c3ab86');box(c,x+5,y+5,w-10,h-10,'#eee1c2',color);px(c,x+9,y+9,w-18,h-18,'#f7e9c9');for(let i=0;i<w-16;i+=7){px(c,x+9+i,y+8,2,2,'#d9ca9f');px(c,x+9+i,y+h-10,2,2,'#d9ca9f');}for(let r=0;r<h;r+=5){px(c,x-2,y+r,2,1,'#c0a884');px(c,x+w,y+r,2,1,'#c0a884');}}
 function windowArt(x){box(f,x,25,134,83,'#e8d2aa','#c6ac89');box(f,x+5,29,124,73,'#c4decd','#fff5df');px(f,x+9,33,116,65,'#b9dbe6');for(let i=0;i<116;i++){const hill=68+Math.sin(i*.055+x)*5+Math.sin(i*.12)*2;px(f,x+9+i,hill,1,98-hill,'#8bb48b');const back=61+Math.sin(i*.08)*5;px(f,x+9+i,back,1,7,'#acc4a0');}for(let i=0;i<12;i++){const xx=x+12+(i*37)%108,yy=76+(i*11)%17;px(f,xx,yy,4,2,'#e9d581');px(f,xx+1,yy-1,2,4,'#fff5c4');}for(const xx of [x+45,x+87]){px(f,xx,31,4,69,'#f8f0d8');px(f,xx+4,31,1,69,'#c7b89a');}px(f,x+7,62,120,4,'#fff5df');wood(f,x-4,103,142,7);}
 function bakeFloor(){
  px(f,0,0,1024,576,'#d7b78c');px(f,12,12,1000,552,P.ivory);px(f,20,128,984,432,P.oak);for(let y=128;y<560;y+=16){px(f,20,y,984,1,'#c79565');px(f,20,y+1,984,2,'#edc395');for(let x=20+(y%3)*48;x<1004;x+=144){px(f,x,y,1,16,'#bf8e61');const k=(x*13+y*7)%65;px(f,x+14,y+7,32+k,1,'#d09a652f');px(f,x+10,y+11,60,1,'#f2ce9d35');}}
  px(f,20,20,984,108,'#f2e2cc');for(let y=28;y<91;y+=8)for(let x=24;x<1000;x+=16)if((x+y)%3===0)px(f,x,y,3,1,'#e9d8bf');px(f,20,94,984,34,'#f7ead8');for(let x=24;x<1000;x+=16){px(f,x,97,1,29,'#dac4a7');px(f,x+2,97,1,29,'#fff9e7');}px(f,20,92,984,3,'#cbb596');px(f,20,127,984,4,'#b48f67');px(f,20,127,984,1,'#fff5db');
  [240,496,704].forEach(windowArt);
  for(const x of [250,506,714]){for(let y=136;y<252;y+=4){const alpha=(.19-(y-136)/850);px(f,x+(y-136)*.45,y,112,4,`rgba(255,249,195,${alpha})`);}for(let row=0;row<2;row++)for(let col=0;col<3;col++)px(f,x+12+col*27+row*14,145+row*31,23,25,'#fff1bf45');}
  rug(f,80,192,192,72,P.blue);rug(f,416,192,176,72,P.blue);rug(f,768,192,176,72,P.blue);rug(f,80,408,192,72,P.blue);rug(f,816,462,168,68,P.blue);
  rug(f,558,440,148,96,'#d4a497');wood(f,24,545,90,13);
 }
 bakeFloor();
 let bgLoaded=false;
 if(typeof Image!=='undefined'){
  const bg=new Image();
  bg.onload=()=>{
   bgLoaded=true;
   f.drawImage(bg,0,0,1024,576);
   if(typeof window!=='undefined'&&window.OfficeDev&&window.OfficeDev.renderWorld)window.OfficeDev.renderWorld();
  };
  bg.src='assets/warm-office-bg.png';
 }
 function chair(c,o){
  if(bgLoaded)return;
  if(o.owner==='emp_ceo'){
   const x=o.x+o.w/2-24,y=o.y-26;
   ellipse(c,x+24,y+54,26,6,'#816c4b2b');
   px(c,x+22,y+45,4,8,'#b39045');
   for(const bx of [x+6,x+14,x+22,x+30,x+38]) px(c,bx,y+51,4,3,'#5e4922');
   box(c,x,y,48,43,'#8c582f','#523319');
   box(c,x+4,y+4,40,35,'#ba7e4c','#72441f');
   px(c,x+6,y+6,36,2,'#ffffff3b');
   for(let r=0;r<2;r++) for(let k=0;k<3;k++) {
    px(c,x+12+k*12+(r%2)*6,y+13+r*11,3,3,'#562f13');
    px(c,x+13+k*12+(r%2)*6,y+12+r*11,1,1,'#deb283');
   }
   for(let i=0;i<6;i++){
    px(c,x+3,y+8+i*5,2,2,'#dfb958');
    px(c,x+43,y+8+i*5,2,2,'#dfb958');
    px(c,x+7+i*6,y+3,2,2,'#dfb958');
   }
   box(c,x+3,y+35,42,12,'#a46c3e','#5c3517');
   return;
  }
  const x=o.x+o.w/2-19,y=o.y-23;ellipse(c,x+20,y+54,23,5,'#816c4b24');box(c,x,y,38,37,P.blue,'#6b655c');px(c,x+4,y+4,30,2,'#ffffff44');box(c,x+3,y+32,33,12,'#8799b2','#6b655c');for(const dx of [3,31]){px(c,x+dx,y+39,3,13,'#797269');px(c,x+dx-2,y+51,7,3,'#5d5d57');}for(let i=0;i<3;i++)for(let j=0;j<2;j++)px(c,x+9+i*9,y+9+j*12,2,2,'#4b4d5244');
 }
 function monitor(c,x,y,style='chart'){box(c,x,y,38,25,'#bfe3dc','#5c6672');px(c,x+3,y+3,32,18,'#d8e9df');if(style==='chart'){for(let i=0;i<4;i++)px(c,x+6+i*7,y+16-i*3,4,6+i*3,['#94b890','#90b8b3','#648b9f','#b8c99c'][i]);}else{box(c,x+5,y+4,12,14,'#e4a6a7','#ccb5af');px(c,x+21,y+5,9,5,'#eac879');px(c,x+21,y+12,9,6,'#9bbda5');}px(c,x+17,y+25,4,6,'#6c7075');px(c,x+10,y+30,18,2,'#8b8e8e');}
 function mug(c,x,y){box(c,x,y,9,10,'#f9efdc','#aa9370');box(c,x+8,y+2,4,5,'#efe1c5','#aa9370');px(c,x+2,y+1,5,2,'#8a7152');px(c,x+2,y+4,1,4,'#fffdf2');}
 function books(c,x,y){box(c,x,y,24,5,'#8fa5b0','#73838c');px(c,x+2,y+1,20,2,'#f4e6c5');box(c,x+3,y-5,22,5,'#db9b7d','#ab7f65');px(c,x+5,y-4,18,2,'#f4e6c5');}
 function desk(c,o){const {x,y,w}=o,base=o.color==='blue'?'#8394ac':'#efdfc5',dark=o.color==='blue'?'#5c6e87':'#baa07e';ellipse(c,x+w/2,y+67,w*.48,6,'#8d71452b');
  box(c,x+3,y+24,w-6,38,base,dark);box(c,x+6,y+29,30,30,base,dark);box(c,x+w-37,y+29,30,30,base,dark);for(const dx of [10,w-33])for(let j=0;j<2;j++){px(c,x+dx,y+40+j*11,22,1,dark);px(c,x+dx+9,y+34+j*11,5,2,'#bd9655');}px(c,x+39,y+30,w-78,29,'#8b735c');px(c,x+41,y+31,w-82,27,'#bb9b78');px(c,x+5,y+61,5,5,dark);px(c,x+w-10,y+61,5,5,dark);wood(c,x,y+15,w,13);
  if(o.owner==='emp_yoo'){monitor(c,x+35,y-13);monitor(c,x+79,y-11);box(c,x+49,y+18,43,6,'#7b8290','#5f6570');for(let i=0;i<9;i++)px(c,x+52+i*4,y+20,2,1,'#b7bdc0');}
  else if(o.owner==='emp_son'){monitor(c,x+65,y-15,'color');box(c,x+35,y+10,27,19,'#dcb1b6','#6c6571');box(c,x+38,y+13,21,13,'#bfd5d6','#8e9b9c');books(c,x+w-32,y+22);}
  else{box(c,x+58,y-3,40,27,'#687e93','#536477');px(c,x+61,y,34,20,'#a4c1b8');box(c,x+50,y+23,55,5,'#9cabb0','#647a88');books(c,x+10,y+21);}
  mug(c,x+w-20,y+15);
 }
 function ceoDeskBack(c,o){
  const {x,y,w}=o;
  ellipse(c,x+w/2,y+66,w*.48,6,'#8d71452b');
  box(c,x,y+14,w,24,'#b68352','#784e2a');
  px(c,x+2,y+16,w-4,20,'#c99662');
  line(c,x+2,y+16,x+w-3,y+16,'#f2d4ab',1);
  line(c,x+3,y+17,x+w-4,y+17,'#deb381',1);
  for(let gy=20;gy<34;gy+=4) line(c,x+6,y+gy,x+w-8,y+gy,'#a8744433',1);
  const bx=x+44,bw=72;
  box(c,bx,y+17,bw,19,'#382b20','#483523');
  box(c,bx+2,y+18,bw-4,17,'#423326','#c9a552');
  px(c,bx+4,y+20,bw-8,13,'#382b20');
  px(c,bx+3,y+19,1,1,'#dab250');
  px(c,bx+bw-4,y+19,1,1,'#dab250');
  const lx=x+16,ly=y-10;
  ellipse(c,lx+6,y+18,9,3,'#00000028');
  box(c,lx+1,y+14,11,4,'#d4ae43','#8e6d24');
  line(c,lx+6,y+14,lx+6,ly+5,'#d4ae43',2);
  line(c,lx+6,ly+5,lx+10,ly+2,'#d4ae43',2);
  box(c,lx+3,ly-1,15,7,'#1f4a33','#143021');
  line(c,lx+4,ly,lx+16,ly,'#367252',1);
  line(c,lx+4,ly+5,lx+16,ly+5,'#fff6bf',1);
  ellipse(c,lx+10,y+19,14,4,'#fff7c730');
  const penX=x+120;
  box(c,penX,y+18,8,5,'#784e2a','#483523');
  line(c,penX+2,y+19,penX-2,y+12,'#d6b34b',1);
  line(c,penX+5,y+19,penX+9,y+13,'#d6b34b',1);
  const trayX=x+131;
  box(c,trayX,y+16,23,18,'#5e3f22','#3a2512');
  box(c,trayX+2,y+18,19,14,'#f4ede1','#c9bfae');
  line(c,trayX+4,y+21,trayX+17,y+21,'#c9bfae',1);
  line(c,trayX+4,y+24,trayX+15,y+24,'#c9bfae',1);
  line(c,trayX+4,y+27,trayX+18,y+27,'#c9bfae',1);
  box(c,trayX+14,y+25,4,4,'#b83b32','#7a221b');
  px(c,trayX+15,y+26,1,1,'#ffffffb2');
  const mugX=x+34;
  box(c,mugX,y+16,8,9,'#f6eee2','#aa9577');
  box(c,mugX+7,y+18,3,5,'#eedfcb','#aa9577');
  ellipse(c,mugX+4,y+17,3,1,'#6b4f32');
  px(c,mugX+2,y+19,1,1,'#ffffffcc');
 }
 function ceoDeskFront(c,o){
  const {x,y,w}=o;
  px(c,x+2,y+36,w-4,3,'#784e2a');
  line(c,x+2,y+36,x+w-3,y+36,'#f2d4ab',1);
  box(c,x+6,y+39,36,23,'#b68352','#784e2a');
  for(let d=0;d<2;d++){
   const dy=y+41+d*10;
   box(c,x+8,dy,32,8,'#c99662','#784e2a');
   line(c,x+9,dy+1,x+38,dy+1,'#f2d4ab',1);
   box(c,x+21,dy+3,6,2,'#d4ae43','#795a1c');
  }
  box(c,x+118,y+39,36,23,'#b68352','#784e2a');
  for(let d=0;d<2;d++){
   const dy=y+41+d*10;
   box(c,x+120,dy,32,8,'#c99662','#784e2a');
   line(c,x+121,dy+1,x+150,dy+1,'#f2d4ab',1);
   box(c,x+133,dy+3,6,2,'#d4ae43','#795a1c');
  }
  box(c,x+42,y+39,76,22,'#855933','#784e2a');
  px(c,x+44,y+40,72,20,'#9e6d41');
  for(let gx=x+48;gx<x+114;gx+=8) line(c,gx,y+40,gx,y+59,'#7a4e28',1);
  px(c,x+6,y+62,36,2,'#503318');
  px(c,x+118,y+62,36,2,'#503318');
 }
 function deskFront(c,o){
  const{x,y,w}=o,base=o.color==='blue'?'#8394ac':'#efdfc5',dark=o.color==='blue'?'#5c6e87':'#baa07e';box(c,x+3,y+28,w-6,34,base,dark);box(c,x+6,y+30,30,29,base,dark);box(c,x+w-37,y+30,30,29,base,dark);for(const dx of [10,w-33])for(let j=0;j<2;j++){px(c,x+dx,y+40+j*11,22,1,dark);px(c,x+dx+9,y+34+j*11,5,2,'#bd9655');}px(c,x+39,y+30,w-78,29,'#8b735c');px(c,x+41,y+31,w-82,27,'#bb9b78');px(c,x+5,y+61,5,5,dark);px(c,x+w-10,y+61,5,5,dark);px(c,x,y+26,w,3,'#b88a59');px(c,x+2,y+26,w-4,1,'#f4d3ab');
 }
 function shelf(c,o){const{x,y,w,h}=o;ellipse(c,x+w/2,y+h+3,w*.5,4,'#816c4b22');box(c,x,y,w,h,P.blue,'#647286');wood(c,x-2,y-3,w+4,8);for(let row=0;row<2;row++){px(c,x+5,y+12+row*25,w-10,20,'#4f647d');for(let i=0;i<(w-10)/8;i++){const bh=13+(i*3)%6;box(c,x+6+i*8,y+31+row*25-bh,6,bh,['#c99773','#dfcb8a','#9aa883','#b4c8ca','#e3b39f'][i%5],'#74695c');}px(c,x+3,y+33+row*25,w-6,3,'#c4aa83');}}
 function board(c,o){const{x,y,w}=o;ellipse(c,x+w/2,y+66,w*.5,5,'#816c4b22');for(const dx of [6,w-10]){px(c,x+dx,y+25,4,39,'#7c8589');box(c,x+dx-5,y+62,14,5,'#727b7c','#576063');}wood(c,x,y,w,49);box(c,x+4,y+4,w-8,40,'#c49a6d','#edcc9b');for(let i=0;i<6;i++){const xx=x+13+(i%3)*31,yy=y+10+Math.floor(i/3)*17;box(c,xx,yy,21,12,['#e8be75','#92b2bf','#dba8a0'][i%3],'#a48161');px(c,xx+2,yy+3,16,1,'#ffffff77');}line(c,x+27,y+22,x+59,y+28,'#f1e3c1');line(c,x+59,y+28,x+85,y+20,'#f1e3c1');}
 function sofa(c,o){const{x,y,w}=o;ellipse(c,x+w/2,y+73,w*.5,7,'#816c4b22');box(c,x+8,y,w-16,52,'#eee4cb','#b8a185');box(c,x,y+24,20,45,'#f8edd8','#b8a185');box(c,x+w-20,y+24,20,45,'#f8edd8','#b8a185');box(c,x+18,y+40,w-36,26,'#f6e8cd','#b8a185');px(c,x+w/2,y+43,1,20,'#c8b394');for(const xx of [x+7,x+w-12])px(c,xx,y+67,5,6,'#aa825d');box(c,x+27,y+15,25,24,'#e6bf69','#c39c54');box(c,x+58,y+15,26,23,'#8fabc0','#7992aa');for(let i=0;i<6;i++)for(let j=0;j<6;j++)px(c,x+w-54+i*6,y+6+j*8,5,7,(i+j)%2?'#c98d79':'#e9cbb7');}
 function table(c,o){const{x,y,w}=o;for(const dx of [-12,w-14]){box(c,x+dx,y-13,27,32,dx<0?'#879db6':'#cf9f95','#a18a75');box(c,x+dx+1,y+14,25,17,'#d9b78d','#9d7c5c');for(const k of [3,20])px(c,x+dx+k,y+30,3,14,'#977957');}ellipse(c,x+w/2,y+60,22,6,'#9b7a51');px(c,x+w/2-7,y+29,14,29,'#c49a69');ellipse(c,x+w/2,y+26,w/2,21,'#9e754f');ellipse(c,x+w/2,y+21,w/2,21,'#e3bb83');ellipse(c,x+w/2,y+19,w/2-3,18,'#edc790');books(c,x+30,y+23);mug(c,x+74,y+15);px(c,x+55,y-4,4,22,'#91a075');for(const [dx,dy] of [[-5,-5],[3,-9],[8,-3],[-8,1],[0,3]]){ellipse(c,x+56+dx,y-4+dy,5,4,'#f8efcf');px(c,x+55+dx,y-5+dy,3,3,'#e7bd58');}}
 function cabinet(c,o){const{x,y,w,h}=o;box(c,x,y,w,h,P.blue,'#536d8b');wood(c,x-2,y-3,w+4,8);if(o.kind==='cabinet'){px(c,x+4,y+12,w-8,h-16,'#47617a');for(let i=0;i<8;i++)box(c,x+8+i*9,y+17,6,18,['#dba78a','#e9d48a','#99b59e'][i%3],'#526571');}else{for(let i=0;i<2;i++){box(c,x+4+i*(w/2),y+9,w/2-8,h-14,'#7f94ab','#60748b');px(c,x+20+i*w/2,y+20,4,2,'#dbc080');}box(c,x+13,y-28,29,26,'#b97e63','#805e4a');box(c,x+15,y-25,25,13,'#705d51','#665145');px(c,x+24,y-11,5,7,'#dfcfae');mug(c,x+51,y-13);box(c,x+71,y-20,12,18,'#cfb78e','#a08b69');}}
 function stove(c,o){const{x,y}=o;box(c,x+10,y-90,13,90,'#c4b5a4','#8b7e70');box(c,x,y,40,60,'#e1d9c5','#aa9784');box(c,x+6,y+16,27,29,'#786551','#b39374');ellipse(c,x+20,y+37,9,8,'#d99950');ellipse(c,x+21,y+38,5,6,'#f1d071');for(let i=0;i<6;i++)px(c,x+5+i*5,y+5,2,2,'#8e9fa5');}
 function furniture(c,o,part){
  if(bgLoaded)return;
  if(o.kind==='desk'){
   if(o.owner==='emp_ceo'){
    if(part==='front') ceoDeskFront(c,o);
    else ceoDeskBack(c,o);
   }else{
    if(part==='front') deskFront(c,o);
    else desk(c,o);
   }
  }else if(o.kind==='board')board(c,o);else if(o.kind==='sofa')sofa(c,o);else if(o.kind==='shelf')shelf(c,o);else if(o.kind==='table')table(c,o);else if(o.kind==='stove')stove(c,o);else cabinet(c,o);
 }

 const frameCounts={idle:4,move:6,working:6,review_request:4,relaxing:4};
 const speciesList=['bullfrog','treefrog','capybara','lunamoth','octopus'];
 const rosterIds=['emp_ceo','emp_miki','emp_karina','emp_son','emp_yoo'];
 const atlasImages={},portraits={};

 if(typeof Image!=='undefined'){
  for(const s of speciesList){
   const img=new Image();
   img.onload=()=>{
    cache.clear();
    if(typeof window!=='undefined'&&window.OfficeDev&&window.OfficeDev.renderWorld)window.OfficeDev.renderWorld();
   };
   img.src='assets/'+s+'-atlas.png';
   atlasImages[s]=img;
  }
  for(const rid of rosterIds){
   const img=new Image();
   img.onload=()=>{
    if(typeof window!=='undefined'&&window.OfficeDev&&window.OfficeDev.refreshPortraits)window.OfficeDev.refreshPortraits();
   };
   img.src='assets/portraits/'+rid+'.png';
   portraits[rid]=img;
  }
 }

 function portrait(id){
  return portraits[id]||null;
 }

 const cache=new Map();

 function drawSageCeoFallback(q,state,n){
  const cx=32,baseY=34;
  ellipse(q,cx,baseY+10,16,12,'#2a3d24');ellipse(q,cx,baseY+8,14,10,'#7b986c');
  ellipse(q,cx,baseY+6,7,5,'#f6f0df');
  ellipse(q,cx,baseY-3,16,9,'#7b986c');
  for(const ex of [22,42]){ellipse(q,ex,baseY-14,6,6,'#2a3d24');ellipse(q,ex,baseY-15,4,4,'#cfaf4f');px(q,ex,baseY-16,3,3,'#161917');}
  box(q,16,baseY-19,13,10,null,'#111413');box(q,36,baseY-19,13,10,null,'#111413');line(q,28,baseY-15,36,baseY-15,'#111413',2);
  box(q,18,baseY+3,28,7,'#2d58a5','#17305e');box(q,29,baseY+6,9,8,'#2d58a5','#17305e');box(q,25,baseY+5,4,4,'#d4af37','#9c7924');
 }

 function sprite(species,state='idle',frame=0){
  const n=frame%frameCounts[state],key=[species,state,n].join(':');
  if(cache.has(key))return cache.get(key);

  const img=atlasImages[species];
  if(img&&img.complete&&img.naturalWidth>0){
   const c=document.createElement('canvas');c.width=128;c.height=128;
   const q=c.getContext('2d');q.imageSmoothingEnabled=true;q.imageSmoothingQuality='high';

   let frameIdx=0;
   const statesOrder=['idle','move','working','review_request','relaxing'];
   for(const st of statesOrder){
    if(st===state){frameIdx+=n;break;}
    frameIdx+=frameCounts[st];
   }
   const col=frameIdx%6,row=Math.floor(frameIdx/6);
   q.drawImage(img,col*128,row*128,128,128,0,0,128,128);
   cache.set(key,c);
   return c;
  }

  // Fallback while image loads
  const isCeo=species==='bullfrog';
  const c=document.createElement('canvas');c.width=128;c.height=128;
  const q=c.getContext('2d');q.imageSmoothingEnabled=true;q.imageSmoothingQuality='high';
  if(isCeo) {
   q.save();q.scale(2,2);drawSageCeoFallback(q,state,n);q.restore();
  } else {
   ellipse(q,64,68,28,28,'#7a9f60');
  }
  return c;
 }

 function atlas(species){
  const img=atlasImages[species];
  const a=document.createElement('canvas');a.width=128*6;a.height=128*4;
  const c=a.getContext('2d');c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
  if(img&&img.complete&&img.naturalWidth>0)c.drawImage(img,0,0);

  const entries=[];let i=0;
  for(const state of Object.keys(frameCounts)){
   for(let n=0;n<frameCounts[state];n++){
    const x=(i%6)*128,y=Math.floor(i/6)*128;
    if(!img||!img.complete){
     c.drawImage(sprite(species,state,n),x,y,128,128);
    }
    entries.push({
     state,direction:'south',frame:n,
     duration:state==='move'?120:state==='working'?160:200,
     x,y,w:128,h:128,pivot:[64,118],occlusionGroup:'actor'
    });
    i++;
   }
  }
  return {canvas:a,entries};
 }

 return {palette:P,floor,px,ellipse,chair,furniture,sprite,atlas,portrait,frameCounts};
})();
