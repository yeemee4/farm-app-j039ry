/* ===== 돈사 배치도: 실제 비율로 스톨을 그리고 칸마다 버튼 =====
   칸 누르면: 모돈 정보 · 오늘 급여량 ±0.1 수동 조정(이유) · 옮기기 · 모돈 상세 / 빈 칸이면 모돈 넣기.
   s.stall = "A5" (없으면 번호 순서로 빈 칸에 자동 배치해 보여 줌 = 가배치). 모돈 탭 [배치도] · 현황판 칸 '돈사 배치도' */
function barnLayout(b){const L=FARM.layout[b];if(!L)return null;if(!L.auto)return L;const [r,n,cw,cd]=L.auto,ai=1.0,W=n*cw+1.6,rows=[],H=.6+r*cd+(r-1)*ai+.8;
  for(let i=0;i<r;i++)rows.push({id:String.fromCharCode(65+i),x:.2,y:.6+i*(cd+ai),n,cw,cd,from:"right",head:i%2?"up":"down"});
  return {sure:false,w:W,h:H,rows,areas:r>1?[{x:.2,y:.6+cd,w:W-.2,h:ai,l:"통로",aisle:1}]:[],door:{x:W,y:.6+cd+ai/2}}}
function stallsOf(b){const L=barnLayout(b);if(!L)return [];const S=[];L.rows.forEach(r=>{for(let k=0;k<r.n;k++){const x=r.from==="right"?r.x+(r.n-1-k)*r.cw:r.x+k*r.cw;S.push({id:r.id+(k+1),x,y:r.y,w:r.cw,h:r.cd,head:r.head})}});return S}
function barnOcc(b){const S=stallsOf(b),occ={},ids=new Set(S.map(x=>x.id)),sows=activeSows().filter(s=>s.loc===b).sort((a,c)=>a.id.localeCompare(c.id)),left=[];
  sows.forEach(s=>{if(s.stall&&ids.has(s.stall)&&!occ[s.stall])occ[s.stall]={s,auto:false};else left.push(s)});
  const free=S.filter(x=>!occ[x.id]);left.forEach((s,i)=>{if(free[i])occ[free[i].id]={s,auto:true}});return {S,occ,over:Math.max(0,left.length-free.length)}}
const BM_BARNS=()=>Object.keys(FARM.layout);
function stallLook(s,b){const i=statusOf(s),st=sowState(s.id),g=typeof gestFeed==="function"?gestFeed(s):null;let c="mate",l1="",l2="";
  if(st.stage==="포유"){c="lact";l1=t("포유");l2=diff(st.farrow,TODAY)+t("일")}
  else if(i.key==="분만임박"||(st.mate&&diff(st.mate,TODAY)>=105&&(st.stage==="임신"||st.stage==="교배"))){c="due";l1="D-"+Math.max(0,115-diff(st.mate,TODAY));l2=t("분만")}
  else if(st.stage==="임신"){c="preg";l1=t("임신");l2=diff(st.mate,TODAY)+""}
  else if(st.stage==="교배"){c="mate";l1=t("교배");l2=diff(st.mate,TODAY)+""}
  else if(st.stage==="이유"){c="heat";l1=t("이유");l2=diff(st.since,TODAY)+""}
  else if(st.stage==="후보"){c="gilt";l1=t("후보");l2=""}
  else {c="ret";l1=i.key==="재발공태"?t("재발"):i.label;l2=st.since?diff(st.since,TODAY)+"":""}
  return {c,l1,l2,kg:g?g.kg:null,ov:g&&g.ov,live:st.stage==="포유"?st.live:null}}
function vBarnSvg(b,z,mini){const L=barnLayout(b);if(!L)return "";const {S,occ}=barnOcc(b),M=v=>v*z,ext=L.annex?L.annex.w:0,W=L.w+ext+(mini?.2:1.2),H=L.h+(mini?.2:1.2);
  let g=`<svg viewBox="${mini?-.1*z:-.6*z} ${mini?-.1*z:-.6*z} ${M(W)} ${M(H)}" width="${mini?"100%":M(W)}" class="bm-svg" role="img" aria-label="${esc(b)}">`;
  g+=`<rect x="0" y="0" width="${M(L.w)}" height="${M(L.h)}" class="bm-wall"/>`;
  (L.areas||[]).forEach(a=>g+=`<rect x="${M(a.x)}" y="${M(a.y)}" width="${M(a.w)}" height="${M(a.h)}" class="${a.aisle?"bm-aisle":"bm-area"}"/>${mini?"":`<text x="${M(a.x+a.w/2)}" y="${M(a.y+a.h/2)+4}" class="bm-al">${esc(t(a.l))}</text>`}`);
  if(L.annex){const a=L.annex;g+=`<rect x="${M(a.x)}" y="${M(a.y)}" width="${M(a.w)}" height="${M(a.h)}" class="bm-wall"/>${mini?"":`<text x="${M(a.x+a.w/2)}" y="${M(a.y+a.h/2)}" class="bm-al">${esc(t(a.l))}</text>`}`}
  if(L.door&&!mini)g+=`<path d="M${M(L.door.x+1.1)} ${M(L.door.y)} L${M(L.door.x-.2)} ${M(L.door.y)} M${M(L.door.x)} ${M(L.door.y)-8} L${M(L.door.x-.2)} ${M(L.door.y)} L${M(L.door.x)} ${M(L.door.y)+8}" class="bm-door"/><text x="${M(L.door.x+.6)}" y="${M(L.door.y)-8}" class="bm-dl">${t("입구")}</text>`;
  S.forEach(x=>{const o=occ[x.id],lk=o?stallLook(o.s,b):null,sel=ui.moving&&o&&o.s.id===ui.moving,cx=M(x.x+x.w/2),hy=x.head==="down"?M(x.y+x.h-.16):M(x.y);
    g+=`<g class="bm-st ${lk?"c-"+lk.c:"empty"} ${o&&o.auto?"auto":""} ${sel?"sel":""}" ${mini?"":`data-a="stall" data-v="${esc(b)}|${x.id}" role="button" tabindex="0"`}><rect x="${M(x.x)}" y="${M(x.y)}" width="${M(x.w)}" height="${M(x.h)}"/><rect x="${M(x.x)+2}" y="${hy}" width="${M(x.w)-4}" height="${M(.16)}" class="bm-tr"/>`;
    if(!mini){const ty=x.head==="down"?M(x.y)+14:M(x.y+.16)+14,big=x.w>=1;g+=`<text x="${cx}" y="${ty}" class="bm-id">${x.id}</text>`;
      if(o){g+=`<text x="${cx}" y="${ty+17}" class="bm-no">${esc(o.s.id.replace(/^\d+-/,""))}</text><text x="${cx}" y="${ty+33}" class="bm-st1">${esc(lk.l1)}</text>${lk.l2?`<text x="${cx}" y="${ty+46}" class="bm-st1">${esc(lk.l2)}</text>`:""}${lk.live?`<text x="${cx}" y="${ty+62}" class="bm-kg">${t("새끼")} ${lk.live}</text>`:lk.kg?`<text x="${cx}" y="${ty+64}" class="bm-kg">${lk.kg.toFixed(1)}${lk.ov?"*":""}</text>`:""}`}
      else g+=`<text x="${cx}" y="${ty+30}" class="bm-em">${t("빈 칸")}</text>`}
    g+=`</g>`});
  return g+`</svg>`}
function vBarnMap(){const B=BM_BARNS(),b=ui.bm&&B.includes(ui.bm)?ui.bm:B[0],z=ui.bmZ||60,L=barnLayout(b),{S,occ,over}=barnOcc(b),n=Object.keys(occ).length,auto=Object.values(occ).some(o=>o.auto);
  let h=`<div class="pagehd"><button class="back" type="button" data-a="tab" data-v="sows">‹ ${t("모돈")}</button><h2>${t("돈사 배치도")}</h2><button class="act" type="button" data-a="tab" data-v="board" style="margin-left:auto">${t("현황판에서 보기")} ›</button></div>`;
  h+=`<div class="chips">${B.map(x=>{const c=barnOcc(x);return `<button type="button" class="chip ${x===b?"on":""}" data-a="bmBarn" data-v="${esc(x)}">${esc(t(x))} ${Object.keys(c.occ).length}/${c.S.length}</button>`}).join("")}</div>`;
  if(ui.moving)h+=`<div class="banner warn-b"><b>${t("옮기기")} ${esc(ui.moving)}</b><span>${t("옮길 칸을 누르세요 (다른 돈사는 위 칩으로 바꾼 뒤)")} · <button type="button" class="sbtn" data-a="bmCancel">${t("취소")}</button></span></div>`;
  h+=`<div class="bm-head"><span>${n}${t("두")} / ${S.length}${t("칸")} · ${t("빈 칸")} ${S.length-n}${over?` · <b class="dv-bad">${t("칸 부족")} ${over}${t("두")}</b>`:""}${!L.sure?` · <b class="dv-warn">${t("가배치 (돈사 그림 받기 전)")}</b>`:""}${auto?` · <span class="sow-meta">${t("흐린 칸 = 칸 번호 미지정(자동 배치)")}</span>`:""}</span><span class="bm-z"><button type="button" class="sbtn" data-a="bmZoom" data-v="-15" aria-label="${t("축소")}">－</button><button type="button" class="sbtn" data-a="bmZoom" data-v="15" aria-label="${t("확대")}">＋</button></span></div>`;
  h+=`<div class="bm-wrap">${vBarnSvg(b,z)}</div>`;
  h+=`<div class="legend bm-lg">${[["preg","임신"],["mate","교배·확인 전"],["heat","이유 후 발정 대기"],["ret","재발·공태"],["due","분만 임박"],["lact","포유"],["gilt","후보"]].map(([c,l])=>`<span><i class="bm-sw c-${c}"></i>${t(l)}</span>`).join("")}<span>* ${t("수동 조정 급여")}</span></div>`;
  return h}
function openStall(b,sid){const {occ}=barnOcc(b),o=occ[sid];
  if(ui.moving){const id=ui.moving,s=state.sows.find(x=>x.id===id);if(!s)return;if(o&&o.s.id!==id){if(!confirm(`${sid} ${t("칸의")} ${o.s.id}${t("와 자리를 바꿀까요?")}`))return;o.s.stall=s.loc===b?s.stall:null;if(s.loc!==b)o.s.stall=null}
    if(s.loc!==b){if(!confirm(`${id} ${t("모돈을")} ${t(b)}${t("(으)로 변경하시겠습니까?")}`))return;moveSow(id,b)}s.stall=sid;ui.moving=null;save();render();toast(`${id} → ${t(b)} ${sid}`);return}
  if(!o){const cand=activeSows().filter(s=>!(s.loc===b&&s.stall)).sort((x,y)=>(x.loc===b?0:1)-(y.loc===b?0:1)||x.id.localeCompare(y.id));ui.stallQ=ui.stallQ||"";
    $("#sheetRoot").innerHTML=`<div class="scrim" data-a="scrim"><div class="sheet" role="dialog" aria-modal="true"><div class="sh-hd"><h2>${esc(t(b))} ${sid} · ${t("빈 칸")}</h2><button class="x" type="button" data-a="closeSheet">${t("닫기")}</button></div><div class="sh-bd"><div class="note">${t("이 칸에 넣을 모돈을 고르세요. 다른 돈사 모돈이면 위치 이동도 기록됩니다.")}</div><div class="chipwrap">${cand.slice(0,60).map(s=>`<button type="button" class="chip wrap" data-a="stallPut" data-v="${esc(b)}|${sid}|${s.id}">${s.id}${s.loc!==b?` <small>${esc(t(s.loc))}</small>`:""}</button>`).join("")}</div></div></div></div>`;return}
  const s=o.s,i=statusOf(s),g=typeof gestFeed==="function"?gestFeed(s):null,b2=lastBCS?lastBCS(s.id,TODAY):null;
  $("#sheetRoot").innerHTML=`<div class="scrim" data-a="scrim"><div class="sheet" role="dialog" aria-modal="true"><div class="sh-hd"><h2>${esc(t(b))} ${sid} · ${s.id}</h2><button class="x" type="button" data-a="closeSheet">${t("닫기")}</button></div><div class="sh-bd">
    <div class="sow-top"><b>${esc(i.label)}</b><span class="sow-meta">${esc(i.sub||"")} · ${i.gilt?t("후보"):i.parity+t("산")} · BCS ${b2?b2.score:"-"}</span></div>
    ${g?`<div class="panel gf-ov"><div class="setrow"><span><b>${t("오늘 급여")}</b> <small class="sow-meta">${esc(g.why.join(" · "))}</small></span><div class="stepper"><button type="button" data-a="gfOv" data-v="${s.id}" data-k="-0.1" aria-label="−">−</button><input type="number" value="${g.kg.toFixed(1)}" readonly aria-label="kg"><button type="button" data-a="gfOv" data-v="${s.id}" data-k="0.1" aria-label="+">+</button></div></div>
      <div class="chipwrap">${["식욕 부진","마름","살찜","기타"].map(r=>`<button type="button" class="chip ${(state.gfOv||{})[s.id]&&state.gfOv[s.id].why===r?"on":""}" data-a="gfWhy" data-v="${s.id}|${r}">${t(r)}</button>`).join("")}${g.ov?`<button type="button" class="chip" data-a="gfOvClr" data-v="${s.id}">${t("기준으로")}</button>`:""}</div>${gfUnit(s.loc,g.kg)?`<div class="sow-meta">${gfUnit(s.loc,g.kg)}</div>`:""}</div>`:""}
    <div class="acts"><button class="act" type="button" data-a="sowd" data-v="${s.id}">${t("모돈 상세")} ›</button><button class="act pri" type="button" data-a="bmMove" data-v="${s.id}">${t("옮기기")}</button></div></div></div></div>`}
Object.assign(A,{stall:v=>{const [b,sid]=v.split("|");openStall(b,sid)},bmBarn:v=>{ui.bm=v;render()},bmZoom:v=>{ui.bmZ=Math.max(30,Math.min(120,(ui.bmZ||60)+Number(v)));render()},
  bmMove:v=>{ui.moving=v;const s=state.sows.find(x=>x.id===v);if(s&&FARM.layout[s.loc])ui.bm=s.loc;closeSheet();tab="barnmap";render()},bmCancel:()=>{ui.moving=null;render()},
  stallPut:v=>{const [b,sid,id]=v.split("|"),s=state.sows.find(x=>x.id===id);if(!s)return;if(s.loc!==b){if(!confirm(`${id} ${t("모돈을")} ${t(b)}${t("(으)로 변경하시겠습니까?")}`))return;moveSow(id,b)}s.stall=sid;save();closeSheet();render()},
  gfOv:(v,el)=>{const s=state.sows.find(x=>x.id===v),g=gestFeed(s);if(!g)return;const O=state.gfOv=state.gfOv||{},cur=g.kg;O[v]={...(O[v]||{}),kg:Math.round(Math.max(1,Math.min(5,cur+Number(el.dataset.k)))*10)/10,phase:g.phase,at:TODAY,by:state.user};save();const [b,sid]=[s.loc,(barnOcc(s.loc).S.find(x=>barnOcc(s.loc).occ[x.id]&&barnOcc(s.loc).occ[x.id].s.id===v)||{}).id];render();openStall(b,sid)},
  gfWhy:v=>{const [id,r]=v.split("|"),O=state.gfOv=state.gfOv||{};if(!O[id]){const g=gestFeed(state.sows.find(x=>x.id===id));O[id]={kg:g.kg,phase:g.phase,at:TODAY,by:state.user}}O[id].why=r;save();document.querySelectorAll('[data-a="gfWhy"]').forEach(c=>c.classList.toggle("on",c.dataset.v===v))},
  gfOvClr:v=>{if(state.gfOv)delete state.gfOv[v];save();closeSheet();render()}});
