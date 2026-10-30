/* ================= v0.5 · 1월 시뮬레이션 개선 (2026-10-30) ================= */
// 저장 알림: 화면 가운데, 연속 입력 중(15초 안 재저장)이면 짧게(첫 문장만·2초)
let lastSaveAt=0;
toast=function(m){$("#toastRoot").innerHTML=`<div class="toast" role="status">${esc(m)}</div>`;clearTimeout(tt);tt=setTimeout(()=>$("#toastRoot").innerHTML="",2400)};
undoToast=function(m,ids){const now=Date.now(),busy=now-lastSaveAt<15000;lastSaveAt=now;
  ui.undo={ids,loc:ui.undoLoc||{}};ui.undoLoc=null;const msg=busy?String(m).split(/ · |\. /)[0]:m;
  $("#toastRoot").innerHTML=`<div class="toast undo ${busy?"short":""}" role="status"><span>${esc(msg)}</span><button type="button" data-a="undo">${t("되돌리기")}</button></div>`;
  clearTimeout(undoT);undoT=setTimeout(()=>{$("#toastRoot").innerHTML="";ui.undo=null},busy?2500:4500)};
// 할 일: 꼭 할 일(오늘 손으로 하는 작업) / 확인만(살펴보고 판단) — 퀘스트 달성률은 꼭 할 일만
const TODO_CHECK0=["feeddev","bcsdue","feedchg","stock","withdraw","cull"];
function todoIsCheck(k){const o=(state.todoMust||{})[k];return o===undefined?TODO_CHECK0.includes(k):o==="check"}
const _questHead0=questHead;
questHead=function(todos){return _questHead0(todos.filter(x=>!todoIsCheck(x.k)))};
vTodo=function(){
  const todos=myTodoFilter(sortTodos(buildTodos())),st=stalls(),must=todos.filter(x=>!todoIsCheck(x.k)),chk=todos.filter(x=>todoIsCheck(x.k));
  let h=`<div class="pagehd"><h2>${t("할 일")}</h2></div>`;
  h+=questHead(todos)+myTodoBar()+todoSortBar()+supplyCard(todos)+hoBox();
  h+=`<div class="sec-t">${t("꼭 할 일")} <span>${must.reduce((s,x)=>s+leftOf(x),0)}</span></div>`;
  h+=must.length?`<div class="todolist">${must.map(todoBtn).join("")}</div>`:`<div class="empty">${t("오늘 할 일이 없습니다.")}</div>`;
  if(chk.length)h+=`<div class="sec-t">${t("확인만")} <span>${t("퀘스트에 넣지 않음")}</span></div><div class="todolist tl-chk">${chk.map(todoBtn).join("")}</div>`;
  h+=`<div class="sec-t">${t("장기 무변동 개체")} <span>${st.length}</span></div>`;
  h+=`<div class="note">${t("일정 기간 기록 변화가 없는 모돈입니다. 기록이 빠졌는지 확인해 주세요. 기준 일수는 설정에서 바꿀 수 있습니다.")}</div>`;
  h+=st.length?st.map(x=>`<div class="stall-it"><div style="min-width:0"><div class="sow-top" style="justify-content:flex-start;gap:8px"><button type="button" class="sow-no" data-a="sowd" data-v="${x.s.id}">${x.s.id}<span class="chev">›</span></button><span class="stage ${x.i.cls}">${x.i.label}</span></div><div class="why" style="color:${x.sev==="bad"?"var(--red)":"var(--amber)"}">${x.why}</div><div class="sow-loc">${t("현재")} ${x.s.loc} · ${x.i.sub}</div></div></div>`).join(""):`<div class="empty">${t("기록이 멈춘 개체가 없습니다.")}</div>`;
  return h};
// 대표 설정 › 할 일 순서: 묶음마다 [꼭]/[확인] 전환
const _vTodoRankSet0=vTodoRankSet;
vTodoRankSet=function(){let h=_vTodoRankSet0();
  return h.replace(/<span class="row2" style="gap:6px;flex:none"><button class="sbtn" type="button" data-a="tdRank" data-v="([a-z0-9]+)"/g,(m,k)=>`<span class="row2" style="gap:6px;flex:none"><button class="sbtn ${todoIsCheck(k)?"":"on"}" type="button" data-a="tdMust" data-v="${k}">${todoIsCheck(k)?t("확인만"):t("꼭")}</button><button class="sbtn" type="button" data-a="tdRank" data-v="${k}"`)
    .replace('</div><div class="panel">',`</div><div class="note">${t("‘꼭’ = 오늘 퀘스트(달성률)에 들어가는 작업 · ‘확인만’ = 할 일 아래 칸에 따로 보이고 달성률에서 뺌. 눌러서 바꿉니다.")}</div><div class="panel">`)};
Object.assign(A,{tdMust:v=>{const m=state.todoMust=state.todoMust||{};m[v]=todoIsCheck(v)?"must":"check";save();render()}});
// 주말·공휴일 앞날: 아침 점검을 다 마치면 바로 사료 주문 알림
function preNoDeliv(d=TODAY){return dow(d)===5||noDeliv(addDays(d,1))}
function feedOrderPop(){if(ui.foPop===TODAY)return;const P=amProg();if(P.done<P.all||!preNoDeliv())return;
  const g=(feedTodos().find(x=>x.k==="feedord")||{items:[]}).items;ui.foPop=TODAY;
  const nx=addDays(TODAY,1),why=dow(TODAY)===5?t("오늘(금) 오전 주문 → 내일(토) 도착 · 놓치면 월요일 도착"):dow(nx)===0?t("오늘(토) 주문 → 월요일 도착 · 일요일은 주문·배송 없음"):t("내일은 사료회사 휴무(공휴일) · 오늘 주문해야 함");
  $("#sheetRoot").innerHTML=`<div class="scrim" data-a="scrim"><div class="sheet" role="dialog" aria-modal="true"><div class="sh-hd"><h2>🚚 ${t("주말·휴일 전 사료 주문")}</h2><button class="x" type="button" data-a="closeSheet">${t("닫기")}</button></div><div class="sh-bd">
    <div class="warnbox" style="display:block"><b>${esc(why)}</b><br>${t("오전")} ${FARM.feed.orderCut} ${t("전에 주문해야 연휴 동안 사료가 떨어지지 않습니다.")}</div>
    ${g.length?`<div class="panel">${g.map(it=>`<div class="setrow"><span><b>${esc(it.feed.f)}</b></span><span class="sow-meta" style="color:${it.sev==="bad"?"var(--red)":"var(--amber)"}">${esc(it.label)}</span></div>`).join("")}</div>`:`<div class="note" style="color:var(--good)">✓ ${t("지금 재고로 휴일을 넘길 수 있습니다. 주문할 사료가 없습니다.")}</div>`}
    <div class="acts">${g.length?`<button class="act pri" type="button" data-a="todo" data-v="feedord">${t("사료 주문 할 일")} ›</button>`:""}<button class="act" type="button" data-a="tab" data-v="feedchk">${t("사료 잔량 점검")} ›</button></div></div></div></div>`}
["amAllOk","amSave"].forEach(k=>{const f0=A[k];A[k]=(...a)=>{const r=f0(...a);setTimeout(feedOrderPop,250);return r}});
// 날씨 경고: 영하권 진입 전날 · 37℃ 이상(전날부터) · 혹한 · 강풍
wxAlerts=function(day){const d=wxDay(day||0),n=wxDay((day||0)+1),W=FARM.wx;if(!d)return "";const a=[];
  if(d.max>=W.hot)a.push(`${t("폭염")} ${d.max}℃ · ${t("환기·급수·쿨링 점검")}`);
  else if(n&&n.max>=W.hot)a.push(`${t("내일 폭염")} ${n.max}℃ · ${t("오늘 쿨링·급수 미리 점검")}`);
  if(n&&n.min<=W.cold&&d.min>W.cold)a.push(`${t("내일 영하 진입")} ${n.min}℃ · ${t("급수관 동파·보온 미리 점검")}`);
  if(d.min<=W.freeze)a.push(`${t("한파")} ${d.min}℃ · ${t("급수 확인·보온")}`);
  if(d.wind>=W.wind)a.push(`${t("강풍")} ${Math.round(d.wind/3.6)}m/s · ${t("커튼·문·지붕 점검")}`);
  return a.map(x=>`<div class="bd-al wx">${x}</div>`).join("")};

// 도태 후보 기준 (대표 결정 2026-10-30): 최근 2산 총산 ≤9 · 난산 비율 ≥30% · 사산이 모돈군 평균보다 20%↑ · 무발정·장기 NPD · 반복 재발(난임) · 고산차
const CULL1={low:9,dys:30,still:20,anest:21,open:60,returns:2,parity:9};
cullRule=function(){const r={...CULL1,...(state.cullRule||{})};return r};
let CSX=null;function herdStill(){const k=state.records.length;if(CSX&&CSX.k===k)return CSX.v;const F=state.records.filter(r=>r.type==="분만");const v=F.length?F.reduce((s,r)=>s+(+r.data.still||0),0)/F.length:0;CSX={k,v};return v}
cullWhy=function(s){const i=statusOf(s);if(i.key==="도태됨"||i.gilt)return null;const R=cullRule(),w=[],st=sowState(s.id);
  const F=state.records.filter(r=>r.type==="분만"&&r.data.sow===s.id).sort((a,b)=>b.workDate.localeCompare(a.workDate)),tot=r=>(+r.data.live||0)+(+r.data.still||0)+(+r.data.mum||0);
  if(F.length>=2&&F.slice(0,2).every(r=>tot(r)<=R.low))w.push(`${t("총산")} ${F.slice(0,2).map(tot).join("·")}`);
  if(F.length>=2){const dy=F.filter(r=>r.data.ease&&r.data.ease!=="정상").length;if(dy/F.length*100>=R.dys)w.push(`${t("난산")} ${dy}/${F.length}${t("산")}`)}
  if(F.length>=3){const av=F.reduce((x,r)=>x+(+r.data.still||0),0)/F.length,h=herdStill();if(h>0&&av>=h*(1+R.still/100)&&av>=1)w.push(`${t("사산")} ${av.toFixed(1)}/${t("복")} (${t("평균")} ${h.toFixed(1)})`)}
  if(st.stage==="이유"&&diff(st.since,TODAY)>=R.anest)w.push(`${t("무발정")} ${diff(st.since,TODAY)}${t("일")}`);
  if((st.stage==="재교배"||st.stage==="이유")&&st.since&&diff(st.since,TODAY)>=R.open)w.push(`${t("비생산")} ${diff(st.since,TODAY)}${t("일")}`);
  if(st.returns>=R.returns)w.push(`${t("재발·공태")} ${st.returns}${t("회")}`);
  if(R.parity&&i.parity>=R.parity)w.push(`${i.parity}${t("산")}`);
  if(s.cullFlag)w.push(t(s.cullFlag));
  return w.length?[...new Set(w)].join(" · "):null};
cullRuleSet=function(){const R=cullRule(),row=(k,l,u)=>`<div class="setrow"><span>${t(l)}</span><div class="stepper"><button type="button" data-a="cullR" data-v="${k}" data-k="-1">−</button><input type="number" value="${R[k]}" readonly><button type="button" data-a="cullR" data-v="${k}" data-k="1">+</button></div></div>`;
  return `<div class="sec-t">${t("도태 후보 기준")} <span>${t("모돈 탭 ‘도태 후보’ 필터 · 배치도 ⚠")}</span></div><div class="panel">
    ${row("low","최근 2산 총산 이하 (두)")}${row("dys","난산 비율 이상 (%)")}${row("still","사산이 모돈군 평균보다 많음 (%↑)")}${row("anest","무발정: 이유 후 교배 없이 (일 이상)")}${row("open","비생산(이유·재발 후) 기간 (일 이상)")}${row("returns","재발·공태 횟수 이상 (난임)")}${row("parity","산차 이상 (0 = 안 봄)")}
    <div class="note">${t("지제(다리)·외상 같은 문제는 모돈 상세 › 도태 계획 세우기에서 사유를 골라 표시합니다.")}</div></div>`};
Object.assign(A,{cullR:(v,el)=>{const r=state.cullRule=state.cullRule||{};const step=v==="dys"||v==="still"?5*Number(el.dataset.k):Number(el.dataset.k);r[v]=Math.max(0,cullRule()[v]+step);save();render()}});

// ---- 배치도 칸: 현장 말 상태 + 이슈(할 일) 아이콘 · 대표 설정 › 배치도 칸 정보 ----
const BM_ISS=[["svax","💉","백신"],["lit","💉","복별 처치"],["ret","🔍","임신 진단"],["mate","❤","교배"],["mate2","❤","2차 교배"],["remate","❤","재교배"],["movein","🚚","분만사 이동"],["farrow","🐣","분만 예정"],["wean","🍼","이유"],["gfchg","🥣","급여량 변경"],["bcsdue","📏","BCS 측정"],["withdraw","💊","휴약 중"],["heat","🔥","발정 관찰"]];
const BM_THIRD=[["feed","급여"],["next","다음 일정"],["par","산차·BCS"],["none","안 보임"]];
function bmCfg(){const o=state.bmShow||{};return {status:o.status!==false,third:o.third||"feed",iss:{...Object.fromEntries(BM_ISS.map(x=>[x[0],true])),...(o.iss||{})}}}
let BMI=null;function bmIssues(){const k=TODAY+"|"+state.records.length+"|"+JSON.stringify(state.todoLog||{}).length;if(BMI&&BMI.k===k)return BMI.m;const m={},C=bmCfg();
  try{buildTodos().forEach(g=>{const d=BM_ISS.find(x=>x[0]===g.k);if(!d||!C.iss[g.k])return;g.items.forEach(it=>{const id=it.s&&it.s.id;if(!id)return;if(it.lit&&tdLog(tdKey("lit",it.lit)))return;(m[id]=m[id]||[]);if(!m[id].some(x=>x[1]===d[2]))m[id].push([d[1],d[2]])})})}catch(e){}
  BMI={k,m};return m}
const _stallLook0=stallLook;
stallLook=function(s,b){const lk=_stallLook0(s,b),st=sowState(s.id),i=statusOf(s);
  if(lk.c==="heat")lk.ph=`${t("교배 대기")} · ${t("이유")} ${diff(st.since,TODAY)}${t("일")}`;
  else if(lk.c==="mate"){const gd=diff(st.mate,TODAY);lk.ph=gd>=CFG.returnCheck[0]?`${t("진단 대기")} · ${gd}${t("일")}`:`${t("교배 후")} ${gd}${t("일")}`}
  else if(lk.c==="gilt")lk.ph=`${t("후보")} · ${t("교배 대기")}`;
  else if(lk.c==="ret")lk.ph=`${t("재교배 대기")}${st.since?" · "+diff(st.since,TODAY)+t("일"):""}`;
  const C=bmCfg();if(!C.status)lk.ph="";
  lk.iss=(bmIssues()[s.id]||[]).slice();if(C.iss.heat&&i.heat)lk.iss.push(["🔥","발정 관찰"]);
  return lk};
const _stallVal0=stallVal;
stallVal=function(lk){const m=ui.bmInfo||bmCfg().third;if(m==="none")return "";const o=ui.bmInfo;ui.bmInfo=m;const v=_stallVal0(lk);ui.bmInfo=o;return v};
function vBmShowSet(){const C=bmCfg();
  return `<div class="pagehd"><h2>${t("배치도 칸 정보")}</h2></div><div class="note">${t("배치도 칸(스톨)마다 보일 정보를 고릅니다. 작업자 화면에도 그대로 적용됩니다.")}</div>
  <div class="sec-t">${t("둘째 줄 · 지금 상태")}</div><div class="panel"><div class="setrow"><span>${t("교배 대기 · 진단 대기 · 임신 ○일 · 분만 D-○ · 포유 ○일")}</span><button class="sbtn ${C.status?"on":""}" type="button" data-a="bmShow" data-v="status">${C.status?t("보임"):t("숨김")}</button></div></div>
  <div class="sec-t">${t("셋째 줄 · 기본으로 보일 정보")}</div><div class="chipwrap">${BM_THIRD.map(([k,l])=>`<button type="button" class="chip wrap ${C.third===k?"on":""}" data-a="bmThird" data-v="${k}">${t(l)}</button>`).join("")}</div>
  <div class="sec-t">${t("넷째 줄 · 이슈 아이콘")} <span>${t("오늘 할 일에 걸린 모돈")}</span></div><div class="panel">${BM_ISS.map(([k,ic,l])=>`<div class="setrow"><span>${ic} ${t(l)}</span><button class="sbtn ${C.iss[k]?"on":""}" type="button" data-a="bmIss" data-v="${k}">${C.iss[k]?t("보임"):t("숨김")}</button></div>`).join("")}</div>
  <div class="note">${t("⚠ 도태 후보는 늘 모돈 번호 옆에 표시됩니다(기준: 대표 설정 › 현황판 항목 › 도태 후보 기준).")}</div>`}
Object.assign(A,{bmShow:v=>{const o=state.bmShow=state.bmShow||{};o[v]=!bmCfg()[v];BMI=null;save();render()},bmThird:v=>{(state.bmShow=state.bmShow||{}).third=v;ui.bmInfo=null;save();render()},
  bmIss:v=>{const o=state.bmShow=state.bmShow||{};o.iss=o.iss||{};o.iss[v]=!bmCfg().iss[v];BMI=null;save();render()}});

// ---- 성적 · 성적 TV 항목 (대표 설정 › 성적 항목: 켜기·끄기·순서) · NPD 는 TV 첫 줄 맨 끝 ----
if(!MET.some(m=>m[0]==="npd"))MET.push(["npd","NPD 비생산일수","일",1,-1]);
const _rangeMetrics0=rangeMetrics;
rangeMetrics=function(f,to){const r=_rangeMetrics0(f,to);if(r&&r.npd===undefined){try{const n=npdStat(f,to>TODAY?TODAY:to);r.npd=n?n.npd:null}catch(e){r.npd=null}}return r};
const ST_KPI0=["psy","msy","frate","live","wean","surv","dead","npd"],ST_CARD0=["psy","litter","week","dead","cause","feed","parity","grade","count","npd","fcr"];
function stOrd(k,all,def){const o=(state.stOrder||{})[k],off=new Set(((state.stOrder||{})[k+"Off"])||all.filter(x=>!def.includes(x)));const L=(o||def).filter(x=>all.includes(x));all.forEach(x=>{if(!L.includes(x))L.push(x)});return {L,off,on:L.filter(x=>!off.has(x))}}
const stKpi=()=>stOrd("kpi",MET.map(m=>m[0]),ST_KPI0),stCards=()=>stOrd("cards",CD_KEYS,ST_CARD0);
function cardMap(){const C=chartCards(),m={};CD_KEYS.forEach((k,i)=>m[k]=C[i]);return m}
vCharts=function(){const M=cardMap();return `<div class="sec-t">${t("성적 분석 그래프")} <span>${t("점에 손가락을 대면 값이 보입니다")}</span></div><div class="chartgrid">${stCards().on.filter(k=>M[k]).map(k=>`<div class="cd-go" data-a="chDetail" data-v="${k}">${M[k]}</div>`).join("")}</div>`};
const _vStatsTV0=vStatsTV;
vStatsTV=function(){STV_KPI.splice(0,STV_KPI.length,...stKpi().on.slice(0,8));
  const h=_vStatsTV0(),cut=h.indexOf('<div class="stv-grid');if(cut<0)return h;
  const S=ui.st,md=MET.find(m=>m[0]===S.metric)||MET[7],endYm=S.mode==="월"?S.ym:TODAY.slice(0,7),pts=months12(endYm).map(([y,m])=>{const v=rangeMetrics(...monthRange(y,m));return {y,m,v:v?v[md[0]]:null,src:v?v.src:null}});
  const M=cardMap(),ks=stCards().on.filter(k=>M[k]).slice(0,7),cells=[...ks.slice(0,6).map(k=>[k,M[k]]),["trend",`<div class="card"><h3>${t("월별 추이")} · ${t(md[1])}<small>${t("위 숫자를 누르면 바뀝니다")}</small></h3>${lineSvg(pts,md)}</div>`],...ks.slice(6,7).map(k=>[k,M[k]])],z=ui.stvZ;
  return h.slice(0,cut)+`<div class="stv-grid${z!=null?" zoom":""}">${cells.map(([k,c],i)=>z!=null&&z!==i?"":`<div class="stv-c" data-a="chDetail" data-v="${k}">${c}</div>`).join("")}</div></div>`};
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
// 설정 메뉴에 ‘배치도 칸 정보’·‘성적 항목’ 추가
const _vSettings0=vSettings;
vSettings=function(){const P=ui.setPage||"main",back=`<div class="pagehd"><button class="back" type="button" data-a="setPage" data-v="main">‹ ${t("설정")}</button></div>`;
  if(P==="bmshow"&&can("admin"))return back+vBmShowSet();if(P==="statset"&&can("admin"))return back+vStatSet();
  const h=_vSettings0();if(P!=="main"||!can("admin"))return h;
  const mi=(k,ti,d)=>`<button class="mitem" type="button" data-a="setPage" data-v="${k}"><span></span><span><b>${t(ti)}</b><small>${t(d)}</small></span><span>›</span></button>`;
  return h.replace(/<button class="mitem" type="button" data-a="setPage" data-v="labels">/,mi("statset","성적 항목","성적 탭·성적 TV 숫자와 그래프 켜기·끄기, 순서 (NPD 등)")+mi("bmshow","배치도 칸 정보","칸에 보일 상태·이슈 아이콘·셋째 줄 정보")+'<button class="mitem" type="button" data-a="setPage" data-v="labels">')};
const _questGauge0=questGauge;questGauge=function(todos){return _questGauge0(todos.filter(x=>!todoIsCheck(x.k)))};
