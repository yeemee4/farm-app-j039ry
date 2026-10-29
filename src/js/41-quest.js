/* ================= v0.5 · 할 일 우선순위 · 퀘스트 달성률 · 백신 준비물 ================= */
// 할 일 묶음 기본 순위 (대표 설정 › 할 일 순서에서 바꿈)
const TODO_KINDS=[["pending","폐사 조치 판단 대기"],["handover","인계 메모"],["closemiss","기록 누락"],["feedchk","사료 잔량 점검"],["feeddev","사료 급여 점검"],["gfchg","임신돈 급여량 변경"],["bcsdue","BCS 측정"],["task","폐사 후 조치"],["am","아침 점검"],["farrow","분만 예정"],["movein","분만사 입식"],["lit","복별 처치 (1일·3일)"],["svax","모돈·후보돈 백신"],["bvax","돈군 백신"],["annual","연간 일괄 백신"],["mate2","2차 교배"],["mate","교배 대상"],["remate","재교배 대기"],["ret","재발·임신 확인"],["wean","이유 예정"],["order","정액 주문"],["feedord","사료 주문"],["feedchg","사료 변경"],["stock","재고 부족"],["withdraw","휴약 종료 예정"],["cull","도태 예정"]];
function todoRank(){const r=state.todoRank=state.todoRank||TODO_KINDS.map(x=>x[0]);TODO_KINDS.forEach(x=>{if(!r.includes(x[0]))r.push(x[0])});return r}
const TODO_SORTS=[["rank","우선순위"],["urgent","급한 순"],["count","남은 개수 많은 순"]];
function sortTodos(a,mode){const r=todoRank(),ri=x=>{const i=r.indexOf(x.k);return i<0?99:i},sv={bad:0,warn:1,ok:2},m=mode||ui.todoSort||"rank";
  return [...a].sort((x,y)=>m==="urgent"?sv[x.sev]-sv[y.sev]||ri(x)-ri(y):m==="count"?leftOf(y)-leftOf(x)||ri(x)-ri(y):ri(x)-ri(y))}
// 퀘스트 달성률
function questStat(todos){const tot=todos.reduce((s,x)=>s+x.items.length,0),left=todos.reduce((s,x)=>s+leftOf(x),0);return {tot,done:tot-left,pct:tot?Math.round((tot-left)/tot*100):100}}
function questHead(todos){const q=questStat(todos);
  return `<div class="quest"><div class="q-top"><b>${t("오늘의 퀘스트")}</b><span><b>${q.done}</b> / ${q.tot} · ${q.pct}%</span></div><div class="q-bar"><i style="width:${q.pct}%"></i></div></div>`}
function todoSortBar(){return `<div class="sowtools"><label class="sel"><span>${t("정렬")}</span><select data-ch="todoSort" aria-label="${t("정렬")}">${TODO_SORTS.map(([k,l])=>`<option value="${k}" ${(ui.todoSort||"rank")===k?"selected":""}>${t(l)}</option>`).join("")}</select></label></div>`}
document.addEventListener("change",e=>{if(e.target.dataset&&e.target.dataset.ch==="todoSort"){ui.todoSort=e.target.value;render()}});

// ---- 백신 준비물 ----
function supCfg(){const s=state.supply=state.supply||{};return {...FARM.supply,...s,dose:{...FARM.supply.dose,...(s.dose||{})}}}
const vaxByName=n=>[...FARM.vax.annual,...FARM.vax.gilt,...FARM.vax.late,...FARM.vax.piglet].find(v=>n===v.name||String(n).startsWith(v.name));
// 오늘 할 일 중 백신 묶음에서: 품목별 두수 → 병 수, 주사침 수
function todaySupplies(todos){const S=supCfg(),need={};let sowHeads=0,pigHeads=0;
  const add=(prods,n,pig)=>{[].concat(prods).forEach(p=>need[p]=(need[p]||0)+n);if(pig)pigHeads+=n;else sowHeads+=n};
  todos.forEach(x=>x.items.forEach(it=>{
    if(x.k==="svax"&&it.vx)add(it.vx.prod,1,false);
    else if(x.k==="bvax"&&it.v)add(it.v.p.prod,Math.max(0,it.v.need-it.v.done),true);
    else if(x.k==="annual"&&it.ann&&!tdLog(tdKey("annual",it.ann.key))){const v=vaxByName(it.ann.name);if(v)add(v.prod,activeSows().length,false)}}));
  const rows=Object.entries(need).filter(([,n])=>n>0).map(([p,n])=>({p,n,bottles:Math.ceil(n/(S.dose[p]||50)),per:S.dose[p]||50}));
  return {rows,sowN:Math.ceil(sowHeads/S.sowPer),pigN:Math.ceil(pigHeads/S.penHeads),S}}
function supplyCard(todos){const x=todaySupplies(todos);if(!x.rows.length)return "";
  const nd=[x.sowN?`${esc(x.S.sowNeedle)} ${x.sowN}${t("개")} (${t("모돈용")})`:"",x.pigN?`${esc(x.S.pigNeedle)} ${x.pigN}${t("개")} (${t("자돈용")})`:""].filter(Boolean);
  return `<div class="supply"><b>${t("오늘 준비물")}</b><div class="sup-list">${x.rows.map(r=>`<span>${esc(r.p)} <b>${r.bottles}${t("병")}</b> <small>${r.n}${t("두분")}</small></span>`).join("")}</div>${nd.length?`<div class="sup-nd">${t("주사침")}: ${nd.join(" · ")}</div>`:""}</div>`}

// ---- 대표 설정: 할 일 순서 · 백신·주사침 준비물 ----
function vTodoRankSet(){const r=todoRank(),nm=Object.fromEntries(TODO_KINDS);
  return `<div class="pagehd"><h2>${t("할 일 순서")}</h2></div><div class="note">${t("위에 있을수록 할 일 목록에서 먼저 나옵니다. 작업자는 할 일 화면에서 ‘급한 순’ 등으로 바꿔 볼 수도 있습니다.")}</div><div class="panel">${r.map((k,i)=>`<div class="setrow"><span><b>${i+1}.</b> ${t(nm[k]||k)}</span><span class="row2" style="gap:6px;flex:none"><button class="sbtn" type="button" data-a="tdRank" data-v="${k}" data-k="-1" ${i===0?"disabled":""} aria-label="위로">▲</button><button class="sbtn" type="button" data-a="tdRank" data-v="${k}" data-k="1" ${i===r.length-1?"disabled":""} aria-label="아래로">▼</button></span></div>`).join("")}</div>`}
function vSupplySet(){const S=supCfg();
  let h=`<div class="pagehd"><h2>${t("백신·주사침 준비물")}</h2></div><div class="note">${t("할 일의 백신 두수로 ‘오늘 준비물’(병 수·주사침 수)을 계산합니다. 접종을 기록하면 백신과 주사침 재고에서 자동으로 빠집니다.")}</div>`;
  h+=`<div class="sec-t">${t("1병당 접종 두수")}</div><div class="panel">${Object.keys(S.dose).map(p=>`<div class="setrow"><span>${esc(p)}</span><div class="stepper"><button type="button" data-a="supDose" data-v="${esc(p)}" data-k="-10" aria-label="줄이기">−</button><input type="number" value="${S.dose[p]}" readonly aria-label="${esc(p)}"><button type="button" data-a="supDose" data-v="${esc(p)}" data-k="10" aria-label="늘리기">+</button></div></div>`).join("")}</div>`;
  h+=`<div class="sec-t">${t("주사침")}</div><div class="panel">
    <div class="f"><label for="supSN">${t("모돈용 규격")}</label><input type="text" id="supSN" value="${esc(S.sowNeedle)}" data-sup="sowNeedle"></div>
    <div class="setrow"><span>${t("모돈 몇 두당 1개")}</span><div class="stepper"><button type="button" data-a="supNum" data-v="sowPer" data-k="-1">−</button><input type="number" value="${S.sowPer}" readonly><button type="button" data-a="supNum" data-v="sowPer" data-k="1">+</button></div></div>
    <div class="f"><label for="supPN">${t("자돈용 규격")}</label><input type="text" id="supPN" value="${esc(S.pigNeedle)}" data-sup="pigNeedle"></div>
    <div class="setrow"><span>${t("자돈 1돈방 두수 (1돈방 1개)")}</span><div class="stepper"><button type="button" data-a="supNum" data-v="penHeads" data-k="-5">−</button><input type="number" value="${S.penHeads}" readonly><button type="button" data-a="supNum" data-v="penHeads" data-k="5">+</button></div></div></div>`;
  return h}
Object.assign(A,{
  tdRank:(v,el)=>{const r=todoRank(),i=r.indexOf(v),j=i+Number(el.dataset.k);if(j<0||j>=r.length)return;[r[i],r[j]]=[r[j],r[i]];save();render()},
  supDose:(v,el)=>{const s=state.supply=state.supply||{};s.dose=s.dose||{};s.dose[v]=Math.max(1,supCfg().dose[v]+Number(el.dataset.k));save();render()},
  supNum:(v,el)=>{const s=state.supply=state.supply||{};s[v]=Math.max(1,supCfg()[v]+Number(el.dataset.k));save();render()}
});
document.addEventListener("change",e=>{const k=e.target.dataset&&e.target.dataset.sup;if(k){(state.supply=state.supply||{})[k]=e.target.value.trim();save()}});
// 주사침 재고: 모돈 백신 기록 n두 → n/sowPer 개, 돈군 백신 → 두수/penHeads 개
function needleUse(it,r){const S=supCfg();if(it.name==="주사침(모돈용)"&&r.type==="백신")return 1/S.sowPer;if(it.name==="주사침(자돈용)"&&r.type==="돈군백신")return (r.data.n||0)/S.penHeads;return 0}
// 홈 맨 위: 오늘의 퀘스트 반원 게이지
function questGauge(todos){const q=questStat(todos),r=52,L=Math.PI*r,p=q.pct/100;
  return `<button type="button" class="qgauge" data-a="tab" data-v="todo" data-tagme="1"><svg viewBox="0 0 132 76" aria-label="${t("오늘의 퀘스트")} ${q.pct}%"><path d="M14 70a52 52 0 0 1 104 0" fill="none" stroke="var(--grid)" stroke-width="12" stroke-linecap="round"/><path d="M14 70a52 52 0 0 1 104 0" fill="none" stroke="var(--accent)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${L*p} ${L}"/><text x="66" y="62" text-anchor="middle" class="qg-n">${q.pct}%</text></svg><span><h3>${t("오늘의 퀘스트")}</h3><p><b class="big">${q.done}</b> / ${q.tot} ${t("완료")} · ${t("남은")} ${q.tot-q.done}</p></span></button>`}
// ---- 디자인 테마 ----
const SKINS=[["","기본","지금 디자인"],["clean","클린 라이트","연회색 바탕 · 흰 카드 · 파랑 (삼쩜삼·토스)"],["night","나이트","짙은 남색 · 보라 (알라미)"],["fresh","프레시 그린","흰 바탕 · 초록 · 진한 칩 (네이버페이)"],["sport","스포츠 다크","검정 · 민트 · 굵은 글씨 (플랜핏)"],["soft","소프트 파스텔","아이보리 · 분홍 · 둥근 모서리 (로고)"]];
function mySkin(){try{const v=localStorage.getItem("farm-skin");return v===null?FARM.skin:v}catch(e){return FARM.skin}}
function applySkin(){const k=mySkin();if(k)document.documentElement.dataset.skin=k;else delete document.documentElement.dataset.skin}
function vSkinSet(){return `<div class="pagehd"><h2>${t("디자인 테마")}</h2></div><div class="panel">${SKINS.map(([k,n,d])=>`<div class="setrow"><span><b>${t(n)}</b><br><small class="sow-meta">${esc(d)}</small></span><button class="act ${mySkin()===k?"pri":""}" type="button" data-a="skin" data-v="${k}">${mySkin()===k?t("사용 중"):t("고르기")}</button></div>`).join("")}</div>`}
Object.assign(A,{skin:v=>{try{localStorage.setItem("farm-skin",v)}catch(e){}render()},icostyle:v=>{try{localStorage.setItem("farm-icon",v)}catch(e){}render()}});
// 개인 설정: 화면 디자인 (이 기기에만 적용)
function vMyDesign(){const s=mySkin(),i=iconStyle();return `<div class="f"><span class="lb">${t("화면 디자인")} <small class="sow-meta">${t("이 기기에만 적용")}</small></span><div class="chipwrap">${SKINS.map(([k,n])=>`<button type="button" class="chip wrap ${s===k?"on":""}" data-a="skin" data-v="${k}">${t(n)}</button>`).join("")}</div></div><div class="f"><span class="lb">${t("입력 아이콘")}</span><div class="chipwrap">${ICON_STYLES.map(([k,n])=>`<button type="button" class="chip wrap ${i===k?"on":""}" data-a="icostyle" data-v="${k}">${t(n)}</button>`).join("")}</div></div>`}
// ---- 저장 후 5초 '되돌리기' ----
let undoT=null;
function undoToast(m,ids){ui.undo={ids,loc:ui.undoLoc||{}};ui.undoLoc=null;$("#toastRoot").innerHTML=`<div class="toast undo" role="status"><span>${esc(m)}</span><button type="button" data-a="undo">${t("되돌리기")}</button></div>`;clearTimeout(undoT);undoT=setTimeout(()=>{$("#toastRoot").innerHTML="";ui.undo=null},5000)}
// ---- 아침 점검: 남은 돈사 모두 이상 없음 ----
// ---- 백신: 남은 모돈 한꺼번에 접종 기록 ----
Object.assign(A,{
  undo:()=>{const U=ui.undo;if(!U)return;state.records=state.records.filter(r=>!U.ids.includes(r.id));Object.entries(U.loc).forEach(([s,l])=>{const sw=state.sows.find(x=>x.id===s);if(sw)sw.loc=l});ui.undo=null;save();clearTimeout(undoT);$("#toastRoot").innerHTML="";render();toast(t("되돌렸습니다"))},
  amAllOk:()=>{const D=amDay(TODAY),left=FARM.morning.route.filter(r=>!D[r.barn]);if(!left.length)return;if(!confirm(`${left.map(r=>t(r.barn)).join(", ")} — ${t("모두 이상 없음으로 저장할까요?")}`))return;
    left.forEach(r=>D[r.barn]={time:nowHM(),temp:"",bad:[],memo:"",user:state.user,at:new Date().toISOString(),bulk:true});save();toast(t("저장했습니다"));render()},
  vaxAll:()=>{const g=buildTodos().find(x=>x.k==="svax");if(!g||!g.items.length)return;if(!confirm(`${g.items.length}${t("두")} — ${t("오늘 접종으로 한꺼번에 기록할까요?")}`))return;
    const ids=g.items.map(it=>addRecord("백신",TODAY,{sow:it.s.id,kind:"백신",name:it.vx.name}).id);save();closeSheet();render();undoToast(`${t("모돈 백신")} ${ids.length}${t("두")} ${t("저장했습니다")}`,ids)}
});
