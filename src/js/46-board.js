/* ================= v0.2 · 현황판 (TV) ================= */
function vBoard(){
  const tmr=addDays(TODAY,1),D=boardDate(),tv=document.body.classList.contains("tv");
  REF=D;const groups=buildTodos();const st=stalls();REF=TODAY;
  const work=groups.filter(x=>!["pending","stock","order"].includes(x.k));
  const so=semenOrder(),low=state.items.filter(it=>!it.hidden).map(it=>({it,s:stockOf(it)})).filter(x=>x.s.qty!==null&&x.s.qty<x.it.par);
  const pend=deadPending().length;
  const carry=(state.tasks||[]).filter(x=>x.due<D&&!tdLog(tdKey("task",x.id))).length;
  const vlate=groups.find(x=>x.k==="bvax");const vl=vlate?vlate.items.filter(i=>i.sev==="bad").length:0;
  const T=k=>state.records.filter(r=>r.type===k&&r.workDate===TODAY);
  const memo=(state.memo||{})[D]||"";
  const ids=x=>{const a=x.items.map(it=>it.am?t(it.am.barn):it.fc?bName(it.fc.b.k).replace(" 분만군","")+" "+it.fc.p.feed:it.feed?it.feed.f:it.ann?it.ann.name:it.t?it.t.title:it.s?it.s.id:it.b?`${bName(it.b.k).replace(" 분만군","")} ${it.v.p.name}`:it.r?it.r.data.barn:"");return a.slice(0,14).join("  ")+(a.length>14?`  +${a.length-14}`:"")};
  // 모돈 상태
  const c=statusCounts();
  const sc=[["heat","발정 관찰"],["분만임박","분만 임박"],["포유","포유"],["확인전","확인 전"],["임신","임신"],["재발공태","재발·공태"]].map(([k,l])=>`<span class="bd-chip ${k==="heat"&&c.heat?"hot":""}"><small>${t(l)}</small><b>${c[k]||0}</b></span>`).join("");
  // 주의
  const al=[];
  low.forEach(x=>al.push(["bad",`${t("재고 부족")} · ${x.it.name} ${x.s.qty}${x.it.unit}`]));
  if(so.order)al.push(["warn",`정액 ${so.order}개 오늘 주문 (내일 ${so.n}두)`]);
  if(vl)al.push(["bad",`${t("돈군 백신")} 누락 ${vl}`]);
  if(pend)al.push(["bad",`${t("판단 대기 폐사")} ${pend}`]);
  if(carry)al.push(["warn",`이월된 조치 ${carry}`]);
  if(st.length)al.push(["warn",`${t("장기 무변동 개체")} ${st.length}`]);
  const AMAX=tv?Math.max(2,5-(wxAlerts(D===TODAY?0:1).match(/bd-al/g)||[]).length):20,alH=al.length?al.slice(0,AMAX).map(([k,s])=>`<div class="bd-al ${k}">${esc(s)}</div>`).join("")+(al.length>AMAX?`<div class="bd-al">+${al.length-AMAX}</div>`:""):`<div class="bd-al">특이 사항 없음</div>`;
  // 돈사 현황
  const L2=liveBatches(),sowLoc={};activeSows().forEach(s=>sowLoc[s.loc]=(sowLoc[s.loc]||0)+1);
  const locG={};SOW_LOCS.filter(x=>x!=="분만사").forEach(x=>{const g=x.replace(/ \d+동$/,"");locG[g]=(locG[g]||0)+(sowLoc[x]||0)});
  const barnRows=[...Object.entries(locG).filter(([g,n])=>n||g==="교배사").map(([g,n])=>[g,n,null]),...state.cfg.stage.map(([n],i)=>{const inS=L2.filter(b=>stagePlan(bAge(b))===n);return [n,i===0?(sowLoc["분만사"]||0):null,[inS.length,inS.reduce((s,b)=>s+bHeads(b,bAge(b)),0)]]})];
  const barnH=`<table class="bd-tbl"><thead><tr><th></th><th>${t("모돈")}</th><th>${t("돈군")}</th><th>${t("두수")}</th></tr></thead><tbody>${barnRows.map(([n,s,b])=>`<tr><td>${t(n)}</td><td>${s===null?"–":s}</td><td>${b?b[0]:"–"}</td><td>${b?b[1].toLocaleString():"–"}</td></tr>`).join("")}</tbody></table>`;
  // 할 일 카드
  const CMAX=tv?12:99,shown=work.length>CMAX?work.slice(0,CMAX-1):work,rest=work.length-shown.length;
  const rows=Math.max(4,Math.ceil((shown.length+(rest?1:0))/2));
  const cards=shown.map(x=>{const key=`${D}|${x.k}`,who=(state.assign||{})[key];
    return `<div class="bd-row ${x.sev}"><div class="bd-t"><span class="bd-tt">${t(x.t).replace(/ \(.*\)/,"")}</span><span class="bd-n">${x.items.length}</span></div><div class="bd-ids">${esc(ids(x))}</div><button type="button" class="bd-who ${who?"":"none"}" data-a="${can("assign")?"assign":""}" data-v="${key}">${who?esc(who):t("담당 지정")}</button></div>`}).join("")+(rest?`<div class="bd-row"><div class="bd-t"><span class="bd-tt">+${rest}</span></div><div class="bd-ids">${t("할 일")} → ${t("전체 보기")}</div></div>`:"");
  const now=new Date();
  return `<div class="board">
    <div class="bd-top">
      <div class="bd-head"><div class="bd-day">${t(D===TODAY?"오늘 할 일":"내일 할 일")}</div><div class="bd-date">${kDate(D)}</div></div>
      <div class="bd-chips">${sc}</div>
      <div class="bd-right"><div class="bd-clock">${pad(now.getHours())}:${pad(now.getMinutes())}</div>${wxLine()}<div class="bd-ctl"><button type="button" class="${D===TODAY?"on":""}" data-a="bDay" data-v="today">${t("오늘")}</button><button type="button" class="${D===tmr?"on":""}" data-a="bDay" data-v="tmr">${t("내일")}</button><button type="button" data-a="tvMode">${tv?"TV 끄기":"TV 전체 화면"}</button></div></div>
    </div>
    <div class="bd-grid">
      <section class="bd-main" style="--rows:${rows}" aria-label="${t("할 일")}">${cards||`<div class="bd-row"><div class="bd-t"><span class="bd-tt">예정된 일이 없습니다</span></div></div>`}</section>
      <section class="bd-side">
        <div class="bd-box b-alert"><h4>${t("주의")}</h4>${wxAlerts(D===TODAY?0:1)}${alH}</div>
        <div class="bd-box b-kpi"><h4>${t("오늘 실적")}</h4><div class="bd-kpi">
          <div><small>${t("교배")}</small><b>${T("교배").filter(r=>r.data.round==="1차").length}</b></div><div><small>${t("분만")}</small><b>${T("분만").length}</b></div><div><small>${t("이유")}</small><b>${T("이유").length}</b></div>
          <div><small>${t("폐사")}</small><b>${T("폐사").reduce((s,r)=>s+r.data.n,0)}</b></div><div><small>${t("출하")}</small><b>${T("출하").reduce((s,r)=>s+r.data.n,0)}</b></div><div><small>${t("아침 점검")}</small><b class="${amProg().done<amProg().all&&nowHM()>=FARM.morning.due?"warnc":""}">${amProg().done}/${amProg().all}</b></div><div><small>${t("미입력")}</small><b class="${missCount(TODAY)?"warnc":""}">${missCount(TODAY)}</b></div></div></div>
        <div class="bd-box b-barn"><h4>돈사 현황</h4>${barnH}</div>
        <div class="bd-box b-memo"><h4>${t("회의 메모")} <button type="button" class="bd-edit" data-a="memoEdit">${ui.memoEdit?t("닫기"):t("쓰기")}</button></h4>${ui.memoEdit?`<textarea id="memoEdit" aria-label="${t("회의 메모")}">${esc(memo)}</textarea><button type="button" class="bd-who" data-a="memoSave">${t("저장")}</button>`:`<div class="bd-memo">${memo?esc(memo).replace(/\n/g,"<br>"):"메모가 없습니다. ‘쓰기’를 눌러 회의 내용을 남기세요."}</div>`}</div>
      </section>
    </div>
    ${tv?"":`<div class="bd-foot">1분마다 자동으로 새로 고칩니다 · 담당 버튼을 누르면 직원이 차례로 바뀝니다 · 저녁 6시 이후에는 ‘내일’ 화면이 기본입니다 · TV는 1920×1080 한 화면에 맞춰 보여 줍니다</div>`}
  </div>`;
}
setInterval(()=>{if(tab==="board"&&!ui.memoEdit)render()},60000);

