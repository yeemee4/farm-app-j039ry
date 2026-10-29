/* ================= v0.5 · 내 할 일 · 인계 메모 · 도태 후보 · 주간 달력 ================= */
// 18. 내 할 일: 나에게 담당된 묶음만
function myTodoFilter(todos){if(!ui.myTodo)return todos;const m=me()||{};return todos.filter(x=>(state.assign||{})[TODAY+"|"+x.k]===m.name)}
function myTodoBar(){const m=me()||{},n=buildTodos().filter(x=>(state.assign||{})[TODAY+"|"+x.k]===m.name).length;
  return `<div class="chips"><button type="button" class="chip ${ui.myTodo?"":"on"}" data-a="myTodo" data-v="0">${t("전체")}</button><button type="button" class="chip ${ui.myTodo?"on":""}" data-a="myTodo" data-v="1">${t("내 할 일")} ${n}</button><button type="button" class="chip" data-a="tab" data-v="cal">📅 ${t("주간 달력")}</button></div>`}
// 19. 인계 메모: 내일(또는 모레) 할 일로 넘김
function hoTodos(){const L=(state.handover||[]).filter(h=>h.due<=REF),items=L.filter(h=>{const lg=tdLog(tdKey("handover",h.id));return !lg||localDateOf(lg.at)===TODAY}).map(h=>({ho:h,label:`${esc(h.user)} · ${kDate(h.at.slice(0,10))}${h.due<REF?" · "+t("밀림"):""}`,sev:h.due<REF?"bad":"warn"}));
  return [{k:"handover",t:"인계 메모",items,act:null}]}
function hoBox(){return `<div class="panel ho"><div class="row2"><input type="text" id="hoText" placeholder="${t("인계 메모 (예: 내일 아침 6-008 분만 확인)")}" aria-label="${t("인계 메모")}"><button class="act pri" type="button" data-a="hoAdd">${t("내일로")}</button></div></div>`}
// 20. 도태 후보 (기준은 대표 설정)
const CULL0={parity:7,returns:2,low:9};
function cullRule(){return {...CULL0,...(state.cullRule||{})}}
function cullWhy(s){const i=statusOf(s);if(i.key==="도태됨"||i.gilt)return null;const R=cullRule(),w=[];
  if(i.parity>=R.parity)w.push(`${i.parity}${t("산")}`);if(i.returns>=R.returns)w.push(`${t("재발·공태")} ${i.returns}${t("회")}`);
  const fs=state.records.filter(r=>r.type==="분만"&&r.data.sow===s.id).sort((a,b)=>b.workDate.localeCompare(a.workDate)).slice(0,2);
  if(fs.length===2&&fs.every(r=>r.data.live<=R.low))w.push(`${t("실산")} ${fs.map(r=>r.data.live).join("·")}`);
  return w.length?w.join(" · "):null}
function cullRuleSet(){const R=cullRule();return `<div class="sec-t">${t("도태 후보 기준")} <span>${t("모돈 탭 ‘도태 후보’ 필터")}</span></div><div class="panel">${[["parity","산차 이상"],["returns","재발·공태 횟수 이상"],["low","최근 2복 실산 이하"]].map(([k,l])=>`<div class="setrow"><span>${t(l)}</span><div class="stepper"><button type="button" data-a="cullR" data-v="${k}" data-k="-1">−</button><input type="number" value="${R[k]}" readonly><button type="button" data-a="cullR" data-v="${k}" data-k="1">+</button></div></div>`).join("")}</div>`}
// 22. 주간 달력: 이번 주 + 다음 주 예정
function calEvents(){const ev={},add=(d,k,txt)=>{(ev[d]=ev[d]||[]).push([k,txt])},w0=weekStart(TODAY),end=addDays(w0,13);
  activeSows().forEach(s=>{const i=statusOf(s);
    if(i.stage==="임신"||i.stage==="교배"){const due=addDays(i.mate,CFG.gest);if(due>=w0&&due<=end)add(due,"분만",s.id);const rc=addDays(i.mate,FARM.pregDays[0]);if(i.stage==="교배"&&rc>=w0&&rc<=end)add(rc,"임신확인",s.id);
      FARM.vax.late.forEach(v=>{const d=addDays(due,-v.wk*7);if(d>=w0&&d<=end&&!sowVaxDone(s.id,v.name,i.mate))add(d,"백신",s.id+" "+v.name.split(" (")[0])})}
    if(i.stage==="포유"){const d=addDays(i.farrow,CFG.weanDay);if(d>=w0&&d<=end)add(d,"이유",s.id)}
    if(i.stage==="이유"){const d=addDays(i.since,4);if(d>=w0&&d<=end)add(d,"교배",s.id)}});
  liveBatches().forEach(b=>state.cfg.prog.forEach(p=>{const d=addDays(b.k,p.day),v=bVax(b,p);if(d>=w0&&d<=end&&v.st!=="done")add(d,"돈군백신",bName(b.k).replace(" 돈군","")+" "+p.name)}));
  [y=>y].forEach(()=>FARM.vax.annual.forEach(v=>v.when.forEach(([m,w,r])=>{const d=annualDate(+TODAY.slice(0,4),m,w);if(d>=w0&&d<=end)add(d,"백신",`${v.name} ${r} (${t("전체")})`)})));
  return {ev,w0}}
function vCal(){const {ev,w0}=calEvents(),O=ui.calOpen;
  let h=`<div class="pagehd"><button class="back" type="button" data-a="tab" data-v="todo">‹ ${t("할 일")}</button><h2>${t("주간 달력")}</h2></div><div class="note">${t("이번 주와 다음 주에 예정된 일입니다. 날짜를 누르면 모돈 번호가 보입니다.")}</div>`;
  for(let wk=0;wk<2;wk++){h+=`<div class="sec-t">W${isoWeek(addDays(w0,wk*7)).w} ${wk?t("다음 주"):t("이번 주")}</div><div class="cal">`;
    for(let i=0;i<7;i++){const d=addDays(w0,wk*7+i),E=ev[d]||[],g={};E.forEach(([k,x])=>(g[k]=g[k]||[]).push(x));
      h+=`<button type="button" class="cal-d ${d===TODAY?"today":""} ${d<TODAY?"past":""}" data-a="calOpen" data-v="${d}"><b>${kDate(d)}</b><span class="cal-c">${Object.entries(g).map(([k,a])=>`<i style="--c:${(TYPES[k]||{}).c||"var(--muted)"}">${esc(L(k))} ${a.length}</i>`).join("")||`<em>-</em>`}</span>${O===d?`<span class="cal-x">${Object.entries(g).map(([k,a])=>`<span><b>${esc(L(k))}</b> ${a.map(esc).join(", ")}</span>`).join("")}</span>`:""}</button>`}
    h+=`</div>`}
  return h}
Object.assign(A,{
  myTodo:v=>{ui.myTodo=v==="1";render()},
  hoAdd:()=>{const v=($("#hoText").value||"").trim();if(!v)return;(state.handover=state.handover||[]).push({id:newId(),text:v,due:addDays(TODAY,1),user:state.user,at:new Date().toISOString()});save();render();toast(t("내일 할 일로 넘겼습니다"))},
  cullR:(v,el)=>{const r=state.cullRule=state.cullRule||{};r[v]=Math.max(0,cullRule()[v]+Number(el.dataset.k));save();render()},
  calOpen:v=>{ui.calOpen=ui.calOpen===v?null:v;render()}
});
