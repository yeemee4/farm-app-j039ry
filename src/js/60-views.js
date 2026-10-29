/* ================= v0.3 · 화면 (번역 적용) ================= */
function renderTabs(){
  const cur=tab==="input"?(ui.prev==="sow"?"sows":ui.prev):tab==="sow"?"sows":tab,curM=MNAV.includes(cur)?cur:"more";
  const btn=(k,on)=>{const b=navBadge(k);return `<button type="button" data-a="tab" data-v="${k}" class="${on?"on":""}" aria-current="${on?"page":"false"}"><svg viewBox="0 0 24 24">${ICONS[k]}</svg>${esc(navLabel(k))}${b?`<span class="badge">${b}</span>`:""}</button>`};
  $("#tabsM").innerHTML=MNAV.map(k=>btn(k,curM===k)).join("");
  $("#tabsD").innerHTML=NAV.map(([k])=>btn(k,cur===k)).join("");
}
function render(){
  SIDX=null;applySkin();const m=me();
  if(!m){document.body.classList.add("login");LANG=ui.loginLang||"ko";document.documentElement.lang=LANG;$("#view").innerHTML=vLogin();$("#sheetRoot").innerHTML="";return}
  document.body.classList.remove("login");
  LANG=m.lang||"ko";document.documentElement.lang=LANG;state.user=m.name;syncLists();
  $("#hdDate").textContent=kDate(TODAY)+" · W"+isoWeek(TODAY).w+wxShort();$("#hdVer").textContent=APP_VER;
  $("#whoName").textContent=`${m.name} · ${t(ROLE[m.role])}`;
  renderTabs();
  const v=$("#view");v.className="v-"+tab;
  const V={home:vHome,todo:vTodo,sows:vSows,batch:vBatch,drug:vDrug,stats:vStats,board:vDash,tl:vTimeline,close:vClose,settings:vSettings,more:vMore,input:vInput,sow:vSow,morning:vMorning};
  v.innerHTML=V[tab]();
  const dl=$("#feedList");if(dl)dl.innerHTML=feedNames().map(n=>`<option value="${esc(n)}">`).join("");
}
const missCount=day=>day<(state.startDate||"")?0:DAILY.filter(t2=>dayStatus(day,t2).s==="miss").length;
function vHome(){
  const yMiss=missCount(addDays(TODAY,-1));let h="";
  if(!storageOK)h+=`<div class="banner info"><b>!</b><span>이 브라우저에서는 기록이 저장되지 않습니다.</span></div>`;
  if(yMiss)h+=`<button class="banner" type="button" data-a="goClose" data-v="${addDays(TODAY,-1)}"><b>${t("어제 미입력")} ${yMiss}</b><span>${t("눌러서 입력하거나 ‘없음’으로 마감하세요")} ›</span></button>`;
  h+=wxHome()+questGauge(buildTodos());
  const c=statusCounts();
  h+=`<div class="homegrid"><div>`;
  h+=`<div class="sec-t">${t("모돈 상태")} <button type="button" data-a="tab" data-v="sows">${t("모돈 보기")} ›</button></div><div class="statusrow">`+
    [["heat","발정 관찰"],["발정대기","발정 대기"],["확인전","확인 전"],["임신","임신"],["분만임박","분만 임박"],["포유","포유"],["재발공태","재발·공태"],["후보","후보돈"]]
    .map(([k,l])=>`<button type="button" class="sbox ${k==="heat"&&c.heat?"hot":""}" data-a="sowFilter" data-v="${k==="heat"?"발정관찰":k}"><small>${t(l)}</small><b>${c[k]||0}</b></button>`).join("")+`</div>`;
  h+=amHomeCard();
  h+=`<div class="sec-t">${t("오늘 입력")}</div><div class="qgrid">${QUICK.filter(q=>!(state.labels.hide||{})[q]).map(q=>{
    let cls="",cnt="";
    if(DAILY.includes(q)){const s=dayStatus(TODAY,q);cls=s.s==="miss"?"miss":s.s==="zero"?"zero":"";cnt=s.s==="ok"?s.n:s.s==="zero"?"0":""}
    else{const n=state.records.filter(r=>r.type===q&&r.workDate===TODAY).length;cnt=n||""}
    return `<button class="qbtn ${cls}${iconStyle()==="pic"&&ICON_IMG[q]?" pic":" qx"}" type="button" data-a="input" data-v="${q}">${icon(q)}<span class="qlb">${esc(L(q))}</span><span class="cnt">${cnt}</span></button>`}).join("")}</div>`;
  h+=`<div class="note">${t("빨간 테두리: 오늘 아직 입력하지 않은 매일 기록 · 파란 0: ‘오늘 없음’으로 확인함")}</div>`;
  h+=`</div><div>`;
  const todos=buildTodos().filter(x=>x.k!=="am"),st=stalls();
  const leftN=todos.reduce((s,x)=>s+leftOf(x),0);
  h+=`<div class="sec-t">${t("오늘 할 일")} <button type="button" data-a="tab" data-v="todo">${t("남은")} ${leftN} · ${t("전체 보기")} ›</button></div>`;
  const todosS=sortTodos(todos);
  h+=todosS.length?todosS.slice(0,6).map(todoBtn).join(""):`<div class="empty">${t("오늘 할 일이 없습니다.")}</div>`;
  if(st.length)h+=`<button class="todo stall" type="button" data-a="tab" data-v="todo"><span class="bar"></span><span><b>${t("장기 무변동 개체")}</b><small>${st.slice(0,5).map(x=>x.s.id).join(", ")}${st.length>5?" …":""}</small></span><span class="n" style="color:var(--red)">${st.length}</span></button>`;
  h+=`</div></div><div class="proto">시제품 ${APP_VER} · 기록은 이 기기에만 저장됩니다</div>`;
  return h;
}
function itemShort(it){return it.am?t(it.am.barn):it.fc?bName(it.fc.b.k).replace(" 돈군","")+" "+it.fc.p.feed:it.feed?it.feed.f:it.ann?it.ann.name:it.lit?it.s.id:it.t?it.t.title:it.s?it.s.id:it.b?bName(it.b.k).replace(" 돈군","")+" "+it.v.p.name:it.item?it.item.name:it.order?`${t("정액 주문 (내일 교배 예정)").split(" (")[0]} ${it.order.order}`:it.day?it.day.barn:it.r.data.barn}
function todoBtn(x){
  const left=leftOf(x),fin=left===0;
  const who=(state.assign||{})[TODAY+"|"+x.k];const names=(who?`${t("담당")} ${who} · `:"")+x.items.map(itemShort).slice(0,5).join(", ")+(x.items.length>5?" …":"");
  return `<button class="todo ${fin?"alldone":""}" type="button" data-a="todo" data-v="${x.k}"><span class="bar" style="background:${fin?"var(--accent)":x.sev==="bad"?"var(--red)":x.sev==="warn"?"var(--amber)":"var(--accent)"}"></span><span><b>${t(x.t)}</b><i class="tq" style="width:${x.items.length?(x.items.length-left)/x.items.length*100:0}%"></i><small>${fin?t("모두 완료")+" · ":""}${esc(names)}</small></span><span class="n" style="color:${fin?"var(--accent)":x.sev==="bad"?"var(--red)":x.sev==="warn"?"var(--amber)":"var(--ink)"}">${fin?"✓":left}<small>/${x.items.length}</small></span></button>`;
}
function vTodo(){
  const todos=sortTodos(buildTodos()),st=stalls();
  let h=`<div class="pagehd"><h2>${t("할 일")}</h2></div>`;
  h+=questHead(todos)+todoSortBar()+supplyCard(todos);
  h+=todos.length?todos.map(todoBtn).join(""):`<div class="empty">${t("오늘 할 일이 없습니다.")}</div>`;
  h+=`<div class="sec-t">${t("장기 무변동 개체")} <span>${st.length}</span></div>`;
  h+=`<div class="note">일정 기간 기록 변화가 없는 모돈입니다. 기록이 빠졌는지 확인해 주세요. 기준 일수는 설정에서 바꿀 수 있습니다.</div>`;
  h+=st.length?st.map(x=>`<div class="stall-it"><div style="min-width:0"><div class="sow-top" style="justify-content:flex-start;gap:8px"><button type="button" class="sow-no" data-a="sowd" data-v="${x.s.id}">${x.s.id}<span class="chev">›</span></button><span class="stage ${x.i.cls}">${x.i.label}</span></div><div class="why" style="color:${x.sev==="bad"?"var(--red)":"var(--amber)"}">${x.why}</div><div class="sow-loc">${t("현재")} ${x.s.loc} · ${x.i.sub}</div></div></div>`).join(""):`<div class="empty">기록이 멈춘 개체가 없습니다.</div>`;
  return h;
}
function openTodo(k){
  const x=buildTodos().find(q=>q.k===k);if(!x){closeSheet();return}
  const rows=x.items.map(it=>{const key=tdKey(k,itemTarget(it));return {it,key,log:tdLog(key)}}).sort((a,b)=>(a.log?1:0)-(b.log?1:0));
  const done=rows.filter(r=>r.log).length;
  const items=rows.map(({it,key,log})=>{
    const ck=x.k==="pending"?"":`<div class="tdck"><label class="ckbox"><input type="checkbox" data-tdk="${key}" data-tdt="${esc(x.t)}" data-tdtarget="${esc(tdName(it))}" ${it.s?`data-tdsow="${it.s.id}"`:""} ${log?"checked":""}><span>${log?`${t("완료")} · ${esc(log.user)} ${kTime(log.at)}`:t("조치 완료 체크")}</span></label><input type="text" data-tdm="${key}" placeholder="${t("조치 내용 (예: 재발 없음, 수의사 확인)")}" value="${esc(log?log.memo:(ui.memo[key]||""))}" aria-label="${t("내용")}"></div>`;
    if(it.b)return `<div class="sow ${log?"done":""}"><div class="sow-top"><b>${bName(it.b.k)} · ${it.v.p.name}</b><span class="dd" style="color:${it.sev==="bad"?"var(--red)":"var(--amber)"}">${VST[it.v.st][1]}</span></div><div class="sow-meta">${bAge(it.b)}w · ${t(stagePlan(bAge(it.b)))} · ${it.v.done}/${it.v.need}${t("두")}</div><div class="prog-bar"><i style="width:${Math.min(100,it.v.done/it.v.need*100)}%"></i></div><div class="acts"><button class="act pri" type="button" data-a="input" data-v="돈군백신" data-batch="${it.b.k}" data-vax="${it.v.p.name}">${t("접종 기록")}</button></div>${ck}</div>`;
    if(it.item)return `<div class="sow ${log?"done":""}"><div class="sow-top"><b>${esc(it.item.name)}</b><span class="dstate ds-wait">${t("재고 부족")}</span></div><div class="sow-meta">${t(it.item.cat)} · ${it.label}</div><div class="acts"><button class="act pri" type="button" data-a="input" data-v="재고" data-item="${it.item.id}">${t("입고 기록")}</button></div>${ck}</div>`;
    if(it.feed)return `<div class="sow ${log?"done":""}"><div class="sow-top"><b>${esc(it.feed.f)}</b><span class="dd" style="color:${it.sev==="bad"?"var(--red)":"var(--amber)"}">${it.feed.days}${t("일분")}</span></div><div class="sow-meta">${it.label}</div><div class="acts"><button class="act pri" type="button" data-a="input" data-v="사료">${t("입고 기록")}</button></div>${ck}</div>`;
    if(it.fc)return `<div class="sow ${log?"done":""}"><div class="sow-top"><b>${bName(it.fc.b.k)} → ${esc(it.fc.p.feed)}</b><span class="dd">${t(stagePlan(bAge(it.fc.b)))}</span></div><div class="sow-meta">${it.label}</div>${ck}</div>`;
    if(it.am)return `<div class="sow"><div class="sow-top"><b>${esc(t(it.am.barn))}</b><span class="dd" style="color:${it.sev==="bad"?"var(--red)":it.sev==="warn"?"var(--amber)":"var(--muted)"}">${it.issue?t("이상"):t("미점검")}</span></div><div class="sow-meta">${it.label}</div><div class="acts"><button class="act pri" type="button" data-a="tab" data-v="morning">${t("아침 점검")}</button></div></div>`;
    if(it.ann)return `<div class="sow ${log?"done":""}"><div class="sow-top"><b>${esc(it.ann.name)}</b><span class="dd" style="color:${it.sev==="bad"?"var(--red)":"var(--amber)"}">${t("연간 일괄")}</span></div><div class="sow-meta">${it.label}</div>${ck}</div>`;
    if(it.order)return `<div class="sow ${log?"done":""}"><div class="sow-top"><b>${itemShort(it)}</b></div><div class="sow-meta">${it.label}</div>${ck}</div>`;
    if(it.pending&&it.day)return `<div class="sow"><div class="sow-top"><b>${esc(it.day.barn)} · ${t("하루 합계")} ${it.day.total}${t("두")}</b></div><div class="sow-meta">${kDate(it.day.date)} · ${it.day.cnt}${t("건")}</div><div class="acts"><button class="act pri" type="button" data-a="judge" data-v="d:${it.day.date}">${t("판단하러 가기")}</button></div></div>`;
    if(it.pending)return `<div class="sow"><div class="sow-top"><b>${esc(summary(it.r))}</b></div><div class="sow-meta">${kDate(it.r.workDate)} · ${esc(it.r.user)}</div><div class="acts"><button class="act pri" type="button" data-a="judge" data-v="d:${it.r.workDate}">${t("판단하러 가기")}</button></div></div>`;
    if(it.t)return `<div class="sow ${log?"done":""}"><div class="sow-top"><b>${esc(it.t.title)}</b><span class="dd" style="color:${it.sev==="bad"?"var(--red)":"var(--muted)"}">${it.label}</span></div><div class="chipwrap">${it.t.acts.map(a=>`<span class="chip wrap" style="padding:4px 10px;font-size:12.5px">${esc(t(a))}</span>`).join("")}</div>${it.t.memo?`<div class="sow-meta">${esc(it.t.memo)}</div>`:""}${ck}</div>`;
    if(!it.s)return `<div class="sow ${log?"done":""}"><div class="sow-top"><b>${esc(it.r.data.barn)}</b><span class="dd">D−${it.d}</span></div><div class="sow-meta">${esc(it.r.data.name)} · ~${kDate(it.r.data.withdraw)}</div>${ck}</div>`;
    let acts="";
    if(x.act==="check")acts=`<div class="acts"><button class="act pri" type="button" data-a="chk" data-v="임신" data-sow="${it.s.id}">${t("임신")}</button><button class="act warn" type="button" data-a="chk" data-v="재발" data-sow="${it.s.id}">${t("재발")}</button><button class="act bad" type="button" data-a="chk" data-v="공태" data-sow="${it.s.id}">${t("공태")}</button></div>`;
    else if(x.act==="movein")acts=`<div class="acts"><button class="act pri" type="button" data-a="movein" data-v="${it.s.id}">${t("분만사로 이동 완료")}</button></div>`;
    else if(x.act==="cull")acts=can("cull")?`<div class="acts"><button class="act bad" type="button" data-a="sowd" data-v="${it.s.id}">도태 처리하러 가기</button></div>`:"";
    else if(!x.act)acts="";
    else acts=`<div class="acts"><button class="act pri" type="button" data-a="input" data-v="${x.act}" data-sow="${it.s.id}"${it.vx?` data-vname="${esc(it.vx.name)}"`:""}>${esc(L(x.act))} ${t("입력")}</button></div>`;
    return sowCard(it.s,{noLoc:true,cls:log?"done":"",acts:`<div class="sow-meta" style="color:${it.sev==="bad"?"var(--red)":it.sev==="warn"?"var(--amber)":"var(--muted)"};font-weight:700">${it.label} · ${t("현재")} ${it.s.loc}</div>`+acts+ck});
  }).join("");
  ctx={k:"todo",v:k};
  const who=(state.assign||{})[TODAY+"|"+k];
  $("#sheetRoot").innerHTML=`<div class="scrim" data-a="scrim"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(t(x.t))}"><div class="sh-hd"><h2 style="flex-wrap:wrap">${t(x.t)} ${x.k==="pending"?"":`<span class="prog">${done}/${rows.length} ${t("완료")}</span>`}${can("assign")?`<button type="button" class="sbtn" data-a="assign" data-v="${TODAY}|${k}">${who?t("담당")+" "+who:t("담당 지정")}</button>`:who?`<span class="sbtn">${t("담당")} ${who}</span>`:""}</h2><button class="x" type="button" data-a="closeSheet">${t("닫기")}</button></div><div class="sh-bd">${x.k==="svax"&&rows.length?`<button class="act pri" type="button" data-a="vaxAll" style="width:100%;padding:12px">💉 ${t("남은 모돈 한꺼번에 접종 기록")} (${rows.length}${t("두")})</button>`:""}${x.k==="pending"?"":`<div class="note">${t("조치를 마치면 체크하고 한 줄로 적어 두세요. 체크한 내용은 타임라인에 남습니다.")}</div>`}${items}</div></div></div>`;
}
function vSows(){
  const all=state.sows.map(s=>({s,i:statusOf(s)}));
  const cnt=k=>k==="발정관찰"?all.filter(x=>x.i.heat).length:all.filter(x=>matchStatus(x.s,x.i,k)).length;
  let h=`<div class="pagehd" style="justify-content:space-between"><h2>${t("모돈")}</h2><button class="act pri" type="button" data-a="input" data-v="도입">+ ${esc(L("도입"))}</button></div>`;
  h+=`<input type="search" id="sowQ" inputmode="numeric" pattern="[0-9]*" placeholder="${t("모돈번호 검색")}" value="${esc(ui.sowQ)}" aria-label="${t("모돈번호 검색")}">`;
  h+=sowTools();
  h+=`<div class="chips">${[["전체","전체"],["발정관찰","발정 관찰"],...STATUS_KEYS].map(([k,l])=>`<button type="button" class="chip ${ui.sf===k?"on":""}" data-a="sf" data-v="${k}">${t(l)} ${cnt(k)}</button>`).join("")}</div>`;
  const list=all.filter(x=>(ui.sf==="발정관찰"?x.i.heat:matchStatus(x.s,x.i,ui.sf))&&(!ui.sowLoc||ui.sowLoc==="전체"||x.s.loc===ui.sowLoc)&&sowMatch(x.s.id,ui.sowQ)!==null).sort((a,b)=>sowMatch(a.s.id,ui.sowQ)-sowMatch(b.s.id,ui.sowQ)||a.s.id.localeCompare(b.s.id));
  h+=`<div class="note">${ui.sf==="도태됨"?"도태된 모돈도 기록이 모두 보관되어 있습니다. 번호를 누르면 생애 기록을 볼 수 있습니다.":t("모돈을 누르면 상세 정보가 열립니다. 위치는 상세 화면에서 바꿉니다.")}</div>`;
  h+=list.length?`<div class="sowtiles">${sortSows(list).map(x=>sowTile(x.s,x.i)).join("")}</div>`:`<div class="empty">-</div>`;
  return h;
}
function sowCard(s,opts={}){
  const i=statusOf(s);
  return `<div class="sow ${opts.cls||""} ${i.key==="도태됨"?"culled":""}">
    <div class="sow-top"><div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">${opts.noLink?`<span class="sow-no">${s.id}</span>`:`<button type="button" class="sow-no" data-a="sowd" data-v="${s.id}" aria-label="${s.id}">${s.id}<span class="chev">›</span></button>`}<span class="sow-meta">${i.gilt?t("후보돈"):i.parity+t("산")}</span></div>
      <span class="tags">${i.heat?`<span class="heat">${t("발정 관찰")}</span>`:""}${s.cullPlan&&i.key!=="도태됨"?`<span class="ptag">${t("도태 예정")}</span>`:""}<span class="stage ${i.cls}">${i.label}</span></span></div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><span class="sow-sub">${i.sub}</span><span class="sow-loc">${t(s.loc)}</span></div>
    ${opts.noLoc||i.key==="도태됨"?"":`<div class="seg" role="group" aria-label="${s.id}">${SOW_LOCS.map(l=>`<button type="button" class="${s.loc===l?"on":""}" data-a="loc" data-v="${l}" data-sow="${s.id}">${t(l)}</button>`).join("")}</div>`}
    ${opts.acts||""}
  </div>`;
}
function vClose(){
  const day=ui.closeDay,m=missCount(day);
  let h=`<div class="pagehd"><h2>${t("마감")}</h2></div><div class="datebar"><button type="button" data-a="cday" data-v="-1" aria-label="-1">‹</button><b>${day===TODAY?t("오늘")+" · ":""}${kDate(day)}</b><button type="button" data-a="cday" data-v="1" aria-label="+1" ${day>=TODAY?"disabled style='opacity:.3'":""}>›</button></div>`;
  h+=DAILY.map(q=>{const s=dayStatus(day,q);
    return `<div class="cl ${s.s==="miss"?"miss":""}"><b>${esc(L(q))}</b><span class="btns">${
      s.s==="ok"?`<span class="pill p-ok">${s.n}${t("건")}</span><button class="act" type="button" data-a="input" data-v="${q}" data-date="${day}" style="padding:4px 9px;font-size:12px">${t("보기")}</button>`:
      s.s==="zero"?`<span class="pill p-zero">${t("오늘 없음")}</span><button class="act" type="button" data-a="unzero" data-v="${q}" style="padding:4px 9px;font-size:12px">${t("취소")}</button>`:
      `<button class="act" type="button" data-a="input" data-v="${q}" data-date="${day}" style="padding:6px 10px">${t("입력")}</button><button class="act warn" type="button" data-a="zero" data-v="${q}" style="padding:6px 10px">${t("없음")}</button>`}</span></div>`}).join("");
  const pend=deadPending().filter(x=>(x.r?x.r.workDate:x.day.date)===day).length;
  if(pend)h+=`<button class="banner" type="button" data-a="input" data-v="폐사" data-date="${day}"><b>${t("판단 대기 폐사")} ${pend}</b><span>${t("조치가 필요한지 정해 주세요")} ›</span></button>`;
  h+=m?`<div class="banner"><b>${t("미입력")} ${m}</b><span>${t("‘입력’ 또는 ‘없음’을 눌러 주세요. ‘없음’은 성적에 0으로 들어갑니다.")}</span></div>`:`<div class="banner info"><b>${t("마감 완료")}</b><span>${kDate(day)} ${t("매일 기록이 모두 확인되었습니다.")}</span></div>`;
  return h;
}

