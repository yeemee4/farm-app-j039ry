/* ===== 사료 빈: 규격 → 치수 → 기울어진 사료 면 부피 → kg · 양쪽 게이지 기록 · 비중 자동 보정 =====
   규격표(판매 규격 톤 = 펠렛 0.65t/m³ 기준, 깔때기 60°, 배출구 지름 30cm)에서 지름·원통 높이를 정함.
   게이지 높이 0 = 배출구, 1 = 원통 맨 위. 사료 면은 왼쪽·오른쪽 높이를 잇는 기울어진 평면.
   손잡이: localStorage farm-binknob = both(양쪽 손잡이, 기본) | direct(빈 직접 끌기: 왼쪽 절반·오른쪽 절반) */
const BIN_SPECS={3:1.8,4:1.8,5:1.8,6:2.3,8:2.3,10:2.3,12:2.3};   // 톤 → 지름(m)
const BIN_R0=.15,BIN_RATED=.65;
function binCfg(b){const o=(state.binCfg||{})[b.name]||{};return {spec:o.spec||b.spec,dens:o.dens||null}}
function binGeo(b){const c=binCfg(b),D=BIN_SPECS[c.spec]||2.3,R=D/2,hc=(R-BIN_R0)*Math.tan(Math.PI/3),Vc=Math.PI*hc/3*(R*R+R*BIN_R0+BIN_R0*BIN_R0),hy=Math.max(.3,(c.spec/BIN_RATED-Vc)/(Math.PI*R*R));
  return {D,R,hc,hy,H:hc+hy,roof:R*Math.tan(Math.PI/6)}}
// 입체 격자 (빈 규격별로 한 번만)
const BIN_GRID={};
function binGrid(b){const g=binGeo(b),k=g.D+"|"+g.hy.toFixed(3);if(BIN_GRID[k])return BIN_GRID[k];const N=48,da=(2*g.R/N)**2,cells=[];
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){const x=-g.R+(i+.5)*2*g.R/N,y=-g.R+(j+.5)*2*g.R/N,r=Math.hypot(x,y);if(r<=g.R)cells.push([x,r<=BIN_R0?0:g.hc*(r-BIN_R0)/(g.R-BIN_R0)])}
  return BIN_GRID[k]={g,cells,da}}
// 왼쪽·오른쪽 높이(0~1) → 부피 m³
function binVol(b,lL,lR=lL){const {g,cells,da}=binGrid(b),zL=lL*g.H,zR=lR*g.H;let v=0;for(const [x,zb] of cells){const zp=Math.max(0,Math.min(g.H,zL+(zR-zL)*(x+g.R)/(2*g.R)));if(zp>zb)v+=zp-zb}return v*da}
const binVmax=b=>{const G=binGrid(b);return G.vmax??(G.vmax=binVol(b,1,1))};
function binDens(b){const c=binCfg(b);if(c.dens)return c.dens;const e=binDensEst(b);return e?e.d:FARM.feed.dens||.55}
function binCap(b){return Math.round(binVmax(b)*binDens(b)*1000/50)*50}
function binLevelOfKg(b,kg){const tv=Math.max(0,Math.min(binVmax(b),kg/1000/binDens(b)));let a=0,c=1;for(let k=0;k<26;k++){const m=(a+c)/2;binVol(b,m,m)<tv?a=m:c=m}return (a+c)/2}
// 비중 자동 보정: 같은 날 '입고 전 게이지 → 입고 → 입고 후 게이지' 이면 입고 kg ÷ 늘어난 부피
let BDE={};function binDensEst(b){const ck=state.records.length+"|"+b.feed;if(ck in BDE)return BDE[ck];return BDE[ck]=binDensEst0(b)}
function binDensEst0(b){const R=state.records.filter(r=>r.type==="사료"&&r.data.kind===b.feed).sort((x,y)=>(x.createdAt||"").localeCompare(y.createdAt||"")),est=[];
  R.forEach((r,i)=>{if(r.data.mode!=="입고")return;const pre=[...R.slice(0,i)].reverse().find(q=>q.data.vol!=null),post=R.slice(i+1).find(q=>q.data.vol!=null);
    if(!pre||!post||diff(pre.workDate,post.workDate)>1)return;const inn=R.filter(q=>q.data.mode==="입고"&&q.createdAt>pre.createdAt&&q.createdAt<post.createdAt).reduce((s,q)=>s+q.data.kg,0),dv=post.data.vol-pre.data.vol;
    if(dv>.3){const d=inn/1000/dv;if(d>.35&&d<.85)est.push(d)}});
  if(!est.length)return null;const L=[...new Set(est)].slice(-3).sort();return {d:L[Math.floor(L.length/2)],n:est.length}}
// 기존 코드가 쓰는 bin.cap 은 규격·비중으로 계산
FARM.feed.bins.forEach(b=>{delete b.cap;Object.defineProperty(b,"cap",{get(){return binCap(this)},configurable:true})});
const binKnob=()=>{try{const k=localStorage.getItem("farm-binknob");return k==="direct"?"direct":"both"}catch(e){return "both"}};
function binCol(days){return days===null||days===undefined?"#8a949e":days<=2?"#e5484d":days<=FARM.feed.orderDays?"#e8a317":"#2fb36d"}
// 그림 좌표: 가로 96(지름) 기준으로 실제 비율
// 모든 빈을 같은 축척(지름 2.3m = 96)으로 그려 5톤은 가늘게, 10톤은 굵고 높게
function binPx(b){const g=binGeo(b),s=96/2.3,roof=g.roof*s,top=roof+6,cy=g.hy*s,cn=g.hc*s,hw=g.R*s;return {s,x0:60-hw,x1:60+hw,cx:60,top,cyl:cy,cone:cn,B:top+cy+cn,H:cy+cn,o:BIN_R0*s,roof}}
function binSvg(b,id,lL,lR,col,big){const P=binPx(b),yL=P.B-lL*P.H,yR=P.B-lR*P.H,yAt=x=>yL+(yR-yL)*(x-P.x0)/(P.x1-P.x0);
  const o=`M${P.x0},${P.top} L${P.cx},${P.top-P.roof} L${P.x1},${P.top} L${P.x1},${P.top+P.cyl} L${P.cx+P.o},${P.B} L${P.cx-P.o},${P.B} L${P.x0},${P.top+P.cyl} Z`;
  let g=`<defs><clipPath id="bc${id}"><path d="${o}"/></clipPath><pattern id="bh${id}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><rect width="7" height="7" fill="${col}"/><line x1="0" y1="0" x2="0" y2="7" stroke="rgba(255,255,255,.35)" stroke-width="2.5"/></pattern></defs>`;
  g+=`<path d="${o}" fill="var(--bg)"/><polygon class="bv-fill" clip-path="url(#bc${id})" points="-30,${yAt(-30)} 150,${yAt(150)} 150,${P.B+4} -30,${P.B+4}" fill="url(#bh${id})"/>`;
  g+=`<path d="${o}" fill="none" stroke="var(--ink)" stroke-width="${big?2.2:2.8}" stroke-linejoin="round"/>`;
  [P.top,P.top+P.cyl].forEach(y=>g+=`<line x1="${P.x0}" x2="${P.x1}" y1="${y}" y2="${y}" stroke="var(--ink)" stroke-width="1.3" opacity=".45"/>`);
  return g}
function vFeedBins(){const T=feedTable();
  return `<div class="sec-t">${t("사료 빈")} <span>${t("빈을 누르면 게이지로 잔량 기록")}</span></div><div class="bins">${FARM.feed.bins.map((b,i)=>{const x=T.find(r=>r.f===b.feed)||{},cap=b.cap,f=x.kg==null?0:Math.min(1,x.kg/cap),L=binLevelOfKg(b,x.kg||0),P=binPx(b);
    return `<button type="button" class="bin" data-a="binOpen" data-v="${i}"><svg viewBox="0 ${P.B-238} 120 242" aria-hidden="true">${binSvg(b,"m"+i,L,L,binCol(x.days))}</svg><b>${esc(b.name)}</b><small>${esc(b.feed)} · ${binCfg(b).spec}t</small><span>${x.kg==null?t("기록 필요"):`${(x.kg/1000).toFixed(1)}t <small>${Math.round(f*100)}%</small>`}</span><em style="color:${binCol(x.days)}">${x.days==null?"—":x.days+t("일분")}</em></button>`}).join("")}</div>`}
function openBin(i){const b=FARM.feed.bins[i],x=feedTable().find(r=>r.f===b.feed)||{},last=state.records.filter(r=>r.type==="사료"&&r.data.kind===b.feed&&r.data.lL!=null).sort((p,q)=>(q.createdAt||"").localeCompare(p.createdAt||""))[0];
  const R=state.records.filter(r=>r.type==="사료"&&r.data.kind===b.feed&&r.workDate===TODAY).sort((p,q)=>(p.createdAt||"").localeCompare(q.createdAt||"")),lg=[...R].reverse().find(r=>r.data.vol!=null);
  if(lg&&lg.data.gauge==="입고 전"&&R.some(r=>r.data.mode==="입고"&&r.createdAt>lg.createdAt))ui.binMode="입고 후";
  const L0=x.kg==null?.5:binLevelOfKg(b,x.kg),k=binKnob(),P=binPx(b);ui.bin={i,lL:L0,lR:L0};
  // 마지막 기록의 기울기를 이어서 시작 (높이는 지금 추정량에 맞춤)
  if(last){const tl=(last.data.lR-last.data.lL)/2;ui.bin.lL=Math.max(0,Math.min(1,L0-tl));ui.bin.lR=Math.max(0,Math.min(1,L0+tl))}
  const vb=k==="both"?`-46 ${-P.roof-26} 212 ${P.B+P.roof+32}`:`-8 ${-P.roof-26} 136 ${P.B+P.roof+32}`;
  $("#sheetRoot").innerHTML=`<div class="scrim" data-a="scrim"><div class="sheet binsheet" role="dialog" aria-modal="true" aria-label="${esc(b.name)}"><div class="sh-hd"><h2>${esc(b.name)} · ${esc(b.feed)} <small class="sow-meta">${binCfg(b).spec}${t("톤 규격")} · ${t("가득")} ${(b.cap/1000).toFixed(1)}t</small></h2><button class="x" type="button" data-a="closeSheet">${t("닫기")}</button></div><div class="sh-bd">
  <div class="note">${k==="both"?t("왼쪽·오른쪽 손잡이를 각각 끌어 사료 면 높이에 맞추세요. 기울어져 있으면 양쪽을 다르게."):t("빈 왼쪽 절반·오른쪽 절반을 각각 끌어 사료 면 높이에 맞추세요.")}${x.kg!=null?` ${t("추정")} ${x.kg.toLocaleString()}kg`:""}</div>
  <div class="bv-wrap"><svg id="bvSvg" viewBox="${vb}" class="bv-big"></svg>
  <div class="bv-read"><b id="bvKg"></b><span id="bvPct"></span><div class="chipwrap">${[["비었음",0],["¼",.25],["½",.5],["¾",.75],["가득",1]].map(([l,f])=>`<button type="button" class="chip" data-a="binSet" data-v="${f}">${t(l)}</button>`).join("")}</div>
  <div class="chipwrap"><button type="button" class="chip ${k==="both"?"on":""}" data-a="binKnob" data-v="both">${t("양쪽 손잡이")}</button><button type="button" class="chip ${k==="direct"?"on":""}" data-a="binKnob" data-v="direct">${t("빈 직접 끌기")}</button></div></div></div>
  <div class="chipwrap" style="margin-top:8px">${["잔량","입고 전","입고 후"].map(m=>`<button type="button" class="chip ${(ui.binMode||"잔량")===m?"on":""}" data-a="binMode" data-v="${m}">${t(m)}</button>`).join("")}</div>
  <div class="note">${t("입고 날에는 ‘입고 전’과 ‘입고 후’를 한 번씩 기록하면 이 빈의 사료 비중을 자동으로 맞춥니다.")} ${(()=>{const e=binDensEst(b),c=binCfg(b);return c.dens?`${t("비중")} ${c.dens.toFixed(2)} (${t("직접 입력")})`:e?`${t("비중")} ${e.d.toFixed(2)} (${t("입고")} ${e.n}${t("회로 보정")})`:`${t("비중")} ${(FARM.feed.dens||.55).toFixed(2)} (${t("기본값")})`})()}</div>
  <button class="save" type="button" data-a="binSave">${t("잔량 저장")}</button></div></div></div>`;
  binDraw();const svg=$("#bvSvg");let drag=null;
  const mv=e=>{if(!drag)return;const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(svg.getScreenCTM().inverse()),Q=binPx(FARM.feed.bins[ui.bin.i]),v=Math.max(0,Math.min(1,(Q.B-q.y)/Q.H));if(drag==="L")ui.bin.lL=v;else ui.bin.lR=v;binDraw();e.preventDefault()};
  svg.addEventListener("pointerdown",e=>{const h=e.target.closest(".bv-hit");if(!h)return;drag=h.dataset.s;svg.setPointerCapture(e.pointerId);mv(e)});svg.addEventListener("pointermove",mv);["pointerup","pointercancel"].forEach(n=>svg.addEventListener(n,()=>drag=null));
  if(typeof tagsApply==="function")try{tagsApply()}catch(e){}}
function binDraw(){const B0=ui.bin,b=FARM.feed.bins[B0.i],P=binPx(b),k=binKnob(),yL=P.B-B0.lL*P.H,yR=P.B-B0.lR*P.H;
  let g=binSvg(b,"B",B0.lL,B0.lR,"#2fb36d",1)+`<line x1="${P.x0}" x2="${P.x1}" y1="${yL}" y2="${yR}" stroke="var(--accent)" stroke-width="2.4"/>`;
  [.25,.5,.75].forEach(f=>{const y=P.B-binLevelOfKg(b,f*b.cap)*P.H;g+=`<line x1="${P.x1-9}" x2="${P.x1}" y1="${y}" y2="${y}" stroke="var(--muted)"/><text x="${P.x1-11}" y="${y+3}" text-anchor="end" class="bv-t">${f*100}%</text>`});
  const kn=(cx,y)=>`<circle cx="${cx}" cy="${y}" r="12" fill="var(--surface)" stroke="var(--accent)" stroke-width="3"/>`;
  if(k==="both")g+=`<rect x="-30" y="${P.top}" width="12" height="${P.H}" rx="6" fill="var(--grid)" stroke="var(--line)"/><rect x="138" y="${P.top}" width="12" height="${P.H}" rx="6" fill="var(--grid)" stroke="var(--line)"/><line x1="-24" x2="${P.x0}" y1="${yL}" y2="${yL}" stroke="var(--accent)" stroke-dasharray="3 3"/><line x1="${P.x1}" x2="144" y1="${yR}" y2="${yR}" stroke="var(--accent)" stroke-dasharray="3 3"/>${kn(-24,yL)}${kn(144,yR)}
    <rect class="bv-hit" data-s="L" x="-46" y="${P.top-24}" width="42" height="${P.H+36}" fill="transparent"/><rect class="bv-hit" data-s="R" x="124" y="${P.top-24}" width="42" height="${P.H+36}" fill="transparent"/>`;
  else g+=`<circle cx="${P.x0}" cy="${yL}" r="5.5" fill="var(--accent)"/><circle cx="${P.x1}" cy="${yR}" r="5.5" fill="var(--accent)"/><line x1="${P.cx}" x2="${P.cx}" y1="${P.top-P.roof}" y2="${P.B}" stroke="var(--muted)" stroke-dasharray="2 4" opacity=".6"/>
    <rect class="bv-hit" data-s="L" x="${P.x0-14}" y="${P.top-P.roof-20}" width="${P.cx-P.x0+14}" height="${P.H+P.roof+30}" fill="transparent"/><rect class="bv-hit" data-s="R" x="${P.cx}" y="${P.top-P.roof-20}" width="${P.x1-P.cx+14}" height="${P.H+P.roof+30}" fill="transparent"/>`;
  g+=`<text x="${k==="both"?-24:P.x0}" y="${P.top-P.roof-10}" text-anchor="${k==="both"?"middle":"start"}" class="bv-t">${t("왼쪽")} ${Math.round(B0.lL*100)}%</text><text x="${k==="both"?144:P.x1}" y="${P.top-P.roof-10}" text-anchor="${k==="both"?"middle":"end"}" class="bv-t">${t("오른쪽")} ${Math.round(B0.lR*100)}%</text>`;
  $("#bvSvg").innerHTML=g;const v=binVol(b,B0.lL,B0.lR),kg=Math.round(v*binDens(b)*1000/50)*50;B0.kg=kg;B0.vol=v;
  $("#bvKg").textContent=kg.toLocaleString()+"kg";$("#bvPct").textContent=`${Math.round(kg/b.cap*100)}% · ${v.toFixed(2)}m³`}
Object.assign(A,{binOpen:v=>openBin(+v),binSet:v=>{const b=FARM.feed.bins[ui.bin.i],L=binLevelOfKg(b,Number(v)*b.cap);ui.bin.lL=ui.bin.lR=L;binDraw()},
  binKnob:v=>{try{localStorage.setItem("farm-binknob",v)}catch(e){}const B0=ui.bin;openBin(B0.i);ui.bin.lL=B0.lL;ui.bin.lR=B0.lR;binDraw()},
  binMode:v=>{ui.binMode=v;document.querySelectorAll('[data-a="binMode"]').forEach(c=>c.classList.toggle("on",c.dataset.v===v))},
  binSave:()=>{const b=FARM.feed.bins[ui.bin.i],B0=ui.bin;addRecord("사료",TODAY,{kind:b.feed,mode:"빈 잔량",kg:B0.kg,vol:+B0.vol.toFixed(3),lL:+B0.lL.toFixed(3),lR:+B0.lR.toFixed(3),gauge:ui.binMode||"잔량"});
    const m=ui.binMode;ui.binMode=null;closeSheet();render();toast(`${b.name} ${B0.kg.toLocaleString()}kg ${t("저장")}`);if(m==="입고 전")setTimeout(()=>{openInput("사료",{fv:{kind:b.feed,mode:"입고"}});toast(t("입고를 저장한 뒤 빈을 다시 눌러 ‘입고 후’를 기록하세요"))},300)}});
// 대표 설정: 빈 규격·비중
function binSet(){return `<div class="sec-t">${t("사료 빈")} <span>${t("규격을 고르면 치수 자동")}</span></div><div class="panel">${FARM.feed.bins.map(b=>{const c=binCfg(b),g=binGeo(b),e=binDensEst(b);
  return `<div class="setrow" style="flex-wrap:wrap"><span><b>${esc(b.name)}</b> <small class="sow-meta">${esc(b.feed)} · ${t("지름")} ${g.D}m · ${t("둘레")} ${(Math.PI*g.D).toFixed(2)}m · ${t("가득")} ${(b.cap/1000).toFixed(1)}t</small></span><div class="chipwrap">${Object.keys(BIN_SPECS).map(s=>`<button type="button" class="chip ${+s===c.spec?"on":""}" data-a="binSpec" data-v="${b.name}" data-k="${s}">${s}${t("톤")}</button>`).join("")}</div>
  <div class="setrow" style="width:100%;border:0;padding:4px 0"><span>${t("비중")} <small class="sow-meta">${c.dens?t("직접 입력"):e?`${t("입고")} ${e.n}${t("회로 보정")}`:t("기본값")}</small></span><div class="stepper"><button type="button" data-a="binDens" data-v="${b.name}" data-k="-0.01" aria-label="−">−</button><input type="number" value="${binDens(b).toFixed(2)}" readonly aria-label="${t("비중")}"><button type="button" data-a="binDens" data-v="${b.name}" data-k="0.01" aria-label="+">+</button></div></div></div>`}).join("")}</div>`}
Object.assign(A,{binSpec:(v,el)=>{const o=state.binCfg=state.binCfg||{};(o[v]=o[v]||{}).spec=+el.dataset.k;save();render()},
  binDens:(v,el)=>{const o=state.binCfg=state.binCfg||{},b=FARM.feed.bins.find(x=>x.name===v);(o[v]=o[v]||{}).dens=Math.round(Math.max(.35,Math.min(.85,binDens(b)+Number(el.dataset.k)))*100)/100;save();render()}});
