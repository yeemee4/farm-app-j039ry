/* ================= 동작 ================= */
const A={
  tab:(v)=>{closeSheet();go(v)},
  goSettings:()=>go("settings"),
  goClose:(v)=>{tab="close";ui.closeDay=v;render();window.scrollTo(0,0)},
  sowFilter:(v)=>{ui.sf=v;go("sows")},
  input:(v,el)=>openInput(v,{sow:el.dataset.sow,date:el.dataset.date,batch:el.dataset.batch,vax:el.dataset.vax,item:el.dataset.item,vname:el.dataset.vname}),
  back:()=>{const p=ui.prev||"home";ui.in=null;ui.dec=null;go(p)},
  todo:(v)=>openTodo(v),
  scrim:(v,el,e)=>{if(e.target===el)closeSheet()},
  closeSheet:()=>closeSheet(),
  sowd:(v)=>{ui.cull=null;ui.pe=null;ui.sowRf="전체";ui.delId=null;openSowDetail(v);window.scrollTo(0,0)},
  loc:(v,el)=>{const s=state.sows.find(x=>x.id===el.dataset.sow);if(!s||s.loc===v)return;if(!confirm(`${s.id} ${t("모돈을")} ${t(v)}${t("(으)로 변경하시겠습니까?")}`))return;moveSow(el.dataset.sow,v);keepScroll(()=>{render();reopen()})},
  sf:(v)=>{ui.sf=v;render()},
  tlf:(v)=>{ui.tlFilter=v;render()},
  sdays:(v)=>{ui.statsDays=Number(v);render()},
  cday:(v)=>{const n=addDays(ui.closeDay,Number(v));if(n<=TODAY){ui.closeDay=n;render()}},
  zero:(v)=>{(state.zero[ui.closeDay]=state.zero[ui.closeDay]||{})[v]=true;save();render()},
  unzero:(v)=>{if(state.zero[ui.closeDay])delete state.zero[ui.closeDay][v];save();render()},
  del:(v)=>{ui.delId=v;render()},
  delNo:()=>{ui.delId=null;render()},
  delOk:(v)=>{const r=state.records.find(x=>x.id===v);
    if(r&&r.type==="폐사"&&r.data.decision&&r.data.decision!=="none")state.tasks=state.tasks.filter(t=>t.id!==r.data.decision);
    if(r&&r.type==="도입"&&!state.records.some(x=>x.id!==v&&x.data&&x.data.sow===r.data.sow))state.sows=state.sows.filter(s=>s.id!==r.data.sow);
    state.records=state.records.filter(x=>x.id!==v);ui.delId=null;save();render();toast("기록을 삭제했습니다. 성적을 다시 계산했습니다.")},
  chk:(v,el)=>{const s=el.dataset.sow,sw=state.sows.find(x=>x.id===s),wasGilt=sw&&sw.gilt&&!sowState(s).pregEver;
    addRecord("임신확인",TODAY,{sow:s,result:v});let m=`${s}번 ${v} 기록`;
    if(v==="임신"){const i=sowState(s);m+=` · 분만 예정 ${kDate(addDays(i.mate,CFG.gest))}`;if(wasGilt)m+=" · 모돈으로 편입"}
    toast(m);keepScroll(()=>{render();reopen()})},
  movein:(v)=>{moveSow(v,"분만사");keepScroll(()=>{render();reopen()})},
  judge:(v)=>{const r=state.records.find(x=>x.id===v);if(r)openInput("폐사",{date:r.workDate,dec:null})},
  // 입력 페이지
  fv:(v,el)=>{const I=ui.in,k=el.dataset.k;I.fv[k]=v;I.warn=null;
    if(I.type==="폐사"&&k==="barn")I.fv.stage=FARM.stageOf[v]||"모돈";   // 돈사 → 단계 자동 (바꿀 수 있음)
    if(I.type==="약품"&&k==="kind")I.fv.name=itemNames(v)[0]||"";
    if(I.type==="약품"&&(k==="kind"||k==="name")){const it=state.items.find(x=>x.name===I.fv.name);I.fv.withdraw=it&&it.withdraw?addDays(I.date,it.withdraw):""}
    if(I.type==="돈군백신"&&(k==="batch"||k==="vax"))bvDefault();
    render()},
  step:(v,el)=>{const k=el.dataset.k,f=FORMS[ui.in.type].f.find(x=>x.k===k);ui.in.fv[k]=Math.max(f.min??0,(Number(ui.in.fv[k])||0)+Number(v)*(f.big||1));ui.in.warn=null;render()},
  pick:(v)=>{const I=ui.in,F=FORMS[I.type];I.warn=null;
    if(F.sow.multi)I.sel=I.sel.includes(v)?I.sel.filter(x=>x!==v):[...I.sel,v];else I.sel=I.sel[0]===v?[]:[v];
    const done=state.records.some(r=>r.type===I.type&&r.workDate===I.date&&r.data.sow===v);
    if(done&&I.sel.includes(v))toast(`${v}번은 이미 ${kDate(I.date)} ${L(I.type)} 기록이 있습니다`);
    render()},
  toggleAll:()=>{ui.in.all=!ui.in.all;render()},
  save:()=>doSave(false),
  force:()=>doSave(true),
  warnCancel:()=>{ui.in.warn=null;render()},
  edit:(v)=>{const r=state.records.find(x=>x.id===v);if(!r)return;const I=ui.in;
    I.editId=v;I.date=r.workDate;I.fv={...defaults(r.type),...r.data};if(r.type==="도입")I.fv.sowid=r.data.sow;I.sel=r.data.sow&&FORMS[r.type].sow?[r.data.sow]:[];I.warn=null;render();window.scrollTo({top:0,behavior:"smooth"})},
  editCancel:()=>{const I=ui.in;I.editId=null;I.fv=defaults(I.type);I.sel=[];render()},
  decNone:(v)=>{const r=state.records.find(x=>x.id===v);r.data.decision="none";save();render();toast("조치 필요 없음으로 기록했습니다")},
  decNeed:(v)=>{const r=state.records.find(x=>x.id===v);ui.dec={id:v,acts:[...(REC[r.data.cause]||[])],when:"오늘 중",who:state.user,memo:""};render()},
  decAct:(v)=>{const D=ui.dec;D.memo=($("#decMemo")||{}).value||D.memo;D.acts=D.acts.includes(v)?D.acts.filter(a=>a!==v):[...D.acts,v];render()},
  decWhen:(v)=>{ui.dec.memo=($("#decMemo")||{}).value||ui.dec.memo;ui.dec.when=v;render()},
  decWho:(v)=>{ui.dec.memo=($("#decMemo")||{}).value||ui.dec.memo;ui.dec.who=v;render()},
  decCancel:()=>{ui.dec=null;render()},
  decReset:(v)=>{const r=state.records.find(x=>x.id===v);delete r.data.decision;save();render()},
  decSave:()=>{const D=ui.dec,r=state.records.find(x=>x.id===D.id);if(!D.acts.length)return;
    const due=D.when==="내일"?addDays(TODAY,1):D.when==="모레"?addDays(TODAY,2):TODAY;
    const t={id:newId(),src:r.id,title:`${r.data.barn} ${r.data.stage} ${r.data.cause}`,acts:D.acts,due,who:D.who,memo:(($("#decMemo")||{}).value||"").trim(),createdAt:new Date().toISOString(),user:state.user};
    state.tasks.push(t);r.data.decision=t.id;ui.dec=null;save();render();toast(`할 일에 추가했습니다 · ${D.when} · ${D.who}`)},
  // 도태
  cullPlan:(v)=>{ui.cull={id:v,step:"plan",reason:CULL_REASONS[0],date:addDays(TODAY,7)};keepScroll(()=>openSowDetail(v))},
  cullReason:(v)=>{const d=$("#cullDate");if(d)ui.cull.date=d.value||ui.cull.date;ui.cull.reason=v;keepScroll(()=>openSowDetail(ui.cull.id))},
  cullPlanSave:(v)=>{const s=state.sows.find(x=>x.id===v),d=$("#cullDate");s.cullPlan={reason:ui.cull.reason,date:(d&&d.value)||ui.cull.date};ui.cull=null;save();render();keepScroll(()=>openSowDetail(v));toast("도태 계획을 저장했습니다. 예정일 7일 전부터 할 일에 나옵니다.")},
  cullPlanDel:(v)=>{const s=state.sows.find(x=>x.id===v);delete s.cullPlan;save();render();keepScroll(()=>openSowDetail(v))},
  cullConfirm:(v)=>{const s=state.sows.find(x=>x.id===v);ui.cull={id:v,step:"confirm",reason:s.cullPlan?s.cullPlan.reason:CULL_REASONS[0]};keepScroll(()=>openSowDetail(v))},
  cullDo:(v)=>{const s=state.sows.find(x=>x.id===v);addRecord("도태",TODAY,{sow:v,reason:ui.cull.reason});delete s.cullPlan;ui.cull=null;save();render();openSowDetail(v);toast(`${v}번 도태 처리했습니다. 기록은 ‘도태됨’에 보관됩니다.`)},
  cullUndo:(v)=>{ui.cull={id:v,step:"undo"};keepScroll(()=>openSowDetail(v))},
  cullUndoOk:(v)=>{state.records=state.records.filter(r=>!(r.type==="도태"&&r.data.sow===v));ui.cull=null;save();render();openSowDetail(v);toast("도태를 취소했습니다")},
  cullCancel:()=>{const id=ui.cull&&ui.cull.id;ui.cull=null;if(id)keepScroll(()=>openSowDetail(id))},
  // 설정
  who:(v)=>{state.user=v;save();render()},
  stStep:(v,el)=>{const k=el.dataset.k;state.cfgSt[k]=Math.max(1,state.cfgSt[k]+Number(v));save();render()},
  resetAsk:()=>{ui.resetAsk=true;render()},
  resetNo:()=>{ui.resetAsk=false;render()},
  reset:()=>{state=seed();save();ui.resetAsk=false;go("home");toast("예시 데이터로 되돌렸습니다")}
};
document.addEventListener("click",e=>{
  const el=e.target.closest("[data-a]");if(!el)return;
  if(el.tagName==="INPUT")return;
  const fn=A[el.dataset.a];if(fn)fn(el.dataset.v,el,e);
});
document.addEventListener("input",e=>{
  const t=e.target;
  if(t.id==="sowQ"){t.value=t.value.replace(/\D/g,"");ui.sowQ=t.value;const p=t.selectionStart;render();const q=$("#sowQ");q.focus();try{q.setSelectionRange(p,p)}catch(_){}return}
  if(t.id==="in-q"){t.value=t.value.replace(/\D/g,"");ui.in.q=t.value;const p=t.selectionStart;render();const q=$("#in-q");q.focus();try{q.setSelectionRange(p,p)}catch(_){}return}
  if(!ui.in||tab!=="input")return;
  if(t.dataset.num){ui.in.fv[t.dataset.num]=t.value;ui.in.warn=null;const F=FORMS[ui.in.type];F.f.filter(f=>f.t==="calc").forEach(f=>{const c=document.querySelector(`[data-calc="${f.k}"]`);if(c)c.textContent=f.calc(ui.in.fv,ui.in.date,ui.in.sel[0])});return}
  if(t.dataset.txt){ui.in.fv[t.dataset.txt]=t.value;ui.in.err=null;const b=$("[data-a=save]");if(b){const n=needMsg();b.disabled=!!n;b.textContent=saveLabel()}return}
});
document.addEventListener("change",e=>{
  const t=e.target;
  if(t.dataset&&t.dataset.tdk){toggleTodo(t);return}
  if(t.dataset&&t.dataset.tdm){const key=t.dataset.tdm,log=tdLog(key),v=t.value.trim();
    if(log){log.memo=v;const r=state.records.find(x=>x.id===log.rec);if(r)r.data.memo=v;save();toast("조치 내용을 고쳤습니다")}else ui.memo[key]=t.value;return}
  if(t.id==="stYm"&&t.value){ui.st.ym=t.value>TODAY.slice(0,7)?TODAY.slice(0,7):t.value;render();return}
  if(t.id==="stFrom"||t.id==="stTo"){ui.st[t.id==="stFrom"?"from":"to"]=t.value||TODAY;if(ui.st.from>ui.st.to){const x=ui.st.from;ui.st.from=ui.st.to;ui.st.to=x}render();return}
  if(t.id==="pyYm"&&t.value){ui.pyf.ym=t.value;render();return}
  if(t.id==="in-date"&&ui.in){let v=t.value||TODAY;if(v>TODAY)v=TODAY;ui.in.date=v;ui.in.sel=[];ui.in.warn=null;render()}
  if(t.id==="decMemo"&&ui.dec)ui.dec.memo=t.value;
});

