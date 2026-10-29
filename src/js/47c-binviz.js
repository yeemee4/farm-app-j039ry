/* ===== 사료 빈 그림 + 게이지 기록 (사료 화면 위 · 빈을 누르면 큰 빈 + 세로 게이지) =====
   빈 모양: 둥근 지붕 · 원통 · 깔때기. 높이가 아니라 부피로 kg 계산(깔때기는 같은 높이라도 양이 적음).
   손잡이 모양: localStorage farm-binknob = round(1번 동그라미) | square(2번 높이선에 붙은 네모) */
const BV={top:40,cyl:100,cone:65,x0:12,x1:108,cx:60};   // svg 좌표 (가로 120)
const BV_H=BV.cyl+BV.cone,BV_B=BV.top+BV_H;           // 바닥(깔때기 끝) y=205
function binFrac(L){const h=L*BV_H,vc=BV.cone/3,vt=vc+BV.cyl;return h<=BV.cone?vc*Math.pow(h/BV.cone,3)/vt:(vc+h-BV.cone)/vt}
function binLevel(f){const vc=BV.cone/3,vt=vc+BV.cyl,v=Math.max(0,Math.min(1,f))*vt;return (v<=vc?BV.cone*Math.cbrt(v/vc):BV.cone+v-vc)/BV_H}
const binKnob=()=>{try{return localStorage.getItem("farm-binknob")||"square"}catch(e){return "square"}};
function binCol(days){return days===null||days===undefined?"#8a949e":days<=2?"#e5484d":days<=FARM.feed.orderDays?"#e8a317":"#2fb36d"}
function binSvg(id,L,col,big){const y=BV_B-L*BV_H,o=`M${BV.x0},${BV.top} Q${BV.cx},${BV.top-38} ${BV.x1},${BV.top} L${BV.x1},${BV.top+BV.cyl} L${BV.cx+5},${BV_B} L${BV.cx-5},${BV_B} L${BV.x0},${BV.top+BV.cyl} Z`;
  let g=`<defs><clipPath id="bc${id}"><path d="${o}"/></clipPath><pattern id="bh${id}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><rect width="7" height="7" fill="${col}"/><line x1="0" y1="0" x2="0" y2="7" stroke="rgba(255,255,255,.35)" stroke-width="2.5"/></pattern></defs>`;
  g+=`<path d="${o}" fill="var(--bg)"/><rect class="bv-fill" clip-path="url(#bc${id})" x="0" y="${y}" width="120" height="${BV_B-y+2}" fill="url(#bh${id})"/>`;
  g+=`<path d="${o}" fill="none" stroke="var(--ink)" stroke-width="${big?2.2:2.6}" stroke-linejoin="round"/><line x1="${BV.x0}" x2="${BV.x1}" y1="${BV.top}" y2="${BV.top}" stroke="var(--ink)" stroke-width="1.4" opacity=".5"/><line x1="${BV.x0}" x2="${BV.x1}" y1="${BV.top+BV.cyl}" y2="${BV.top+BV.cyl}" stroke="var(--ink)" stroke-width="1.4" opacity=".5"/>`;
  if(big)[.25,.5,.75].forEach(f=>{const yy=BV_B-binLevel(f)*BV_H;g+=`<line x1="${BV.x1-10}" x2="${BV.x1}" y1="${yy}" y2="${yy}" stroke="var(--muted)" stroke-width="1"/><text x="${BV.x1-12}" y="${yy+3}" text-anchor="end" class="bv-t">${f*100}%</text>`});
  return g}
function vFeedBins(){const T=feedTable();
  return `<div class="sec-t">${t("사료 빈")} <span>${t("빈을 누르면 게이지로 잔량 기록")}</span></div><div class="bins">${FARM.feed.bins.map((b,i)=>{const x=T.find(r=>r.f===b.feed)||{},f=x.kg==null?0:Math.min(1,x.kg/b.cap);
    return `<button type="button" class="bin" data-a="binOpen" data-v="${i}"><svg viewBox="0 -2 120 210" aria-hidden="true">${binSvg("m"+i,binLevel(f),binCol(x.days))}</svg><b>${esc(b.name)}</b><small>${esc(b.feed)}</small><span>${x.kg==null?t("기록 필요"):`${(x.kg/1000).toFixed(1)}t <small>${Math.round(f*100)}%</small>`}</span><em style="color:${binCol(x.days)}">${x.days==null?"—":x.days+t("일분")}</em></button>`}).join("")}</div>`}
function openBin(i){const b=FARM.feed.bins[i],x=feedTable().find(r=>r.f===b.feed)||{},f0=x.kg==null?.5:Math.min(1,x.kg/b.cap),k=binKnob();ui.bin={i,L:binLevel(f0)};
  const col="#2fb36d";
  $("#sheetRoot").innerHTML=`<div class="scrim" data-a="scrim"><div class="sheet binsheet" role="dialog" aria-modal="true" aria-label="${esc(b.name)}"><div class="sh-hd"><h2>${esc(b.name)} · ${esc(b.feed)} <small class="sow-meta">${(b.cap/1000).toFixed(0)}t</small></h2><button class="x" type="button" data-a="closeSheet">${t("닫기")}</button></div><div class="sh-bd">
  <div class="note">${t("손잡이를 위아래로 끌어 지금 남은 높이에 맞추세요.")}${x.kg!=null?` ${t("추정")} ${x.kg.toLocaleString()}kg`:""}</div>
  <div class="bv-wrap"><svg id="bvSvg" viewBox="${k==="round"?"-46":"0"} -4 ${k==="round"?212:190} 216" class="bv-big">${binSvg("B",ui.bin.L,col,1)}
    <line id="bvLine" x1="${k==="round"?-30:BV.x0-4}" x2="${k==="round"?BV.x1+4:156}" y1="0" y2="0" stroke="var(--accent)" stroke-width="1.6" stroke-dasharray="${k==="round"?"4 3":"0"}"/>
    <rect x="${k==="round"?-36:146}" y="${BV.top}" width="12" height="${BV_H}" rx="6" fill="var(--grid)" stroke="var(--line)"/>
    <g id="bvKnob">${k==="round"?`<circle cx="-30" cy="0" r="13" fill="var(--surface)" stroke="var(--accent)" stroke-width="3"/>`:`<rect x="140" y="-11" width="24" height="22" rx="4" fill="var(--surface)" stroke="var(--accent)" stroke-width="3"/>`}</g>
    <rect id="bvHit" x="${k==="round"?-46:130}" y="${BV.top-12}" width="${k==="round"?40:60}" height="${BV_H+24}" fill="transparent" style="cursor:ns-resize;touch-action:none"/></svg>
  <div class="bv-read"><b id="bvKg"></b><span id="bvPct"></span><div class="bv-step"><button type="button" class="sbtn" data-a="binStep" data-v="-0.02">▼</button><button type="button" class="sbtn" data-a="binStep" data-v="0.02">▲</button></div><div class="chipwrap">${[["비었음",0],["¼",.25],["½",.5],["¾",.75],["가득",1]].map(([l,f])=>`<button type="button" class="chip" data-a="binSet" data-v="${f}">${t(l)}</button>`).join("")}</div></div></div>
  <button class="save" type="button" data-a="binSave">${t("잔량 저장")}</button></div></div></div>`;
  binDraw();const hit=$("#bvHit"),svg=$("#bvSvg");let drag=false;
  const mv=e=>{if(!drag)return;const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(svg.getScreenCTM().inverse());ui.bin.L=Math.max(0,Math.min(1,(BV_B-q.y)/BV_H));binDraw();e.preventDefault()};
  hit.addEventListener("pointerdown",e=>{drag=true;hit.setPointerCapture(e.pointerId);mv(e)});hit.addEventListener("pointermove",mv);hit.addEventListener("pointerup",()=>drag=false);hit.addEventListener("pointercancel",()=>drag=false);
  if(typeof tagsApply==="function")try{tagsApply()}catch(e){}}
function binDraw(){const B=ui.bin,b=FARM.feed.bins[B.i],y=BV_B-B.L*BV_H,f=binFrac(B.L),kg=Math.round(f*b.cap/50)*50;
  const fl=document.querySelector("#bvSvg .bv-fill");if(fl){fl.setAttribute("y",y);fl.setAttribute("height",BV_B-y+2)}
  $("#bvLine").setAttribute("y1",y);$("#bvLine").setAttribute("y2",y);$("#bvKnob").setAttribute("transform",`translate(0,${y})`);
  $("#bvKg").textContent=kg.toLocaleString()+"kg";$("#bvPct").textContent=`${Math.round(f*100)}% · ${t("높이")} ${Math.round(B.L*100)}%`;B.kg=kg}
Object.assign(A,{binOpen:v=>openBin(+v),binStep:v=>{ui.bin.L=Math.max(0,Math.min(1,ui.bin.L+Number(v)));binDraw()},binSet:v=>{ui.bin.L=binLevel(Number(v));binDraw()},
  binSave:()=>{const b=FARM.feed.bins[ui.bin.i];addRecord("사료",TODAY,{kind:b.feed,mode:"빈 잔량",kg:ui.bin.kg});closeSheet();render();toast(`${b.name} ${ui.bin.kg.toLocaleString()}kg ${t("저장")}`)}});
