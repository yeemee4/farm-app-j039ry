/* ================= 번식 탭: 번식 사이클 한 화면 (위 = 오늘 할 일, 아래 = 목표·성적) =================
   사이클 띠(단계별 두수, 누르면 그 단계 목록) · 오늘 번식 할 일 묶음 · 다음 2주 일정 · 이번 주 목표 · 최근 90일 성적 */
const BR_STAGES=[["후보","후보돈"],["발정대기","발정 대기"],["재발공태","재발·공태"],["확인전","교배·확인 전"],["임신","임신"],["분만임박","분만 임박"],["포유","포유"]];
const BR_TODO=["mate2","mate","remate","ret","movein","farrow","wean","order"];
const BR_EV=["교배","임신확인","분만","이유"];
// 최근 90일 성적: 첫 교배(같은 발정 3일 안은 하나) → 결과(임신·재발·공태·유산) · 재귀일수 · 정액별
function breedStats(days=90){const from=addDays(TODAY,-days),R=[...state.records].sort((a,b)=>a.workDate.localeCompare(b.workDate)),by={};
  R.forEach(r=>{const s=r.data&&r.data.sow;if(s&&BR_EV.concat("임신확인").includes(r.type))(by[s]=by[s]||[]).push(r)});
  const M=[],ret=[];let lv=0,nf=0;
  Object.values(by).forEach(L=>{let last=null,lastW=null;L.forEach(r=>{
    if(r.type==="이유")lastW=r.workDate;
    if(r.type==="교배"){if(last&&diff(last.d,r.workDate)<=3)return;last={d:r.workDate,semen:r.data.semen||"-",res:null};if(r.workDate>=from&&diff(r.workDate,TODAY)>=25)M.push(last);
      if(lastW&&r.workDate>=from&&diff(lastW,r.workDate)<=60)ret.push(diff(lastW,r.workDate));lastW=null}
    else if(r.type==="임신확인"&&last&&!last.res)last.res=r.data.result==="임신"?"임신":"사고";
    else if(r.type==="분만"&&last){if(!last.res)last.res="임신";if(r.workDate>=from){lv+=+r.data.live||0;nf++}}})});
  const done=M.filter(m=>m.res),ok=done.filter(m=>m.res==="임신").length,sem={};
  done.forEach(m=>{const o=sem[m.semen]=sem[m.semen]||{n:0,ok:0};o.n++;if(m.res==="임신")o.ok++});
  console.assert(ok<=done.length&&done.length<=M.length,"breedStats");
  return {n:done.length,rate:done.length?ok/done.length*100:null,ret:ret.length?ret.reduce((a,b)=>a+b,0)/ret.length:null,live:nf?lv/nf:null,sem}}
function vBreed(){const S=activeSows().map(s=>[s,statusOf(s)]),cnt=k=>S.filter(([,i])=>i.key===k).length,sel=ui.brStage||"";
  let h=`<div class="pagehd"><h2>${t("번식")}</h2></div>`;
  // 1. 사이클 띠
  h+=`<div class="br-cycle">${BR_STAGES.map(([k,l])=>`<button type="button" class="${sel===k?"on":""}" data-a="brStage" data-v="${k}"><b>${cnt(k)}</b><span>${t(l)}</span></button>`).join("")}</div>`;
  // 2. 고른 단계의 모돈
  if(sel){const L=S.filter(([,i])=>i.key===sel);h+=`<div class="sec-t">${t((BR_STAGES.find(x=>x[0]===sel)||[])[1]||sel)} <span>${L.length}${t("두")} · <button type="button" class="linkbtn" data-a="brStage" data-v="">${t("닫기")}</button></span></div><div class="sowtiles">${L.map(([s,i])=>sowTile(s,i)).join("")||`<div class="empty">${t("없음")}</div>`}</div>`}
  // 3. 오늘 번식 할 일
  const td=buildTodos().filter(x=>BR_TODO.includes(x.k)&&x.items.length);
  h+=`<div class="sec-t">${t("오늘 번식 할 일")} <span>${td.reduce((s,x)=>s+bLeft(x),0)}${t("묶음")}</span></div>`;
  h+=td.length?`<div class="todolist">${td.map(todoBtn).join("")}</div>`:`<div class="empty">${t("오늘 번식 할 일이 없습니다.")}</div>`;
  // 4. 다음 2주 일정 (번식만)
  const {ev}=calEvents(),days=Object.keys(ev).filter(d=>d>=TODAY).sort().map(d=>[d,ev[d].filter(([k])=>BR_EV.includes(k))]).filter(x=>x[1].length);
  h+=`<div class="sec-t">${t("다음 2주 일정")} <span><button type="button" class="linkbtn" data-a="tab" data-v="cal">${t("주간 달력")} ›</button></span></div><div class="panel br-days">${days.map(([d,E])=>{const c={};E.forEach(([k])=>c[k]=(c[k]||0)+1);
    return `<div class="setrow"><span><b>${kDate(d)}</b></span><span class="sow-meta">${Object.entries(c).map(([k,n])=>`${t(L(k))} ${n}`).join(" · ")}</span></div>`}).join("")||`<div class="empty">${t("없음")}</div>`}</div>`;
  // 5. 이번 주 목표 (현황판 카드와 같은 그림)
  h+=`<div class="sec-t">${t("이번 주 목표")}</div><div class="panel">${DASH_P.breed()[2]}</div>`;
  // 6. 최근 90일 성적
  const B=breedStats(),f1=v=>v==null?"-":v.toFixed(1);
  h+=`<div class="sec-t">${t("번식 성적")} <span>${t("최근 90일")}</span></div><div class="kv kv4">
    <div><small>${t("수태율")}</small><b>${B.rate==null?"-":Math.round(B.rate)+"%"}</b><small>${B.n}${t("복 판정")}</small></div>
    <div><small>${t("재귀 일수")}</small><b>${f1(B.ret)}${t("일")}</b><small>${t("이유 → 교배")}</small></div>
    <div><small>${t("복당 실산")}</small><b>${f1(B.live)}</b><small>${t("두")}</small></div>
    <div><small>${t("재발·공태")}</small><b>${cnt("재발공태")}</b><small>${t("지금")}</small></div></div>`;
  const sem=Object.entries(B.sem).sort((a,b)=>b[1].n-a[1].n);
  if(sem.length)h+=`<div class="panel">${sem.map(([k,o])=>`<div class="setrow"><span>${esc(k)}</span><span><b>${Math.round(o.ok/o.n*100)}%</b> <small class="sow-meta">${o.ok}/${o.n}${t("복")}</small></span></div>`).join("")}</div>`;
  return h}
Object.assign(A,{brStage:v=>{ui.brStage=ui.brStage===v?"":v;render()}});
// 들어가는 곳: 더보기 · 모돈 탭 위 · 현황판 ‘이번 주 번식’
DASH_GO.breed="breed";
const _vMore1=vMore;vMore=function(){return _vMore1().replace('<button class="mitem" type="button" data-a="tab" data-v="stats">',`<button class="mitem" type="button" data-a="tab" data-v="breed"><span class="ic" style="background:var(--accent-soft);color:var(--accent)"></span><span><b>${t("번식")}</b><small>${t("교배 → 임신 → 분만 → 이유 사이클 한 화면")}</small></span><span>›</span></button><button class="mitem" type="button" data-a="tab" data-v="stats">`)};
const _vSows1=vSows;vSows=function(){return _vSows1().replace(`data-a="tab" data-v="barnmap">`,`data-a="tab" data-v="breed">${t("번식")} ›</button><button class="act" type="button" data-a="tab" data-v="barnmap">`)};
