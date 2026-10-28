/* ================= v0.2 · 돈군 탭 ================= */
function vBatch(){
  const L=liveBatches();
  let h=`<div class="pagehd" style="justify-content:space-between"><h2>돈군</h2><button class="act pri" type="button" data-a="input" data-v="돈군백신">+ 백신 기록</button></div>
    <div class="note">분만 주차별로 자돈 돈군을 자동으로 묶습니다. 위치는 설정의 돈사별 주 수로 계산한 계획 위치입니다. 백신은 ‘어디까지 놓았는지’를 단계별로 보여 줍니다.</div>`;
  h+=`<div class="statusrow">${state.cfg.stage.map(([n])=>{const inS=L.filter(b=>stagePlan(bAge(b))===n);return `<div class="sbox"><small>${n}</small><b>${inS.length}군</b><small>${inS.reduce((s,b)=>s+bHeads(b,bAge(b)),0).toLocaleString()}두</small></div>`}).join("")}</div>`;
  if(!L.length)return h+`<div class="empty">사육 중인 돈군이 없습니다.</div>`;
  h+=`<div class="sowgrid">`+L.map(b=>{
    const age=bAge(b),vs=state.cfg.prog.map(p=>bVax(b,p)),lastDone=[...vs].reverse().find(v=>v.st==="done"),next=vs.find(v=>v.st!=="done"),bad=vs.some(v=>v.st==="late"||v.st==="part");
    return `<div class="batch ${bad?"bad":""}"><div class="bt"><b>${bName(b.k)} <small class="ago">· ${bAgo(b.k)}</small></b><span class="stage ${age<state.cfg.stage[0][1]?"c-lac":"c-preg"}">${stagePlan(age)}</span></div>
      <div class="sow-meta">${kDate(b.k)} 주 분만 · ${b.manual?`초기 등록 ${b.litters||"-"}복`:`${b.f.length}복`} · ${age}주령 · 약 ${bHeads(b,age).toLocaleString()}두</div>
      <div class="vsteps">${vs.map(v=>`<span class="sd ${VST[v.st][0]}" title="${v.p.name} ${v.done}/${v.need}두">${v.p.name}${v.st==="partnow"||v.st==="part"?` ${Math.round(v.done/v.need*100)}%`:v.st==="late"?" !":""}</span>`).join("")}</div>
      <div class="sow-meta">마지막 완료: <b>${lastDone?lastDone.p.name:"없음"}</b> · 다음: <b>${next?`${next.p.name} (${kDate(next.due)} 주)`:"모두 완료"}</b></div>
      ${next?`<div class="acts"><button class="act ${["due","partnow","late","part"].includes(next.st)?"pri":""}" type="button" data-a="input" data-v="돈군백신" data-batch="${b.k}" data-vax="${next.p.name}">${next.p.name} 기록</button></div>`:""}</div>`}).join("")+`</div>`;
  return h;
}

/* ================= v0.2 · 약품·재고 ================= */
function vDrug(){
  const cf=ui.drugCat||"전체";
  const list=state.items.filter(i=>!i.hidden&&(cf==="전체"||i.cat===cf)).map(it=>({it,s:stockOf(it)}));
  const so=semenOrder();
  let h=`<div class="pagehd" style="justify-content:space-between"><h2>약품·재고</h2><button class="act pri" type="button" data-a="input" data-v="재고">+ 입고·사용·실사</button></div>`;
  h+=`<div class="chips">${["전체","사료",...CATS].map(c=>`<button type="button" class="chip ${cf===c?"on":""}" data-a="drugCat" data-v="${c}">${c} ${c==="전체"?state.items.filter(i=>!i.hidden).length:c==="사료"?feedKinds().length:state.items.filter(i=>!i.hidden&&i.cat===c).length}</button>`).join("")}</div>`;
  if(so.order&&(cf==="전체"||cf==="정액"))h+=`<div class="banner"><b>정액 주문</b><span>내일 교배 예정 ${so.n}두 × ${state.cfg.semenPerSow}${FARM.semen.unit} = ${so.doses}${FARM.semen.unit} · 재고 ${so.stock}${FARM.semen.unit} → <b>${so.order}${FARM.semen.unit}</b> 오늘 ${FARM.semen.deadline}까지 주문</span></div>`;
  if(cf==="사료")return h+vFeedPanel();
  h+=`<div class="note">처음에는 ‘실사’로 현재 수량을 넣어 시작하세요. 재고는 입고·사용·실사 기록과 접종·투약·교배 기록으로 자동 계산합니다. <b>적정 재고</b>는 관리자가 정하는 값이며, 그보다 적으면 할 일과 현황판에 알립니다.</div>`;
  h+=`<div class="sowgrid">${list.map(({it,s})=>{const st=stockSt(it,s),pct=Math.min(100,it.par?(s.qty||0)/(it.par*2)*100:100),E=ui.itemEdit===it.id;
    return `<div class="batch"><div class="bt"><b>${esc(it.name)}</b><span class="dstate ${st==="none"?"ds-none":st==="bad"?"ds-wait":st==="warn"?"ds-task":"ds-done"}">${st==="none"?"미입력":st==="bad"?"부족":st==="warn"?"주의":"충분"}</span></div>
      <div class="sow-meta">${it.cat}${it.withdraw?` · 휴약 ${it.withdraw}일`:""}</div>
      <div class="sow-sub">${s.qty===null?"재고 미입력":s.qty+it.unit} <span class="sow-meta" style="font-weight:500">/ 적정 ${it.par}${it.unit}${s.days!==null?` · 약 ${s.days}일분`:""}</span></div>
      <div class="prog-bar stockbar"><i style="width:${pct}%;background:${st==="bad"?"var(--red)":st==="warn"?"var(--amber)":"var(--accent)"}"></i><b style="left:50%"></b></div>
      ${E?`<div class="setrow"><span>적정 재고 (관리자)</span><div class="stepper"><button type="button" data-a="parStep" data-k="${it.id}" data-v="-1" aria-label="줄이기">−</button><input type="number" value="${it.par}" readonly aria-label="적정 재고"><button type="button" data-a="parStep" data-k="${it.id}" data-v="1" aria-label="늘리기">+</button></div></div>${it.cat==="항생제"?`<div class="setrow"><span>휴약기간 (일)</span><div class="stepper"><button type="button" data-a="wdStep" data-k="${it.id}" data-v="-1" aria-label="줄이기">−</button><input type="number" value="${it.withdraw||0}" readonly aria-label="휴약기간"><button type="button" data-a="wdStep" data-k="${it.id}" data-v="1" aria-label="늘리기">+</button></div></div>`:""}<div class="acts"><button class="act" type="button" data-a="itemEdit" data-v="">닫기</button><button class="act bad" type="button" data-a="itemHide" data-v="${it.id}">목록에서 숨기기</button></div>`:
      `<div class="acts"><button class="act" type="button" data-a="input" data-v="재고" data-item="${it.id}">입고·사용</button>${can("admin")?`<button class="act" type="button" data-a="itemEdit" data-v="${it.id}">설정</button>`:""}</div>`}</div>`}).join("")}</div>`;
  h+=ui.newItem?`<div class="panel"><h3 style="margin:0">품목 추가</h3><div class="f"><label for="niName">품목 이름</label><input type="text" id="niName" placeholder="예: 플로르페니콜 음수제" value="${esc(ui.newItem.name||"")}"></div>
    <div class="f"><span class="lb">구분</span><div class="chipwrap">${CATS.map(c=>`<button type="button" class="chip wrap ${ui.newItem.cat===c?"on":""}" data-a="niCat" data-v="${c}">${c}</button>`).join("")}</div></div>
    <div class="row2"><div class="f" style="flex:1"><label for="niUnit">단위</label><input type="text" id="niUnit" value="${ui.newItem.unit}" placeholder="병, kg, L"></div><div class="f" style="flex:1"><label for="niPar">적정 재고</label><input type="number" id="niPar" value="10" inputmode="numeric"></div></div>
    <div class="acts"><button class="act pri" type="button" data-a="niSave">추가</button><button class="act" type="button" data-a="niCancel">취소</button></div></div>`:can("admin")?`<button class="act" type="button" data-a="niOpen" style="justify-self:start">+ 품목 추가</button>`:"";
  if(cf==="전체")h+=vFeedPanel();
  return h;
}

function bvDefault(){const I=ui.in,b=batches().find(x=>x.k===I.fv.batch),p=state.cfg.prog.find(x=>x.name===I.fv.vax);if(b&&p){const v=bVax(b,p);I.fv.n=Math.max(v.need-v.done,0)}}
function seedPost(){
  const W=["김OO","Nguyen","이OO"];let k=0;const L=liveBatches();
  const miss=L.find(b=>bAge(b)>=8&&bAge(b)<10),part=L.find(b=>bAge(b)>=11&&bAge(b)<13);
  L.forEach(b=>state.cfg.prog.forEach((p,pi)=>{const due=addDays(b.k,p.day);if(due>addDays(TODAY,-7))return;
    if(b===miss&&pi===1)return;let n=bVax(b,p).need;if(b===part&&pi===2)n=Math.round(n*.7);
    const wd=addDays(due,2);state.records.push({id:newId(),type:"돈군백신",workDate:wd,createdAt:new Date(toUTC(wd)+9*36e5).toISOString(),user:W[k++%3],data:{batch:b.k,vax:p.name,prod:p.prod,n}})}));
  const qty={i1:14,i2:3,i3:80,i4:55,i5:7,i6:900,i7:1400,i8:420,i9:70,i10:75,i11:3};const d2=addDays(TODAY,-2);
  state.items.forEach(it=>state.records.push({id:newId(),type:"재고",workDate:d2,createdAt:new Date(toUTC(d2)+8*36e5).toISOString(),user:"김OO",data:{item:it.id,mode:"실사",qty:qty[it.id]}}));
}
const boardDate=()=>ui.boardDay||(new Date().getHours()>=18?addDays(TODAY,1):TODAY);
function peKeep(){const a=$("#peIntro"),b=$("#peMemo");if(a)ui.pe.intro=a.value;if(b)ui.pe.memo=b.value}
Object.assign(A,{
  sowRf:v=>{ui.sowRf=v;render()},
  editRec:v=>{const r=state.records.find(x=>x.id===v);if(!r)return;openInput(r.type,{date:r.workDate});A.edit(v)},
  peOpen:()=>{const s=state.sows.find(x=>x.id===ui.sowId);ui.pe={breed:s.breed||"LYD",bp:s.baseParity,intro:s.intro||"",memo:s.memo||""};render()},
  peBreed:v=>{peKeep();ui.pe.breed=v;render()},
  pePar:v=>{peKeep();ui.pe.bp=Math.max(0,ui.pe.bp+Number(v));render()},
  peCancel:()=>{ui.pe=null;render()},
  peSave:()=>{peKeep();const s=state.sows.find(x=>x.id===ui.sowId);s.breed=ui.pe.breed;s.baseParity=ui.pe.bp;if(ui.pe.intro)s.intro=ui.pe.intro;s.memo=ui.pe.memo.trim();ui.pe=null;save();render();toast("기본 정보를 저장했습니다")},
  stMode:v=>{ui.st.mode=v;if(v!=="기간"&&ui.st.cmp==="none")ui.st.cmp="prev";render()},
  stNav:v=>{const S=ui.st,n=Number(v);
    if(S.mode==="월"){let [y,m]=S.ym.split("-").map(Number);m+=n;if(m<1){m=12;y--}if(m>12){m=1;y++}const ym=`${y}-${pad(m)}`;if(ym<=TODAY.slice(0,7))S.ym=ym}
    if(S.mode==="분기"){let [y,q]=S.yq.split("-").map(Number);q+=n;if(q<1){q=4;y--}if(q>4){q=1;y++}if(monthRange(y,q*3-2)[0]<=TODAY)S.yq=`${y}-${q}`}
    render()},
  stYr:v=>{ui.st.yr=v;render()},
  stCmp:v=>{ui.st.cmp=v;render()},
  stQuick:v=>{const S=ui.st,y=+TODAY.slice(0,4);if(v==="4w"){S.from=addDays(TODAY,-27);S.to=TODAY}if(v==="3m"){S.from=addDays(TODAY,-90);S.to=TODAY}if(v==="ty"){S.from=`${y}-01-01`;S.to=TODAY}if(v==="ly"){S.from=`${y-1}-01-01`;S.to=`${y-1}-12-31`}render()},
  stMetric:v=>{ui.st.metric=v;render()},
  yyNav:v=>{const y=ui.st.yy+Number(v);if(y<=+TODAY.slice(0,4))ui.st.yy=y;render()},
  pyOpen:()=>{ui.pyf={ym:`${+TODAY.slice(0,4)-1}-01`};render()},
  pyClose:()=>{ui.pyf=null;render()},
  pySave:()=>{const o={};document.querySelectorAll("[data-py]").forEach(e=>{if(e.value!=="")o[e.dataset.py]=+e.value});state.prevYear=state.prevYear||{};state.prevYear[ui.pyf.ym]=o;save();render();toast(`${ui.pyf.ym} 성적을 저장했습니다`)},
  bDay:v=>{ui.boardDay=v==="tmr"?addDays(TODAY,1):TODAY;ui.memoEdit=false;render()},
  tvMode:()=>{const on=document.body.classList.toggle("tv");
    try{if(on&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>{});else if(!on&&document.fullscreenElement)document.exitFullscreen().catch(()=>{})}catch(e){}
    try{if(on&&navigator.wakeLock)navigator.wakeLock.request("screen").then(l=>ui.wl=l).catch(()=>{});else if(ui.wl){ui.wl.release();ui.wl=null}}catch(e){}
    render();window.scrollTo(0,0)},
  assign:v=>{state.assign=state.assign||{};const cyc=[null,...WORKERS],cur=state.assign[v]||null,n=cyc[(cyc.indexOf(cur)+1)%cyc.length];if(n)state.assign[v]=n;else delete state.assign[v];save();render();if(ctx)keepScroll(reopen)},
  memoEdit:()=>{ui.memoEdit=!ui.memoEdit;render()},
  memoSave:()=>{state.memo=state.memo||{};state.memo[boardDate()]=$("#memoEdit").value.trim();ui.memoEdit=false;save();render();toast("회의 메모를 저장했습니다")},
  drugCat:v=>{ui.drugCat=v;render()},
  itemEdit:v=>{ui.itemEdit=v||null;render()},
  parStep:(v,el)=>{const it=itemById(el.dataset.k);it.par=Math.max(0,it.par+Number(v)*(it.par>=100?50:it.par>=20?5:1));save();render()},
  wdStep:(v,el)=>{const it=itemById(el.dataset.k);it.withdraw=Math.max(0,(it.withdraw||0)+Number(v));save();render()},
  itemHide:v=>{itemById(v).hidden=true;ui.itemEdit=null;save();render();toast("목록에서 숨겼습니다. 지난 기록은 그대로 남습니다.")},
  niOpen:()=>{ui.newItem={cat:"항생제",unit:"병",name:""};render()},
  niCat:v=>{const n=$("#niName"),u=$("#niUnit");ui.newItem.name=n?n.value:"";ui.newItem.unit=u?u.value:ui.newItem.unit;ui.newItem.cat=v;render()},
  niCancel:()=>{ui.newItem=null;render()},
  niSave:()=>{const name=$("#niName").value.trim();if(!name){toast("품목 이름을 입력하세요");return}if(state.items.some(i=>i.name===name&&!i.hidden)){toast("이미 있는 품목입니다");return}
    state.items.push({id:"i"+newId(),name,cat:ui.newItem.cat,unit:$("#niUnit").value.trim()||"개",par:Number($("#niPar").value)||0,withdraw:0});ui.newItem=null;save();render();toast(`${name}을(를) 추가했습니다`)},
  cfgStage:(v,el)=>{const x=state.cfg.stage[+el.dataset.k];x[1]=Math.max(1,x[1]+Number(v));save();render()},
  cfgProg:(v,el)=>{const p=state.cfg.prog[+el.dataset.k];p.day=Math.max(1,p.day+Number(v));save();render()},
  cfgSemen:v=>{state.cfg.semenPerSow=Math.max(1,state.cfg.semenPerSow+Number(v));save();render()}
});

