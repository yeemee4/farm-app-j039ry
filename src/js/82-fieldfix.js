/* ================= v0.5 · 1월 시뮬레이션 개선 (2026-10-30) ================= */


// 주말·공휴일 앞날: 아침 점검을 다 마치면 바로 사료 주문 알림
function preNoDeliv(d=TODAY){return dow(d)===5||noDeliv(addDays(d,1))}
function feedOrderPop(){if(ui.foPop===TODAY)return;const P=amProg();if(P.done<P.all||!preNoDeliv())return;
  const g=(feedTodos().find(x=>x.k==="feedord")||{items:[]}).items;ui.foPop=TODAY;
  const nx=addDays(TODAY,1),why=dow(TODAY)===5?t("오늘(금) 오전 주문 → 내일(토) 도착 · 놓치면 월요일 도착"):dow(nx)===0?t("오늘(토) 주문 → 월요일 도착 · 일요일은 주문·배송 없음"):t("내일은 사료회사 휴무(공휴일) · 오늘 주문해야 함");
  $("#sheetRoot").innerHTML=`<div class="scrim" data-a="scrim"><div class="sheet" role="dialog" aria-modal="true"><div class="sh-hd"><h2>🚚 ${t("주말·휴일 전 사료 주문")}</h2><button class="x" type="button" data-a="closeSheet">${t("닫기")}</button></div><div class="sh-bd">
    <div class="warnbox" style="display:block"><b>${esc(why)}</b><br>${t("오전")} ${FARM.feed.orderCut} ${t("전에 주문해야 연휴 동안 사료가 떨어지지 않습니다.")}</div>
    ${g.length?`<div class="panel">${g.map(it=>`<div class="setrow"><span><b>${esc(it.feed.f)}</b></span><span class="sow-meta" style="color:${it.sev==="bad"?"var(--red)":"var(--amber)"}">${esc(it.label)}</span></div>`).join("")}</div>`:`<div class="note" style="color:var(--good)">✓ ${t("지금 재고로 휴일을 넘길 수 있습니다. 주문할 사료가 없습니다.")}</div>`}
    <div class="acts">${g.length?`<button class="act pri" type="button" data-a="todo" data-v="feedord">${t("사료 주문 할 일")} ›</button>`:""}<button class="act" type="button" data-a="tab" data-v="feedchk">${t("사료 잔량 점검")} ›</button></div></div></div></div>`}
// 날씨 경고: 영하권 진입 전날 · 37℃ 이상(전날부터) · 혹한 · 강풍

// 도태 후보 기준 (대표 결정 2026-10-30): 최근 2산 총산 ≤9 · 난산 비율 ≥30% · 사산이 모돈군 평균보다 20%↑ · 무발정·장기 NPD · 반복 재발(난임) · 고산차

Object.assign(A,{cullR:(v,el)=>{const r=state.cullRule=state.cullRule||{};const step=v==="dys"?5*Number(el.dataset.k):Number(el.dataset.k);r[v]=Math.max(0,cullRule()[v]+step);save();render()}});

// ---- 배치도 칸: 현장 말 상태 + 이슈(할 일) 아이콘 · 대표 설정 › 배치도 칸 정보 ----
const BM_ISS=[["svax","💉","백신"],["lit","💉","복별 처치"],["ret","🔍","임신 진단"],["mate","❤","교배"],["mate2","❤","2차 교배"],["remate","❤","재교배"],["movein","🚚","분만사 이동"],["farrow","🐣","분만 예정"],["wean","🍼","이유"],["gfchg","🥣","급여량 변경"],["bcsdue","📏","BCS 측정"],["withdraw","💊","휴약 중"],["heat","🔥","발정 관찰"]];
const BM_THIRD=[["feed","급여"],["next","다음 일정"],["par","산차·BCS"],["none","안 보임"]];
function bmCfg(){const o=state.bmShow||{};return {status:o.status!==false,third:o.third||"feed",iss:{...Object.fromEntries(BM_ISS.map(x=>[x[0],true])),...(o.iss||{})}}}
let BMI=null;function bmIssues(){const k=TODAY+"|"+state.records.length+"|"+JSON.stringify(state.todoLog||{}).length;if(BMI&&BMI.k===k)return BMI.m;const m={},C=bmCfg();
  try{buildTodos().forEach(g=>{const d=BM_ISS.find(x=>x[0]===g.k);if(!d||!C.iss[g.k])return;g.items.forEach(it=>{const id=it.s&&it.s.id;if(!id)return;if(it.lit&&tdLog(tdKey("lit",it.lit)))return;(m[id]=m[id]||[]);if(!m[id].some(x=>x[1]===d[2]))m[id].push([d[1],d[2]])})})}catch(e){}
  BMI={k,m};return m}
function vBmShowSet(){const C=bmCfg();
  return `<div class="pagehd"><h2>${t("배치도 칸 정보")}</h2></div><div class="note">${t("배치도 칸(스톨)마다 보일 정보를 고릅니다. 작업자 화면에도 그대로 적용됩니다.")}</div>
  <div class="sec-t">${t("둘째 줄 · 지금 상태")}</div><div class="panel"><div class="setrow"><span>${t("교배 대기 · 진단 대기 · 임신 ○일 · 분만 D-○ · 포유 ○일")}</span><button class="sbtn ${C.status?"on":""}" type="button" data-a="bmShow" data-v="status">${C.status?t("보임"):t("숨김")}</button></div></div>
  <div class="sec-t">${t("셋째 줄 · 기본으로 보일 정보")}</div><div class="chipwrap">${BM_THIRD.map(([k,l])=>`<button type="button" class="chip wrap ${C.third===k?"on":""}" data-a="bmThird" data-v="${k}">${t(l)}</button>`).join("")}</div>
  <div class="sec-t">${t("넷째 줄 · 이슈 아이콘")} <span>${t("오늘 할 일에 걸린 모돈")}</span></div><div class="panel">${BM_ISS.map(([k,ic,l])=>`<div class="setrow"><span>${ic} ${t(l)}</span><button class="sbtn ${C.iss[k]?"on":""}" type="button" data-a="bmIss" data-v="${k}">${C.iss[k]?t("보임"):t("숨김")}</button></div>`).join("")}</div>
  <div class="note">${t("⚠ 도태 후보는 늘 모돈 번호 옆에 표시됩니다(기준: 대표 설정 › 현황판 항목 › 도태 후보 기준).")}</div>`}
Object.assign(A,{bmShow:v=>{const o=state.bmShow=state.bmShow||{};o[v]=!bmCfg()[v];BMI=null;save();render()},bmThird:v=>{(state.bmShow=state.bmShow||{}).third=v;ui.bmInfo=null;save();render()},
  bmIss:v=>{const o=state.bmShow=state.bmShow||{};o.iss=o.iss||{};o.iss[v]=!bmCfg().iss[v];BMI=null;save();render()}});

// ---- 성적 · 성적 TV 항목 (대표 설정 › 성적 항목: 켜기·끄기·순서) · NPD 는 TV 첫 줄 맨 끝 ----
const ST_KPI0=["psy","msy","frate","live","wean","surv","dead","npd"],ST_CARD0=["psy","litter","week","dead","cause","feed","parity","grade","count","npd","fcr"];
function stOrd(k,all,def){const o=(state.stOrder||{})[k],off=new Set(((state.stOrder||{})[k+"Off"])||all.filter(x=>!def.includes(x)));const L=(o||def).filter(x=>all.includes(x));all.forEach(x=>{if(!L.includes(x))L.push(x)});return {L,off,on:L.filter(x=>!off.has(x))}}
const stKpi=()=>stOrd("kpi",MET.map(m=>m[0]),ST_KPI0),stCards=()=>stOrd("cards",CD_KEYS,ST_CARD0);
function cardMap(){const C=chartCards(),m={};CD_KEYS.forEach((k,i)=>m[k]=C[i]);return m}

function vStatSet(){const K=stKpi(),C=stCards(),nmK=Object.fromEntries(MET.map(m=>[m[0],m[1]]));
  const ed=(key,o,nm,note)=>`<div class="panel">${o.L.map((k,i)=>{const on=!o.off.has(k),pos=o.on.indexOf(k);return `<div class="setrow"><span>${on?`<b>${pos+1}.</b> `:""}${t(nm[k]||k)}${note&&on?note(pos):""}</span><span class="row2" style="gap:6px;flex:none"><button class="sbtn ${on?"on":""}" type="button" data-a="stOn" data-v="${key}|${k}">${on?t("보임"):t("숨김")}</button><button class="sbtn" type="button" data-a="stMv" data-v="${key}|${k}" data-k="-1" ${i===0?"disabled":""} aria-label="위로">▲</button><button class="sbtn" type="button" data-a="stMv" data-v="${key}|${k}" data-k="1" ${i===o.L.length-1?"disabled":""} aria-label="아래로">▼</button></span></div>`}).join("")}</div>`;
  return `<div class="pagehd"><h2>${t("성적 항목")}</h2></div><div class="note">${t("성적 탭과 성적 TV에 보일 항목과 순서를 정합니다. 현황판 칸은 ‘현황판 항목 · 목표’에서 정합니다.")}</div>
  <div class="sec-t">${t("성적 TV 첫 줄 숫자")} <span>${t("앞의 8개만 보임")}</span></div>${ed("kpi",K,nmK,p=>p>=8?` <small class="sow-meta">(${t("9번째부터 안 보임")})</small>`:"")}
  <div class="sec-t">${t("그래프 카드")} <span>${t("성적 TV = 앞의 6개 + 월별 추이 + 7번째")}</span></div>${ed("cards",C,CD_T,p=>p===6?` <small class="sow-meta">(${t("TV 마지막 칸")})</small>`:p>6?` <small class="sow-meta">(${t("성적 탭만")})</small>`:"")}
  <div class="acts"><button class="act" type="button" data-a="stReset">${t("기본값으로")}</button></div>`}
Object.assign(A,{
  stOn:v=>{const [key,k]=v.split("|"),o=key==="kpi"?stKpi():stCards(),S=state.stOrder=state.stOrder||{};const off=new Set(o.off);off.has(k)?off.delete(k):off.add(k);S[key+"Off"]=[...off];S[key]=o.L;save();render()},
  stMv:(v,el)=>{const [key,k]=v.split("|"),o=key==="kpi"?stKpi():stCards(),L=o.L.slice(),i=L.indexOf(k),j=i+Number(el.dataset.k);if(j<0||j>=L.length)return;[L[i],L[j]]=[L[j],L[i]];const S=state.stOrder=state.stOrder||{};S[key]=L;S[key+"Off"]=[...o.off];save();render()},
  stReset:()=>{state.stOrder={};save();render()}});

// ---- 사료 빈 바닥: 학습 제외 + 비는 순간부터 입고 기록 때까지 매일 '입고 확인' (꼭 할 일) ----
function feedEmpty(f,kg){if(kg==null)return false;const b=feedBin(f);return b?kg<=Math.max(100,binCap(b)*.03):kg<=0}
function emptyFeeds(){const out=[];feedKinds().forEach(f=>{const R=recsOf("사료").filter(r=>r.data.kind===f).sort((a,b)=>(a.createdAt||"").localeCompare(b.createdAt||""));
  const rd=R.filter(r=>r.data.mode==="빈 잔량"||r.data.mode==="잔량"),last=rd[rd.length-1];if(!last||!feedEmpty(f,last.data.kg))return;
  if(R.some(r=>r.data.mode==="입고"&&r.createdAt>last.createdAt))return;
  let i=rd.length-1;while(i>0&&feedEmpty(f,rd[i-1].data.kg))i--;const since=rd[i].workDate,b=feedBin(f);
  out.push({emp:{f,name:b?b.name:`${f} ${t("포대")}`,since,days:diff(since,TODAY)+1},label:`${kDate(since)}${t("부터 비어 있음")} · ${t("입고됐는지 확인하고 입고를 기록하세요")}${diff(since,TODAY)>=1?" · "+t("사용량 학습에서 빠짐"):""}`,sev:"bad"})});return out}
function binEmptyTodos(){let e=[];try{e=emptyFeeds()}catch(x){}return [{k:"binempty",t:"사료 빈 비었음 · 입고 확인",items:e,act:null}]}
Object.assign(A,{empIn:v=>{closeSheet();openInput("사료",{fv:{kind:v,mode:"입고"}})}});

// 분만: 사산이 기준 두수(기본 4) 이상이면 난산으로 자동 기록 (새벽 분만 1~2두 사산은 사고로 봄)
const stillDys=()=>cullRule().still;
function isDys(r){return (r.data.ease&&r.data.ease!=="정상")||(+r.data.still||0)>=stillDys()}

// 대표: 계정마다 PIN 바로 바꾸기 (예전: 0000 으로 초기화만)
A.accPin=v=>{const a=state.accounts.find(x=>x.id===v);if(!a)return;const p=prompt(`${a.name} — ${t("새 PIN (숫자 4~6자리)")}`,"");if(p===null)return;const n=p.trim();
  if(!/^\d{4,6}$/.test(n)){toast(t("PIN은 숫자 4~6자리입니다"));return}if(["0000","1111","1234","2222","3333","4444","9368"].includes(n)){toast(t("너무 쉬운 PIN입니다. 다른 숫자로 해 주세요"));return}
  a.pin=n;save();render();toast(`${a.name} PIN ${t("을 바꿨습니다")}`)};

// 예시 데이터: 빈 잔량 기록에 양쪽 게이지(기울기)도 넣기 → 현황판·사료 화면 빈이 기울어진 면으로 보임
// 빈 그림 왼쪽 아래 ‘정면 ↗’: 게이지 왼쪽·오른쪽 = 정면에서 볼 때 기준

// ---- 현황판 TV: 카드 내용이 잘리지 않게 (빈 칸 수만큼 긴 카드를 세로 두 칸 → 그래도 넘치면 내용을 카드 크기에 맞게 줄임) ----
function dashFit(){if(tab!=="board")return;document.querySelectorAll(".dash .d-todo").forEach(x=>x.classList.add("ascroll"));
  if(document.body.classList.contains("tv")&&innerWidth>=900&&!dashPhoneL())dashPack();marquee($(".dash"))}
// TV: 카드마다 실제 내용 높이를 재서 세로 3줄에 낮은 줄부터 쌓고, 넘치면 다음 페이지(P2·P3). 줄 맨 아래 카드는 남은 높이까지 늘림 → 빈 곳·잘림 없이
function dashPack(){const M=$(".d-main");if(!M)return;const bm=M.querySelector(":scope>.dk-barnmap");if(bm)bm.remove();   // 배치도는 위쪽 버튼 하나로
  const C=[...M.querySelectorAll(":scope>.d-card")];if(!C.length)return;
  const cols=3,gap=parseFloat(getComputedStyle(M).rowGap)||12,W=M.clientWidth,H=M.clientHeight,cw=(W-gap*(cols-1))/cols;
  M.style.position="relative";M.style.display="block";
  C.forEach(c=>{c.style.cssText=`position:absolute;left:0;top:0;width:${cw}px;height:auto;visibility:hidden;display:flex`});
  const P=[];let cur=null;C.forEach(c=>{const h=Math.min(H,c.offsetHeight);if(!cur){cur={u:Array(cols).fill(0),it:[]};P.push(cur)}
    let col=cur.u.indexOf(Math.min(...cur.u));if(cur.u[col]+h>H+1&&cur.it.length){cur={u:Array(cols).fill(0),it:[]};P.push(cur);col=0}
    cur.it.push({c,col,top:cur.u[col],h});cur.u[col]+=h+gap});
  P.forEach(pg=>{for(let k=0;k<cols;k++){const L=pg.it.filter(x=>x.col===k);if(!L.length)continue;const used=L.reduce((s,x)=>s+x.h,0)+gap*(L.length-1),add=Math.max(0,H-used)/L.length;let y=0;L.forEach(x=>{x.top=y;x.h+=add;y+=x.h+gap})}});   // 남는 높이를 줄 안 카드에 고르게
  ui.tvPage=Math.min(Math.max(1,ui.tvPage||1),P.length);
  P.forEach((pg,i)=>pg.it.forEach(x=>{x.c.style.cssText=i+1===ui.tvPage?`position:absolute;left:${x.col*(cw+gap)}px;top:${x.top}px;width:${cw}px;height:${x.h}px;display:flex`:"display:none"}));
  const ctl=$(".dash .d-ctl");if(ctl){ctl.querySelectorAll(".d-pg").forEach(b=>b.remove());if(dashCfg().on.barnmap)ctl.insertAdjacentHTML("afterbegin",`<button type="button" class="d-pg" data-a="dashBm" data-v="${esc(BM_BARNS()[0])}">🗺 ${t("배치도")}</button>`);if(P.length>1)ctl.insertAdjacentHTML("beforeend",P.map((_,i)=>`<button type="button" class="d-pg ${ui.tvPage===i+1?"on":""}" data-a="tvPg" data-v="${i+1}">P${i+1}</button>`).join(""))}}
// 가로로 넘치는 글씨: 전광판처럼 옆으로 흘렀다 돌아옴
function marquee(root){if(!root)return;root.querySelectorAll("b,small,span,em,i,div,button").forEach(el=>{if(el.childElementCount||el.closest(".mq")||!el.textContent.trim())return;
  const par=el.parentElement,cw=el.clientWidth,sw=el.scrollWidth,pw=par?par.clientWidth:cw,over=Math.max(sw-cw,el.offsetWidth-pw);if(over<=2||cw<12)return;
  el.classList.add("mq-on");el.innerHTML=`<span class="mq">${el.innerHTML}</span>`;const m=el.firstChild,d=m.scrollWidth-el.clientWidth;if(d<=2){el.classList.remove("mq-on");el.innerHTML=m.innerHTML;return}
  m.style.setProperty("--dx",-d+"px");m.style.animationDuration=Math.max(5,d/30+4)+"s"})}
AFTER_RENDER.push(()=>setTimeout(()=>{dashFit();if(tab==='board'&&!document.body.classList.contains('tv'))marquee($('.dash'));if(tab==='todo')marquee($('.todolist'))},0));
addEventListener("resize",()=>{clearTimeout(window.__dft);window.__dft=setTimeout(dashFit,150)});
document.addEventListener("fullscreenchange",()=>setTimeout(dashFit,200));

// ---- 할 일 숫자 = ‘일 묶음’ 수 (같은 성격은 하나로, 다르면 나눔) · 탭 배지·현황판·홈·퀘스트 ----
function bundleKey(k,it){
  if(k==="svax")return it.vx?it.vx.name.replace(/\s*\d+차.*$/,""):"1";   // 백신 종류별
  if(k==="bvax")return it.v&&it.v.p?it.v.p.name.replace(/\s*\d+차.*$/,""):"1";   // 돈군 백신 종류별(1차·2차는 같은 일)
  if(k==="lit")return it.name||"1";                           // 1일·3일 처치별
  if(k==="annual")return it.ann?it.ann.name:"1";
  if(k==="feedord")return it.feed&&it.feed.bin?"bulk":"bag";  // 벌크 / 포대
  if(k==="feedchg")return it.fc?it.fc.p.feed:"1";
  if(k==="task")return (it.t&&(it.t.barn||it.t.title))||"1";  // 돈사별 조치
  if(k==="closemiss")return it.cm?it.cm.day:"1";              // 날짜별
  return "1"}                                                // 나머지는 묶음 하나
function bLeft(x){if(x.k==="pending")return x.items.length?1:0;const s=new Set();x.items.forEach(it=>{if(!tdLog(tdKey(x.k,itemTarget(it))))s.add(bundleKey(x.k,it))});return s.size}
function bTot(x){return new Set(x.items.map(it=>bundleKey(x.k,it))).size}
navBadge=(nb=>function(k){if(k==="todo")return buildTodos().reduce((s,x)=>s+bLeft(x),0)+(stalls().length?1:0);return nb(k)})(navBadge);

// ---- TV 에서 카드를 눌러 다른 화면으로 가면: 구석에 ‘📺 TV로 돌아가기’ (누르면 그 TV 화면으로 바로) ----
dashLeave=(f=>function(){if(document.body.classList.contains("tv"))ui.tvBack=tab;return f()})(dashLeave);
AFTER_RENDER.push(()=>{let b=$("#tvBackBtn");const show=ui.tvBack&&!document.body.classList.contains("tv")&&me();
  if(show&&!b){b=document.createElement("div");b.id="tvBackBtn";document.body.appendChild(b)}
  if(b){if(show)b.innerHTML=`<button type="button" data-a="tvBack">📺 ${t("TV로 돌아가기")}</button><button type="button" class="x" data-a="tvBackX" aria-label="${t("닫기")}">✕</button>`;else b.remove()}});
Object.assign(A,{tvBack:()=>{const t0=ui.tvBack||"board";ui.tvBack=null;closeSheet();go(t0);A.tvMode()},tvBackX:()=>{ui.tvBack=null;render()}});

// 현황판 ‘이번 주 · 다음 주’: 날마다 할 일 종류별 건수 (주간 달력 요약, 누르면 주간 달력)
Object.assign(DASH_P,{week2:()=>{const {ev,w0}=calEvents(),col=(a,ti)=>{let h="";for(let k=0;k<7;k++){const d=addDays(a,k),E=ev[d]||[];if(!E.length||d<TODAY)continue;const c={};E.forEach(([x])=>c[x]=(c[x]||0)+1);
    h+=`<div class="${d===TODAY?"on":""}"><b>${kDate(d)}</b><span>${Object.entries(c).map(([x,n])=>`${t(L(x))} ${n}`).join(" · ")}</span></div>`}return `<div class="d-wk"><h4>${t(ti)}</h4>${h||`<div class="sow-meta">${t("없음")}</div>`}</div>`};
  return [t("이번 주 · 다음 주"),t("주간 달력 요약"),`<div class="d-wk2">${col(w0,"이번 주")}${col(addDays(w0,7),"다음 주")}</div>`]}});
DASH_GO.week2="cal";
Object.assign(A,{tvPg:v=>{ui.tvPage=+v;render()}});
