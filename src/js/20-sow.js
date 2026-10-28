/* ================= 모돈 상태 ================= */
let EXCL=null,SIDX=null;
function sowState(id){
  if(!SIDX){SIDX={};state.records.forEach(r=>{if(r.data&&r.data.sow&&(r.type==="교배"||r.type==="임신확인"||r.type==="분만"||r.type==="이유"))(SIDX[r.data.sow]=SIDX[r.data.sow]||[]).push(r)})}
  const evs=(SIDX[id]||[]).filter(r=>r.id!==EXCL)
    .sort((a,b)=>a.workDate.localeCompare(b.workDate)||a.createdAt.localeCompare(b.createdAt));
  let st={stage:"후보",since:null,mate:null,farrow:null,live:0,farrows:0,returns:0,lastResult:"",pregEver:false};
  evs.forEach(e=>{
    if(e.type==="교배"){if(!(st.stage==="교배"&&diff(st.mate,e.workDate)<=3))st={...st,stage:"교배",since:e.workDate,mate:e.workDate}}
    else if(e.type==="임신확인"){if(e.data.result==="임신")st={...st,stage:"임신",since:st.mate,pregEver:true};else st={...st,stage:"재교배",since:e.workDate,returns:st.returns+1,lastResult:e.data.result}}
    else if(e.type==="분만")st={...st,stage:"포유",since:e.workDate,farrow:e.workDate,live:e.data.live,farrows:st.farrows+1,pregEver:true};
    else if(e.type==="이유")st={...st,stage:"이유",since:e.workDate};
  });
  return st;
}
const culledRec=id=>state.records.find(r=>r.type==="도태"&&r.data.sow===id);
const activeSows=()=>state.sows.filter(s=>!culledRec(s.id));
const STATUS_KEYS=[["후보","후보돈"],["발정대기","발정 대기"],["확인전","확인 전"],["임신","임신"],["분만임박","분만 임박"],["포유","포유"],["재발공태","재발·공태"],["도태예정","도태 예정"],["도태됨","도태됨"]];
function matchStatus(s,i,k){
  if(k==="전체")return i.key!=="도태됨";
  if(k==="후보")return i.gilt;
  if(k==="도태예정")return !!s.cullPlan&&i.key!=="도태됨";
  return i.key===k;
}

/* ================= 장기 무변동 ================= */
function stalls(){
  const T=state.cfgSt||CFG.st,out=[];
  activeSows().forEach(s=>{
    const i=statusOf(s),d=i.d;const push=(why,sev="warn")=>out.push({kind:"stall",s,i,why,sev});
    if(i.stage==="이유"&&d>=T.weanNoMate)push(`이유 후 ${d}일째 교배 기록 없음`,"bad");
    if(i.stage==="이유"&&d>=7&&s.loc==="분만사")push(`이유 후 ${d}일째 위치가 분만사 (이동 기록 없음)`);
    if(i.stage==="포유"&&!weanSkip(s)&&d>=T.farrowNoWean)push(`분만 후 ${d}일째 이유 기록 없음`,"bad");
    if(i.stage==="포유"&&s.loc!=="분만사")push(`포유 중인데 위치가 ${s.loc}`);
    if(i.stage==="교배"&&d>=T.mateNoCheck)push(`교배 후 ${d}일째 임신 확인 없음`,"bad");
    if(i.stage==="임신"&&d>=T.gestOver)push(`교배 후 ${d}일째 분만 기록 없음`,"bad");
    if(i.stage==="임신"&&CFG.gest-d<=3&&s.loc!=="분만사")push(`분만 ${Math.max(CFG.gest-d,0)}일 전인데 위치가 ${s.loc}`);
    if(i.stage==="후보"&&s.intro&&d>=T.giltNoMate)push(`후보돈 도입 후 ${d}일째 교배 없음`);
  });
  return out;
}

/* ================= 할 일 ================= */
const tdKey=(k,target)=>k==="task"||k==="lit"||k==="annual"||k==="feedchg"?`${k}|${target}`:`${TODAY}|${k}|${target}`;
const tdLog=key=>(state.todoLog||{})[key];
function itemTarget(it){return it.am?it.am.barn:it.fc?it.fc.key:it.feed?it.feed.f:it.lit?it.lit:it.ann?it.ann.key:it.vx?it.s.id+"|"+it.vx.name:it.t?it.t.id:it.s?it.s.id:it.b?it.b.k+"|"+it.v.p.name:it.item?it.item.id:it.order?"semen":it.day?it.day.k:it.r.id}
function tdName(it){return it.am?it.am.barn:it.fc?bName(it.fc.b.k)+" "+it.fc.p.feed:it.feed?it.feed.f+" 주문":it.lit?it.s.id+"번 "+it.name:it.ann?it.ann.name:it.vx?it.s.id+"번 "+it.vx.name:it.t?it.t.title:it.s?it.s.id+"번":it.b?bName(it.b.k)+" "+it.v.p.name:it.item?it.item.name:it.order?"정액 주문":it.day?it.day.barn:it.r.data.barn}
function buildTodos(){
  const g={mate:[],remate:[],ret:[],preg:[],movein:[],farrow:[],wean:[],withdraw:[],cull:[]};
  activeSows().forEach(s=>{
    const i=statusOf(s);
    if(i.stage==="이유"&&i.d>=CFG.weanMateLimit-1&&i.d<state.cfgSt.weanNoMate)g.mate.push({s,i,label:`이유 D+${i.d}`,sev:i.d>CFG.weanMateLimit?"bad":"warn"});
    if(i.key==="후보"&&i.d>=7&&i.d<state.cfgSt.giltNoMate)g.mate.push({s,i,label:`후보돈 · 도입 ${i.d}일째`,sev:"ok"});
    if(i.stage==="재교배")g.remate.push({s,i,label:`${i.lastResult} ${kDate(i.since)}`,sev:"warn"});
    if(i.stage==="교배"&&i.d>=CFG.returnCheck[0]&&i.d<state.cfgSt.mateNoCheck){const pd=FARM.pregDays,inP=i.d>=pd[0]&&i.d<=pd[1];
      g.ret.push({s,i,label:`교배 D+${i.d}${inP?" · 진단 적기":i.d>pd[1]?" · 진단 늦음":""}`,sev:i.d>pd[1]?"bad":inP?"warn":"ok"})}
    if(i.stage==="임신"){const due=addDays(i.mate,CFG.gest);
      if(i.d>=CFG.gest-CFG.farrowIn&&s.loc!=="분만사")g.movein.push({s,i,label:`분만 예정 ${kDate(due)}`,sev:i.d>=CFG.gest-3?"bad":"warn"});
      if(i.d>=CFG.gest-2&&i.d<state.cfgSt.gestOver)g.farrow.push({s,i,label:i.d>CFG.gest?`예정일 ${i.d-CFG.gest}일 지남`:i.d===CFG.gest?"오늘 예정":`${CFG.gest-i.d}일 후 예정`,sev:i.d>CFG.gest+1?"bad":"warn"})}
    if(i.stage==="포유"&&!weanSkip(s)&&i.d>=CFG.weanDay&&i.d<state.cfgSt.farrowNoWean)g.wean.push({s,i,label:`포유 ${i.d}일`,sev:i.d>CFG.weanDay+3?"bad":"ok"});
    if(s.cullPlan&&s.cullPlan.date<=addDays(REF,7))g.cull.push({s,i,label:`도태 예정 ${kDate(s.cullPlan.date)} · ${s.cullPlan.reason}`,sev:s.cullPlan.date<=REF?"bad":"warn"});
  });
  state.records.filter(r=>r.type==="약품"&&r.data.withdraw).forEach(r=>{const d=diff(REF,r.data.withdraw);if(d>=0&&d<=7)g.withdraw.push({r,label:`${r.data.barn} · 휴약 종료 ${kDate(r.data.withdraw)}`,d,sev:"ok"})});
  const pending=deadPending();
  const tasks=(state.tasks||[]).filter(t=>{const l=tdLog(tdKey("task",t.id));return !l||localDateOf(l.at)===TODAY}).sort((a,b)=>a.due.localeCompare(b.due))
    .map(t=>({t,label:`${t.due<REF?`${diff(t.due,REF)}일 지남`:t.due===REF?"오늘":kDate(t.due)} · 담당 ${t.who}`,sev:t.due<REF?"bad":t.due===REF?"warn":"ok"}));
  const sevOf=a=>a.some(x=>x.sev==="bad")?"bad":a.some(x=>x.sev==="warn")?"warn":"ok";
  return [
    {k:"pending",t:"폐사 조치 판단 대기",items:pending,act:"judge"},
    {k:"task",t:"폐사 후 조치",items:tasks,act:null},
    {k:"mate",t:"교배 대상 (이유 후 4일 · 후보돈)",items:g.mate,act:"교배"},
    {k:"remate",t:"재교배 대기 (재발·공태)",items:g.remate,act:"교배"},
    {k:"ret",t:"재발·임신 확인 (교배 18일~ · 진단 21~23일)",items:g.ret,act:"check"},
    {k:"movein",t:"분만사 입식 (분만 7일 전)",items:g.movein,act:"movein"},
    {k:"farrow",t:"분만 예정",items:g.farrow,act:"분만"},
    {k:"wean",t:"이유 예정 (포유 28일~)",items:g.wean,act:"이유"},
    {k:"cull",t:"도태 예정",items:g.cull,act:"cull"},
    {k:"withdraw",t:"휴약 종료 예정",items:g.withdraw,act:null},...extraTodos()
  ].filter(x=>x.items.length).map(x=>({...x,sev:sevOf(x.items)}));
}
const leftOf=x=>x.k==="pending"?x.items.length:x.items.filter(it=>!tdLog(tdKey(x.k,itemTarget(it)))).length;

/* ================= 마감 ================= */
function dayStatus(day,type){
  const n=state.records.filter(r=>r.type===type&&r.workDate===day).length;
  if(n)return {s:"ok",n};
  if(state.zero[day]&&state.zero[day][type])return {s:"zero",n:0};
  return {s:"miss",n:0};
}

/* ================= 요약 문장 ================= */
