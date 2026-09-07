/* Симуляция: карта, пути, экономика, голод, бой, ИИ */
"use strict";

function mulberry(seed){ let a=seed>>>0; return function(){ a|=0;a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

function genMap(seed){
  const W=72,H=72, rnd=mulberry(seed*7919+13);
  const t=new Uint8Array(W*H); // 0 grass,1 forest,2 rock(mount),3 water,4 gold,5 iron,6 sand
  const fert=new Uint8Array(W*H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const i=y*W+x, nx=x/W, ny=y/H;
    const n=Math.sin(x*0.35+seed)*Math.cos(y*0.3-seed)+Math.sin((x+y)*0.12)*0.7+rnd()*0.6;
    if(nx<0.06||ny<0.05||nx>0.97||ny>0.95){ t[i]=3; continue; }
    if(n>1.55){ t[i]=2; continue; }                       // горы
    if(n<-1.25){ t[i]=3; continue; }                      // вода
    if(rnd()<0.10){ t[i]=1; fert[i]=1; continue; }        // лес
    if(rnd()<0.03){ t[i]=6; continue; }
    t[i]=0; fert[i]=rnd()<0.5?1:0;
  }
  // жилы золота/железа у гор
  let placed=0,guard=0;
  while(placed<10&&guard++<800){ const x=2+((rnd()*(W-4))|0),y=2+((rnd()*(H-4))|0),i=y*W+x;
    if(t[i]!==0&&t[i]!==6) continue;
    let nearRock=false; for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){ const xx=x+dx,yy=y+dy; if(xx<0||yy<0||xx>=W||yy>=H)continue; if(t[yy*W+xx]===2){nearRock=true;} }
    if(!nearRock&&rnd()<0.6) continue;
    t[i]=placed%2?5:4; placed++;
  }
  // стартовая поляна игрока (запад) и врага (восток)
  function clearRect(x0,y0,w,h){ for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++){ if(x<1||y<1||x>=W-1||y>=H-1)continue; const i=y*W+x; if(t[i]===3)t[i]=0; if(t[i]===2)t[i]=0; if(t[i]===1&&Math.random()<0.7){t[i]=0;} } }
  clearRect(4,30,16,16); clearRect(W-20,30,16,16);
  // немного леса рядом со стартом игрока
  for(let k=0;k<40;k++){ const x=4+((rnd()*18)|0),y=28+((rnd()*22)|0); const i=y*W+x; if(t[i]===0)t[i]=1; }
  return {W,H,t,fert,seed};
}
function tileAt(m,x,y){ if(x<0||y<0||x>=m.W||y>=m.H) return 3; return m.t[y*m.W+x]; }
function isWalk(m,x,y){ const t=tileAt(m,x,y); return t!==2&&t!==3; }

let UID=1;
function mkState(mission){
  const map=genMap(mission.mapSeed||7);
  const S={
    map, time:0, speed:1, over:null, mission,
    px:{ res:Object.assign({wood:0,plank:0,stone:0,wheat:0,bread:0,wine:0,pig:0,meat:0,gold:0,iron:0,arms:0,armor:0},mission.startRes||{}),
         buildings:[], units:[], proj:[] },
    ex:{ res:{bread:30,wine:5,meat:5,gold:10}, buildings:[], units:[], proj:[] },
    jobs:[], particles:[], waveT:mission.enemy.firstAt, waveN:0,
    stats:{built:0,kills:0},
    road:new Uint8Array(map.W*map.H),
    blocked:new Uint8Array(map.W*map.H),
  };
  // стартовые сервы/строители
  const bx=8,by=36;
  addBuilding(S,"px","store",bx,by,true);
  for(let i=0;i<5;i++) addUnit(S,"px","serf",bx+1+Math.random()*3,by+4+Math.random()*2);
  for(let i=0;i<2;i++) addUnit(S,"px","builder",bx+2+i,by+5);
  addUnit(S,"px","serf",bx+3,by+3);
  (mission.prebuilt||[]).forEach((bt,k)=>{ const dx=(k%4)*4, dy=((k/4)|0)*4; addBuilding(S,"px",bt,bx-1+dx,by-8+dy,true); });
  // вражеская база
  const ex=map.W-12,ey=36;
  addBuilding(S,"ex","store",ex,ey,true);
  addBuilding(S,"ex","barracks",ex-3,ey-3,true);
  addBuilding(S,"ex","school",ex+1,ey-4,true);
  addBuilding(S,"ex","inn",ex+1,ey+4,true);
  for(let i=0;i<mission.enemy.towers;i++) addBuilding(S,"ex","tower",ex-5+i*3,ey+5-(i%2)*8,true);
  for(let s=0;s<mission.enemy.squads;s++) for(let i=0;i<5;i++) addUnit(S,"ex",s%2?"axe":"bow",ex-2+(Math.random()*4-2),ey+(Math.random()*4-2));
  for(let i=0;i<6;i++) addUnit(S,"ex","serf",ex+1,ey+3+(i%3));
  return S;
}

function sideRes(S,side){ return side==="px"?S.px.res:S.ex.res; }
function sideUnits(S,side){ return side==="px"?S.px.units:S.ex.units; }
function sideBlds(S,side){ return side==="px"?S.px.buildings:S.ex.buildings; }

function bFootprint(type){ const s=BUILDINGS[type].size; return {w:s,h:s}; }
function buildingAt(S,tx,ty){ for(const b of S.px.buildings.concat(S.ex.buildings)) if(!b.dead){ const f=bFootprint(b.type); if(tx>=b.tx&&ty>=b.ty&&tx<b.tx+f.w&&ty<b.ty+f.h) return b; } return null; }
function canPlace(S,type,tx,ty){
  const f=bFootprint(type);
  if(tx<1||ty<1||tx+f.w>S.map.W-1||ty+f.h>S.map.H-1) return "Край карты";
  for(let y=ty;y<ty+f.h;y++)for(let x=tx;x<tx+f.w;x++){ if(!isWalk(S.map,x,y)) return "Непроходимо"; if(buildingAt(S,x,y)) return "Занято"; }
  const def=BUILDINGS[type];
  if(type==="goldmine"){ let ok=false; for(let y=ty-2;y<ty+f.h+2;y++)for(let x=tx-2;x<tx+f.w+2;x++) if(tileAt(S.map,x,y)===4) ok=true; if(!ok) return "Нужны золотые жилы рядом"; }
  if(type==="ironmine"){ let ok=false; for(let y=ty-2;y<ty+f.h+2;y++)for(let x=tx-2;x<tx+f.w+2;x++) if(tileAt(S.map,x,y)===5) ok=true; if(!ok) return "Нужны железные жилы рядом"; }
  return null;
}
function addBuilding(S,side,type,tx,ty,instant){
  const def=BUILDINGS[type];
  const b={ id:UID++, side, type, tx, ty, hp:def.hp, maxhp:def.hp,
    done:!!instant, prog:0, needW: (def.cost.plank||0)+(def.cost.wood||0), needS:(def.cost.stone||0),
    stock:{}, cool:0, garrison:null, dead:false };
  sideBlds(S,side).push(b); refreshBlocked(S); return b;
}
function refreshBlocked(S){
  S.blocked.fill(0);
  for(const b of S.px.buildings.concat(S.ex.buildings)){ if(b.dead||!b.done) continue; if(b.type==="tower"){/*башня проходима? нет*/} const f=bFootprint(b.type);
    for(let y=b.ty;y<b.ty+f.h;y++)for(let x=b.tx;x<b.tx+f.w;x++) S.blocked[y*S.map.W+x]=1; }
}
function demolish(S,b){ b.dead=true; refreshBlocked(S); }

function addUnit(S,side,kind,x,y){
  const base=SOLDIERS[kind];
  const u={ id:UID++, side, kind, x, y, tx:x, ty:y, path:null, pi:0,
    hp: base?base.hp:(kind==="builder"?60:45), maxhp: base?base.hp:(kind==="builder"?60:45),
    hunger:80+Math.random()*20, state:"idle", carry:null, cool:0, squad:0, lock:0, home:null, garrisoned:null };
  sideUnits(S,side).push(u); return u;
}

/* --- пути: BFS --- */
function findPath(S,sx,sy,tx,ty){
  const W=S.map.W,H=S.map.H;
  sx|=0;sy|=0;tx|=0;ty|=0;
  if(sx===tx&&sy===ty) return [];
  if(!isWalk(S.map,tx,ty)) return null;
  const prev=new Int32Array(W*H).fill(-1);
  const q=[sy*W+sx]; prev[sy*W+sx]=sy*W+sx;
  const dirs=[1,0,-1,0,0,1,0,-1,1,1,1,-1,-1,1,-1,-1];
  let head=0;
  while(head<q.length){
    const cur=q[head++]; const cx=cur%W, cy=(cur/W)|0;
    if(cx===tx&&cy===ty) break;
    for(let d=0;d<8;d++){ const nx=cx+dirs[d*2],ny=cy+dirs[d*2+1];
      if(nx<0||ny<0||nx>=W||ny>=H) continue; const ni=ny*W+nx;
      if(prev[ni]!==-1) continue; if(!isWalk(S.map,nx,ny)) continue;
      // здания блокируют, кроме цели
      if(S.blocked[ni]&&!(nx===tx&&ny===ty)) continue;
      prev[ni]=cur; q.push(ni);
      if(q.length>W*H) break;
    }
    if(q.length>6000) break;
  }
  const end=ty*W+tx; if(prev[end]===-1) return null;
  const path=[]; let cur=end;
  while(cur!==sy*W+sx){ path.push({x:cur%W,y:(cur/W)|0}); cur=prev[cur]; if(cur<0)break; }
  path.reverse(); return path.slice(0,60);
}
function orderMove(S,u,tx,ty){ if(u.lock>0||u.garrisoned) return; u.tx=tx;u.ty=ty; u.path=findPath(S,u.x,u.y,tx,ty); u.pi=0; if(u.path) u.state="move"; }

function nearestFreeTile(S,x,y){
  x|=0;y|=0;
  if(isWalk(S.map,x,y)&&!S.blocked[y*S.map.W+x]) return {x,y};
  for(let r=1;r<6;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){ const nx=x+dx,ny=y+dy;
    if(nx<0||ny<0||nx>=S.map.W||ny>=S.map.H)continue;
    if(isWalk(S.map,nx,ny)&&!S.blocked[ny*S.map.W+nx]) return {x:nx,ny:ny,y:ny}; }
  return {x,y};
}
function bDoor(S,b){ const f=bFootprint(b.type); return nearestFreeTile(S,b.tx+f.w,b.ty+((f.h/2)|0)); }

/* --- экономика --- */
function countUnits(S,side,kind){ let n=0; for(const u of sideUnits(S,side)) if(!u.dead&&u.kind===kind) n++; return n; }
function tryPay(res,cost){ for(const k in cost) if((res[k]||0)<cost[k]) return false; for(const k in cost) res[k]-=cost[k]; return true; }

function updateProduction(S,dt){
  for(const side of ["px","ex"]){
    const res=sideRes(S,side);
    for(const b of sideBlds(S,side)){
      if(b.dead||!b.done) continue;
      const def=BUILDINGS[b.type];
      // башня: стрельба
      if(b.type==="tower"){ b.cool-=dt; if(b.cool<=0){ const tgt=towerTarget(S,b); if(tgt){ fireArrow(S,side,b,tgt); b.cool=2.2; } else b.cool=0.3; } continue; }
      // школа: плодит население
      if(b.type==="school"){ b.cool-=dt;
        if(b.cool<=0){ schoolTick(S,side,res); b.cool = side==="px"?14:30; } continue; }
      if(!def.prod) continue;
      // проверка руды рядом для шахт
      b.cool-=dt;
      if(b.cool>0) continue;
      const p=def.prod;
      if(p.in && !tryPayPeak(res,p.in)){ b.cool=2; continue; }
      // лесорубу нужен лес, каменоломне — скалы
      if(b.type==="woodhut"&&!nearTile(S,b,1,3)){ b.cool=4; continue; }
      if(b.type==="quarry"&&!nearTile(S,b,2,4)){ b.cool=4; continue; }
      if(p.in) tryPay(res,p.in);
      const outK=Object.keys(p.out)[0], outN=p.out[outK];
      // груз появляется у двери — серв должен отнести на склад (визуально + в res сразу с задержкой доставки? кладём сразу, серв — анимация)
      res[outK]=(res[outK]||0)+outN;
      const d=bDoor(S,b);
      S.jobs.push({kind:"haul",side,res:outK,n:outN,x:d.x,y:d.y,t:0});
      S.particles.push({x:d.x,y:d.y,txt:"+"+outN+RES[outK].icon,ttl:1.6});
      b.cool=p.time*(0.9+Math.random()*0.2);
      if(side==="px") ensureSerfFetch(S,b);
    }
  }
}
function tryPayPeak(res,cost){ for(const k in cost) if((res[k]||0)<cost[k]) return false; return true; }
function nearTile(S,b,tile,r){
  const f=bFootprint(b.type);
  for(let y=b.ty-r;y<b.ty+f.h+r;y++)for(let x=b.tx-r;x<b.tx+f.w+r;x++) if(tileAt(S.map,x,y)===tile) return true;
  return false;
}
function schoolTick(S,side,res){
  // ИИ: просто плодит сервов и солдат-заготовки
  const nSerf=countUnits(S,side,"serf"), nB=countUnits(S,side,"builder");
  if(side==="ex"){
    if(nSerf<8){ addUnit(S,side,"serf",bDoor(S,sideBlds(S,side)[0]).x,bDoor(S,sideBlds(S,side)[0]).y); }
    else { const r=Math.random(); const d=bDoor(S,sideBlds(S,side)[0]);
      addUnit(S,side,r<0.4?"bow":r<0.7?"axe":"sword",d.x,d.y); }
    res.bread=(res.bread||0)+4; return;
  }
  // игрок: авто-режим школы через очередь (см. UI schoolQueue)
  const q=S.schoolQueue||[];
  if(!q.length){ if(nSerf<4&&(res.bread||0)>=1){ res.bread--; addUnit(S,side,"serf",bDoor(S,sideBlds(S,side)[0]).x,bDoor(S,sideBlds(S,side)[0]).y); toast("Школа: новый серв"); } return; }
  const want=q[0];
  if(want==="serf"&&(res.bread||0)>=1){ res.bread--; q.shift(); const d=bDoor(S,sideBlds(S,side)[0]); addUnit(S,side,"serf",d.x,d.y); toast("Школа: новый серв"); }
  else if(want==="builder"&&(res.bread||0)>=1){ res.bread--; q.shift(); const d=bDoor(S,sideBlds(S,side)[0]); addUnit(S,side,"builder",d.x,d.y); toast("Школа: новый строитель"); }
  else if(want==="recruit"&&(res.bread||0)>=1&&(res.gold||0)>=1){ res.bread--;res.gold--; q.shift(); const d=bDoor(S,sideBlds(S,side)[0]); addUnit(S,side,"recruit",d.x,d.y); toast("Школа: новый рекрут"); }
}
function ensureSerfFetch(S,b){
  // находим свободного серва чтобы он сбегал к зданию (атмосфера KaM)
  const serfs=S.px.units.filter(u=>!u.dead&&u.kind==="serf"&&u.state==="idle");
  if(!serfs.length) return;
  const u=serfs[(Math.random()*serfs.length)|0];
  const d=bDoor(S,b);
  orderMove(S,u,d.x+(Math.random()*2-1),d.y+(Math.random()*2-1));
  u.state="fetch"; u.home=b; u.cool=2+Math.random()*2;
}

/* --- стройка --- */
function updateConstruction(S,dt){
  for(const side of ["px","ex"]){
    for(const b of sideBlds(S,side)){
      if(b.dead||b.done) continue;
      // нужно поднести материалы: списываем со склада постепенно
      const res=sideRes(S,side);
      if(b.needW>0&&(res.plank>0||res.wood>0)){ if(res.plank>0){res.plank--;b.needW--;} else {res.wood--;b.needW--;} }
      else if(b.needW<=0&&b.needS>0&&res.stone>0){ res.stone--; b.needS--; }
      const totalNeed=b.needW+b.needS;
      // строитель рядом ускоряет
      let boost=0.15*dt;
      for(const u of sideUnits(S,side)){ if(u.dead||u.kind!=="builder") continue;
        const dx=u.x-(b.tx+1),dy=u.y-(b.ty+1); if(dx*dx+dy*dy<36){ boost+=0.5*dt; u.state="build"; u.home=b; break; } }
      // отправляем свободного строителя
      if(boost<=0.2*dt){ const free=sideUnits(S,side).find(u=>!u.dead&&u.kind==="builder"&&u.state==="idle");
        if(free){ const d=bDoor(S,b); orderMove(S,free,d.x,d.y); free.state="move"; free.home=b; } }
      b.prog+=boost;
      if(totalNeed<=0&&b.prog>=4){ b.done=true; b.prog=4; S.particles.push({x:b.tx+1,y:b.ty+1,txt:BUILDINGS[b.type].icon+" готово!",ttl:2.5}); if(side==="px"){S.stats.built++; toast(BUILDINGS[b.type].name+": построено");} refreshBlocked(S); }
    }
  }
}

/* --- голод --- */
function updateHunger(S,dt){
  for(const side of ["px","ex"]){
    const res=sideRes(S,side);
    const inns=sideBlds(S,side).filter(b=>!b.dead&&b.done&&b.type==="inn");
    for(const u of sideUnits(S,side)){
      if(u.dead||u.garrisoned) continue;
      u.hunger-=dt*(u.kind==="serf"||u.kind==="builder"?0.22:0.15);
      if(u.hunger<30&&u.state!=="eat"&&u.state!=="feedwait"){
        if(u.kind==="serf"||u.kind==="builder"||u.kind==="recruit"){
          if(inns.length&&(res.bread>0||res.wine>0||res.meat>0)){ const d=bDoor(S,inns[0]); orderMove(S,u,d.x,d.y); u.state="eat"; }
        }
      }
      if(u.hunger<=0){ u.dead=true; S.particles.push({x:u.x,y:u.y,txt:"💀 голод",ttl:2}); }
      if(u.state==="eat"){
        if(Math.abs(u.x-u.tx)<0.6&&Math.abs(u.y-u.ty)<0.6){
          const food=res.bread>0?"bread":res.meat>0?"meat":res.wine>0?"wine":null;
          if(food){ res[food]--; u.hunger=100; u.state="idle"; }
          else { u.state="idle"; }
        }
      }
    }
  }
}
/* накормить солдат: серв несёт еду */
function feedSoldiers(S,onlySelected){
  const res=S.px.res;
  const targets=S.px.units.filter(u=>!u.dead&&SOLDIERS[u.kind]&&(u.hunger<70)&&(!onlySelected||u.selected));
  if(!targets.length){ toast("Сытые или никто не выбран"); return; }
  if(!((res.bread||0)+(res.meat||0)+(res.wine||0))){ toast("Нет еды на складе!"); return; }
  const serfs=S.px.units.filter(u=>!u.dead&&u.kind==="serf"&&u.state==="idle");
  if(!serfs.length){ toast("Нет свободных сервов"); return; }
  const u=serfs[0], t=targets[0];
  const food=res.bread>0?"bread":res.meat>0?"meat":"wine";
  res[food]--; u.carry={res:food,n:1}; orderMove(S,u,t.x,t.y); u.state="deliver"; u.home=t;
  toast("Серв несёт еду ("+RES[food].icon+")");
}

/* --- движение --- */
function updateMovement(S,dt){
  for(const side of ["px","ex"]) for(const u of sideUnits(S,side)){
    if(u.dead) continue;
    if(u.lock>0){ u.lock-=dt; }
    if(u.garrisoned) continue;
    if(u.state==="deliver"&&u.home&&!u.home.dead){
      if(Math.abs(u.x-u.home.x)<0.7&&Math.abs(u.y-u.home.y)<0.7){ u.home.hunger=100; u.carry=null; u.state="idle"; }
    }
    if(u.state==="fetch"){ u.cool-=dt; if(u.cool<=0) u.state="idle"; }
    if(!u.path||u.pi>=u.path.length) { if(u.state==="move")u.state="idle"; continue; }
    const wp=u.path[u.pi];
    const dx=wp.x+0.5-u.x, dy=wp.y+0.5-u.y, d=Math.hypot(dx,dy);
    const sp=(SOLDIERS[u.kind]?SOLDIERS[u.kind].speed:2.2)*(S.road[(wp.y*S.map.W+wp.x)]?1.5:1);
    if(d<0.15){ u.pi++; continue; }
    u.x+=dx/d*Math.min(sp*dt,d); u.y+=dy/d*Math.min(sp*dt,d);
    u.dir=Math.atan2(dy,dx);
  }
}

/* --- бой --- */
function enemiesOf(S,side){ return side==="px"?"ex":"px"; }
function combatTarget(S,u){
  const es=enemiesOf(S,u.side);
  let best=null,bd=1e9;
  for(const e of sideUnits(S,es)){ if(e.dead||e.garrisoned) continue; const d=(e.x-u.x)**2+(e.y-u.y)**2; if(d<bd){bd=d;best=e;} }
  for(const b of sideBlds(S,es)){ if(b.dead) continue; const cx=b.tx+1,cy=b.ty+1; const d=(cx-u.x)**2+(cy-u.y)**2; if(d<bd){bd=d;best=b;} }
  return {t:best,d:Math.sqrt(bd)};
}
function towerTarget(S,b){
  const es=enemiesOf(S,b.side);
  let best=null,bd=64;
  for(const e of sideUnits(S,es)){ if(e.dead||e.garrisoned) continue; const d=(e.x-(b.tx+0.5))**2+(e.y-(b.ty+0.5))**2; if(d<bd){bd=d;best=e;} }
  return best;
}
function fireArrow(S,side,b,tgt){
  const arr={x:b.tx+0.5,y:b.ty-0.5,tx:tgt.x,ty:tgt.y,tgt,side,dmg:12,ttl:1.2};
  (side==="px"?S.px:S.ex).proj.push(arr);
}
function updateCombat(S,dt){
  for(const side of ["px","ex"]){
    for(const u of sideUnits(S,side)){
      if(u.dead||u.garrisoned) continue;
      const def=SOLDIERS[u.kind]; if(!def) continue;
      u.cool-=dt;
      // приказ атаки/движения имеет приоритет, но ввязавшийся в бой теряет контроль (lock)
      const {t,d}=combatTarget(S,u);
      const atkOrder=u.atkMove;
      let foe=null;
      if(atkOrder&&!atkOrder.dead){ const dd=Math.hypot(atkOrder.x-u.x,atkOrder.y-u.y); if(dd<def.range+1) foe=atkOrder; }
      if(!foe&&t&&d<def.range) foe=t;
      if(!foe&&u.state==="attack"&&t&&d<12) {
        // подойти к цели (перестраиваем путь только когда дошли или его нет — иначе BFS каждый кадр)
        if(u.lock<=0&&(!u.path||u.pi>=u.path.length)){ orderMove(S,u,(t.x??t.tx)+0.5,(t.y??t.ty)+0.5); }
        foe=null;
      }
      if(foe&&u.cool<=0){
        if(def.ranged){ (side==="px"?S.px:S.ex).proj.push({x:u.x,y:u.y-0.3,tx:foe.x??foe.tx,ty:foe.y??foe.ty,tgt:foe,side,dmg:def.atk,ttl:1}); }
        else { damage(S,foe,def.atk*(0.85+Math.random()*0.3),u); u.lock=Math.max(u.lock,0.4); if(foe.hp!==undefined&&!foe.type){ foe.lock=Math.max(foe.lock||0,3); /* потеря контроля в бою как в KaM */ } }
        u.cool=def.ranged?1.6:1.1;
      }
    }
    // снаряды
    for(const p of (side==="px"?S.px:S.ex).proj){
      p.ttl-=dt;
      if(p.tgt&&!p.tgt.dead){ p.tx=p.tgt.x??p.tgt.tx; p.ty=p.tgt.y??p.tgt.ty; }
      const dx=p.tx-p.x,dy=p.ty-p.y,d=Math.hypot(dx,dy);
      if(d<0.3||p.ttl<=0){ if(p.tgt&&!p.tgt.dead) damage(S,p.tgt,p.dmg,null); p.dead=true; }
      else { p.x+=dx/d*10*dt; p.y+=dy/d*10*dt; }
    }
    const arr=(side==="px"?S.px:S.ex).proj;
    for(let i=arr.length-1;i>=0;i--) if(arr[i].dead) arr.splice(i,1);
  }
  // чистка
  for(const side of ["px","ex"]){
    const un=sideUnits(S,side);
    for(let i=un.length-1;i>=0;i--) if(un[i].dead&&un[i].hp<=0){}
    // удаляем мёртвых с hp<=0? оставляем флаг dead, чистим визуально позже
  }
  // урон зданиям ИИ/игрока проверяется в damage
}
function damage(S,t,n,from){
  if(t.type){ t.hp-=n; if(t.hp<=0){ t.dead=true; refreshBlocked(S); S.particles.push({x:t.tx+1,y:t.ty+1,txt:"🔥",ttl:2}); if(t.side==="px") toast("Потеряно: "+BUILDINGS[t.type].name+"!"); else { S.stats.kills++; if(t.side==="ex") toast("Враг потерял "+BUILDINGS[t.type].name+"!"); } } }
  else { t.hp-=n; if(t.hp<=0){ t.dead=true; if(from&&from.side==="px") S.stats.kills++; S.particles.push({x:t.x,y:t.y,txt:"☠️",ttl:1.5}); } }
}

/* наём в казарме */
function recruit(S,side,b,type){
  const def=SOLDIERS[type], res=sideRes(S,side);
  if(type!=="militia"&&!tryPayPeak(res,{...def.cost,recruit:0})) return "Нет ресурсов";
  // нужен рекрут (кроме ополчения)
  if(type!=="militia"){
    const r=sideUnits(S,side).find(u=>!u.dead&&u.kind==="recruit");
    if(!r) return "Нужен рекрут из школы!";
    if(!tryPay(res,def.cost)) return "Нет ресурсов";
    r.dead=true; r.hp=0;
  } else { if(!tryPay(res,def.cost)) return "Нет хлеба"; }
  const d=bDoor(S,b);
  const u=addUnit(S,side,type,d.x,d.y);
  u.hunger=100;
  return null;
}

/* --- дороги --- */
function buildRoad(S,tx,ty){
  if(tx<0||ty<0||tx>=S.map.W||ty>=S.map.H) return;
  if(!isWalk(S.map,tx,ty)||buildingAt(S,tx,ty)) return;
  S.road[ty*S.map.W+tx]=1;
}

/* --- ИИ волн --- */
function updateAI(S,dt){
  if(S.over) return;
  const cfg=S.mission.enemy;
  S.waveT-=dt;
  if(S.waveT<=0){
    S.waveT=cfg.interval; S.waveN++;
    const n=4+S.waveN;
    const kinds=["axe","bow","sword","militia"];
    for(let i=0;i<n;i++){ const eb=S.ex.buildings[0]; const u=addUnit(S,"ex",kinds[(Math.random()*kinds.length)|0],eb.tx-2+Math.random()*2,eb.ty+4+Math.random()*2); u.hunger=100; }
    // приказ на базу игрока
    const pb=S.px.buildings.find(b=>!b.dead);
    if(pb){ for(const u of S.ex.units){ if(!u.dead&&u.state==="idle"&&SOLDIERS[u.kind]){ orderMove(S,u,pb.tx+1+(Math.random()*4-2),pb.ty+1+(Math.random()*4-2)); u.state="attack"; } } }
    toast("⚠️ Волна "+S.waveN+": враг атакует!");
  }
  // гарнизон башен ИИ: по лучнику
  for(const b of S.ex.buildings){ if(b.dead||!b.done||b.type!=="tower"||b.garrison) continue;
    const a=S.ex.units.find(u=>!u.dead&&u.kind==="bow"&&!u.garrisoned); if(a){ a.garrisoned=b; b.garrison=a; } }
  // простые приказы солдатам ИИ держаться/атаковать
  for(const u of S.ex.units){ if(u.dead||!SOLDIERS[u.kind]||u.garrisoned) continue;
    if(u.state==="idle"&&Math.random()<0.002){ const pb=S.px.buildings.find(b=>!b.dead); if(pb) { orderMove(S,u,pb.tx+1,pb.ty+1); u.state="attack"; } } }
}

/* --- победа/поражение --- */
function checkEnd(S){
  const pxStore=S.px.buildings.some(b=>!b.dead&&b.type==="store");
  const pxAlive=S.px.units.some(u=>!u.dead);
  if(!pxStore&&!S.over){ S.over={win:false,title:"Поражение",text:"Все склады потеряны. Поселение пало."}; }
  const exMil=S.ex.buildings.some(b=>!b.dead&&(b.type==="barracks"||b.type==="store"||b.type==="school"));
  const exSold=S.ex.units.some(u=>!u.dead&&SOLDIERS[u.kind]);
  if(!exMil&&!exSold&&!S.over){ S.over={win:true,title:"Победа!",text:"Враг разбит. Убито: "+S.stats.kills+". Построено: "+S.stats.built+"."} }
}

function toast(msg){ if(typeof showToast==="function") showToast(msg); }
