const assert=require('node:assert/strict');const C=require('./core.js');let checks=0;
for(const person of C.roster)for(const state of Object.keys(C.states)){const start=C.nearest(person.home),target=C.destination(person,state,C.roster.indexOf(person)),path=C.pathfind(start,target);assert.ok(path.length>0,person.id+' '+state+' route missing');for(let i=0;i<path.length;i++){assert.ok(C.walkable(...path[i]),'blocked tile');if(i)assert.equal(Math.abs(path[i][0]-path[i-1][0])+Math.abs(path[i][1]-path[i-1][1]),16,'non-cardinal step');}checks++;}
for(const o of C.furniture){const r=C.rect(o);assert.equal(C.walkable(r.x+r.w/2,r.y+r.h/2),false);checks++;}
const review=C.pathfind(C.nearest(C.roster[4].home),C.destination(C.roster[4],'REVIEW',4));assert.ok(review.length>15);checks++;
assert.deepEqual(C.sortDepth([{depth:300,order:1},{depth:190,order:2}]).map(v=>v.depth),[190,300]);checks++;
assert.throws(()=>C.validateImport({employees:[{}],tasks:[]}));checks++;
const original={employees:[{id:'a',name:'A',approval:{status:'pending'}}],tasks:[{id:'t',unknownField:'preserve'}]};const copy=C.validateImport(original);assert.deepEqual(copy,original);copy.employees[0].name='B';assert.equal(original.employees[0].name,'A');checks++;
console.log(JSON.stringify({checks,failed:0,scope:'paths, solid furniture, depth order, record preservation'}));
