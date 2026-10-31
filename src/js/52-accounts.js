/* ================= v0.3 · 목록·계정·권한 ================= */
const SEMENS=["듀록 정액","요크셔 정액","랜드레이스 정액","자연교배"],DESTS=["○○도축장","△△공판장"];
const LISTDEF={barns:["돈사",BARNS],causes:["폐사 원인",CAUSES],actions:["조치 종류",ACTIONS],semens:["정액·교배 방법",SEMENS],dests:["출하처",DESTS],cull:["도태 사유",CULL_REASONS]};
const LISTFIELDS={barns:["barn","from","to"],causes:["cause"],semens:["semen"],dests:["dest"],cull:["reason"]};
const mkList=a=>a.map(n=>({n,h:false}));
function syncLists(){
  if(!state.lists)return;
  Object.keys(LISTDEF).forEach(k=>{const arr=LISTDEF[k][1],L2=state.lists[k];if(!L2)return;arr.length=0;L2.filter(x=>!x.h).forEach(x=>arr.push(x.n))});
  WORKERS.length=0;(state.accounts||[]).filter(a=>a.active).forEach(a=>WORKERS.push(a.name));
}
let ME=null;const SKEY=KEY+"-session";
const me=()=>(state.accounts||[]).find(a=>a.id===ME&&a.active);
const ROLE={admin:"대표",leader:"팀장",worker:"작업자"};
function can(x,r){const m=me();if(!m)return false;const R=m.role;
  if(x==="admin")return R==="admin";
  if(x==="edit")return R!=="worker"||(r&&r.user===m.name);
  return R!=="worker"; // delete · cull · assign
}
const navLabel=k=>(state.labels&&state.labels.nav&&state.labels.nav[k])||t(k==="more"?"더보기":NAV.find(n=>n[0]===k)[1]);

/* ================= v0.3 · 상태 문구 (번역) ================= */
function statusOf(s){return memo("st|"+s.id,()=>statusOf0(s))}
function statusOf0(s){
  const st=sowState(s.id),c=culledRec(s.id),parity=s.baseParity+st.farrows;
  const gilt=!!s.gilt&&!st.pregEver;
  if(c)return {...st,parity,gilt:false,key:"도태됨",label:t("도태됨"),sub:`${kDate(c.workDate)} · ${c.data.reason}`,cls:"x",heat:false,d:0};
  let key,label,sub,cls,heat=false,d=0;
  if(st.stage==="후보"){d=s.intro?diff(s.intro,REF):0;key="후보";label=t("후보돈");sub=s.intro?`${t("도입")} ${d}${t("일")}`:"-";cls="c-gilt"}
  else if(st.stage==="이유"){d=diff(st.since,REF);key="발정대기";label=t("발정 대기");sub=`${t("이유")} D+${d}`;heat=d>=3&&d<=7;cls="c-wean"}
  else if(st.stage==="교배"){d=diff(st.mate,REF);key="확인전";label=t("교배 · 확인 전");sub=`${t("교배")} D+${d}`;heat=d>=18&&d<=24;cls="c-mate"}
  else if(st.stage==="임신"){d=diff(st.mate,REF);const left=CFG.gest-d;
    if(left<=CFG.farrowIn){key="분만임박";label=t("분만 임박");sub=left>0?`${t("분만")} D−${left}`:left===0?t("오늘 분만 예정"):`${t("분만")} +${-left}${t("일 지남")}`;cls="c-due"}
    else{key="임신";label=t("임신");sub=`${t("임신")} ${d}${t("일")}`;cls="c-preg"}}
  else if(st.stage==="포유"){d=diff(st.farrow,REF);key="포유";label=t(s.nurse?"대리모":"포유");sub=s.nurse?`${t("대리모")} ${diff(s.nurse.since,REF)}${t("일")}`:`${t("포유")} ${d}${t("일")} · ${t("실산")} ${st.live}${st.foster?` (${t("양자")} ${st.foster>0?"+":""}${st.foster})`:""}`;cls="c-lac";
    if(s.weanHold&&s.weanHold.until>=REF)sub+=` · ${t("이유 보류")} ~${kDate(s.weanHold.until)}`}
  else {d=diff(st.since,REF);key="재발공태";label=t(st.lastResult||"재발");sub=`${t(st.lastResult)} D+${d} · ${t("재교배 대기")}`;heat=true;cls="c-ret"}
  return {...st,parity,gilt,key,label,sub,cls,heat,d,plan:s.cullPlan};
}
function summary(r){const d=r.data;switch(r.type){
  case "동기화":return `${t("발정동기화 시작")} · ${(d.sows||[]).length}${t("두")} · ${d.ml}mL · ${d.at}`;
  case "레규급여":return `${t("레규메이트 급여")} ${d.day}${t("일째")} · ${d.n}${t("두")} · ${d.ml}mL · ${d.time}${d.off?" ⚠":""}`;
  case "폐사":return `${d.barn} ${t(d.stage)} ${t("폐사")} ${d.n}${t("두")} · ${t(d.cause)}${d.sow?` · ${d.sow}${t("의 복")}`:""}`;
  case "교배":return `${d.sow} ${t("교배")} (${t(d.round)}) · ${d.semen}`;
  case "임신확인":return `${d.sow} ${t(d.result)}`;
  case "분만":return `${d.sow} ${t("분만")} · ${t("실산")} ${d.live} / ${t("사산")} ${d.still} / ${t("미라")} ${d.mum}${d.ease&&d.ease!=="정상"?` · ${t(d.ease)}`:""}${d.oxy==="씀"?` · ${t("옥시토신")}`:""}${d.start?` · ${d.start}`:""}`;
  case "이유":return `${d.sow} ${t("이유")} ${d.n}${t("두")} · ${d.days}${t("일")}`;
  case "백신":return `${d.sow} ${t(d.kind)} · ${d.name}${d.memo?` · ${d.memo}`:""}`;
  case "양자":return `${t("양자")} ${d.sow} → ${d.to} ${d.n}${t("두")}`;
  case "실사":return `${t("재고두수 실사")} · ${d.barn} ${d.n}${t("두")} (${t("장부")} ${d.est})`;
  case "이동":return d.sow?`${d.sow} ${d.from} → ${d.to}`:`${d.from} → ${d.to} ${d.n}${t("두")}`;
  case "출하":return `${d.barn} ${t("출하")} ${d.n}${t("두")} · ${d.kg}kg · ${d.dest}`;
  case "사료":return `${d.kind} ${t(d.mode)} ${Number(d.kg).toLocaleString()}kg`;
  case "약품":return `${t(d.kind)} · ${d.barn} · ${d.name}${d.qty?` ${d.qty}${(state.items.find(i=>i.name===d.name)||{}).unit||""}`:""}${d.withdraw?` · ~${kDate(d.withdraw)}`:""}`;
  case "특이사항":return `${d.barn} · ${d.text}`;
  case "도입":return `${t("후보돈")} ${d.sow} · ${d.breed} · ${d.age}${t("일")}`;
  case "조치":return `[${t(d.task)}] ${d.target} ✓${d.memo?` · ${d.memo}`:""}`;
  case "도태":return `${d.sow} ${t("도태됨")} · ${d.reason}`;
  case "BCS":return `${d.sow} BCS ${d.score} (${t(d.when)})${d.memo?` · ${d.memo}`:""}`;
  case "돈군백신":return `${bName(d.batch)} ${d.vax} ${d.n}${t("두")}${d.lot?` · ${d.lot}`:""}`;
  case "재고":{const it=itemById(d.item)||{name:"?",unit:""};return `${it.name} ${t(d.mode)} ${d.qty}${it.unit}${d.memo?` · ${d.memo}`:""}`}
}return ""}

/* ================= v0.3 · 폐사 알림 기준 ================= */
function deadPending(){
  const C=state.cfg,out=[];
  const recs=recsOf("폐사").filter(r=>diff(r.workDate,TODAY)<=7);
  recs.forEach(r=>{if(r.data.n>=C.deadOne&&!r.data.decision)out.push({r,pending:true,label:`${kDate(r.workDate)} · ${summary(r)}`,sev:"bad"})});
  const g={};recs.forEach(r=>{const k=r.workDate+"|"+r.data.barn;(g[k]=g[k]||[]).push(r)});
  Object.entries(g).forEach(([k,rs])=>{const day=dayGroup(k,rs);if(day.pending)out.push({day,pending:true,label:`${kDate(day.date)} · ${day.barn} ${t("하루 합계")} ${day.total}${t("두")} (${rs.length}${t("건")})`,sev:"bad"})});
  return out;
}
function dayGroup(k,rs){
  const C=state.cfg,[date,...b]=k.split("|"),barn=b.join("|"),total=rs.reduce((s,r)=>s+r.data.n,0);
  const bigOpen=rs.some(r=>r.data.n>=C.deadOne&&!r.data.decision);
  const dd=(state.dayDec||{})[k];
  const covered=Math.max(dd?dd.total:0,rs.filter(r=>r.data.n>=C.deadOne&&r.data.decision).reduce((s,r)=>s+r.data.n,0));
  return {k,date,barn,total,cnt:rs.length,rs,dd,pending:total>=C.deadDay&&!bigOpen&&total>covered};
}

