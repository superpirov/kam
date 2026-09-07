/* UI: палитра, ввод, панель информации */
"use strict";
let toastEl, toastTimer;
function showToast(msg){
  toastEl=toastEl||document.getElementById("toast");
  toastEl.textContent=msg; toastEl.style.display="block";
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>toastEl.style.display="none",2600);
}

function makeUI(S,R,hooks){
  const pal=document.getElementById("palette");
  const infoT=document.getElementById("info-title"), infoB=document.getElementById("info-body"), infoA=document.getElementById("info-actions");
  const resbar=document.getElementById("resbar"), popbar=document.getElementById("popbar"), clockEl=document.getElementById("clock");
  const objEl=document.getElementById("objective"), mName=document.getElementById("mission-name");
  let placeMode=null;

  // палитра построек
  pal.innerHTML="";
  const keys=["1","2","3","4","5","6","7","8","9","0"];
  BUILD_ORDER.forEach((bt,i)=>{
    const d=BUILDINGS[bt];
    const cost=Object.entries(d.cost).map(([k,v])=>RES[k].icon+v).join(" ")||"—";
    const b=document.createElement("button"); b.className="bbtn"; b.dataset.bt=bt;
    b.innerHTML=`${d.icon} ${d.name} <small>${cost}</small>`;
    b.title=d.desc+` [${keys[i%keys.length]}]`;
    b.onclick=()=>{ placeMode=placeMode===bt?null:bt; refreshPal(); };
    pal.appendChild(b);
  });
  function refreshPal(){ [...pal.children].forEach(el=>el.classList.toggle("active",el.dataset.bt===placeMode)); }

  // выбор миссии
  const sel=document.getElementById("mission-select");
  sel.innerHTML="";
  MISSIONS.forEach(m=>{ const o=document.createElement("option"); o.value=m.id; o.textContent=m.name; sel.appendChild(o); });
  sel.value=S.mission.id;
  sel.onchange=()=>hooks.restart(+sel.value);

  mName.textContent=S.mission.name;
  objEl.textContent=S.mission.brief;

  const cv=R.cv;
  let drag=null, rmbDrag=null;

  function toWorld(e){ const r=cv.getBoundingClientRect(); const z=TILE*R.cam.zoom;
    return { x:R.cam.x+((e.clientX-r.left)-r.width/2)/z, y:R.cam.y+((e.clientY-r.top)-r.height/2)/z, sx:e.clientX-r.left, sy:e.clientY-r.top }; }

  cv.addEventListener("contextmenu",e=>e.preventDefault());
  cv.addEventListener("mousedown",e=>{
    const w=toWorld(e);
    if(e.button===2){ // приказ
      if(placeMode){ placeMode=null; refreshPal(); return; }
      const tx=Math.floor(w.x), ty=Math.floor(w.y);
      // атака по врагу?
      let foe=null;
      for(const u of S.ex.units){ if(!u.dead&&Math.hypot(u.x-w.x,u.y-w.y)<1){ foe=u; break; } }
      let selU=S.px.units.filter(u=>!u.dead&&u.selected&&SOLDIERS[u.kind]);
      if(!selU.length) selU=S.px.units.filter(u=>!u.dead&&u.selected&&!u.garrisoned);
      for(const u of selU){ if(u.lock>0) continue; orderMove(S,u,tx+0.5,ty+0.5); u.state=foe?"attack":"move"; if(foe) u.atkMove=foe; else u.atkMove=null; }
      if(selU.length) showToast(foe?"⚔️ В атаку!":"🚶 Приказ отдан");
      return;
    }
    if(e.button===0){
      if(placeMode){ // поставить здание или дорогу через UI-флаг
        hooks.place(placeMode,Math.floor(w.x),Math.floor(w.y)); return;
      }
      drag={x0:e.clientX-r().left,y0:e.clientY-r().top,x1:e.clientX-r().left,y1:e.clientY-r().top};
      function r(){ return cv.getBoundingClientRect(); }
      R.selBox=drag;
    }
    if(e.button===1){ rmbDrag={x:e.clientX,y:e.clientY,cx:R.cam.x,cy:R.cam.y}; e.preventDefault(); }
  });
  cv.addEventListener("mousemove",e=>{
    const w=toWorld(e); hooks.hover(Math.floor(w.x),Math.floor(w.y));
    if(drag){ drag.x1=e.clientX-cv.getBoundingClientRect().left; drag.y1=e.clientY-cv.getBoundingClientRect().top; }
    if(rmbDrag){ const z=TILE*R.cam.zoom; R.cam.x=rmbDrag.cx-(e.clientX-rmbDrag.x)/z; R.cam.y=rmbDrag.cy-(e.clientY-rmbDrag.y)/z; clampCam(S,R); }
  });
  window.addEventListener("mouseup",e=>{
    if(drag&&e.button===0){
      const r=cv.getBoundingClientRect(), z=TILE*R.cam.zoom;
      const x0=R.cam.x+((Math.min(drag.x0,drag.x1))-r.width/2)/z, y0=R.cam.y+((Math.min(drag.y0,drag.y1))-r.height/2)/z;
      const x1=R.cam.x+((Math.max(drag.x0,drag.x1))-r.width/2)/z, y1=R.cam.y+((Math.max(drag.y0,drag.y1))-r.height/2)/z;
      const big=Math.abs(drag.x1-drag.x0)>8||Math.abs(drag.y1-drag.y0)>8;
      clearSel(S);
      if(big){
        let n=0;
        for(const u of S.px.units){ if(u.dead||u.garrisoned) continue;
          if(u.x>=x0&&u.x<=x1&&u.y>=y0&&u.y<=y1){ u.selected=true; n++; } }
        // ограничиваем: если есть солдаты — только солдаты
        const sol=S.px.units.some(u=>u.selected&&SOLDIERS[u.kind]);
        if(sol) for(const u of S.px.units) if(u.selected&&!SOLDIERS[u.kind]) u.selected=false;
        showInfo(S);
      } else {
        pickSingle(S,(x0+x1)/2,(y0+y1)/2); showInfo(S);
      }
      drag=null; R.selBox=null;
    }
    if(e.button===1) rmbDrag=null;
  });
  cv.addEventListener("wheel",e=>{ R.cam.zoom=Math.min(2.2,Math.max(0.5,R.cam.zoom*(e.deltaY<0?1.1:0.9))); e.preventDefault(); },{passive:false});

  window.addEventListener("keydown",e=>{
    const k=e.key.toLowerCase();
    if(k==="escape"){ placeMode=null; refreshPal(); clearSel(S); showInfo(S); }
    const idx="1234567890".indexOf(e.key);
    if(idx>=0&&BUILD_ORDER[idx]){ placeMode=placeMode===BUILD_ORDER[idx]?null:BUILD_ORDER[idx]; refreshPal(); if(placeMode) showToast("Строй: "+BUILDINGS[placeMode].name+" — клик по земле, ПКМ/Esc — отмена"); }
    if(k==="f") feedSoldiers(S,true);
    if(k===" "){ const b=S.px.buildings.find(b=>!b.dead); if(b){R.cam.x=b.tx+1;R.cam.y=b.ty+1;} e.preventDefault(); }
  });

  // кнопки
  document.getElementById("btn-feed").onclick=()=>feedSoldiers(S,S.px.units.some(u=>u.selected));
  const spd=document.getElementById("btn-speed");
  spd.onclick=()=>{ S.speed=S.speed>=3?1:S.speed+1; spd.textContent="▶ x"+S.speed; };
  document.getElementById("btn-help").onclick=()=>document.getElementById("help").classList.remove("hidden");
  document.getElementById("btn-close-help").onclick=()=>document.getElementById("help").classList.add("hidden");
  document.getElementById("btn-again").onclick=()=>hooks.restart(S.mission.id);
  document.getElementById("minimap").onclick=e=>{
    const mm=e.target, r=mm.getBoundingClientRect();
    R.cam.x=((e.clientX-r.left)/r.width)*S.map.W; R.cam.y=((e.clientY-r.top)/r.height)*S.map.H; clampCam(S,R);
  };

  function pickSingle(S,wx,wy){
    let best=null,bd=1.2;
    for(const u of S.px.units){ if(u.dead||u.garrisoned) continue; const d=Math.hypot(u.x-wx,u.y-wy); if(d<bd){bd=d;best=u;} }
    if(best){ best.selected=true; return; }
    for(const b of S.px.buildings){ if(b.dead) continue; const f=bFootprint(b.type);
      if(wx>=b.tx&&wx<b.tx+f.w&&wy>=b.ty&&wy<b.ty+f.h){ b.sel=true; S.selB=b; return; } }
    S.selB=null;
  }

  function showInfo(S){
    infoA.innerHTML="";
    const su=S.px.units.filter(u=>u.selected&&!u.dead);
    const b=S.px.buildings.find(b=>b.sel);
    if(b){
      const d=BUILDINGS[b.type];
      infoT.textContent=`${d.icon} ${d.name} (${b.side==="px"?"наше":""})`;
      infoB.innerHTML=`${d.desc}<br>Прочность: ${Math.max(0,b.hp|0)}/${b.maxhp}${b.done?"":"<br>🏗️ Строится… (нужно 🧱"+(b.needW+b.needS)+")"}`;
      if(b.type==="school"&&b.done){
        infoB.innerHTML+=`<br>Очередь: ${(S.schoolQueue||[]).map(q=>({serf:"🧑 серв",builder:"🔨 строитель",recruit:"🎒 рекрут"}[q])).join(", ")||"—"}`;
        [["serf","🧑 Серв (🍞1)"],["builder","🔨 Строитель (🍞1)"],["recruit","🎒 Рекрут (🍞1+🪙1)"]].forEach(([q,label])=>{
          const btn=document.createElement("button"); btn.textContent=label;
          btn.onclick=()=>{ (S.schoolQueue=S.schoolQueue||[]).push(q); showInfo(S); };
          infoA.appendChild(btn);
        });
      }
      if(b.type==="barracks"&&b.done){
        infoB.innerHTML+=`<br>Рекрутов: ${S.px.units.filter(u=>!u.dead&&u.kind==="recruit").length}`;
        for(const sk in SOLDIERS){ const sd=SOLDIERS[sk];
          const cost=Object.entries(sd.cost).map(([k,v])=>RES[k].icon+v).join("");
          const btn=document.createElement("button"); btn.textContent=`${sd.icon} ${sd.name} (${cost})`;
          btn.title=sd.desc;
          btn.onclick=()=>{ const err=recruit(S,"px",b,sk); showToast(err||`${sd.icon} ${sd.name} готов!`); showInfo(S); };
          infoA.appendChild(btn);
        }
      }
      if(b.type==="tower"&&b.done){
        const btn=document.createElement("button"); btn.textContent="🏹 Посадить лучника";
        btn.onclick=()=>{ const a=S.px.units.find(u=>!u.dead&&u.kind==="bow"&&!u.garrisoned);
          if(a){a.garrisoned=b;b.garrison=a;showToast("Лучник в башне");} else showToast("Нужен лучник!"); showInfo(S); };
        infoA.appendChild(btn);
      }
      const dbtn=document.createElement("button"); dbtn.textContent="💥 Снести";
      dbtn.onclick=()=>{ demolish(S,b); S.selB=null; showInfo(S); };
      infoA.appendChild(dbtn);
      return;
    }
    if(su.length){
      const kinds={}; su.forEach(u=>kinds[u.kind]=(kinds[u.kind]||0)+1);
      infoT.textContent=`Выбрано: ${su.length}`;
      infoB.innerHTML=Object.entries(kinds).map(([k,n])=>`${SOLDIERS[k]?.icon||"🧑"} ${SOLDIERS[k]?.name||k} x${n} (голод ${su.filter(u=>u.kind===k).map(u=>u.hunger|0).join(",")})`).join("<br>");
      const fb=document.createElement("button"); fb.textContent="🍖 Накормить (F)";
      fb.onclick=()=>feedSoldiers(S,true); infoA.appendChild(fb);
      if(su.some(u=>SOLDIERS[u.kind])){ const ab=document.createElement("button"); ab.textContent="⚔️ Атака: кликни ПКМ по врагу";
        infoA.appendChild(ab); }
      return;
    }
    infoT.textContent="—";
    infoB.innerHTML="Выдели здание или юнита.<br>ЛКМ — выбрать/поставить<br>ПКМ — приказ отряду<br>R — дорога, F — накормить<br>WASD/стрелки — камера";
  }

  function updateBars(S){
    const r=S.px.res;
    resbar.innerHTML=RES_KEYS.map(k=>`${RES[k].icon}<b>${r[k]|0}</b>`).join(" ");
    const serfs=S.px.units.filter(u=>!u.dead&&!SOLDIERS[u.kind]).length;
    const army=S.px.units.filter(u=>!u.dead&&SOLDIERS[u.kind]).length;
    const hungry=S.px.units.filter(u=>!u.dead&&u.hunger<30).length;
    popbar.innerHTML=`🧑 ${serfs} ⚔️ ${army} ${hungry?("🍽️<b style='color:#f66'>"+hungry+"</b>"):""} 🌊 ${S.waveN} (след. ${Math.max(0,S.waveT|0)}с)`;
    const mm=(S.time/60)|0, ss=(S.time%60)|0;
    clockEl.textContent=`${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
    // отряды
    const sq=document.getElementById("squads");
    const exN=S.ex.units.filter(u=>!u.dead&&SOLDIERS[u.kind]).length;
    sq.textContent=`Враг: солдат ~${exN}, зданий ${S.ex.buildings.filter(b=>!b.dead).length}`;
  }

  return { placeMode:()=>placeMode, setPlaceMode:v=>{placeMode=v;refreshPal();}, showInfo, updateBars, refreshPal };
}

function clearSel(S){ for(const u of S.px.units) u.selected=false; for(const b of S.px.buildings) b.sel=false; S.selB=null; }
function clampCam(S,R){
  R.cam.x=Math.max(0,Math.min(S.map.W,R.cam.x)); R.cam.y=Math.max(0,Math.min(S.map.H,R.cam.y));
}
