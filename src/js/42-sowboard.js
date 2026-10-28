/* ================= v0.2 · 모돈 현황판 ================= */
function openSowDetail(id){if(tab!=="sow")ui.sowBack=tab==="input"?(ui.prev||"sows"):tab;ui.sowId=id;ctx=null;$("#sheetRoot").innerHTML="";tab="sow";render()}
function sowCycles(id){
  const asc=state.records.filter(r=>r.data&&r.data.sow===id).sort((a,b)=>a.workDate.localeCompare(b.workDate));
  const far=asc.filter(r=>r.type==="분만"),s=state.sows.find(x=>x.id===id);
  return far.map((f,n)=>{const nextF=far[n+1];
    const m=[...asc].reverse().find(r=>r.type==="교배"&&r.data.round==="1차"&&r.workDate<f.workDate&&diff(r.workDate,f.workDate)<=125);
    const w=asc.find(r=>r.type==="이유"&&r.workDate>f.workDate&&(!nextF||r.workDate<nextF.workDate));
    const nm=w?asc.find(r=>r.type==="교배"&&r.workDate>w.workDate&&(!nextF||r.workDate<nextF.workDate)):null;
    return {parity:s.baseParity+n+1,m,f,w,nm}});
}
const EDITABLE=t=>FORMS[t]&&t!=="이동";
function vSow(){
  const id=ui.sowId,s=state.sows.find(x=>x.id===id);
  if(!s)return `<div class="empty">모돈을 찾을 수 없습니다.</div>`;
  const i=statusOf(s),culled=culledRec(id);
  const recs=state.records.filter(r=>r.data&&r.data.sow===id).sort((a,b)=>b.workDate.localeCompare(a.workDate)||b.createdAt.localeCompare(a.createdAt));
  const cyc=sowCycles(id),bcs=recs.filter(r=>r.type==="BCS").reverse();
  const avg=(a,fn)=>a.length?(a.reduce((x,y)=>x+fn(y),0)/a.length).toFixed(1):"-";
  const rel=dt=>{const d=diff(TODAY,dt);return d===0?"오늘":d>0?`${d}일 후`:`${-d}일 지남`};
  const sch=[];
  if(!culled){
    if(i.stage==="교배")sch.push(["재발 확인",addDays(i.mate,21)],["임신진단",addDays(i.mate,28)]);
    if(i.stage==="교배"||i.stage==="임신")sch.push(["분만사 입식",addDays(i.mate,CFG.gest-CFG.farrowIn)],["분만 예정",addDays(i.mate,CFG.gest)]);
    if(i.stage==="포유")sch.push(["이유 예정",addDays(i.farrow,CFG.weanDay)]);
    if(i.stage==="이유")sch.push(["교배 마감",addDays(i.since,CFG.weanMateLimit)]);
    if(i.stage==="재교배")sch.push(["다음 발정 예상",addDays(i.since,21)]);
  }
  let acts="";
  if(!culled){
    if(["후보","발정대기","재발공태"].includes(i.key))acts+=`<button class="act pri" type="button" data-a="input" data-v="교배" data-sow="${id}">교배 입력</button>`;
    if(i.stage==="교배")acts+=`<button class="act pri" type="button" data-a="chk" data-v="임신" data-sow="${id}">임신</button><button class="act warn" type="button" data-a="chk" data-v="재발" data-sow="${id}">재발</button><button class="act bad" type="button" data-a="chk" data-v="공태" data-sow="${id}">공태</button>`;
    if(i.stage==="임신")acts+=`<button class="act pri" type="button" data-a="input" data-v="분만" data-sow="${id}">분만 입력</button>`;
    if(i.stage==="포유")acts+=`<button class="act pri" type="button" data-a="input" data-v="이유" data-sow="${id}">이유 입력</button>`;
    acts+=`<button class="act" type="button" data-a="input" data-v="백신" data-sow="${id}">백신·투약</button><button class="act" type="button" data-a="input" data-v="BCS" data-sow="${id}">BCS</button>`;
  }
  // 왼쪽
  let L=`<div class="panel">
    <div class="sow-top"><span class="sow-meta">${i.gilt?"후보돈 · 임신 확인 시 모돈 편입":i.parity+"산"} · ${esc(s.breed||"품종 미입력")}</span><span class="tags">${i.heat?`<span class="heat">발정 관찰</span>`:""}${s.cullPlan&&!culled?`<span class="ptag">도태 예정</span>`:""}<span class="stage ${i.cls}">${i.label}</span></span></div>
    <div class="sow-sub" style="font-size:22px">${i.sub}</div>
    <div class="kv">
      <div><small>현재 산차</small><b>${i.gilt?"0":i.parity}</b></div>
      <div><small>도입</small><b style="font-size:14px">${s.intro?kDate(s.intro):"-"}</b></div>
      <div><small>최근 BCS</small><b>${bcs.length?bcs[bcs.length-1].data.score:"-"}</b></div>
      <div><small>위치</small><b style="font-size:14px">${s.loc}</b></div>
    </div>
    ${s.memo?`<div class="sow-meta">메모: ${esc(s.memo)}</div>`:""}
    ${culled?"":`<div class="seg" role="group" aria-label="${id} 위치">${SOW_LOCS.map(l=>`<button type="button" class="${s.loc===l?"on":""}" data-a="loc" data-v="${l}" data-sow="${id}">${l}</button>`).join("")}</div>`}
    ${acts?`<div class="acts">${acts}</div>`:""}
    ${ui.pe?`<div class="cullbox"><h4>기본 정보 수정</h4>
      <div class="f"><span class="lb">품종</span><div class="chipwrap">${["LYD","YL","LY","기타"].map(b=>`<button type="button" class="chip wrap ${ui.pe.breed===b?"on":""}" data-a="peBreed" data-v="${b}">${b}</button>`).join("")}</div></div>
      <div class="setrow"><span>기록 전 산차 (앱 사용 전 분만 횟수)</span><div class="stepper"><button type="button" data-a="pePar" data-v="-1" aria-label="줄이기">−</button><input type="number" value="${ui.pe.bp}" readonly aria-label="기록 전 산차"><button type="button" data-a="pePar" data-v="1" aria-label="늘리기">+</button></div></div>
      <div class="f"><label for="peId">모돈 번호 (임시 번호를 실제 번호로)</label><input type="text" id="peId" value="${esc(ui.pe.id||ui.sowId)}"></div><div class="f"><label for="peIntro">도입일</label><input type="date" id="peIntro" value="${ui.pe.intro||""}"></div>
      <div class="f"><label for="peMemo">메모</label><input type="text" id="peMemo" value="${esc(ui.pe.memo||"")}" placeholder="예: 왼쪽 뒷다리 약함"></div>
      <div class="acts"><button class="act pri" type="button" data-a="peSave">저장</button><button class="act" type="button" data-a="peCancel">취소</button></div></div>`:`<button class="act" type="button" data-a="peOpen" style="justify-self:start">기본 정보 수정</button>`}
  </div>`;
  if(sch.length)L+=`<div class="sec-t">다음 일정</div><div class="sched">${sch.map(([t,dt])=>{if(t==="분만사 입식"&&s.loc==="분만사")return `<div><span>${t}</span><span style="color:var(--accent);font-weight:700">입식 완료</span></div>`;const late=dt<TODAY;return `<div><span>${t}</span><span style="color:${late?"var(--red)":dt===TODAY?"var(--amber)":"var(--ink)"};font-weight:${late||dt===TODAY?700:500}">${kDate(dt)} · ${rel(dt)}</span></div>`}).join("")}</div>`;
  const ret=cyc.filter(c=>c.w&&c.nm);
  L+=`<div class="sec-t">번식 성적 요약 (기록된 ${cyc.length}산)</div><div class="kv kv4">
    <div><small>평균 총산</small><b>${avg(cyc,c=>c.f.data.live+c.f.data.still+c.f.data.mum)}</b></div>
    <div><small>평균 실산</small><b>${avg(cyc,c=>c.f.data.live)}</b></div>
    <div><small>평균 이유</small><b>${avg(cyc.filter(c=>c.w),c=>c.w.data.n)}</b></div>
    <div><small>평균 포유일</small><b>${avg(cyc.filter(c=>c.w),c=>diff(c.f.workDate,c.w.workDate))}</b></div>
    <div><small>이유→교배</small><b>${ret.length?avg(ret,c=>diff(c.w.workDate,c.nm.workDate))+"일":"-"}</b></div>
    <div><small>재발·공태</small><b>${recs.filter(r=>r.type==="임신확인"&&r.data.result!=="임신").length}</b></div>
    <div><small>생애 실산</small><b>${cyc.reduce((x,c)=>x+c.f.data.live,0)}</b></div>
    <div><small>생애 이유</small><b>${cyc.reduce((x,c)=>x+(c.w?c.w.data.n:0),0)}</b></div></div>`;
  if(cyc.length){const W=340,H=150,P={l:26,r:8,t:16,b:22},mx=Math.max(16,...cyc.map(c=>c.f.data.live+c.f.data.still+c.f.data.mum));
    const y=v=>P.t+(1-v/mx)*(H-P.t-P.b),gw=(W-P.l-P.r)/cyc.length,bw=Math.min(16,gw*.32);
    let g=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="산차별 실산과 이유두수">`;[0,Math.round(mx/2),mx].forEach(t=>g+=`<line x1="${P.l}" x2="${W-P.r}" y1="${y(t)}" y2="${y(t)}" stroke="var(--grid)"/><text x="${P.l-5}" y="${y(t)+4}" text-anchor="end">${t}</text>`);
    cyc.forEach((c,n)=>{const cx=P.l+n*gw+gw/2,lv=c.f.data.live,wn=c.w?c.w.data.n:0;
      g+=`<rect x="${cx-bw-1}" y="${y(lv)}" width="${bw}" height="${y(0)-y(lv)}" rx="3" fill="var(--accent)"><title>${c.parity}산 실산 ${lv}두</title></rect>`;
      if(c.w)g+=`<rect x="${cx+1}" y="${y(wn)}" width="${bw}" height="${y(0)-y(wn)}" rx="3" fill="var(--amber)"><title>${c.parity}산 이유 ${wn}두</title></rect>`;
      g+=`<text x="${cx}" y="${H-6}" text-anchor="middle">${c.parity}산</text><text class="vt" x="${cx-bw/2-1}" y="${y(lv)-4}" text-anchor="middle">${lv}</text>`});
    L+=`<div class="card"><h3>산차별 실산 · 이유두수</h3>${g}</svg><div class="legend"><span><i style="background:var(--accent)"></i>실산</span><span><i style="background:var(--amber)"></i>이유</span></div></div>`}
  if(bcs.length){const W=340,H=120,P={l:26,r:10,t:10,b:22},y=v=>P.t+(5-v)/4*(H-P.t-P.b),x=n=>bcs.length===1?(W/2):P.l+n*(W-P.l-P.r)/(bcs.length-1);
    let g=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="BCS 변화"><rect x="${P.l}" y="${y(3.5)}" width="${W-P.l-P.r}" height="${y(3)-y(3.5)}" fill="var(--accent-soft)"/>`;
    [1,3,5].forEach(t=>g+=`<line x1="${P.l}" x2="${W-P.r}" y1="${y(t)}" y2="${y(t)}" stroke="var(--grid)"/><text x="${P.l-5}" y="${y(t)+4}" text-anchor="end">${t}</text>`);
    g+=`<polyline fill="none" stroke="var(--ink)" stroke-width="2" points="${bcs.map((r,n)=>`${x(n)},${y(+r.data.score)}`).join(" ")}"/>`;
    bcs.forEach((r,n)=>{g+=`<circle cx="${x(n)}" cy="${y(+r.data.score)}" r="4.5" fill="var(--surface)" stroke="var(--ink)" stroke-width="2"><title>${kDate(r.workDate)} · ${r.data.when} · BCS ${r.data.score}</title></circle>`});
    g+=`<text x="${P.l}" y="${H-6}">${kDate(bcs[0].workDate)}</text><text x="${W-P.r}" y="${H-6}" text-anchor="end">${kDate(bcs[bcs.length-1].workDate)}</text>`;
    L+=`<div class="card"><h3>BCS 변화 <span class="note" style="font-weight:500">초록 띠: 적정 3~3.5</span></h3>${g}</svg></div>`}
  // 오른쪽
  let R="";
  if(cyc.length)R+=`<div class="sec-t">산차별 생산 기록</div><div class="dtbl"><table><thead><tr><th>산차</th><th>교배일</th><th>분만일</th><th>총산</th><th>실산</th><th>사산</th><th>미라</th><th>이유일</th><th>이유</th><th>포유일</th><th>재귀일</th></tr></thead><tbody>${[...cyc].reverse().map(c=>{const d=c.f.data;return `<tr><td>${c.parity}</td><td>${c.m?kDate(c.m.workDate):"-"}</td><td>${kDate(c.f.workDate)}</td><td>${d.live+d.still+d.mum}</td><td>${d.live}</td><td>${d.still}</td><td>${d.mum}</td><td>${c.w?kDate(c.w.workDate):"-"}</td><td>${c.w?c.w.data.n:"-"}</td><td>${c.w?diff(c.f.workDate,c.w.workDate):"-"}</td><td>${c.nm?diff(c.w.workDate,c.nm.workDate):"-"}</td></tr>`}).join("")}</tbody></table></div>`;
  const RF=[["전체",null],["교배·임신",["교배","임신확인"]],["분만·이유",["분만","이유"]],["백신·투약",["백신"]],["BCS",["BCS"]],["이동·기타",["이동","도입","조치","도태"]]];
  const cur=RF.find(x=>x[0]===ui.sowRf)||RF[0];
  const list=recs.filter(r=>!cur[1]||cur[1].includes(r.type));
  R+=`<div class="sec-t">전체 기록 <span>${recs.length}건 · 수정·삭제 가능</span></div><div class="chips">${RF.map(([l])=>`<button type="button" class="chip ${cur[0]===l?"on":""}" data-a="sowRf" data-v="${l}">${l}</button>`).join("")}</div>`;
  R+=list.length?list.map(recRow).join(""):`<div class="empty">기록이 없습니다.</div>`;
  // 도태
  const C=ui.cull&&ui.cull.id===id?ui.cull:null;let cb="";
  if(culled)cb=`<div class="cullbox on"><h4>도태됨 · ${kDate(culled.workDate)}</h4><div class="sow-meta">사유: ${esc(culled.data.reason)} · 처리 ${esc(culled.user)}. 기록은 모두 보관됩니다.</div><div class="acts">${C&&C.step==="undo"?`<span class="sow-meta" style="font-weight:700;color:var(--red)">도태를 취소하고 사육 중으로 되돌릴까요?</span><button class="act bad" type="button" data-a="cullUndoOk" data-v="${id}">되돌리기</button><button class="act" type="button" data-a="cullCancel">아니요</button>`:`<button class="act" type="button" data-a="cullUndo" data-v="${id}">도태 취소</button>`}</div></div>`;
  else if(C&&C.step==="plan")cb=`<div class="cullbox"><h4>도태 계획 세우기</h4><div class="chipwrap">${CULL_REASONS.map(r=>`<button type="button" class="chip wrap ${C.reason===r?"on":""}" data-a="cullReason" data-v="${r}">${r}</button>`).join("")}</div><div class="f"><label for="cullDate">도태 예정일</label><input type="date" id="cullDate" value="${C.date}"></div><div class="acts"><button class="act pri" type="button" data-a="cullPlanSave" data-v="${id}">계획 저장</button><button class="act" type="button" data-a="cullCancel">취소</button></div></div>`;
  else if(C&&C.step==="confirm")cb=`<div class="cullbox on"><h4>정말 도태하시겠습니까?</h4><div class="sow-meta">${id}번 · 사유: ${esc(C.reason)}. 도태 후에도 모든 기록은 보관되고 ‘도태됨’ 목록에서 언제든 볼 수 있습니다.</div><div class="chipwrap">${CULL_REASONS.map(r=>`<button type="button" class="chip wrap ${C.reason===r?"on":""}" data-a="cullReason" data-v="${r}">${r}</button>`).join("")}</div><div class="acts"><button class="act bad" type="button" data-a="cullDo" data-v="${id}">도태 확정</button><button class="act" type="button" data-a="cullCancel">취소</button></div></div>`;
  else if(s.cullPlan)cb=`<div class="cullbox"><h4>도태 예정 · ${kDate(s.cullPlan.date)}</h4><div class="sow-meta">사유: ${esc(s.cullPlan.reason)}</div><div class="acts"><button class="act bad" type="button" data-a="cullConfirm" data-v="${id}">도태 실행</button><button class="act" type="button" data-a="cullPlanDel" data-v="${id}">계획 취소</button></div></div>`;
  else cb=`<div class="acts"><button class="act" type="button" data-a="cullPlan" data-v="${id}">도태 계획 세우기</button><button class="act bad" type="button" data-a="cullConfirm" data-v="${id}">바로 도태</button></div>`;
  if(can("cull"))R+=`<div class="sec-t">도태</div>`+cb;
  const back=ui.sowBack&&ui.sowBack!=="sow"?ui.sowBack:"sows";
  return `<div class="pagehd"><button class="back" type="button" data-a="tab" data-v="${back}">‹ ${back==="sows"?"모돈 목록":"뒤로"}</button><h2><span class="sow-no" style="font-size:20px">${id}</span>${i.gilt?"후보돈":"모돈"} 현황판</h2></div>
    <div class="inputgrid"><div>${L}</div><div>${R}</div></div>`;
}

