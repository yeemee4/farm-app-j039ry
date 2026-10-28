/* ================= 라우팅 ================= */
const NAV=[["home","홈"],["todo","할 일"],["sows","모돈"],["batch","돈군"],["drug","약품·재고"],["stats","성적"],["board","현황판"],["tl","타임라인"],["close","마감"],["settings","설정"]];
const MNAV=["home","todo","sows","batch","more"];
const ICONS={
  home:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  todo:'<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
  sows:'<circle cx="12" cy="12" r="8"/><circle cx="10" cy="12" r="1"/><circle cx="14" cy="12" r="1"/>',
  batch:'<circle cx="7" cy="9" r="3"/><circle cx="17" cy="9" r="3"/><circle cx="12" cy="16" r="3"/>',
  drug:'<rect x="4" y="9" width="16" height="7" rx="3.5"/><path d="M12 9v7"/>',
  stats:'<path d="M5 20V10M12 20V4M19 20v-7"/>',
  board:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  tl:'<path d="M4 6h16M4 12h16M4 18h10"/>',
  close:'<path d="M5 12l4 4 10-10"/><rect x="2" y="2" width="20" height="20" rx="4"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  more:'<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>'
};
let tab="home",ui={st:{mode:"월",ym:TODAY.slice(0,7),yq:`${TODAY.slice(0,4)}-${Math.ceil(+TODAY.slice(5,7)/3)}`,yr:"rolling",cmp:"prev",from:addDays(TODAY,-27),to:TODAY,metric:"live",yy:+TODAY.slice(0,4)},sowRf:"전체",prev:"home",tlFilter:"전체",sf:"전체",sowQ:"",statsDays:28,closeDay:TODAY,delId:null,memo:{},in:null,dec:null,cull:null};
function navBadge(k){
  if(k==="todo"){return buildTodos().reduce((s,x)=>s+leftOf(x),0)+stalls().length}
  if(k==="close"||k==="more")return missCount(TODAY)+missCount(addDays(TODAY,-1));
  return 0;
}
function go(t){tab=t;ui.delId=null;ui.dec=null;if(t==="close")ui.closeDay=TODAY;render();window.scrollTo(0,0)}

/* ================= 홈 ================= */
function statusCounts(){const c={};activeSows().forEach(s=>{const i=statusOf(s);c[i.key]=(c[i.key]||0)+1;if(i.gilt&&i.key!=="후보")c["후보"]=(c["후보"]||0)+1;if(i.heat)c.heat=(c.heat||0)+1});return c}
let ctx=null;
const reopen=()=>{if(ctx&&ctx.k==="todo")openTodo(ctx.v);else if(ctx&&ctx.k==="sow")openSowDetail(ctx.v)};
function closeSheet(){ctx=null;ui.cull=null;$("#sheetRoot").innerHTML=""}
function keepScroll(fn){const el=$(".sh-bd"),y=el?el.scrollTop:0,wy=window.scrollY;fn();const n=$(".sh-bd");if(n)n.scrollTop=y;window.scrollTo(0,wy)}
function toggleTodo(t){
  const key=t.dataset.tdk;state.todoLog=state.todoLog||{};
  const m=[...document.querySelectorAll("[data-tdm]")].find(e=>e.dataset.tdm===key);const memo=(m?m.value:"").trim();
  if(t.checked){const id=newId(),now=new Date().toISOString();
    state.records.push({id,type:"조치",workDate:TODAY,createdAt:now,user:state.user,data:{task:t.dataset.tdt,target:t.dataset.tdtarget,memo,...(t.dataset.tdsow?{sow:t.dataset.tdsow}:{})}});
    state.todoLog[key]={memo,user:state.user,at:now,rec:id};delete ui.memo[key];toast("조치 완료로 기록했습니다")}
  else{const log=state.todoLog[key];if(log){state.records=state.records.filter(r=>r.id!==log.rec);ui.memo[key]=log.memo}delete state.todoLog[key]}
  save();keepScroll(()=>{render();reopen()});
}

/* ================= 모돈 ================= */
function moveSow(id,to){
  const s=state.sows.find(x=>x.id===id);if(!s||s.loc===to)return;
  addRecord("이동",TODAY,{sow:id,from:s.loc,to});s.loc=to;save();
  toast(`${id}번 모돈 ${to}로 이동 기록`);
}
function addRecord(type,workDate,data){
  const rec={id:newId(),type,workDate,createdAt:new Date().toISOString(),user:state.user,data};
  state.records.push(rec);
  if(state.zero[workDate])delete state.zero[workDate][type];
  save();return rec;
}

/* ================= 입력 페이지 ================= */
function defaults(type){const d={};FORMS[type].f.forEach(f=>{if(f.def!==undefined)d[f.k]=f.def});return d}
function openInput(type,opt={}){
  ui.prev=tab==="input"?ui.prev:tab;closeSheet();
  ui.in={type,date:opt.date||TODAY,sel:opt.sow?[opt.sow]:[],fv:defaults(type),editId:null,warn:null,err:null,q:"",all:false,flash:[]};
  ui.dec=opt.dec?{id:opt.dec,acts:null,when:"오늘 중",who:state.user,memo:""}:null;
  const I0=ui.in;if(opt.batch)I0.fv.batch=opt.batch;if(opt.vax)I0.fv.vax=opt.vax;if(opt.item)I0.fv.item=opt.item;
  if(type==="돈군백신")bvDefault();if(type==="약품"&&!I0.fv.name){I0.fv.name=itemNames(I0.fv.kind)[0]||"";const it=state.items.find(x=>x.name===I0.fv.name);if(it&&it.withdraw)I0.fv.withdraw=addDays(I0.date,it.withdraw)}
  tab="input";render();window.scrollTo(0,0);
  if(opt.dec){const el=document.getElementById("r-"+opt.dec);if(el)el.scrollIntoView({block:"center"})}
}
function candidates(){
  const I=ui.in,F=FORMS[I.type];if(!F.sow)return [];
  const today=state.records.filter(r=>r.type===I.type&&r.workDate===I.date&&r.data.sow);
  const doneIds=new Set(today.map(r=>r.data.sow));
  const list=[];
  state.sows.forEach(s=>{if(culledRec(s.id))return;
    EXCL=null;const i=statusOf(s);
    const inTarget=doneIds.has(s.id)?true:F.sow.filter(i,I.date);
    const q=I.q.trim().toLowerCase();
    const show=q?s.id.toLowerCase().includes(q):(I.all||inTarget||I.sel.includes(s.id));
    if(show)list.push({s,i,done:doneIds.has(s.id),target:inTarget});
  });
  const pr=x=>x.done?2:x.target?0:1;
  list.sort((a,b)=>pr(a)-pr(b)||b.i.d-a.i.d||a.s.id.localeCompare(b.s.id));
  const targetN=state.sows.filter(s=>!culledRec(s.id)&&(doneIds.has(s.id)||F.sow.filter(statusOf(s),I.date))).length;
  return {list,targetN,doneN:doneIds.size};
}
function doSave(force){
  const I=ui.in,F=FORMS[I.type];I.err=null;
  const d={...I.fv};F.f.forEach(f=>{if(f.t==="step")d[f.k]=Number(d[f.k])||0;if(f.t==="text")d[f.k]=String(d[f.k]||"").trim()});
  if(F.err){const e=F.err(d);if(e&&!I.editId){I.err=e;render();return}}
  const sows=F.sow?I.sel:[null];
  EXCL=I.editId;
  if(!force&&F.warn){const ws=sows.map(s=>F.warn(d,I.date,s)).filter(Boolean);if(ws.length){I.warn=ws;EXCL=null;render();return}}
  const ids=[];let msg="";
  sows.forEach(s=>{
    const dd={...d};if(F.pre)F.pre(dd,I.date,s);
    const data={};F.f.forEach(f=>{if(f.t!=="calc"&&dd[f.k]!==undefined&&dd[f.k]!=="")data[f.k]=dd[f.k]});
    if(I.type==="이유")data.days=dd.days;
    if(dd.prod)data.prod=dd.prod;
    if(s)data.sow=s;
    if(I.type==="도입"){data.sow=data.sowid;delete data.sowid;}
    if(I.editId){const r=state.records.find(x=>x.id===I.editId);if(r){if(r.data.decision)data.decision=r.data.decision;r.workDate=I.date;r.data=data;r.edited=true;r.editedAt=new Date().toISOString();r.editedBy=state.user;ids.push(r.id)}}
    else{
      if(I.type==="임신확인"&&data.result==="임신"){const sw=state.sows.find(x=>x.id===s);if(sw&&sw.gilt&&!sowState(s).pregEver)msg+=` · ${s} 모돈 편입`}
      const rec=addRecord(I.type,I.date,data);ids.push(rec.id);
      if(I.type==="도입")state.sows.push({id:data.sow,baseParity:0,loc:"후보돈사",gilt:true,breed:data.breed,intro:I.date});
    }
  });
  EXCL=null;save();
  const n=ids.length;
  let m=I.editId?"수정했습니다":`${L(I.type)} ${n>1?n+"두 ":""}저장했습니다`;
  if(!I.editId&&I.type==="교배")m+=` · 재발 확인 ${kDate(addDays(I.date,21))}, 분만 예정 ${kDate(addDays(I.date,CFG.gest))}`;
  if(I.date<TODAY)m+=" (지연 입력)";
  m+=msg;
  I.flash=ids;I.warn=null;
  if(F.sow){I.sel=[];}
  if(I.editId){I.editId=null;I.fv=defaults(I.type)}
  else{ // 연속 입력: 선택값은 유지, 숫자는 기본값으로
    F.f.forEach(f=>{if(f.t==="step"&&!["kg"].includes(f.k))I.fv[f.k]=f.def;if((f.t==="text"||f.t==="textarea"||f.t==="date")&&f.k!=="kind")I.fv[f.k]="";});
    if(I.type==="폐사")ui.dec=null;
  }
  render();toast(m);
  const el=document.getElementById("r-"+ids[0]);if(el&&window.innerWidth<720)el.scrollIntoView({block:"center",behavior:"smooth"});
  setTimeout(()=>{if(ui.in){ui.in.flash=[];document.querySelectorAll(".srow.flash").forEach(e=>e.classList.remove("flash"))}},4000);
}

/* ================= 돈군 ================= */
/* ================= 준비 중 화면 ================= */
function soon(title,stage,lines){return `<div class="pagehd"><h2>${title}</h2><span class="soon">${stage}에서 제작</span></div><div class="card"><h3>이 화면에 들어갈 내용</h3><ul style="margin:0;padding-left:18px;display:grid;gap:4px;font-size:14px">${lines.map(l=>`<li>${l}</li>`).join("")}</ul></div>`}
function vMore(){
  const items=[["drug","약품·재고","품목, 적정 재고, 정액 주문",""],["stats","성적","기간별 성적과 차트",""],["board","현황판 (TV)","내일 할 일 · 담당 · 회의 메모",""],["tl","타임라인","모든 기록을 시간순으로",""],["close","마감","매일 기록 마감, 0과 누락 구분",""],["settings","설정","언어, 가이드, 계정·목록·기준(대표)",""]];
  return `<div class="pagehd"><h2>더보기</h2></div><div class="more">${items.map(([k,t,d,s])=>`<button class="mitem" type="button" data-a="tab" data-v="${k}"><span class="ic" style="background:var(--accent-soft);color:var(--accent)"><svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round">${ICONS[k]}</svg></span><span><b>${esc(navLabel(k))}</b><small>${d}</small></span>${s?`<span class="soon">${s}</span>`:k==="close"&&navBadge("close")?`<span class="badge" style="position:static;background:var(--red);color:var(--surface);border-radius:999px;padding:1px 8px;font-size:12px;font-weight:700">${navBadge("close")}</span>`:"<span>›</span>"}</button>`).join("")}</div>`;
}

/* ================= 설정 ================= */
/* ================= 타임라인 · 성적 · 마감 ================= */
function vTimeline(){
  const F=["전체",...Object.keys(TYPES)];
  let h=`<div class="pagehd"><h2>타임라인</h2></div><div class="chips">${F.map(f=>`<button type="button" class="chip ${ui.tlFilter===f?"on":""}" data-a="tlf" data-v="${f}">${L(f)}</button>`).join("")}</div>`;
  const list=state.records.filter(r=>(ui.tlFilter==="전체"||r.type===ui.tlFilter)&&!(r.data&&r.data.init)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,100);
  let last="";
  list.forEach(r=>{
    const day=localDateOf(r.createdAt);
    if(day!==last){h+=`<div class="tl-day">${day===TODAY?"오늘 · ":""}${kDate(day)}</div>`;last=day}
    const late=r.workDate<day;
    h+=`<div class="ev">${icon(r.type)}<div style="min-width:0"><div class="meta"><span>${esc(r.user)} · ${kTime(r.createdAt)}</span>${late?`<span class="tag late">지연 입력 · 작업일 ${kDate(r.workDate)}</span>`:""}${r.edited?`<span class="tag zero">수정됨</span>`:""}${r.data&&r.data.sow?`<button type="button" class="mini-link" data-a="sowd" data-v="${r.data.sow}">${r.data.sow}번 보기</button>`:""}</div><div class="txt">${esc(summary(r))}</div></div>
      <div class="del">${ui.delId===r.id?`<button class="act bad" type="button" data-a="delOk" data-v="${r.id}">삭제 확정</button><button class="act" type="button" data-a="delNo">취소</button>`:can("delete")?`<button class="act" type="button" data-a="del" data-v="${r.id}" style="font-size:12px;padding:4px 10px">삭제</button>`:""}</div></div>`;
  });
  if(!list.length)h+=`<div class="empty">기록이 없습니다.</div>`;
  return h;
}
/* ================= 토스트 ================= */
let tt;function toast(m){$("#toastRoot").innerHTML=`<div class="toast" role="status">${esc(m)}</div>`;clearTimeout(tt);tt=setTimeout(()=>$("#toastRoot").innerHTML="",3000)}

