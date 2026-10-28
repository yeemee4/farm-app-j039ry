/* ================= v0.5 · 성적 분석 그래프 (지표마다 알맞은 모양) =================
   흐름=꺾은선(+목표선), 두 값의 차이=꺾은선 2개+사이 면, 목표 달성=진행바,
   돈사×주 폐사=히트맵(한 색 진하기), 원인 비중=많은 순 가로막대, 남은 일수=색 신호 가로막대 */
const CC={a:"var(--c-a)",b:"var(--c-b)"};   // 검증한 2색 (밝은/어두운 화면 각각)
function sGoal(){return {...FARM.goal,...(state.sgoal||{})}}
function months12(endYm){let [y,m]=endYm.split("-").map(Number);const a=[];for(let n=11;n>=0;n--){let yy=y,mm=m-n;while(mm<1){mm+=12;yy--}a.push([yy,mm])}return a}
const okv=v=>v!==null&&v!==undefined&&!isNaN(v);
// 여러 선 + 목표선(점선) + 두 선 사이 면(band)
function linesSvg(o){const W=360,H=190,P={l:34,r:44,t:14,b:24},vals=o.series.flatMap(s=>s.v.filter(okv)).concat(o.goals?o.goals.map(g=>g.v):[]);
  if(!vals.length)return `<div class="empty">${t("표시할 값이 없습니다.")}</div>`;
  let mn=Math.min(...vals),mx=Math.max(...vals);const pd=(mx-mn||2)*.18;mn=Math.max(0,mn-pd);mx+=pd;
  const n=o.labels.length,x=i=>P.l+i*(W-P.l-P.r)/(n-1),y=v=>P.t+(1-(v-mn)/(mx-mn))*(H-P.t-P.b);
  let g=`<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${esc(o.title)}">`;
  [mn,(mn+mx)/2,mx].forEach(v=>g+=`<line x1="${P.l}" x2="${W-P.r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--grid)"/><text x="${P.l-5}" y="${y(v)+4}" text-anchor="end">${v.toFixed(o.dp?1:0)}</text>`);
  if(o.band){const [A,B]=o.series,up=[],dn=[];A.v.forEach((v,i)=>{if(okv(v)&&okv(B.v[i])){up.push(`${x(i)},${y(v)}`);dn.unshift(`${x(i)},${y(B.v[i])}`)}});if(up.length>1)g+=`<polygon points="${up.concat(dn).join(" ")}" fill="var(--c-b)" opacity=".14"><title>${esc(o.band)}</title></polygon>`}
  (o.goals||[]).forEach(G=>g+=`<line x1="${P.l}" x2="${W-P.r}" y1="${y(G.v)}" y2="${y(G.v)}" stroke="${G.c}" stroke-width="1.5" stroke-dasharray="5 4"/><text x="${W-P.r+4}" y="${y(G.v)+4}" class="gl" fill="${G.c}">${esc(G.l)}</text>`);
  o.series.forEach(s=>{let seg=[];const out=[];s.v.forEach((v,i)=>{if(okv(v))seg.push(`${x(i)},${y(v)}`);else{if(seg.length)out.push(seg);seg=[]}});if(seg.length)out.push(seg);
    out.forEach(p=>g+=`<polyline fill="none" stroke="${s.c}" stroke-width="2" stroke-linejoin="round" points="${p.join(" ")}"/>`);
    s.v.forEach((v,i)=>{if(okv(v))g+=`<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="${s.c}" stroke="var(--surface)" stroke-width="2"><title>${o.labels[i]} · ${esc(s.l)} ${(+v).toFixed(o.dp)}</title></circle>`});
    const li=s.v.map(okv).lastIndexOf(true);if(li>=0)g+=`<text x="${x(li)+7}" y="${y(s.v[li])+4}" class="sl">${esc(s.l)} ${(+s.v[li]).toFixed(o.dp)}</text>`});
  o.labels.forEach((l,i)=>{if(i%2===1||i===n-1)g+=`<text x="${x(i)}" y="${H-7}" text-anchor="middle">${l}</text>`});
  return g+`</svg>`}
function legendH(items){return `<div class="legend">${items.map(([c,l,dash])=>`<span><i style="background:${dash?"transparent":c};${dash?`border-top:2px dashed ${c};height:0;margin-top:6px`:""}"></i>${esc(l)}</span>`).join("")}</div>`}
// 가로 막대 (값 큰 순 또는 주어진 순)
function hbarsH(rows,o={}){const mx=Math.max(1,...rows.map(r=>r.v));
  return `<div class="hbars">${rows.map(r=>`<div class="hb"><span class="hb-l">${esc(r.l)}</span><div class="hb-t"><div class="hb-f" style="width:${Math.max(2,r.v/mx*100)}%;background:${r.c||CC.a}" title="${esc(r.l)} ${r.txt||r.v}"></div></div><span class="hb-v">${r.txt||r.v}</span></div>`).join("")}</div>`}

function vCharts(){
  const S=ui.st,P=statPeriod(),endYm=S.mode==="월"?S.ym:TODAY.slice(0,7),M=months12(endYm),lab=M.map(([,m])=>m+t("월"));
  const mm=M.map(([y,m])=>rangeMetrics(...monthRange(y,m))),G=sGoal(),pick=k=>mm.map(v=>v?v[k]:null);
  let h=`<div class="sec-t">${t("성적 분석 그래프")} <span>${t("점에 손가락을 대면 값이 보입니다")}</span></div><div class="chartgrid">`;
  // 1. PSY·MSY 추이 + 목표선
  h+=`<div class="card"><h3>${t("PSY · MSY 추이")}<small>${t("두/모돈/년 · 점선 = 목표")}</small></h3>${linesSvg({title:"PSY MSY",labels:lab,dp:1,series:[{l:"PSY",v:pick("psy"),c:CC.a},{l:"MSY",v:pick("msy"),c:CC.b}],goals:[{l:t("목표")+" "+G.psy,v:G.psy,c:CC.a},{l:t("목표")+" "+G.msy,v:G.msy,c:CC.b}]})}${legendH([[CC.a,"PSY"],[CC.b,"MSY"],["var(--muted)",t("목표"),1]])}</div>`;
  // 2. 복당 실산 · 이유두수 (사이 면 = 포유 손실)
  h+=`<div class="card"><h3>${t("복당 실산 · 이유두수")}<small>${t("두 선 사이 = 포유 중 손실")}</small></h3>${linesSvg({title:"실산 이유",labels:lab,dp:1,band:t("포유 중 손실"),series:[{l:t("실산"),v:pick("live"),c:CC.a},{l:t("이유"),v:pick("wean"),c:CC.b}]})}${legendH([[CC.a,t("복당 실산")],[CC.b,t("복당 이유")]])}</div>`;
  // 3. 주간 교배·분만·이유 달성률 (최근 4주)
  const goal=dashCfg().goal,ws=[3,2,1,0].map(i=>addDays(weekStart(TODAY),-7*i));
  const cnt=(k,a)=>{const b=addDays(a,6),R=state.records.filter(r=>r.type===k&&r.workDate>=a&&r.workDate<=b);return k==="교배"?R.filter(r=>r.data.round==="1차").length:R.length};
  h+=`<div class="card"><h3>${t("주간 번식 달성률")}<small>${t("목표")}: ${t("교배")} ${goal.교배} · ${t("분만")} ${goal.분만} · ${t("이유")} ${goal.이유}</small></h3><div class="wk">`+
    `<div class="wk-h"><span></span>${ws.map(w=>`<span>W${isoWeek(w).w}${w===weekStart(TODAY)?" "+t("진행"):""}</span>`).join("")}</div>`+
    ["교배","분만","이유"].map(k=>`<div class="wk-r"><span>${t(k)}</span>${ws.map(w=>{const n=cnt(k,w),p=Math.round(n/(goal[k]||1)*100);return `<span class="wk-c" title="W${isoWeek(w).w} ${t(k)} ${n}/${goal[k]}"><b>${p}%</b><i><em style="width:${Math.min(100,p)}%;background:${p>=100?"var(--good)":p>=75?CC.a:"var(--amber)"}"></em></i><small>${n}/${goal[k]}</small></span>`}).join("")}</div>`).join("")+`</div></div>`;
  // 4. 폐사 히트맵: 돈사 × 주 (최근 8주)
  const w8=[7,6,5,4,3,2,1,0].map(i=>addDays(weekStart(TODAY),-7*i)),barns=BARNS.slice(),cell={};let cmx=1;
  state.records.filter(r=>r.type==="폐사"&&r.workDate>=w8[0]).forEach(r=>{const k=r.data.barn+"|"+weekStart(r.workDate);cell[k]=(cell[k]||0)+r.data.n;cmx=Math.max(cmx,cell[k])});
  const rowsB=barns.filter(b=>w8.some(w=>cell[b+"|"+w]));
  h+=`<div class="card"><h3>${t("폐사 현황")}<small>${t("돈사 × 주 · 진할수록 많음")}</small></h3>${rowsB.length?`<div class="hm" style="--hc:${w8.length}"><span></span>${w8.map(w=>`<span class="hm-h">W${isoWeek(w).w}</span>`).join("")}${rowsB.map(b=>`<span class="hm-l">${esc(t(b))}</span>${w8.map(w=>{const v=cell[b+"|"+w]||0;return `<span class="hm-c" style="background:${v?`color-mix(in srgb, var(--red) ${Math.round(18+v/cmx*82)}%, var(--surface))`:"var(--bg)"};color:${v/cmx>.55?"#fff":"var(--ink)"}" title="${esc(t(b))} W${isoWeek(w).w} ${v}${t("두")}">${v||""}</span>`}).join("")}`).join("")}</div>`:`<div class="empty">${t("최근 8주 폐사 기록이 없습니다.")}</div>`}</div>`;
  // 5. 폐사 원인 비중 (선택 기간, 많은 순)
  const cz={};state.records.filter(r=>r.type==="폐사"&&r.workDate>=P.f&&r.workDate<=P.t).forEach(r=>cz[r.data.cause]=(cz[r.data.cause]||0)+r.data.n);
  const ctot=Object.values(cz).reduce((a,b)=>a+b,0);
  h+=`<div class="card"><h3>${t("폐사 원인 비중")}<small>${esc(P.label)} · ${ctot}${t("두")}</small></h3>${ctot?hbarsH(Object.entries(cz).sort((a,b)=>b[1]-a[1]).map(([l,v])=>({l:t(l),v,txt:`${v}${t("두")} · ${Math.round(v/ctot*100)}%`,c:"var(--red)"}))):`<div class="empty">${t("이 기간에는 기록이 없습니다.")}</div>`}</div>`;
  // 6. 사료 남은 일수 (색 신호)
  const fr=feedTable().filter(x=>x.use>0&&x.days!==null).sort((a,b)=>a.days-b.days),od=FARM.feed.orderDays;
  h+=`<div class="card"><h3>${t("사료 남은 일수")}<small>${t("빨강 2일 이하 · 노랑")} ${od}${t("일 이하")}</small></h3>${fr.length?hbarsH(fr.map(x=>({l:x.f,v:x.days,txt:`${x.days}${t("일")}${x.days<=od?" ⚠":""}`,c:x.days<=2?"var(--red)":x.days<=od?"var(--amber)":"var(--good)"}))):`<div class="empty">${t("잔량 기록 필요")}</div>`}</div>`;
  // 7·8. 아직 기록 항목이 없는 그래프
  h+=`<div class="card ghost"><h3>${t("도체 등급 분포")}<small>${t("주별 100% 누적 막대")}</small></h3><div class="empty">${t("출하 후 도축장 성적 파일을 넣으면 표시합니다.")}</div></div>`;
  h+=`<div class="card ghost"><h3>${t("재고두수 장부 vs 실사")}<small>${t("돈사별 차이 막대")}</small></h3><div class="empty">${t("돈사별 재고두수 실사를 입력하면 표시합니다.")}</div></div>`;
  return h+`</div>`}
