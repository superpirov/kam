/* Точка входа: цикл, ввод камеры, строительство */
"use strict";
let S, R, UI, hoverT={x:0,y:0};

function start(missionId){
  S=mkState(MISSIONS[missionId]||MISSIONS[0]);
  R=R||makeRenderer();
  R.cam.x=9; R.cam.y=37; R.cam.zoom=1;
  UI=makeUI(S,R,hooks);
  UI.showInfo(S);
  document.getElementById("gameover").classList.add("hidden");
  showToast(S.mission.brief);
}
const hooks={
  restart(id){ start(id); },
  hover(x,y){ hoverT={x,y}; },
  place(type,tx,ty){
    if(type==="road"){ buildRoad(S,tx,ty); return; }
    // здания кроме склада — через очередь стройки; склад тоже можно
    if(BUILD_ORDER.includes(type)&&BUILDINGS[type]){
      const err=canPlace(S,type,tx,ty);
      if(err){ showToast("Нельзя: "+err); return; }
      const res=S.px.res, cost=BUILDINGS[type].cost;
      if(!tryPay(res,cost)){ showToast("Не хватает ресурсов для "+BUILDINGS[type].name); return; }
      addBuilding(S,"px",type,tx,ty,false);
      UI.showInfo(S);
      return;
    }
    // дорога — кнопки палитры нет, но клавиша 0 = дорога: обработаем через placeMode "road"
    buildRoad(S,tx,ty);
  }
};

window.addEventListener("load",()=>{
  start(0);
  // клавиша R — дорога (0 занята палитрой построек)
  window.addEventListener("keydown",e=>{
    const k=e.key.toLowerCase();
    if(k==="r"||k==="к"){ UI.setPlaceMode(UI.placeMode()==="road"?null:"road"); if(UI.placeMode()==="road") showToast("🛣️ Режим дороги [R]: кликай/тяни по клеткам. ПКМ или R — выйти."); }
  });
  // замостить дорогу протяжкой ЛКМ
  let painting=false;
  const cv=document.getElementById("game");
  cv.addEventListener("mousedown",e=>{ if(e.button===0&&UI.placeMode()==="road") painting=true; });
  window.addEventListener("mouseup",()=>painting=false);
  cv.addEventListener("mousemove",e=>{
    if(painting&&UI.placeMode()==="road"){
      const r=cv.getBoundingClientRect(), z=TILE*R.cam.zoom;
      const wx=R.cam.x+((e.clientX-r.left)-r.width/2)/z, wy=R.cam.y+((e.clientY-r.top)-r.height/2)/z;
      buildRoad(S,Math.floor(wx),Math.floor(wy));
    }
  });

  const keys={};
  window.addEventListener("keydown",e=>keys[e.key.toLowerCase()]=true);
  window.addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);

  let last=performance.now(), acc=0;
  function frame(now){
    requestAnimationFrame(frame);
    let dt=(now-last)/1000; last=now;
    if(dt>0.25)dt=0.25;
    // камера
    const sp=12*dt/R.cam.zoom;
    if(keys["w"]||keys["ц"]||keys["arrowup"])R.cam.y-=sp;
    if(keys["s"]||keys["ы"]||keys["arrowdown"])R.cam.y+=sp;
    if(keys["a"]||keys["ф"]||keys["arrowleft"])R.cam.x-=sp;
    if(keys["d"]||keys["в"]||keys["arrowright"])R.cam.x+=sp;
    clampCam(S,R);
    // симуляция (с учётом скорости)
    if(!S.over){
      const steps=S.speed;
      for(let i=0;i<steps;i++){
        const sdt=dt;
        S.time+=sdt;
        updateProduction(S,sdt);
        updateConstruction(S,sdt);
        updateHunger(S,sdt);
        updateMovement(S,sdt);
        updateCombat(S,sdt);
        updateAI(S,sdt);
        checkEnd(S);
      }
      // частицы
      for(let i=S.particles.length-1;i>=0;i--){ const p=S.particles[i]; p.ttl-=dt; p.y-=dt*0.5; if(p.ttl<=0)S.particles.splice(i,1); }
    } else {
      const go=document.getElementById("gameover");
      if(go.classList.contains("hidden")){
        go.classList.remove("hidden");
        document.getElementById("go-title").textContent=S.over.title;
        document.getElementById("go-text").textContent=S.over.text;
      }
    }
    // чистка мёртвых юнитов (оставляем трупы ненадолго? просто удаляем)
    if(((S.time*2)|0)!==frame._l){ frame._l=(S.time*2)|0;
      for(const side of ["px","ex"]){ const un=sideUnits(S,side); for(let i=un.length-1;i>=0;i--) if(un[i].dead&&(un[i].hp<=0||un[i].hunger<=0)) un.splice(i,1); }
      UI.updateBars(S);
    }
    R.draw(S,UI.placeMode()==="road"?null:UI.placeMode(),hoverT);
  }
  requestAnimationFrame(frame);
});
