/* Отрисовка: ландшафт, здания, юниты, миникарта */
"use strict";

function makeRenderer(){
  const cv=document.getElementById("game"), ctx=cv.getContext("2d");
  const mm=document.getElementById("minimap"), mmc=mm.getContext("2d");
  const R={ cv, ctx, cam:{x:8,y:30,zoom:1}, selBox:null };

  function resize(){ const r=cv.parentElement.getBoundingClientRect(); cv.width=r.width; cv.height=r.height; }
  window.addEventListener("resize",resize);

  const TCOL=["#5da23c","#2f7a26","#8d8d8d","#3f7fc4","#d8b93c","#9a9aa2","#c9bd7a"];
  const TCOL2=["#4e8f33","#286b20","#7c7c7c","#3570ad","#c2a632","#86868e","#b3a76c"];

  function tileColor(t,x,y){
    const v=((x*7+y*13)%5)*0.02;
    let c=TCOL[t]||"#333";
    return shade(c,v);
  }
  function shade(hex,k){
    const n=parseInt(hex.slice(1),16); let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
    r=Math.min(255,((r*(1+k))|0)); g=Math.min(255,((g*(1+k))|0)); b=Math.min(255,((b*(1+k))|0));
    return `rgb(${r},${g},${b})`;
  }

  function draw(S,placeMode,hover){
    resize._done||(resize(),resize._done=1);
    const {ctx}=R, cam=R.cam;
    const W=cv.width,H=cv.height, z=TILE*cam.zoom;
    ctx.fillStyle="#000"; ctx.fillRect(0,0,W,H);
    const x0=Math.max(0,Math.floor(cam.x-z/W)-1), y0=Math.max(0,Math.floor(cam.y-H/z/2)-2);
    const x1=Math.min(S.map.W-1,Math.ceil(cam.x+W/z)+1), y1=Math.min(S.map.H-1,Math.ceil(cam.y+H/z)+1);
    const ox=W/2-(cam.x*TILE)*cam.zoom, oy=H/2-(cam.y*TILE)*cam.zoom;
    const X=x=>(x*TILE)*cam.zoom+ox, Y=y=>(y*TILE)*cam.zoom+oy;

    // тайлы
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const t=S.map.t[y*S.map.W+x];
      ctx.fillStyle=tileColor(t,x,y);
      ctx.fillRect(X(x),Y(y),z+1,z+1);
      if(t===1){ // деревья
        ctx.fillStyle="#1d5c1a";
        ctx.beginPath(); ctx.arc(X(x)+z/2,Y(y)+z/3,z*0.32,0,7); ctx.fill();
        ctx.fillStyle="#2f8a28";
        ctx.beginPath(); ctx.arc(X(x)+z/2-2,Y(y)+z/3-2,z*0.18,0,7); ctx.fill();
        ctx.fillStyle="#5a3a1a"; ctx.fillRect(X(x)+z/2-1,Y(y)+z/2,z*0.08,z*0.3);
      }
      if(t===2){ ctx.fillStyle="rgba(0,0,0,.25)"; ctx.fillRect(X(x),Y(y)+z*0.6,z,z*0.4);
        ctx.fillStyle="#b9b9c2"; ctx.beginPath(); ctx.moveTo(X(x)+z/2,Y(y)); ctx.lineTo(X(x)+z,Y(y)+z); ctx.lineTo(X(x),Y(y)+z); ctx.fill(); }
      if(t===4){ ctx.fillStyle="#ffdf4d"; ctx.fillRect(X(x)+z*0.3,Y(y)+z*0.3,z*0.4,z*0.4); }
      if(t===5){ ctx.fillStyle="#55555e"; ctx.fillRect(X(x)+z*0.3,Y(y)+z*0.3,z*0.4,z*0.4); ctx.fillStyle="#cfd2dc"; ctx.fillRect(X(x)+z*0.4,Y(y)+z*0.4,z*0.2,z*0.2); }
      if(S.road[y*S.map.W+x]){ ctx.fillStyle="#9c8656"; ctx.fillRect(X(x)+z*0.15,Y(y)+z*0.15,z*0.7,z*0.7);
        ctx.strokeStyle="#6e5a34"; ctx.strokeRect(X(x)+z*0.15,Y(y)+z*0.15,z*0.7,z*0.7); }
    }
    // сетка-призрак стройки
    if(placeMode&&hover){
      const f=bFootprint(placeMode);
      const ok=!canPlace(S,placeMode,hover.x,hover.y);
      ctx.fillStyle=ok?"rgba(80,255,80,.35)":"rgba(255,60,60,.35)";
      ctx.fillRect(X(hover.x),Y(hover.y),f.w*z,f.h*z);
    }
    // здания
    for(const b of S.px.buildings.concat(S.ex.buildings)){
      if(b.dead) continue;
      drawBuilding(ctx,X,Y,z,b);
    }
    // юниты
    for(const u of S.px.units.concat(S.ex.units)){
      if(u.dead||u.garrisoned) continue;
      drawUnit(ctx,X,Y,z,u,S);
    }
    // снаряды
    ctx.fillStyle="#fff";
    for(const p of S.px.proj.concat(S.ex.proj)){ ctx.fillRect(X(p.x)-1,Y(p.y)-1,3,3); }
    // частицы
    ctx.font="12px sans-serif"; ctx.textAlign="center";
    for(const p of S.particles){ ctx.fillStyle="rgba(255,240,200,.95)"; ctx.fillText(p.txt,X(p.x),Y(p.y)); }
    // рамка выделения
    if(R.selBox){ const a=R.selBox; ctx.strokeStyle="#ffe27a"; ctx.setLineDash([5,4]);
      ctx.strokeRect(Math.min(a.x0,a.x1),Math.min(a.y0,a.y1),Math.abs(a.x1-a.x0),Math.abs(a.y1-a.y0)); ctx.setLineDash([]); }
    drawMinimap(S);
  }

  function drawBuilding(ctx,X,Y,z,b){
    const f=bFootprint(b.type), def=BUILDINGS[b.type];
    const x=X(b.tx),y=Y(b.ty),w=f.w*z,h=f.h*z;
    ctx.fillStyle="rgba(0,0,0,.3)"; ctx.fillRect(x+3,y+4,w,h);
    if(!b.done){
      // стройплощадка: забор + каркас
      ctx.strokeStyle="#7a5c2e"; ctx.setLineDash([4,3]); ctx.strokeRect(x,y,w,h); ctx.setLineDash([]);
      ctx.fillStyle="#8a6a33"; ctx.fillRect(x+2,y+2,w-4,(h-4)*(b.prog/4||0.05));
      ctx.fillStyle="#ffe9a8"; ctx.font=(11* R.cam.zoom+8)+"px sans-serif"; ctx.textAlign="center";
      ctx.fillText("🏗️ "+(b.needW+b.needS>0?("🧱"+(b.needW+b.needS)):"🔨"),x+w/2,y+h/2);
      return;
    }
    const base=b.side==="px"?"#c9a86a":"#b06a6a";
    ctx.fillStyle=base; ctx.fillRect(x,y,w,h);
    ctx.fillStyle=b.side==="px"?"#7a5c2e":"#6e2e2e"; ctx.fillRect(x,y,w,h*0.3); // крыша
    ctx.fillStyle="#3a2a16"; ctx.fillRect(x+w*0.4,y+h*0.55,w*0.2,h*0.35); // дверь
    ctx.font=(Math.max(14,z*0.7))+"px serif"; ctx.textAlign="center";
    ctx.fillText(def.icon,x+w/2,y+h*0.42);
    // флаг
    ctx.strokeStyle=b.side==="px"?"#2b6cff":"#ff3b3b"; ctx.beginPath(); ctx.moveTo(x+w/2,y-8); ctx.lineTo(x+w/2,y-20); ctx.stroke();
    ctx.fillStyle=b.side==="px"?"#2b6cff":"#ff3b3b"; ctx.fillRect(x+w/2,y-20,12,7);
    // hp
    if(b.hp<b.maxhp){ ctx.fillStyle="#400"; ctx.fillRect(x,y-5,w,4); ctx.fillStyle="#4f4"; ctx.fillRect(x,y-5,w*(b.hp/b.maxhp),4); }
    if(b.sel){ ctx.strokeStyle="#ffe27a"; ctx.lineWidth=2; ctx.strokeRect(x-2,y-2,w+4,h+4); ctx.lineWidth=1; }
  }

  const UCOL={serf:"#d8b25c",builder:"#e08a3c",recruit:"#9fd0ff",militia:"#b08d4f",axe:"#c9c9c9",bow:"#7fc47f",sword:"#8fa8ff",knight:"#ffd257"};
  const UICON={serf:"🧑",builder:"🔨",recruit:"🎒",militia:"🧑‍🌾",axe:"🪓",bow:"🏹",sword:"🗡️",knight:"🐎"};
  function drawUnit(ctx,X,Y,z,u,S){
    const x=X(u.x),y=Y(u.y), r=Math.max(5,z*0.32);
    ctx.fillStyle="rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(x,y+4,r,r*0.4,0,0,7); ctx.fill();
    ctx.fillStyle=u.side==="px"?(UCOL[u.kind]||"#fff"):"#ff7a7a";
    ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fill();
    ctx.fillStyle="#000"; ctx.font=(r+8)+"px serif"; ctx.textAlign="center";
    ctx.fillText(UICON[u.kind]||"•",x,y+5);
    if(u.carry){ ctx.fillStyle="#fff"; ctx.font="10px serif"; ctx.fillText(u.carry.res==="bread"?"🍞":u.carry.res==="meat"?"🌭":"🍷",x,y-8); }
    // голод
    if(u.hunger<30){ ctx.fillStyle="#f33"; ctx.font="bold 11px serif"; ctx.fillText("🍽",x,y-10); }
    if(u.selected){ ctx.strokeStyle="#ffe27a"; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(x,y,r+3,0,7); ctx.stroke(); ctx.lineWidth=1; }
    if(u.lock>0&&SOLDIERS[u.kind]){ ctx.fillStyle="#ff5"; ctx.font="10px serif"; ctx.fillText("⚔️",x,y-10); }
  }

  function drawMinimap(S){
    const w=mm.width,h=mm.height;
    const sx=w/S.map.W, sy=h/S.map.H;
    for(let y=0;y<S.map.H;y++)for(let x=0;x<S.map.W;x++){
      const t=S.map.t[y*S.map.W+x];
      mmc.fillStyle=t===3?"#2244aa":t===2?"#888":t===1?"#1d5c1a":t===4?"#ffdf4d":t===5?"#555":"#4e8f33";
      mmc.fillRect(x*sx,y*sy,sx+0.5,sy+0.5);
    }
    for(const b of S.px.buildings.concat(S.ex.buildings)){ if(b.dead)continue;
      mmc.fillStyle=b.side==="px"?"#ffd257":"#ff3b3b";
      mmc.fillRect(b.tx*sx-1,b.ty*sy-1,3,3); }
    // камера
    const cam=R.cam, cvv=R.cv;
    const vw=cvv.width/(TILE*cam.zoom), vh=cvv.height/(TILE*cam.zoom);
    mmc.strokeStyle="#fff"; mmc.strokeRect((cam.x-vw/2)*sx,(cam.y-vh/2)*sy,vw*sx,vh*sy);
  }

  return R;
}
