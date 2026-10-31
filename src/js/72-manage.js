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
// 도태 후보 기준 기본값(대표 설정에서 바꿈)
const CULL1={low:9,dys:30,still:4,anest:21,open:60,returns:2,parity:9};
function cullRule(){const r={...CULL1,...(state.cullRule||{})};return r}
function cullWhy(s){const i=statusOf(s);if(i.key==="도태됨"||i.gilt)return null;const R=cullRule(),w=[],st=sowState(s.id);
  const F=recsOf("분만").filter(r=>r.data.sow===s.id).sort((a,b)=>b.workDate.localeCompare(a.workDate)),tot=r=>(+r.data.live||0)+(+r.data.still||0)+(+r.data.mum||0);
  if(F.length>=2&&F.slice(0,2).every(r=>tot(r)<=R.low))w.push(`${t("총산")} ${F.slice(0,2).map(tot).join("·")}`);
  if(F.length>=2){const dy=F.filter(r=>isDys(r)).length;if(dy/F.length*100>=R.dys)w.push(`${t("난산")} ${dy}/${F.length}${t("산")}`)}
  if(st.stage==="이유"&&diff(st.since,TODAY)>=R.anest)w.push(`${t("무발정")} ${diff(st.since,TODAY)}${t("일")}`);
  if((st.stage==="재교배"||st.stage==="이유")&&st.since&&diff(st.since,TODAY)>=R.open)w.push(`${t("비생산")} ${diff(st.since,TODAY)}${t("일")}`);
  if(st.returns>=R.returns)w.push(`${t("재발·공태")} ${st.returns}${t("회")}`);
  if(R.parity&&i.parity>=R.parity)w.push(`${i.parity}${t("산")}`);
  if(s.cullFlag)w.push(t(s.cullFlag));
  return w.length?[...new Set(w)].join(" · "):null}
function cullRuleSet(){const R=cullRule(),row=(k,l,u)=>`<div class="setrow"><span>${t(l)}</span><div class="stepper"><button type="button" data-a="cullR" data-v="${k}" data-k="-1">−</button><input type="number" value="${R[k]}" readonly><button type="button" data-a="cullR" data-v="${k}" data-k="1">+</button></div></div>`;
  return `<div class="sec-t">${t("도태 후보 기준")} <span>${t("모돈 탭 ‘도태 후보’ 필터 · 배치도 ⚠")}</span></div><div class="panel">
    ${row("low","최근 2산 총산 이하 (두)")}${row("dys","난산 비율 이상 (%)")}${row("still","사산 몇 두 이상이면 난산 (분만 입력 때 자동)")}${row("anest","무발정: 이유 후 교배 없이 (일 이상)")}${row("open","비생산(이유·재발 후) 기간 (일 이상)")}${row("returns","재발·공태 횟수 이상 (난임)")}${row("parity","산차 이상 (0 = 안 봄)")}
    <div class="note">${t("지제(다리)·외상 같은 문제는 모돈 상세 › 도태 계획 세우기에서 사유를 골라 표시합니다.")}</div></div>`}
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
  calOpen:v=>{ui.calOpen=ui.calOpen===v?null:v;render()}
});
